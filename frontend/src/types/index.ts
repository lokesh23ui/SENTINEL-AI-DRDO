export type PageTab = 
  | 'overview' 
  | 'live' 
  | 'laboratory' 
  | 'intelligence' 
  | 'analytics' 
  | 'dataset' 
  | 'architecture';

export interface TacticalPreset {
  id: string;
  title: string;
  category: string;
  target_snr_db: number;
  actual_snr_db: number;
  description: string;
  duration_sec: number;
  sample_rate: number;
  clean_file: string;
  noisy_file: string;
  noisy_url: string;
  clean_url: string;
}

export interface AcousticFeatures {
  spectral_centroid: number;
  spectral_rolloff: number;
  spectral_flatness: number;
  zero_crossing_rate: number;
  engine_energy_ratio: number;
  wind_energy_ratio: number;
  speech_band_ratio: number;
  kurtosis: number;
  crest_factor: number;
  rotor_rhythmicity: number;
  modulation_depth?: number;
}

export interface NoiseClassification {
  predicted_category: string;
  display_name: string;
  confidence: number;
  noise_severity: string;
  severity_level: 'LOW' | 'MODERATE' | 'SEVERE' | 'CRITICAL';
  probabilities: Record<string, number>;
  features: AcousticFeatures;
  recommended_profile: {
    profile: string;
    filter_mode: string;
    recommended_oversubtraction: number;
    spectral_floor: number;
    impulsive_blanking: boolean;
    speech_preservation_weight: number;
    description: string;
  };
}

export interface DSPMetrics {
  has_reference: boolean;
  input_snr_db: number;
  output_snr_db: number;
  snr_improvement_db: number;
  si_sdr_db: number | null;
  input_si_sdr_db: number | null;
  si_sdr_improvement_db: number | null;
  stoi: number | null;
  stoi_available: boolean;
  pesq: number | null;
  pesq_available: boolean;
  pesq_status_note: string;
  processing_time_sec: number;
  real_time_factor: number;
  duration_sec: number;
  drdo_speech_preservation_score: number;
}

export interface SpectrogramData {
  n_freq_bins: number;
  n_time_bins: number;
  heatmap: number[][];
}

export interface AudioProcessingResult {
  session_id: string;
  filename: string;
  duration_sec: number;
  sample_rate: number;
  enhanced_url: string;
  original_url: string;
  diagnostics: {
    duration_sec: number;
    sample_rate: number;
    processing_time_sec: number;
    latency_ms: number;
    real_time_factor: number;
    classification: NoiseClassification;
    profile_applied: {
      active_category: string;
      filter_mode: string;
      oversubtraction_factor: number;
      spectral_floor: number;
      impulsive_blanking: boolean;
      speech_preservation_weight: number;
      description: string;
    };
    transient_analysis: {
      has_impulsive_noise: boolean;
      transient_count: number;
      max_kurtosis: number;
      max_crest_factor: number;
    };
    vad_speech_ratio: number;
  };
  metrics: DSPMetrics;
  visualization: {
    original_waveform: number[];
    enhanced_waveform: number[];
    original_spectrogram: SpectrogramData;
    enhanced_spectrogram: SpectrogramData;
  };
}

export interface LiveTelemetry {
  type: string;
  latency_ms: number;
  input_rms_db: number;
  output_rms_db: number;
  transient_detected: boolean;
}

export interface EdgeBenchmarkResult {
  target_architecture: string;
  runtime_engine: string;
  frame_10ms_benchmark: {
    frame_duration_ms: number;
    avg_inference_latency_ms: number;
    p95_latency_ms: number;
    real_time_factor: number;
    realtime_safety_margin: string;
  };
  segment_1s_benchmark: {
    segment_duration_sec: number;
    avg_inference_latency_ms: number;
    real_time_factor: number;
  };
  model_footprint: {
    speech_enhancement_model_mb: number;
    noise_classifier_model_mb: number;
    total_flash_storage_mb: number;
    estimated_ram_usage_mb: number;
  };
  embedded_feasibility: string;
}

export interface TrainingHistoryEpoch {
  epoch: number;
  loss: number;
  accuracy: number;
}
