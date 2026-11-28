import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../services/learning_service.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_components.dart';
import '../widgets/markdown_math_text.dart';
import 'chat_screen.dart';

class LearningHubScreen extends StatefulWidget {
  final String? initialConceptId;

  const LearningHubScreen({super.key, this.initialConceptId});

  @override
  State<LearningHubScreen> createState() => _LearningHubScreenState();
}

class _LearningHubScreenState extends State<LearningHubScreen> {
  static const _countries = [
    {'code': 'IN', 'name': 'India'},
    {'code': 'US', 'name': 'USA'},
    {'code': 'GB', 'name': 'UK'},
    {'code': 'CA', 'name': 'Canada'},
    {'code': 'AU', 'name': 'Australia'},
    {'code': 'SG', 'name': 'Singapore'},
    {'code': 'AE', 'name': 'UAE'},
    {'code': 'NZ', 'name': 'New Zealand'},
    {'code': 'SA', 'name': 'Saudi Arabia'},
    {'code': 'MY', 'name': 'Malaysia'},
    {'code': 'PK', 'name': 'Pakistan'},
    {'code': 'BD', 'name': 'Bangladesh'},
    {'code': 'ZA', 'name': 'South Africa'},
    {'code': 'NG', 'name': 'Nigeria'},
    {'code': 'IE', 'name': 'Ireland'},
  ];

  static const _stages = [
    'Understand',
    'Explain',
    'Visualize',
    'Practice',
    'Evaluate',
    'Adapt',
    'Remember',
  ];

  final _searchCtrl = TextEditingController();
  final _answerCtrl = TextEditingController();

  bool _loading = true;
  String? _error;

  String _country = 'IN';
  String? _track;
  int? _classNum;
  String? _subject;
  String? _conceptId;
  String? _chapterName;

  List<Map<String, dynamic>> _tracks = [];
  List<int> _classes = [];
  List<String> _subjects = [];
  List<Map<String, dynamic>> _chapters = [];
  List<Map<String, dynamic>> _searchResults = [];
  Map<String, dynamic>? _continueTopic;

  // Lesson & 7-stage state
  bool _inLesson = false;
  bool _loadingLesson = false;
  int _stageIndex = 0;
  Map<String, dynamic>? _chapterOutline;
  Map<String, dynamic>? _lesson;
  Map<String, dynamic>? _evaluation;
  bool _evaluating = false;
  String _strategy = 'step_by_step';

  @override
  void initState() {
    super.initState();
    if (widget.initialConceptId != null) {
      _openConcept(widget.initialConceptId!, widget.initialConceptId!);
    } else {
      _loadInitial();
    }
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    _answerCtrl.dispose();
    super.dispose();
  }

  LearningService get _svc => LearningService(ApiClient(context.read<AuthService>()));

  Future<void> _loadInitial() async {
    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final auth = context.read<AuthService>();
      final uid = auth.user?.uid;
      if (uid != null) {
        final fs = FirestoreService(auth);
        final hubDoc = await fs.getDoc('users/$uid/learning/learningHub').catchError((_) => null);
        if (hubDoc != null && hubDoc['last'] is Map) {
          _continueTopic = Map<String, dynamic>.from(hubDoc['last'] as Map);
        }
        final prof = await fs.getDoc('users/$uid/learning/profile').catchError((_) => null);
        if (prof != null && prof['country'] != null) {
          _country = prof['country'].toString();
        }
      }
      await _loadCatalog();
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  Future<void> _loadCatalog() async {
    setState(() {
      _loading = true;
      _error = null;
      _searchResults = [];
    });
    try {
      final res = await _svc.fetchCatalog(
        countryCode: _country,
        track: _track,
        classNum: _classNum,
        subject: _subject,
      );
      final catalog = (res['catalog'] as Map<String, dynamic>?) ?? {};
      final tracksRaw = (catalog['tracks'] as List<dynamic>?) ?? [];
      final classesRaw = (catalog['classes'] as List<dynamic>?) ?? [];
      final subjectsRaw = (catalog['subjects'] as List<dynamic>?) ?? [];
      final chaptersRaw = (catalog['chapters'] as List<dynamic>?) ?? [];

      if (!mounted) return;
      setState(() {
        if (tracksRaw.isNotEmpty) {
          _tracks = tracksRaw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        }
        _classes = classesRaw
            .map((e) => e is num ? e.toInt() : int.tryParse(e.toString()) ?? 0)
            .where((e) => e > 0)
            .toList();
        _subjects = subjectsRaw
            .map((e) => e is Map ? (e['name'] ?? e['subject'] ?? e['id'] ?? '').toString() : e.toString())
            .where((s) => s.isNotEmpty)
            .toList();
        _chapters = chaptersRaw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        _loading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = e.toString();
          _loading = false;
        });
      }
    }
  }

