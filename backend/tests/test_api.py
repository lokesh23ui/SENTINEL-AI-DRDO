"""
SENTINEL-AI: API Integration Tests
Tests REST endpoints using httpx AsyncClient and ASGITransport.
"""

import os
import sys
import pytest
import httpx

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from main import app, test_presets


@pytest.mark.anyio
async def test_health_endpoint():
    """Test health check returns operational status."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/health")
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "OPERATIONAL"
        assert data["drdo_problem_statement"] == "SIH26052"
        assert data["capabilities"]["hybrid_neural_dsp"] is True


@pytest.mark.anyio
async def test_list_presets():
    """Test retrieval of defence tactical audio presets."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/samples")
        assert response.status_code == 200
        data = response.json()
        assert "presets" in data
        assert len(data["presets"]) >= 5
        first = data["presets"][0]
        assert "id" in first
        assert "title" in first


@pytest.mark.anyio
async def test_process_preset_audio():
    """Test processing a tactical preset through the full enhancement pipeline."""
    preset_id = test_presets[0]["id"]
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.post(
            "/api/process-audio",
            data={
                "preset_id": preset_id,
                "profile_mode": "auto",
                "speech_preservation": "0.85",
                "impulsive_blanking": "true"
            }
        )
        assert response.status_code == 200
        data = response.json()
        assert "session_id" in data
        assert "enhanced_url" in data
        assert "metrics" in data
        assert "visualization" in data
        assert len(data["visualization"]["original_waveform"]) > 0
        assert len(data["visualization"]["enhanced_waveform"]) > 0


@pytest.mark.anyio
async def test_edge_benchmark_endpoint():
    """Test edge inference benchmarking endpoint."""
    async with httpx.AsyncClient(transport=httpx.ASGITransport(app=app), base_url="http://test") as client:
        response = await client.get("/api/edge/benchmark")
        assert response.status_code == 200
        data = response.json()
        assert "frame_10ms_benchmark" in data
        assert "avg_inference_latency_ms" in data["frame_10ms_benchmark"]
