import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../services/learning_service.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_components.dart';

class OnboardingScreen extends StatefulWidget {
  final VoidCallback onComplete;
  final Map<String, dynamic>? initialProfile;

  const OnboardingScreen({
    super.key,
    required this.onComplete,
    this.initialProfile,
  });

  @override
  State<OnboardingScreen> createState() => _OnboardingScreenState();
}

class _OnboardingScreenState extends State<OnboardingScreen> {
  int _step = 1;
  bool _saving = false;
  bool _loadingCatalog = false;

  String _country = 'IN';
  String _trackId = 'cbse';
  String _trackName = 'CBSE';
  int _grade = 10;
  final Set<String> _subjects = {'Physics', 'Chemistry', 'Mathematics'};
  String _goal = 'Exam excellence';
  double _dailyHours = 2.0;
  String _language = 'English';
  String _personality = 'mentor';

  List<Map<String, dynamic>> _tracks = [];
  List<String> _availableSubjects = [
    'Physics',
    'Chemistry',
    'Mathematics',
    'Biology',
    'Science',
    'English',
    'Social Science',
  ];

  static const _countries = [
    {'code': 'IN', 'name': 'India'},
    {'code': 'US', 'name': 'United States'},
    {'code': 'GB', 'name': 'United Kingdom'},
    {'code': 'CA', 'name': 'Canada'},
    {'code': 'AU', 'name': 'Australia'},
    {'code': 'SG', 'name': 'Singapore'},
    {'code': 'AE', 'name': 'UAE'},
  ];

  static const _personalities = [
    {'id': 'mentor', 'name': 'Mentor', 'desc': 'Patient, structured guidance'},
    {'id': 'coach', 'name': 'Coach', 'desc': 'Goal-focused and direct'},
    {'id': 'deep-thinker', 'name': 'Deep Thinker', 'desc': 'First-principles & analytical'},
    {'id': 'friendly', 'name': 'Friendly Companion', 'desc': 'Warm and encouraging'},
    {'id': 'motivator', 'name': 'Motivator', 'desc': 'High energy & momentum'},
  ];

  @override
  void initState() {
    super.initState();
    final p = widget.initialProfile;
    if (p != null) {
      _country = (p['country'] ?? _country).toString();
      _trackId = (p['trackId'] ?? p['board'] ?? _trackId).toString();
      _trackName = (p['trackName'] ?? _trackName).toString();
      if (p['grade'] is num) _grade = (p['grade'] as num).toInt();
      if (p['subjects'] is List && (p['subjects'] as List).isNotEmpty) {
        _subjects
          ..clear()
          ..addAll((p['subjects'] as List).map((e) => e.toString()));
      }
      _goal = (p['academicGoal'] ?? _goal).toString();
      if (p['dailyHours'] is num) _dailyHours = (p['dailyHours'] as num).toDouble();
      _language = (p['preferredLanguage'] ?? _language).toString();
      _personality = (p['personality'] ?? _personality).toString();
    }
    _loadCatalog();
  }

  Future<void> _loadCatalog() async {
    setState(() => _loadingCatalog = true);
    try {
      final auth = context.read<AuthService>();
      final svc = LearningService(ApiClient(auth));
      final res = await svc.fetchCatalog(countryCode: _country);
      final catalog = res['catalog'] as Map<String, dynamic>?;
      final tracksRaw = (catalog?['tracks'] as List<dynamic>?) ?? [];
      if (mounted && tracksRaw.isNotEmpty) {
        setState(() {
          _tracks = tracksRaw.map((e) => Map<String, dynamic>.from(e as Map)).toList();
          if (!_tracks.any((t) => (t['id'] ?? t['trackId']) == _trackId)) {
            _trackId = (_tracks.first['id'] ?? _tracks.first['trackId'] ?? 'cbse').toString();
            _trackName = (_tracks.first['name'] ?? _tracks.first['label'] ?? _trackId).toString();
          }
        });
      }
    } catch (_) {
    } finally {
      if (mounted) setState(() => _loadingCatalog = false);
    }
  }

