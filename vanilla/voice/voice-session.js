// vanilla/voice/voice-session.js
// Voice Session Coordinator for Learning Allied Gemini Live Voice.
// Integrates AudioInputManager, GeminiLiveClient, AudioPlaybackManager, and /api/voice-session.
//
// Guarantees:
// 1. Microphone capture only starts on explicit user gesture.
// 2. AudioContext resumed/created from user gesture for browser autoplay compliance.
// 3. Ephemeral credentials obtained securely from /api/voice-session (never exposes master keys).
// 4. Clean pipeline: mic -> worklet (16 kHz PCM) -> LiveClient (realtimeInput.audio).
// 5. Clean playback: LiveClient (24 kHz PCM) -> AudioPlaybackManager.
// 6. Seamless barge-in with acoustic false-positive protection (fast onset + sustained voice energy).
// 7. Complete teardown on End Voice without resource or listener leaks.
// 8. Session generation ID to eliminate stale callbacks across rapid start/stop cycles.
// 9. Resilient session resumption handling with fail-closed safety (never silently starts fresh).
// 10. Browser tab visibility change handling to resume suspended AudioContext.

import { AudioInputManager } from "./audio-input.js";
import { GeminiLiveClient, sanitizeSensitive } from "./live-client.js";
import { AudioPlaybackManager } from "./audio-playback.js";

const MAX_AUTO_RECONNECT_ATTEMPTS = 1;

class VoiceSessionCoordinator {
  constructor({
    getAuthHeaders = null, // async () => ({ Authorization: "Bearer ..." })
    onStateChange = null,  // (state, details) => {}
    apiBase = "",
  } = {}) {
    this.getAuthHeaders = getAuthHeaders;
    this.onStateChange = onStateChange;
    this.apiBase = apiBase;

    this.state = "idle"; // "idle" | "connecting" | "listening" | "speaking" | "muted" | "error"
    this.audioInput = null;
    this.liveClient = null;
    this.audioPlayback = null;
    this.audioContext = null;

    // Session lifecycle & concurrency tokens
    this._sessionId = 0;
    this._isStarting = false;
    this._isStopping = false;
    this._userMuted = false;
    this._reconnectAttempts = 0;

    // Barge-in acoustic tracking: dual-threshold onset filter
    // Fast onset (loud speech): RMS > 4200 triggers immediately (100ms)
    // Sustained speech: RMS > 1800 for 2 consecutive chunks (~200ms)
    // Isolated clicks, breathing, and room noise (< 1800 or 1 chunk transient) are ignored.
    this._consecutiveSpeechChunks = 0;

    // Tab visibility handler binding
    this._visibilityHandler = this._handleVisibilityChange.bind(this);
    if (typeof document !== "undefined" && typeof document.addEventListener === "function") {
      document.addEventListener("visibilitychange", this._visibilityHandler);
    }
  }

  _setState(newState, details = {}) {
    this.state = newState;
    if (typeof this.onStateChange === "function") {
      try {
        this.onStateChange(newState, {
          ...details,
          message: sanitizeSensitive(details.message || ""),
        });
      } catch (err) {
        console.error("[VoiceSession] Error in onStateChange callback:", err);
      }
    }
  }

  _handleVisibilityChange() {
    if (typeof document === "undefined") return;
    if (document.visibilityState === "visible") {
      // Resume AudioContext if suspended while tab was hidden
      if (
        (this.state === "listening" || this.state === "speaking" || this.state === "muted") &&
        this.audioContext &&
        this.audioContext.state === "suspended"
      ) {
        this.audioContext.resume().catch((err) => {
          console.warn("[VoiceSession] Context resume on tab visibility failed:", err);
        });
      }
    }
  }

