"""
SENTINEL-AI: Main Backend Application
FastAPI REST APIs & WebSockets for Real-Time Defence Speech Enhancement
Smart India Hackathon SIH26052 (DRDO)
"""

import os
import io
import time
import uuid
import json
import logging
from typing import Optional, Dict, Any

from fastapi import FastAPI, UploadFile, File, Form, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse, JSONResponse
import numpy as np
import soundfile as sf
import torch

from preprocessing import ensure_mono, resample_audio, normalize_audio
from speech_enhancement import HybridSpeechEnhancementPipeline
from noise_classifier import IntelligentNoiseClassifier, CLASS_DISPLAY_NAMES
from adaptive_controller import AdaptiveController
from impulsive_detector import ImpulsiveNoiseDetector
from metrics import compute_audio_metrics, generate_waveform_points, generate_spectrogram_matrix
from dataset_generator import DatasetPreparationPipeline
from model_optimizer import EdgeModelOptimizer
from test_samples_generator import generate_tactical_test_presets, PRESETS_DIR
from audio_capture import StreamingAudioBuffer


# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
logger = logging.getLogger("SENTINEL-AI")

app = FastAPI(
    title="SENTINEL-AI Backend",
    description="Intelligent Audio Noise Suppression System for Defence (SIH26052 - DRDO)",
    version="1.0.0"
)

# CORS configuration for local React Vite frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Storage directories
UPLOAD_DIR = "backend/data/uploads"
OUTPUT_DIR = "backend/data/outputs"
DATASET_DIR = "backend/data/dataset"
os.makedirs(UPLOAD_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)
os.makedirs(DATASET_DIR, exist_ok=True)

# Initialize core pipeline singletons
logger.info("Initializing SENTINEL-AI DSP & Neural Pipeline...")
pipeline = HybridSpeechEnhancementPipeline(sr=16000)
edge_optimizer = EdgeModelOptimizer()
dataset_prep = DatasetPreparationPipeline(output_dir=DATASET_DIR)

# Generate or load tactical test presets on startup
test_presets = generate_tactical_test_presets(PRESETS_DIR)
logger.info(f"Loaded {len(test_presets)} tactical defence test presets.")

# Export ONNX models on startup for edge readiness
try:
    edge_optimizer.export_models_to_onnx()
    logger.info("ONNX edge models exported successfully.")
except Exception as e:
    logger.warning(f"ONNX export notice: {e}")


@app.get("/api/health")
def health_check():
    """System health check and diagnostic status."""
    return {
        "status": "OPERATIONAL",
        "system": "SENTINEL-AI Defence Speech Enhancement Engine",
        "drdo_problem_statement": "SIH26052",
        "target_sample_rate": 16000,
        "torch_version": torch.__version__,
        "device": "CPU (Edge Optimized)",
        "capabilities": {
            "stationary_noise_suppression": True,
            "non_stationary_rotor_tracking": True,
            "impulsive_gunfire_blanking": True,
            "hybrid_neural_dsp": True,
            "realtime_websockets": True,
            "onnx_edge_inference": True,
            "nlms_adaptive_reference": True
        },
        "presets_count": len(test_presets)
    }


@app.get("/api/samples")
def list_test_presets():
    """List preloaded military tactical audio presets."""
    return {
        "presets": test_presets
    }


@app.get("/api/audio/preset/{preset_id}/{audio_type}")
def get_preset_audio(preset_id: str, audio_type: str):
    """Stream noisy or clean reference audio for a preset."""
    matched = next((p for p in test_presets if p["id"] == preset_id), None)
    if not matched:
        raise HTTPException(status_code=404, detail="Preset not found")
        
    file_path = matched["clean_file"] if audio_type == "clean" else matched["noisy_file"]
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Preset audio file not found on disk")
        
    return FileResponse(file_path, media_type="audio/wav", filename=f"{preset_id}_{audio_type}.wav")


