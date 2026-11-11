/**
 * Learning Allied — Real-Time Gemini Live Voice Engine
 *
 * Implements bidirectional real-time audio communication with Gemini Live API
 * using ephemeral session tokens and the official @google/genai SDK.
 *
 * Key features:
 *  - Robust microphone permission handling with clear error categorization.
 *  - Resampling to 16kHz 16-bit PCM (little-endian mono) for Gemini input.
 *  - Gapless audio queue management for 24kHz PCM Gemini speech response.
 *  - Instant barge-in / interruption handling (flushes playback queue).
 *  - Real-time live transcript capture (user input & model turns).
 *  - Safe mute / unmute state toggling.
 *  - Automatic session timeout guard to prevent accidental quota waste.
 *  - Thorough cleanup of tracks, audio nodes, contexts, and WebSockets.
 */

import { GoogleGenAI } from "@google/genai";

export const VOICE_STATE = {
  IDLE: "idle",
  REQUESTING_PERMISSION: "requesting-permission",
  CONNECTING: "connecting",
  LISTENING: "listening",
  SPEAKING: "speaking",
  INTERRUPTED: "interrupted",
  MUTED: "muted",
  ERROR: "error",
  ENDED: "ended",
};

/**
 * Downsamples Float32Array audio buffer to 16,000 Hz.
 */
