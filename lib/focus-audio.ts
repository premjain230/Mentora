/**
 * Focus Sound Engine (Web Audio API)
 *
 * Provides synthesized audio streams for deep concentration without
 * external audio files or bandwidth usage:
 * - Brown Noise (deep, soothing low frequencies for deep work)
 * - Pink Noise (balanced 1/f noise for reading and memorization)
 * - 40Hz Gamma Focus (binaural beat targeting gamma brainwave synchronization)
 */

type SoundscapeMode = "off" | "brown" | "pink" | "gamma40";

class FocusSoundEngine {
  private ctx: AudioContext | null = null;
  private currentSource: AudioNode | null = null;
  private gainNode: GainNode | null = null;
  private activeMode: SoundscapeMode = "off";

  private initContext() {
    if (!this.ctx && typeof window !== "undefined") {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
        this.gainNode = this.ctx.createGain();
        this.gainNode.gain.setValueAtTime(0.15, this.ctx.currentTime);
        this.gainNode.connect(this.ctx.destination);
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    if (this.gainNode && this.ctx) {
      const clamped = Math.max(0, Math.min(1, vol));
      this.gainNode.gain.setTargetAtTime(clamped, this.ctx.currentTime, 0.05);
    }
  }

  public getActiveMode(): SoundscapeMode {
    return this.activeMode;
  }

  public play(mode: SoundscapeMode) {
    this.stop();
    if (mode === "off") {
      this.activeMode = "off";
      return;
    }

    this.initContext();
    if (!this.ctx || !this.gainNode) return;

    this.activeMode = mode;

    if (mode === "brown") {
      this.playBrownNoise();
    } else if (mode === "pink") {
      this.playPinkNoise();
    } else if (mode === "gamma40") {
      this.playGamma40();
    }
  }

  private playBrownNoise() {
    if (!this.ctx || !this.gainNode) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let lastOut = 0.0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      output[i] = (lastOut + 0.02 * white) / 1.02;
      lastOut = output[i];
      output[i] *= 3.5; // Gain compensation
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;
    whiteNoise.loop = true;

    // Gentle low-pass filter
    const filter = this.ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(450, this.ctx.currentTime);

    whiteNoise.connect(filter);
    filter.connect(this.gainNode);
    whiteNoise.start();

    this.currentSource = whiteNoise;
  }

  private playPinkNoise() {
    if (!this.ctx || !this.gainNode) return;
    const bufferSize = 2 * this.ctx.sampleRate;
    const noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      output[i] = b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362;
      output[i] *= 0.11;
      b6 = white * 0.115926;
    }

    const pinkSource = this.ctx.createBufferSource();
    pinkSource.buffer = noiseBuffer;
    pinkSource.loop = true;

    pinkSource.connect(this.gainNode);
    pinkSource.start();

    this.currentSource = pinkSource;
  }

  private playGamma40() {
    if (!this.ctx || !this.gainNode) return;
    // 200 Hz carrier frequency in Left ear, 240 Hz in Right ear (40 Hz binaural beat)
    const carrier = 200;
    const beat = 40;

    const oscLeft = this.ctx.createOscillator();
    const oscRight = this.ctx.createOscillator();
    oscLeft.type = "sine";
    oscRight.type = "sine";
    oscLeft.frequency.setValueAtTime(carrier, this.ctx.currentTime);
    oscRight.frequency.setValueAtTime(carrier + beat, this.ctx.currentTime);

    const merger = this.ctx.createChannelMerger(2);
    oscLeft.connect(merger, 0, 0); // Left channel
    oscRight.connect(merger, 0, 1); // Right channel

    merger.connect(this.gainNode);
    oscLeft.start();
    oscRight.start();

    this.currentSource = oscLeft;
  }

  public stop() {
    if (this.currentSource) {
      try {
        (this.currentSource as any).stop?.();
        this.currentSource.disconnect();
      } catch {}
      this.currentSource = null;
    }
    this.activeMode = "off";
  }
}

export const focusAudio = new FocusSoundEngine();
