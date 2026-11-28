import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_client.dart';
import '../services/arena_api.dart';
import '../services/arena_curriculum.dart';
import '../services/arena_progress.dart';
import '../services/auth_service.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_components.dart';
import '../widgets/markdown_math_text.dart';

class BattleScreen extends StatefulWidget {
  final String subjectKey;
  final Chapter chapter;
  final bool isBoss;
  final List<String>? allTopics;
  final void Function(bool passed, double score, ArenaProgress? progress) onComplete;

  const BattleScreen({
    super.key,
    required this.subjectKey,
    required this.chapter,
    this.isBoss = false,
    this.allTopics,
    required this.onComplete,
  });

  @override
  State<BattleScreen> createState() => _BattleScreenState();
}

class _BattleScreenState extends State<BattleScreen> {
  bool _loading = true;
  bool _submitting = false;
  String? _error;

  String? _sessionId;
  List<Map<String, dynamic>> _questions = [];
  int _idx = 0;
  int? _selected;
  bool _answered = false;
  bool _lastCorrect = false;
  String _explanation = '';
  int? _correctAnswerIdx;

  @override
  void initState() {
    super.initState();
    _start();
  }

  ArenaApi get _api => ArenaApi(ApiClient(context.read<AuthService>()));

  Future<void> _start() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final res = await _api.startBattle(
        subjectKey: widget.subjectKey,
        mode: widget.isBoss ? 'final_boss' : 'chapter',
        conceptId: widget.isBoss ? null : widget.chapter.conceptId,
        subject: widget.chapter.subject,
        name: widget.chapter.name,
        topic: widget.chapter.topic,
        topics: widget.allTopics,
      );
      final rawQs = (res['questions'] as List<dynamic>?) ?? [];
      if (rawQs.isEmpty) throw Exception('No questions returned for this battle.');
      if (!mounted) return;
      setState(() {
        _sessionId = res['sessionId']?.toString();
        _questions = rawQs.map((e) => Map<String, dynamic>.from(e as Map)).toList();
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

  Future<void> _selectOption(int choice) async {
    if (_answered || _submitting || _sessionId == null) return;
    setState(() {
      _selected = choice;
      _submitting = true;
    });
    try {
      final res = await _api.submitAnswer(
        subjectKey: widget.subjectKey,
        sessionId: _sessionId!,
        questionIndex: _idx,
        choice: choice,
      );
      if (!mounted) return;
      setState(() {
        _answered = true;
        _submitting = false;
        _lastCorrect = res['correct'] == true;
        _explanation = (res['explanation'] ?? '').toString();
        final ans = res['answer'];
        _correctAnswerIdx = ans is num ? ans.toInt() : int.tryParse('$ans');
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _submitting = false;
        _selected = null;
      });
      LAToast.show(context, 'Submit failed: $e', isError: true);
    }
  }

  Future<void> _nextOrFinish() async {
    if (_idx < _questions.length - 1) {
      setState(() {
        _idx++;
        _selected = null;
        _answered = false;
        _explanation = '';
        _correctAnswerIdx = null;
      });
      return;
    }

    if (_sessionId == null) return;
    setState(() => _submitting = true);
    try {
      final res = await _api.finishBattle(
        subjectKey: widget.subjectKey,
        sessionId: _sessionId!,
      );
      final passed = res['passed'] == true;
      final score = ((res['score'] ?? 0) as num).toDouble();
      ArenaProgress? prog;
      if (res['progress'] is Map) {
        prog = ArenaProgress.fromFirestore(Map<String, dynamic>.from(res['progress'] as Map));
      }
      if (!mounted) return;
      Navigator.pop(context);
      widget.onComplete(passed, score, prog);
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      LAToast.show(context, 'Finish failed: $e', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(widget.isBoss ? 'Final Boss' : widget.chapter.name),
      ),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : _error != null
              ? ErrorStateView(message: _error!, onRetry: _start)
              : SafeArea(
                  child: Padding(
                    padding: const EdgeInsets.all(LATokens.space4),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Question ${_idx + 1} of ${_questions.length}',
                              style: TextStyle(fontSize: LATokens.fsXs, fontWeight: FontWeight.w600, color: c.textMuted),
                            ),
                            Text(
                              widget.isBoss ? 'Boss' : widget.chapter.difficultyLabel,
                              style: TextStyle(fontSize: LATokens.fsXs, color: c.textMuted),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        ClipRRect(
                          borderRadius: BorderRadius.circular(LATokens.radiusFull),
                          child: LinearProgressIndicator(
                            value: (_idx + 1) / _questions.length,
                            backgroundColor: c.surfaceElevated,
                            color: c.accent,
                            minHeight: 5,
                          ),
                        ),
                        const SizedBox(height: LATokens.space4),
                        Expanded(
                          child: ListView(
                            children: [
                              MarkdownMathText(
                                text: (_questions[_idx]['q'] ?? '').toString(),
                                baseStyle: TextStyle(fontSize: LATokens.fsMd, fontWeight: FontWeight.w600, color: c.text, height: 1.45),
                              ),
                              const SizedBox(height: LATokens.space4),
                              ...List.generate(
                                ((_questions[_idx]['options'] as List<dynamic>?) ?? []).length,
                                (i) {
                                  final opts = _questions[_idx]['options'] as List<dynamic>;
                                  final letter = String.fromCharCode(65 + i);
                                  final isSel = _selected == i;
                                  final isRight = _answered && _correctAnswerIdx == i;
                                  final isWrong = _answered && isSel && !_lastCorrect;

                                  Color border = c.border;
                                  Color bg = c.surface;
                                  if (isRight) {
                                    border = c.green;
                                    bg = c.greenSoft;
                                  } else if (isWrong) {
                                    border = c.red;
                                    bg = c.redSoft;
                                  } else if (isSel) {
                                    border = c.accent;
                                    bg = c.accentSoft;
                                  }

                                  return Padding(
                                    padding: const EdgeInsets.only(bottom: 10),
                                    child: LACard(
                                      onTap: _answered || _submitting ? null : () => _selectOption(i),
                                      backgroundColor: bg,
                                      borderColor: border,
                                      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                                      child: Row(
                                        children: [
                                          Container(
                                            width: 28,
                                            height: 28,
                                            decoration: BoxDecoration(
                                              color: isSel ? c.accent : c.surfaceElevated,
                                              borderRadius: BorderRadius.circular(8),
                                            ),
                                            child: Center(
                                              child: Text(
                                                letter,
                                                style: TextStyle(
                                                  color: isSel ? Colors.white : c.textSecondary,
                                                  fontSize: LATokens.fsXs,
                                                  fontWeight: FontWeight.w700,
                                                ),
                                              ),
                                            ),
                                          ),
                                          const SizedBox(width: 12),
                                          Expanded(
                                            child: Text(
                                              opts[i].toString(),
                                              style: TextStyle(fontSize: LATokens.fsBase, color: c.text),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                  );
                                },
                              ),
                              if (_answered && _explanation.isNotEmpty) ...[
                                const SizedBox(height: 8),
                                Container(
                                  padding: const EdgeInsets.all(12),
                                  decoration: BoxDecoration(
                                    color: _lastCorrect ? c.greenSoft : c.redSoft,
                                    borderRadius: BorderRadius.circular(LATokens.radiusMd),
                                    border: Border.all(
                                      color: (_lastCorrect ? c.green : c.red).withValues(alpha: 0.35),
                                    ),
                                  ),
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        _lastCorrect ? 'Correct' : 'Incorrect',
                                        style: TextStyle(
                                          fontWeight: FontWeight.w700,
                                          fontSize: LATokens.fsXs,
                                          color: _lastCorrect ? c.green : c.red,
                                        ),
                                      ),
                                      const SizedBox(height: 4),
                                      MarkdownMathText(text: _explanation),
                                    ],
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const SizedBox(height: 12),
                        LAButton(
                          text: _idx == _questions.length - 1 ? 'Finish battle' : 'Next question',
                          loading: _submitting,
                          onPressed: _answered ? _nextOrFinish : null,
                        ),
                      ],
                    ),
                  ),
                ),
    );
  }
}
