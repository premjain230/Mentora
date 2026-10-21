import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';
import '../theme/app_theme.dart';
import '../widgets/app_components.dart';
import '../widgets/app_drawer.dart';

/// Learning Hub — matches website learning-hub.html
/// Flow: Board → Class → Subject → Chapter → Paged lesson → 5-question quiz → AI review
class LearningHubScreen extends StatefulWidget {
  const LearningHubScreen({super.key});

  @override
  State<LearningHubScreen> createState() => _LearningHubScreenState();
}

class _LearningHubScreenState extends State<LearningHubScreen> {
  // Stage: 'board' | 'class' | 'subject' | 'chapter' | 'reading' | 'quiz' | 'review' | 'done'
  String _stage = 'board';
  String? _board;
  int? _classNum;
  String? _subject;
  String? _chapterId;
  String? _chapterName;

  int _pageIndex = 0;
  int _totalPages = 5;
  final List<String> _pageLines = [
    'Newton\'s First Law states that an object at rest stays at rest and an object in motion stays in motion with the same speed and in the same direction unless acted upon by an unbalanced force.',
    'This law is also known as the law of inertia. Inertia is the tendency of an object to resist changes in its state of motion.',
    'The more mass an object has, the more inertia it has, and the harder it is to change its motion.',
    'Example: A book resting on a table stays at rest until you apply a force to move it.',
    'Example: A ball rolling on the ground eventually stops due to friction — an unbalanced force.',
  ];
  final List<Map<String, dynamic>> _quiz = [
    {'question': 'What is Newton\'s First Law also known as?', 'options': ['Law of Acceleration', 'Law of Inertia', 'Law of Action-Reaction', 'Law of Gravity'], 'answer': 1},
    {'question': 'What property of an object resists changes in motion?', 'options': ['Force', 'Mass', 'Inertia', 'Velocity'], 'answer': 2},
    {'question': 'Which of the following has the most inertia?', 'options': ['A bicycle', 'A car', 'A truck', 'A motorcycle'], 'answer': 2},
    {'question': 'What stops a rolling ball on the ground?', 'options': ['Gravity', 'Friction', 'Inertia', 'Mass'], 'answer': 1},
    {'question': 'An unbalanced force is required to:', 'options': ['Keep an object at rest', 'Change an object\'s state of motion', 'Increase mass', 'Decrease weight'], 'answer': 1},
  ];
  final List<int> _userAnswers = List.filled(5, -1);
  int _score = 0;

  // Board data
  final List<Map<String, dynamic>> _boards = [
    {'id': 'cbse', 'name': 'CBSE', 'icon': '🏛', 'color': '#8B5CF6', 'classes': [9, 10, 11, 12]},
    {'id': 'maharashtra', 'name': 'Maharashtra Board', 'icon': '🏔', 'color': '#F59E0B', 'classes': [9, 10, 11, 12]},
    {'id': 'jee_main', 'name': 'JEE Main', 'icon': '⚡', 'color': '#0EA5E9', 'classes': const []},
    {'id': 'jee_advanced', 'name': 'JEE Advanced', 'icon': '🔥', 'color': '#10B981', 'classes': const []},
    {'id': 'neet', 'name': 'NEET', 'icon': '💉', 'color': '#10B981', 'classes': const []},
  ];

  final Map<String, List<String>> _subjectsByBoard = {
    'cbse': ['Physics', 'Chemistry', 'Mathematics', 'Biology', 'English', 'Social Science'],
    'maharashtra': ['Science & Technology', 'Mathematics', 'History and Political Science', 'Geography'],
    'jee_main': ['Physics', 'Chemistry', 'Mathematics'],
    'jee_advanced': ['Physics', 'Chemistry', 'Mathematics'],
    'neet': ['Physics', 'Chemistry', 'Biology'],
  };

