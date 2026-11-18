import React from 'react';
import { Shield, Radio, Activity, Cpu } from 'lucide-react';

interface HeaderProps {
  systemStatus?: string;
  isStreaming?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  systemStatus = 'OPERATIONAL',
  isStreaming = false,
}) => {
  return (
    <header className="sticky top-0 z-50 border-b border-slate-800 bg-[#0b0f19]/90 backdrop-blur-md">
      <div className="flex h-16 items-center justify-between px-6">
        {/* Left: Branding & Defence Tag */}
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg border border-emerald-500/40 bg-gradient-to-br from-emerald-950 to-slate-900 text-emerald-400 shadow-lg shadow-emerald-950/50">
            <Shield className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-lg font-bold tracking-wider text-slate-100">
                SENTINEL<span className="text-emerald-400">-AI</span>
              </span>
              <span className="rounded border border-emerald-700/60 bg-emerald-950/80 px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest text-emerald-300">
                SIH26052 | DRDO
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Intelligent Audio. Clear Communication. Reliable Defence.
            </p>
          </div>
        </div>

        {/* Right: Tactical Status Telemetry */}
        <div className="flex items-center gap-4">
          {/* Audio Engine Mode */}
          <div className="hidden items-center gap-2 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 md:flex">
            <Cpu className="h-3.5 w-3.5 text-cyan-400" />
            <span className="text-xs font-mono text-slate-300">
              HYBRID DSP + NEURAL U-NET
            </span>
          </div>

          {/* Sample Rate Indicator */}
          <div className="hidden items-center gap-2 rounded-md border border-slate-800 bg-slate-900/60 px-3 py-1.5 sm:flex">
            <Radio className="h-3.5 w-3.5 text-slate-400" />
            <span className="text-xs font-mono text-slate-300">
              16.0 kHz MONO
            </span>
          </div>

          {/* System Health Status */}
          <div className="flex items-center gap-2 rounded-md border border-slate-800 bg-slate-900/80 px-3 py-1.5">
            <span className="relative flex h-2.5 w-2.5">
              <span className={`absolute inline-flex h-full w-full animate-ping rounded-full ${isStreaming ? 'bg-cyan-400' : 'bg-emerald-400'} opacity-75`} />
              <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${isStreaming ? 'bg-cyan-500' : 'bg-emerald-500'}`} />
            </span>
            <span className="text-xs font-mono font-medium tracking-wider text-slate-200">
              {isStreaming ? 'LIVE STREAMING' : systemStatus}
            </span>
          </div>
        </div>
      </div>
    </header>
  );
};
