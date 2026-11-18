"""
SENTINEL-AI: Tactical Dataset Generator & Training Pipeline
Generates paired noisy-clean speech datasets at configurable SNRs (-5, 0, 5, 10, 15 dB),
trains the CNN noise classifier, and exports reproducible dataset packages.
"""

import numpy as np
from scipy import signal
import soundfile as sf
import torch
import torch.nn as nn
import torch.optim as optim
from torch.utils.data import Dataset, DataLoader
import os
import json
import zipfile
import time
from typing import Dict, Any, List, Tuple

from noise_classifier import NoiseClassifierCNN, NOISE_CLASSES


def generate_stationary_engine_noise(duration: float = 3.0, sr: int = 16000, rpm: float = 2400.0) -> np.ndarray:
    """
    Synthesize heavy military diesel engine hum (armored personnel carrier / tank).
    Combines cylinder firing harmonics with exhaust rumble and low-pass turbo hiss.
    """
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Fundamental firing rate for 6-cylinder 4-stroke engine at given RPM: RPM / 120 * 6 = RPM / 20
    f0 = rpm / 20.0 # ~120 Hz
    
    # Harmonic stack
    noise = (
        0.5 * np.sin(2 * np.pi * f0 * t) +
        0.3 * np.sin(2 * np.pi * 2 * f0 * t + 0.4) +
        0.2 * np.sin(2 * np.pi * 3 * f0 * t + 1.2) +
        0.15 * np.sin(2 * np.pi * 4 * f0 * t + 2.1) +
        0.1 * np.sin(2 * np.pi * 5 * f0 * t + 0.8)
    )
    # Add mechanical rumble (colored low-pass noise)
    white = np.random.normal(0, 0.25, len(t))
    b, a = signal.butter(3, 400.0 / (sr / 2), btype='low')
    rumble = signal.lfilter(b, a, white)
    
    combined = noise + rumble
    return (combined / (np.max(np.abs(combined)) + 1e-6)).astype(np.float32)


def generate_helicopter_rotor_noise(duration: float = 3.0, sr: int = 16000, num_blades: int = 4, rpm: float = 320.0) -> np.ndarray:
    """
    Synthesize non-stationary helicopter main rotor blade chopping sound.
    Blade passage frequency = (RPM / 60) * num_blades (~21.3 Hz).
    """
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    bpf = (rpm / 60.0) * num_blades # ~21.3 Hz
    
    # Periodic chopping pulse train
    chopping_phase = 2 * np.pi * bpf * t
    chopping_envelope = np.maximum(0.0, np.cos(chopping_phase)) ** 6
    
    # Turbulent rotor downwash (pink noise shaped through blade envelope)
    white = np.random.normal(0, 0.4, len(t))
    b, a = signal.butter(2, [80.0 / (sr / 2), 1200.0 / (sr / 2)], btype='band')
    blade_air = signal.lfilter(b, a, white) * chopping_envelope
    
    # Tail rotor high-frequency whine (~120 Hz)
    tail_whine = 0.2 * np.sin(2 * np.pi * 125.0 * t)
    
    combined = blade_air * 1.5 + tail_whine
    return (combined / (np.max(np.abs(combined)) + 1e-6)).astype(np.float32)


def generate_wind_turbulence(duration: float = 3.0, sr: int = 16000) -> np.ndarray:
    """
    Synthesize low-frequency stochastic wind turbulence with non-stationary gusts.
    """
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    # Slow gust modulation envelope (0.2 Hz to 1.5 Hz)
    gust_mod = 0.5 + 0.5 * (np.sin(2 * np.pi * 0.3 * t) * np.sin(2 * np.pi * 0.8 * t + 0.5))
    
    white = np.random.normal(0, 0.5, len(t))
    # Steep low-pass filter at 150 Hz
    b, a = signal.butter(3, 160.0 / (sr / 2), btype='low')
    wind = signal.lfilter(b, a, white) * gust_mod
    return (wind / (np.max(np.abs(wind)) + 1e-6)).astype(np.float32)


