"""
SENTINEL-AI: Audio Preprocessing Module
DSP operations: Framing, Windowing, STFT/ISTFT, Resampling, Normalization, VAD
"""

import numpy as np
from scipy import signal
from typing import Tuple, Optional


def ensure_mono(audio: np.ndarray) -> np.ndarray:
    """Convert stereo/multichannel audio to mono float32."""
    if audio.ndim == 1:
        return audio.astype(np.float32)
    elif audio.ndim == 2:
        # Average across channels
        if audio.shape[0] < audio.shape[1]:
            return np.mean(audio, axis=0).astype(np.float32)
        else:
            return np.mean(audio, axis=1).astype(np.float32)
    else:
        raise ValueError(f"Unsupported audio shape: {audio.shape}")


def normalize_audio(audio: np.ndarray, target_db: float = -20.0, max_peak: float = 0.95) -> np.ndarray:
    """
    Normalize audio to target RMS dB level with peak limiting to avoid digital clipping.
    """
    audio = audio.astype(np.float32)
    rms = np.sqrt(np.mean(audio ** 2) + 1e-12)
    if rms < 1e-6:
        return audio
    
    current_db = 20.0 * np.log10(rms)
    gain = 10.0 ** ((target_db - current_db) / 20.0)
    normalized = audio * gain
    
    # Peak clamp/compress if exceeding max_peak
    peak = np.max(np.abs(normalized))
    if peak > max_peak:
        normalized = normalized * (max_peak / peak)
        
    return normalized


def resample_audio(audio: np.ndarray, orig_sr: int, target_sr: int = 16000) -> np.ndarray:
    """
    Resample audio using high-quality polyphase filtering.
    Target rate 16000 Hz is standard for military speech intelligibility and deep models.
    """
    if orig_sr == target_sr:
        return audio.astype(np.float32)
    
    # Greatest common divisor for optimal polyphase rational factors
    import math
    gcd = math.gcd(orig_sr, target_sr)
    up = target_sr // gcd
    down = orig_sr // gcd
    
    resampled = signal.resample_poly(audio, up, down).astype(np.float32)
    return resampled


def compute_stft(
    audio: np.ndarray,
    n_fft: int = 512,
    hop_length: int = 128,
    win_length: int = 512,
    window_type: str = 'hann'
) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
    """
    Compute Short-Time Fourier Transform.
    Returns:
        magnitude: (FreqBins, TimeFrames)
        phase: (FreqBins, TimeFrames)
        stft_complex: (FreqBins, TimeFrames)
    """
    win = signal.get_window(window_type, win_length, fftbins=True)
    _, _, zxx = signal.stft(
        audio,
        nperseg=win_length,
        noverlap=win_length - hop_length,
        nfft=n_fft,
        window=win,
        boundary='zeros',
        padded=True
    )
    magnitude = np.abs(zxx).astype(np.float32)
    phase = np.angle(zxx).astype(np.float32)
    return magnitude, phase, zxx


def compute_istft(
    stft_complex: np.ndarray,
    hop_length: int = 128,
    win_length: int = 512,
    target_length: Optional[int] = None,
    window_type: str = 'hann'
) -> np.ndarray:
    """
    Compute Inverse STFT with Overlap-Add (OLA) reconstruction.
    """
    win = signal.get_window(window_type, win_length, fftbins=True)
    _, audio_reconstructed = signal.istft(
        stft_complex,
        nperseg=win_length,
        noverlap=win_length - hop_length,
        nfft=win_length,
        window=win,
        boundary=True
    )
    audio_reconstructed = audio_reconstructed.astype(np.float32)
    
    if target_length is not None:
        if len(audio_reconstructed) > target_length:
            audio_reconstructed = audio_reconstructed[:target_length]
        elif len(audio_reconstructed) < target_length:
            audio_reconstructed = np.pad(audio_reconstructed, (0, target_length - len(audio_reconstructed)))
            
    return audio_reconstructed


def apply_pre_emphasis(audio: np.ndarray, coeff: float = 0.97) -> np.ndarray:
    """Boost high frequencies to compensate for natural human speech spectral tilt."""
    return np.append(audio[0], audio[1:] - coeff * audio[:-1]).astype(np.float32)


def apply_de_emphasis(audio: np.ndarray, coeff: float = 0.97) -> np.ndarray:
    """De-emphasis filter to restore original frequency balance."""
    return signal.lfilter([1.0], [1.0, -coeff], audio).astype(np.float32)


def compute_vad_mask(
    audio: np.ndarray,
    sr: int = 16000,
    frame_len: int = 512,
    hop_len: int = 128,
    energy_threshold_db: float = -35.0
) -> np.ndarray:
    """
    Robust dual-parameter Voice Activity Detector using short-time energy
    and spectral entropy to distinguish human speech from ambient noise.
    Returns: binary mask array corresponding to STFT frames.
    """
    mag, _, _ = compute_stft(audio, n_fft=frame_len, hop_length=hop_len, win_length=frame_len)
    
    # Frame energy in dB
    frame_energy = np.sum(mag ** 2, axis=0) + 1e-12
    max_energy = np.max(frame_energy)
    energy_db = 10.0 * np.log10(frame_energy / (max_energy + 1e-12))
    
    # Spectral entropy (speech has distinct formant peaks -> lower entropy; noise has flatter spectrum -> higher entropy)
    prob_dist = mag / (np.sum(mag, axis=0, keepdims=True) + 1e-12)
    spectral_entropy = -np.sum(prob_dist * np.log(prob_dist + 1e-12), axis=0)
    norm_entropy = spectral_entropy / np.log(mag.shape[0])
    
    # Speech condition: sufficient energy and structured spectrum (not pure white noise)
    vad_mask = (energy_db > energy_threshold_db) & (norm_entropy < 0.92)
    
    # Smooth VAD decisions with 3-frame morphological dilation to prevent chopping word ends
    smooth_mask = np.copy(vad_mask).astype(float)
    smooth_mask = signal.medfilt(smooth_mask, kernel_size=3) > 0.5
    
    return smooth_mask
