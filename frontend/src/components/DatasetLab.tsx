import React, { useState } from 'react';
import { 
  Database, 
  Play, 
  Sparkles, 
  Sliders, 
  FileText, 
  CheckCircle2, 
  Cpu, 
  Download,
  AlertCircle
} from 'lucide-react';
import { api } from '../services/api';
import { TrainingHistoryEpoch } from '../types';

export const DatasetLab: React.FC = () => {
  // Dataset generation state
  const [samplesPerClass, setSamplesPerClass] = useState<number>(6);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [genResult, setGenResult] = useState<any>(null);

  // Training state
  const [trainEpochs, setTrainEpochs] = useState<number>(5);
  const [isTraining, setIsTraining] = useState<boolean>(false);
  const [trainResult, setTrainResult] = useState<{
    status: string;
    epochs: number;
    final_loss: number;
    final_accuracy: number;
    history: TrainingHistoryEpoch[];
    checkpoint_path: string;
    training_time_sec: number;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleGenerate = async () => {
    setIsGenerating(true);
    setErrorMsg(null);
    try {
      const res = await api.generateDataset(samplesPerClass);
      setGenResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleTrain = async () => {
    setIsTraining(true);
    setErrorMsg(null);
    try {
      const res = await api.trainClassifier(trainEpochs);
      setTrainResult(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsTraining(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
          <Database className="h-5 w-5 text-emerald-400" />
          TACTICAL DATASET SYNTHESIS &amp; MODEL TRAINING LABORATORY
        </h2>
        <p className="text-xs text-slate-400">
          Generate calibrated paired clean-noisy audio across -5 to +15 dB SNR and train the CNN noise classifier on-device.
        </p>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-800 bg-red-950/60 p-3 text-xs text-red-300">
          Error: {errorMsg}
        </div>
      )}

      {/* Grid: Generator & Trainer */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Module 1: Paired Dataset Generator */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
              1. PAIRED DATASET GENERATOR
            </span>
            <span className="text-[11px] font-mono text-cyan-400">
              SNR: -5, 0, 5, 10, 15 dB
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Combines vocal formant synthesized clean speech with simulated military noises (Diesel Tank Engine,
            Helicopter Chopping, Gale Wind, and Artillery Shockwaves) to generate exact paired training sets.
          </p>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Samples per Category</span>
              <span className="font-mono text-emerald-400">{samplesPerClass} pairs</span>
            </div>
            <input
              type="range"
              min="3"
              max="15"
              value={samplesPerClass}
              onChange={(e) => setSamplesPerClass(parseInt(e.target.value))}
              className="w-full accent-emerald-500 cursor-pointer"
            />
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs font-mono space-y-1 text-slate-400">
            <div>DATASET SPLIT: 70% Train | 15% Validation | 15% Test</div>
            <div>SAMPLE RATE: 16,000 Hz, 16-bit PCM WAV</div>
            <div>OUTPUT PATH: backend/data/dataset/</div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-emerald-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-emerald-950/50 hover:bg-emerald-500 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            {isGenerating ? 'GENERATING PAIRED AUDIO...' : 'GENERATE SYNTHETIC DATASET'}
          </button>

          {genResult && (
            <div className="rounded-lg border border-emerald-800/60 bg-emerald-950/30 p-3 text-xs font-mono text-emerald-300 space-y-1">
              <div className="font-semibold text-emerald-400">✓ DATASET GENERATED SUCCESSFULLY</div>
              <div>Total Pairs: {genResult.total_pairs_generated} files in {genResult.elapsed_sec}s</div>
              <div>Train: {genResult.splits_summary.train} | Val: {genResult.splits_summary.val} | Test: {genResult.splits_summary.test}</div>
              <div className="text-[10px] text-slate-400 truncate">Manifest: {genResult.manifest_file}</div>
            </div>
          )}
        </div>

        {/* Module 2: CNN Noise Classifier Trainer */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold tracking-wider text-slate-300 uppercase">
              2. CNN CLASSIFIER TRAINING RUNNER
            </span>
            <span className="text-[11px] font-mono text-emerald-400">
              PYTORCH 1D/2D CNN
            </span>
          </div>

          <p className="text-xs text-slate-400 leading-relaxed">
            Trains the 6-class threat classifier (Stationary Engine, Rotor Chopping, Wind Turbulence, Gunfire Transients,
            Combat Storm, Clean Speech) on 64-band Mel filterbank spectrogram embeddings.
          </p>

          <div className="space-y-2">
            <div className="flex justify-between text-xs">
              <span className="text-slate-300">Training Epochs</span>
              <span className="font-mono text-cyan-400">{trainEpochs} Epochs</span>
            </div>
            <input
              type="range"
              min="2"
              max="10"
              value={trainEpochs}
              onChange={(e) => setTrainEpochs(parseInt(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer"
            />
          </div>

          <div className="rounded-lg border border-slate-800 bg-slate-950/70 p-3 text-xs font-mono space-y-1 text-slate-400">
            <div>OPTIMIZER: Adam (LR: 0.001) | BATCH SIZE: 8</div>
            <div>LOSS FUNCTION: Categorical Cross-Entropy</div>
            <div>CHECKPOINT: backend/data/dataset/noise_classifier_checkpoint.pt</div>
          </div>

          <button
            onClick={handleTrain}
            disabled={isTraining}
            className="w-full flex items-center justify-center gap-2 rounded-lg bg-cyan-600 py-2.5 text-xs font-semibold text-white shadow-lg shadow-cyan-950/50 hover:bg-cyan-500 transition-all disabled:opacity-50 cursor-pointer"
          >
            <Play className="h-4 w-4" />
            {isTraining ? 'TRAINING NEURAL NETWORK...' : 'TRAIN CNN CLASSIFIER'}
          </button>

          {trainResult && (
            <div className="rounded-lg border border-cyan-800/60 bg-cyan-950/30 p-3 text-xs font-mono text-cyan-300 space-y-2">
              <div className="font-semibold text-cyan-400">
                ✓ TRAINING COMPLETE ({trainResult.epochs} Epochs in {trainResult.training_time_sec}s)
              </div>
              <div className="flex justify-between">
                <span>Final Loss: <strong>{trainResult.final_loss}</strong></span>
                <span>Accuracy: <strong>{trainResult.final_accuracy}%</strong></span>
              </div>
              <div className="border-t border-cyan-800/40 pt-1.5 space-y-0.5 text-[10px] text-slate-400">
                {trainResult.history.map((h) => (
                  <div key={h.epoch} className="flex justify-between">
                    <span>Epoch {h.epoch}: Loss {h.loss}</span>
                    <span>Acc: {h.accuracy}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Public Dataset Integration & Licensing Guide */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
        <h3 className="mb-3 text-xs font-semibold tracking-wider text-slate-300 uppercase">
          OFFICIAL PUBLIC DEFENCE AUDIO DATASETS &amp; LICENSING COMPLIANCE
        </h3>
        <div className="grid grid-cols-1 gap-3 md:grid-cols-3 text-xs">
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-1">
            <div className="font-semibold text-slate-200">LibriSpeech ASR</div>
            <div className="text-[11px] text-slate-400">1,000 hours of 16kHz clean speech corpus.</div>
            <div className="font-mono text-[10px] text-emerald-400">License: CC BY 4.0 (OpenSLR)</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-1">
            <div className="font-semibold text-slate-200">DEMAND Noise Database</div>
            <div className="text-[11px] text-slate-400">Diverse real-world acoustic noise (engines, wind, transit).</div>
            <div className="font-mono text-[10px] text-emerald-400">License: CC BY-SA 3.0</div>
          </div>
          <div className="rounded-lg border border-slate-800 bg-slate-950/60 p-3 space-y-1">
            <div className="font-semibold text-slate-200">FSD50K Acoustic Events</div>
            <div className="text-[11px] text-slate-400">51,000+ open sound events with gunshot/explosion audio.</div>
            <div className="font-mono text-[10px] text-emerald-400">License: CC BY / CC0</div>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-500 italic">
          * SENTINEL-AI complies with all open-source licensing standards. No restricted or classified recordings are redistributed.
        </p>
      </div>
    </div>
  );
};
