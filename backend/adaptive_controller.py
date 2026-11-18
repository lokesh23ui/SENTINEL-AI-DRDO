"""
SENTINEL-AI: Adaptive Suppression Controller Module
Orchestrates adaptive profiles for Stationary, Non-Stationary, Impulsive, and Mixed Noise.
Includes optional Normalized LMS (NLMS) dual-channel adaptive reference filtering.
Distinguishes communication channel speech enhancement from acoustic ANC.
"""

import numpy as np
from scipy import signal
from typing import Dict, Any, Tuple, Optional


class NLMSAdaptiveFilter:
    """
    Normalized Least Mean Squares (NLMS) Adaptive Filter for dual-microphone setups.
    d(n): Primary microphone signal (Speech + Noise)
    x(n): Reference microphone signal (Noise only / correlated acoustic interference)
    e(n): Enhanced speech output: e(n) = d(n) - w^T(n) * x(n)
    
    NOTE: This is digital communication-channel interference cancellation,
    not physical acoustic anti-noise generation.
    """
    def __init__(self, filter_order: int = 64, mu: float = 0.05, eps: float = 1e-6):
        self.filter_order = filter_order
        self.mu = mu
        self.eps = eps
        self.weights = np.zeros(filter_order, dtype=np.float32)

    def filter_signal(self, primary: np.ndarray, reference: np.ndarray) -> np.ndarray:
        """Process primary and reference audio using sample-by-sample NLMS adaptation."""
        n_samples = min(len(primary), len(reference))
        output = np.zeros(n_samples, dtype=np.float32)
        x_buf = np.zeros(self.filter_order, dtype=np.float32)
        
        for n in range(n_samples):
            # Shift buffer
            x_buf[1:] = x_buf[:-1]
            x_buf[0] = reference[n]
            
            # Predict noise: y(n) = w^T * x
            est_noise = np.dot(self.weights, x_buf)
            
            # Error / Enhanced signal: e(n) = d(n) - y(n)
            error = primary[n] - est_noise
            output[n] = error
            
            # Update filter weights: w(n+1) = w(n) + (mu / (|x|^2 + eps)) * error * x
            norm = np.dot(x_buf, x_buf) + self.eps
            self.weights += (self.mu / norm) * error * x_buf
            
        return output


class AdaptiveController:
    """
    Manages dynamic suppression parameters according to the noise environment,
    classification results, and user speech preservation priorities.
    """
    def __init__(self, sr: int = 16000):
        self.sr = sr
        self.nlms_filter = NLMSAdaptiveFilter(filter_order=64, mu=0.08)

    def select_profile(
        self,
        classification: Dict[str, Any],
        user_override: Optional[str] = None,
        speech_preservation_priority: float = 0.85
    ) -> Dict[str, Any]:
        """
        Derive dynamic tuning parameters based on detected noise category
        and user speech preservation weight.
        """
        category = user_override if user_override and user_override != "auto" else classification["predicted_category"]
        rec = classification.get("recommended_profile", {})
        
        # Base settings
        base_oversubtraction = rec.get("recommended_oversubtraction", 1.5)
        base_floor = rec.get("spectral_floor", 0.08)
        impulsive_blanking = rec.get("impulsive_blanking", False)
        
        # User speech preservation adjustment:
        # Higher preservation -> lower oversubtraction, higher spectral floor (avoids speech clipping/musical noise)
        adjusted_oversubtraction = base_oversubtraction * (1.8 - 0.9 * speech_preservation_priority)
        adjusted_floor = base_floor + (0.15 * speech_preservation_priority)
        
        return {
            "active_category": category,
            "filter_mode": rec.get("filter_mode", "hybrid_neural_dsp"),
            "oversubtraction_factor": float(np.clip(adjusted_oversubtraction, 1.0, 3.5)),
            "spectral_floor": float(np.clip(adjusted_floor, 0.02, 0.35)),
            "impulsive_blanking": impulsive_blanking,
            "speech_preservation_weight": speech_preservation_priority,
            "description": rec.get("description", "Hybrid adaptive suppression profile.")
        }

    def apply_spectral_subtraction(
        self,
        magnitude: np.ndarray,
        noise_profile: np.ndarray,
        oversubtraction: float = 1.5,
        spectral_floor: float = 0.05
    ) -> np.ndarray:
        """
        Power spectral subtraction with Berouti oversubtraction and spectral floor.
        Guarantees that speech formant valleys don't drop to zero (preventing musical noise).
        """
        # Power spectrum
        signal_power = magnitude ** 2
        noise_power = noise_profile ** 2
        
        if noise_power.ndim == 1:
            noise_power = noise_power[:, np.newaxis]
            
        # Subtraction: P_enhanced = max(P_sig - alpha * P_noise, beta * P_sig)
        subtracted_power = signal_power - (oversubtraction * noise_power)
        floor_power = spectral_floor * signal_power
        
        enhanced_power = np.maximum(subtracted_power, floor_power)
        enhanced_magnitude = np.sqrt(enhanced_power)
        return enhanced_magnitude.astype(np.float32)

    def estimate_stationary_noise(self, magnitude: np.ndarray, vad_mask: np.ndarray) -> np.ndarray:
        """
        Estimate stationary noise spectrum from non-speech frames (minimum statistics / recursive averaging).
        """
        non_speech_frames = np.where(~vad_mask)[0]
        if len(non_speech_frames) > 5:
            noise_est = np.mean(magnitude[:, non_speech_frames], axis=1)
        else:
            # Fallback: bottom 15th percentile across time frames
            noise_est = np.percentile(magnitude, 15, axis=1)
            
        return noise_est.astype(np.float32)

    def track_rotor_harmonics(self, magnitude: np.ndarray, blade_freq_hz: float = 24.0) -> np.ndarray:
        """
        Identify and attenuate periodic harmonic peaks caused by helicopter main/tail rotor blades.
        """
        freq_bins = magnitude.shape[0]
        bin_hz = (self.sr / 2) / (freq_bins - 1)
        
        # Harmonic frequencies of rotor
        harmonics = [blade_freq_hz * k for k in range(1, 15) if blade_freq_hz * k < (self.sr / 2)]
        enhanced_mag = magnitude.copy()
        
        for h_freq in harmonics:
            center_bin = int(round(h_freq / bin_hz))
            bandwidth = max(1, int(round(4.0 / bin_hz))) # 4Hz notch
            low_b = max(0, center_bin - bandwidth)
            high_b = min(freq_bins, center_bin + bandwidth + 1)
            
            # Attenuate blade pass peak towards local neighborhood median
            local_baseline = np.median(magnitude[max(0, low_b-2):min(freq_bins, high_b+2), :], axis=0)
            enhanced_mag[low_b:high_b, :] = 0.5 * enhanced_mag[low_b:high_b, :] + 0.5 * local_baseline
            
        return enhanced_mag

    def apply_nlms_reference(self, primary: np.ndarray, reference: np.ndarray) -> np.ndarray:
        """Run dual-microphone NLMS filtering."""
        return self.nlms_filter.filter_signal(primary, reference)
