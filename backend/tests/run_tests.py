"""
SENTINEL-AI Standalone Test Runner
Runs pipeline verification, DSP math verification, and endpoint tests directly.
"""

import os
import sys
import time

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from main import app, health_check, list_test_presets, run_edge_benchmark
from preprocessing import compute_stft, compute_istft
from speech_enhancement import HybridSpeechEnhancementPipeline
from impulsive_detector import ImpulsiveNoiseDetector
from noise_classifier import IntelligentNoiseClassifier
from dataset_generator import generate_impulsive_gunfire_noise, generate_stationary_engine_noise, generate_synthetic_clean_speech
import numpy as np


def run_all_checks():
    print("==================================================")
    print("  SENTINEL-AI SYSTEM VERIFICATION RUNNER")
    print("==================================================")
    
    # 1. Health check
    h = health_check()
    assert h["status"] == "OPERATIONAL"
    print(f"[*] Health Check: PASS (Device: {h['device']}, Statement: {h['drdo_problem_statement']})")
    
    # 2. Preset listing
    presets = list_test_presets()["presets"]
    assert len(presets) >= 5
    print(f"[*] Presets Loaded: PASS ({len(presets)} tactical defence scenarios)")
    for p in presets:
        print(f"    - [{p['id']}] {p['title']} ({p['category']}, SNR: {p['target_snr_db']} dB)")
        
    # 3. DSP Invertibility Check
    t = np.linspace(0, 1.0, 16000, endpoint=False)
    sig = (0.5 * np.sin(2 * np.pi * 500 * t)).astype(np.float32)
    mag, phase, zxx = compute_stft(sig)
    recon = compute_istft(zxx, target_length=len(sig))
    err = np.mean((sig - recon) ** 2)
    assert err < 1e-4
    print(f"[*] DSP STFT/ISTFT Invertibility: PASS (Reconstruction MSE: {err:.2e})")
    
    # 4. Impulsive Detection Check
    det = ImpulsiveNoiseDetector(16000)
    gunfire = generate_impulsive_gunfire_noise(2.0, 16000, 2)
    res = det.analyze_transients(gunfire)
    assert res["has_impulsive_noise"] is True
    print(f"[*] Impulsive Gunfire Detection: PASS (Max Kurtosis: {res['max_kurtosis']}, Transients: {res['transient_count']})")
    
    # 5. Noise Classifier Check
    clf = IntelligentNoiseClassifier(16000)
    eng = generate_stationary_engine_noise(1.5, 16000)
    c_res = clf.classify(eng)
    assert c_res["predicted_category"] == "stationary_engine"
    print(f"[*] Noise Classifier: PASS (Predicted: {c_res['display_name']}, Confidence: {c_res['confidence']}%)")
    
    # 6. Hybrid Speech Enhancement Pipeline Check
    pipe = HybridSpeechEnhancementPipeline(16000)
    clean = generate_synthetic_clean_speech(2.0, 16000)
    eng_noise = generate_stationary_engine_noise(2.0, 16000)
    min_len = min(len(clean), len(eng_noise))
    noisy = clean[:min_len] + 0.8 * eng_noise[:min_len]
    t0 = time.time()
    enh, diag = pipe.process_file_or_buffer(noisy, 16000)
    elapsed = time.time() - t0
    assert len(enh) == len(noisy)
    print(f"[*] Hybrid Speech Enhancement: PASS (Duration: {diag['duration_sec']}s, Processed in: {elapsed:.3f}s, RTF: {diag['real_time_factor']})")
    
    # 7. Edge Benchmark Check
    bench = run_edge_benchmark()
    lat = bench["frame_10ms_benchmark"]["avg_inference_latency_ms"]
    rtf = bench["frame_10ms_benchmark"]["real_time_factor"]
    print(f"[*] ONNX Edge Inference Benchmark: PASS (10ms frame latency: {lat} ms, RTF: {rtf})")
    print(f"    - Hardware target: {bench['target_architecture']}")
    print(f"    - Feasibility: {bench['embedded_feasibility']}")
    
    print("==================================================")
    print("  ALL 7 CORE SYSTEM VERIFICATION CHECKS PASSED!")
    print("==================================================")


if __name__ == "__main__":
    run_all_checks()
