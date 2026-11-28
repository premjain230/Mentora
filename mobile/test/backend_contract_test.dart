import 'dart:convert';
import 'package:flutter_test/flutter_test.dart';
import 'package:http/http.dart' as http;

import 'package:learning_allied_arena/services/api_client.dart';
import 'package:learning_allied_arena/services/firebase_config_service.dart';

void main() {
  test('Live backend contract: /api/firebase-config returns valid config and protected routes enforce 401', () async {
    final cfgResp = await http
        .get(Uri.parse('${ApiClient.baseUrl}/api/firebase-config'))
        .timeout(const Duration(seconds: 12));
    expect(cfgResp.statusCode, 200);
    final cfgJson = jsonDecode(cfgResp.body) as Map<String, dynamic>;
    final cfg = FirebaseWebConfig.fromJson(cfgJson);
    expect(cfg.isValid, isTrue);

    final endpoints = [
      () => http.post(
            Uri.parse('${ApiClient.baseUrl}/api/tutor'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'action': 'catalog'}),
          ),
      () => http.post(
            Uri.parse('${ApiClient.baseUrl}/api/arena'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({'subjectKey': 'jee_physics', 'action': 'init'}),
          ),
      () => http.post(
            Uri.parse('${ApiClient.baseUrl}/api/groq-proxy'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode({
              'messages': [
                {'role': 'user', 'content': 'hi'}
              ]
            }),
          ),
      () => http.get(Uri.parse('${ApiClient.baseUrl}/api/recommendations')),
      () => http.post(Uri.parse('${ApiClient.baseUrl}/api/voice-session')),
    ];

    for (final call in endpoints) {
      final r = await call().timeout(const Duration(seconds: 12));
      expect(r.statusCode, 401);
    }
  });
}
