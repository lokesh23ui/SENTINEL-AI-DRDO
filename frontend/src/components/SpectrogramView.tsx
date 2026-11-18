import React, { useRef, useEffect } from 'react';
import { SpectrogramData } from '../types';

interface SpectrogramViewProps {
  originalSpec?: SpectrogramData;
  enhancedSpec?: SpectrogramData;
  durationSec?: number;
}

export const SpectrogramView: React.FC<SpectrogramViewProps> = ({
  originalSpec,
  enhancedSpec,
  durationSec = 3.0,
}) => {
  const origCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const enhCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // Colormap function: deep navy -> cyan -> emerald -> gold
  const getColor = (val: number) => {
    // val is 0 to 100
    const norm = Math.max(0, Math.min(100, val)) / 100;
    if (norm < 0.2) {
      const t = norm / 0.2;
      return `rgb(${Math.round(5 + 15 * t)}, ${Math.round(8 + 25 * t)}, ${Math.round(20 + 70 * t)})`;
    } else if (norm < 0.5) {
      const t = (norm - 0.2) / 0.3;
      return `rgb(${Math.round(20 + 10 * t)}, ${Math.round(33 + 120 * t)}, ${Math.round(90 + 120 * t)})`;
    } else if (norm < 0.8) {
      const t = (norm - 0.5) / 0.3;
      return `rgb(${Math.round(30 + 100 * t)}, ${Math.round(153 + 70 * t)}, ${Math.round(210 - 70 * t)})`;
    } else {
      const t = (norm - 0.8) / 0.2;
      return `rgb(${Math.round(130 + 115 * t)}, ${Math.round(223 - 40 * t)}, ${Math.round(140 - 100 * t)})`;
    }
  };

  const drawSpectrogram = (canvas: HTMLCanvasElement, specData?: SpectrogramData) => {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const width = canvas.width;
    const height = canvas.height;

    ctx.fillStyle = '#070b14';
    ctx.fillRect(0, 0, width, height);

    if (!specData || !specData.heatmap || specData.heatmap.length === 0) {
      ctx.fillStyle = '#475569';
      ctx.font = '11px ui-monospace, monospace';
      ctx.textAlign = 'center';
      ctx.fillText('NO SPECTROGRAM DATA GENERATED', width / 2, height / 2);
      return;
    }

    const nFreq = specData.n_freq_bins;
    const nTime = specData.n_time_bins;
    const cellWidth = width / nTime;
    const cellHeight = height / nFreq;

    for (let f = 0; f < nFreq; f++) {
      // Invert frequency axis so high frequency is at the top
      const y = height - (f + 1) * cellHeight;
      const row = specData.heatmap[f] || [];
      for (let t = 0; t < nTime; t++) {
        const x = t * cellWidth;
        const val = row[t] ?? 0;
        ctx.fillStyle = getColor(val);
        ctx.fillRect(x, y, cellWidth + 0.5, cellHeight + 0.5);
      }
    }

    // Grid overlays
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (height / 4) * i);
      ctx.lineTo(width, (height / 4) * i);
      ctx.stroke();
    }
  };

  useEffect(() => {
    if (origCanvasRef.current) {
      drawSpectrogram(origCanvasRef.current, originalSpec);
    }
    if (enhCanvasRef.current) {
      drawSpectrogram(enhCanvasRef.current, enhancedSpec);
    }
  }, [originalSpec, enhancedSpec]);

  return (
    <div className="rounded-lg border border-slate-800 bg-slate-900/60 p-4 shadow-lg backdrop-blur">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold tracking-wider text-slate-200">
          TIME-FREQUENCY SPECTROGRAM HEATMAP (0 - 8,000 Hz)
        </h4>
        <span className="text-xs font-mono text-cyan-400">
          DURATION: {durationSec.toFixed(2)}s | FFT: 512
        </span>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Original Spectrogram */}
        <div className="rounded border border-amber-900/40 bg-slate-950/70 p-3">
          <div className="mb-1.5 flex items-center justify-between text-xs font-mono">
            <span className="font-medium text-amber-400">NOISY INPUT SPECTRUM</span>
            <span className="text-slate-500">Unfiltered Threat Noise</span>
          </div>
          <div className="relative">
            <canvas
              ref={origCanvasRef}
              width={420}
              height={160}
              className="w-full rounded border border-slate-800 bg-[#050811]"
            />
            {/* Frequency markers */}
            <div className="absolute left-1.5 top-1 font-mono text-[9px] text-slate-400">8 kHz</div>
            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 font-mono text-[9px] text-slate-400">4 kHz</div>
            <div className="absolute bottom-1 left-1.5 font-mono text-[9px] text-slate-400">0 Hz</div>
          </div>
        </div>

        {/* Enhanced Spectrogram */}
        <div className="rounded border border-emerald-900/40 bg-slate-950/70 p-3">
          <div className="mb-1.5 flex items-center justify-between text-xs font-mono">
            <span className="font-medium text-emerald-400">ENHANCED OUTPUT SPECTRUM</span>
            <span className="text-emerald-500/80">Noise Floor Suppressed / Formants Preserved</span>
          </div>
          <div className="relative">
            <canvas
              ref={enhCanvasRef}
              width={420}
              height={160}
              className="w-full rounded border border-slate-800 bg-[#050811]"
            />
            {/* Frequency markers */}
            <div className="absolute left-1.5 top-1 font-mono text-[9px] text-slate-400">8 kHz</div>
            <div className="absolute left-1.5 top-1/2 -translate-y-1/2 font-mono text-[9px] text-slate-400">4 kHz</div>
            <div className="absolute bottom-1 left-1.5 font-mono text-[9px] text-slate-400">0 Hz</div>
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between text-[11px] text-slate-400">
        <div className="flex items-center gap-3">
          <span>Spectral Power:</span>
          <div className="flex h-2.5 w-32 items-center rounded overflow-hidden bg-gradient-to-r from-[#070b14] via-[#0284c7] via-[#10b981] to-[#f59e0b]" />
          <span className="font-mono text-slate-500">-70 dB (Floor) → 0 dB (Peak Formants)</span>
        </div>
        <span className="italic text-slate-500">Notice clear speech formant ridges extracted from broadband noise floor</span>
      </div>
    </div>
  );
};
