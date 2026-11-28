import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';

class FirebaseWebConfig {
  final String apiKey;
  final String authDomain;
  final String projectId;
  final String? storageBucket;
  final String? messagingSenderId;
  final String? appId;

  const FirebaseWebConfig({
    required this.apiKey,
    required this.authDomain,
    required this.projectId,
    this.storageBucket,
    this.messagingSenderId,
    this.appId,
  });

  factory FirebaseWebConfig.fromJson(Map<String, dynamic> json) {
    return FirebaseWebConfig(
      apiKey: (json['apiKey'] ?? '') as String,
      authDomain: (json['authDomain'] ?? '') as String,
      projectId: (json['projectId'] ?? '') as String,
      storageBucket: json['storageBucket'] as String?,
      messagingSenderId: json['messagingSenderId'] as String?,
      appId: json['appId'] as String?,
    );
  }

  Map<String, dynamic> toJson() => {
        'apiKey': apiKey,
        'authDomain': authDomain,
        'projectId': projectId,
        if (storageBucket != null) 'storageBucket': storageBucket,
        if (messagingSenderId != null) 'messagingSenderId': messagingSenderId,
        if (appId != null) 'appId': appId,
      };

  bool get isValid => apiKey.isNotEmpty && projectId.isNotEmpty;
}

class FirebaseConfigService {
  static const String baseUrl = 'https://www.learningallied.world';
  static const String _cacheKey = 'la_firebase_config_v1';

  static FirebaseWebConfig? _cached;

  static Future<FirebaseWebConfig> getConfig({bool forceRefresh = false}) async {
    if (!forceRefresh && _cached != null && _cached!.isValid) {
      return _cached!;
    }

    final prefs = await SharedPreferences.getInstance();
    if (!forceRefresh) {
      final raw = prefs.getString(_cacheKey);
      if (raw != null && raw.isNotEmpty) {
        try {
          final parsed = FirebaseWebConfig.fromJson(jsonDecode(raw) as Map<String, dynamic>);
          if (parsed.isValid) {
            _cached = parsed;
            return parsed;
          }
        } catch (_) {}
      }
    }

    http.Response resp;
    try {
      resp = await http
          .get(
            Uri.parse('$baseUrl/api/firebase-config'),
            headers: {'Accept': 'application/json'},
          )
          .timeout(const Duration(seconds: 12));
    } catch (e) {
      if (kIsWeb) {
        // Fallback to local Next.js dev server when browser CORS blocks production origin
        resp = await http
            .get(
              Uri.parse('http://localhost:3000/api/firebase-config'),
              headers: {'Accept': 'application/json'},
            )
            .timeout(const Duration(seconds: 6));
      } else {
        rethrow;
      }
    }

    if (resp.statusCode != 200) {
      throw Exception('Failed to load Firebase config (${resp.statusCode})');
    }

    final json = jsonDecode(resp.body) as Map<String, dynamic>;
    final cfg = FirebaseWebConfig.fromJson(json);
    if (!cfg.isValid) {
      throw Exception('Invalid Firebase config returned by server');
    }

    _cached = cfg;
    await prefs.setString(_cacheKey, jsonEncode(cfg.toJson()));
    return cfg;
  }
}
