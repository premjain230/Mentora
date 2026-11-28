import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../services/learning_service.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_components.dart';

class StudySessionScreen extends StatefulWidget {
  const StudySessionScreen({super.key});

  @override
  State<StudySessionScreen> createState() => _StudySessionScreenState();
}

class _StudySessionScreenState extends State<StudySessionScreen> {
  final _subjectCtrl = TextEditingController(text: 'Physics');
  final _topicCtrl = TextEditingController();
  final _goalCtrl = TextEditingController();

  int _durationMinutes = 25;
  bool _generating = false;

  String? _sessionId;
  Map<String, dynamic>? _plan;
  final Set<int> _checkedObjectives = {};

  Timer? _timer;
  int _remainingSeconds = 25 * 60;
  int _elapsedSeconds = 0;
  bool _running = false;

  List<Map<String, dynamic>> _recentSessions = [];

  @override
  void initState() {
    super.initState();
    _loadRecent();
  }

  @override
  void dispose() {
    _timer?.cancel();
    _subjectCtrl.dispose();
    _topicCtrl.dispose();
    _goalCtrl.dispose();
    super.dispose();
  }

  LearningService get _svc => LearningService(ApiClient(context.read<AuthService>()));

  Future<void> _loadRecent() async {
    try {
      final auth = context.read<AuthService>();
      final uid = auth.user?.uid;
      if (uid == null) return;
      final docs = await FirestoreService(auth).listDocs('users/$uid/studySessions', pageSize: 15);
      docs.sort((a, b) => (b['startedAt'] ?? '').toString().compareTo((a['startedAt'] ?? '').toString()));
      if (mounted) setState(() => _recentSessions = docs);
    } catch (_) {}
  }

  Future<void> _startSession() async {
    final subject = _subjectCtrl.text.trim();
    final topic = _topicCtrl.text.trim();
    if (subject.isEmpty || topic.isEmpty) {
      LAToast.show(context, 'Enter a subject and topic', isError: true);
      return;
    }
    setState(() => _generating = true);
    try {
      final res = await _svc.generateStudySessionPlan(
        subject: subject,
        topic: topic,
        durationMinutes: _durationMinutes,
        goal: _goalCtrl.text.trim(),
      );
      final plan = res['plan'] is Map ? Map<String, dynamic>.from(res['plan'] as Map) : res;
      final id = 'ss_${DateTime.now().millisecondsSinceEpoch}';
      if (!mounted) return;
      final auth = context.read<AuthService>();
      final uid = auth.user?.uid;
      if (uid != null) {
        final now = DateTime.now().toUtc().toIso8601String();
        await FirestoreService(auth).setDoc('users/$uid/studySessions/$id', {
          'subject': subject,
          'topic': topic,
          'durationMinutes': _durationMinutes,
          'goal': _goalCtrl.text.trim(),
          'plan': plan,
          'status': 'active',
          'timeFocused': 0,
          'startedAt': now,
          'updatedAt': now,
        });
        _svc.emitLearningEvent(
          type: 'study_session_started',
          subject: subject,
          topic: topic,
          source: 'study_session',
          sessionId: id,
        ).catchError((_) => <String, dynamic>{});
      }
      if (!mounted) return;
      setState(() {
        _sessionId = id;
        _plan = plan;
        _checkedObjectives.clear();
        _remainingSeconds = _durationMinutes * 60;
        _elapsedSeconds = 0;
        _generating = false;
      });
      _toggleTimer(start: true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _generating = false);
      LAToast.show(context, 'Failed to start session: $e', isError: true);
    }
  }

  void _toggleTimer({bool? start}) {
    final shouldRun = start ?? !_running;
    _timer?.cancel();
    if (shouldRun) {
      setState(() => _running = true);
      _timer = Timer.periodic(const Duration(seconds: 1), (_) {
        if (!mounted) return;
        setState(() {
          if (_remainingSeconds > 0) {
            _remainingSeconds--;
            _elapsedSeconds++;
          } else {
            _timer?.cancel();
            _running = false;
            _completeSession();
          }
        });
      });
    } else {
      setState(() => _running = false);
    }
  }

  Future<void> _completeSession() async {
    _timer?.cancel();
    final auth = context.read<AuthService>();
    final uid = auth.user?.uid;
    final id = _sessionId;
    final subject = _subjectCtrl.text.trim();
    final topic = _topicCtrl.text.trim();

    if (uid != null && id != null) {
      final now = DateTime.now().toUtc().toIso8601String();
      try {
        await FirestoreService(auth).setDoc('users/$uid/studySessions/$id', {
          'status': 'completed',
          'timeFocused': _elapsedSeconds,
          'completedAt': now,
          'updatedAt': now,
        });
        if (_elapsedSeconds >= 60) {
          await _svc.emitLearningEvent(
            type: 'study_session_completed',
            subject: subject,
            topic: topic,
            source: 'study_session',
            sessionId: id,
            payload: {'durationSeconds': _elapsedSeconds},
          );
        }
      } catch (_) {}
    }

    if (!mounted) return;
    setState(() {
      _running = false;
      _plan = null;
      _sessionId = null;
    });
    LAToast.show(context, 'Study session saved', isSuccess: true);
    _loadRecent();
  }

  String _formatTime(int totalSeconds) {
    final m = (totalSeconds ~/ 60).toString().padLeft(2, '0');
    final s = (totalSeconds % 60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Study Session')),
      body: _plan != null ? _buildActiveSession(c) : _buildSetup(c),
    );
  }

