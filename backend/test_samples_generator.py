"""
SENTINEL-AI: Preloaded Tactical Audio Test Generator
Generates realistic military defence audio scenarios with ground truth clean speech
and authentic noise profiles (Tank Engine, Helicopter Rotor, Artillery Bursts, Mixed Storm)
so evaluators can immediately test speech enhancement without external files.
"""

import os
import numpy as np
import soundfile as sf
from typing import Dict, Any, List

from dataset_generator import (
    generate_stationary_engine_noise,
    generate_helicopter_rotor_noise,
    generate_wind_turbulence,
    generate_impulsive_gunfire_noise,
    generate_synthetic_clean_speech,
    mix_speech_and_noise
)


PRESETS_DIR = "backend/data/presets"


def generate_tactical_test_presets(output_dir: str = PRESETS_DIR) -> List[Dict[str, Any]]:
    """
    Generate 5 pre-packaged tactical defence test scenarios:
    1. Armored Tank / APC Engine Hum (Stationary Noise, 0 dB SNR)
    2. Attack Helicopter Rotor Chopping (Non-Stationary Noise, -3 dB SNR)
    3. Artillery & Gunfire Combat Transients (Impulsive Bursts, -5 dB SNR)
    4. Extreme Combat Storm (Mixed Engine + Wind + Gunfire, -8 dB SNR)
    5. Clean Infantry Voice Patrol Check (Low Noise baseline, 20 dB SNR)
    """
    os.makedirs(output_dir, exist_ok=True)
    sr = 16000
    duration = 4.0
    
    presets_config = [
        {
            "id": "tank_engine_hum",
            "title": "Armored Vehicle / Tank Diesel Engine Hum",
            "category": "Stationary Noise",
            "target_snr_db": 0.0,
            "description": "Heavy 6-cylinder diesel powertrain hum with low-frequency chassis vibration.",
            "noise_gen": lambda: generate_stationary_engine_noise(duration, sr, rpm=2200.0)
        },
        {
            "id": "helicopter_rotor_blade",
            "title": "Tactical Helicopter Rotor Blade Chopping",
            "category": "Non-Stationary Noise",
            "target_snr_db": -3.0,
            "description": "Cyclic 21 Hz blade pass chopping pulses with tail rotor whine and turbulent downwash.",
            "noise_gen": lambda: generate_helicopter_rotor_noise(duration, sr, num_blades=4, rpm=315.0)
        },
        {
            "id": "artillery_gunfire_burst",
            "title": "Artillery & Gunfire Impulsive Transients",
            "category": "Impulsive Noise",
            "target_snr_db": -5.0,
            "description": "Sudden high-kurtosis muzzle blast shockwaves with sharp acoustic decay.",
            "noise_gen": lambda: generate_impulsive_gunfire_noise(duration, sr, num_shots=4)
        },
        {
            "id": "combat_storm_mixed",
            "title": "Extreme Combined Combat Storm",
            "category": "Mixed Environmental Noise",
            "target_snr_db": -8.0,
            "description": "Simultaneous gale wind turbulence, distant engine drone, and sporadic gunfire bursts.",
            "noise_gen": lambda: (
                generate_stationary_engine_noise(duration, sr)*0.4 +
                generate_wind_turbulence(duration, sr)*0.4 +
                generate_impulsive_gunfire_noise(duration, sr, num_shots=3)*0.5
            )
        },
        {
            "id": "border_patrol_clean",
            "title": "Border Patrol Radio Check (Baseline)",
            "category": "Low-Noise Speech",
            "target_snr_db": 22.0,
            "description": "Clean tactical radio transmission with slight atmospheric carrier hiss.",
            "noise_gen": lambda: np.random.normal(0, 0.02, int(duration * sr)).astype(np.float32)
        }
    ]
    
    generated_presets = []
    
    for cfg in presets_config:
        clean_audio = generate_synthetic_clean_speech(duration, sr)
        noise_audio = cfg["noise_gen"]()
        
        noisy_audio, actual_snr = mix_speech_and_noise(clean_audio, noise_audio, cfg["target_snr_db"])
        
        clean_file = os.path.join(output_dir, f"{cfg['id']}_clean.wav")
        noisy_file = os.path.join(output_dir, f"{cfg['id']}_noisy.wav")
        
        sf.write(clean_file, clean_audio, sr)
        sf.write(noisy_file, noisy_audio, sr)
        
        generated_presets.append({
            "id": cfg["id"],
            "title": cfg["title"],
            "category": cfg["category"],
            "target_snr_db": cfg["target_snr_db"],
            "actual_snr_db": round(actual_snr, 1),
            "description": cfg["description"],
            "duration_sec": duration,
            "sample_rate": sr,
            "clean_file": clean_file,
            "noisy_file": noisy_file,
            "noisy_url": f"/api/audio/preset/{cfg['id']}/noisy",
            "clean_url": f"/api/audio/preset/{cfg['id']}/clean"
        })
        
    return generated_presets