function downsampleTo16k(inputBuffer, inputSampleRate) {
  if (inputSampleRate === 16000) return inputBuffer;
  const ratio = inputSampleRate / 16000;
  const outputLength = Math.round(inputBuffer.length / ratio);
  const result = new Float32Array(outputLength);
  let offsetResult = 0;
  let offsetInput = 0;
  while (offsetResult < outputLength) {
    const nextOffsetInput = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetInput; i < nextOffsetInput && i < inputBuffer.length; i++) {
      accum += inputBuffer[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : inputBuffer[offsetInput] || 0;
    offsetResult++;
    offsetInput = nextOffsetInput;
  }
  return result;
}

/**
 * Converts Float32Array (-1.0 to 1.0) into ArrayBuffer containing 16-bit signed PCM (little-endian).
 */
function floatTo16BitPCM(floatSamples) {
  const buffer = new ArrayBuffer(floatSamples.length * 2);
  const view = new DataView(buffer);
  for (let i = 0; i < floatSamples.length; i++) {
    const s = Math.max(-1, Math.min(1, floatSamples[i]));
    view.setInt16(i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
  return buffer;
}

/**
 * Converts ArrayBuffer to standard base64 string.
 */
function arrayBufferToBase64(buffer) {
  let binary = "";
  const bytes = new Uint8Array(buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

/**
 * Converts incoming base64 PCM 16-bit to Float32Array for AudioBuffer playback.
 */
function base64PCMToFloat32(base64Str) {
  const binaryStr = window.atob(base64Str);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  const dataView = new DataView(bytes.buffer);
  const samplesCount = Math.floor(len / 2);
  const float32 = new Float32Array(samplesCount);
  for (let i = 0; i < samplesCount; i++) {
    const int16 = dataView.getInt16(i * 2, true); // little-endian
    float32[i] = int16 / 32768.0;
  }
  return float32;
}

export function createVoiceEngine(options = {}) {
  const {
    onStateChange = () => {},
    onTranscript = () => {},
    onTurnComplete = () => {},
    onError = () => {},
    onVolume = () => {},
  } = options;

  let state = VOICE_STATE.IDLE;
  let session = null;
  let mediaStream = null;
  let inputAudioCtx = null;
  let outputAudioCtx = null;
  let sourceNode = null;
  let processorNode = null;
  let isMuted = false;
  let nextPlayTime = 0;
  const scheduledSources = [];
  let sessionTimer = null;
  let currentModelTurnText = "";
  let disposed = false;

  function setState(nextState) {
    if (disposed && nextState !== VOICE_STATE.ENDED) return;
    state = nextState;
    try {
      onStateChange(state);
    } catch (err) {
      console.error("[voice-engine] onStateChange error:", err);
    }
  }

  function stopPlayback() {
    for (const src of scheduledSources) {
      try {
        src.stop();
        src.disconnect();
      } catch (_) {
        /* already stopped */
      }
    }
    scheduledSources.length = 0;
    if (outputAudioCtx) {
      nextPlayTime = outputAudioCtx.currentTime;
    }
  }

  /**
   * Initializes microphone capture and connects to AudioContext.
   */
  async function setupMicrophone() {
    setState(VOICE_STATE.REQUESTING_PERMISSION);

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error("Microphone access is not supported by your browser.");
    }

    try {
      mediaStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
        throw new Error("Microphone permission denied. Please allow microphone access to talk to the tutor.");
      }
      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        throw new Error("No microphone found on your device. Please connect a microphone and try again.");
      }
      throw new Error(`Microphone initialization error: ${err.message || "Could not access audio device."}`);
    }

    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) {
      throw new Error("Web Audio API is not supported in this browser.");
    }

    inputAudioCtx = new AudioContextClass();
    outputAudioCtx = new AudioContextClass({ sampleRate: 24000 });

    if (inputAudioCtx.state === "suspended") {
      await inputAudioCtx.resume();
    }
    if (outputAudioCtx.state === "suspended") {
      await outputAudioCtx.resume();
    }

    sourceNode = inputAudioCtx.createMediaStreamSource(mediaStream);

    // 4096 samples provides ~85ms buffer at 48kHz, suitable for low latency streaming
    processorNode = inputAudioCtx.createScriptProcessor(4096, 1, 1);

    processorNode.onaudioprocess = (e) => {
      if (!session || state === VOICE_STATE.MUTED || isMuted || disposed) return;

      const inputData = e.inputBuffer.getChannelData(0);

      // Compute volume for live waveform indicator
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      onVolume(Math.min(1, rms * 4));

      // Downsample to 16,000 Hz for Gemini Live Audio format
      const resampled = downsampleTo16k(inputData, inputAudioCtx.sampleRate);
      const pcm16Buffer = floatTo16BitPCM(resampled);
      const base64Audio = arrayBufferToBase64(pcm16Buffer);

      try {
        session.sendRealtimeInput({
          media: {
            mimeType: "audio/pcm;rate=16000",
            data: base64Audio,
          },
        });
      } catch (err) {
        console.warn("[voice-engine] Failed to send audio chunk:", err);
      }
    };

    sourceNode.connect(processorNode);

    // Keep processor node connected to a muted gain to keep audio flowing through pipeline
    const silentGain = inputAudioCtx.createGain();
    silentGain.gain.value = 0;
    processorNode.connect(silentGain);
    silentGain.connect(inputAudioCtx.destination);
  }

  /**
   * Enqueues an audio chunk from Gemini for smooth playback.
   */
  function enqueuePlayback(float32Samples) {
    if (!outputAudioCtx || disposed) return;

    if (outputAudioCtx.state === "suspended") {
      outputAudioCtx.resume().catch(() => {});
    }

    const buffer = outputAudioCtx.createBuffer(1, float32Samples.length, 24000);
    buffer.getChannelData(0).set(float32Samples);

    const source = outputAudioCtx.createBufferSource();
    source.buffer = buffer;
    source.connect(outputAudioCtx.destination);

    const currentTime = outputAudioCtx.currentTime;
    const startTime = Math.max(currentTime, nextPlayTime);
    source.start(startTime);
    nextPlayTime = startTime + buffer.duration;

    scheduledSources.push(source);

    if (state !== VOICE_STATE.SPEAKING) {
      setState(VOICE_STATE.SPEAKING);
    }

    source.onended = () => {
      const idx = scheduledSources.indexOf(source);
      if (idx !== -1) scheduledSources.splice(idx, 1);
      if (scheduledSources.length === 0 && state === VOICE_STATE.SPEAKING) {
        setState(isMuted ? VOICE_STATE.MUTED : VOICE_STATE.LISTENING);
      }
    };
  }

  /**
   * Handles incoming message from Gemini Live WebSocket.
   */
  function handleLiveMessage(msg) {
    if (disposed) return;

    const serverContent = msg.serverContent;
    if (!serverContent) return;

    // 1. Check for barge-in / interruption
    if (serverContent.interrupted) {
      stopPlayback();
      currentModelTurnText = "";
      setState(isMuted ? VOICE_STATE.MUTED : VOICE_STATE.LISTENING);
      return;
    }

    // 2. Check for model turns (Audio or Text)
    const modelTurn = serverContent.modelTurn;
    if (modelTurn && Array.isArray(modelTurn.parts)) {
      for (const part of modelTurn.parts) {
        // Audio output chunk
        if (part.inlineData && part.inlineData.data) {
          const samples = base64PCMToFloat32(part.inlineData.data);
          enqueuePlayback(samples);
        }

        // Live transcript text
        if (part.text) {
          currentModelTurnText += part.text;
          onTranscript({
            role: "assistant",
            text: currentModelTurnText,
            isFinal: false,
          });
        }
      }
    }

    // 3. Turn complete
    if (serverContent.turnComplete) {
      const finishedText = currentModelTurnText.trim();
      currentModelTurnText = "";
      if (finishedText) {
        onTurnComplete({
          role: "assistant",
          text: finishedText,
        });
      }
    }
  }

  /**
   * Starts a live session using an ephemeral token.
   */
  async function start(tokenConfig) {
    if (!tokenConfig || !tokenConfig.token) {
      throw new Error("Missing ephemeral token for voice session.");
    }

    disposed = false;
    currentModelTurnText = "";
    nextPlayTime = 0;
    isMuted = false;

    try {
      await setupMicrophone();

      setState(VOICE_STATE.CONNECTING);

      const ai = new GoogleGenAI({
        apiKey: tokenConfig.token,
        httpOptions: { apiVersion: "v1alpha" },
      });

      const model = tokenConfig.model || "models/gemini-2.5-flash-native-audio-preview-12-2025";

      session = await ai.live.connect({
        model,
        callbacks: {
          onopen: () => {
            if (disposed) return;
            setState(VOICE_STATE.LISTENING);
          },
          onmessage: (msg) => {
            handleLiveMessage(msg);
          },
          onerror: (err) => {
            console.error("[voice-engine] WebSocket connection error:", err);
            onError(new Error("Voice connection error. Please retry."));
            stop();
          },
          onclose: (e) => {
            if (!disposed && state !== VOICE_STATE.ENDED) {
              setState(VOICE_STATE.ENDED);
            }
          },
        },
      });

      // Auto-terminate timer to prevent runaway session costs
      const maxDuration = (tokenConfig.maxDurationSeconds || 900) * 1000;
      sessionTimer = setTimeout(() => {
        onError(new Error("Voice session reached maximum duration limit (15 min). Ending session."));
        stop();
      }, maxDuration);
    } catch (err) {
      stop();
      setState(VOICE_STATE.ERROR);
      throw err;
    }
  }

  /**
   * Interrupts the AI speaker immediately (barge-in).
   */
  function interrupt() {
    stopPlayback();
    currentModelTurnText = "";
    if (state === VOICE_STATE.SPEAKING) {
      setState(isMuted ? VOICE_STATE.MUTED : VOICE_STATE.LISTENING);
    }
  }

  /**
   * Toggles microphone mute state.
   */
  function toggleMute() {
    isMuted = !isMuted;
    if (mediaStream) {
      for (const track of mediaStream.getAudioTracks()) {
        track.enabled = !isMuted;
      }
    }
    if (isMuted) {
      setState(VOICE_STATE.MUTED);
    } else {
      setState(scheduledSources.length > 0 ? VOICE_STATE.SPEAKING : VOICE_STATE.LISTENING);
    }
    return isMuted;
  }

  /**
   * Stops the voice session and completely cleans up all audio resources.
   */
  function stop() {
    disposed = true;
    if (sessionTimer) {
      clearTimeout(sessionTimer);
      sessionTimer = null;
    }

    stopPlayback();

    if (mediaStream) {
      for (const track of mediaStream.getTracks()) {
        try {
          track.stop();
        } catch (_) {}
      }
      mediaStream = null;
    }

    if (sourceNode) {
      try {
        sourceNode.disconnect();
      } catch (_) {}
      sourceNode = null;
    }

    if (processorNode) {
      try {
        processorNode.disconnect();
      } catch (_) {}
      processorNode = null;
    }

    if (inputAudioCtx && inputAudioCtx.state !== "closed") {
      inputAudioCtx.close().catch(() => {});
      inputAudioCtx = null;
    }

    if (outputAudioCtx && outputAudioCtx.state !== "closed") {
      outputAudioCtx.close().catch(() => {});
      outputAudioCtx = null;
    }

    if (session) {
      try {
        session.close();
      } catch (_) {}
      session = null;
    }

    setState(VOICE_STATE.ENDED);
  }

  return {
    start,
    stop,
    interrupt,
    toggleMute,
    getState: () => state,
    isMuted: () => isMuted,
  };
}