  Future<void> _runGlobalSearch(String query) async {
    final q = query.trim();
    if (q.isEmpty) {
      setState(() => _searchResults = []);
      return;
    }
    setState(() => _loading = true);
    try {
      final res = await _svc.fetchCatalog(
        countryCode: _country,
        query: q,
        globalSearch: true,
      );
      final raw = (res['searchResults'] as List<dynamic>?) ??
          (res['catalog']?['chapters'] as List<dynamic>?) ??
          [];
      if (!mounted) return;
      setState(() {
        _searchResults = raw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
        _loading = false;
      });
    } catch (e) {
      if (mounted) {
        setState(() => _loading = false);
        LAToast.show(context, 'Search failed: $e', isError: true);
      }
    }
  }

  Future<void> _openConcept(String conceptId, String name, {String? subject}) async {
    setState(() {
      _inLesson = true;
      _loadingLesson = true;
      _conceptId = conceptId;
      _chapterName = name;
      if (subject != null) _subject = subject;
      _stageIndex = 0;
      _evaluation = null;
      _answerCtrl.clear();
    });

    try {
      final results = await Future.wait([
        _svc.fetchChapter(conceptId).catchError((_) => <String, dynamic>{}),
        _svc.fetchLesson(
          conceptId: conceptId,
          track: _track,
          classNum: _classNum,
          subject: _subject,
          stageIndex: 0,
          strategy: _strategy,
        ),
      ]);

      final chRes = results[0];
      final lessonRes = results[1];

      if (!mounted) return;
      // Save continue state in Firestore
      final auth = context.read<AuthService>();
      final uid = auth.user?.uid;
      if (uid != null) {
        final fs = FirestoreService(auth);
        final now = DateTime.now().toUtc().toIso8601String();
        fs.setDoc('users/$uid/learning/learningHub', {
          'last': {
            'conceptId': conceptId,
            'name': name,
            'subject': _subject ?? '',
            'updatedAt': now,
          },
          'updatedAt': now,
        }).catchError((_) {});
      }

      if (!mounted) return;
      setState(() {
        _chapterOutline = chRes['chapter'] is Map
            ? Map<String, dynamic>.from(chRes['chapter'] as Map)
            : null;
        _lesson = lessonRes['lesson'] is Map
            ? Map<String, dynamic>.from(lessonRes['lesson'] as Map)
            : lessonRes;
        _loadingLesson = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadingLesson = false);
      LAToast.show(context, 'Failed to load lesson: $e', isError: true);
    }
  }

  Future<void> _loadStage(int idx, {String mode = 'start'}) async {
    if (_conceptId == null) return;
    setState(() {
      _stageIndex = idx;
      _loadingLesson = true;
      _evaluation = null;
    });
    try {
      final res = await _svc.fetchLesson(
        conceptId: _conceptId!,
        track: _track,
        classNum: _classNum,
        subject: _subject,
        mode: mode,
        stageIndex: idx,
        strategy: _strategy,
      );
      if (!mounted) return;
      setState(() {
        _lesson = res['lesson'] is Map
            ? Map<String, dynamic>.from(res['lesson'] as Map)
            : res;
        _loadingLesson = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loadingLesson = false);
      LAToast.show(context, 'Failed to load stage: $e', isError: true);
    }
  }

  Future<void> _submitEvaluation(String question, String? cacheKey) async {
    final ans = _answerCtrl.text.trim();
    if (ans.isEmpty || _conceptId == null) {
      LAToast.show(context, 'Enter your answer first', isError: true);
      return;
    }
    setState(() => _evaluating = true);
    try {
      final res = await _svc.evaluateAnswer(
        conceptId: _conceptId!,
        answer: ans,
        question: question,
        track: _track,
        classNum: _classNum,
        subject: _subject,
        cacheKey: cacheKey,
      );
      if (!mounted) return;
      setState(() {
        _evaluation = res['evaluation'] is Map
            ? Map<String, dynamic>.from(res['evaluation'] as Map)
            : res;
        _evaluating = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _evaluating = false);
      LAToast.show(context, 'Evaluation error: $e', isError: true);
    }
  }

  void _navigateBackInCatalog() {
    if (_inLesson) {
      setState(() {
        _inLesson = false;
        _lesson = null;
        _evaluation = null;
      });
      return;
    }
    if (_subject != null) {
      setState(() {
        _subject = null;
        _chapters = [];
      });
      _loadCatalog();
    } else if (_classNum != null) {
      setState(() {
        _classNum = null;
        _subjects = [];
      });
      _loadCatalog();
    } else if (_track != null) {
      setState(() {
        _track = null;
        _classes = [];
        _subjects = [];
        _chapters = [];
      });
      _loadCatalog();
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    final canGoUp = _inLesson || _subject != null || _classNum != null || _track != null;

    return Scaffold(
      appBar: AppBar(
        leading: canGoUp
            ? IconButton(
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: _navigateBackInCatalog,
              )
            : null,
        title: Text(_inLesson ? (_chapterName ?? 'Lesson') : 'Learning Hub'),
        actions: [
          if (_inLesson && _conceptId != null)
            IconButton(
              tooltip: 'Ask AI Tutor',
              icon: const Icon(Icons.chat_bubble_outline_rounded),
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => ChatScreen(
                      initialConceptId: _conceptId,
                      initialPrompt: 'Help me understand $_chapterName',
                    ),
                  ),
                );
              },
            ),
        ],
      ),
      body: _inLesson ? _buildLessonView(c) : _buildCatalogView(c),
    );
  }

  Widget _buildCatalogView(LAColors c) {
    return ListView(
      padding: LALayout.pagePadding(context, top: 8, bottom: 32),
      children: [
        // Global curriculum search
        LASearchField(
          controller: _searchCtrl,
          hint: 'Search any topic, chapter, or subject...',
          onSubmitted: _runGlobalSearch,
          onClear: () => setState(() => _searchResults = []),
        ),
        const SizedBox(height: LATokens.space3),

        // Country chips
        SizedBox(
          height: 36,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: _countries.length,
            separatorBuilder: (_, __) => const SizedBox(width: 6),
            itemBuilder: (_, i) {
              final co = _countries[i];
              final selected = _country == co['code'];
              return ChoiceChip(
                label: Text(co['name']!),
                selected: selected,
                onSelected: (_) {
                  setState(() {
                    _country = co['code']!;
                    _track = null;
                    _classNum = null;
                    _subject = null;
                    _chapters = [];
                  });
                  _loadCatalog();
                },
              );
            },
          ),
        ),
        const SizedBox(height: LATokens.space4),

        // Continue card
        if (_continueTopic != null && _track == null && _searchResults.isEmpty) ...[
          LACard(
            onTap: () => _openConcept(
              (_continueTopic!['conceptId'] ?? '').toString(),
              (_continueTopic!['name'] ?? 'Continue').toString(),
              subject: _continueTopic!['subject']?.toString(),
            ),
            borderColor: c.accent.withValues(alpha: 0.45),
            backgroundColor: c.accentSoft,
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
            child: Row(
              children: [
                Icon(Icons.play_circle_filled_rounded, size: 22, color: c.accent),
                const SizedBox(width: LATokens.space3),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Continue learning', style: TextStyle(fontSize: LATokens.fsXs, fontWeight: FontWeight.w600, color: c.accent)),
                      Text(
                        (_continueTopic!['name'] ?? '').toString(),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: TextStyle(fontSize: LATokens.fsBase, fontWeight: FontWeight.w600, color: c.text),
                      ),
                    ],
                  ),
                ),
                Icon(Icons.chevron_right_rounded, color: c.accent),
              ],
            ),
          ),
          const SizedBox(height: LATokens.space4),
        ],

