import React from 'react';
import { 
  LayoutDashboard, 
  Mic, 
  FlaskConical, 
  Radar, 
  BarChart3, 
  Database, 
  Cpu 
} from 'lucide-react';
import { PageTab } from '../types';

interface SidebarProps {
  activeTab: PageTab;
  onTabChange: (tab: PageTab) => void;
  isStreaming?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  isStreaming = false,
}) => {
  const navItems: { id: PageTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    {
      id: 'overview',
      label: 'Overview Command',
      icon: <LayoutDashboard className="h-4 w-4" />,
    },
    {
      id: 'live',
      label: 'Live AI Enhancement',
      icon: <Mic className="h-4 w-4" />,
      badge: isStreaming ? 'STREAMING' : 'MIC',
    },
    {
      id: 'laboratory',
      label: 'Audio Laboratory',
      icon: <FlaskConical className="h-4 w-4" />,
      badge: '5 PRESETS',
    },
    {
      id: 'intelligence',
      label: 'Noise Intelligence',
      icon: <Radar className="h-4 w-4" />,
    },
    {
      id: 'analytics',
      label: 'Performance Analytics',
      icon: <BarChart3 className="h-4 w-4" />,
      badge: 'SI-SDR',
    },
    {
      id: 'dataset',
      label: 'Dataset & Training',
      icon: <Database className="h-4 w-4" />,
    },
    {
      id: 'architecture',
      label: 'System Architecture',
      icon: <Cpu className="h-4 w-4" />,
      badge: 'EDGE',
    },
  ];

  return (
    <aside className="w-64 shrink-0 border-r border-slate-800 bg-[#0a0e18] p-4 flex flex-col justify-between">
      <div>
        <div className="mb-4 px-3 text-[11px] font-mono uppercase tracking-widest text-slate-500">
          MISSION MODULES
        </div>
        <nav className="space-y-1">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-xs font-medium transition-all ${
                  isActive
                    ? 'border border-emerald-500/40 bg-emerald-950/40 text-emerald-300 shadow-sm shadow-emerald-950/30'
                    : 'text-slate-400 hover:border-slate-800 hover:bg-slate-900/60 hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={isActive ? 'text-emerald-400' : 'text-slate-400'}>
                    {item.icon}
                  </span>
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span
                    className={`rounded px-1.5 py-0.5 text-[9px] font-mono tracking-wider ${
                      item.badge === 'STREAMING'
                        ? 'bg-cyan-950 text-cyan-400 border border-cyan-800 animate-pulse'
                        : isActive
                        ? 'bg-emerald-900/60 text-emerald-300'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Embedded Edge Spec badge */}
      <div className="rounded-lg border border-slate-800/80 bg-slate-950/90 p-3 text-[11px] text-slate-400">
        <div className="mb-1 flex items-center justify-between font-mono text-[10px] text-emerald-400">
          <span>EDGE SPECIFICATION</span>
          <span>RPi 4 / 5</span>
        </div>
        <div className="space-y-0.5 font-mono text-[10px] text-slate-500">
          <div>LATENCY: &lt; 15 ms Target</div>
          <div>INFERENCE: ONNX INT8 / FP32</div>
          <div>DSP: NLMS + Dual-Mic Ref</div>
        </div>
      </div>
    </aside>
  );
};
