"""
SENTINEL-AI: Live Streaming Audio Buffer & Overlap-Add Frame Manager
Manages real-time PCM chunks from WebSockets, applies Hann windowing with 50% overlap,
and feeds the hybrid speech enhancement model with minimal latency (< 15ms).
"""

import numpy as np
from scipy import signal
from typing import Tuple, Dict, Any, Optional
import struct


class StreamingAudioBuffer:
    """
    Stateful streaming audio buffer with 50% overlap-add (OLA)
    to prevent frame boundary clicks during real-time speech enhancement.
    """
    def __init__(self, sample_rate: int = 16000, chunk_size: int = 512, overlap: int = 256):
        self.sr = sample_rate
        self.chunk_size = chunk_size
        self.overlap = overlap
        self.hop_size = chunk_size - overlap
        
        # Internal circular buffer
        self.input_buffer = np.zeros(chunk_size, dtype=np.float32)
        self.output_buffer = np.zeros(overlap, dtype=np.float32)
        self.window = signal.windows.hann(chunk_size, sym=False).astype(np.float32)
        
        # Audio stats
        self.processed_frames = 0
        self.total_latency_ms = 0.0

    def bytes_to_float32(self, raw_bytes: bytes) -> np.ndarray:
        """
        Convert incoming binary WebSocket bytes (Int16 PCM or Float32 PCM)
        into normalized numpy float32 array in [-1.0, 1.0].
        """
        n_bytes = len(raw_bytes)
        # Check if Int16 (2 bytes per sample) or Float32 (4 bytes per sample)
        if n_bytes % 4 == 0 and n_bytes > 0:
            try:
                # First test Float32
                floats = np.frombuffer(raw_bytes, dtype=np.float32)
                # If values are within [-1.5, 1.5], it's IEEE 754 float
                if np.max(np.abs(floats)) <= 1.5:
                    return floats.copy()
            except Exception:
                pass
                
        # Default Int16 PCM
        int16_arr = np.frombuffer(raw_bytes, dtype=np.int16)
        return (int16_arr.astype(np.float32) / 32768.0)

    def float32_to_bytes(self, audio: np.ndarray, format: str = "float32") -> bytes:
        """Convert float32 audio back to binary PCM bytes for WebSocket transmission."""
        clamped = np.clip(audio, -1.0, 1.0)
        if format == "int16":
            int16_arr = (clamped * 32767.0).astype(np.int16)
            return int16_arr.tobytes()
        else:
            return clamped.astype(np.float32).tobytes()

    def push_and_process_frame(
        self,
        new_samples: np.ndarray,
        process_callback
    ) -> Tuple[np.ndarray, float]:
        """
        Push incoming samples into ring buffer, execute callback on windowed frame,
        and reconstruct output with overlap-add.
        """
        # Append new samples and shift
        n_new = len(new_samples)
        if n_new >= self.chunk_size:
            current_frame = new_samples[-self.chunk_size:]
        else:
            self.input_buffer = np.roll(self.input_buffer, -n_new)
            self.input_buffer[-n_new:] = new_samples
            current_frame = self.input_buffer.copy()
            
        # Process through enhancement callback
        enhanced_frame, latency_ms = process_callback(current_frame)
        
        # Apply reconstruction window
        windowed_out = enhanced_frame * self.window
        
        # Overlap-add with previous tail
        out_samples = windowed_out[:self.overlap] + self.output_buffer
        self.output_buffer = windowed_out[self.overlap:]
        
        self.processed_frames += 1
        self.total_latency_ms += latency_ms
        
        return out_samples.astype(np.float32), latency_ms

    def reset(self):
        """Reset internal buffers on stream restart."""
        self.input_buffer.fill(0.0)
        self.output_buffer.fill(0.0)
        self.processed_frames = 0
        self.total_latency_ms = 0.0
