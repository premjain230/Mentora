import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_components.dart';

class SubscriptionScreen extends StatefulWidget {
  const SubscriptionScreen({super.key});

  @override
  State<SubscriptionScreen> createState() => _SubscriptionScreenState();
}

class _SubscriptionScreenState extends State<SubscriptionScreen> {
  bool _loading = true;
  bool _submitting = false;
  bool _isPro = false;
  int _chatsToday = 0;
  int _analysesToday = 0;
  bool _requestExists = false;

  final _msgCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _msgCtrl.dispose();
    super.dispose();
  }

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
      final results = await Future.wait([
        fs.getDoc('entitlements/$uid').catchError((_) => null),
        fs.getDoc('usage/$uid').catchError((_) => null),
        fs.getDoc('proRequests/$uid').catchError((_) => null),
      ]);
      final ent = results[0];
      final usage = results[1];
      final req = results[2];

      final today = DateTime.now().toIso8601String().split('T').first;
      final sameDay = usage != null && usage['date'] == today;

      if (!mounted) return;
      setState(() {
        _isPro = ent != null && ent['plan'] == 'pro' && ent['status'] != 'revoked';
        _chatsToday = sameDay && usage['dailyChatCount'] is num ? (usage['dailyChatCount'] as num).toInt() : 0;
        _analysesToday = sameDay && usage['dailyAnalysisCount'] is num ? (usage['dailyAnalysisCount'] as num).toInt() : 0;
        _requestExists = req != null;
        _loading = false;
      });
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _requestPro() async {
    setState(() => _submitting = true);
    try {
      final auth = context.read<AuthService>();
      final uid = auth.user?.uid;
      final email = auth.user?.email ?? '';
      if (uid == null) throw Exception('Not signed in');
      await FirestoreService(auth).setDoc(
        'proRequests/$uid',
        {
          'uid': uid,
          'email': email,
          if (_msgCtrl.text.trim().isNotEmpty) 'message': _msgCtrl.text.trim(),
          'requestedAt': DateTime.now().toUtc().toIso8601String(),
          'status': 'pending',
        },
        merge: false,
      );
      if (!mounted) return;
      setState(() {
        _requestExists = true;
        _submitting = false;
      });
      LAToast.show(context, 'Pro access request submitted', isSuccess: true);
    } catch (e) {
      if (!mounted) return;
      setState(() => _submitting = false);
      LAToast.show(context, 'Failed to submit request: $e', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    return Scaffold(
      appBar: AppBar(title: const Text('Plan & Usage')),
      body: _loading
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(LATokens.space4),
              children: [
                LACard(
                  borderColor: _isPro ? c.accent : c.border,
                  backgroundColor: _isPro ? c.accentSoft : c.surface,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        _isPro ? 'Learning Allied Pro' : 'Free Plan',
                        style: TextStyle(fontSize: LATokens.fsXl, fontWeight: FontWeight.w700, color: c.text),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        _isPro
                            ? 'Unlimited AI tutor chats, assessments, and study planning.'
                            : 'Includes 20 daily AI tutor chats and 20 daily evaluations.',
                        style: TextStyle(fontSize: LATokens.fsSm, color: c.textSecondary),
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: LATokens.space4),
                const SectionHeader(icon: Icons.bar_chart_rounded, title: "Today's usage"),
                const SizedBox(height: LATokens.space2),
                LACard(
                  child: Column(
                    children: [
                      _meterRow(c, 'AI Tutor chats', _chatsToday, _isPro ? null : 20),
                      const SizedBox(height: 12),
                      _meterRow(c, 'Evaluations & analyses', _analysesToday, _isPro ? null : 20),
                    ],
                  ),
                ),
                if (!_isPro) ...[
                  const SizedBox(height: LATokens.space5),
                  const SectionHeader(icon: Icons.workspace_premium_outlined, title: 'Request Pro Access'),
                  const SizedBox(height: LATokens.space2),
                  LACard(
                    child: _requestExists
                        ? Row(
                            children: [
                              Icon(Icons.check_circle_outline_rounded, color: c.green),
                              const SizedBox(width: 10),
                              Expanded(
                                child: Text(
                                  'Your Pro access request is pending review.',
                                  style: TextStyle(color: c.text, fontSize: LATokens.fsSm),
                                ),
                              ),
                            ],
                          )
                        : Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              LAInput(
                                label: 'Note (optional)',
                                hint: 'Tell us about your exam goals...',
                                controller: _msgCtrl,
                                minLines: 2,
                                maxLines: 4,
                              ),
                              const SizedBox(height: LATokens.space3),
                              LAButton(
                                text: 'Request Pro access',
                                loading: _submitting,
                                onPressed: _requestPro,
                              ),
                            ],
                          ),
                  ),
                ],
              ],
            ),
    );
  }

  Widget _meterRow(LAColors c, String label, int used, int? limit) {
    final pct = limit == null ? 0.0 : (used / limit).clamp(0.0, 1.0);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(label, style: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w500, color: c.text)),
            Text(
              limit == null ? '$used (Unlimited)' : '$used / $limit',
              style: TextStyle(fontSize: LATokens.fsXs, color: c.textMuted),
            ),
          ],
        ),
        if (limit != null) ...[
          const SizedBox(height: 6),
          ClipRRect(
            borderRadius: BorderRadius.circular(LATokens.radiusFull),
            child: LinearProgressIndicator(
              value: pct,
              minHeight: 6,
              backgroundColor: c.surfaceElevated,
              color: pct > 0.85 ? c.red : c.accent,
            ),
          ),
        ],
      ],
    );
  }
}