@app.post("/api/process-audio")
async def process_audio_file(
    file: Optional[UploadFile] = File(None),
    preset_id: Optional[str] = Form(None),
    reference_file: Optional[UploadFile] = File(None),
    profile_mode: str = Form("auto"),
    speech_preservation: float = Form(0.85),
    impulsive_blanking: bool = Form(True)
):
    """
    Process an uploaded audio file or tactical preset through the full 8-stage
    speech enhancement pipeline and return objective metrics, waveforms, and spectrograms.
    """
    session_id = str(uuid.uuid4())[:8]
    clean_audio = None
    
    # 1. Load audio either from uploaded file or preset
    if file and file.filename:
        file_bytes = await file.read()
        audio_data, sr = sf.read(io.BytesIO(file_bytes))
        audio_name = file.filename
    elif preset_id:
        matched = next((p for p in test_presets if p["id"] == preset_id), None)
        if not matched:
            raise HTTPException(status_code=404, detail=f"Preset {preset_id} not found")
        audio_data, sr = sf.read(matched["noisy_file"])
        audio_name = matched["title"]
        # Ground truth clean reference is available for presets!
        clean_audio, _ = sf.read(matched["clean_file"])
    else:
        raise HTTPException(status_code=400, detail="Provide either an audio file or a valid preset_id")
        
    # Optional clean reference file upload
    if reference_file and reference_file.filename:
        ref_bytes = await reference_file.read()
        clean_audio, _ = sf.read(io.BytesIO(ref_bytes))
        
    # 2. Run speech enhancement pipeline
    enhanced_audio, diagnostics = pipeline.process_file_or_buffer(
        audio=audio_data,
        orig_sr=sr,
        user_profile=profile_mode,
        speech_preservation_priority=speech_preservation,
        impulsive_blanking_override=impulsive_blanking
    )
    
    # Resample original to 16kHz for uniform comparison
    orig_16k = resample_audio(ensure_mono(audio_data), sr, 16000)
    clean_16k = resample_audio(ensure_mono(clean_audio), sr, 16000) if clean_audio is not None else None
    
    # 3. Save enhanced audio to disk for playback and download
    out_filename = f"enhanced_{session_id}.wav"
    out_path = os.path.join(OUTPUT_DIR, out_filename)
    sf.write(out_path, enhanced_audio, 16000)
    
    # Save original resampled for synchronized player
    orig_filename = f"original_{session_id}.wav"
    orig_path = os.path.join(OUTPUT_DIR, orig_filename)
    sf.write(orig_path, orig_16k, 16000)
    
    # 4. Compute objective performance metrics
    metrics = compute_audio_metrics(
        original_audio=orig_16k,
        enhanced_audio=enhanced_audio,
        clean_reference=clean_16k,
        sr=16000,
        processing_time_sec=diagnostics["processing_time_sec"]
    )
    
    # 5. Generate waveform points and 2D spectrogram matrices
    orig_waveform = generate_waveform_points(orig_16k, num_points=160)
    enh_waveform = generate_waveform_points(enhanced_audio, num_points=160)
    
    orig_spec = generate_spectrogram_matrix(orig_16k, sr=16000, n_freq_bins=24, n_time_bins=40)
    enh_spec = generate_spectrogram_matrix(enhanced_audio, sr=16000, n_freq_bins=24, n_time_bins=40)
    
    return {
        "session_id": session_id,
        "filename": audio_name,
        "duration_sec": diagnostics["duration_sec"],
        "sample_rate": 16000,
        "enhanced_url": f"/api/audio/download/{session_id}",
        "original_url": f"/api/audio/original/{session_id}",
        "diagnostics": diagnostics,
        "metrics": metrics,
        "visualization": {
            "original_waveform": orig_waveform,
            "enhanced_waveform": enh_waveform,
            "original_spectrogram": orig_spec,
            "enhanced_spectrogram": enh_spec
        }
    }


@app.get("/api/audio/download/{session_id}")
def download_enhanced_audio(session_id: str):
    """Download the processed enhanced WAV file."""
    path = os.path.join(OUTPUT_DIR, f"enhanced_{session_id}.wav")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Enhanced audio file not found or expired")
    return FileResponse(
        path,
        media_type="audio/wav",
        filename=f"sentinel_ai_enhanced_{session_id}.wav"
    )


@app.get("/api/audio/original/{session_id}")
def stream_original_audio(session_id: str):
    """Stream resampled original audio for side-by-side comparison."""
    path = os.path.join(OUTPUT_DIR, f"original_{session_id}.wav")
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="Original audio file not found")
    return FileResponse(path, media_type="audio/wav")


@app.post("/api/classify")
async def classify_audio(file: UploadFile = File(...)):
    """Run genuine noise feature extraction and CNN classification."""
    file_bytes = await file.read()
    audio_data, sr = sf.read(io.BytesIO(file_bytes))
    audio_mono = ensure_mono(audio_data)
    audio_16k = resample_audio(audio_mono, sr, 16000)
    
    result = pipeline.classifier.classify(audio_16k)
    return result


