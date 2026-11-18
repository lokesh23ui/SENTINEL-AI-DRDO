"""
SENTINEL-AI Automated Test Suite
Verifies audio preprocessing, hybrid speech enhancement, noise classification,
impulsive detection, and objective performance metrics calculation.
"""

import os
import sys
import numpy as np
import pytest

# Add backend directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from preprocessing import (
    ensure_mono, resample_audio, normalize_audio,
    compute_stft, compute_istft, compute_vad_mask
)
from impulsive_detector import ImpulsiveNoiseDetector
from noise_classifier import IntelligentNoiseClassifier, NOISE_CLASSES
from adaptive_controller import AdaptiveController
from speech_enhancement import HybridSpeechEnhancementPipeline
from metrics import calculate_si_sdr, estimate_snr_from_audio, compute_audio_metrics
from dataset_generator import (
    generate_stationary_engine_noise,
    generate_helicopter_rotor_noise,
    generate_impulsive_gunfire_noise,
    generate_synthetic_clean_speech,
    mix_speech_and_noise
)


def test_preprocessing_stft_istft_reconstruction():
    """Verify STFT and ISTFT invertibility and signal reconstruction."""
    sr = 16000
    duration = 1.0
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Generate test sine wave at 440 Hz
    original = (0.5 * np.sin(2 * np.pi * 440.0 * t)).astype(np.float32)
    
    mag, phase, zxx = compute_stft(original, n_fft=512, hop_length=128, win_length=512)
    reconstructed = compute_istft(zxx, hop_length=128, win_length=512, target_length=len(original))
    
    # Check reconstruction error
    error = np.mean((original - reconstructed) ** 2)
    assert error < 1e-4, f"STFT/ISTFT reconstruction error too high: {error}"


def test_impulsive_detector_detects_gunfire():
    """Verify transient detector identifies impulsive spikes and measures high kurtosis."""
    sr = 16000
    detector = ImpulsiveNoiseDetector(sr=sr)
    
    # Generate gunfire audio
    gunfire = generate_impulsive_gunfire_noise(duration=2.0, sr=sr, num_shots=2)
    analysis = detector.analyze_transients(gunfire)
    
    assert analysis["has_impulsive_noise"] is True, "Failed to detect impulsive transients"
    assert analysis["max_kurtosis"] > 5.0, f"Expected high kurtosis for gunfire, got {analysis['max_kurtosis']}"
    
    # Test suppression
    suppressed, info = detector.suppress_impulsive(gunfire)
    assert len(suppressed) == len(gunfire)
    # Peak amplitude of spikes should be attenuated
    assert np.max(np.abs(suppressed)) <= np.max(np.abs(gunfire))


def test_noise_classifier_features_and_probabilities():
    """Verify noise classifier returns valid probabilities across all 6 classes."""
    sr = 16000
    classifier = IntelligentNoiseClassifier(sr=sr)
    
    # Test on engine noise
    engine = generate_stationary_engine_noise(duration=1.5, sr=sr)
    result = classifier.classify(engine)
    
    assert "predicted_category" in result
    assert result["predicted_category"] in NOISE_CLASSES
    assert 0.0 <= result["confidence"] <= 100.0
    assert "features" in result
    assert result["features"]["spectral_centroid"] > 0
    assert "recommended_profile" in result
    
    # Verify probability distribution sums to ~1.0
    prob_sum = sum(result["probabilities"].values())
    assert abs(prob_sum - 1.0) < 0.05, f"Probabilities do not sum to 1: {prob_sum}"


def test_snr_mixing_accuracy():
    """Verify dataset mixer achieves requested target SNR within ±1.0 dB tolerance."""
    sr = 16000
    clean = generate_synthetic_clean_speech(duration=2.0, sr=sr)
    noise = generate_stationary_engine_noise(duration=2.0, sr=sr)
    
    for target in [-5.0, 0.0, 5.0, 10.0]:
        mixed, actual = mix_speech_and_noise(clean, noise, target_snr_db=target)
        assert abs(actual - target) < 1.0, f"Target {target} dB, got {actual} dB"


def test_si_sdr_calculation():
    """Verify SI-SDR metric on known signals."""
    ref = np.random.randn(16000).astype(np.float32)
    # Identical signal should yield high SI-SDR (> 30 dB)
    si_sdr_clean = calculate_si_sdr(ref, ref)
    assert si_sdr_clean > 25.0
    
    # Heavily corrupted signal should yield negative or lower SI-SDR
    noisy = ref + 2.0 * np.random.randn(16000).astype(np.float32)
    si_sdr_noisy = calculate_si_sdr(ref, noisy)
    assert si_sdr_noisy < si_sdr_clean


def test_hybrid_pipeline_end_to_end():
    """Verify full 8-stage speech enhancement pipeline runs end-to-end without errors."""
    pipeline = HybridSpeechEnhancementPipeline(sr=16000)
    clean = generate_synthetic_clean_speech(duration=1.5, sr=16000)
    rotor = generate_helicopter_rotor_noise(duration=1.5, sr=16000)
    noisy, _ = mix_speech_and_noise(clean, rotor, target_snr_db=0.0)
    
    enhanced, diag = pipeline.process_file_or_buffer(
        audio=noisy,
        orig_sr=16000,
        user_profile="auto",
        speech_preservation_priority=0.85
    )
    
    assert len(enhanced) == len(noisy)
    assert not np.isnan(enhanced).any()
    assert not np.isinf(enhanced).any()
    assert diag["real_time_factor"] > 0
    assert "classification" in diag
    assert "profile_applied" in diag


if __name__ == "__main__":
    pytest.main(["-v", __file__])
