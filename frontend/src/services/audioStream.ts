import { LiveTelemetry } from '../types';

export interface AudioStreamCallbacks {
  onTelemetry?: (data: LiveTelemetry) => void;
  onError?: (err: string) => void;
  onStatusChange?: (status: 'disconnected' | 'connecting' | 'connected' | 'streaming' | 'error') => void;
}

export class LiveAudioStreamController {
  private audioContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  private processorNode: ScriptProcessorNode | null = null;
  private inputAnalyser: AnalyserNode | null = null;
  private outputAnalyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private ws: WebSocket | null = null;

  private isStreaming = false;
  private isMuted = false;
  private nextPlayTime = 0;
  private callbacks: AudioStreamCallbacks = {};

  constructor(callbacks: AudioStreamCallbacks = {}) {
    this.callbacks = callbacks;
  }

  public getInputAnalyser(): AnalyserNode | null {
    return this.inputAnalyser;
  }

  public getOutputAnalyser(): AnalyserNode | null {
    return this.outputAnalyser;
  }

  public async startStream(): Promise<void> {
    if (this.isStreaming) return;

    this.callbacks.onStatusChange?.('connecting');

    try {
      // 1. Request microphone permissions (disable browser-native filters to capture real environmental noise)
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: false,
        },
      });

      // 2. Initialize Web Audio Context at 16000 Hz target rate
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioContext = new AudioCtx({ sampleRate: 16000 });
      if (this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      // Analysers for oscilloscope & spectrum visualizer
      this.inputAnalyser = this.audioContext.createAnalyser();
      this.inputAnalyser.fftSize = 512;

      this.outputAnalyser = this.audioContext.createAnalyser();
      this.outputAnalyser.fftSize = 512;

      // Master output gain node for muting
      this.gainNode = this.audioContext.createGain();
      this.gainNode.gain.value = this.isMuted ? 0.0 : 1.0;
      this.gainNode.connect(this.outputAnalyser);
      this.outputAnalyser.connect(this.audioContext.destination);

      // Connect microphone to input analyser
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      this.sourceNode.connect(this.inputAnalyser);

      // 3. Connect to Backend WebSocket
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/ws/live-enhance`;
      this.ws = new WebSocket(wsUrl);
      this.ws.binaryType = 'arraybuffer';

      this.ws.onopen = () => {
        this.callbacks.onStatusChange?.('streaming');
        this.isStreaming = true;
        this.startCaptureProcessing();
      };

      this.ws.onmessage = (event: MessageEvent) => {
        if (typeof event.data === 'string') {
          // JSON telemetry
          try {
            const telemetry = JSON.parse(event.data);
            if (telemetry.type === 'telemetry') {
              this.callbacks.onTelemetry?.(telemetry);
            }
          } catch {
            // Ignore parse errors
          }
        } else if (event.data instanceof ArrayBuffer) {
          // Binary Float32 PCM audio chunk received from backend
          this.scheduleAudioPlayback(event.data);
        }
      };

      this.ws.onerror = () => {
        this.callbacks.onError?.('WebSocket communication error. Check backend connection.');
        this.callbacks.onStatusChange?.('error');
      };

      this.ws.onclose = () => {
        if (this.isStreaming) {
          this.callbacks.onStatusChange?.('disconnected');
          this.stopStream();
        }
      };

    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('NotAllowedError') || msg.includes('Permission denied')) {
        this.callbacks.onError?.('Microphone permission was denied. Please allow microphone access in browser settings.');
      } else {
        this.callbacks.onError?.(`Failed to initialize microphone stream: ${msg}`);
      }
      this.callbacks.onStatusChange?.('error');
      this.stopStream();
    }
  }

  private startCaptureProcessing(): void {
    if (!this.audioContext || !this.sourceNode) return;

    // Buffer size 512 samples = 32ms frames at 16kHz
    const bufferSize = 512;
    this.processorNode = this.audioContext.createScriptProcessor(bufferSize, 1, 1);

    this.processorNode.onaudioprocess = (e: AudioProcessingEvent) => {
      if (!this.isStreaming || !this.ws || this.ws.readyState !== WebSocket.OPEN) return;

      const inputData = e.inputBuffer.getChannelData(0);
      // Send raw float32 samples to backend
      const pcmBytes = inputData.buffer;
      this.ws.send(pcmBytes);
    };

    this.sourceNode.connect(this.processorNode);
    this.processorNode.connect(this.audioContext.destination);
  }

  private scheduleAudioPlayback(arrayBuffer: ArrayBuffer): void {
    if (!this.audioContext || !this.gainNode) return;

    const floatSamples = new Float32Array(arrayBuffer);
    if (floatSamples.length === 0) return;

    const audioBuf = this.audioContext.createBuffer(1, floatSamples.length, 16000);
    audioBuf.copyToChannel(floatSamples, 0);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuf;
    source.connect(this.gainNode);

    const currentTime = this.audioContext.currentTime;
    // Low-jitter scheduled timeline: keep play cursor 20ms in future
    if (this.nextPlayTime < currentTime) {
      this.nextPlayTime = currentTime + 0.02;
    }

    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuf.duration;
  }

  public setMute(muted: boolean): void {
    this.isMuted = muted;
    if (this.gainNode) {
      this.gainNode.gain.value = muted ? 0.0 : 1.0;
    }
  }

  public configureDSP(speechPreservation: number, impulsiveBlanking: boolean, profile: string = 'auto'): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({
        action: 'configure',
        speech_preservation: speechPreservation,
        impulsive_blanking: impulsiveBlanking,
        profile,
      }));
    }
  }

  public resetBuffer(): void {
    this.nextPlayTime = 0;
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ action: 'reset' }));
    }
  }

  public stopStream(): void {
    this.isStreaming = false;

    if (this.processorNode) {
      this.processorNode.disconnect();
      this.processorNode = null;
    }

    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }

    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }

    if (this.ws) {
      if (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING) {
        this.ws.close();
      }
      this.ws = null;
    }

    if (this.audioContext && this.audioContext.state !== 'closed') {
      this.audioContext.close();
      this.audioContext = null;
    }

    this.callbacks.onStatusChange?.('disconnected');
  }

  public isActive(): boolean {
    return this.isStreaming;
  }
}