  Future<void> _loadSubjectsForTrack() async {
    try {
      final auth = context.read<AuthService>();
      final svc = LearningService(ApiClient(auth));
      final res = await svc.fetchCatalog(
        countryCode: _country,
        track: _trackId,
        classNum: _grade,
      );
      final catalog = res['catalog'] as Map<String, dynamic>?;
      final subs = (catalog?['subjects'] as List<dynamic>?) ?? [];
      if (mounted && subs.isNotEmpty) {
        setState(() {
          _availableSubjects = subs.map((e) => e is Map ? (e['name'] ?? e['subject'] ?? '').toString() : e.toString()).where((s) => s.isNotEmpty).toList();
        });
      }
    } catch (_) {}
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    try {
      final auth = context.read<AuthService>();
      final uid = auth.user?.uid;
      if (uid == null) throw Exception('Not signed in');
      final fs = FirestoreService(auth);
      final now = DateTime.now().toUtc().toIso8601String();
      final payload = {
        'country': _country,
        'board': _trackId,
        'trackId': _trackId,
        'trackName': _trackName,
        'grade': _grade,
        'subjects': _subjects.toList(),
        'academicGoal': _goal,
        'dailyHours': _dailyHours,
        'preferredLanguage': _language,
        'personality': _personality,
        'onboardingComplete': true,
        'onboardingAt': now,
        'updatedAt': now,
      };
      await Future.wait([
        fs.setDoc('users/$uid/learning/profile', payload),
        fs.setDoc('users/$uid', payload),
      ]);
      if (mounted) widget.onComplete();
    } catch (e) {
      if (mounted) LAToast.show(context, 'Failed to save profile: $e', isError: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('Personalize Learning Allied'),
        actions: [
          TextButton(
            onPressed: _saving ? null : widget.onComplete,
            child: Text('Skip', style: TextStyle(color: c.textMuted)),
          ),
        ],
      ),
      body: SafeArea(
        child: Column(
          children: [
            LinearProgressIndicator(
              value: _step / 4,
              minHeight: 3,
              backgroundColor: c.borderSubtle,
              color: c.accent,
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.all(LATokens.space5),
                children: [
                  Text(
                    'Step $_step of 4',
                    style: TextStyle(fontSize: LATokens.fsXs, fontWeight: FontWeight.w600, color: c.accent),
                  ),
                  const SizedBox(height: LATokens.space1),
                  if (_step == 1) _buildStep1(c),
                  if (_step == 2) _buildStep2(c),
                  if (_step == 3) _buildStep3(c),
                  if (_step == 4) _buildStep4(c),
                ],
              ),
            ),
            Container(
              padding: const EdgeInsets.all(LATokens.space4),
              decoration: BoxDecoration(
                color: c.surface,
                border: Border(top: BorderSide(color: c.border)),
              ),
              child: Row(
                children: [
                  if (_step > 1) ...[
                    Expanded(
                      child: LAButton(
                        text: 'Back',
                        type: ButtonType.secondary,
                        onPressed: () => setState(() => _step--),
                      ),
                    ),
                    const SizedBox(width: LATokens.space3),
                  ],
                  Expanded(
                    flex: 2,
                    child: LAButton(
                      text: _step == 4 ? 'Finish setup' : 'Continue',
                      loading: _saving,
                      onPressed: () {
                        if (_step == 1) {
                          _loadSubjectsForTrack();
                        }
                        if (_step < 4) {
                          setState(() => _step++);
                        } else {
                          _save();
                        }
                      },
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStep1(LAColors c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Country & Curriculum', style: TextStyle(fontSize: LATokens.fsXl, fontWeight: FontWeight.w700, color: c.text)),
        const SizedBox(height: 6),
        Text('Select your region and exam board so lessons match your syllabus.', style: TextStyle(fontSize: LATokens.fsSm, color: c.textSecondary)),
        const SizedBox(height: LATokens.space4),
        Text('Country', style: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w600, color: c.text)),
        const SizedBox(height: LATokens.space2),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _countries.map((co) {
            final selected = _country == co['code'];
            return ChoiceChip(
              label: Text(co['name']!),
              selected: selected,
              onSelected: (_) {
                setState(() => _country = co['code']!);
                _loadCatalog();
              },
            );
          }).toList(),
        ),
        const SizedBox(height: LATokens.space5),
        Text('Board / Track', style: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w600, color: c.text)),
        const SizedBox(height: LATokens.space2),
        if (_loadingCatalog)
          const Padding(padding: EdgeInsets.all(16), child: Center(child: CircularProgressIndicator()))
        else if (_tracks.isEmpty)
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: ['cbse', 'maharashtra', 'jee_main', 'jee_advanced', 'neet'].map((id) {
              return ChoiceChip(
                label: Text(id.toUpperCase().replaceAll('_', ' ')),
                selected: _trackId == id,
                onSelected: (_) => setState(() {
                  _trackId = id;
                  _trackName = id.toUpperCase().replaceAll('_', ' ');
                }),
              );
            }).toList(),
          )
        else
          Column(
            children: [
              LAGroupedList(
                children: _tracks.map((t) {
                  final id = (t['id'] ?? t['trackId'] ?? '').toString();
                  final name = (t['name'] ?? t['label'] ?? id).toString();
                  final selected = _trackId == id;
                  return LAListRow(
                    title: name,
                    showChevron: false,
                    trailing: selected ? Icon(Icons.check_rounded, color: c.accent, size: 20) : null,
                    onTap: () => setState(() {
                      _trackId = id;
                      _trackName = name;
                    }),
                  );
                }).toList(),
              ),
            ],
          ),
      ],
    );
  }

  Widget _buildStep2(LAColors c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Grade & Priority Subjects', style: TextStyle(fontSize: LATokens.fsXl, fontWeight: FontWeight.w700, color: c.text)),
        const SizedBox(height: 6),
        Text('Choose your class and the subjects you want to focus on.', style: TextStyle(fontSize: LATokens.fsSm, color: c.textSecondary)),
        const SizedBox(height: LATokens.space4),
        Text('Class / Grade', style: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w600, color: c.text)),
        const SizedBox(height: LATokens.space2),
        Wrap(
          spacing: 8,
          children: [8, 9, 10, 11, 12].map((g) {
            return ChoiceChip(
              label: Text('Class $g'),
              selected: _grade == g,
              onSelected: (_) => setState(() => _grade = g),
            );
          }).toList(),
        ),
        const SizedBox(height: LATokens.space5),
        Text('Subjects', style: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w600, color: c.text)),
        const SizedBox(height: LATokens.space2),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _availableSubjects.map((s) {
            final selected = _subjects.contains(s);
            return FilterChip(
              label: Text(s),
              selected: selected,
              onSelected: (v) {
                setState(() {
                  if (v) {
                    _subjects.add(s);
                  } else if (_subjects.length > 1) {
                    _subjects.remove(s);
                  }
                });
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildStep3(LAColors c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Goal & Daily Commitment', style: TextStyle(fontSize: LATokens.fsXl, fontWeight: FontWeight.w700, color: c.text)),
        const SizedBox(height: 6),
        Text('Used to calibrate your study planner and recommendations.', style: TextStyle(fontSize: LATokens.fsSm, color: c.textSecondary)),
        const SizedBox(height: LATokens.space4),
        Text('Academic Goal', style: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w600, color: c.text)),
        const SizedBox(height: LATokens.space2),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: [
            'Exam excellence',
            'Competitive exams',
            'Concept clarity',
            'Catch up on syllabus',
          ].map((g) {
            return ChoiceChip(
              label: Text(g),
              selected: _goal == g,
              onSelected: (_) => setState(() => _goal = g),
            );
          }).toList(),
        ),
        const SizedBox(height: LATokens.space5),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text('Daily study hours', style: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w600, color: c.text)),
            Text('${_dailyHours.toStringAsFixed(1)} hrs/day', style: TextStyle(fontWeight: FontWeight.w700, color: c.accent)),
          ],
        ),
        Slider(
          value: _dailyHours,
          min: 0.5,
          max: 8.0,
          divisions: 15,
          onChanged: (v) => setState(() => _dailyHours = v),
        ),
      ],
    );
  }

  Widget _buildStep4(LAColors c) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text('Language & AI Tutor Style', style: TextStyle(fontSize: LATokens.fsXl, fontWeight: FontWeight.w700, color: c.text)),
        const SizedBox(height: 6),
        Text('Customize how your AI tutor explains concepts.', style: TextStyle(fontSize: LATokens.fsSm, color: c.textSecondary)),
        const SizedBox(height: LATokens.space4),
        Text('Language', style: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w600, color: c.text)),
        const SizedBox(height: LATokens.space2),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: ['English', 'Hindi', 'Hinglish', 'Spanish'].map((l) {
            return ChoiceChip(
              label: Text(l),
              selected: _language == l,
              onSelected: (_) => setState(() => _language = l),
            );
          }).toList(),
        ),
        const SizedBox(height: LATokens.space5),
        Text('AI Personality', style: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w600, color: c.text)),
        const SizedBox(height: LATokens.space2),
        LAGroupedList(
          children: _personalities.map((p) {
            final id = p['id']!;
            final selected = _personality == id;
            return LAListRow(
              title: p['name']!,
              subtitle: p['desc']!,
              showChevron: false,
              trailing: selected ? Icon(Icons.check_rounded, color: c.accent, size: 20) : null,
              onTap: () => setState(() => _personality = id),
            );
          }).toList(),
        ),
      ],
    );
  }
}