  /**
   * Starts a complete Gemini Live voice session.
   * Must be called in response to an explicit user gesture.
   */
  async start() {
    // Prevent duplicate calls while starting or active
    if (this._isStarting || this.state === "connecting" || this.state === "listening" || this.state === "speaking") {
      return;
    }

    const currentSessionId = ++this._sessionId;
    this._isStarting = true;
    this._isStopping = false;
    this._userMuted = false;
    this._consecutiveSpeechChunks = 0;
    this._reconnectAttempts = 0;

    this._setState("connecting", { message: "Initializing voice session..." });

    try {
      // 1. Initialize Web Audio Context on user gesture for autoplay compliance
      const AudioCtxClass = (typeof window !== "undefined" && (window.AudioContext || window.webkitAudioContext)) || global.AudioContext;
      if (!AudioCtxClass) {
        throw new Error("Web Audio API is not supported by your browser.");
      }
      this.audioContext = new AudioCtxClass();
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      // Check if aborted during AudioContext init
      if (this._sessionId !== currentSessionId || this._isStopping) return;

      // 2. Initialize Audio Playback Manager (sharing the user-unlocked AudioContext)
      this.audioPlayback = new AudioPlaybackManager({
        audioContext: this.audioContext,
        onPlaybackStarted: () => {
          if (this._sessionId !== currentSessionId) return;
          if (this.state !== "error" && this.state !== "idle") {
            this._setState(this._userMuted ? "muted" : "speaking");
          }
        },
        onPlaybackEnded: () => {
          if (this._sessionId !== currentSessionId) return;
          if (this.state !== "error" && this.state !== "idle") {
            this._setState(this._userMuted ? "muted" : "listening");
          }
        },
        onInterrupted: () => {
          if (this._sessionId !== currentSessionId) return;
          if (this.state !== "error" && this.state !== "idle") {
            this._setState(this._userMuted ? "muted" : "listening");
          }
        },
        onError: (err) => {
          if (this._sessionId !== currentSessionId) return;
          console.error("[VoiceSession] Playback error:", err);
        },
      });
      await this.audioPlayback.ensureContext();

      if (this._sessionId !== currentSessionId || this._isStopping) return;

      // 3. Initialize Gemini Live Client with /api/voice-session provider
      this.liveClient = new GeminiLiveClient({
        sessionProvider: async () => {
          let headers = { "Content-Type": "application/json" };
          if (typeof this.getAuthHeaders === "function") {
            try {
              const authH = await this.getAuthHeaders();
              headers = { ...headers, ...authH };
            } catch (authErr) {
              console.error("[VoiceSession] Failed to retrieve auth headers:", authErr);
            }
          }

          const endpoint = `${this.apiBase}/api/voice-session`;
          const resp = await fetch(endpoint, {
            method: "POST",
            headers,
          });

          if (!resp.ok) {
            let errorMsg = `HTTP ${resp.status}`;
            try {
              const errData = await resp.json();
              if (errData && errData.error) errorMsg = errData.error;
            } catch (_) {}
            throw new Error(`Voice session initialization failed: ${errorMsg}`);
          }

          const data = await resp.json();
          return data;
        },
        onSetupComplete: ({ resumed }) => {
          if (this._sessionId !== currentSessionId) return;
          this._reconnectAttempts = 0;
          if (this.state !== "error" && this.state !== "idle") {
            this._setState(this._userMuted ? "muted" : "listening", {
              message: resumed ? "Session resumed. Tutor is listening..." : "Tutor is listening...",
              resumed,
            });
          }
        },
        onServerContent: (modelTurn) => {
          if (this._sessionId !== currentSessionId) return;
          if (modelTurn && Array.isArray(modelTurn.parts) && this.audioPlayback) {
            for (const part of modelTurn.parts) {
              if (part.inlineData) {
                this.audioPlayback.enqueueAudioPart(part);
              }
            }
          }
        },
        onInterrupted: () => {
          if (this._sessionId !== currentSessionId) return;
          // Barge-in: immediately silence audio playback
          if (this.audioPlayback) {
            this.audioPlayback.interrupt();
          }
        },
        onTurnComplete: () => {
          if (this._sessionId !== currentSessionId) return;
          if (this.audioPlayback) {
            this.audioPlayback.handleTurnComplete();
          }
        },
        onGoAway: ({ timeLeft }) => {
          if (this._sessionId !== currentSessionId) return;
          console.warn(`[VoiceSession] Connection will terminate soon: ${timeLeft} remaining.`);
          this._setState(this.state, {
            warning: "SESSION_EXPIRING",
            message: `Connection approaching limit (${timeLeft} remaining). Session will resume automatically.`,
          });
        },
        onError: (err) => {
          if (this._sessionId !== currentSessionId) return;
          console.error("[VoiceSession] Live connection error:", err);

          // Handle resumption rejection cleanly: fail closed without silently creating untracked session
          if (err.code === "RESUMPTION_REJECTED" || err.code === "RESUMPTION_HANDLE_EXPIRED") {
            this._setState("error", {
              code: err.code,
              message: "Unable to resume your previous conversation session. Please start a new session.",
            });
            this.stop();
            return;
          }

          this._setState("error", {
            code: err.code || "CONNECTION_ERROR",
            message: err.message || "Connection to AI voice tutor lost.",
          });
          this.stop();
        },
        onClose: ({ wasConnected, canResume, isAbnormal }) => {
          if (this._sessionId !== currentSessionId) return;

          // If connection closed unexpectedly during an active session and handle is valid, attempt resumption
          if (isAbnormal && wasConnected && canResume && this._reconnectAttempts < MAX_AUTO_RECONNECT_ATTEMPTS) {
            this._reconnectAttempts++;
            this._setState("connecting", { message: "Connection lost. Resuming conversation..." });
            this.liveClient.connect({ resume: true }).catch((reconnectErr) => {
              console.error("[VoiceSession] Auto-reconnect failed:", reconnectErr);
              this._setState("error", {
                code: "RECONNECT_FAILED",
                message: "Could not restore voice session. Please click Retry to start a new session.",
              });
              this.stop();
            });
            return;
          }

          if (this.state !== "error" && wasConnected) {
            this._setState("idle", { message: "Voice conversation ended." });
            this.stop();
          }
        },
      });

      // 4. Connect to Gemini Live WebSocket
      await this.liveClient.connect();

      if (this._sessionId !== currentSessionId || this._isStopping) return;

      // 5. Initialize Microphone Capture
      this.audioInput = new AudioInputManager({
        onChunk: ({ base64, pcm16 }) => {
          if (this._sessionId !== currentSessionId) return;

          // Client-side acoustic barge-in filter:
          // Prevents false positives from background room noise or minor clicks.
          // Fast path: RMS > 4200 (loud speech onset) triggers instantly in 1 chunk (100ms).
          // Sustained path: RMS > 1800 across 2 consecutive chunks (~200ms) triggers barge-in.
          if (this.audioPlayback && this.audioPlayback.isPlaying && pcm16) {
            let sumSq = 0;
            const step = 4;
            for (let i = 0; i < pcm16.length; i += step) {
              const val = pcm16[i];
              sumSq += val * val;
            }
            const rms = Math.sqrt(sumSq / (pcm16.length / step));

            if (rms > 4200) {
              this._consecutiveSpeechChunks = 0;
              this.audioPlayback.interrupt();
            } else if (rms > 1800) {
              this._consecutiveSpeechChunks++;
              if (this._consecutiveSpeechChunks >= 2) {
                this._consecutiveSpeechChunks = 0;
                this.audioPlayback.interrupt();
              }
            } else {
              this._consecutiveSpeechChunks = 0;
            }
          } else {
            this._consecutiveSpeechChunks = 0;
          }

          // Stream raw 16 kHz Little-Endian PCM chunk to Gemini Live API
          if (this.liveClient && this.liveClient.state === "connected") {
            this.liveClient.sendRealtimeAudio(base64);
          }
        },
        onError: (err) => {
          if (this._sessionId !== currentSessionId) return;
          console.error("[VoiceSession] Microphone error:", err);
          this._setState("error", {
            code: err.code || "MIC_ERROR",
            message: err.message || "Microphone capture failed.",
          });
          this.stop();
        },
        onStateChange: (micState) => {
          if (this._sessionId !== currentSessionId) return;
          if (micState === "muted") {
            this._setState("muted");
          } else if (micState === "recording" && this.liveClient?.state === "connected") {
            this._setState(this.audioPlayback?.isPlaying ? "speaking" : "listening");
          }
        },
      });

      // Start microphone stream
      await this.audioInput.start();

      this._isStarting = false;
    } catch (startErr) {
      this._isStarting = false;
      console.error("[VoiceSession] Failed to start voice session:", startErr);
      this._setState("error", {
        code: "SESSION_START_FAILED",
        message: sanitizeSensitive(startErr.message || "Could not start voice conversation."),
      });
      await this.stop();
    }
  }

