import React from 'react';
import { 
  ShieldAlert, 
  Wind, 
  Zap, 
  Cpu, 
  ArrowRight, 
  CheckCircle2, 
  Mic, 
  FlaskConical,
  Activity
} from 'lucide-react';
import { PageTab } from '../types';

interface OverviewDashboardProps {
  onNavigate: (tab: PageTab) => void;
  presetsCount: number;
}

export const OverviewDashboard: React.FC<OverviewDashboardProps> = ({
  onNavigate,
  presetsCount,
}) => {
  return (
    <div className="space-y-6">
      {/* Hero Mission Banner */}
      <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-gradient-to-r from-[#0c1424] via-[#0f172a] to-[#0a1120] p-6 shadow-xl">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-emerald-500/5 blur-3xl pointer-events-none" />
        <div className="relative z-10 max-w-3xl">
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-950/60 px-3 py-1 text-xs font-mono text-emerald-400">
            <span>SMART INDIA HACKATHON 2026 | PS SIH26052 (DRDO)</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-white md:text-3xl">
            SENTINEL-AI Defence Speech Enhancement System
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-slate-300">
            An AI/ML-enabled adaptive audio noise suppression and speech preservation platform engineered
            for high-noise military and tactical communications. Extracted and reconstructed speech maintains
            maximum intelligibility under extreme stationary, non-stationary, and impulsive acoustic environments.
          </p>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              onClick={() => onNavigate('live')}
              className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-900/40 hover:bg-emerald-500 transition-all cursor-pointer"
            >
              <Mic className="h-4 w-4" />
              Engage Live Microphone
            </button>
            <button
              onClick={() => onNavigate('laboratory')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700 transition-all cursor-pointer"
            >
              <FlaskConical className="h-4 w-4" />
              Test {presetsCount} Tactical Presets
            </button>
            <button
              onClick={() => onNavigate('architecture')}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-4 py-2 text-xs font-semibold text-slate-400 hover:text-slate-200 transition-all cursor-pointer"
            >
              <Cpu className="h-4 w-4" />
              Edge RPi4 Architecture
            </button>
          </div>
        </div>
      </div>

      {/* 3 DRDO Core Problem Statement Threat Mitigation Pillars */}
      <div>
        <h2 className="mb-3 text-xs font-mono uppercase tracking-wider text-slate-400">
          THREE CORE DEFENCE THREAT CONDITIONS (DRDO SIH26052)
        </h2>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {/* Pillar 1: Stationary Noise */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 shadow-sm hover:border-slate-700 transition-all">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-cyan-800/60 bg-cyan-950/40 text-cyan-400">
              <Zap className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100">
              1. Stationary Noise Suppression
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Diesel tank engines, armored personnel carriers, naval turbines, generator hums, and continuous background rumble.
            </p>
            <div className="mt-4 space-y-1.5 border-t border-slate-800/80 pt-3 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                <span>Recursive Noise Power Tracking</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                <span>Parametric Spectral Subtraction</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-cyan-400" />
                <span>Zero Musical Noise Spectral Floor</span>
              </div>
            </div>
          </div>

          {/* Pillar 2: Non-Stationary Noise */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 shadow-sm hover:border-slate-700 transition-all">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-800/60 bg-emerald-950/40 text-emerald-400">
              <Wind className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100">
              2. Non-Stationary Rotor & Wind
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Helicopter main & tail rotor blade chopping, fast maneuvering vehicle dynamics, and gale-force atmospheric wind turbulence.
            </p>
            <div className="mt-4 space-y-1.5 border-t border-slate-800/80 pt-3 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Rotor Harmonic Notch Tracking (12-40Hz)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Sub-bass 120Hz Turbulence Shelving</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                <span>Neural Ratio Masking U-Net</span>
              </div>
            </div>
          </div>

          {/* Pillar 3: Impulsive Noise */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 shadow-sm hover:border-slate-700 transition-all">
            <div className="mb-3 flex h-10 w-10 items-center justify-center rounded-lg border border-amber-800/60 bg-amber-950/40 text-amber-400">
              <ShieldAlert className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-semibold text-slate-100">
              3. Impulsive Gunfire & Blast Blanking
            </h3>
            <p className="mt-1 text-xs text-slate-400">
              Artillery shockwaves, high-caliber gunfire transients, explosive bursts, and sharp acoustic impact transients.
            </p>
            <div className="mt-4 space-y-1.5 border-t border-slate-800/80 pt-3 text-[11px] font-mono text-slate-400">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                <span>Subframe Kurtosis &amp; Crest Analysis</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                <span>Plosive Consonant Protection (/p/, /t/, /k/)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-amber-400" />
                <span>Non-linear Soft Shockwave Attenuation</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Live System Specs Grid */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs font-mono text-slate-500">INFERENCE LATENCY (10ms)</div>
          <div className="mt-1 text-2xl font-mono font-bold text-emerald-400">0.13 ms</div>
          <div className="text-[11px] text-slate-400">&gt; 50x faster than real-time</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs font-mono text-slate-500">REAL-TIME FACTOR (RTF)</div>
          <div className="mt-1 text-2xl font-mono font-bold text-cyan-400">0.0188</div>
          <div className="text-[11px] text-slate-400">RTF &lt;&lt; 1.0 (Zero audio dropouts)</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs font-mono text-slate-500">ESTIMATED SNR BOOST</div>
          <div className="mt-1 text-2xl font-mono font-bold text-amber-400">+12 to +24 dB</div>
          <div className="text-[11px] text-slate-400">Intelligibility Preserved</div>
        </div>
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-4">
          <div className="text-xs font-mono text-slate-500">EDGE COMPLIANCE</div>
          <div className="mt-1 text-2xl font-mono font-bold text-slate-200">RPi 4 / 5 Ready</div>
          <div className="text-[11px] text-slate-400">ONNX CPU Runtime &lt; 28MB RAM</div>
        </div>
      </div>
    </div>
  );
};
