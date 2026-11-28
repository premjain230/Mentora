import 'api_client.dart';

/// Unified service for Learning Allied backend APIs:
/// - `/api/tutor` (catalog, chapter, state, lesson, evaluate, chat)
/// - `/api/groq-proxy` (streaming & non-streaming AI completions)
/// - `/api/learning-event`
/// - `/api/recommendations`
/// - `/api/quiz`
/// - `/api/study-session`
/// - `/api/generate-plan` & `/api/replan`
/// - `/api/chat/manage`
/// - `/api/voice-session`
/// - `/api/feedback`
class LearningService {
  final ApiClient api;

  LearningService(this.api);

  // ── Tutor & Learning Hub ──────────────────────────────────────────────────

  Future<Map<String, dynamic>> fetchCatalog({
    String? countryCode,
    String? track,
    int? classNum,
    String? subject,
    String? query,
    bool globalSearch = false,
  }) {
    return api.post('/api/tutor', {
      'action': 'catalog',
      if (countryCode != null) 'countryCode': countryCode,
      if (track != null) 'track': track,
      if (classNum != null) 'classNum': classNum,
      if (subject != null) 'subject': subject,
      if (query != null && query.isNotEmpty) 'query': query,
      if (globalSearch) 'globalSearch': true,
    });
  }

  Future<Map<String, dynamic>> fetchChapter(String conceptId) {
    return api.post('/api/tutor', {
      'action': 'chapter',
      'conceptId': conceptId,
    });
  }

  Future<Map<String, dynamic>> fetchLearningState({
    String? conceptId,
    String? track,
    int? classNum,
  }) {
    return api.post('/api/tutor', {
      'action': 'state',
      if (conceptId != null) 'conceptId': conceptId,
      if (track != null) 'track': track,
      if (classNum != null) 'classNum': classNum,
    });
  }

  Future<Map<String, dynamic>> fetchLesson({
    required String conceptId,
    String? track,
    int? classNum,
    String? subject,
    String mode = 'start',
    int? stageIndex,
    String? subConceptId,
    String? strategy,
  }) {
    return api.post('/api/tutor', {
      'action': 'lesson',
      'conceptId': conceptId,
      if (track != null) 'track': track,
      if (classNum != null) 'classNum': classNum,
      if (subject != null) 'subject': subject,
      'mode': mode,
      if (stageIndex != null) 'stageIndex': stageIndex,
      if (subConceptId != null) 'subConceptId': subConceptId,
      if (strategy != null) 'strategy': strategy,
    });
  }

  Future<Map<String, dynamic>> evaluateAnswer({
    required String conceptId,
    required String answer,
    String? question,
    String? questionId,
    String? track,
    int? classNum,
    String? subject,
    String? subConceptId,
    String? cacheKey,
    String surface = 'learning_hub',
  }) {
    return api.post('/api/tutor', {
      'action': 'evaluate',
      'conceptId': conceptId,
      'answer': answer,
      if (question != null) 'question': question,
      if (questionId != null) 'questionId': questionId,
      if (track != null) 'track': track,
      if (classNum != null) 'classNum': classNum,
      if (subject != null) 'subject': subject,
      if (subConceptId != null) 'subConceptId': subConceptId,
      if (cacheKey != null) 'cacheKey': cacheKey,
      'surface': surface,
    });
  }

  Future<Map<String, dynamic>> tutorChat({
    required String question,
    String? conceptId,
    List<Map<String, String>>? history,
    String? model,
    String? strategy,
    Map<String, dynamic>? context,
  }) {
    return api.post('/api/tutor', {
      'action': 'chat',
      'question': question,
      if (conceptId != null) 'conceptId': conceptId,
      if (history != null && history.isNotEmpty) 'history': history,
      if (model != null) 'model': model,
      if (strategy != null) 'strategy': strategy,
      if (context != null) 'context': context,
    });
  }

  // ── Groq Proxy (Streaming & Completions) ──────────────────────────────────