  /**
   * Toggles microphone mute state.
   */
  toggleMute() {
    if (!this.audioInput) return;
    if (this._userMuted) {
      this.unmute();
    } else {
      this.mute();
    }
  }

  mute() {
    this._userMuted = true;
    if (this.audioInput) {
      this.audioInput.mute();
    }
    this._setState("muted");
  }

  unmute() {
    this._userMuted = false;
    if (this.audioInput) {
      this.audioInput.unmute();
    }
    this._setState(this.audioPlayback?.isPlaying ? "speaking" : "listening");
  }

  isMuted() {
    return this._userMuted;
  }

  /**
   * Cleanly ends the voice session and releases all hardware and network resources.
   */
  async stop() {
    if (this._isStopping) return;
    this._isStopping = true;
    this._sessionId++; // Invalidate any in-flight callbacks or asynchronous completions

    try {
      // 1. Stop microphone capture and turn off mic hardware light
      if (this.audioInput) {
        await this.audioInput.stop();
        this.audioInput = null;
      }

      // 2. Stop audio playback and flush queue
      if (this.audioPlayback) {
        await this.audioPlayback.stop();
        this.audioPlayback = null;
      }

      // 3. Disconnect WebSocket
      if (this.liveClient) {
        this.liveClient.disconnect();
        this.liveClient = null;
      }

      // 4. Release AudioContext
      if (this.audioContext) {
        try {
          if (this.audioContext.state !== "closed") {
            await this.audioContext.close();
          }
        } catch (_) {}
        this.audioContext = null;
      }
    } finally {
      this._isStarting = false;
      this._isStopping = false;
      this._userMuted = false;
      this._consecutiveSpeechChunks = 0;
      this._reconnectAttempts = 0;
      if (this.state !== "error") {
        this._setState("idle");
      }
    }
  }

  /**
   * Disposes all listeners when destroying coordinator instance.
   */
  destroy() {
    this.stop();
    if (typeof document !== "undefined" && typeof document.removeEventListener === "function" && this._visibilityHandler) {
      document.removeEventListener("visibilitychange", this._visibilityHandler);
    }
  }
}

// Support ES module and browser global environments
if (typeof window !== "undefined") {
  window.VoiceSessionCoordinator = VoiceSessionCoordinator;
}

export { VoiceSessionCoordinator };
export default VoiceSessionCoordinator;
