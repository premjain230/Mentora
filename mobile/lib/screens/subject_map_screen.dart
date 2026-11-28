import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_client.dart';
import '../services/arena_api.dart';
import '../services/arena_curriculum.dart';
import '../services/arena_progress.dart';
import '../services/auth_service.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_components.dart';
import '../widgets/chapter_node.dart';
import 'battle_screen.dart';

class SubjectMapScreen extends StatefulWidget {
  final ArenaTrack track;
  final int? classNum;
  final String subject;

  const SubjectMapScreen({
    super.key,
    required this.track,
    required this.classNum,
    required this.subject,
  });

  @override
  State<SubjectMapScreen> createState() => _SubjectMapScreenState();
}

class _SubjectMapScreenState extends State<SubjectMapScreen> {
  late List<Chapter> _chapters;
  ArenaProgress? _progress;
  bool _loading = true;
  String? _error;
  String _query = '';

  String get _subjectKey => toSubjectKey(widget.track.id, widget.subject, widget.classNum);

  @override
  void initState() {
    super.initState();
    _chapters = getChapters(widget.track.id, widget.subject, widget.classNum);
    _init();
  }

  Future<void> _init() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final auth = context.read<AuthService>();
      final api = ArenaApi(ApiClient(auth));
      final j = await api.initProgress(
        subjectKey: _subjectKey,
        trackId: widget.track.id,
        subject: widget.subject,
        classNum: widget.classNum,
        chapters: _chapters
            .map((c) => {'conceptId': c.conceptId, 'prerequisites': c.prerequisites})
            .toList(),
      );
      if (!mounted) return;
      final progMap = Map<String, dynamic>.from((j['progress'] ?? j) as Map);
      setState(() {
        _progress = ArenaProgress.fromFirestore(progMap);
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _error = e.toString();
        _loading = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    if (_loading) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.subject)),
        body: const Center(child: CircularProgressIndicator()),
      );
    }
    if (_error != null) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.subject)),
        body: ErrorStateView(message: _error!, onRetry: _init),
      );
    }
    if (_progress == null || _chapters.isEmpty) {
      return Scaffold(
        appBar: AppBar(title: Text(widget.subject)),
        body: const Center(
          child: EmptyStateView(
            icon: Icons.school_outlined,
            title: 'No curriculum available',
            message: 'Chapters for this subject are not available yet.',
          ),
        ),
      );
    }

    final computed = computeProgress(_progress!, _chapters);
    _progress = computed;
    final filtered = _query.isEmpty
        ? _chapters
        : _chapters
            .where((ch) =>
                ch.name.toLowerCase().contains(_query.toLowerCase()) ||
                ch.topic.toLowerCase().contains(_query.toLowerCase()))
            .toList();

    return Scaffold(
      appBar: AppBar(
        title: Text(widget.subject),
        actions: [
          if (computed.currentChapterId != null)
            TextButton(
              onPressed: () => _openChapter(computed.currentChapterId!),
              child: Text('Resume', style: TextStyle(color: c.accent, fontWeight: FontWeight.w600)),
            ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: Row(
              children: [
                Text(
                  '${computed.progressPct}% complete',
                  style: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w600, color: c.text),
                ),
                const Spacer(),
                Text(
                  '${computed.defeated} / ${computed.total} chapters',
                  style: TextStyle(fontSize: LATokens.fsXs, color: c.textMuted),
                ),
              ],
            ),
          ),
          LinearProgressIndicator(
            value: computed.progressPct / 100,
            backgroundColor: c.surfaceElevated,
            color: c.accent,
            minHeight: 4,
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: LAInput(
              hint: 'Search chapters...',
              prefixIcon: Icons.search_rounded,
              onChanged: (v) => setState(() => _query = v),
            ),
          ),
          Expanded(
            child: RefreshIndicator(
              onRefresh: _init,
              child: ListView.builder(
                padding: const EdgeInsets.fromLTRB(16, 4, 16, 24),
                itemCount: filtered.length + 1,
                itemBuilder: (_, i) {
                  if (i == filtered.length) {
                    final bossUnlocked = computed.finalBossUnlocked;
                    final bossDefeated = computed.finalBossDefeated;
                    return Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: LACard(
                        onTap: bossDefeated
                            ? _showComplete
                            : bossUnlocked
                                ? _startBoss
                                : () => LAToast.show(context, 'Defeat all chapters to unlock Final Boss'),
                        borderColor: bossUnlocked ? c.amber.withValues(alpha: 0.5) : c.border,
                        backgroundColor: bossUnlocked ? c.amberSoft : c.surface,
                        padding: const EdgeInsets.all(14),
                        child: Row(
                          children: [
                            Container(
                              width: 42,
                              height: 42,
                              decoration: BoxDecoration(
                                color: bossUnlocked ? c.amber : c.surfaceElevated,
                                borderRadius: BorderRadius.circular(LATokens.radiusMd),
                              ),
                              child: Icon(
                                Icons.workspace_premium_rounded,
                                color: bossUnlocked ? Colors.white : c.textMuted,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    bossDefeated ? 'Subject Complete' : 'Final Boss',
                                    style: TextStyle(fontWeight: FontWeight.w700, fontSize: LATokens.fsMd, color: c.text),
                                  ),
                                  Text(
                                    bossDefeated
                                        ? 'You conquered ${widget.subject}'
                                        : bossUnlocked
                                            ? 'Comprehensive 8-question challenge'
                                            : 'Defeat all ${widget.subject} chapters first',
                                    style: TextStyle(color: c.textSecondary, fontSize: LATokens.fsXs),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }
                  final ch = filtered[i];
                  final p = computed.chapters[ch.conceptId];
                  final isCurrent = computed.currentChapterId == ch.conceptId;
                  return Padding(
                    padding: const EdgeInsets.only(bottom: 2),
                    child: Column(
                      children: [
                        ChapterNode(
                          chapter: ch,
                          progress: p,
                          isCurrent: isCurrent,
                          onTap: () => _openChapter(ch.conceptId),
                        ),
                        if (i != filtered.length - 1)
                          Container(
                            width: 2,
                            height: 12,
                            color: (p?.state == ArenaState.defeated || p?.state == ArenaState.mastered)
                                ? c.green
                                : c.borderSubtle,
                          ),
                      ],
                    ),
                  );
                },
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _openChapter(String conceptId) {
    final c = LAColors.of(context);
    final ch = _chapters.firstWhere((item) => item.conceptId == conceptId);
    final p = _progress!.chapters[conceptId];
    final can = canBattle(ch, _progress!);

    showModalBottomSheet(
      context: context,
      builder: (_) => Padding(
        padding: const EdgeInsets.all(LATokens.space5),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(ch.name, style: TextStyle(fontWeight: FontWeight.w700, fontSize: LATokens.fsLg, color: c.text)),
            const SizedBox(height: 2),
            Text('${ch.topic} · ${ch.difficultyLabel}', style: TextStyle(color: c.textSecondary, fontSize: LATokens.fsXs)),
            const SizedBox(height: 12),
            Row(
              children: [
                Chip(label: Text((p?.state ?? 'locked').toUpperCase())),
                const SizedBox(width: 8),
                Chip(label: Text('${((p?.bestScore ?? 0) * 100).round()}% best')),
              ],
            ),
            if (!can) ...[
              const SizedBox(height: 10),
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: c.redSoft,
                  borderRadius: BorderRadius.circular(LATokens.radiusMd),
                ),
                child: Row(
                  children: [
                    Icon(Icons.lock_outline_rounded, size: 16, color: c.red),
                    const SizedBox(width: 8),
                    Expanded(
                      child: Text(
                        'Locked — defeat the previous chapter first.',
                        style: TextStyle(color: c.red, fontSize: LATokens.fsXs),
                      ),
                    ),
                  ],
                ),
              ),
            ],
            const SizedBox(height: 16),
            LAButton(
              text: can ? 'Enter battle' : 'Locked',
              icon: can ? Icons.bolt_rounded : Icons.lock_outline_rounded,
              onPressed: can
                  ? () {
                      Navigator.pop(context);
                      _startBattle(ch);
                    }
                  : null,
            ),
          ],
        ),
      ),
    );
  }

  void _startBattle(Chapter ch) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => BattleScreen(
          subjectKey: _subjectKey,
          chapter: ch,
          onComplete: (passed, score, updatedProgress) {
            if (updatedProgress != null && mounted) {
              setState(() => _progress = updatedProgress);
            } else {
              _init();
            }
            if (mounted) {
              LAToast.show(
                context,
                passed
                    ? 'Chapter defeated! ${(score * 100).round()}%'
                    : 'Keep practicing! ${(score * 100).round()}% (need 60%)',
                isSuccess: passed,
              );
            }
          },
        ),
      ),
    );
  }

  void _startBoss() {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (_) => BattleScreen(
          subjectKey: _subjectKey,
          chapter: Chapter(
            conceptId: 'final_boss',
            name: 'Final Boss',
            topic: widget.subject,
            subject: widget.subject,
            difficulty: 0.9,
            difficultyLabel: 'Boss',
            prerequisites: const [],
            curriculumPaths: const [],
          ),
          isBoss: true,
          allTopics: _chapters.map((e) => e.name).take(12).toList(),
          onComplete: (passed, score, updatedProgress) {
            if (updatedProgress != null && mounted) {
              setState(() => _progress = updatedProgress);
            } else {
              _init();
            }
            if (mounted) {
              LAToast.show(
                context,
                passed ? 'Subject Complete! ${(score * 100).round()}%' : 'Need 70% — ${(score * 100).round()}%',
                isSuccess: passed,
              );
            }
          },
        ),
      ),
    );
  }

  void _showComplete() {
    showDialog(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Subject Complete'),
        content: Text('You conquered ${widget.subject} (${_progress!.defeated}/${_progress!.total} chapters).'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
        ],
      ),
    );
  }
}