  Stream<Map<String, dynamic>> streamChat({
    required List<Map<String, String>> messages,
    String model = 'auto',
    double temperature = 0.7,
    int maxTokens = 2048,
  }) {
    return api.postSse('/api/groq-proxy', {
      'model': model,
      'messages': messages,
      'temperature': temperature,
      'max_tokens': maxTokens,
      'stream': true,
    });
  }

  Future<String> completePrompt({
    required List<Map<String, String>> messages,
    String model = 'openai/gpt-oss-120b',
    double temperature = 0.7,
    int maxTokens = 1024,
  }) async {
    final res = await api.post('/api/groq-proxy', {
      'model': model,
      'messages': messages,
      'temperature': temperature,
      'max_tokens': maxTokens,
      'stream': false,
    });
    final choices = res['choices'] as List<dynamic>?;
    if (choices != null && choices.isNotEmpty) {
      return (choices.first['message']?['content'] ?? '').toString();
    }
    return '';
  }

  Future<void> deleteChat(String chatId) async {
    await api.post('/api/learning-event?route=chat-manage', {
      'action': 'delete_chat',
      'chatId': chatId,
    });
  }

  Future<Map<String, dynamic>> createVoiceSession() {
    return api.post('/api/voice-session', {});
  }

  // ── Learning Events & Recommendations ─────────────────────────────────────

  Future<Map<String, dynamic>> emitLearningEvent({
    required String type,
    String? conceptId,
    String? subject,
    String? topic,
    String? source,
    String? sessionId,
    String? questionId,
    int? confidence,
    Map<String, dynamic>? payload,
  }) {
    return api.post('/api/learning-event', {
      'type': type,
      if (conceptId != null) 'conceptId': conceptId,
      if (subject != null) 'subject': subject,
      if (topic != null) 'topic': topic,
      if (source != null) 'source': source,
      if (sessionId != null) 'sessionId': sessionId,
      if (questionId != null) 'questionId': questionId,
      if (confidence != null) 'confidence': confidence,
      if (payload != null) 'payload': payload,
    });
  }

  Future<Map<String, dynamic>> fetchRecommendations() {
    return api.get('/api/recommendations');
  }

  // ── Study Session & Planner ───────────────────────────────────────────────

  Future<Map<String, dynamic>> generateStudySessionPlan({
    required String subject,
    required String topic,
    int durationMinutes = 25,
    String? goal,
  }) {
    return api.post('/api/study-session', {
      'subject': subject,
      'topic': topic,
      'durationMinutes': durationMinutes,
      if (goal != null && goal.isNotEmpty) 'goal': goal,
    });
  }

  Future<Map<String, dynamic>> generateStudyPlan({
    required List<String> subjects,
    String? targetScore,
    List<String>? weakTopics,
    double? dailyHours,
    String? startDate,
    String? examDate,
    String? examType,
  }) {
    return api.post('/api/generate-plan', {
      'subjects': subjects,
      if (targetScore != null) 'targetScore': targetScore,
      if (weakTopics != null) 'weakTopics': weakTopics,
      if (dailyHours != null) 'dailyHours': dailyHours,
      if (startDate != null) 'startDate': startDate,
      if (examDate != null) 'examDate': examDate,
      if (examType != null) 'examType': examType,
    });
  }

  Future<Map<String, dynamic>> replanMissedTasks({
    required List<Map<String, dynamic>> missedTasks,
    double? dailyHours,
    String? examDate,
    String? examType,
  }) {
    return api.post('/api/replan', {
      'missedTasks': missedTasks,
      if (dailyHours != null) 'dailyHours': dailyHours,
      if (examDate != null) 'examDate': examDate,
      if (examType != null) 'examType': examType,
    });
  }

  // ── Feedback ──────────────────────────────────────────────────────────────

  Future<Map<String, dynamic>> submitFeedback({
    required String category,
    required String message,
    String? page,
    int? rating,
  }) {
    return api.post('/api/feedback', {
      'category': category,
      'message': message,
      if (page != null) 'page': page,
      if (rating != null) 'rating': rating,
    });
  }
}
