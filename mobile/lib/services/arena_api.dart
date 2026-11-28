import 'api_client.dart';

/// Arena API client — server-authoritative, same endpoint as web (`/api/arena`).
/// Uses authenticated `ApiClient` with Firebase ID token.
class ArenaApi {
  final ApiClient api;

  ArenaApi(this.api);

  Future<Map<String, dynamic>> initProgress({
    required String subjectKey,
    required String trackId,
    required String subject,
    int? classNum,
    required List<Map<String, dynamic>> chapters,
  }) {
    return api.post('/api/arena', {
      'subjectKey': subjectKey,
      'action': 'init',
      'trackId': trackId,
      'subject': subject,
      if (classNum != null) 'classNum': classNum,
      'chapters': chapters,
    });
  }

  Future<Map<String, dynamic>> heartbeat(String subjectKey) {
    return api.post('/api/arena', {
      'subjectKey': subjectKey,
      'action': 'heartbeat',
    });
  }

  Future<Map<String, dynamic>> startBattle({
    required String subjectKey,
    required String mode, // 'chapter' | 'final_boss'
    String? conceptId,
    String? subject,
    String? name,
    String? topic,
    List<String>? topics,
  }) {
    return api.post('/api/arena', {
      'subjectKey': subjectKey,
      'action': 'start_battle',
      'mode': mode,
      if (conceptId != null) 'conceptId': conceptId,
      if (subject != null) 'subject': subject,
      if (name != null) 'name': name,
      if (topic != null) 'topic': topic,
      if (topics != null) 'topics': topics,
    });
  }

  Future<Map<String, dynamic>> submitAnswer({
    required String subjectKey,
    required String sessionId,
    required int questionIndex,
    required int choice,
  }) {
    return api.post('/api/arena', {
      'subjectKey': subjectKey,
      'action': 'submit_answer',
      'sessionId': sessionId,
      'questionIndex': questionIndex,
      'choice': choice,
    });
  }

  Future<Map<String, dynamic>> finishBattle({
    required String subjectKey,
    required String sessionId,
  }) {
    return api.post('/api/arena', {
      'subjectKey': subjectKey,
      'action': 'finish_battle',
      'sessionId': sessionId,
    });
  }

  Future<Map<String, dynamic>?> fetchProgress(String subjectKey) async {
    try {
      return await api.get(
        '/api/arena?subjectKey=${Uri.encodeComponent(subjectKey)}',
      );
    } on ApiException catch (e) {
      if (e.statusCode == 404) return null;
      rethrow;
    }
  }
}
