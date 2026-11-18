import React, { useState, useEffect, useRef } from 'react';
import { 
  Upload, 
  FlaskConical, 
  Play, 
  Pause, 
  Download, 
  Volume2, 
  Sliders, 
  CheckCircle2, 
  RotateCcw,
  FileAudio,
  Radio,
  ArrowRight,
  Sparkles
} from 'lucide-react';
import { api } from '../services/api';
import { TacticalPreset, AudioProcessingResult } from '../types';
import { SpectrogramView } from './SpectrogramView';

interface AudioLabProps {
  onResultsReady?: (result: AudioProcessingResult) => void;
}

export const AudioLab: React.FC<AudioLabProps> = ({ onResultsReady }) => {
  const [presets, setPresets] = useState<TacticalPreset[]>([]);
  const [selectedPresetId, setSelectedPresetId] = useState<string>('tank_engine_hum');
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [referenceFile, setReferenceFile] = useState<File | null>(null);

  // Processing settings
  const [profileMode, setProfileMode] = useState<string>('auto');
  const [speechPreservation, setSpeechPreservation] = useState<number>(0.85);
  const [impulsiveBlanking, setImpulsiveBlanking] = useState<boolean>(true);

  // State
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [processStage, setProcessStage] = useState<string>('');
  const [result, setResult] = useState<AudioProcessingResult | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Audio Playback
  const [isPlayingOriginal, setIsPlayingOriginal] = useState<boolean>(false);
  const [isPlayingEnhanced, setIsPlayingEnhanced] = useState<boolean>(false);
  const originalAudioRef = useRef<HTMLAudioElement | null>(null);
  const enhancedAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Load presets
    api.getSamples().then((data) => {
      setPresets(data);
      if (data.length > 0) {
        setSelectedPresetId(data[0].id);
      }
    }).catch((err) => {
      console.error('Failed to load presets:', err);
    });
  }, []);

  const handleProcess = async () => {
    setIsProcessing(true);
    setErrorMsg(null);
    setProcessStage('Executing 8-Stage Hybrid Speech Enhancement Pipeline...');

    try {
      const res = await api.processAudio({
        file: uploadedFile ?? undefined,
        presetId: uploadedFile ? undefined : selectedPresetId,
        referenceFile: referenceFile ?? undefined,
        profileMode,
        speechPreservation,
        impulsiveBlanking,
      });

      setResult(res);
      onResultsReady?.(res);
      setProcessStage('Enhancement Complete!');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleOriginalPlayback = () => {
    if (!originalAudioRef.current) return;
    if (isPlayingOriginal) {
      originalAudioRef.current.pause();
      setIsPlayingOriginal(false);
    } else {
      if (enhancedAudioRef.current) {
        enhancedAudioRef.current.pause();
        setIsPlayingEnhanced(false);
      }
      originalAudioRef.current.play();
      setIsPlayingOriginal(true);
    }
  };

  const toggleEnhancedPlayback = () => {
    if (!enhancedAudioRef.current) return;
    if (isPlayingEnhanced) {
      enhancedAudioRef.current.pause();
      setIsPlayingEnhanced(false);
    } else {
      if (originalAudioRef.current) {
        originalAudioRef.current.pause();
        setIsPlayingOriginal(false);
      }
      enhancedAudioRef.current.play();
      setIsPlayingEnhanced(true);
    }
  };

  const activePreset = presets.find((p) => p.id === selectedPresetId);

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
          <FlaskConical className="h-5 w-5 text-emerald-400" />
          TACTICAL AUDIO LABORATORY &amp; PIPELINE EVALUATOR
        </h2>
        <p className="text-xs text-slate-400">
          Test speech enhancement against authentic defence test scenarios or upload custom operational communications.
        </p>
      </div>

      {/* Preset Selection & File Upload Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Left: Preloaded Tactical Presets */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
              1. PRELOADED DEFENCE TEST SCENARIOS
            </span>
            <span className="text-[11px] font-mono text-cyan-400">GROUND TRUTH PAIRED</span>
          </div>

          <div className="space-y-2">
            {presets.map((preset) => {
              const isSelected = selectedPresetId === preset.id && !uploadedFile;
              return (
                <div
                  key={preset.id}
                  onClick={() => {
                    setSelectedPresetId(preset.id);
                    setUploadedFile(null);
                  }}
                  className={`flex cursor-pointer items-start justify-between rounded-lg border p-3 transition-all ${
                    isSelected
                      ? 'border-emerald-500/60 bg-emerald-950/40 shadow-sm'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/80'
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`h-2 w-2 rounded-full ${isSelected ? 'bg-emerald-400' : 'bg-slate-600'}`} />
                      <span className="text-xs font-semibold text-slate-200">{preset.title}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 pl-4">{preset.description}</p>
                    <div className="pl-4 text-[10px] font-mono text-slate-500">
                      CATEGORY: {preset.category} | TARGET SNR: {preset.target_snr_db} dB
                    </div>
                  </div>
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-mono ${isSelected ? 'bg-emerald-800 text-emerald-200' : 'bg-slate-800 text-slate-400'}`}>
                    {preset.target_snr_db} dB
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Custom File Upload Area */}
        <div className="flex flex-col justify-between rounded-xl border border-slate-800 bg-slate-900/50 p-5">
          <div>
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
                2. OR UPLOAD CUSTOM OPERATIONAL AUDIO
              </span>
              <span className="text-[11px] font-mono text-slate-400">WAV / MP3 / FLAC</span>
            </div>

            {/* Drag & drop box */}
            <label className="flex h-36 w-full cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-700 bg-slate-950/50 hover:border-emerald-500/60 transition-all">
              <Upload className="h-8 w-8 text-slate-500 mb-2" />
              <span className="text-xs font-medium text-slate-300">
                {uploadedFile ? uploadedFile.name : 'Click to Browse or Drag Audio File Here'}
              </span>
              <span className="text-[11px] text-slate-500">16-bit PCM WAV recommended</span>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setUploadedFile(e.target.files[0]);
                  }
                }}
                className="hidden"
              />
            </label>

            {/* Optional clean reference file */}
            <div className="mt-4 rounded-lg border border-slate-800/80 bg-slate-950/80 p-3">
              <div className="mb-1 text-[11px] font-medium text-slate-300">
                Optional: Ground Truth Clean Speech Reference
              </div>
              <p className="text-[10px] text-slate-500 mb-2">
                Provide clean reference speech to calculate exact SI-SDR, STOI, and PESQ objective quality metrics.
              </p>
              <input
                type="file"
                accept="audio/*"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    setReferenceFile(e.target.files[0]);
                  }
                }}
                className="text-xs text-slate-400 file:mr-2 file:rounded file:border-0 file:bg-slate-800 file:px-2.5 file:py-1 file:text-xs file:text-slate-300 hover:file:bg-slate-700 cursor-pointer"
              />
            </div>
          </div>

          {/* Active selection summary */}
          <div className="mt-4 rounded-lg border border-slate-800 bg-slate-950/90 p-3 text-xs font-mono text-slate-400">
            <span className="text-emerald-400">ACTIVE SOURCE: </span>
            {uploadedFile ? uploadedFile.name : activePreset?.title ?? 'None'}
          </div>
        </div>
      </div>

      {/* DSP Enhancement Parameter Controls */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold tracking-wider text-slate-300 uppercase">
            <Sliders className="h-4 w-4 text-emerald-400" />
            ENHANCEMENT HYPERPARAMETERS
          </div>
          <span className="text-[11px] font-mono text-slate-500">SAMPLING: 16,000 Hz</span>
        </div>

        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Profile Mode */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-300">Suppression Mode</label>
            <select
              value={profileMode}
              onChange={(e) => setProfileMode(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-slate-200 focus:border-emerald-500 focus:outline-none cursor-pointer"
            >
              <option value="auto">Auto (Intelligent Noise Classifier)</option>
              <option value="stationary_engine">Stationary Engine Hum Filter</option>
              <option value="rotor_noise">Helicopter Rotor Harmonic Tracker</option>
              <option value="wind_turbulence">Wind &amp; Gale Turbulence Shelving</option>
              <option value="impulsive_burst">Impulsive Gunfire / Blast Blanker</option>
              <option value="mixed_combat">Combined Combat Threat Hybrid</option>
            </select>
          </div>

          {/* Speech Preservation */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300 font-medium">Speech Preservation Weight</span>
              <span className="font-mono text-emerald-400">{(speechPreservation * 100).toFixed(0)}%</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="1.0"
              step="0.05"
              value={speechPreservation}
              onChange={(e) => setSpeechPreservation(parseFloat(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          {/* Impulsive Blanking */}
          <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/60 p-3">
            <div>
              <div className="text-xs font-medium text-slate-200">Impulsive Transient Gate</div>
              <div className="text-[10px] text-slate-500">Median limiter for blast spikes</div>
            </div>
            <button
              onClick={() => setImpulsiveBlanking(!impulsiveBlanking)}
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
        </div>

        {/* Process Action Button */}
        <div className="mt-5 flex items-center justify-between border-t border-slate-800/80 pt-4">
          <div className="text-xs text-slate-400">
            {isProcessing ? (
              <span className="flex items-center gap-2 font-mono text-cyan-400">
                <span className="inline-block h-2 w-2 rounded-full bg-cyan-400 animate-ping" />
                {processStage}
              </span>
            ) : result ? (
              <span className="font-mono text-emerald-400">✓ PROCESSED: {result.filename} in {result.diagnostics.processing_time_sec}s</span>
            ) : (
              <span>Ready to process selected audio</span>
            )}
          </div>

          <button
            onClick={handleProcess}
            disabled={isProcessing}
            className="flex items-center gap-2 rounded-lg bg-emerald-600 px-6 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-950/50 hover:bg-emerald-500 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            {isProcessing ? 'PROCESSING SPEECH...' : 'RUN SPEECH ENHANCEMENT'}
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-800 bg-red-950/60 p-3 text-xs text-red-300">
          Error: {errorMsg}
        </div>
      )}

      {/* Synchronized Side-by-Side Audio Player & Results */}
      {result && (
        <div className="rounded-xl border border-slate-800 bg-slate-900/70 p-5 shadow-xl space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold tracking-wider text-slate-200">
              AUDIO PLAYBACK &amp; A/B COMPARISON
            </h3>
            <a
              href={result.enhanced_url}
              download={`enhanced_${result.session_id}.wav`}
              className="flex items-center gap-1.5 rounded-lg border border-emerald-500/50 bg-emerald-950/60 px-3 py-1.5 text-xs font-mono font-medium text-emerald-300 hover:bg-emerald-900/80 transition-all"
            >
              <Download className="h-3.5 w-3.5" />
              DOWNLOAD ENHANCED WAV
            </a>
          </div>

          {/* Players Grid */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {/* Player 1: Original Noisy Audio */}
            <div className="rounded-lg border border-amber-900/50 bg-slate-950/80 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-amber-400">ORIGINAL NOISY INPUT</span>
                <span className="font-mono text-slate-400">Input SNR: {result.metrics.input_snr_db} dB</span>
              </div>
              <audio
                ref={originalAudioRef}
                src={result.original_url}
                onEnded={() => setIsPlayingOriginal(false)}
                className="w-full"
                controls
              />
              <button
                onClick={toggleOriginalPlayback}
                className="w-full flex items-center justify-center gap-2 rounded bg-amber-600/20 border border-amber-500/40 py-2 text-xs font-semibold text-amber-300 hover:bg-amber-600/30 transition-all cursor-pointer"
              >
                {isPlayingOriginal ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlayingOriginal ? 'PAUSE ORIGINAL' : 'PLAY NOISY ORIGINAL'}
              </button>
            </div>

            {/* Player 2: Enhanced Speech Audio */}
            <div className="rounded-lg border border-emerald-900/50 bg-slate-950/80 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-emerald-400">ENHANCED SPEECH OUTPUT</span>
                <span className="font-mono text-emerald-400">Output SNR: {result.metrics.output_snr_db} dB</span>
              </div>
              <audio
                ref={enhancedAudioRef}
                src={result.enhanced_url}
                onEnded={() => setIsPlayingEnhanced(false)}
                className="w-full"
                controls
              />
              <button
                onClick={toggleEnhancedPlayback}
                className="w-full flex items-center justify-center gap-2 rounded bg-emerald-600 py-2 text-xs font-semibold text-white hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-950/60 cursor-pointer"
              >
                {isPlayingEnhanced ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {isPlayingEnhanced ? 'PAUSE ENHANCED' : 'PLAY ENHANCED SPEECH'}
              </button>
            </div>
          </div>

          {/* Quick Metrics Callout */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono text-center">
            <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5">
              <div className="text-[10px] text-slate-500">SNR IMPROVEMENT</div>
              <div className="text-base font-bold text-emerald-400">+{result.metrics.snr_improvement_db} dB</div>
            </div>
            <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5">
              <div className="text-[10px] text-slate-500">CLASSIFIED THREAT</div>
              <div className="text-xs font-bold text-slate-200 truncate">{result.diagnostics.classification.display_name}</div>
            </div>
            <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5">
              <div className="text-[10px] text-slate-500">REAL-TIME FACTOR</div>
              <div className="text-base font-bold text-cyan-400">{result.diagnostics.real_time_factor}</div>
            </div>
            <div className="rounded border border-slate-800 bg-slate-950/60 p-2.5">
              <div className="text-[10px] text-slate-500">SPEECH INTELLIGIBILITY</div>
              <div className="text-base font-bold text-amber-400">{result.metrics.drdo_speech_preservation_score}%</div>
            </div>
          </div>

          {/* Before & After Spectrogram */}
          <SpectrogramView
            originalSpec={result.visualization.original_spectrogram}
            enhancedSpec={result.visualization.enhanced_spectrogram}
            durationSec={result.duration_sec}
          />
        </div>
      )}
    </div>
  );
};
