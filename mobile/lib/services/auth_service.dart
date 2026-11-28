import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'firebase_config_service.dart';

class AuthUser {
  final String uid;
  final String email;
  final String displayName;
  final String photoUrl;
  final bool emailVerified;

  const AuthUser({
    required this.uid,
    required this.email,
    required this.displayName,
    this.photoUrl = '',
    this.emailVerified = false,
  });

  factory AuthUser.fromJson(Map<String, dynamic> j) => AuthUser(
        uid: (j['uid'] ?? '') as String,
        email: (j['email'] ?? '') as String,
        displayName: (j['displayName'] ?? '') as String,
        photoUrl: (j['photoUrl'] ?? '') as String,
        emailVerified: j['emailVerified'] == true,
      );

  Map<String, dynamic> toJson() => {
        'uid': uid,
        'email': email,
        'displayName': displayName,
        'photoUrl': photoUrl,
        'emailVerified': emailVerified,
      };
}

class AuthService extends ChangeNotifier {
  static const _kSession = 'la_auth_session_v1';

  AuthUser? _user;
  String? _idToken;
  String? _refreshToken;
  DateTime? _expiresAt;
  bool _initializing = true;
  String? _lastError;

  AuthUser? get user => _user;
  bool get isSignedIn => _user != null && _idToken != null;
  bool get isInitializing => _initializing;
  String? get lastError => _lastError;

  Future<void> init() async {
    _initializing = true;
    notifyListeners();
    try {
      final prefs = await SharedPreferences.getInstance();
      final raw = prefs.getString(_kSession);
      if (raw != null && raw.isNotEmpty) {
        final j = jsonDecode(raw) as Map<String, dynamic>;
        _user = AuthUser.fromJson(j['user'] as Map<String, dynamic>);
        _idToken = j['idToken'] as String?;
        _refreshToken = j['refreshToken'] as String?;
        final exp = j['expiresAt'] as String?;
        _expiresAt = exp != null ? DateTime.tryParse(exp) : null;

        // Proactively refresh if expired or expiring within 2 minutes
        if (_refreshToken != null &&
            (_expiresAt == null ||
                _expiresAt!.isBefore(DateTime.now().add(const Duration(minutes: 2))))) {
          await refreshSession();
        }
      }
    } catch (e) {
      _lastError = e.toString();
    } finally {
      _initializing = false;
      notifyListeners();
    }
  }

  Future<String> getValidIdToken({bool forceRefresh = false}) async {
    if (!isSignedIn) throw Exception('Not signed in');
    if (forceRefresh ||
        _expiresAt == null ||
        _expiresAt!.isBefore(DateTime.now().add(const Duration(minutes: 2)))) {
      await refreshSession();
    }
    if (_idToken == null) throw Exception('Session expired. Please sign in again.');
    return _idToken!;
  }