        if (_loading)
          const Padding(
            padding: EdgeInsets.all(40),
            child: Center(child: CircularProgressIndicator()),
          )
        else if (_error != null)
          ErrorStateView(message: _error!, onRetry: _loadCatalog)
        else if (_searchResults.isNotEmpty) ...[
          SectionHeader(title: 'Search results (${_searchResults.length})'),
          const SizedBox(height: LATokens.space2),
          LAGroupedList(
            children: _searchResults.map((ch) => _chapterRow(c, ch)).toList(),
          ),
        ] else if (_chapters.isNotEmpty) ...[
          SectionHeader(title: '${_subject ?? 'Chapters'} (${_chapters.length})'),
          const SizedBox(height: LATokens.space2),
          LAGroupedList(
            children: _chapters.map((ch) => _chapterRow(c, ch)).toList(),
          ),
        ] else if (_subjects.isNotEmpty) ...[
          const SectionHeader(title: 'Select a subject'),
          const SizedBox(height: LATokens.space2),
          LAGroupedList(
            children: _subjects.map((s) {
              return LAListRow(
                title: s,
                subtitle: 'Explore chapters',
                onTap: () {
                  setState(() => _subject = s);
                  _loadCatalog();
                },
              );
            }).toList(),
          ),
        ] else if (_classes.isNotEmpty && _classNum == null) ...[
          const SectionHeader(title: 'Select class or grade'),
          const SizedBox(height: LATokens.space2),
          LAGroupedList(
            children: _classes.map((cls) {
              return LAListRow(
                title: 'Class $cls',
                onTap: () {
                  setState(() => _classNum = cls);
                  _loadCatalog();
                },
              );
            }).toList(),
          ),
        ] else ...[
          const SectionHeader(title: 'Choose your curriculum'),
          const SizedBox(height: LATokens.space2),
          if (_tracks.isEmpty)
            EmptyStateView(
              icon: Icons.school_outlined,
              title: 'No tracks loaded',
              message: 'Pull to refresh or try another country.',
              actionLabel: 'Retry',
              onAction: _loadCatalog,
            )
          else
            LAGroupedList(
              children: _tracks.map((t) {
                final id = (t['id'] ?? t['trackId'] ?? '').toString();
                final name = (t['name'] ?? t['label'] ?? id).toString();
                final desc = (t['description'] ?? t['subtitle'] ?? '').toString();
                return LAListRow(
                  icon: Icons.auto_stories_outlined,
                  iconColor: c.accent,
                  title: name,
                  subtitle: desc.isNotEmpty ? desc : null,
                  onTap: () {
                    setState(() {
                      _track = id;
                      _classNum = null;
                      _subject = null;
                    });
                    _loadCatalog();
                  },
                );
              }).toList(),
            ),
        ],
      ],
    );
  }

  Widget _chapterRow(LAColors c, Map<String, dynamic> ch) {
    final id = (ch['conceptId'] ?? ch['id'] ?? '').toString();
    final name = (ch['name'] ?? ch['title'] ?? ch['topic'] ?? id).toString();
    final sub = (ch['subject'] ?? ch['topic'] ?? '').toString();
    return LAListRow(
      title: name,
      subtitle: sub.isNotEmpty ? sub : null,
      onTap: () => _openConcept(id, name, subject: sub.isNotEmpty ? sub : null),
    );
  }

  Widget _buildLessonView(LAColors c) {
    final lesson = _lesson ?? {};
    final explanation = (lesson['explanation'] ??
            lesson['content'] ??
            lesson['summary'] ??
            lesson['coreIdea'] ??
            '')
        .toString();
    final keyIdea = (lesson['keyIdea'] ?? lesson['coreConcept'] ?? '').toString();
    final example = (lesson['workedExample'] ?? lesson['example'] ?? '').toString();
    final checkQ = lesson['check'] is Map
        ? (lesson['check']['question'] ?? lesson['check']['prompt'] ?? '').toString()
        : (lesson['practiceQuestion'] ?? '').toString();
    final cacheKey = lesson['cacheKey']?.toString();
    final subConcepts = (_chapterOutline?['subConcepts'] as List<dynamic>?) ?? [];

    return Column(
      children: [
        // 7-stage horizontal rail
        Container(
          height: 46,
          decoration: BoxDecoration(
            color: c.surface,
            border: Border(bottom: BorderSide(color: c.border)),
          ),
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
            itemCount: _stages.length,
            separatorBuilder: (_, __) => const SizedBox(width: 6),
            itemBuilder: (_, i) {
              final active = i == _stageIndex;
              return InkWell(
                borderRadius: BorderRadius.circular(LATokens.radiusFull),
                onTap: () => _loadStage(i),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                  decoration: BoxDecoration(
                    color: active ? c.accent : c.surfaceElevated,
                    borderRadius: BorderRadius.circular(LATokens.radiusFull),
                  ),
                  child: Text(
                    '${i + 1}. ${_stages[i]}',
                    style: TextStyle(
                      fontSize: LATokens.fsXs,
                      fontWeight: FontWeight.w600,
                      color: active ? Colors.white : c.textSecondary,
                    ),
                  ),
                ),
              );
            },
          ),
        ),

        Expanded(
          child: _loadingLesson
              ? const Center(child: CircularProgressIndicator())
              : ListView(
                  padding: const EdgeInsets.all(LATokens.space4),
                  children: [
                    // Teaching strategy bar
                    Row(
                      children: [
                        Text('Style:', style: TextStyle(fontSize: LATokens.fsXs, color: c.textMuted)),
                        const SizedBox(width: 8),
                        Expanded(
                          child: SingleChildScrollView(
                            scrollDirection: Axis.horizontal,
                            child: Row(
                              children: [
                                ('step_by_step', 'Step-by-step'),
                                ('analogy', 'Analogy'),
                                ('visual', 'Visual'),
                                ('exam_focused', 'Exam focus'),
                              ].map((s) {
                                final sel = _strategy == s.$1;
                                return Padding(
                                  padding: const EdgeInsets.only(right: 6),
                                  child: ChoiceChip(
                                    label: Text(s.$2),
                                    selected: sel,
                                    onSelected: (_) {
                                      setState(() => _strategy = s.$1);
                                      _loadStage(_stageIndex, mode: 'reteach');
                                    },
                                  ),
                                );
                              }).toList(),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: LATokens.space3),

                    if (keyIdea.isNotEmpty) ...[
                      LACard(
                        backgroundColor: c.accentSoft,
                        borderColor: c.accent.withValues(alpha: 0.3),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('KEY IDEA', style: TextStyle(fontSize: LATokens.fsXs, fontWeight: FontWeight.w700, color: c.accent)),
                            const SizedBox(height: 6),
                            MarkdownMathText(text: keyIdea),
                          ],
                        ),
                      ),
                      const SizedBox(height: LATokens.space3),
                    ],

                    if (explanation.isNotEmpty) ...[
                      Padding(
                        padding: const EdgeInsets.symmetric(vertical: 4),
                        child: MarkdownMathText(
                          text: explanation,
                          baseStyle: LATypo.educational(c),
                        ),
                      ),
                      const SizedBox(height: LATokens.space4),
                    ],

                    if (example.isNotEmpty) ...[
                      LACard(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('Worked Example', style: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w700, color: c.text)),
                            const SizedBox(height: 8),
                            MarkdownMathText(text: example),
                          ],
                        ),
                      ),
                      const SizedBox(height: LATokens.space3),
                    ],

                    if (subConcepts.isNotEmpty) ...[
                      const SectionHeader(icon: Icons.account_tree_outlined, title: 'Chapter concepts'),
                      const SizedBox(height: LATokens.space2),
                      Wrap(
                        spacing: 6,
                        runSpacing: 6,
                        children: subConcepts.map((sc) {
                          final label = sc is Map ? (sc['title'] ?? sc['name'] ?? '').toString() : sc.toString();
                          return Chip(label: Text(label, style: TextStyle(fontSize: LATokens.fsXs, color: c.text)));
                        }).toList(),
                      ),
                      const SizedBox(height: LATokens.space3),
                    ],

                    // Check your understanding
                    if (checkQ.isNotEmpty) ...[
                      LACard(
                        borderColor: c.borderStrong,
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Icon(Icons.psychology_outlined, size: 18, color: c.accent),
                                const SizedBox(width: 6),
                                Text('Check your understanding', style: TextStyle(fontSize: LATokens.fsMd, fontWeight: FontWeight.w700, color: c.text)),
                              ],
                            ),
                            const SizedBox(height: 10),
                            MarkdownMathText(text: checkQ),
                            const SizedBox(height: 12),
                            LAInput(
                              controller: _answerCtrl,
                              hint: 'Explain your answer...',
                              minLines: 2,
                              maxLines: 4,
                            ),
                            const SizedBox(height: 10),
                            LAButton(
                              text: 'Check answer',
                              loading: _evaluating,
                              onPressed: () => _submitEvaluation(checkQ, cacheKey),
                            ),
                            if (_evaluation != null) ...[
                              const SizedBox(height: 12),
                              _buildEvaluationFeedback(c, _evaluation!),
                            ],
                          ],
                        ),
                      ),
                      const SizedBox(height: LATokens.space4),
                    ],

                    // Next stage navigation
                    Row(
                      children: [
                        if (_stageIndex > 0) ...[
                          Expanded(
                            child: LAButton(
                              text: 'Previous stage',
                              type: ButtonType.secondary,
                              onPressed: () => _loadStage(_stageIndex - 1),
                            ),
                          ),
                          const SizedBox(width: LATokens.space2),
                        ],
                        Expanded(
                          child: LAButton(
                            text: _stageIndex < _stages.length - 1
                                ? 'Next: ${_stages[_stageIndex + 1]}'
                                : 'Ask AI Tutor',
                            onPressed: () {
                              if (_stageIndex < _stages.length - 1) {
                                _loadStage(_stageIndex + 1);
                              } else {
                                Navigator.push(
                                  context,
                                  MaterialPageRoute(
                                    builder: (_) => ChatScreen(
                                      initialConceptId: _conceptId,
                                      initialPrompt: 'Quiz me on $_chapterName',
                                    ),
                                  ),
                                );
                              }
                            },
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: LATokens.space6),
                  ],
                ),
        ),
      ],
    );
  }

  Widget _buildEvaluationFeedback(LAColors c, Map<String, dynamic> ev) {
    final verdict = (ev['verdict'] ?? '').toString().toUpperCase();
    final isCorrect = verdict == 'CORRECT';
    final isPartial = verdict == 'PARTIAL';
    final color = isCorrect ? c.green : (isPartial ? c.amber : c.red);
    final feedback = (ev['feedback'] ?? ev['correctReasoning'] ?? '').toString();
    final whatWorked = (ev['whatWorked'] ?? '').toString();
    final missing = (ev['missing'] ?? '').toString();

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(LATokens.radiusMd),
        border: Border.all(color: color.withValues(alpha: 0.35)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            verdict.isEmpty ? 'Feedback' : verdict,
            style: TextStyle(fontSize: LATokens.fsXs, fontWeight: FontWeight.w700, color: color),
          ),
          if (feedback.isNotEmpty) ...[
            const SizedBox(height: 6),
            MarkdownMathText(text: feedback),
          ],
          if (whatWorked.isNotEmpty) ...[
            const SizedBox(height: 6),
            Text('What worked: $whatWorked', style: TextStyle(fontSize: LATokens.fsXs, color: c.textSecondary)),
          ],
          if (missing.isNotEmpty) ...[
            const SizedBox(height: 4),
            Text('Missing: $missing', style: TextStyle(fontSize: LATokens.fsXs, color: c.textSecondary)),
          ],
        ],
      ),
    );
  }
}
