import React, { useState, useEffect } from 'react';
import { 
  Cpu, 
  Layers, 
  Terminal, 
  HardDrive, 
  Clock, 
  CheckCircle2, 
  Zap, 
  Activity, 
  Radio, 
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { EdgeBenchmarkResult } from '../types';

export const SystemArchitecture: React.FC = () => {
  const [benchmark, setBenchmark] = useState<EdgeBenchmarkResult | null>(null);
  const [isBenchmarking, setIsBenchmarking] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<number>(0);

  const runBenchmark = async () => {
    setIsBenchmarking(true);
    try {
      const res = await api.getEdgeBenchmark();
      setBenchmark(res);
    } catch (err) {
      console.error('Edge benchmark failed:', err);
    } finally {
      setIsBenchmarking(false);
    }
  };

  useEffect(() => {
    runBenchmark();
  }, []);

  const pipelineStages = [
    {
      id: 1,
      name: 'Microphone & Audio Ingestion',
      type: 'I/O Layer',
      desc: '16.0 kHz Mono 16-bit PCM streaming. Dual-channel support (Primary + External Reference Mic).',
      tech: 'Web Audio API / ALSA / I2S',
    },
    {
      id: 2,
      name: 'Preprocessing & Framing',
      type: 'DSP Stage',
      desc: '512-sample framing, 50% Overlap-Add (OLA), Hann windowing, and STFT time-frequency transform.',
      tech: 'SciPy Signal / Polyphase Resampling',
    },
    {
      id: 3,
      name: 'Noise Feature Extraction',
      type: 'DSP Analysis',
      desc: 'Extracts spectral centroid, Wiener flatness, low-frequency hum, rotor modulation depth, and kurtosis.',
      tech: 'FFT Power Spectrum / Temporal Moments',
    },
    {
      id: 4,
      name: 'Intelligent Noise Classifier',
      type: 'Neural ML Stage',
      desc: '1D/2D CNN analyzing 64-band log-Mel filterbanks to categorize noise into 6 tactical classes.',
      tech: 'PyTorch / ONNX Runtime (< 300k params)',
    },
    {
      id: 5,
      name: 'Adaptive Suppression Controller',
      type: 'Control Layer',
      desc: 'Dynamic profile switching: Berouti spectral subtraction, rotor comb tracking, or NLMS reference.',
      tech: 'Adaptive Recursive Floor / Normalized LMS',
    },
    {
      id: 6,
      name: 'Deep Neural Speech Enhancement',
      type: 'AI Core Stage',
      desc: 'U-Net / GRU architecture predicting bounded Spectral Ratio Mask [0, 1] across 257 frequency bins.',
      tech: 'ONNX INT8 / FP32 Graph Engine',
    },
    {
      id: 7,
      name: 'Speech Preservation & Limiting',
      type: 'Psychoacoustic',
      desc: 'Safeguards speech formant ridges and plosive consonants (/p/, /t/, /k/) against clipping.',
      tech: 'Dynamic Spectral Floor & Formant Masking',
    },
    {
      id: 8,
      name: 'Audio Synthesis & Reconstruction',
      type: 'Output Layer',
      desc: 'Complex STFT multiplication with original phase, Inverse STFT (ISTFT), and peak limiter.',
      tech: 'Overlap-Add (OLA) Synthesis',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
          <Cpu className="h-5 w-5 text-emerald-400" />
          SYSTEM ARCHITECTURE &amp; EMBEDDED EDGE DEPLOYMENT
        </h2>
        <p className="text-xs text-slate-400">
          End-to-end 8-stage hybrid DSP + Neural architecture engineered for resource-constrained edge hardware.
        </p>
      </div>

      {/* Visual Interactive Pipeline Diagram */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="mb-4 flex items-center justify-between">
          <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
            SENTINEL-AI 8-STAGE HYBRID PROCESSING PIPELINE
          </span>
          <span className="text-[11px] font-mono text-cyan-400">
            TOTAL PIPELINE LATENCY: &lt; 15.0 ms
          </span>
        </div>

        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-4">
          {pipelineStages.map((stage, idx) => (
            <div
              key={stage.id}
              onClick={() => setActiveStep(idx)}
              className={`flex flex-col justify-between rounded-lg border p-3 cursor-pointer transition-all ${
                activeStep === idx
                  ? 'border-emerald-500/80 bg-emerald-950/40 shadow-sm'
                  : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
              }`}
            >
              <div>
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <span className="text-emerald-400">STAGE 0{stage.id}</span>
                  <span className="text-slate-500">{stage.type}</span>
                </div>
                <div className="mt-1 text-xs font-semibold text-slate-200">
                  {stage.name}
                </div>
                <p className="mt-1 text-[11px] text-slate-400 leading-snug line-clamp-2">
                  {stage.desc}
                </p>
              </div>
              <div className="mt-3 border-t border-slate-800/80 pt-1.5 text-[9px] font-mono text-cyan-400">
                {stage.tech}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Active Stage Detailed Breakdown */}
      <div className="rounded-xl border border-emerald-900/40 bg-slate-900/60 p-5">
        <div className="flex items-start justify-between">
          <div>
            <div className="text-xs font-mono text-emerald-400">
              STAGE 0{pipelineStages[activeStep].id} ARCHITECTURE DETAILS
            </div>
            <h3 className="mt-0.5 text-base font-bold text-slate-100">
              {pipelineStages[activeStep].name}
            </h3>
          </div>
          <span className="rounded border border-emerald-700 bg-emerald-950 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
            {pipelineStages[activeStep].type}
          </span>
        </div>
        <p className="mt-2 text-xs text-slate-300 leading-relaxed">
          {pipelineStages[activeStep].desc}
        </p>
        <div className="mt-3 flex items-center gap-2 font-mono text-xs text-cyan-400">
          <Terminal className="h-4 w-4" />
          <span>Execution Engine: {pipelineStages[activeStep].tech}</span>
        </div>
      </div>

      {/* Edge Benchmarking Panel */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
              MEASURED ONNX RUNTIME CPU BENCHMARKS (EMBEDDED EDGE EVALUATION)
            </span>
            <div className="text-[11px] text-slate-400">
              Evaluated using ONNX Runtime with CPUExecutionProvider on 10ms streaming frames.
            </div>
          </div>
          <button
            onClick={runBenchmark}
            disabled={isBenchmarking}
            className="flex items-center gap-1.5 rounded-lg border border-cyan-700 bg-cyan-950/60 px-3 py-1.5 text-xs font-mono font-medium text-cyan-300 hover:bg-cyan-900/80 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="h-3.5 w-3.5" />
            {isBenchmarking ? 'BENCHMARKING...' : 'RE-RUN BENCHMARK'}
          </button>
        </div>

        {benchmark ? (
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4 font-mono text-center">
            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              <div className="text-[10px] text-slate-500">10ms FRAME LATENCY</div>
              <div className="mt-1 text-xl font-bold text-emerald-400">
                {benchmark.frame_10ms_benchmark.avg_inference_latency_ms} ms
              </div>
              <div className="text-[10px] text-slate-400">P95: {benchmark.frame_10ms_benchmark.p95_latency_ms} ms</div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              <div className="text-[10px] text-slate-500">REAL-TIME FACTOR</div>
              <div className="mt-1 text-xl font-bold text-cyan-400">
                {benchmark.frame_10ms_benchmark.real_time_factor}
              </div>
              <div className="text-[10px] text-slate-400">{benchmark.frame_10ms_benchmark.realtime_safety_margin}</div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              <div className="text-[10px] text-slate-500">STORAGE FOOTPRINT</div>
              <div className="mt-1 text-xl font-bold text-amber-400">
                {benchmark.model_footprint.total_flash_storage_mb} MB
              </div>
              <div className="text-[10px] text-slate-400">Flash Storage Size</div>
            </div>

            <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3">
              <div className="text-[10px] text-slate-500">RAM WORKING SET</div>
              <div className="mt-1 text-xl font-bold text-slate-200">
                ~{benchmark.model_footprint.estimated_ram_usage_mb} MB
              </div>
              <div className="text-[10px] text-slate-400">&lt; 1% of 4GB RPi4</div>
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 font-mono">Loading benchmark...</div>
        )}
      </div>

      {/* Edge Deployment Hardware Guide */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-3">
        <h3 className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
          RASPBERRY PI 4 / 5 EMBEDDED DEPLOYMENT GUIDE (DRDO SPECIFICATIONS)
        </h3>

        <div className="space-y-3 text-xs text-slate-300 leading-relaxed font-mono">
          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 space-y-1.5">
            <div className="text-emerald-400 font-bold">1. Hardware Peripherals Interface</div>
            <p className="text-slate-400 text-[11px]">
              • Primary Microphone: USB Audio Class 2.0 or I2S digital MEMS microphone (INMP441) connected to GPIO 18 (BCLK), GPIO 19 (LRCLK), and GPIO 20 (DOUT).<br />
              • Optional Reference Microphone: Exterior helmet ambient microphone for dual-channel NLMS adaptive noise reference.<br />
              • Audio Output: 3.5mm analog audio or USB tactical headset.
            </p>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 space-y-1.5">
            <div className="text-cyan-400 font-bold">2. Headless Edge CLI Execution Command</div>
            <p className="text-slate-400 text-[11px]">
              On a headless Raspberry Pi with Linux ALSA sound server:
            </p>
            <div className="rounded bg-black/60 p-2 text-slate-200 font-mono text-[11px] overflow-x-auto">
              python -m pip install onnxruntime sounddevice numpy scipy<br />
              python backend/sentinel_edge.py --input-device 1 --output-device 0 --profile auto --onnx
            </div>
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 space-y-1.5">
            <div className="text-amber-400 font-bold">3. Systemd Daemon Service Configuration</div>
            <p className="text-slate-400 text-[11px]">
              Enable automatic startup on military tactical vehicular bootup via <code>/etc/systemd/system/sentinel-ai.service</code>:
            </p>
            <div className="rounded bg-black/60 p-2 text-slate-300 font-mono text-[10px]">
              [Unit]<br />
              Description=SENTINEL-AI Defence Speech Enhancement Daemon<br />
              After=sound.target<br /><br />
              [Service]<br />
              ExecStart=/usr/bin/python3 /opt/sentinel-ai/backend/main.py<br />
              Restart=always<br />
              RestartSec=2<br /><br />
              [Install]<br />
              WantedBy=multi-user.target
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
