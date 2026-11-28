import 'dart:async';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'auth_service.dart';

class ApiException implements Exception {
  final int statusCode;
  final String message;
  final String? code;
  final Map<String, dynamic>? body;

  ApiException(this.statusCode, this.message, {this.code, this.body});

  bool get isLimitReached => statusCode == 429 || code == 'limit_reached';

  @override
  String toString() => message;
}

class ApiClient {
  static const String baseUrl = 'https://www.learningallied.world';
  final AuthService auth;

  ApiClient(this.auth);

  Future<Map<String, String>> _headers({bool requireAuth = true, bool forceRefresh = false}) async {
    final h = <String, String>{
      'Content-Type': 'application/json',
      'Accept': 'application/json',
    };
    if (requireAuth && auth.isSignedIn) {
      final token = await auth.getValidIdToken(forceRefresh: forceRefresh);
      h['Authorization'] = 'Bearer $token';
    } else if (requireAuth) {
      throw ApiException(401, 'Please sign in to continue.');
    }
    return h;
  }

  Future<Map<String, dynamic>> get(
    String path, {
    bool requireAuth = true,
    Duration timeout = const Duration(seconds: 20),
  }) async {
    var headers = await _headers(requireAuth: requireAuth);
    var resp = await http
        .get(Uri.parse('$baseUrl$path'), headers: headers)
        .timeout(timeout);

    if (resp.statusCode == 401 && requireAuth && auth.isSignedIn) {
      headers = await _headers(requireAuth: true, forceRefresh: true);
      resp = await http
          .get(Uri.parse('$baseUrl$path'), headers: headers)
          .timeout(timeout);
    }

    return _decodeResponse(resp);
  }

  Future<Map<String, dynamic>> post(
    String path,
    Map<String, dynamic> body, {
    bool requireAuth = true,
    Duration timeout = const Duration(seconds: 45),
  }) async {
    var headers = await _headers(requireAuth: requireAuth);
    var resp = await http
        .post(Uri.parse('$baseUrl$path'), headers: headers, body: jsonEncode(body))
        .timeout(timeout);

    if (resp.statusCode == 401 && requireAuth && auth.isSignedIn) {
      headers = await _headers(requireAuth: true, forceRefresh: true);
      resp = await http
          .post(Uri.parse('$baseUrl$path'), headers: headers, body: jsonEncode(body))
          .timeout(timeout);
    }

    return _decodeResponse(resp);
  }

  /// Streams SSE events (`data: ...`) from endpoints like `/api/groq-proxy`.
  Stream<Map<String, dynamic>> postSse(
    String path,
    Map<String, dynamic> body, {
    bool requireAuth = true,
  }) async* {
    final headers = await _headers(requireAuth: requireAuth);
    final req = http.Request('POST', Uri.parse('$baseUrl$path'))
      ..headers.addAll(headers)
      ..body = jsonEncode(body);

    final client = http.Client();
    try {
      final streamed = await client.send(req).timeout(const Duration(seconds: 60));
      if (streamed.statusCode >= 400) {
        final text = await streamed.stream.bytesToString();
        Map<String, dynamic>? j;
        try {
          j = jsonDecode(text) as Map<String, dynamic>;
        } catch (_) {}
        final msg = _extractErrorMessage(j) ?? 'Request failed (${streamed.statusCode})';
        final code = j?['error'] is Map ? j!['error']['code']?.toString() : j?['code']?.toString();
        throw ApiException(streamed.statusCode, msg, code: code, body: j);
      }

      final lines = streamed.stream
          .transform(utf8.decoder)
          .transform(const LineSplitter());

      await for (final line in lines) {
        final trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        final payload = trimmed.substring(5).trim();
        if (payload.isEmpty || payload == '[DONE]') {
          if (payload == '[DONE]') break;
          continue;
        }
        try {
          final parsed = jsonDecode(payload);
          if (parsed is Map<String, dynamic>) {
            yield parsed;
          }
        } catch (_) {}
      }
    } finally {
      client.close();
    }
  }

  Map<String, dynamic> _decodeResponse(http.Response resp) {
    Map<String, dynamic> json = {};
    if (resp.body.isNotEmpty) {
      try {
        final decoded = jsonDecode(resp.body);
        if (decoded is Map<String, dynamic>) {
          json = decoded;
        }
      } catch (_) {}
    }

    if (resp.statusCode >= 400) {
      final msg = _extractErrorMessage(json) ?? 'Request failed (${resp.statusCode})';
      final code = json['error'] is Map ? json['error']['code']?.toString() : json['code']?.toString();
      throw ApiException(resp.statusCode, msg, code: code, body: json);
    }

    return json;
  }

  static String? _extractErrorMessage(Map<String, dynamic>? json) {
    if (json == null) return null;
    final err = json['error'];
    if (err is String) return err;
    if (err is Map && err['message'] != null) return err['message'].toString();
    if (json['message'] != null) return json['message'].toString();
    return null;
  }
}