  Widget _buildSetup(LAColors c) {
    return ListView(
      padding: const EdgeInsets.all(LATokens.space4),
      children: [
        LAInput(label: 'Subject', hint: 'Physics', controller: _subjectCtrl),
        const SizedBox(height: LATokens.space3),
        LAInput(label: 'Topic', hint: 'e.g. Laws of Motion', controller: _topicCtrl),
        const SizedBox(height: LATokens.space3),
        LAInput(label: 'Goal (optional)', hint: 'e.g. Master numericals', controller: _goalCtrl),
        const SizedBox(height: LATokens.space4),
        Text('Duration', style: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w600, color: c.text)),
        const SizedBox(height: 8),
        Wrap(
          spacing: 8,
          children: [10, 15, 25, 45, 60].map((m) {
            return ChoiceChip(
              label: Text('$m min'),
              selected: _durationMinutes == m,
              onSelected: (_) => setState(() => _durationMinutes = m),
            );
          }).toList(),
        ),
        const SizedBox(height: LATokens.space4),
        LAButton(
          text: 'Generate plan & start timer',
          icon: Icons.play_arrow_rounded,
          loading: _generating,
          onPressed: _startSession,
        ),
        const SizedBox(height: LATokens.space5),
        const SectionHeader(icon: Icons.history_rounded, title: 'Recent sessions'),
        const SizedBox(height: LATokens.space2),
        if (_recentSessions.isEmpty)
          const EmptyStateView(
            icon: Icons.timer_outlined,
            title: 'No sessions yet',
            message: 'Start a guided study session above to track your focused minutes.',
          )
        else
          ..._recentSessions.take(8).map((s) {
            final mins = ((s['timeFocused'] is num ? (s['timeFocused'] as num).toInt() : 0) / 60).round();
            return Padding(
              padding: const EdgeInsets.only(bottom: 8),
              child: LACard(
                padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                child: Row(
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${s['subject'] ?? ''} — ${s['topic'] ?? ''}', style: TextStyle(fontWeight: FontWeight.w600, color: c.text)),
                          Text('${s['status'] ?? 'active'} · $mins min focused', style: TextStyle(fontSize: LATokens.fsXs, color: c.textMuted)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            );
          }),
      ],
    );
  }

  Widget _buildActiveSession(LAColors c) {
    final objectives = (_plan!['objectives'] as List<dynamic>?) ?? [];
    final keyPoints = (_plan!['keyPoints'] as List<dynamic>?) ?? [];
    final practice = (_plan!['practiceQuestions'] as List<dynamic>?) ?? [];

    return ListView(
      padding: const EdgeInsets.all(LATokens.space4),
      children: [
        LACard(
          padding: const EdgeInsets.all(LATokens.space5),
          child: Column(
            children: [
              Text(
                (_plan!['title'] ?? '${_subjectCtrl.text} — ${_topicCtrl.text}').toString(),
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: LATokens.fsMd, fontWeight: FontWeight.w700, color: c.text),
              ),
              const SizedBox(height: LATokens.space3),
              Text(
                _formatTime(_remainingSeconds),
                style: TextStyle(
                  fontFamily: 'monospace',
                  fontSize: 44,
                  fontWeight: FontWeight.w700,
                  color: c.text,
                ),
              ),
              const SizedBox(height: LATokens.space4),
              Row(
                children: [
                  Expanded(
                    child: LAButton(
                      text: _running ? 'Pause' : 'Resume',
                      icon: _running ? Icons.pause_rounded : Icons.play_arrow_rounded,
                      type: ButtonType.secondary,
                      onPressed: () => _toggleTimer(),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: LAButton(
                      text: 'Finish & save',
                      icon: Icons.check_rounded,
                      onPressed: _completeSession,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
        if (objectives.isNotEmpty) ...[
          const SizedBox(height: LATokens.space4),
          const SectionHeader(icon: Icons.checklist_rounded, title: 'Objectives'),
          const SizedBox(height: 8),
          ...List.generate(objectives.length, (i) {
            final checked = _checkedObjectives.contains(i);
            return CheckboxListTile(
              value: checked,
              title: Text(objectives[i].toString(), style: TextStyle(fontSize: LATokens.fsSm, color: c.text)),
              contentPadding: EdgeInsets.zero,
              onChanged: (v) => setState(() {
                if (v == true) {
                  _checkedObjectives.add(i);
                } else {
                  _checkedObjectives.remove(i);
                }
              }),
            );
          }),
        ],
        if (keyPoints.isNotEmpty) ...[
          const SizedBox(height: LATokens.space3),
          const SectionHeader(icon: Icons.lightbulb_outline_rounded, title: 'Key points'),
          const SizedBox(height: 8),
          LACard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: keyPoints
                  .map((p) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text('• $p', style: TextStyle(fontSize: LATokens.fsSm, color: c.textSecondary, height: 1.4)),
                      ))
                  .toList(),
            ),
          ),
        ],
        if (practice.isNotEmpty) ...[
          const SizedBox(height: LATokens.space3),
          const SectionHeader(icon: Icons.quiz_outlined, title: 'Practice prompts'),
          const SizedBox(height: 8),
          LACard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: practice
                  .map((p) => Padding(
                        padding: const EdgeInsets.only(bottom: 6),
                        child: Text('• $p', style: TextStyle(fontSize: LATokens.fsSm, color: c.textSecondary, height: 1.4)),
                      ))
                  .toList(),
            ),
          ),
        ],
      ],
    );
  }
}
