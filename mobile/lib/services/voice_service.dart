import 'dart:async';
import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:flutter_pcm_sound/flutter_pcm_sound.dart';
import 'package:record/record.dart';
import 'learning_service.dart';
import 'ws_connector.dart';

enum VoiceSessionState {
  idle,
  connecting,
  listening,
  speaking,
  muted,
  error,
}

/// Native Gemini Live voice tutor coordinator:
/// - Obtains ephemeral v1alpha token from `/api/voice-session`
/// - Performs `BidiGenerateContentSetup` handshake over WebSocket
/// - Streams 16 kHz mono 16-bit PCM microphone audio (`realtimeInput.audio`)
/// - Plays 24 kHz mono 16-bit PCM model audio via `FlutterPcmSound`
class VoiceSessionService extends ChangeNotifier {
  final LearningService svc;

  VoiceSessionState _state = VoiceSessionState.idle;
  String _statusMessage = 'Ready to connect';
  String? _model;
  bool _muted = false;
  bool _setupComplete = false;

  SimpleWebSocket? _ws;
  StreamSubscription<dynamic>? _wsSub;
  final AudioRecorder _recorder = AudioRecorder();
  StreamSubscription<Uint8List>? _micSub;
  bool _pcmInitialized = false;

  VoiceSessionService(this.svc);

  VoiceSessionState get state => _state;
  String get statusMessage => _statusMessage;
  String? get model => _model;
  bool get isMuted => _muted;

  void _setState(VoiceSessionState s, String msg) {
    _state = s;
    _statusMessage = msg;
    notifyListeners();
  }

  Future<void> start() async {
    if (_state == VoiceSessionState.connecting ||
        _state == VoiceSessionState.listening ||
        _state == VoiceSessionState.speaking) {
      return;
    }

    _setState(VoiceSessionState.connecting, 'Requesting voice session...');
    try {
      final hasPerm = await _recorder.hasPermission();
      if (!hasPerm) {
        _setState(VoiceSessionState.error, 'Microphone permission is required for voice mode.');
        return;
      }

      final session = await svc.createVoiceSession();
      final wsUrl = (session['wsUrl'] ?? '').toString();
      final token = (session['token'] ?? '').toString();
      _model = (session['model'] ?? 'models/gemini-2.5-flash').toString();
      if (wsUrl.isEmpty || token.isEmpty) {
        throw Exception('Voice session credentials unavailable.');
      }

      final uri = wsUrl.contains('access_token=')
          ? wsUrl
          : '$wsUrl${wsUrl.contains('?') ? '&' : '?'}access_token=${Uri.encodeQueryComponent(token)}';

      _ws = await connectWebSocket(uri);
      _setupComplete = false;

      _wsSub = _ws!.stream.listen(
        _onWsMessage,
        onError: (e) {
          _setState(VoiceSessionState.error, 'WebSocket error: $e');
          stop();
        },
        onDone: () {
          if (_state != VoiceSessionState.error && _state != VoiceSessionState.idle) {
            _setState(VoiceSessionState.idle, 'Voice session ended');
          }
        },
      );

      // Send BidiGenerateContentSetup handshake
      final setupPayload = {
        'setup': {
          'model': _model,
          'generationConfig': {
            'responseModalities': ['AUDIO'],
            'speechConfig': {
              'voiceConfig': {
                'prebuiltVoiceConfig': {'voiceName': 'Puck'},
              },
            },
          },
          'systemInstruction': {
            'parts': [
              {
                'text':
                    'You are Learning Allied voice tutor, a helpful, encouraging, and clear conversational tutor for students. Explain concepts step-by-step and answer concisely.',
              },
            ],
          },
          'contextWindowCompression': {'slidingWindow': {}},
        },
      };
      _ws!.send(jsonEncode(setupPayload));
      _setState(VoiceSessionState.connecting, 'Initializing Gemini Live...');
    } catch (e) {
      _setState(VoiceSessionState.error, 'Unable to start voice session: $e');
      await _teardownAudio();
    }
  }

