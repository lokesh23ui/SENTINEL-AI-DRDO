import React, { useState } from 'react';
import { 
  Radar, 
  Upload, 
  ShieldAlert, 
  CheckCircle, 
  Sliders, 
  Activity, 
  Zap, 
  Wind, 
  Layers 
} from 'lucide-react';
import { api } from '../services/api';
import { NoiseClassification } from '../types';

interface NoiseIntelProps {
  currentClassification?: NoiseClassification | null;
}

export const NoiseIntel: React.FC<NoiseIntelProps> = ({ currentClassification }) => {
  const [classification, setClassification] = useState<NoiseClassification | null>(
    currentClassification ?? null
  );
  const [isClassifying, setIsClassifying] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleFileUpload = async (file: File) => {
    setIsClassifying(true);
    setErrorMsg(null);
    try {
      const res = await api.classifyAudio(file);
      setClassification(res);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setErrorMsg(msg);
    } finally {
      setIsClassifying(false);
    }
  };

  const getSeverityBadge = (level?: string) => {
    switch (level) {
      case 'CRITICAL':
        return 'border-red-600 bg-red-950/70 text-red-300';
      case 'SEVERE':
        return 'border-amber-600 bg-amber-950/70 text-amber-300';
      case 'MODERATE':
        return 'border-yellow-600 bg-yellow-950/70 text-yellow-300';
      default:
        return 'border-emerald-600 bg-emerald-950/70 text-emerald-300';
    }
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-4 shadow-sm">
        <h2 className="flex items-center gap-2 text-base font-semibold text-slate-100">
          <Radar className="h-5 w-5 text-emerald-400" />
          INTELLIGENT NOISE CLASSIFICATION &amp; THREAT INTELLIGENCE
        </h2>
        <p className="text-xs text-slate-400">
          Lightweight 1D/2D CNN combined with acoustic physical feature extraction to dynamically identify threat environments.
        </p>
      </div>

      {/* Upload to Classify if none currently active */}
      <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="text-xs font-semibold text-slate-200">
              {classification ? 'ANALYZE ANOTHER AUDIO SAMPLE' : 'UPLOAD AUDIO TO RUN CLASSIFICATION'}
            </div>
            <div className="text-[11px] text-slate-400">
              Extracts spectral centroid, Wiener flatness, rotor modulation, and temporal kurtosis.
            </div>
          </div>
          <label className="flex cursor-pointer items-center gap-2 rounded-lg bg-slate-800 px-4 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-all">
            <Upload className="h-4 w-4 text-emerald-400" />
            <span>{isClassifying ? 'Analyzing Spectrum...' : 'Choose WAV to Classify'}</span>
            <input
              type="file"
              accept="audio/*"
              disabled={isClassifying}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileUpload(e.target.files[0]);
                }
              }}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {errorMsg && (
        <div className="rounded-lg border border-red-800 bg-red-950/60 p-3 text-xs text-red-300">
          Error: {errorMsg}
        </div>
      )}

      {classification ? (
        <div className="space-y-6">
          {/* Top Threat Classification Card */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {/* Primary Category */}
            <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-5 space-y-2 lg:col-span-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-slate-400">PREDICTED NOISE CATEGORY</span>
                <span className={`rounded border px-2 py-0.5 text-[10px] font-mono uppercase tracking-wider ${getSeverityBadge(classification.severity_level)}`}>
                  SEVERITY: {classification.severity_level}
                </span>
              </div>
              <div className="text-xl font-bold text-slate-100 md:text-2xl">
                {classification.display_name}
              </div>
              <div className="text-xs text-slate-400">
                Noise Severity: {classification.noise_severity}
              </div>

              {/* Confidence Meter */}
              <div className="pt-2">
                <div className="mb-1 flex justify-between text-xs font-mono">
                  <span className="text-slate-400">CLASSIFIER CONFIDENCE</span>
                  <span className="font-bold text-emerald-400">{classification.confidence}%</span>
                </div>
                <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-600 to-cyan-400 transition-all duration-500"
                    style={{ width: `${classification.confidence}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Recommended Profile Card */}
            <div className="rounded-xl border border-emerald-900/40 bg-emerald-950/20 p-5 space-y-3">
              <div className="text-xs font-mono text-emerald-400">RECOMMENDED SUPPRESSION PROFILE</div>
              <div className="text-base font-bold text-slate-100">
                {classification.recommended_profile.profile}
              </div>
              <p className="text-xs text-slate-300">
                {classification.recommended_profile.description}
              </p>
              <div className="space-y-1 border-t border-emerald-900/40 pt-2 text-[11px] font-mono text-slate-400">
                <div>Oversubtraction: {classification.recommended_profile.recommended_oversubtraction}x</div>
                <div>Spectral Floor: {classification.recommended_profile.spectral_floor}</div>
                <div>Impulsive Gate: {classification.recommended_profile.impulsive_blanking ? 'ACTIVE' : 'STANDBY'}</div>
              </div>
            </div>
          </div>

          {/* Probability Distribution Across All 6 Classes */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <h3 className="mb-4 text-xs font-semibold tracking-wider text-slate-300 uppercase">
              CLASS PROBABILITY DISTRIBUTION (CNN SOFTMAX OUTPUT)
            </h3>
            <div className="space-y-3">
              {Object.entries(classification.probabilities).map(([key, prob]) => {
                const pct = (prob * 100).toFixed(1);
                const isWinner = key === classification.predicted_category;
                return (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between text-xs font-mono">
                      <span className={isWinner ? 'text-emerald-300 font-semibold' : 'text-slate-400'}>
                        {key.replace('_', ' ').toUpperCase()} {isWinner && '★'}
                      </span>
                      <span className={isWinner ? 'text-emerald-400 font-bold' : 'text-slate-500'}>
                        {pct}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${isWinner ? 'bg-emerald-500' : 'bg-slate-600'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Genuine Acoustic Features Grid */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5">
            <h3 className="mb-3 text-xs font-semibold tracking-wider text-slate-300 uppercase">
              GENUINE DSP ACOUSTIC FEATURE SIGNATURES
            </h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 font-mono">
              <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[10px] text-slate-500">SPECTRAL CENTROID</div>
                <div className="mt-1 text-base font-bold text-slate-200">
                  {classification.features.spectral_centroid} Hz
                </div>
                <div className="text-[10px] text-slate-500">Spectral center of mass</div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[10px] text-slate-500">SPECTRAL FLATNESS</div>
                <div className="mt-1 text-base font-bold text-slate-200">
                  {classification.features.spectral_flatness}
                </div>
                <div className="text-[10px] text-slate-500">Wiener entropy (Tonality)</div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[10px] text-slate-500">KURTOSIS (4TH MOMENT)</div>
                <div className="mt-1 text-base font-bold text-amber-400">
                  {classification.features.kurtosis}
                </div>
                <div className="text-[10px] text-slate-500">Normal=3, Gunfire&gt;6</div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[10px] text-slate-500">ROTOR RHYTHMICITY</div>
                <div className="mt-1 text-base font-bold text-cyan-400">
                  {classification.features.rotor_rhythmicity}
                </div>
                <div className="text-[10px] text-slate-500">12-40 Hz Blade Autocorr</div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[10px] text-slate-500">ENGINE HUM RATIO</div>
                <div className="mt-1 text-base font-bold text-slate-200">
                  {(classification.features.engine_energy_ratio * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500">Power &lt; 300 Hz</div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[10px] text-slate-500">WIND SUB-BASS RATIO</div>
                <div className="mt-1 text-base font-bold text-slate-200">
                  {(classification.features.wind_energy_ratio * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500">Turbulence &lt; 150 Hz</div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[10px] text-slate-500">CREST FACTOR</div>
                <div className="mt-1 text-base font-bold text-slate-200">
                  {classification.features.crest_factor}
                </div>
                <div className="text-[10px] text-slate-500">Peak / RMS amplitude</div>
              </div>

              <div className="rounded border border-slate-800 bg-slate-950/60 p-3">
                <div className="text-[10px] text-slate-500">VOICE BAND RATIO</div>
                <div className="mt-1 text-base font-bold text-emerald-400">
                  {(classification.features.speech_band_ratio * 100).toFixed(1)}%
                </div>
                <div className="text-[10px] text-slate-500">300 Hz - 3,400 Hz</div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-xl border border-dashed border-slate-800 bg-slate-950/40 p-12 text-center text-slate-500">
          <Radar className="mx-auto h-12 w-12 text-slate-600 mb-3" />
          <div className="text-sm font-medium text-slate-300">No Noise Sample Classified Yet</div>
          <div className="mt-1 text-xs">
            Run a test in the Audio Laboratory or upload a WAV file above to inspect genuine neural &amp; DSP features.
          </div>
        </div>
      )}
    </div>
  );
};
