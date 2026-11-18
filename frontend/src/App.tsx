import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { OverviewDashboard } from './components/OverviewDashboard';
import { LiveEnhancer } from './components/LiveEnhancer';
import { AudioLab } from './components/AudioLab';
import { NoiseIntel } from './components/NoiseIntel';
import { MetricsDashboard } from './components/MetricsDashboard';
import { DatasetLab } from './components/DatasetLab';
import { SystemArchitecture } from './components/SystemArchitecture';
import { PageTab, AudioProcessingResult } from './types';
import { api } from './services/api';

export const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState<PageTab>('overview');
  const [systemStatus, setSystemStatus] = useState<string>('OPERATIONAL');
  const [presetsCount, setPresetsCount] = useState<number>(5);
  const [activeResult, setActiveResult] = useState<AudioProcessingResult | null>(null);
  const [isStreaming, setIsStreaming] = useState<boolean>(false);

  useEffect(() => {
    // Health check on startup
    api.getHealth()
      .then((h) => {
        setSystemStatus(h.status);
        if (h.presets_count) setPresetsCount(h.presets_count);
      })
      .catch((err) => {
        console.error('Failed to reach backend:', err);
        setSystemStatus('BACKEND OFFLINE');
      });
  }, []);

  const handleResultsReady = (res: AudioProcessingResult) => {
    setActiveResult(res);
  };

  return (
    <div className="flex h-screen flex-col bg-[#070b14] text-slate-100 font-sans antialiased overflow-hidden select-none">
      {/* Top Defence Command Header */}
      <Header 
        systemStatus={systemStatus} 
        isStreaming={isStreaming} 
      />

      {/* Main Body with Sidebar & Content */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => setActiveTab(tab)}
          isStreaming={isStreaming}
        />

        {/* Dynamic Page Content View */}
        <main className="flex-1 overflow-y-auto p-6 radar-grid">
          <div className="mx-auto max-w-6xl">
            {activeTab === 'overview' && (
              <OverviewDashboard
                onNavigate={(tab) => setActiveTab(tab)}
                presetsCount={presetsCount}
              />
            )}

            {activeTab === 'live' && (
              <LiveEnhancer
                onStreamingStateChange={(streaming) => setIsStreaming(streaming)}
              />
            )}

            {activeTab === 'laboratory' && (
              <AudioLab
                onResultsReady={handleResultsReady}
              />
            )}

            {activeTab === 'intelligence' && (
              <NoiseIntel
                currentClassification={activeResult?.diagnostics.classification ?? null}
              />
            )}

            {activeTab === 'analytics' && (
              <MetricsDashboard
                result={activeResult}
              />
            )}

            {activeTab === 'dataset' && (
              <DatasetLab />
            )}

            {activeTab === 'architecture' && (
              <SystemArchitecture />
            )}
          </div>
        </main>
      </div>

      {/* Footer Status Bar */}
      <footer className="flex h-7 items-center justify-between border-t border-slate-800/80 bg-[#090d18] px-4 text-[10px] font-mono text-slate-400">
        <div className="flex items-center gap-4">
          <span>DRDO SIH26052</span>
          <span className="text-slate-600">|</span>
          <span>LATENCY: &lt; 15.0 ms</span>
          <span className="text-slate-600">|</span>
          <span className="text-emerald-400 font-semibold">HYBRID AI+DSP ACTIVE</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-slate-400">EDGE TARGET: RASPBERRY PI 4/5</span>
          <span className="text-slate-600">|</span>
          <span className="text-cyan-400">SENTINEL-AI v1.0.0</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
