"""
SENTINEL-AI: Headless Edge Runtime for Raspberry Pi & Embedded Systems
Runs low-latency audio processing directly on ARM/x86 Linux without GUI.
Smart India Hackathon SIH26052 (DRDO)
"""

import argparse
import time
import sys
import os
import numpy as np
import soundfile as sf

sys.path.insert(0, os.path.dirname(__file__))

from speech_enhancement import HybridSpeechEnhancementPipeline
from model_optimizer import EdgeModelOptimizer


def run_edge_processor(args):
    print("==================================================")
    print("  SENTINEL-AI HEADLESS EMBEDDED EDGE RUNNER")
    print("  Hardware Target: Raspberry Pi 4 / 5 (ARM64)")
    print("  DRDO Problem Statement: SIH26052")
    print("==================================================")

    pipeline = HybridSpeechEnhancementPipeline(sr=16000)
    optimizer = EdgeModelOptimizer()

    if args.benchmark_only:
        print("[*] Running ONNX edge inference benchmark...")
        bench = optimizer.benchmark_inference(num_iterations=50)
        print(f"[+] Average 10ms Frame Latency: {bench['frame_10ms_benchmark']['avg_inference_latency_ms']} ms")
        print(f"[+] Real-Time Factor: {bench['frame_10ms_benchmark']['real_time_factor']}")
        print(f"[+] Feasibility: {bench['embedded_feasibility']}")
        print(f"[+] Flash Size: {bench['model_footprint']['total_flash_storage_mb']} MB")
        return

    if args.input_file:
        print(f"[*] Processing file: {args.input_file}")
        audio, sr = sf.read(args.input_file)
        t0 = time.time()
        enhanced, diag = pipeline.process_file_or_buffer(
            audio=audio,
            orig_sr=sr,
            user_profile=args.profile,
            speech_preservation_priority=args.speech_preservation
        )
        elapsed = time.time() - t0
        output_path = args.output_file or "enhanced_output.wav"
        sf.write(output_path, enhanced, 16000)
        print(f"[+] Done in {elapsed:.3f}s (RTF: {diag['real_time_factor']})")
        print(f"[+] Threat Category: {diag['classification']['display_name']}")
        print(f"[+] Enhanced audio saved to: {output_path}")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="SENTINEL-AI Edge Processor")
    parser.add_argument("--input-file", type=str, help="Input WAV file to process")
    parser.add_argument("--output-file", type=str, help="Output enhanced WAV file path")
    parser.add_argument("--profile", type=str, default="auto", help="Suppression profile (auto/stationary_engine/rotor_noise/impulsive_burst/mixed_combat)")
    parser.add_argument("--speech-preservation", type=float, default=0.85, help="Speech preservation weight (0.5 to 1.0)")
    parser.add_argument("--benchmark-only", action="store_true", help="Run edge CPU inference benchmark")
    
    args = parser.parse_args()
    run_edge_processor(args)
