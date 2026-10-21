// Arena API client — server-authoritative, same endpoint as web (/api/arena)

import 'dart:convert';
import 'package:http/http.dart' as http;

class ArenaApi {
  static const baseUrl = 'https://www.learningallied.world';
  static Future<Map<String, String>> _headers() async {
    return {
      'Content-Type':'application/json',
    };
  }
  static Future<Map<String,dynamic>> initProgress({
    required String subjectKey,
    required String trackId,
    required String subject,
    int? classNum,
    required List<Map<String,dynamic>> chapters,
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
