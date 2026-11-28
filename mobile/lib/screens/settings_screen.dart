import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../services/learning_service.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_components.dart';

class SettingsScreen extends StatefulWidget {
  const SettingsScreen({super.key});

  @override
  State<SettingsScreen> createState() => _SettingsScreenState();
}

class _SettingsScreenState extends State<SettingsScreen> {
  bool _loadingMemory = true;
  List<Map<String, dynamic>> _memories = [];
  final _memCtrl = TextEditingController();
  final _fbCtrl = TextEditingController();
  String _fbCategory = 'general';
  bool _sendingFb = false;

  @override
  void initState() {
    super.initState();
    _loadMemory();
  }

  @override
  void dispose() {
    _memCtrl.dispose();
    _fbCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadMemory() async {
    try {
      final auth = context.read<AuthService>();
      final uid = auth.user?.uid;
      if (uid == null) {
        if (mounted) setState(() => _loadingMemory = false);
        return;
      }
      final doc = await FirestoreService(auth).getDoc('users/$uid/learning/memory');
      final items = (doc?['items'] as List<dynamic>?) ?? [];
      if (mounted) {
        setState(() {
          _memories = items.map((e) => Map<String, dynamic>.from(e as Map)).toList();
          _loadingMemory = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loadingMemory = false);
    }
  }

  Future<void> _addMemory() async {
    final text = _memCtrl.text.trim();
    if (text.isEmpty) return;
    if (_memories.length >= 60) {
      LAToast.show(context, 'Memory limit (60 items) reached', isError: true);
      return;
    }
    final next = [
      ..._memories,
      {
        'id': 'mem_${DateTime.now().millisecondsSinceEpoch}',
        'text': text,
        't': DateTime.now().millisecondsSinceEpoch,
      },
    ];
    _memCtrl.clear();
    await _saveMemories(next);
  }

  Future<void> _deleteMemory(int idx) async {
    final next = List<Map<String, dynamic>>.from(_memories)..removeAt(idx);
    await _saveMemories(next);
  }

  Future<void> _saveMemories(List<Map<String, dynamic>> next) async {
    try {
      final auth = context.read<AuthService>();
      final uid = auth.user?.uid;
      if (uid == null) {
        if (mounted) setState(() => _loadingMemory = false);
        return;
      }
      await FirestoreService(auth).setDoc('users/$uid/learning/memory', {'items': next});
      if (mounted) setState(() => _memories = next);
    } catch (e) {
      if (mounted) LAToast.show(context, 'Failed to update memory: $e', isError: true);
    }
  }

  Future<void> _sendPasswordReset() async {
    final auth = context.read<AuthService>();
    final email = auth.user?.email ?? '';
    if (email.isEmpty) return;
    try {
      await auth.sendPasswordResetEmail(email);
      if (mounted) LAToast.show(context, 'Password reset email sent to $email', isSuccess: true);
    } catch (e) {
      if (mounted) LAToast.show(context, 'Error: $e', isError: true);
    }
  }

  Future<void> _submitFeedback() async {
    final msg = _fbCtrl.text.trim();
    if (msg.isEmpty) {
      LAToast.show(context, 'Enter your feedback message', isError: true);
      return;
    }
    setState(() => _sendingFb = true);
    try {
      final svc = LearningService(ApiClient(context.read<AuthService>()));
      await svc.submitFeedback(category: _fbCategory, message: msg, page: 'mobile_settings');
      _fbCtrl.clear();
      if (mounted) LAToast.show(context, 'Feedback submitted — thank you!', isSuccess: true);
    } catch (e) {
      if (mounted) LAToast.show(context, 'Failed: $e', isError: true);
    } finally {
      if (mounted) setState(() => _sendingFb = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    final auth = context.watch<AuthService>();

    return Scaffold(
      appBar: AppBar(title: const Text('Settings')),
      body: ListView(
        padding: const EdgeInsets.all(LATokens.space4),
        children: [
          const SectionHeader(icon: Icons.memory_rounded, title: 'Long-Term AI Memory'),
          const SizedBox(height: 8),
          LACard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'Facts your AI tutor remembers across sessions (${_memories.length}/60).',
                  style: TextStyle(fontSize: LATokens.fsXs, color: c.textSecondary),
                ),
                const SizedBox(height: 10),
                Row(
                  children: [
                    Expanded(
                      child: LAInput(
                        controller: _memCtrl,
                        hint: 'e.g. Prefer concise derivations',
                      ),
                    ),
                    const SizedBox(width: 8),
                    SizedBox(
                      height: 44,
                      child: FilledButton(onPressed: _addMemory, child: const Text('Add')),
                    ),
                  ],
                ),
                const SizedBox(height: 10),
                if (_loadingMemory)
                  const Center(child: Padding(padding: EdgeInsets.all(12), child: CircularProgressIndicator()))
                else if (_memories.isEmpty)
                  Text('No saved memories yet.', style: TextStyle(fontSize: LATokens.fsXs, color: c.textMuted))
                else
                  ...List.generate(_memories.length, (i) {
                    return ListTile(
                      dense: true,
                      contentPadding: EdgeInsets.zero,
                      title: Text((_memories[i]['text'] ?? '').toString(), style: TextStyle(fontSize: LATokens.fsSm, color: c.text)),
                      trailing: IconButton(
                        icon: Icon(Icons.delete_outline_rounded, size: 18, color: c.red),
                        onPressed: () => _deleteMemory(i),
                      ),
                    );
                  }),
              ],
            ),
          ),

          const SizedBox(height: LATokens.space5),
          const SectionHeader(icon: Icons.feedback_outlined, title: 'Feedback & Bug Report'),
          const SizedBox(height: 8),
          LACard(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 8,
                  children: [
                    ('general', 'General'),
                    ('bug_report', 'Bug'),
                    ('feature_request', 'Feature'),
                    ('ui_ux', 'Design'),
                  ].map((cat) {
                    return ChoiceChip(
                      label: Text(cat.$2),
                      selected: _fbCategory == cat.$1,
                      onSelected: (_) => setState(() => _fbCategory = cat.$1),
                    );
                  }).toList(),
                ),
                const SizedBox(height: 10),
                LAInput(
                  controller: _fbCtrl,
                  hint: 'Share feedback or report an issue...',
                  minLines: 2,
                  maxLines: 4,
                ),
                const SizedBox(height: 10),
                LAButton(
                  text: 'Submit feedback',
                  loading: _sendingFb,
                  onPressed: _submitFeedback,
                ),
              ],
            ),
          ),

          const SizedBox(height: LATokens.space5),
          const SectionHeader(icon: Icons.security_rounded, title: 'Account'),
          const SizedBox(height: 8),
          LACard(
            child: Column(
              children: [
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: const Text('Email'),
                  subtitle: Text(auth.user?.email ?? '—'),
                  trailing: Icon(
                    auth.user?.emailVerified == true ? Icons.verified_rounded : Icons.warning_amber_rounded,
                    color: auth.user?.emailVerified == true ? c.green : c.amber,
                  ),
                ),
                const Divider(),
                ListTile(
                  contentPadding: EdgeInsets.zero,
                  leading: const Icon(Icons.lock_reset_rounded),
                  title: const Text('Send password reset email'),
                  onTap: _sendPasswordReset,
                ),
              ],
            ),
          ),
          const SizedBox(height: LATokens.space4),
          LAButton(
            text: 'Sign out',
            type: ButtonType.danger,
            icon: Icons.logout_rounded,
            onPressed: () async {
              await auth.signOut();
              if (context.mounted) Navigator.popUntil(context, (r) => r.isFirst);
            },
          ),
          const SizedBox(height: LATokens.space6),
        ],
      ),
    );
  }
}