def generate_impulsive_gunfire_noise(duration: float = 3.0, sr: int = 16000, num_shots: int = 3) -> np.ndarray:
    """
    Synthesize sharp muzzle blast transients using the Friedlander shockwave model
    (steep pressure discontinuity spike followed by exponential expansion and room reverberation).
    """
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    signal_out = np.zeros(len(t), dtype=np.float32)
    
    # Shot timestamps evenly spaced within duration
    shot_times = [duration * 0.2, duration * 0.5, duration * 0.8][:num_shots]
    
    for shot_t in shot_times:
        start_idx = int(shot_t * sr)
        if start_idx >= len(t):
            continue
        
        # Blast shockwave duration ~150ms
        shot_len = int(0.15 * sr)
        end_idx = min(len(t), start_idx + shot_len)
        n_pts = end_idx - start_idx
        shot_t_arr = np.linspace(0, n_pts / sr, n_pts)
        
        # Friedlander shockwave: instantaneous rise to +1.0, rapid decay, negative phase
        td = 0.005 # 5ms positive phase
        b = 2.0
        shock = np.zeros(n_pts, dtype=np.float32)
        pos_mask = shot_t_arr < td
        shock[pos_mask] = (1.0 - shot_t_arr[pos_mask] / td) * np.exp(-b * shot_t_arr[pos_mask] / td)
        
        # Acoustic reverberation and chamber ring
        ring = 0.3 * np.sin(2 * np.pi * 280.0 * shot_t_arr) * np.exp(-shot_t_arr / 0.04)
        tail_noise = np.random.normal(0, 0.15, n_pts) * np.exp(-shot_t_arr / 0.06)
        
        combined_shot = shock * 2.5 + ring + tail_noise
        signal_out[start_idx:end_idx] += combined_shot
        
    return (signal_out / (np.max(np.abs(signal_out)) + 1e-6)).astype(np.float32)


def generate_synthetic_clean_speech(duration: float = 3.0, sr: int = 16000) -> np.ndarray:
    """
    Synthesize phonetically structured clean speech-like signal using vocal tract formants
    (F1 ~ 500Hz, F2 ~ 1500Hz, F3 ~ 2500Hz) modulated by pitch pulses and syllabic envelopes.
    """
    t = np.linspace(0, duration, int(sr * duration), endpoint=False)
    
    # Syllable rhythm envelope (~3 Hz cadence of human speech)
    syllables = np.maximum(0.0, np.sin(2 * np.pi * 3.2 * t)) ** 2
    # Pause between words
    pause_mask = (t < 0.2) | ((t > 1.2) & (t < 1.5)) | (t > 2.8)
    syllables[pause_mask] = 0.0
    
    # Glottal pitch pulse train (F0 ~ 130 Hz fundamental frequency)
    f0 = 130.0
    glottal = signal.sawtooth(2 * np.pi * f0 * t, width=0.1)
    
    # Vocal tract formants filtering
    # Formant 1: 500 Hz
    b1, a1 = signal.butter(2, [450.0 / (sr / 2), 550.0 / (sr / 2)], btype='band')
    f1 = signal.lfilter(b1, a1, glottal) * 1.0
    
    # Formant 2: 1500 Hz
    b2, a2 = signal.butter(2, [1400.0 / (sr / 2), 1600.0 / (sr / 2)], btype='band')
    f2 = signal.lfilter(b2, a2, glottal) * 0.7
    
    # Formant 3: 2500 Hz
    b3, a3 = signal.butter(2, [2400.0 / (sr / 2), 2600.0 / (sr / 2)], btype='band')
    f3 = signal.lfilter(b3, a3, glottal) * 0.4
    
    speech = (f1 + f2 + f3) * syllables
    return (speech / (np.max(np.abs(speech)) + 1e-6)).astype(np.float32)


