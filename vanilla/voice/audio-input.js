// vanilla/voice/audio-input.js
// Dedicated Microphone Capture & Off-Thread Audio Resampling Manager for Learning Allied Gemini Live Voice.
//
// Guarantees:
// 1. Microphone permission requested ONLY on explicit user gesture (start()).
// 2. Off-thread AudioWorklet processing with zero UI blocking.
// 3. Resampled to exactly 16,000 Hz signed 16-bit PCM (Little-Endian).
// 4. Emits ~100ms chunks (1,600 samples / 3,200 bytes) with base64 serialization.
// 5. Handles permission denial, missing devices, device disconnections, and cleanup cleanly.
// 6. Zero WebSocket or audio playback coupling.

/**
 * Converts an ArrayBuffer to a standard base64 string efficiently in chunks.
 */
function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  let binary = "";
  const chunkSize = 4096;
  for (let i = 0; i < len; i += chunkSize) {
    const chunk = bytes.subarray(i, Math.min(i + chunkSize, len));
    binary += String.fromCharCode.apply(null, chunk);
  }
  return btoa(binary);
}

class AudioInputManager {
  constructor({
    onChunk = null,
    onError = null,
    onStateChange = null,
    workletUrl = "/audio-processor.js",
  } = {}) {
    this.onChunk = onChunk;
    this.onError = onError;
    this.onStateChange = onStateChange;
    this.workletUrl = workletUrl;

    this.state = "idle"; // "idle" | "requesting_permission" | "recording" | "muted" | "stopped" | "error"
    this.audioContext = null;
    this.mediaStream = null;
    this.sourceNode = null;
    this.workletNode = null;
    this._muted = false;
  }

