import React, { useEffect, useRef } from 'react';

interface AudioVisualizerProps {
  inputAnalyser: AnalyserNode | null;
  outputAnalyser: AnalyserNode | null;
  isStreaming: boolean;
  inputRmsDb?: number;
  outputRmsDb?: number;
  latencyMs?: number;
}

export const AudioVisualizer: React.FC<AudioVisualizerProps> = ({
  inputAnalyser,
  outputAnalyser,
  isStreaming,
  inputRmsDb = -45,
  outputRmsDb = -45,
  latencyMs = 0,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let animationFrameId: number;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const inputDataArray = new Uint8Array(256);
    const outputDataArray = new Uint8Array(256);

    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      const width = canvas.width;
      const height = canvas.height;

      // Clear with dark tactical background
      ctx.fillStyle = '#0a0f1d';
      ctx.fillRect(0, 0, width, height);

      // Draw subtle grid lines
      ctx.strokeStyle = '#162238';
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x < width; x += 40) {
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
      }
      for (let y = 0; y < height; y += 30) {
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
      }
      ctx.stroke();

      // Center divider line
      ctx.strokeStyle = '#1e293b';
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(0, height / 2);
      ctx.lineTo(width, height / 2);
      ctx.stroke();
      ctx.setLineDash([]);

      if (!isStreaming) {
        // Idle status text
        ctx.fillStyle = '#475569';
        ctx.font = '12px ui-monospace, monospace';
        ctx.textAlign = 'center';
        ctx.fillText('AUDIO STREAM STANDBY — MICROPHONE INACTIVE', width / 2, height / 2 - 10);
        ctx.fillText('CLICK [START STREAM] TO ENGAGE TACTICAL ENHANCEMENT', width / 2, height / 2 + 15);
        return;
      }

      // 1. Top Half: Raw Microphone Input Waveform (Amber / Cyan)
      if (inputAnalyser) {
        inputAnalyser.getByteTimeDomainData(inputDataArray);
        ctx.lineWidth = 1.8;
        ctx.strokeStyle = '#f59e0b'; // Amber trace for noisy input
        ctx.beginPath();
        const sliceWidth = width / 256;
        let x = 0;
        for (let i = 0; i < 256; i++) {
          const v = inputDataArray[i] / 128.0;
          const y = (v * (height / 4));
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();

        // Label
        ctx.fillStyle = '#f59e0b';
        ctx.font = '10px ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`CH-1 PRIMARY INPUT [NOISY] | RMS: ${inputRmsDb.toFixed(1)} dB`, 12, 18);
      }

      // 2. Bottom Half: Enhanced AI Speech Waveform (Emerald Green)
      if (outputAnalyser) {
        outputAnalyser.getByteTimeDomainData(outputDataArray);
        ctx.lineWidth = 2.0;
        ctx.strokeStyle = '#10b981'; // Tactical Emerald for enhanced speech
        ctx.beginPath();
        const sliceWidth = width / 256;
        let x = 0;
        for (let i = 0; i < 256; i++) {
          const v = outputDataArray[i] / 128.0;
          const y = (height / 2) + (v * (height / 4));
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
          x += sliceWidth;
        }
        ctx.stroke();

        // Label
        ctx.fillStyle = '#10b981';
        ctx.font = '10px ui-monospace, monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`CH-2 ENHANCED OUTPUT [NEURAL+DSP] | RMS: ${outputRmsDb.toFixed(1)} dB`, 12, height / 2 + 18);
      }

      // Latency HUD badge in top right
      ctx.fillStyle = '#06b6d4';
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'right';
      ctx.fillText(`FRAME LATENCY: ${latencyMs.toFixed(1)} ms | 16.0 kHz`, width - 12, 18);
    };

    render();
    return () => cancelAnimationFrame(animationFrameId);
  }, [inputAnalyser, outputAnalyser, isStreaming, inputRmsDb, outputRmsDb, latencyMs]);

  return (
    <div className="relative rounded-lg border border-slate-800 bg-slate-950/80 p-3 shadow-inner">
      <div className="mb-2 flex items-center justify-between text-xs font-mono text-slate-400">
        <span className="flex items-center gap-2">
          <span className={`inline-block h-2 w-2 rounded-full ${isStreaming ? 'animate-pulse bg-emerald-500' : 'bg-slate-600'}`} />
          DUAL-CHANNEL REAL-TIME OSCILLOSCOPE
        </span>
        <span className="text-slate-500">FFT SIZE: 512 | SAMPLING: 16,000 Hz</span>
      </div>
      <canvas
        ref={canvasRef}
        width={760}
        height={220}
        className="w-full rounded border border-slate-800/80 bg-[#080d1a]"
      />
    </div>
  );
};