  Future<void> signInWithEmail(String email, String password) async {
    final cfg = await FirebaseConfigService.getConfig();
    final resp = await http
        .post(
          Uri.parse(
            'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${cfg.apiKey}',
          ),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'email': email.trim(),
            'password': password,
            'returnSecureToken': true,
          }),
        )
        .timeout(const Duration(seconds: 15));

    final body = jsonDecode(resp.body) as Map<String, dynamic>;
    if (resp.statusCode >= 400) {
      throw Exception(_friendlyAuthError(body['error']?['message']?.toString()));
    }

    _idToken = body['idToken'] as String;
    _refreshToken = body['refreshToken'] as String;
    final expiresIn = int.tryParse('${body['expiresIn'] ?? 3600}') ?? 3600;
    _expiresAt = DateTime.now().add(Duration(seconds: expiresIn));

    await _lookupAndSaveUser(cfg.apiKey);
  }

  Future<void> signUpWithEmail({
    required String name,
    required String email,
    required String password,
  }) async {
    final cfg = await FirebaseConfigService.getConfig();
    final resp = await http
        .post(
          Uri.parse(
            'https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${cfg.apiKey}',
          ),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({
            'email': email.trim(),
            'password': password,
            'returnSecureToken': true,
          }),
        )
        .timeout(const Duration(seconds: 15));

    final body = jsonDecode(resp.body) as Map<String, dynamic>;
    if (resp.statusCode >= 400) {
      throw Exception(_friendlyAuthError(body['error']?['message']?.toString()));
    }

    _idToken = body['idToken'] as String;
    _refreshToken = body['refreshToken'] as String;
    final expiresIn = int.tryParse('${body['expiresIn'] ?? 3600}') ?? 3600;
    _expiresAt = DateTime.now().add(Duration(seconds: expiresIn));

    // Set displayName
    if (name.trim().isNotEmpty) {
      await http.post(
        Uri.parse(
          'https://identitytoolkit.googleapis.com/v1/accounts:update?key=${cfg.apiKey}',
        ),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'idToken': _idToken,
          'displayName': name.trim(),
          'returnSecureToken': false,
        }),
      );
    }

    await _lookupAndSaveUser(cfg.apiKey);
    // Send verification email
    try {
      await sendVerificationEmail();
    } catch (_) {}
  }

  Future<void> sendVerificationEmail() async {
    final cfg = await FirebaseConfigService.getConfig();
    final token = await getValidIdToken();
    final resp = await http.post(
      Uri.parse(
        'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${cfg.apiKey}',
      ),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'requestType': 'VERIFY_EMAIL',
        'idToken': token,
      }),
    );
    if (resp.statusCode >= 400) {
      final body = jsonDecode(resp.body) as Map<String, dynamic>;
      throw Exception(_friendlyAuthError(body['error']?['message']?.toString()));
    }
  }

  Future<void> sendPasswordResetEmail(String email) async {
    final cfg = await FirebaseConfigService.getConfig();
    final resp = await http.post(
      Uri.parse(
        'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode?key=${cfg.apiKey}',
      ),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'requestType': 'PASSWORD_RESET',
        'email': email.trim(),
      }),
    );
    if (resp.statusCode >= 400) {
      final body = jsonDecode(resp.body) as Map<String, dynamic>;
      throw Exception(_friendlyAuthError(body['error']?['message']?.toString()));
    }
  }

  Future<void> reloadUser() async {
    if (!isSignedIn) return;
    final cfg = await FirebaseConfigService.getConfig();
    await getValidIdToken();
    await _lookupAndSaveUser(cfg.apiKey);
  }

  Future<void> updateDisplayName(String displayName) async {
    final cfg = await FirebaseConfigService.getConfig();
    final token = await getValidIdToken();
    final resp = await http.post(
      Uri.parse(
        'https://identitytoolkit.googleapis.com/v1/accounts:update?key=${cfg.apiKey}',
      ),
      headers: {'Content-Type': 'application/json'},
      body: jsonEncode({
        'idToken': token,
        'displayName': displayName.trim(),
        'returnSecureToken': false,
      }),
    );
    if (resp.statusCode >= 400) {
      throw Exception('Failed to update profile name');
    }
    await _lookupAndSaveUser(cfg.apiKey);
  }

  Future<void> refreshSession() async {
    if (_refreshToken == null) {
      await signOut();
      return;
    }
    final cfg = await FirebaseConfigService.getConfig();
    final resp = await http
        .post(
          Uri.parse('https://securetoken.googleapis.com/v1/token?key=${cfg.apiKey}'),
          headers: {'Content-Type': 'application/x-www-form-urlencoded'},
          body: 'grant_type=refresh_token&refresh_token=${Uri.encodeComponent(_refreshToken!)}',
        )
        .timeout(const Duration(seconds: 15));

    if (resp.statusCode >= 400) {
      await signOut();
      throw Exception('Session expired. Please sign in again.');
    }

    final body = jsonDecode(resp.body) as Map<String, dynamic>;
    _idToken = body['id_token'] as String?;
    _refreshToken = (body['refresh_token'] as String?) ?? _refreshToken;
    final expiresIn = int.tryParse('${body['expires_in'] ?? 3600}') ?? 3600;
    _expiresAt = DateTime.now().add(Duration(seconds: expiresIn));

    await _lookupAndSaveUser(cfg.apiKey);
  }

  Future<void> _lookupAndSaveUser(String apiKey) async {
    final resp = await http
        .post(
          Uri.parse(
            'https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=$apiKey',
          ),
          headers: {'Content-Type': 'application/json'},
          body: jsonEncode({'idToken': _idToken}),
        )
        .timeout(const Duration(seconds: 12));

    if (resp.statusCode >= 400) {
      throw Exception('Failed to fetch user account');
    }

    final body = jsonDecode(resp.body) as Map<String, dynamic>;
    final users = body['users'] as List<dynamic>?;
    if (users == null || users.isEmpty) {
      throw Exception('Account not found');
    }
    final u = users.first as Map<String, dynamic>;
    _user = AuthUser(
      uid: (u['localId'] ?? '') as String,
      email: (u['email'] ?? '') as String,
      displayName: (u['displayName'] ?? '') as String,
      photoUrl: (u['photoUrl'] ?? '') as String,
      emailVerified: u['emailVerified'] == true,
    );
    await _persist();
    notifyListeners();
  }

  Future<void> _persist() async {
    final prefs = await SharedPreferences.getInstance();
    if (_user == null || _idToken == null) {
      await prefs.remove(_kSession);
      return;
    }
    await prefs.setString(
      _kSession,
      jsonEncode({
        'user': _user!.toJson(),
        'idToken': _idToken,
        'refreshToken': _refreshToken,
        'expiresAt': _expiresAt?.toIso8601String(),
      }),
    );
  }

  Future<void> signOut() async {
    _user = null;
    _idToken = null;
    _refreshToken = null;
    _expiresAt = null;
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_kSession);
    notifyListeners();
  }

  Future<void> signInWithGoogle() async {
    // Native Google Sign-In requires google-services.json (Android) or an OAuth
    // client ID (Web) registered in Firebase Console for this app's package/origin.
    await FirebaseConfigService.getConfig();
    throw Exception(
      'Google Sign-In requires google-services.json (Android) or an authorized OAuth Client ID in Firebase Console. Use Email & Password for now.',
    );
  }

  static String _friendlyAuthError(String? code) {
    switch (code) {
      case 'EMAIL_NOT_FOUND':
      case 'INVALID_PASSWORD':
      case 'INVALID_LOGIN_CREDENTIALS':
        return 'Invalid email or password.';
      case 'USER_DISABLED':
        return 'This account has been disabled.';
      case 'EMAIL_EXISTS':
        return 'An account with this email already exists.';
      case 'WEAK_PASSWORD : Password should be at least 6 characters':
      case 'WEAK_PASSWORD':
        return 'Password must be at least 6 characters.';
      case 'INVALID_EMAIL':
        return 'Please enter a valid email address.';
      case 'TOO_MANY_ATTEMPTS_TRY_LATER':
        return 'Too many attempts. Please try again later.';
      default:
        return code ?? 'Authentication failed. Please try again.';
    }
  }
}