def mix_speech_and_noise(clean: np.ndarray, noise: np.ndarray, target_snr_db: float) -> Tuple[np.ndarray, float]:
    """
    Mix clean speech and noise to achieve exact target SNR in dB.
    Returns: (noisy_audio, actual_snr_db)
    """
    min_len = min(len(clean), len(noise))
    s = clean[:min_len].astype(np.float64)
    n = noise[:min_len].astype(np.float64)
    
    p_s = np.mean(s ** 2) + 1e-12
    p_n = np.mean(n ** 2) + 1e-12
    
    # Scale factor for noise
    # Target SNR = 10 * log10(P_s / (k^2 * P_n)) -> k = sqrt(P_s / (P_n * 10^(SNR/10)))
    k = np.sqrt(p_s / (p_n * (10.0 ** (target_snr_db / 10.0))))
    scaled_noise = k * n
    
    mixed = s + scaled_noise
    # Rescale to avoid clipping
    max_amp = np.max(np.abs(mixed))
    if max_amp > 0.95:
        mixed = mixed * (0.95 / max_amp)
        
    actual_snr = 10.0 * np.log10(p_s / (np.mean(scaled_noise ** 2) + 1e-12))
    return mixed.astype(np.float32), float(actual_snr)


class DatasetPreparationPipeline:
    """
    Generates structured datasets for training and testing defence audio models.
    """
    def __init__(self, output_dir: str = "backend/data/dataset", sr: int = 16000):
        self.output_dir = output_dir
        self.sr = sr
        os.makedirs(output_dir, exist_ok=True)

    def generate_paired_dataset(
        self,
        samples_per_class: int = 10,
        snr_levels: List[float] = [-5.0, 0.0, 5.0, 10.0, 15.0],
        split_ratios: Tuple[float, float, float] = (0.7, 0.15, 0.15)
    ) -> Dict[str, Any]:
        """
        Synthesize paired noisy-clean audio files across 5 SNR levels
        and split into train, val, and test sets.
        """
        t0 = time.time()
        splits = ["train", "val", "test"]
        for s in splits:
            os.makedirs(os.path.join(self.output_dir, s, "clean"), exist_ok=True)
            os.makedirs(os.path.join(self.output_dir, s, "noisy"), exist_ok=True)
            
        noise_generators = {
            "stationary_engine": lambda: generate_stationary_engine_noise(3.0, self.sr),
            "rotor_noise": lambda: generate_helicopter_rotor_noise(3.0, self.sr),
            "wind_turbulence": lambda: generate_wind_turbulence(3.0, self.sr),
            "impulsive_burst": lambda: generate_impulsive_gunfire_noise(3.0, self.sr),
            "mixed_combat": lambda: (generate_stationary_engine_noise(3.0, self.sr)*0.5 + generate_helicopter_rotor_noise(3.0, self.sr)*0.5)
        }
        
        manifest = []
        total_generated = 0
        
        for noise_type, gen_fn in noise_generators.items():
            for i in range(samples_per_class):
                # Random split assignment
                r = np.random.rand()
                if r < split_ratios[0]:
                    split = "train"
                elif r < split_ratios[0] + split_ratios[1]:
                    split = "val"
                else:
                    split = "test"
                    
                target_snr = float(np.random.choice(snr_levels))
                clean_audio = generate_synthetic_clean_speech(3.0, self.sr)
                noise_audio = gen_fn()
                
                noisy_audio, actual_snr = mix_speech_and_noise(clean_audio, noise_audio, target_snr)
                
                filename_base = f"{noise_type}_{i:03d}_{int(target_snr)}db"
                clean_path = os.path.join(self.output_dir, split, "clean", f"{filename_base}_clean.wav")
                noisy_path = os.path.join(self.output_dir, split, "noisy", f"{filename_base}_noisy.wav")
                
                sf.write(clean_path, clean_audio, self.sr)
                sf.write(noisy_path, noisy_audio, self.sr)
                
                manifest.append({
                    "id": filename_base,
                    "split": split,
                    "noise_type": noise_type,
                    "target_snr_db": target_snr,
                    "actual_snr_db": round(actual_snr, 2),
                    "duration_sec": 3.0,
                    "sample_rate": self.sr,
                    "clean_file": clean_path,
                    "noisy_file": noisy_path
                })
                total_generated += 1
                
        # Write dataset manifest
        manifest_path = os.path.join(self.output_dir, "dataset_manifest.json")
        with open(manifest_path, "w") as f:
            json.dump({
                "generated_at": time.strftime("%Y-%m-%d %H:%M:%S"),
                "total_samples": total_generated,
                "classes": list(noise_generators.keys()),
                "snr_levels_db": snr_levels,
                "split_ratios": {"train": split_ratios[0], "val": split_ratios[1], "test": split_ratios[2]},
                "samples": manifest
            }, f, indent=2)
            
        return {
            "status": "success",
            "total_pairs_generated": total_generated,
            "manifest_file": manifest_path,
            "elapsed_sec": round(time.time() - t0, 2),
            "snr_distribution": snr_levels,
            "splits_summary": {
                "train": sum(1 for m in manifest if m["split"] == "train"),
                "val": sum(1 for m in manifest if m["split"] == "val"),
                "test": sum(1 for m in manifest if m["split"] == "test")
            }
        }

    def train_noise_classifier(self, num_epochs: int = 5, batch_size: int = 8, lr: float = 0.001) -> Dict[str, Any]:
        """
        Train the 1D/2D CNN noise classifier on generated tactical audio.
        Saves checkpoint and logs training loss curves.
        """
        from noise_classifier import IntelligentNoiseClassifier
        
        t0 = time.time()
        classifier_helper = IntelligentNoiseClassifier(sr=self.sr)
        model = classifier_helper.model
        model.train()
        
        optimizer = optim.Adam(model.parameters(), lr=lr)
        criterion = nn.CrossEntropyLoss()
        
        # Synthesize training batch data in-memory
        x_list = []
        y_list = []
        
        # Generate 6 samples per class for quick demonstration training
        class_keys = ["stationary_engine", "rotor_noise", "wind_turbulence", "impulsive_burst", "mixed_combat", "clean_speech"]
        gens = [
            lambda: generate_stationary_engine_noise(1.5, self.sr),
            lambda: generate_helicopter_rotor_noise(1.5, self.sr),
            lambda: generate_wind_turbulence(1.5, self.sr),
            lambda: generate_impulsive_gunfire_noise(1.5, self.sr),
            lambda: (generate_stationary_engine_noise(1.5, self.sr) + generate_wind_turbulence(1.5, self.sr))*0.5,
            lambda: generate_synthetic_clean_speech(1.5, self.sr)
        ]
        
        for class_idx, gen_func in enumerate(gens):
            for _ in range(6):
                audio = gen_func()
                mel = classifier_helper.compute_mel_spectrogram(audio)
                x_list.append(mel)
                y_list.append(class_idx)
                
        # Stack tensors
        x_arr = np.stack(x_list) # (N, MelBins, TimeFrames)
        y_arr = np.array(y_list, dtype=np.int64)
        
        x_tensor = torch.from_numpy(x_arr)
        y_tensor = torch.from_numpy(y_arr)
        
        dataset = torch.utils.data.TensorDataset(x_tensor, y_tensor)
        loader = DataLoader(dataset, batch_size=batch_size, shuffle=True)
        
        history = []
        for epoch in range(1, num_epochs + 1):
            total_loss = 0.0
            correct = 0
            total = 0
            
            for bx, by in loader:
                optimizer.zero_grad()
                outputs = model(bx)
                loss = criterion(outputs, by)
                loss.backward()
                optimizer.step()
                
                total_loss += loss.item() * len(by)
                preds = torch.argmax(outputs, dim=-1)
                correct += (preds == by).sum().item()
                total += len(by)
                
            avg_loss = total_loss / total
            acc = (correct / total) * 100.0
            history.append({
                "epoch": epoch,
                "loss": round(avg_loss, 4),
                "accuracy": round(acc, 1)
            })
            
        # Save model checkpoint
        checkpoint_path = os.path.join(self.output_dir, "noise_classifier_checkpoint.pt")
        torch.save(model.state_dict(), checkpoint_path)
        
        model.eval()
        return {
            "status": "completed",
            "epochs": num_epochs,
            "final_loss": history[-1]["loss"],
            "final_accuracy": history[-1]["accuracy"],
            "history": history,
            "checkpoint_path": checkpoint_path,
            "training_time_sec": round(time.time() - t0, 2)
        }
