// vanilla/voice/voice-ui.js
// Modern, Apple+Craft styled UI for Learning Allied Gemini Live Voice.
// Integrates VoiceSessionCoordinator with full visual controls:
// - Start / End Voice
// - Live status badge (Connecting, Listening, Speaking, Muted, Error)
// - Waveform / Pulse orb visualizer
// - Mute / Unmute toggle
// - Clear microphone permission and connection failure banners
// - Complete isolation from text chat and normal messaging

import { VoiceSessionCoordinator } from "./voice-session.js";

const VOICE_UI_STYLES = `
/* ─── Gemini Live Voice UI ─────────────────────────────────────── */
.voice-btn {
  width: 38px;
  height: 38px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
  border: 1px solid var(--border-strong, #404040);
  background: transparent;
  color: var(--text-muted, #a3a3a3);
  transition: all var(--dur-fast, 0.15s) var(--ease-out, ease);
  position: relative;
}
.voice-btn:hover {
  color: var(--text-primary, #ffffff);
  border-color: var(--border-hover, #525252);
  background: var(--bg-hover, #1a1a1a);
}
.voice-btn.active {
  color: #ffffff;
  border-color: var(--accent, #3b82f6);
  background: var(--accent, #3b82f6);
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.4);
}
.voice-btn.active .voice-btn-pulse {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #10b981;
  box-shadow: 0 0 6px #10b981;
  animation: voicePulse 1.5s infinite;
}

/* ─── Floating Voice Modal / Sheet ────────────────────────────── */
.voice-overlay {
  position: fixed;
  inset: 0;
  z-index: 10000;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.72);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  padding: 20px;
}
.voice-overlay.visible {
  opacity: 1;
  pointer-events: auto;
}

.voice-card {
  width: 100%;
  max-width: 440px;
  background: var(--bg-card, #0a0a0a);
  border: 1px solid var(--border, #262626);
  border-radius: 24px;
  padding: 32px 28px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  box-shadow: 0 24px 64px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.04);
  transform: scale(0.95) translateY(12px);
  transition: transform 0.28s cubic-bezier(0.16, 1, 0.3, 1);
  position: relative;
}
.voice-overlay.visible .voice-card {
  transform: scale(1) translateY(0);
}

.voice-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  margin-bottom: 24px;
}
.voice-pill {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 4px 12px;
  background: var(--bg-elevated, #111111);
  border: 1px solid var(--border, #262626);
  border-radius: 999px;
  font-size: 12px;
  font-weight: 500;
  color: var(--text-secondary, #a3a3a3);
  letter-spacing: -0.01em;
}
.voice-pill-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: var(--text-muted, #737373);
  transition: background 0.2s ease, box-shadow 0.2s ease;
}
.voice-pill.connecting .voice-pill-dot {
  background: #f59e0b;
  box-shadow: 0 0 6px #f59e0b;
  animation: voiceBlink 1s infinite;
}
.voice-pill.listening .voice-pill-dot {
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}
.voice-pill.speaking .voice-pill-dot {
  background: var(--accent, #3b82f6);
  box-shadow: 0 0 8px var(--accent, #3b82f6);
}
.voice-pill.muted .voice-pill-dot {
  background: #ef4444;
}

.voice-close-mini {
  background: transparent;
  border: none;
  color: var(--text-muted, #737373);
  cursor: pointer;
  padding: 6px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s ease;
}
.voice-close-mini:hover {
  color: var(--text-primary, #ffffff);
  background: var(--bg-hover, #1a1a1a);
}

/* ─── Visualizer / Orb ────────────────────────────────────────── */
.voice-visualizer {
  position: relative;
  width: 140px;
  height: 140px;
  margin: 12px 0 24px;
  display: flex;
  align-items: center;
  justify-content: center;
}
.voice-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid rgba(59, 130, 246, 0.2);
  transition: all 0.3s ease;
}
.voice-card.listening .voice-ring {
  border-color: rgba(16, 185, 129, 0.35);
  animation: voicePulseRing 2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
}
.voice-card.speaking .voice-ring {
  border-color: rgba(59, 130, 246, 0.45);
  animation: voicePulseRing 1.2s cubic-bezier(0.215, 0.61, 0.355, 1) infinite;
}

.voice-orb {
  width: 90px;
  height: 90px;
  border-radius: 50%;
  background: radial-gradient(circle at 35% 35%, #1e293b, #090d16);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 2px 8px rgba(255, 255, 255, 0.08), 0 8px 24px rgba(0, 0, 0, 0.6);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.35s ease;
  z-index: 1;
}
.voice-card.connecting .voice-orb {
  border-color: rgba(245, 158, 11, 0.4);
  box-shadow: 0 0 24px rgba(245, 158, 11, 0.25);
}
.voice-card.listening .voice-orb {
  background: radial-gradient(circle at 35% 35%, #064e3b, #022c22);
  border-color: rgba(16, 185, 129, 0.5);
  box-shadow: 0 0 28px rgba(16, 185, 129, 0.3);
}
.voice-card.speaking .voice-orb {
  background: radial-gradient(circle at 35% 35%, #1d4ed8, #0f172a);
  border-color: rgba(59, 130, 246, 0.6);
  box-shadow: 0 0 36px rgba(59, 130, 246, 0.4);
}
.voice-card.muted .voice-orb {
  background: radial-gradient(circle at 35% 35%, #450a0a, #1c0505);
  border-color: rgba(239, 68, 68, 0.4);
  box-shadow: 0 0 20px rgba(239, 68, 68, 0.2);
}

.voice-wave-bars {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 36px;
}
.voice-wave-bar {
  width: 4px;
  height: 8px;
  background: #ffffff;
  border-radius: 4px;
  transition: height 0.15s ease, background 0.2s ease;
}
.voice-card.speaking .voice-wave-bar {
  background: #ffffff;
  animation: voiceWave 0.9s ease-in-out infinite alternate;
}
.voice-card.speaking .voice-wave-bar:nth-child(1) { animation-delay: 0.1s; }
.voice-card.speaking .voice-wave-bar:nth-child(2) { animation-delay: 0.3s; }
.voice-card.speaking .voice-wave-bar:nth-child(3) { animation-delay: 0.5s; }
.voice-card.speaking .voice-wave-bar:nth-child(4) { animation-delay: 0.2s; }
.voice-card.speaking .voice-wave-bar:nth-child(5) { animation-delay: 0.4s; }

/* ─── State Info ──────────────────────────────────────────────── */
.voice-status-title {
  font-family: var(--font-display, inherit);
  font-size: 18px;
  font-weight: 600;
  color: var(--text-primary, #ffffff);
  margin-bottom: 6px;
  letter-spacing: -0.02em;
}
.voice-status-caption {
  font-size: 13.5px;
  color: var(--text-secondary, #a3a3a3);
  max-width: 320px;
  line-height: 1.5;
  margin-bottom: 24px;
}

/* ─── Error Notification ──────────────────────────────────────── */
.voice-error-box {
  display: none;
  width: 100%;
  margin-bottom: 20px;
  padding: 12px 14px;
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 12px;
  font-size: 13px;
  color: #fca5a5;
  text-align: left;
  line-height: 1.45;
}
.voice-error-box.visible {
  display: block;
}
.voice-error-title {
  font-weight: 600;
  color: #ef4444;
  margin-bottom: 3px;
}

/* ─── Actions Bar ─────────────────────────────────────────────── */
.voice-actions {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  width: 100%;
}
.voice-action-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  height: 44px;
  padding: 0 20px;
  border-radius: 999px;
  font-size: 13.5px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
  font-family: var(--font-main, inherit);
}
.voice-action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.voice-mute-btn {
  background: var(--bg-elevated, #111111);
  border: 1px solid var(--border-strong, #404040);
  color: var(--text-primary, #ffffff);
}
.voice-mute-btn:hover:not(:disabled) {
  background: var(--bg-hover, #1a1a1a);
  border-color: var(--border-hover, #525252);
}
.voice-mute-btn.is-muted {
  background: rgba(239, 68, 68, 0.15);
  border-color: #ef4444;
  color: #ef4444;
}

.voice-end-btn {
  background: #ef4444;
  border: 1px solid transparent;
  color: #ffffff;
}
.voice-end-btn:hover:not(:disabled) {
  background: #dc2626;
  transform: translateY(-1px);
}
.voice-end-btn:active:not(:disabled) {
  transform: translateY(0);
}

.voice-retry-btn {
  display: none;
  background: var(--pill-bg, #ffffff);
  border: 1px solid transparent;
  color: var(--pill-fg, #000000);
}
.voice-retry-btn.visible {
  display: inline-flex;
}
.voice-retry-btn:hover:not(:disabled) {
  opacity: 0.9;
}

/* ─── Animations ──────────────────────────────────────────────── */
@keyframes voicePulse {
  0% { transform: scale(0.95); opacity: 0.9; }
  50% { transform: scale(1.2); opacity: 1; }
  100% { transform: scale(0.95); opacity: 0.9; }
}
@keyframes voiceBlink {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.3; }
}
@keyframes voicePulseRing {
  0% { transform: scale(0.95); opacity: 0.8; }
  50% { transform: scale(1.35); opacity: 0; }
  100% { transform: scale(0.95); opacity: 0; }
}
@keyframes voiceWave {
  0% { height: 6px; }
  100% { height: 32px; }
}
`;

