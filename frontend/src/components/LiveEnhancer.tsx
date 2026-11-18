import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, 
  MicOff, 
  Volume2, 
  VolumeX, 
  RotateCcw, 
  Sliders, 
  ShieldAlert, 
  Radio, 
  Zap, 
  Activity,
  AlertCircle
} from 'lucide-react';
import { LiveAudioStreamController } from '../services/audioStream';
import { AudioVisualizer } from './AudioVisualizer';
import { LiveTelemetry } from '../types';

interface LiveEnhancerProps {
  onStreamingStateChange?: (isStreaming: boolean) => void;
}

export const LiveEnhancer: React.FC<LiveEnhancerProps> = ({
  onStreamingStateChange,
}) => {
  const [isStreaming, setIsStreaming] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [streamStatus, setStreamStatus] = useState<string>('disconnected');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Real-time telemetry
  const [telemetry, setTelemetry] = useState<LiveTelemetry>({
    type: 'telemetry',
    latency_ms: 0,
    input_rms_db: -50,
    output_rms_db: -50,
    transient_detected: false,
  });

  // Controls
  const [speechPreservation, setSpeechPreservation] = useState<number>(0.85);
  const [impulsiveBlanking, setImpulsiveBlanking] = useState<boolean>(true);
  const [activeProfile, setActiveProfile] = useState<string>('auto');

  const controllerRef = useRef<LiveAudioStreamController | null>(null);

  useEffect(() => {
    controllerRef.current = new LiveAudioStreamController({
      onTelemetry: (t) => setTelemetry(t),
      onError: (err) => setErrorMessage(err),
      onStatusChange: (status) => {
        setStreamStatus(status);
        const streaming = status === 'streaming';
        setIsStreaming(streaming);
        onStreamingStateChange?.(streaming);
      },
    });

    return () => {
      controllerRef.current?.stopStream();
    };
  }, []);

  const handleStartStream = async () => {
    setErrorMessage(null);
    if (controllerRef.current) {
      await controllerRef.current.startStream();
      controllerRef.current.configureDSP(speechPreservation, impulsiveBlanking, activeProfile);
    }
  };

  const handleStopStream = () => {
    if (controllerRef.current) {
      controllerRef.current.stopStream();
      setIsStreaming(false);
      onStreamingStateChange?.(false);
    }
  };

  const handleToggleMute = () => {
    const nextMute = !isMuted;
    setIsMuted(nextMute);
    controllerRef.current?.setMute(nextMute);
  };

  const handleReset = () => {
    controllerRef.current?.resetBuffer();
  };

  const handlePreservationChange = (val: number) => {
    setSpeechPreservation(val);
    controllerRef.current?.configureDSP(val, impulsiveBlanking, activeProfile);
  };

  const handleBlankingChange = (val: boolean) => {
    setImpulsiveBlanking(val);
    controllerRef.current?.configureDSP(speechPreservation, val, activeProfile);
  };

  const handleProfileChange = (prof: string) => {
    setActiveProfile(prof);
    controllerRef.current?.configureDSP(speechPreservation, impulsiveBlanking, prof);
  };

  return (
    <div className="space-y-6">
      {/* Header bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
        <div>
          <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
            <Radio className="h-5 w-5 text-emerald-400" />
            LIVE MICROPHONE SPEECH ENHANCEMENT
          </h2>
          <p className="text-xs text-slate-400">
            Direct WebSockets audio streaming with real-time hybrid neural masking &amp; DSP transient suppression.
          </p>
        </div>

        {/* Live Controls */}
        <div className="flex items-center gap-2">
          {!isStreaming ? (
            <button
              onClick={handleStartStream}
              className="flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-emerald-950/50 hover:bg-emerald-500 transition-all cursor-pointer"
            >
              <Mic className="h-4 w-4" />
              START STREAM
            </button>
          ) : (
            <button
              onClick={handleStopStream}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-red-950/50 hover:bg-red-500 transition-all cursor-pointer"
            >
              <MicOff className="h-4 w-4" />
              STOP STREAM
            </button>
          )}

          <button
            onClick={handleToggleMute}
            disabled={!isStreaming}
            className={`flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
              isMuted
                ? 'border-amber-600 bg-amber-950/50 text-amber-300'
                : 'border-slate-700 bg-slate-800 text-slate-300 hover:bg-slate-700'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
            {isMuted ? 'MUTED' : 'MUTE'}
          </button>

          <button
            onClick={handleReset}
            disabled={!isStreaming}
            className="flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <RotateCcw className="h-4 w-4" />
            RESET
          </button>
        </div>
      </div>

      {/* Error alert banner */}
      {errorMessage && (
        <div className="flex items-center gap-3 rounded-lg border border-red-800 bg-red-950/70 p-3 text-xs text-red-300 shadow">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <div>
            <div className="font-semibold">Microphone Stream Notice</div>
            <div>{errorMessage}</div>
          </div>
        </div>
      )}

      {/* Real-time Oscilloscope Visualization */}
      <AudioVisualizer
        inputAnalyser={controllerRef.current?.getInputAnalyser() ?? null}
        outputAnalyser={controllerRef.current?.getOutputAnalyser() ?? null}
        isStreaming={isStreaming}
        inputRmsDb={telemetry.input_rms_db}
        outputRmsDb={telemetry.output_rms_db}
        latencyMs={telemetry.latency_ms}
      />

      {/* Live Telemetry & Threat Metrics HUD */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <div className="text-[11px] font-mono text-slate-500">PROCESSING LATENCY</div>
          <div className="mt-1 flex items-baseline gap-1">
            <span className="text-xl font-mono font-bold text-cyan-400">
              {telemetry.latency_ms > 0 ? telemetry.latency_ms.toFixed(1) : '< 1.0'}
            </span>
            <span className="text-xs text-slate-400">ms</span>
          </div>
          <div className="text-[10px] text-slate-500">Sub-frame budget: 15.0 ms</div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <div className="text-[11px] font-mono text-slate-500">INPUT NOISE LEVEL</div>
          <div className="mt-1 text-xl font-mono font-bold text-amber-400">
            {isStreaming ? `${telemetry.input_rms_db.toFixed(1)} dB` : '--'}
          </div>
          <div className="text-[10px] text-slate-500">Raw Mic Energy</div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <div className="text-[11px] font-mono text-slate-500">ENHANCED OUTPUT LEVEL</div>
          <div className="mt-1 text-xl font-mono font-bold text-emerald-400">
            {isStreaming ? `${telemetry.output_rms_db.toFixed(1)} dB` : '--'}
          </div>
          <div className="text-[10px] text-slate-500">Noise Floor Attenuated</div>
        </div>

        <div className="rounded-lg border border-slate-800 bg-slate-900/40 p-3">
          <div className="text-[11px] font-mono text-slate-500">TRANSIENT STATUS</div>
          <div className="mt-1 flex items-center gap-2">
            <span className={`inline-block h-2 w-2 rounded-full ${telemetry.transient_detected ? 'bg-red-500 animate-ping' : 'bg-slate-600'}`} />
            <span className={`text-sm font-mono font-bold ${telemetry.transient_detected ? 'text-red-400' : 'text-slate-400'}`}>
              {telemetry.transient_detected ? 'BURST DETECTED' : 'NOMINAL'}
            </span>
          </div>
          <div className="text-[10px] text-slate-500">Gunfire / Shockwave Gate</div>
        </div>
      </div>

      {/* Dynamic DSP & Speech Preservation Controls */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-300 uppercase">
          <Sliders className="h-4 w-4 text-emerald-400" />
          ADAPTIVE SUPPRESSION &amp; SPEECH PRESERVATION CONTROLS
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Slider 1: Speech Preservation Priority */}
          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Speech Preservation Priority</span>
              <span className="font-mono text-emerald-400">{(speechPreservation * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.4"
              max="1.0"
              step="0.05"
              value={speechPreservation}
              onChange={(e) => handlePreservationChange(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
            <p className="text-[11px] text-slate-500">
              Protects speech formant valleys and consonant plosives from over-aggressive suppression.
            </p>
          </div>

          {/* Toggle 2: Impulsive Blanking */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-300 font-medium">Impulsive Blanking Gate</span>
              <button
                onClick={() => handleBlankingChange(!impulsiveBlanking)}
                className={`relative inline-flex h-5 w-10 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  impulsiveBlanking ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out ${
                    impulsiveBlanking ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
            <p className="text-[11px] text-slate-500">
              Activates non-linear median limiter for gunfire transients and blast shockwaves.
            </p>
          </div>

          {/* Selector 3: Suppression Profile */}
          <div className="space-y-2">
            <label className="block text-xs font-medium text-slate-300">
              Noise Suppression Profile
            </label>
            <select
              value={activeProfile}
              onChange={(e) => handleProfileChange(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none cursor-pointer"
            >
              <option value="auto">Auto (Intelligent AI Classifier)</option>
              <option value="stationary_engine">Stationary Engine / Machinery Hum</option>
              <option value="rotor_noise">Helicopter Rotor Harmonic Tracking</option>
              <option value="wind_turbulence">Wind &amp; Gale Turbulence</option>
              <option value="impulsive_burst">Impulsive Gunfire / Artillery</option>
              <option value="mixed_combat">Combined Combat Storm</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Auto switches DSP notch &amp; spectral subtraction filters dynamically.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
