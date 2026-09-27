// Arena API client — server-authoritative, same endpoint as web (/api/arena)
// Uses Firebase ID token for auth. Never trusts client for defeat/unlock.

import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:firebase_auth/firebase_auth.dart';

class ArenaApi {
  // Serve the host that answers directly. The old aquila-sand.vercel.app host
  // redirected to the apex domain, which itself 308-redirects to www, adding
  // two hops to every request. localhost fallback handled by caller.
  static const baseUrl = 'https://www.learningallied.world';
  static Future<Map<String,dynamic>> _headers() async {
    final user=FirebaseAuth.instance.currentUser;
    String? token;
    if(user!=null) token=await user.getIdToken();
    return {
      'Content-Type':'application/json',
      if(token!=null) 'Authorization':'Bearer $token',
    };
  }
  static Future<Map<String,dynamic>> initProgress({
    required String subjectKey,
    required String trackId,
    required String subject,
    int? classNum,
    required List<Map<String,dynamic>> chapters, // [{conceptId, prerequisites}]
  }) async {
    final h=await _headers();
    final r=await http.post(Uri.parse('$baseUrl/api/arena'), headers:h, body: jsonEncode({
      'subjectKey': subjectKey, 'action':'init', 'trackId':trackId, 'subject':subject, 'classNum':classNum, 'chapters':chapters,
    }));
    final j=jsonDecode(r.body) as Map<String,dynamic>;
    if(r.statusCode>=400) throw Exception(j['error']??'init failed ${r.statusCode}');
    return j;
  }
  static Future<Map<String,dynamic>> defeatChapter({required String subjectKey, required String conceptId, required double score, double? masteryScore}) async {
    final h=await _headers();
    final r=await http.post(Uri.parse('$baseUrl/api/arena'), headers:h, body: jsonEncode({
      'subjectKey': subjectKey, 'action':'defeat_chapter', 'conceptId': conceptId, 'score': score, 'masteryScore': masteryScore,
    }));
    final j=jsonDecode(r.body) as Map<String,dynamic>;
    if(r.statusCode>=400) throw Exception(j['error']??'defeat failed');
    return j;
  }
  static Future<Map<String,dynamic>> finalBossAttempt({required String subjectKey, required double score}) async {
    final h=await _headers();
    final r=await http.post(Uri.parse('$baseUrl/api/arena'), headers:h, body: jsonEncode({
      'subjectKey': subjectKey, 'action':'final_boss_attempt', 'score': score,
    }));
    final j=jsonDecode(r.body) as Map<String,dynamic>;
    if(r.statusCode>=400) throw Exception(j['error']??'final boss failed');
    return j;
  }
  static Future<Map<String,dynamic>?> fetchProgress(String subjectKey) async {
    final h=await _headers();
    final r=await http.get(Uri.parse('$baseUrl/api/arena?subjectKey=${Uri.encodeComponent(subjectKey)}'), headers:h);
    if(r.statusCode==404) return null;
    final j=jsonDecode(r.body) as Map<String,dynamic>;
    if(r.statusCode>=400) throw Exception(j['error']??'fetch failed');
    return j;
  }
}