class VoiceUI {
  constructor({
    getAuthHeaders = null,
    apiBase = "",
    triggerButtonId = "voiceBtn",
  } = {}) {
    this.getAuthHeaders = getAuthHeaders;
    this.apiBase = apiBase;
    this.triggerButtonId = triggerButtonId;

    this.coordinator = null;
    this.elements = {};
    this.isOverlayOpen = false;

    this._initCoordinator();
  }

  _initCoordinator() {
    this.coordinator = new VoiceSessionCoordinator({
      getAuthHeaders: this.getAuthHeaders,
      apiBase: this.apiBase,
      onStateChange: (state, details) => {
        this._handleStateChange(state, details);
      },
    });
  }

  mount() {
    if (typeof document === "undefined") return;

    // Inject styles once
    if (!document.getElementById("learning-allied-voice-styles")) {
      const styleEl = document.createElement("style");
      styleEl.id = "learning-allied-voice-styles";
      styleEl.textContent = VOICE_UI_STYLES;
      document.head.appendChild(styleEl);
    }

    // Bind trigger button
    const trigger = document.getElementById(this.triggerButtonId);
    if (trigger) {
      trigger.addEventListener("click", () => this.handleTriggerClick());
      this.elements.triggerBtn = trigger;
    }

    // Build or attach overlay
    this._buildOverlay();
  }

