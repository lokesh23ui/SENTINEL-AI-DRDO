import { 
  TacticalPreset, 
  AudioProcessingResult, 
  NoiseClassification, 
  EdgeBenchmarkResult,
  TrainingHistoryEpoch
} from '../types';

const API_BASE = '/api';

export const api = {
  async getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
    return res.json();
  },

  async getSamples(): Promise<TacticalPreset[]> {
    const res = await fetch(`${API_BASE}/samples`);
    if (!res.ok) throw new Error(`Failed to fetch presets: ${res.statusText}`);
    const data = await res.json();
    return data.presets;
  },

  async processAudio(params: {
    file?: File;
    presetId?: string;
    referenceFile?: File;
    profileMode: string;
    speechPreservation: number;
    impulsiveBlanking: boolean;
  }): Promise<AudioProcessingResult> {
    const formData = new FormData();
    if (params.file) formData.append('file', params.file);
    if (params.presetId) formData.append('preset_id', params.presetId);
    if (params.referenceFile) formData.append('reference_file', params.referenceFile);
    formData.append('profile_mode', params.profileMode);
    formData.append('speech_preservation', params.speechPreservation.toString());
    formData.append('impulsive_blanking', params.impulsiveBlanking ? 'true' : 'false');

    const res = await fetch(`${API_BASE}/process-audio`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail || 'Audio enhancement failed');
    }
    return res.json();
  },

  async classifyAudio(file: File): Promise<NoiseClassification> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`${API_BASE}/classify`, {
      method: 'POST',
      body: formData,
    });
    if (!res.ok) throw new Error('Classification failed');
    return res.json();
  },

  async generateDataset(samplesPerClass: number = 6) {
    const res = await fetch(`${API_BASE}/dataset/generate?samples_per_class=${samplesPerClass}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Dataset generation failed');
    return res.json();
  },

  async trainClassifier(epochs: number = 5): Promise<{
    status: string;
    epochs: number;
    final_loss: number;
    final_accuracy: number;
    history: TrainingHistoryEpoch[];
    checkpoint_path: string;
    training_time_sec: number;
  }> {
    const res = await fetch(`${API_BASE}/dataset/train-classifier?epochs=${epochs}`, {
      method: 'POST',
    });
    if (!res.ok) throw new Error('Classifier training failed');
    return res.json();
  },

  async getEdgeBenchmark(): Promise<EdgeBenchmarkResult> {
    const res = await fetch(`${API_BASE}/edge/benchmark`);
    if (!res.ok) throw new Error('Failed to run edge benchmark');
    return res.json();
  },

  async exportOnnx() {
    const res = await fetch(`${API_BASE}/edge/export-onnx`);
    if (!res.ok) throw new Error('ONNX export failed');
    return res.json();
  }
};