@app.post("/api/dataset/generate")
def generate_dataset_endpoint(samples_per_class: int = 6):
    """Generate paired training dataset across -5dB, 0dB, 5dB, 10dB, 15dB."""
    result = dataset_prep.generate_paired_dataset(samples_per_class=samples_per_class)
    return result


@app.post("/api/dataset/train-classifier")
def train_classifier_endpoint(epochs: int = 5):
    """Train the CNN noise classifier and return training loss progress."""
    result = dataset_prep.train_noise_classifier(num_epochs=epochs)
    return result


@app.get("/api/edge/benchmark")
def run_edge_benchmark():
    """Benchmark ONNX Runtime CPU inference latency, RTF, and memory footprint."""
    result = edge_optimizer.benchmark_inference(num_iterations=30)
    return result


@app.get("/api/edge/export-onnx")
def export_onnx_endpoint():
    """Export neural speech enhancement and noise classifier models to ONNX."""
    result = edge_optimizer.export_models_to_onnx()
    return result


# WebSocket Live Microphone Speech Enhancement Endpoint
@app.websocket("/ws/live-enhance")
async def websocket_live_enhance(websocket: WebSocket):
    """
    Bi-directional low-latency audio processing over WebSockets.
    Accepts raw PCM audio chunks from browser MediaStream,
    processes via hybrid speech enhancement, and returns enhanced PCM chunks.
    """
    await websocket.accept()
    logger.info("WebSocket live microphone client connected.")
    
    stream_buffer = StreamingAudioBuffer(sample_rate=16000, chunk_size=512, overlap=256)
    active_profile = "auto"
    speech_preservation = 0.85
    impulsive_blanking = True
    
    try:
        while True:
            message = await websocket.receive()
            
            # 1. Text control messages (JSON)
            if "text" in message:
                try:
                    data = json.loads(message["text"])
                    action = data.get("action", "")
                    if action == "configure":
                        speech_preservation = float(data.get("speech_preservation", speech_preservation))
                        impulsive_blanking = bool(data.get("impulsive_blanking", impulsive_blanking))
                        active_profile = data.get("profile", active_profile)
                        await websocket.send_text(json.dumps({
                            "type": "configured",
                            "speech_preservation": speech_preservation,
                            "impulsive_blanking": impulsive_blanking
                        }))
                    elif action == "reset":
                        stream_buffer.reset()
                        await websocket.send_text(json.dumps({"type": "reset_ack"}))
                except Exception as e:
                    logger.error(f"WebSocket JSON parse error: {e}")
                    
            # 2. Binary audio frames (PCM Float32 or Int16)
            elif "bytes" in message:
                raw_bytes = message["bytes"]
                in_samples = stream_buffer.bytes_to_float32(raw_bytes)
                
                # Streaming chunk enhancement callback
                def enhance_fn(frame):
                    return pipeline.process_streaming_chunk(
                        frame,
                        speech_preservation_priority=speech_preservation,
                        impulsive_blanking=impulsive_blanking
                    )
                    
                out_samples, latency_ms = stream_buffer.push_and_process_frame(in_samples, enhance_fn)
                
                # Convert back to Float32 PCM bytes
                out_bytes = stream_buffer.float32_to_bytes(out_samples, format="float32")
                
                # Input and output RMS telemetry
                in_rms = float(np.sqrt(np.mean(in_samples ** 2) + 1e-12))
                out_rms = float(np.sqrt(np.mean(out_samples ** 2) + 1e-12))
                
                # Quick transient peak indicator
                peak = float(np.max(np.abs(in_samples)))
                is_transient = peak > 0.8
                
                # Send telemetry metadata first
                telemetry = {
                    "type": "telemetry",
                    "latency_ms": round(latency_ms, 1),
                    "input_rms_db": round(20.0 * np.log10(in_rms + 1e-6), 1),
                    "output_rms_db": round(20.0 * np.log10(out_rms + 1e-6), 1),
                    "transient_detected": is_transient
                }
                await websocket.send_text(json.dumps(telemetry))
                # Send enhanced binary audio chunk
                await websocket.send_bytes(out_bytes)
                
    except WebSocketDisconnect:
        logger.info("WebSocket live microphone client disconnected.")
    except Exception as e:
        logger.error(f"WebSocket live streaming error: {e}")
        try:
            await websocket.close()
        except Exception:
            pass


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