  _buildOverlay() {
    if (document.getElementById("voiceOverlay")) {
      this._bindExistingOverlay();
      return;
    }

    const overlay = document.createElement("div");
    overlay.id = "voiceOverlay";
    overlay.className = "voice-overlay";
    overlay.setAttribute("role", "dialog");
    overlay.setAttribute("aria-modal", "true");
    overlay.setAttribute("aria-label", "Gemini Live Voice Conversation");

    overlay.innerHTML = `
      <div class="voice-card" id="voiceCard">
        <div class="voice-header">
          <div class="voice-pill" id="voicePill">
            <span class="voice-pill-dot" id="voicePillDot"></span>
            <span id="voicePillText">Gemini Live</span>
          </div>
          <button class="voice-close-mini" id="voiceCloseMini" type="button" aria-label="Minimize voice panel">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div class="voice-visualizer">
          <div class="voice-ring"></div>
          <div class="voice-orb">
            <div class="voice-wave-bars">
              <span class="voice-wave-bar"></span>
              <span class="voice-wave-bar"></span>
              <span class="voice-wave-bar"></span>
              <span class="voice-wave-bar"></span>
              <span class="voice-wave-bar"></span>
            </div>
          </div>
        </div>

        <div class="voice-status-title" id="voiceStatusTitle">Connecting...</div>
        <div class="voice-status-caption" id="voiceStatusCaption">Starting your real-time voice tutor session...</div>

        <div class="voice-error-box" id="voiceErrorBox">
          <div class="voice-error-title" id="voiceErrorTitle">Microphone Access Required</div>
          <div id="voiceErrorMessage">Please allow microphone access in your browser to speak with your AI tutor.</div>
        </div>

        <div class="voice-actions">
          <button class="voice-action-btn voice-mute-btn" id="voiceMuteToggle" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" x2="12" y1="19" y2="22"/></svg>
            <span id="voiceMuteLabel">Mute</span>
          </button>

          <button class="voice-action-btn voice-retry-btn" id="voiceRetryBtn" type="button">
            Retry
          </button>

          <button class="voice-action-btn voice-end-btn" id="voiceEndBtn" type="button">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.68 13.31a16 16 0 0 0 3.41 2.6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7 2 2 0 0 1 1.72 2v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.42 19.42 0 0 1-3.33-2.67m-2.67-3.34a19.79 19.79 0 0 1-3.07-8.63A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91"/><line x1="22" x2="2" y1="2" y2="22"/></svg>
            <span>End Voice</span>
          </button>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);
    this._bindExistingOverlay();
  }

  _bindExistingOverlay() {
    this.elements.overlay = document.getElementById("voiceOverlay");
    this.elements.card = document.getElementById("voiceCard");
    this.elements.pill = document.getElementById("voicePill");
    this.elements.pillDot = document.getElementById("voicePillDot");
    this.elements.pillText = document.getElementById("voicePillText");
    this.elements.statusTitle = document.getElementById("voiceStatusTitle");
    this.elements.statusCaption = document.getElementById("voiceStatusCaption");
    this.elements.errorBox = document.getElementById("voiceErrorBox");
    this.elements.errorTitle = document.getElementById("voiceErrorTitle");
    this.elements.errorMessage = document.getElementById("voiceErrorMessage");
    this.elements.muteBtn = document.getElementById("voiceMuteToggle");
    this.elements.muteLabel = document.getElementById("voiceMuteLabel");
    this.elements.retryBtn = document.getElementById("voiceRetryBtn");
    this.elements.endBtn = document.getElementById("voiceEndBtn");
    this.elements.closeMini = document.getElementById("voiceCloseMini");

    this.elements.muteBtn?.addEventListener("click", () => this.toggleMute());
    this.elements.retryBtn?.addEventListener("click", () => this.start());
    this.elements.endBtn?.addEventListener("click", () => this.stop());
    this.elements.closeMini?.addEventListener("click", () => this.hideOverlay());

    // Dismiss on clicking overlay backdrop
    this.elements.overlay?.addEventListener("click", (e) => {
      if (e.target === this.elements.overlay) {
        this.hideOverlay();
      }
    });
  }

  async handleTriggerClick() {
    if (this.coordinator.state === "idle" || this.coordinator.state === "error") {
      await this.start();
    } else {
      if (this.isOverlayOpen) {
        this.hideOverlay();
      } else {
        this.showOverlay();
      }
    }
  }

  showOverlay() {
    if (this.elements.overlay) {
      this.elements.overlay.classList.add("visible");
      this.isOverlayOpen = true;
    }
  }

  hideOverlay() {
    if (this.elements.overlay) {
      this.elements.overlay.classList.remove("visible");
      this.isOverlayOpen = false;
    }
  }

  async start() {
    this.showOverlay();
    this._resetError();
    await this.coordinator.start();
  }

  async stop() {
    await this.coordinator.stop();
    this.hideOverlay();
  }

  toggleMute() {
    this.coordinator.toggleMute();
  }

  _resetError() {
    if (this.elements.errorBox) {
      this.elements.errorBox.classList.remove("visible");
    }
    if (this.elements.retryBtn) {
      this.elements.retryBtn.classList.remove("visible");
    }
  }

  _handleStateChange(state, details = {}) {
    const { card, pill, pillText, statusTitle, statusCaption, triggerBtn, muteBtn, muteLabel, errorBox, errorTitle, errorMessage, retryBtn } = this.elements;

    // Synchronize Trigger Button
    if (triggerBtn) {
      const isActive = (state === "connecting" || state === "listening" || state === "speaking" || state === "muted");
      triggerBtn.classList.toggle("active", isActive);
      triggerBtn.setAttribute("aria-pressed", isActive ? "true" : "false");
    }

    if (!card) return;

    // Handle warning banner updates without state reset
    if (details.warning === "SESSION_EXPIRING") {
      if (statusCaption) statusCaption.textContent = details.message || "Session limit approaching. Reconnecting seamlessly...";
      return;
    }

    // Reset card classes
    card.classList.remove("connecting", "listening", "speaking", "muted", "error");
    if (pill) pill.className = "voice-pill";

    switch (state) {
      case "connecting":
        card.classList.add("connecting");
        if (pill) pill.classList.add("connecting");
        if (pillText) pillText.textContent = "Connecting";
        if (statusTitle) statusTitle.textContent = "Connecting to Gemini Live...";
        if (statusCaption) statusCaption.textContent = details.message || "Establishing real-time bidirectional connection...";
        if (muteBtn) muteBtn.disabled = true;
        this._resetError();
        break;

      case "listening":
        card.classList.add("listening");
        if (pill) pill.classList.add("listening");
        if (pillText) pillText.textContent = "Listening";
        if (statusTitle) statusTitle.textContent = "Tutor is listening...";
        if (statusCaption) statusCaption.textContent = details.message || "Speak naturally. Interrupt anytime by speaking over the tutor.";
        if (muteBtn) {
          muteBtn.disabled = false;
          muteBtn.classList.remove("is-muted");
        }
        if (muteLabel) muteLabel.textContent = "Mute";
        this._resetError();
        break;

      case "speaking":
        card.classList.add("speaking");
        if (pill) pill.classList.add("speaking");
        if (pillText) pillText.textContent = "Speaking";
        if (statusTitle) statusTitle.textContent = "Tutor is speaking...";
        if (statusCaption) statusCaption.textContent = "Tap Mute or speak to interrupt.";
        if (muteBtn) {
          muteBtn.disabled = false;
          muteBtn.classList.remove("is-muted");
        }
        if (muteLabel) muteLabel.textContent = "Mute";
        this._resetError();
        break;

      case "muted":
        card.classList.add("muted");
        if (pill) pill.classList.add("muted");
        if (pillText) pillText.textContent = "Muted";
        if (statusTitle) statusTitle.textContent = "Microphone Muted";
        if (statusCaption) statusCaption.textContent = "Your tutor cannot hear you. Click Unmute to speak.";
        if (muteBtn) {
          muteBtn.disabled = false;
          muteBtn.classList.add("is-muted");
        }
        if (muteLabel) muteLabel.textContent = "Unmute";
        break;

      case "error":
        card.classList.add("error");
        if (pillText) pillText.textContent = "Connection Error";
        if (statusTitle) statusTitle.textContent = "Voice Session Stopped";
        if (statusCaption) statusCaption.textContent = "We encountered an issue with your voice connection.";
        if (muteBtn) muteBtn.disabled = true;

        if (errorBox) {
          errorBox.classList.add("visible");
          if (details.code === "PERMISSION_DENIED" || details.code === "MIC_ERROR") {
            if (errorTitle) errorTitle.textContent = "Microphone Access Required";
            if (errorMessage) errorMessage.textContent = details.message || "Microphone permission was denied. Please allow microphone permissions in your browser and try again.";
          } else if (details.code === "DEVICE_DISCONNECTED") {
            if (errorTitle) errorTitle.textContent = "Microphone Disconnected";
            if (errorMessage) errorMessage.textContent = details.message || "Your microphone was disconnected during the session. Please reconnect it and click Retry.";
          } else if (details.code === "RESUMPTION_REJECTED" || details.code === "RESUMPTION_HANDLE_EXPIRED") {
            if (errorTitle) errorTitle.textContent = "Session Expired";
            if (errorMessage) errorMessage.textContent = details.message || "Previous conversation could not be resumed. Click Retry to start a fresh conversation.";
          } else {
            if (errorTitle) errorTitle.textContent = "Connection Failed";
            if (errorMessage) errorMessage.textContent = details.message || "Failed to establish a live connection to the voice tutor.";
          }
        }
        if (retryBtn) retryBtn.classList.add("visible");
        break;

      case "idle":
      default:
        if (pillText) pillText.textContent = "Gemini Live";
        if (statusTitle) statusTitle.textContent = "Ready to start";
        if (statusCaption) statusCaption.textContent = "Start real-time voice conversation with your tutor.";
        if (muteBtn) {
          muteBtn.disabled = true;
          muteBtn.classList.remove("is-muted");
        }
        if (muteLabel) muteLabel.textContent = "Mute";
        this._resetError();
        break;
    }
  }
}

// Support ES module and browser global environments
if (typeof window !== "undefined") {
  window.VoiceUI = VoiceUI;
}

export { VoiceUI };
export default VoiceUI;