  Future<void> _onWsMessage(dynamic raw) async {
    String text;
    if (raw is String) {
      text = raw;
    } else if (raw is List<int>) {
      text = utf8.decode(raw);
    } else {
      return;
    }

    Map<String, dynamic> msg;
    try {
      msg = jsonDecode(text) as Map<String, dynamic>;
    } catch (_) {
      return;
    }

    if (msg.containsKey('setupComplete')) {
      _setupComplete = true;
      await _initAudio();
      _setState(
        _muted ? VoiceSessionState.muted : VoiceSessionState.listening,
        _muted ? 'Muted' : 'Listening — speak now',
      );
      return;
    }

    if (msg['serverContent'] is Map) {
      final sc = msg['serverContent'] as Map<String, dynamic>;
      if (sc['interrupted'] == true) {
        if (_pcmInitialized) {
          try {
            await FlutterPcmSound.release();
          } catch (_) {}
          _pcmInitialized = false;
        }
        if (!_muted) {
          _setState(VoiceSessionState.listening, 'Listening — speak now');
        }
      }

      final modelTurn = sc['modelTurn'];
      if (modelTurn is Map && modelTurn['parts'] is List) {
        for (final part in (modelTurn['parts'] as List)) {
          if (part is Map && part['inlineData'] is Map) {
            final inline = part['inlineData'] as Map;
            final b64 = (inline['data'] ?? '').toString();
            if (b64.isNotEmpty) {
              await _playPcmBase64(b64);
            }
          }
        }
      }

      if (sc['turnComplete'] == true && !_muted) {
        _setState(VoiceSessionState.listening, 'Listening — speak now');
      }
      return;
    }

    if (msg['error'] is Map) {
      final errMsg = (msg['error']['message'] ?? 'Gemini Live error').toString();
      _setState(VoiceSessionState.error, errMsg);
      await stop();
    }
  }

  Future<void> _initAudio() async {
    if (!_pcmInitialized) {
      await FlutterPcmSound.setup(sampleRate: 24000, channelCount: 1);
      await FlutterPcmSound.setFeedThreshold(800);
      _pcmInitialized = true;
    }

    final stream = await _recorder.startStream(
      const RecordConfig(
        encoder: AudioEncoder.pcm16bits,
        sampleRate: 16000,
        numChannels: 1,
      ),
    );

    _micSub = stream.listen((chunk) {
      if (_muted || !_setupComplete || _ws == null) return;
      final b64 = base64Encode(chunk);
      try {
        _ws?.send(jsonEncode({
          'realtimeInput': {
            'audio': {
              'mimeType': 'audio/pcm;rate=16000',
              'data': b64,
            },
          },
        }));
      } catch (_) {}
    });
  }

  Future<void> _playPcmBase64(String b64) async {
    if (!_pcmInitialized) {
      try {
        await FlutterPcmSound.setup(sampleRate: 24000, channelCount: 1);
        await FlutterPcmSound.setFeedThreshold(800);
        _pcmInitialized = true;
      } catch (_) {
        return;
      }
    }
    _setState(VoiceSessionState.speaking, 'Tutor is speaking...');
    try {
      final bytes = base64Decode(b64);
      final bd = ByteData.sublistView(bytes);
      final samples = <int>[];
      for (int i = 0; i + 1 < bytes.length; i += 2) {
        samples.add(bd.getInt16(i, Endian.little));
      }
      await FlutterPcmSound.feed(PcmArrayInt16.fromList(samples));
    } catch (_) {}
  }

  void toggleMute() {
    _muted = !_muted;
    if (_state == VoiceSessionState.listening || _state == VoiceSessionState.muted) {
      _setState(
        _muted ? VoiceSessionState.muted : VoiceSessionState.listening,
        _muted ? 'Microphone muted' : 'Listening — speak now',
      );
    } else {
      notifyListeners();
    }
  }

  Future<void> _teardownAudio() async {
    await _micSub?.cancel();
    _micSub = null;
    try {
      if (await _recorder.isRecording()) {
        await _recorder.stop();
      }
    } catch (_) {}
    if (_pcmInitialized) {
      try {
        await FlutterPcmSound.release();
      } catch (_) {}
      _pcmInitialized = false;
    }
  }

  Future<void> stop() async {
    _setupComplete = false;
    await _wsSub?.cancel();
    _wsSub = null;
    try {
      await _ws?.close();
    } catch (_) {}
    _ws = null;
    await _teardownAudio();
    if (_state != VoiceSessionState.error) {
      _setState(VoiceSessionState.idle, 'Session ended');
    }
  }

  @override
  void dispose() {
    stop();
    _recorder.dispose();
    super.dispose();
  }
}
