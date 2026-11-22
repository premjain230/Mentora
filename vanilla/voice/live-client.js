// vanilla/voice/live-client.js
// Dedicated Gemini Live WebSocket Protocol Client for Learning Allied Voice.
//
// Responsibilities:
// 1. Manages bidirectional WebSocket connection using ephemeral tokens from /api/voice-session.
// 2. Transmits the official BidiGenerateContentSetup handshake with locked constraints.
// 3. Implements strict state transitions: disconnected -> connecting -> connected -> reconnecting -> error.
// 4. Parses server messages: setupComplete, serverContent, sessionResumptionUpdate, goAway, and errors.
// 5. Caches resumption handles ONLY when resumable === true and newHandle is non-empty.
// 6. Enforces separate 30-min token TTL and 2-hr resumption handle TTL.
// 7. Fails closed with an explicit error if session resumption fails (NEVER silently starts an untracked conversation).
// 8. Safely flushes and removes listeners on cleanup.
// 9. Protects sensitive tokens and credentials from being exposed in errors or logs.

const RESUMPTION_HANDLE_TTL_MS = 2 * 60 * 60 * 1000; // 2 hours after last session termination

/**
 * Redacts sensitive tokens, API keys, and query parameters from log messages and error strings.
 */
function sanitizeSensitive(text) {
  if (typeof text !== "string") return text;
  return text
    .replace(/access_token=[^&\s"']+/gi, "access_token=[REDACTED]")
    .replace(/AIzaSy[A-Za-z0-9_-]+/g, "AIzaSy[REDACTED]")
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [REDACTED]");
}

class GeminiLiveClient {
  constructor({
    sessionProvider = null, // async () => ({ token, model, wsUrl, expiresAt })
    onStateChange = null,
    onSetupComplete = null,
    onServerContent = null,
    onInterrupted = null,
    onTurnComplete = null,
    onGoAway = null,
    onError = null,
    onClose = null,
  } = {}) {
    this.sessionProvider = sessionProvider;
    this.onStateChange = onStateChange;
    this.onSetupComplete = onSetupComplete;
    this.onServerContent = onServerContent;
    this.onInterrupted = onInterrupted;
    this.onTurnComplete = onTurnComplete;
    this.onGoAway = onGoAway;
    this.onError = onError;
    this.onClose = onClose;

    this.state = "disconnected"; // "disconnected" | "connecting" | "connected" | "reconnecting" | "error"
    this.ws = null;
    this.currentSessionData = null;
    this.setupCompleted = false;

    // Concurrency guards
    this._isConnecting = false;

    // Resumption state
    this.latestValidResumptionHandle = null;
    this.sessionTerminatedAt = null;
    this.isAttemptingResumption = false;

    // Bound listeners for clean removal
    this._onOpenHandler = this._onOpen.bind(this);
    this._onMessageHandler = this._onMessage.bind(this);
    this._onErrorHandler = this._onError.bind(this);
    this._onCloseHandler = this._onClose.bind(this);
  }

  _setState(newState) {
    if (this.state === newState) return;
    const oldState = this.state;
    this.state = newState;
    if (typeof this.onStateChange === "function") {
      try {
        this.onStateChange(newState, oldState);
      } catch (err) {
        console.error("[LiveClient] Error in onStateChange callback:", err);
      }
    }
  }

  _emitError(code, message, originalError = null) {
    this._setState("error");
    const safeMessage = sanitizeSensitive(message);
    const safeError = originalError ? (typeof originalError.message === "string" ? new Error(sanitizeSensitive(originalError.message)) : originalError) : null;

    const errorPayload = {
      code,
      message: safeMessage,
      originalError: safeError,
      timestamp: Date.now(),
    };

    console.error(`[LiveClient] ${code}: ${safeMessage}`, safeError ? safeError.message || "" : "");
    if (typeof this.onError === "function") {
      try {
        this.onError(errorPayload);
      } catch (err) {
        console.error("[LiveClient] Error in onError callback:", err);
      }
    }
  }

  /**
   * Evaluates token validity (30-minute ceiling).
   */
  isTokenValid() {
    if (!this.currentSessionData || !this.currentSessionData.expiresAt) return false;
    return Date.now() < new Date(this.currentSessionData.expiresAt).getTime() - 10000; // 10s buffer
  }

  /**
   * Evaluates resumption handle validity (2 hours after previous termination).
   */
  isHandleValid() {
    if (!this.latestValidResumptionHandle || !this.sessionTerminatedAt) return false;
    return Date.now() - this.sessionTerminatedAt < RESUMPTION_HANDLE_TTL_MS;
  }

  /**
   * Establishes a new live session or reconnects using an existing valid handle.
   */
  async connect({ resume = false } = {}) {
    // Prevent duplicate or overlapping connect attempts
    if (this._isConnecting || this.state === "connected") {
      return;
    }

    this._isConnecting = true;
    this.isAttemptingResumption = false;

    try {
      // 1. Check resumption constraints if resume is requested
      if (resume) {
        if (!this.isHandleValid()) {
          this._emitError(
            "RESUMPTION_HANDLE_EXPIRED",
            "Your previous conversation session has expired (exceeded 2 hours). Please start a new session."
          );
          this._isConnecting = false;
          return;
        }
        this.isAttemptingResumption = true;
        this._setState("reconnecting");
      } else {
        // Starting fresh: clear previous resumption handles
        this.latestValidResumptionHandle = null;
        this.sessionTerminatedAt = null;
        this._setState("connecting");
      }

      // 2. Determine whether to reuse current ephemeral token or fetch a new one
      try {
        if (!this.isTokenValid() || !this.currentSessionData) {
          if (typeof this.sessionProvider !== "function") {
            throw new Error("No sessionProvider configured to initialize voice session.");
          }
          this.currentSessionData = await this.sessionProvider();
          if (!this.currentSessionData || !this.currentSessionData.token || !this.currentSessionData.wsUrl) {
            throw new Error("Invalid session data returned from server.");
          }
        }
      } catch (sessionErr) {
        this._emitError(
          "SESSION_INIT_FAILED",
          "Failed to initialize voice session credentials: " + (sessionErr.message || String(sessionErr)),
          sessionErr
        );
        this._isConnecting = false;
        return;
      }

      // 3. Open WebSocket connection
      try {
        this._teardownSocket();
        const wsUrl = this.currentSessionData.wsUrl;
        const WebSocketClass = (typeof window !== "undefined" && window.WebSocket) || global.WebSocket;
        if (!WebSocketClass) {
          throw new Error("WebSocket API is not supported in this environment.");
        }

        this.setupCompleted = false;
        this.ws = new WebSocketClass(wsUrl);

        this.ws.addEventListener("open", this._onOpenHandler);
        this.ws.addEventListener("message", this._onMessageHandler);
        this.ws.addEventListener("error", this._onErrorHandler);
        this.ws.addEventListener("close", this._onCloseHandler);
      } catch (wsErr) {
        this._emitError(
          "SOCKET_CONNECTION_FAILED",
          "Unable to establish WebSocket connection: " + (wsErr.message || String(wsErr)),
          wsErr
        );
        this._isConnecting = false;
      }
    } finally {
      this._isConnecting = false;
    }
  }

  _onOpen() {
    // Immediately transmit BidiGenerateContentSetup handshake
    try {
      const activeModel = this.currentSessionData?.model || "models/gemini-3.8-live";

      const setupPayload = {
        setup: {
          model: activeModel,
          generationConfig: {
            responseModalities: ["AUDIO"],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: {
                  voiceName: "Puck",
                },
              },
            },
          },
          systemInstruction: {
            parts: [
              {
                text: "You are Learning Allied voice tutor, a helpful, encouraging, and clear conversational tutor for students. Explain concepts step-by-step, answer student questions concisely, and encourage active learning.",
              },
            ],
          },
          sessionResumption: this.isAttemptingResumption && this.latestValidResumptionHandle
            ? { handle: this.latestValidResumptionHandle }
            : {},
          contextWindowCompression: {
            slidingWindow: {},
          },
        },
      };

      this.ws.send(JSON.stringify(setupPayload));
    } catch (handshakeErr) {
      this._emitError(
        "HANDSHAKE_SEND_FAILED",
        "Failed to transmit session setup handshake: " + handshakeErr.message,
        handshakeErr
      );
      this.disconnect();
    }
  }

  async _onMessage(event) {
    let rawText = "";
    if (typeof event.data === "string") {
      rawText = event.data;
    } else if (event.data instanceof ArrayBuffer) {
      rawText = new TextDecoder("utf-8").decode(event.data);
    } else if (typeof Blob !== "undefined" && event.data instanceof Blob) {
      rawText = await event.data.text();
    }

    if (!rawText) return;

    let msg;
    try {
      msg = JSON.parse(rawText);
    } catch (parseErr) {
      console.warn("[LiveClient] Non-JSON message received:", rawText.slice(0, 100));
      return;
    }

    // 1. Setup Complete
    if (msg.setupComplete) {
      this.setupCompleted = true;
      this._setState("connected");
      if (typeof this.onSetupComplete === "function") {
        try {
          this.onSetupComplete({
            resumed: this.isAttemptingResumption,
            handle: this.latestValidResumptionHandle,
          });
        } catch (_) {}
      }
      return;
    }

    // 2. Server Content (Audio / Text / Interruption / Turn Complete)
    if (msg.serverContent) {
      const sc = msg.serverContent;

      if (sc.interrupted && typeof this.onInterrupted === "function") {
        try {
          this.onInterrupted();
        } catch (_) {}
      }

      if (sc.modelTurn && typeof this.onServerContent === "function") {
        try {
          this.onServerContent(sc.modelTurn);
        } catch (_) {}
      }

      if (sc.turnComplete && typeof this.onTurnComplete === "function") {
        try {
          this.onTurnComplete();
        } catch (_) {}
      }
      return;
    }

    // 3. Session Resumption Update
    if (msg.sessionResumptionUpdate) {
      const sru = msg.sessionResumptionUpdate;
      // Requirement: Store a handle ONLY when resumable === true and newHandle is non-empty
      if (sru.resumable === true && typeof sru.newHandle === "string" && sru.newHandle.trim() !== "") {
        this.latestValidResumptionHandle = sru.newHandle.trim();
      }
      return;
    }

    // 4. GoAway Notification
    if (msg.goAway) {
      const timeLeft = msg.goAway.timeLeft || "unknown";
      if (typeof this.onGoAway === "function") {
        try {
          this.onGoAway({ timeLeft });
        } catch (_) {}
      }
      return;
    }

    // 5. Server Error
    if (msg.error) {
      // If resumption was rejected, fail closed and notify user
      if (this.isAttemptingResumption) {
        this.latestValidResumptionHandle = null; // Resumption failed; invalidate old handle
        this._emitError(
          "RESUMPTION_REJECTED",
          "Unable to resume the previous conversation session. Please start a new session.",
          msg.error
        );
      } else {
        this._emitError("SERVER_ERROR", msg.error.message || "Gemini Live API error", msg.error);
      }
      this.disconnect();
    }
  }

  _onError(event) {
    this._emitError("WEBSOCKET_ERROR", "WebSocket connection error encountered.", event);
  }

  _onClose(event) {
    this.sessionTerminatedAt = Date.now();
    const wasConnected = this.state === "connected";
    const wasAttemptingResumption = this.isAttemptingResumption;
    const hadCompletedSetup = this.setupCompleted;
    this.setupCompleted = false;

    // Clean up closing socket before notifying caller, allowing caller to initiate a new connection cleanly
    this._teardownSocket();

    // If socket closed while attempting resumption before setup was completed, fail closed
    if (wasAttemptingResumption && !hadCompletedSetup) {
      this.latestValidResumptionHandle = null;
      this._emitError(
        "RESUMPTION_REJECTED",
        "Unable to resume the previous conversation session. Connection closed during handshake."
      );
    } else if (this.state !== "error") {
      this._setState("disconnected");
    }

    if (typeof this.onClose === "function") {
      try {
        this.onClose({
          code: event ? event.code : 1000,
          reason: event ? sanitizeSensitive(event.reason) : "",
          wasConnected,
          canResume: this.isHandleValid(),
          isAbnormal: event ? event.code !== 1000 : false,
        });
      } catch (_) {}
    }
  }

  /**
   * Streams a chunk of 16kHz Little-Endian PCM audio (base64 encoded) to Gemini.
   */
  sendRealtimeAudio(base64Audio) {
    if (this.state !== "connected" || !this.setupCompleted || !this.ws || this.ws.readyState !== 1) {
      return false;
    }
    if (!base64Audio || typeof base64Audio !== "string") {
      return false;
    }

    const payload = {
      realtimeInput: {
        audio: {
          mimeType: "audio/pcm;rate=16000",
          data: base64Audio,
        },
      },
    };

    try {
      this.ws.send(JSON.stringify(payload));
      return true;
    } catch (sendErr) {
      console.error("[LiveClient] Failed to send audio chunk:", sendErr);
      return false;
    }
  }

  _teardownSocket() {
    if (this.ws) {
      try {
        this.ws.removeEventListener("open", this._onOpenHandler);
        this.ws.removeEventListener("message", this._onMessageHandler);
        this.ws.removeEventListener("error", this._onErrorHandler);
        this.ws.removeEventListener("close", this._onCloseHandler);
        if (this.ws.readyState === 0 || this.ws.readyState === 1) {
          this.ws.close(1000, "Normal Closure");
        }
      } catch (_) {}
      this.ws = null;
    }
  }

  /**
   * Safely disconnects and releases all connection resources.
   */
  disconnect() {
    this.setupCompleted = false;
    this.sessionTerminatedAt = Date.now();
    this._teardownSocket();
    if (this.state !== "error") {
      this._setState("disconnected");
    }
  }
}

// Support both ES module and browser global environments
if (typeof window !== "undefined") {
  window.GeminiLiveClient = GeminiLiveClient;
  window.sanitizeSensitive = sanitizeSensitive;
}

export { GeminiLiveClient, RESUMPTION_HANDLE_TTL_MS, sanitizeSensitive };
export default GeminiLiveClient;