  final Map<String, List<Map<String, dynamic>>> _chaptersByBoard = {
    'cbse.9': [
      {'id': 'cbse.9.science.cell', 'name': 'Cell', 'topic': 'Science'},
      {'id': 'cbse.9.science.tissues', 'name': 'Tissues', 'topic': 'Science'},
      {'id': 'cbse.9.science.motion', 'name': 'Motion', 'topic': 'Science'},
      {'id': 'cbse.9.science.force_and_laws_of_motion', 'name': 'Force and Laws of Motion', 'topic': 'Science'},
    ],
    'cbse.10': [
      {'id': 'cbse.10.science.chemical_reactions', 'name': 'Chemical Reactions', 'topic': 'Science'},
      {'id': 'cbse.10.science.acids_bases', 'name': 'Acids, Bases and Salts', 'topic': 'Science'},
    ],
    'maharashtra.9': [
      {'id': 'maharashtra.9.science1.laws_of_motion', 'name': 'Laws of Motion', 'topic': 'Science & Technology - Part 1'},
      {'id': 'maharashtra.9.science1.work_and_energy', 'name': 'Work and Energy', 'topic': 'Science & Technology - Part 1'},
    ],
    'jee_main': [
      {'id': 'jee.main.physics.units_and_measurements', 'name': 'Units and Measurements', 'topic': 'Physics'},
      {'id': 'jee.main.physics.kinematics', 'name': 'Kinematics', 'topic': 'Physics'},
      {'id': 'jee.main.physics.laws_of_motion', 'name': 'Laws of Motion', 'topic': 'Physics'},
    ],
    'jee_advanced': [
      {'id': 'jee.advanced.physics.fluid_mechanics', 'name': 'Fluid Mechanics', 'topic': 'Physics'},
      {'id': 'jee.advanced.physics.advanced_thermal_physics', 'name': 'Thermal Physics', 'topic': 'Physics'},
    ],
    'neet': [
      {'id': 'neet.ug.physics.experimental_skills', 'name': 'Experimental Skills', 'topic': 'Physics'},
      {'id': 'neet.ug.chemistry.p_block_elements', 'name': 'P-Block Elements', 'topic': 'Chemistry'},
    ],
  };

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      drawer: const AppDrawer(activeRoute: 'learning_hub'),
      appBar: AppBar(
        leading: Builder(builder: (ctx) => IconButton(icon: const Icon(Icons.menu_rounded), onPressed: () => Scaffold.of(ctx).openDrawer())),
        title: Row(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 28, height: 28, decoration: BoxDecoration(color: LATokens.accent, borderRadius: BorderRadius.circular(LATokens.radiusMd)), child: const Center(child: Text('A', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)))),
          const SizedBox(width: LATokens.space2),
          Text('Learning Hub', style: TextStyle(fontFamily: LATokens.fontDisplay, fontWeight: FontWeight.w700)),
        ]),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
      ),
      body: _buildStage(context),
    );
  }

  Widget _buildStage(BuildContext context) {
    switch (_stage) {
      case 'board': return _buildBoardSelection(context);
      case 'class': return _buildClassSelection(context);
      case 'subject': return _buildSubjectSelection(context);
      case 'chapter': return _buildChapterSelection(context);
      case 'reading': return _buildReading(context);
      case 'quiz': return _buildQuiz(context);
      case 'review': return _buildReview(context);
      case 'done': return _buildDone(context);
      default: return _buildBoardSelection(context);
    }
  }

  // ── Board selection ────────────────────────────────────────────────
  Widget _buildBoardSelection(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(LATokens.space4),
      children: [
        const Text('Select your board or exam', style: TextStyle(fontSize: LATokens.fsLg, fontWeight: FontWeight.w700, color: LATokens.textPrimary)),
        const SizedBox(height: LATokens.space2),
        const Text('Choose where you want to start learning', style: TextStyle(color: LATokens.textSecondary, fontSize: LATokens.fsSm)),
        const SizedBox(height: LATokens.space4),
        ..._boards.map((b) {
          final selected = _board == b['id'];
          return Container(
            margin: const EdgeInsets.only(bottom: LATokens.space1),
            child: LAButton(
              text: '${b['icon']}  ${b['name']}',
              onPressed: () => setState(() {
                _board = b['id'];
                _stage = b['classes'].isNotEmpty ? 'class' : 'subject';
              }),
              type: ButtonType.secondary,
              fullWidth: true,
            ),
          );
        }),
      ],
    );
  }

  // ── Class selection ────────────────────────────────────────────────
  Widget _buildClassSelection(BuildContext context) {
    final classes = _boards.firstWhere((b) => b['id'] == _board)['classes'] as List<int>;
    return ListView(
      padding: const EdgeInsets.all(LATokens.space4),
      children: [
        Row(
          children: [
            IconButton(icon: const Icon(Icons.arrow_back_rounded), onPressed: () => setState(() => _stage = 'board')),
            const SizedBox(width: LATokens.space1),
            Text('Select Class', style: TextStyle(fontSize: LATokens.fsLg, fontWeight: FontWeight.w700, color: LATokens.textPrimary)),
          ],
        ),
        const SizedBox(height: LATokens.space4),
        Wrap(
          spacing: LATokens.space1,
          runSpacing: LATokens.space1,
          children: classes.map((c) {
            final selected = _classNum == c;
            return ChoiceChip(
              label: Text('Class $c'),
              selected: selected,
              onSelected: (_) => setState(() {
                _classNum = c;
                _stage = 'subject';
              }),
              selectedColor: LATokens.accent,
              labelStyle: TextStyle(color: selected ? Colors.white : LATokens.textSecondary, fontWeight: FontWeight.w600),
              backgroundColor: LATokens.bgElevated,
              side: BorderSide(color: LATokens.border),
            );
          }).toList(),
        ),
      ],
    );
  }

  // ── Subject selection ──────────────────────────────────────────────
  Widget _buildSubjectSelection(BuildContext context) {
    final subjects = _subjectsByBoard[_board ?? 'cbse'] ?? [];
    return ListView(
      padding: const EdgeInsets.all(LATokens.space4),
      children: [
        Row(
          children: [
            IconButton(icon: const Icon(Icons.arrow_back_rounded), onPressed: () => setState(() => _stage = _classNum != null ? 'class' : 'board')),
            const SizedBox(width: LATokens.space1),
            Text('Select Subject', style: TextStyle(fontSize: LATokens.fsLg, fontWeight: FontWeight.w700, color: LATokens.textPrimary)),
          ],
        ),
        const SizedBox(height: LATokens.space4),
        GridView.builder(
          shrinkWrap: true,
          physics: const NeverScrollableScrollPhysics(),
          gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(crossAxisCount: 2, crossAxisSpacing: LATokens.space2, mainAxisSpacing: LATokens.space2, childAspectRatio: 1.5),
          itemCount: subjects.length,
          itemBuilder: (context, i) {
            final s = subjects[i];
            return Container(
              decoration: BoxDecoration(color: LATokens.bgCard, borderRadius: BorderRadius.circular(LATokens.radiusLg), border: Border.all(color: LATokens.border)),
              child: InkWell(
                borderRadius: BorderRadius.circular(LATokens.radiusLg),
                onTap: () => setState(() {
                  _subject = s;
                  _stage = 'chapter';
                }),
                child: Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.book_rounded, size: 32, color: LATokens.accent),
                      const SizedBox(height: LATokens.space2),
                      Text(s, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: LATokens.fsSm, color: LATokens.textPrimary), textAlign: TextAlign.center),
                    ],
                  ),
                ),
              ),
            );
          },
        ),
      ],
    );
  }

  // ── Chapter selection ──────────────────────────────────────────────
  Widget _buildChapterSelection(BuildContext context) {
    final key = _classNum != null ? '${_board}.$_classNum' : _board ?? '';
    final chapters = _chaptersByBoard[key] ?? [
      {'id': 'sample.1', 'name': 'Sample Chapter', 'topic': 'General'}
    ];
    return ListView(
      padding: const EdgeInsets.all(LATokens.space4),
      children: [
        Row(
          children: [
            IconButton(icon: const Icon(Icons.arrow_back_rounded), onPressed: () => setState(() => _stage = 'subject')),
            const SizedBox(width: LATokens.space1),
            Text('Select Chapter', style: TextStyle(fontSize: LATokens.fsLg, fontWeight: FontWeight.w700, color: LATokens.textPrimary)),
          ],
        ),
        const SizedBox(height: LATokens.space4),
        ...chapters.map((c) {
          final selected = _chapterId == c['id'];
          return Container(
            margin: const EdgeInsets.only(bottom: LATokens.space1),
            child: LAButton(
              text: '${c['name']}  ·  ${c['topic']}',
              onPressed: () => setState(() {
                _chapterId = c['id'];
                _chapterName = c['name'];
                _stage = 'reading';
              }),
              type: ButtonType.secondary,
              fullWidth: true,
            ),
          );
        }),
      ],
    );
  }

  // ── Reading (paged lesson) ─────────────────────────────────────────
  Widget _buildReading(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      children: [
        // Progress header
        Container(
          padding: const EdgeInsets.all(LATokens.space3),
          child: Column(
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Text(_chapterName ?? 'Chapter', style: const TextStyle(fontSize: LATokens.fsLg, fontWeight: FontWeight.w700, color: LATokens.textPrimary)),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: LATokens.space2, vertical: 2.0),
                    decoration: BoxDecoration(color: LATokens.accentSoft, borderRadius: BorderRadius.circular(LATokens.radiusFull)),
                    child: Text('Page ${_pageIndex + 1} of $_totalPages', style: const TextStyle(fontSize: LATokens.fsXs, fontWeight: FontWeight.w600, color: LATokens.accent)),
                  ),
                ],
              ),
              const SizedBox(height: LATokens.space2),
              LinearProgressIndicator(value: (_pageIndex + 1) / _totalPages, backgroundColor: LATokens.border, color: LATokens.accent, minHeight: 4),
              const SizedBox(height: LATokens.space2),
              Row(
                children: [
                  Text('Read', style: const TextStyle(fontSize: LATokens.fsXs, fontWeight: FontWeight.w600, color: LATokens.accent)),
                  const SizedBox(width: LATokens.space1),
                  Container(width: 8, height: 8, decoration: BoxDecoration(color: LATokens.accent, shape: BoxShape.circle)),
                  const SizedBox(width: LATokens.space3),
                  Text('Questions', style: const TextStyle(fontSize: LATokens.fsXs, color: LATokens.textMuted)),
                  const SizedBox(width: LATokens.space1),
                  Container(width: 8, height: 8, decoration: BoxDecoration(color: LATokens.border, shape: BoxShape.circle)),
                  const SizedBox(width: LATokens.space3),
                  Text('Review', style: const TextStyle(fontSize: LATokens.fsXs, color: LATokens.textMuted)),
                ],
              ),
            ],
          ),
        ),
        // Lesson content
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(LATokens.space4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(_pageLines[_pageIndex], style: const TextStyle(fontSize: LATokens.fsMd, color: LATokens.textPrimary, height: LATokens.lhRelaxed)),
              ],
            ),
          ),
        ),
        // Navigation
        Container(
          padding: const EdgeInsets.all(LATokens.space3),
          child: Row(
            children: [
              Expanded(
                child: LAButton(
                  text: _pageIndex == 0 ? 'Cancel' : 'Back',
                  onPressed: _pageIndex == 0 ? () => setState(() => _stage = 'chapter') : () => setState(() => _pageIndex--),
                  type: ButtonType.ghost,
                  fullWidth: true,
                ),
              ),
              const SizedBox(width: LATokens.space2),
              Expanded(
                child: LAButton(
                  text: _pageIndex == _totalPages - 1 ? 'Start Quiz' : 'Next',
                  onPressed: () {
                    if (_pageIndex == _totalPages - 1) {
                      setState(() => _stage = 'quiz');
                    } else {
                      setState(() => _pageIndex++);
                    }
                  },
                  type: ButtonType.primary,
                  fullWidth: true,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── Quiz ───────────────────────────────────────────────────────────
  Widget _buildQuiz(BuildContext context) {
    final q = _quiz[_pageIndex];
    final answered = _userAnswers[_pageIndex] != -1;
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(LATokens.space3),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text('Practice', style: const TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w600, color: LATokens.accent)),
              Text('${_pageIndex + 1} of $_totalPages', style: const TextStyle(fontSize: LATokens.fsXs, color: LATokens.textMuted)),
            ],
          ),
        ),
        Expanded(
          child: Container(
            padding: const EdgeInsets.all(LATokens.space4),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(q['question'], style: const TextStyle(fontSize: LATokens.fsMd, fontWeight: FontWeight.w600, color: LATokens.textPrimary, height: LATokens.lhNormal)),
                const SizedBox(height: LATokens.space3),
                ...List.generate(4, (i) {
                  final letter = String.fromCharCode(65 + i);
                  final isSelected = _userAnswers[_pageIndex] == i;
                  final showResult = answered;
                  final isCorrect = i == q['answer'];
                  Color border = LATokens.border;
                  Color bg = LATokens.bgCard;
                  if (showResult && isSelected) {
                    border = isCorrect ? LATokens.green : LATokens.accent3;
                    bg = isCorrect ? LATokens.green.withOpacity(0.12) : LATokens.accent3.withOpacity(0.12);
                  } else if (showResult && isCorrect) {
                    border = LATokens.green;
                    bg = LATokens.green.withOpacity(0.08);
                  } else if (isSelected) {
                    border = LATokens.accent;
                    bg = LATokens.accent.withOpacity(0.12);
                  }
                  return Container(
                    margin: const EdgeInsets.only(bottom: LATokens.space1),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(LATokens.radiusMd),
                      onTap: answered ? null : () => setState(() => _userAnswers[_pageIndex] = i),
                      child: Container(
                        padding: const EdgeInsets.all(LATokens.space3),
                        decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(LATokens.radiusMd), border: Border.all(color: border)),
                        child: Row(
                          children: [
                            Container(
                              width: 30,
                              height: 30,
                              decoration: BoxDecoration(color: isSelected ? LATokens.accent : LATokens.bgElevated, borderRadius: BorderRadius.circular(LATokens.radiusSm)),
                              child: Center(child: Text(letter, style: const TextStyle(color: Colors.white, fontSize: LATokens.fsSm, fontWeight: FontWeight.w700))),
                            ),
                            const SizedBox(width: LATokens.space3),
                            Expanded(child: Text(q['options'][i], style: const TextStyle(fontSize: LATokens.fsSm, color: LATokens.textPrimary))),
                          ],
                        ),
                      ),
                    ),
                  );
                }),
                if (answered) ...[
                  const SizedBox(height: LATokens.space3),
                  Container(
                    padding: const EdgeInsets.all(LATokens.space2),
                    decoration: BoxDecoration(
                      color: (_userAnswers[_pageIndex] == q['answer'] ? LATokens.green : LATokens.accent3).withOpacity(0.1),
                      borderRadius: BorderRadius.circular(LATokens.radiusMd),
                      border: Border.all(color: (_userAnswers[_pageIndex] == q['answer'] ? LATokens.green : LATokens.accent3).withOpacity(0.3)),
                    ),
                    child: Row(
                      children: [
                        Icon(_userAnswers[_pageIndex] == q['answer'] ? Icons.check_circle : Icons.error, color: _userAnswers[_pageIndex] == q['answer'] ? LATokens.green : LATokens.accent3, size: 18),
                        const SizedBox(width: LATokens.space2),
                        Expanded(
                          child: Text(
                            _userAnswers[_pageIndex] == q['answer'] ? 'Correct! ${_getExplanation(_pageIndex)}' : 'Incorrect. Correct: ${q['options'][q['answer']]}. ${_getExplanation(_pageIndex)}',
                            style: const TextStyle(fontSize: LATokens.fsXs, color: LATokens.textPrimary),
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ],
            ),
          ),
        ),
        Container(
          padding: const EdgeInsets.all(LATokens.space3),
          child: Row(
            children: [
              Expanded(
                child: LAButton(
                  text: answered && _pageIndex < _quiz.length - 1 ? 'Next' : (answered && _pageIndex == _quiz.length - 1 ? 'Finish' : 'Select an answer'),
                  onPressed: answered
                      ? () {
                          if (_pageIndex < _quiz.length - 1) {
                            setState(() => _pageIndex++);
                          } else {
                            _finishQuiz();
                          }
                        }
                      : null,
                  type: ButtonType.primary,
                  fullWidth: true,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  String _getExplanation(int idx) {
    const explanations = [
      'It describes how objects behave when no net force acts on them.',
      'Mass measures how much matter an object contains — more mass means more inertia.',
      'A truck has the most mass, so it has the most inertia and is hardest to accelerate or decelerate.',
      'Friction is the unbalanced force that opposes the rolling motion and brings the ball to rest.',
      'It changes the object\'s velocity — either speed, direction, or both.',
    ];
    return explanations[idx];
  }

  void _finishQuiz() {
    int score = 0;
    for (int i = 0; i < _quiz.length; i++) {
      if (_userAnswers[i] == _quiz[i]['answer']) score++;
    }
    _score = score;
    setState(() => _stage = 'review');
  }

  // ── Review ─────────────────────────────────────────────────────────
  Widget _buildReview(BuildContext context) {
    final pct = (_score / _quiz.length * 100).round();
    final passed = pct >= 60;
    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(LATokens.space3),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(color: passed ? LATokens.green.withOpacity(0.12) : LATokens.accent3.withOpacity(0.12), borderRadius: BorderRadius.circular(LATokens.radiusMd)),
                child: Icon(passed ? Icons.check_circle : Icons.error, color: passed ? LATokens.green : LATokens.accent3),
              ),
              const SizedBox(width: LATokens.space3),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('Your review', style: const TextStyle(fontSize: LATokens.fsLg, fontWeight: FontWeight.w700, color: LATokens.textPrimary)),
                  Text('${_score} of ${_quiz.length} correct ($pct%)', style: const TextStyle(fontSize: LATokens.fsSm, color: LATokens.textSecondary)),
                ],
              ),
            ],
          ),
        ),
        Expanded(
          child: ListView(
            padding: const EdgeInsets.all(LATokens.space4),
            children: [
              ...List.generate(_quiz.length, (i) {
                final q = _quiz[i];
                final userAns = _userAnswers[i];
                final isCorrect = userAns == q['answer'];
                return Container(
                  margin: const EdgeInsets.only(bottom: LATokens.space3),
                  padding: const EdgeInsets.all(LATokens.space3),
                  decoration: BoxDecoration(color: LATokens.bgCard, borderRadius: BorderRadius.circular(LATokens.radiusMd), border: Border.all(color: LATokens.border)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            width: 24,
                            height: 24,
                            decoration: BoxDecoration(color: isCorrect ? LATokens.green.withOpacity(0.12) : LATokens.accent3.withOpacity(0.12), borderRadius: BorderRadius.circular(LATokens.radiusSm)),
                            child: Center(child: Icon(isCorrect ? Icons.check_circle : Icons.error, size: 14, color: isCorrect ? LATokens.green : LATokens.accent3)),
                          ),
                          const SizedBox(width: LATokens.space2),
                          Expanded(child: Text('Q${i + 1}: ${q['question']}', style: const TextStyle(fontWeight: FontWeight.w600, fontSize: LATokens.fsSm, color: LATokens.textPrimary))),
                        ],
                      ),
                      const SizedBox(height: LATokens.space2),
                      Text('Your answer: ${userAns != -1 ? q['options'][userAns] : 'Not answered'}', style: const TextStyle(fontSize: LATokens.fsXs, color: LATokens.textMuted)),
                      const SizedBox(height: LATokens.space1),
                      Text('Correct answer: ${q['options'][q['answer']]}', style: const TextStyle(fontSize: LATokens.fsXs, color: LATokens.textPrimary)),
                      const SizedBox(height: LATokens.space1),
                      Text('Why: ${_getExplanation(i)}', style: const TextStyle(fontSize: LATokens.fsXs, color: LATokens.textSecondary, fontStyle: FontStyle.italic)),
                    ],
                  ),
                );
              }),
            ],
          ),
        ),
        Container(
          padding: const EdgeInsets.all(LATokens.space3),
          child: Row(
            children: [
              Expanded(
                child: LAButton(
                  text: 'Retake Quiz',
                  onPressed: () {
                    setState(() {
                      _pageIndex = 0;
                      _userAnswers.fillRange(0, 5, -1);
                      _stage = 'quiz';
                    });
                  },
                  type: ButtonType.ghost,
                  fullWidth: true,
                ),
              ),
              const SizedBox(width: LATokens.space2),
              Expanded(
                child: LAButton(
                  text: 'Next Chapter',
                  onPressed: () => setState(() => _stage = 'chapter'),
                  type: ButtonType.primary,
                  fullWidth: true,
                ),
              ),
            ],
          ),
        ),
      ],
    );
  }

  // ── Done ───────────────────────────────────────────────────────────
  Widget _buildDone(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          const Icon(Icons.celebration, size: 64, color: LATokens.accent),
          const SizedBox(height: LATokens.space3),
          const Text('Chapter Complete!', style: TextStyle(fontSize: LATokens.fs2xl, fontWeight: FontWeight.w700, color: LATokens.textPrimary)),
          const SizedBox(height: LATokens.space2),
          Text('You\'ve mastered $_chapterName', style: const TextStyle(fontSize: LATokens.fsBase, color: LATokens.textSecondary)),
          const SizedBox(height: LATokens.space4),
          SizedBox(
            width: double.infinity,
            child: LAButton(
              text: 'Back to Chapters',
              onPressed: () => setState(() => _stage = 'chapter'),
              type: ButtonType.primary,
              fullWidth: true,
            ),
          ),
        ],
      ),
    );
  }
}