  /**
   * Checks whether the current browser environment supports required Web Audio and MediaDevices APIs.
   */
  static isSupported() {
    const hasAudioContext = typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext);
    const hasMediaDevices = typeof navigator !== "undefined" && navigator.mediaDevices && typeof navigator.mediaDevices.getUserMedia === "function";
    const hasWorklet = typeof window !== "undefined" && window.AudioWorkletNode !== undefined;
    return Boolean(hasAudioContext && hasMediaDevices && hasWorklet);
  }

  _setState(newState) {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;
    if (typeof this.onStateChange === "function") {
      try {
        this.onStateChange(newState, oldState);
      } catch (err) {
        console.error("[AudioInput] Error in onStateChange callback:", err);
      }
    }
  }

  _handleError(code, message, originalError = null) {
    this._setState("error");
    const errorPayload = {
      code,
      message,
      originalError,
      timestamp: Date.now(),
    };
    console.error(`[AudioInput] ${code}: ${message}`, originalError || "");
    if (typeof this.onError === "function") {
      try {
        this.onError(errorPayload);
      } catch (err) {
        console.error("[AudioInput] Error in onError callback:", err);
      }
    }
  }

  /**
   * Starts microphone capture. Must be called as a result of a user gesture (e.g. clicking Start Voice).
   */
  async start() {
    if (this.state === "recording" || this.state === "requesting_permission") {
      return;
    }

    if (!AudioInputManager.isSupported()) {
      this._handleError(
        "BROWSER_NOT_SUPPORTED",
        "Your browser does not support production AudioWorklet or microphone capture. Please use a modern browser."
      );
      return;
    }

    this._setState("requesting_permission");

    // 1. Request microphone permission
    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (permErr) {
      const errName = permErr ? permErr.name : "";
      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        this._handleError(
          "PERMISSION_DENIED",
          "Microphone access was denied. Please allow microphone permission in your browser to speak with your AI tutor.",
          permErr
        );
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        this._handleError(
          "DEVICE_NOT_FOUND",
          "No microphone found. Please connect a microphone and try again.",
          permErr
        );
      } else if (errName === "NotReadableError" || errName === "TrackStartError") {
        this._handleError(
          "DEVICE_BUSY",
          "Microphone is currently in use by another application.",
          permErr
        );
      } else {
        this._handleError(
          "MICROPHONE_INIT_FAILED",
          "Could not initialize microphone: " + (permErr.message || permErr.name),
          permErr
        );
      }
      await this.stop();
      return;
    }

    // 2. Setup AudioContext and AudioWorklet
    try {
      const AudioCtxClass = window.AudioContext || window.webkitAudioContext;
      this.audioContext = new AudioCtxClass();

      // Resume context if suspended by browser autoplay policy
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      // Detect hardware disconnection during an active session
      const audioTracks = this.mediaStream.getAudioTracks();
      if (audioTracks.length > 0) {
        audioTracks[0].onended = async () => {
          this._handleError("DEVICE_DISCONNECTED", "Microphone was disconnected during the session.");
          await this.stop();
        };
      }

      // Load the dedicated AudioWorklet
      await this.audioContext.audioWorklet.addModule(this.workletUrl);

      // Create audio nodes
      this.sourceNode = this.audioContext.createMediaStreamSource(this.mediaStream);
      const WorkletNodeClass = (typeof window !== "undefined" && window.AudioWorkletNode) || (typeof AudioWorkletNode !== "undefined" ? AudioWorkletNode : null);
      if (!WorkletNodeClass) {
        throw new Error("AudioWorkletNode is not supported in this environment.");
      }
      this.workletNode = new WorkletNodeClass(this.audioContext, "gemini-audio-processor");

      // Handle audio chunks dispatched from the worklet
      this.workletNode.port.onmessage = (event) => {
        const data = event.data;
        if (!data || data.event !== "chunk" || !data.buffer) return;

        // Skip processing if manager is stopped or muted
        if (this.state !== "recording" || this._muted) return;

        const pcm16 = new Int16Array(data.buffer);
        const base64 = arrayBufferToBase64(data.buffer);

        if (typeof this.onChunk === "function") {
          try {
            this.onChunk({
              pcm16,
              buffer: data.buffer,
              base64,
              samples: data.samples || 1600,
              sampleRate: data.sampleRate || 16000,
            });
          } catch (chunkErr) {
            console.error("[AudioInput] Error in onChunk handler:", chunkErr);
          }
        }
      };

      // Connect source to worklet
      this.sourceNode.connect(this.workletNode);

      // Connect worklet to a silent (gain = 0) destination terminal to keep the audio graph
      // continuously clocked by the browser's audio render thread and prevent Chromium from
      // pausing or garbage-collecting the worklet processor after 3-4 seconds.
      if (typeof this.audioContext.createGain === "function") {
        this.silentGainNode = this.audioContext.createGain();
        if (this.silentGainNode.gain) this.silentGainNode.gain.value = 0; // 0 gain guarantees zero microphone feedback/echo
        this.workletNode.connect(this.silentGainNode);
        if (this.audioContext.destination) {
          this.silentGainNode.connect(this.audioContext.destination);
        }
      }

      if (typeof window !== "undefined") {
        window.__la_audioWorklet = this.workletNode;
      }

      this._muted = false;
      this._setState("recording");
    } catch (audioErr) {
      this._handleError(
        "AUDIO_PIPELINE_ERROR",
        "Failed to configure audio processing pipeline: " + (audioErr.message || audioErr.name),
        audioErr
      );
      await this.stop();
    }
  }

  /**
   * Mutes microphone input without tearing down the audio pipeline.
   */
  mute() {
    this._muted = true;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = false;
      });
    }
    if (this.workletNode) {
      this.workletNode.port.postMessage({ command: "mute" });
    }
    this._setState("muted");
  }

  /**
   * Unmutes microphone input and resumes chunk streaming.
   */
  unmute() {
    this._muted = false;
    if (this.mediaStream) {
      this.mediaStream.getAudioTracks().forEach((track) => {
        track.enabled = true;
      });
    }
    if (this.workletNode) {
      this.workletNode.port.postMessage({ command: "unmute" });
    }
    this._setState("recording");
  }

  isMuted() {
    return this._muted;
  }

  /**
   * Stops microphone capture and cleanly releases all hardware and Web Audio resources.
   */
  async stop() {
    this._muted = false;

    // 1. Stop all media stream tracks to turn off the hardware microphone light
    if (this.mediaStream) {
      try {
        this.mediaStream.getTracks().forEach((track) => {
          track.stop();
          track.onended = null;
        });
      } catch (_) {}
      this.mediaStream = null;
    }

    // 2. Disconnect and release audio nodes
    if (this.sourceNode) {
      try {
        this.sourceNode.disconnect();
      } catch (_) {}
      this.sourceNode = null;
    }

    if (this.workletNode) {
      try {
        this.workletNode.port.onmessage = null;
        this.workletNode.disconnect();
      } catch (_) {}
      this.workletNode = null;
    }

    if (this.silentGainNode) {
      try {
        this.silentGainNode.disconnect();
      } catch (_) {}
      this.silentGainNode = null;
    }

    if (typeof window !== "undefined" && window.__la_audioWorklet) {
      delete window.__la_audioWorklet;
    }

    // 3. Close AudioContext
    if (this.audioContext) {
      try {
        if (this.audioContext.state !== "closed") {
          await this.audioContext.close();
        }
      } catch (_) {}
      this.audioContext = null;
    }

    this._setState("stopped");
  }
}

// Support ES module and browser global environments
if (typeof window !== "undefined") {
  window.AudioInputManager = AudioInputManager;
  window.arrayBufferToBase64 = arrayBufferToBase64;
}

export { AudioInputManager, arrayBufferToBase64 };
export default AudioInputManager;
