/**
 * Audio processing utilities for PCM 16kHz input encoding and 24kHz output playback
 */

/**
 * Resamples Float32 audio data from one sample rate to 16000 Hz,
 * and converts to 16-bit Linear PCM Little-Endian Base64.
 */
export function convertFloat32To16kPCMBase64(
  inputData: Float32Array,
  sourceSampleRate: number
): string {
  const targetSampleRate = 16000;
  let resampledData: Float32Array;

  if (sourceSampleRate === targetSampleRate) {
    resampledData = inputData;
  } else {
    const ratio = sourceSampleRate / targetSampleRate;
    const newLength = Math.round(inputData.length / ratio);
    resampledData = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const originalIndex = Math.min(Math.floor(i * ratio), inputData.length - 1);
      resampledData[i] = inputData[originalIndex];
    }
  }

  // Convert Float32 [-1.0, 1.0] to Int16 [-32768, 32767]
  const buffer = new ArrayBuffer(resampledData.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < resampledData.length; i++) {
    // Clamp to prevent distortion
    const s = Math.max(-1, Math.min(1, resampledData[i]));
    const intSample = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(i * 2, intSample, true); // Little endian
  }

  // Convert binary buffer to base64
  let binary = '';
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
}

/**
 * Decodes 24kHz 16-bit PCM Little Endian base64 data into an AudioBuffer
 */
export function decodePCM24kToAudioBuffer(
  base64Data: string,
  audioCtx: AudioContext,
  sampleRate: number = 24000
): AudioBuffer {
  const binaryString = atob(base64Data);
  const len = binaryString.length;
  const numSamples = Math.floor(len / 2);
  const float32Array = new Float32Array(numSamples);

  for (let i = 0; i < numSamples; i++) {
    const byte1 = binaryString.charCodeAt(i * 2);
    const byte2 = binaryString.charCodeAt(i * 2 + 1);
    let int16 = byte1 | (byte2 << 8);
    // Convert to signed 16-bit
    if (int16 >= 0x8000) {
      int16 -= 0x10000;
    }
    float32Array[i] = int16 / 32768.0;
  }

  const audioBuffer = audioCtx.createBuffer(1, numSamples, sampleRate);
  audioBuffer.getChannelData(0).set(float32Array);
  return audioBuffer;
}

/**
 * Gapless Audio Queue Player for 24kHz PCM chunks from Gemini Live / TTS
 */
export class GaplessAudioPlayer {
  private audioCtx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private gainNode: GainNode | null = null;
  private nextStartTime: number = 0;
  private activeSources: AudioBufferSourceNode[] = [];
  private onPlaybackStateChange?: (isPlaying: boolean) => void;
  private checkInterval: any = null;

  constructor(onPlaybackStateChange?: (isPlaying: boolean) => void) {
    this.onPlaybackStateChange = onPlaybackStateChange;
  }

  public init() {
    if (!this.audioCtx || this.audioCtx.state === 'closed') {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      this.audioCtx = new AudioContextClass({ sampleRate: 24000 });
      this.analyser = this.audioCtx.createAnalyser();
      this.analyser.fftSize = 256;
      this.analyser.smoothingTimeConstant = 0.8;

      this.gainNode = this.audioCtx.createGain();
      this.gainNode.gain.value = 1.0;

      this.gainNode.connect(this.analyser);
      this.analyser.connect(this.audioCtx.destination);
    }

    if (this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
  }

  public async playChunk(base64Audio: string) {
    this.init();
    if (!this.audioCtx || !this.gainNode) return;

    try {
      const buffer = decodePCM24kToAudioBuffer(base64Audio, this.audioCtx, 24000);
      const source = this.audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.gainNode);

      const currentTime = this.audioCtx.currentTime;
      // Schedule gaplessly
      const startTime = Math.max(currentTime + 0.015, this.nextStartTime);
      source.start(startTime);
      this.nextStartTime = startTime + buffer.duration;

      this.activeSources.push(source);
      this.notifyState();

      source.onended = () => {
        const index = this.activeSources.indexOf(source);
        if (index > -1) {
          this.activeSources.splice(index, 1);
        }
        this.notifyState();
      };
    } catch (err) {
      console.error('Error playing audio chunk:', err);
    }
  }

  public stopAll() {
    for (const source of this.activeSources) {
      try {
        source.stop();
        source.disconnect();
      } catch {
        // Source might have already stopped
      }
    }
    this.activeSources = [];
    if (this.audioCtx) {
      this.nextStartTime = this.audioCtx.currentTime;
    }
    this.notifyState();
  }

  public getAnalyser(): AnalyserNode | null {
    return this.analyser;
  }

  public isPlaying(): boolean {
    return this.activeSources.length > 0;
  }

  private notifyState() {
    if (this.onPlaybackStateChange) {
      this.onPlaybackStateChange(this.isPlaying());
    }
  }

  public close() {
    this.stopAll();
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close();
    }
    this.audioCtx = null;
    this.analyser = null;
  }
}
