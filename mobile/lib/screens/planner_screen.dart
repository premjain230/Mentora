import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../services/learning_service.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_components.dart';

class PlannerScreen extends StatefulWidget {
  const PlannerScreen({super.key});

  @override
  State<PlannerScreen> createState() => _PlannerScreenState();
}

class _PlannerScreenState extends State<PlannerScreen> with SingleTickerProviderStateMixin {
  late final TabController _tabs;
  bool _loading = true;
  bool _generating = false;
  bool _replanning = false;

  Map<String, dynamic>? _activePlan;
  List<Map<String, dynamic>> _tasks = [];
  Map<String, dynamic>? _progress;

  final _subjectsCtrl = TextEditingController(text: 'Physics, Chemistry, Mathematics');
  final _examTypeCtrl = TextEditingController(text: 'Board / Competitive');
  double _dailyHours = 2.0;

  @override
  void initState() {
    super.initState();
    _tabs = TabController(length: 4, vsync: this);
    _load();
  }

  @override
  void dispose() {
    _tabs.dispose();
    _subjectsCtrl.dispose();
    _examTypeCtrl.dispose();
    super.dispose();
  }

  LearningService get _svc => LearningService(ApiClient(context.read<AuthService>()));

  Future<void> _load() async {
    setState(() => _loading = true);
    try {
      final auth = context.read<AuthService>();
      final uid = auth.user?.uid;
      if (uid == null) {
        if (mounted) setState(() => _loading = false);
        return;
      }
      final fs = FirestoreService(auth);
      final plans = await fs.queryCollection(
        collectionId: 'studyPlans',
        whereField: 'userId',
        whereEquals: uid,
        limit: 5,
      ).catchError((_) => <Map<String, dynamic>>[]);
      final tasks = await fs.queryCollection(
        collectionId: 'tasks',
        whereField: 'userId',
        whereEquals: uid,
        limit: 100,
      ).catchError((_) => <Map<String, dynamic>>[]);
      final prog = await fs.getDoc('progress/$uid').catchError((_) => null);

      if (!mounted) return;
      setState(() {
        _activePlan = plans.isNotEmpty ? plans.first : null;
        _tasks = tasks;
        _progress = prog;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _generatePlan() async {
    final subs = _subjectsCtrl.text
        .split(',')
        .map((e) => e.trim())
        .where((e) => e.isNotEmpty)
        .toList();
    if (subs.isEmpty) {
      LAToast.show(context, 'Enter at least one subject', isError: true);
      return;
    }
    setState(() => _generating = true);
    try {
      final auth = context.read<AuthService>();
      final uid = auth.user?.uid;
      if (uid == null) throw Exception('Not signed in');
      final res = await _svc.generateStudyPlan(
        subjects: subs,
        dailyHours: _dailyHours,
        examType: _examTypeCtrl.text.trim(),
        startDate: DateTime.now().toIso8601String().split('T').first,
      );
      final plan = res['plan'] is Map ? Map<String, dynamic>.from(res['plan'] as Map) : res;
      final planId = 'plan_${DateTime.now().millisecondsSinceEpoch}';
      final now = DateTime.now().toUtc().toIso8601String();
      final fs = FirestoreService(auth);

      await fs.setDoc('studyPlans/$planId', {
        'planId': planId,
        'userId': uid,
        'title': '${_examTypeCtrl.text.trim()} Study Plan',
        'examType': plan['examType'] ?? _examTypeCtrl.text.trim(),
        'weeklyPlan': plan['weeklyPlan'] ?? [],
        'status': 'active',
        'createdAt': now,
        'updatedAt': now,
      });

      // Create tasks from weeklyPlan
      final weekly = (plan['weeklyPlan'] as List<dynamic>?) ?? [];
      int taskCounter = 0;
      for (final w in weekly.take(2)) {
        if (w is! Map) continue;
        final weekNum = w['week'] ?? 1;
        final wSubs = (w['subjects'] as List<dynamic>?) ?? [];
        for (final s in wSubs) {
          if (s is! Map) continue;
          final sName = (s['name'] ?? '').toString();
          final topics = (s['topics'] as List<dynamic>?) ?? [];
          for (final t in topics.take(3)) {
            final tId = 'task_${DateTime.now().millisecondsSinceEpoch}_${taskCounter++}';
            await fs.setDoc('tasks/$tId', {
              'taskId': tId,
              'planId': planId,
              'userId': uid,
              'week': weekNum,
              'day': (taskCounter % 7) + 1,
              'subject': sName,
              'topic': t.toString(),
              'durationMinutes': 45,
              'type': 'learn',
              'priority': 'medium',
              'status': 'pending',
              'scheduledDate': DateTime.now().add(Duration(days: taskCounter % 7)).toIso8601String().split('T').first,
              'createdAt': now,
              'updatedAt': now,
            });
          }
        }
      }

      if (mounted) {
        LAToast.show(context, 'Study plan generated', isSuccess: true);
        _load();
      }
    } catch (e) {
      if (mounted) LAToast.show(context, 'Failed to generate plan: $e', isError: true);
    } finally {
      if (mounted) setState(() => _generating = false);
    }
  }

  Future<void> _updateTaskStatus(Map<String, dynamic> task, String status) async {
    final auth = context.read<AuthService>();
    final uid = auth.user?.uid;
    final id = (task['_id'] ?? task['taskId'] ?? '').toString();
    if (uid == null || id.isEmpty) return;
    final now = DateTime.now().toUtc().toIso8601String();
    try {
      final fs = FirestoreService(auth);
      await fs.setDoc('tasks/$id', {
        'status': status,
        if (status == 'completed') 'completedAt': now,
        'updatedAt': now,
      });
      if (status == 'completed') {
        final prevDone = (_progress?['tasksCompleted'] is num) ? (_progress!['tasksCompleted'] as num).toInt() : 0;
        final prevMins = (_progress?['totalMinutesStudied'] is num) ? (_progress!['totalMinutesStudied'] as num).toInt() : 0;
        final dur = (task['durationMinutes'] is num) ? (task['durationMinutes'] as num).toInt() : 30;
        await fs.setDoc('progress/$uid', {
          'tasksCompleted': prevDone + 1,
          'totalMinutesStudied': prevMins + dur,
          'lastStudiedDate': DateTime.now().toIso8601String().split('T').first,
          'lastUpdated': now,
        });
      }
      _load();
    } catch (e) {
      if (mounted) LAToast.show(context, 'Update failed: $e', isError: true);
    }
  }

  Future<void> _replanMissed() async {
    final pending = _tasks.where((t) => t['status'] == 'pending').take(5).toList();
    if (pending.isEmpty) {
      LAToast.show(context, 'No pending tasks to replan');
      return;
    }
    setState(() => _replanning = true);
    try {
      final res = await _svc.replanMissedTasks(
        missedTasks: pending
            .map((t) => {
                  'subject': t['subject'] ?? '',
                  'topic': t['topic'] ?? '',
                  'durationMinutes': t['durationMinutes'] ?? 30,
                })
            .toList(),
        dailyHours: _dailyHours,
      );
      if (mounted) {
        LAToast.show(context, (res['message'] ?? 'Schedule adjusted').toString(), isSuccess: true);
      }
    } catch (e) {
      if (mounted) LAToast.show(context, 'Replan failed: $e', isError: true);
    } finally {
      if (mounted) setState(() => _replanning = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Study Planner'),
        actions: [
          if (_activePlan != null)
            IconButton(
              tooltip: 'AI Replan',
              icon: _replanning
                  ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2))
                  : const Icon(Icons.auto_fix_high_rounded),
              onPressed: _replanning ? null : _replanMissed,
            ),
        ],
        bottom: _activePlan == null
            ? null
            : TabBar(
                controller: _tabs,
                tabs: const [
                  Tab(text: 'Today'),
                  Tab(text: 'Weekly'),
                  Tab(text: 'Progress'),
                  Tab(text: 'New Plan'),
                ],
              ),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _activePlan == null
              ? _buildCreatePlanForm(c)
              : TabBarView(
                  controller: _tabs,
                  children: [
                    _buildTasksTab(c),
                    _buildWeeklyTab(c),
                    _buildProgressTab(c),
                    _buildCreatePlanForm(c),
                  ],
                ),
    );
  }

  Widget _buildTasksTab(LAColors c) {
    if (_tasks.isEmpty) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(24),
          child: EmptyStateView(
            icon: Icons.task_alt_rounded,
            title: 'No tasks scheduled',
            message: 'Generate a new plan to populate your daily study tasks.',
          ),
        ),
      );
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.builder(
        padding: const EdgeInsets.all(LATokens.space4),
        itemCount: _tasks.length,
        itemBuilder: (_, i) {
          final t = _tasks[i];
          final done = t['status'] == 'completed';
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: LACard(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
              child: Row(
                children: [
                  Checkbox(
                    value: done,
                    onChanged: (_) => _updateTaskStatus(t, done ? 'pending' : 'completed'),
                  ),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          (t['topic'] ?? 'Study Task').toString(),
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: done ? c.textMuted : c.text,
                            decoration: done ? TextDecoration.lineThrough : null,
                          ),
                        ),
                        Text(
                          '${t['subject'] ?? ''} · ${t['durationMinutes'] ?? 30}m · ${t['scheduledDate'] ?? ''}',
                          style: TextStyle(fontSize: LATokens.fsXs, color: c.textMuted),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildWeeklyTab(LAColors c) {
    final weekly = (_activePlan?['weeklyPlan'] as List<dynamic>?) ?? [];
    if (weekly.isEmpty) {
      return const Center(child: Text('No weekly breakdown available.'));
    }
    return ListView.builder(
      padding: const EdgeInsets.all(LATokens.space4),
      itemCount: weekly.length,
      itemBuilder: (_, i) {
        final w = weekly[i] as Map;
        final subs = (w['subjects'] as List<dynamic>?) ?? [];
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: LACard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Week ${w['week'] ?? i + 1}: ${w['title'] ?? ''}',
                  style: TextStyle(fontWeight: FontWeight.w700, color: c.text),
                ),
                if (w['focus'] != null) ...[
                  const SizedBox(height: 4),
                  Text(w['focus'].toString(), style: TextStyle(fontSize: LATokens.fsXs, color: c.textSecondary)),
                ],
                const SizedBox(height: 10),
                ...subs.map((s) {
                  if (s is! Map) return const SizedBox.shrink();
                  final topics = (s['topics'] as List<dynamic>?)?.join(', ') ?? '';
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 6),
                    child: Text(
                      '• ${s['name']}: $topics',
                      style: TextStyle(fontSize: LATokens.fsSm, color: c.text),
                    ),
                  );
                }),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildProgressTab(LAColors c) {
    final completed = _tasks.where((t) => t['status'] == 'completed').length;
    final total = _tasks.length;
    final mins = (_progress?['totalMinutesStudied'] is num) ? (_progress!['totalMinutesStudied'] as num).toInt() : 0;
    final streak = (_progress?['currentStreak'] is num) ? (_progress!['currentStreak'] as num).toInt() : 0;

    return ListView(
      padding: const EdgeInsets.all(LATokens.space4),
      children: [
        Row(
          children: [
            Expanded(child: StatTile(label: 'Completed', value: '$completed/$total', icon: Icons.check_circle_outline_rounded, color: c.green)),
            const SizedBox(width: 8),
            Expanded(child: StatTile(label: 'Minutes', value: '$mins', icon: Icons.timer_outlined, color: c.accent)),
            const SizedBox(width: 8),
            Expanded(child: StatTile(label: 'Streak', value: '${streak}d', icon: Icons.local_fire_department_rounded, color: c.amber)),
          ],
        ),
      ],
    );
  }

  Widget _buildCreatePlanForm(LAColors c) {
    return ListView(
      padding: const EdgeInsets.all(LATokens.space4),
      children: [
        Text('Create AI Study Plan', style: TextStyle(fontSize: LATokens.fsLg, fontWeight: FontWeight.w700, color: c.text)),
        const SizedBox(height: 6),
        Text('Generates a week-by-week schedule grounded in your curriculum.', style: TextStyle(fontSize: LATokens.fsSm, color: c.textSecondary)),
        const SizedBox(height: LATokens.space4),
        LAInput(label: 'Subjects (comma separated)', controller: _subjectsCtrl),
        const SizedBox(height: LATokens.space3),
        LAInput(label: 'Exam / Track', controller: _examTypeCtrl),
        const SizedBox(height: LATokens.space4),
        Text('Daily hours: ${_dailyHours.toStringAsFixed(1)}h', style: TextStyle(fontWeight: FontWeight.w600, color: c.text)),
        Slider(
          value: _dailyHours,
          min: 1,
          max: 8,
          divisions: 14,
          onChanged: (v) => setState(() => _dailyHours = v),
        ),
        const SizedBox(height: LATokens.space4),
        LAButton(
          text: 'Generate study plan',
          loading: _generating,
          onPressed: _generatePlan,
        ),
      ],
    );
  }
}
