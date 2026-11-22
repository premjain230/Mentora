// vanilla/voice/audio-playback.js
// Dedicated Gemini Live Audio Playback & Gapless Sequential Queue Manager for Learning Allied.
//
// Responsibilities:
// 1. Receives 24 kHz signed 16-bit Little-Endian PCM audio from Gemini Live serverContent.
// 2. Converts base64 PCM chunks to Float32 AudioBuffers.
// 3. Implements gapless sequential scheduling using Web Audio API timeline (audioContext.currentTime).
// 4. Manages an active source queue to prevent overlapping chunks or playback gaps.
// 5. Handles barge-in / interruption (interrupted: true) by instantly stopping all scheduled audio and clearing the queue.
// 6. Handles turnComplete cleanly without truncating in-flight or scheduled audio chunks.
// 7. Handles browser autoplay policies and AudioContext suspension gracefully.
// 8. Safely releases resources on stop/close without memory leaks or playing stale chunks after stop.

const GEMINI_OUTPUT_SAMPLE_RATE = 24000;

/**
 * Decodes a base64 string into a Uint8Array.
 */
function base64ToUint8Array(base64) {
  if (typeof base64 !== "string" || !base64) {
    return new Uint8Array(0);
  }
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Converts signed 16-bit little-endian PCM bytes into normalized Float32 samples [-1.0, 1.0].
 */
function pcm16LittleEndianToFloat32(uint8Bytes) {
  if (!uint8Bytes || uint8Bytes.length === 0) {
    return new Float32Array(0);
  }
  const sampleCount = Math.floor(uint8Bytes.length / 2);
  const float32 = new Float32Array(sampleCount);
  const dataView = new DataView(uint8Bytes.buffer, uint8Bytes.byteOffset, uint8Bytes.byteLength);

  for (let i = 0; i < sampleCount; i++) {
    const int16 = dataView.getInt16(i * 2, true); // true = little-endian
    float32[i] = int16 < 0 ? int16 / 32768 : int16 / 32767;
  }
  return float32;
}

class AudioPlaybackManager {
  constructor({
    audioContext = null,
    onPlaybackStarted = null,
    onPlaybackEnded = null,
    onInterrupted = null,
    onError = null,
  } = {}) {
    this.audioContext = audioContext;
    this.ownsContext = !audioContext; // True if created internally, false if supplied by caller

    this.onPlaybackStarted = onPlaybackStarted;
    this.onPlaybackEnded = onPlaybackEnded;
    this.onInterrupted = onInterrupted;
    this.onError = onError;

    this.state = "idle"; // "idle" | "playing" | "interrupted" | "stopped"
    this.nextStartTime = 0;
    this.activeSources = new Set();
    this.turnCompletePending = false;
    this.isPlaying = false;
  }

  /**
   * Initializes or resumes the AudioContext on user interaction.
   */
  async ensureContext() {
    if (this.state === "stopped") return;

    if (!this.audioContext) {
      const AudioCtxClass = (typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext)) || global.AudioContext;
      if (!AudioCtxClass) {
        throw new Error("Web Audio API is not supported in this environment.");
      }
      this.audioContext = new AudioCtxClass();
      this.ownsContext = true;
    }

    if (this.audioContext.state === "suspended") {
      try {
        await this.audioContext.resume();
      } catch (resumeErr) {
        console.warn("[AudioPlayback] Context resume failed:", resumeErr);
        if (typeof this.onError === "function") {
          this.onError({ code: "AUTOPLAY_SUSPENDED", message: "AudioContext is suspended.", error: resumeErr });
        }
      }
    }
  }

  /**
   * Enqueues an audio part received from Gemini Live serverContent.
   * Part schema: { inlineData: { mimeType: "audio/pcm;rate=24000", data: "<base64>" } }
   */
  async enqueueAudioPart(part) {
    if (this.state === "stopped" || !part || !part.inlineData || !part.inlineData.data) {
      return false;
    }

    try {
      await this.ensureContext();

      // Guard against race conditions where stop() was invoked during ensureContext()
      if (this.state === "stopped") {
        return false;
      }

      const base64Data = part.inlineData.data;
      const rawBytes = base64ToUint8Array(base64Data);
      const float32Samples = pcm16LittleEndianToFloat32(rawBytes);

      if (float32Samples.length === 0) {
        return false;
      }

      this._scheduleBuffer(float32Samples);
      return true;
    } catch (err) {
      console.error("[AudioPlayback] Failed to enqueue audio chunk:", err);
      if (typeof this.onError === "function") {
        this.onError({ code: "ENQUEUE_ERROR", message: "Failed to process audio chunk", error: err });
      }
      return false;
    }
  }

  /**
   * Schedules a Float32 buffer sequentially on the Web Audio API timeline.
   */
  _scheduleBuffer(float32Samples) {
    if (this.state === "stopped" || !this.audioContext || this.audioContext.state === "closed") {
      return;
    }

    // Create 24 kHz mono buffer
    const audioBuffer = this.audioContext.createBuffer(1, float32Samples.length, GEMINI_OUTPUT_SAMPLE_RATE);
    audioBuffer.getChannelData(0).set(float32Samples);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    // Calculate gapless start time
    const currentTime = this.audioContext.currentTime;
    const startTime = Math.max(currentTime, this.nextStartTime);
    const duration = audioBuffer.duration;

    source.start(startTime);
    this.nextStartTime = startTime + duration;
    this.activeSources.add(source);

    if (!this.isPlaying) {
      this.isPlaying = true;
      this.state = "playing";
      if (typeof this.onPlaybackStarted === "function") {
        try {
          this.onPlaybackStarted();
        } catch (_) {}
      }
    }

    source.onended = () => {
      this.activeSources.delete(source);

      // Check if all queued chunks have finished playing
      if (this.activeSources.size === 0 && this.state !== "stopped") {
        this.isPlaying = false;
        this.state = "idle";
        this.nextStartTime = this.audioContext ? this.audioContext.currentTime : 0;

        if (this.turnCompletePending) {
          this.turnCompletePending = false;
          if (typeof this.onPlaybackEnded === "function") {
            try {
              this.onPlaybackEnded();
            } catch (_) {}
          }
        }
      }
    };
  }

  /**
   * Handles Gemini turnComplete signal without truncating in-flight audio.
   */
  handleTurnComplete() {
    if (this.state === "stopped") return;

    if (this.activeSources.size === 0) {
      // Nothing currently playing or scheduled
      this.turnCompletePending = false;
      this.isPlaying = false;
      this.state = "idle";
      if (typeof this.onPlaybackEnded === "function") {
        try {
          this.onPlaybackEnded();
        } catch (_) {}
      }
    } else {
      // Mark turn completion pending until the last scheduled buffer source completes
      this.turnCompletePending = true;
    }
  }

  /**
   * Handles barge-in / interruption: instantly cuts off all current and scheduled audio.
   */
  interrupt() {
    this.turnCompletePending = false;
    if (this.state !== "stopped") {
      this.state = "interrupted";
    }

    // Instantly stop and disconnect all active and scheduled sources
    for (const source of this.activeSources) {
      try {
        source.onended = null;
        source.stop(0);
        source.disconnect();
      } catch (_) {}
    }
    this.activeSources.clear();

    if (this.audioContext) {
      this.nextStartTime = this.audioContext.currentTime;
    } else {
      this.nextStartTime = 0;
    }

    this.isPlaying = false;
    if (this.state !== "stopped") {
      this.state = "idle";
    }

    if (typeof this.onInterrupted === "function") {
      try {
        this.onInterrupted();
      } catch (_) {}
    }
  }

  /**
   * Cleanly stops playback and releases all audio resources.
   */
  async stop() {
    this.interrupt();
    this.state = "stopped";

    if (this.ownsContext && this.audioContext) {
      try {
        if (this.audioContext.state !== "closed") {
          await this.audioContext.close();
        }
      } catch (_) {}
      this.audioContext = null;
    }
  }
}

// Support both ES module and browser global environments
if (typeof window !== "undefined") {
  window.AudioPlaybackManager = AudioPlaybackManager;
  window.GEMINI_OUTPUT_SAMPLE_RATE = GEMINI_OUTPUT_SAMPLE_RATE;
  window.base64ToUint8Array = base64ToUint8Array;
  window.pcm16LittleEndianToFloat32 = pcm16LittleEndianToFloat32;
}

export {
  AudioPlaybackManager,
  GEMINI_OUTPUT_SAMPLE_RATE,
  base64ToUint8Array,
  pcm16LittleEndianToFloat32,
};
export default AudioPlaybackManager;
