// public/audio-processor.js
// Production AudioWorkletProcessor for Learning Allied Gemini Live Voice.
// Runs off the main UI thread to capture, resample, and encode microphone audio.
//
// Key Responsibilities:
// 1. Ingests raw Float32 audio frames (typically 128 samples per render quantum).
// 2. Dynamically calculates resampling ratio based on hardware sampleRate (e.g. 48kHz / 44.1kHz -> 16kHz).
// 3. Performs continuous linear interpolation downsampling across frame boundaries (no clicks or phase distortion).
// 4. Converts normalized Float32 samples (-1.0 to +1.0) into signed 16-bit PCM (Int16Array, Little-Endian).
// 5. Accumulates exactly 1,600 samples (100ms at 16 kHz = 3,200 bytes) per chunk.
// 6. Transfers the underlying ArrayBuffer zero-copy to the main thread via postMessage.

class GeminiAudioProcessor extends AudioWorkletProcessor {
  constructor(options) {
    super(options);

    this.targetSampleRate = 16000;
    this.chunkSize = 1600; // 100ms at 16 kHz (1,600 samples = 3,200 bytes)
    this.buffer = new Int16Array(this.chunkSize);
    this.bufferIndex = 0;

    // Resampling state across frame boundaries
    this.inputSampleRate = sampleRate; // Global AudioWorkletGlobalScope sampleRate
    this.ratio = this.inputSampleRate / this.targetSampleRate;
    this.phase = 0; // Fractional position into input quantum

    this.isMuted = false;

    this.port.onmessage = (event) => {
      const data = event.data;
      if (!data) return;
      if (data.command === "mute") {
        this.isMuted = true;
      } else if (data.command === "unmute") {
        this.isMuted = false;
      } else if (data.command === "reset") {
        this.bufferIndex = 0;
        this.phase = 0;
      }
    };
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;

    // Use mono channel
    const channelData = input[0];
    if (!channelData || channelData.length === 0) return true;

    // If muted, do not stream audio
    if (this.isMuted) {
      return true;
    }

    const inputLength = channelData.length;
    const ratio = this.ratio;

    // Continuous linear interpolation resampling
    while (this.phase < inputLength) {
      const index = Math.floor(this.phase);
      const frac = this.phase - index;

      const s0 = channelData[index];
      const s1 = index + 1 < inputLength ? channelData[index + 1] : s0;
      const interpolated = s0 + frac * (s1 - s0);

      // Clamp between -1.0 and 1.0
      const clamped = Math.max(-1.0, Math.min(1.0, interpolated));

      // Convert Float32 [-1.0, 1.0] to signed 16-bit integer PCM [-32768, 32767]
      const pcm16 = clamped < 0
        ? Math.max(-32768, Math.round(clamped * 32768))
        : Math.min(32767, Math.round(clamped * 32767));

      this.buffer[this.bufferIndex++] = pcm16;

      // When chunk reaches 100ms (1,600 samples), transfer it to the main thread
      if (this.bufferIndex >= this.chunkSize) {
        const chunk = new Int16Array(this.buffer);
        this.port.postMessage(
          {
            event: "chunk",
            buffer: chunk.buffer,
            samples: this.chunkSize,
            sampleRate: this.targetSampleRate,
          },
          [chunk.buffer]
        );

        this.buffer = new Int16Array(this.chunkSize);
        this.bufferIndex = 0;
      }

      this.phase += ratio;
    }

    // Carry over remaining phase offset into the next quantum
    this.phase -= inputLength;

    return true;
  }
}

registerProcessor("gemini-audio-processor", GeminiAudioProcessor);
