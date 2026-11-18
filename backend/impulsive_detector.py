"""
SENTINEL-AI: Impulsive & Transient Noise Detection & Suppression Module
Detects sudden high-amplitude bursts (gunfire, artillery, explosions, metal clanks)
and applies adaptive transient blanking while preserving speech consonants (plosives).
"""

import numpy as np
from scipy import signal
from typing import Tuple, Dict, Any


class ImpulsiveNoiseDetector:
    """
    Sub-frame transient detector analyzing energy surge, crest factor,
    and statistical kurtosis to detect and suppress impulsive defence threats.
    """
    def __init__(
        self,
        sr: int = 16000,
        subframe_ms: float = 8.0,
        kurtosis_threshold: float = 4.8,
        crest_threshold: float = 3.8,
        energy_surge_db: float = 8.0
    ):
        self.sr = sr
        self.subframe_len = int(sr * subframe_ms / 1000.0)
        self.kurtosis_threshold = kurtosis_threshold
        self.crest_threshold = crest_threshold
        self.energy_surge_db = energy_surge_db
        
        # Running energy baseline for surge detection
        self.running_energy = 1e-5
        self.alpha_bg = 0.98

    def analyze_transients(self, audio: np.ndarray) -> Dict[str, Any]:
        """
        Analyze audio for impulsive acoustic transients.
        Returns metrics and transient regions.
        """
        n_samples = len(audio)
        if n_samples < self.subframe_len * 2:
            return {
                "has_impulsive_noise": False,
                "transient_count": 0,
                "max_kurtosis": 3.0,
                "max_crest_factor": 1.5,
                "transient_indices": []
            }
        
        # Global signal statistics across entire duration
        global_var = np.var(audio) + 1e-10
        global_kurtosis = float(np.mean((audio - np.mean(audio)) ** 4) / (global_var ** 2))
        global_crest = float(np.max(np.abs(audio)) / (np.sqrt(global_var) + 1e-10))
        
        # Calculate subframe statistics
        n_frames = n_samples // self.subframe_len
        kurtosis_list = []
        crest_list = []
        subframe_rms = []
        
        for i in range(n_frames):
            frame = audio[i * self.subframe_len : (i + 1) * self.subframe_len]
            mean_f = np.mean(frame)
            var_f = np.var(frame) + 1e-10
            
            # Subframe kurtosis
            m4 = np.mean((frame - mean_f) ** 4)
            kurt = m4 / (var_f ** 2)
            kurtosis_list.append(kurt)
            
            # Crest factor: peak / rms
            peak = np.max(np.abs(frame))
            rms = np.sqrt(var_f)
            subframe_rms.append(rms)
            crest = peak / (rms + 1e-10)
            crest_list.append(crest)
            
        median_rms = float(np.median(subframe_rms)) if subframe_rms else 1e-4
        transient_frame_indices = []
        
        for i in range(n_frames):
            frame = audio[i * self.subframe_len : (i + 1) * self.subframe_len]
            peak = np.max(np.abs(frame))
            rms = subframe_rms[i]
            kurt = kurtosis_list[i]
            crest = crest_list[i]
            
            # An impulsive burst frame exceeds normal Gaussian distribution:
            # 1. Local high kurtosis or crest factor
            # 2. Local peak significantly exceeds running median background
            is_transient = (
                (kurt > self.kurtosis_threshold) or
                (crest > self.crest_threshold and rms > 2.5 * (median_rms + 1e-5)) or
                (global_kurtosis > 6.0 and peak > 0.45)
            )
            if is_transient:
                transient_frame_indices.append(i)
                
        has_impulsive = (len(transient_frame_indices) > 0) or (global_kurtosis > 6.0)
        
        return {
            "has_impulsive_noise": has_impulsive,
            "transient_count": len(transient_frame_indices),
            "max_kurtosis": round(max(global_kurtosis, float(np.max(kurtosis_list))), 2),
            "max_crest_factor": round(max(global_crest, float(np.max(crest_list))), 2),
            "transient_frames": transient_frame_indices,
            "transient_ratio": len(transient_frame_indices) / max(1, n_frames)
        }

    def suppress_impulsive(
        self,
        audio: np.ndarray,
        vad_mask: np.ndarray = None,
        speech_preservation_factor: float = 0.8
    ) -> Tuple[np.ndarray, Dict[str, Any]]:
        """
        Selectively suppress impulsive transients.
        Safeguards consonants: Plosives (/p/, /t/, /k/) are preserved by testing
        frequency distribution and avoiding full blanking when speech is detected.
        """
        analysis = self.analyze_transients(audio)
        if not analysis["has_impulsive_noise"]:
            return audio.copy(), analysis
            
        enhanced = audio.copy()
        n_frames = len(audio) // self.subframe_len
        
        # Compute median envelope over 31-sample window for adaptive non-linear despiking
        med_filtered = signal.medfilt(audio, kernel_size=15)
        
        for frame_idx in analysis["transient_frames"]:
            start = frame_idx * self.subframe_len
            end = min(len(audio), (frame_idx + 1) * self.subframe_len)
            frame = audio[start:end]
            
            # Check if this frame is speech consonant:
            # Consonants typically have significant energy above 2000Hz and moderate duration.
            # In contrast, gunfire/artillery impulses have massive low-mid shockwave energy and extreme peaks.
            peak = np.max(np.abs(frame))
            
            # Calculate high-frequency ratio
            b_high, a_high = signal.butter(2, 2000 / (self.sr / 2), btype='high')
            hf_energy = np.mean(signal.lfilter(b_high, a_high, frame) ** 2) + 1e-12
            total_energy = np.mean(frame ** 2) + 1e-12
            hf_ratio = hf_energy / total_energy
            
            # If high speech preservation and plausible consonant characteristics:
            if hf_ratio > 0.45 and peak < 0.6:
                # Soft attenuation to preserve consonant articulation
                attenuation = 1.0 - (0.4 * (1.0 - speech_preservation_factor))
                enhanced[start:end] = frame * attenuation
            else:
                # True gunfire/blast transient: Apply soft limiter and blend with median-filtered baseline
                # Taper edges with Tukey/Hann window to avoid click artifacts
                win = signal.windows.tukey(end - start, alpha=0.3)
                
                # Attenuated shockwave + median reconstruction
                spike_reduction = 0.15 + (0.15 * speech_preservation_factor)
                suppressed_frame = (med_filtered[start:end] * 0.7) + (frame * spike_reduction)
                
                enhanced[start:end] = frame * (1.0 - win) + suppressed_frame * win
                
        return enhanced.astype(np.float32), analysis
