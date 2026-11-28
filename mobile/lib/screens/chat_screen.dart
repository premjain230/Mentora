import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../services/api_client.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../services/learning_service.dart';
import '../services/voice_service.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_components.dart';
import '../widgets/markdown_math_text.dart';
import 'subscription_screen.dart';

class ChatScreen extends StatefulWidget {
  final String? initialConceptId;
  final String? initialPrompt;

  const ChatScreen({
    super.key,
    this.initialConceptId,
    this.initialPrompt,
  });

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final _inputCtrl = TextEditingController();
  final _scrollCtrl = ScrollController();

  final List<Map<String, dynamic>> _messages = [];
  String? _chatId;
  String _model = 'auto';
  bool _tutorStructuredMode = true;
  bool _streaming = false;
  StreamSubscription<Map<String, dynamic>>? _streamSub;
  String? _conceptId;

  static const _models = [
    ('auto', 'Auto (Best)'),
    ('gemini-2.5-flash', 'Gemini 2.5 Flash'),
    ('llama-3.3-70b-versatile', 'Llama 3.3 70B'),
    ('openai/gpt-oss-120b', 'GPT-OSS 120B'),
    ('qwen/qwen3.6-27b', 'Qwen 3.6 27B'),
  ];

  static const _suggestions = [
    'Explain Newton\'s Laws with a real-world example',
    'Help me solve a quadratic equation step by step',
    'Create a 5-question practice drill on Thermodynamics',
    'Summarize Organic Chemistry reaction mechanisms',
  ];

  @override
  void initState() {
    super.initState();
    _conceptId = widget.initialConceptId;
    if (widget.initialPrompt != null && widget.initialPrompt!.trim().isNotEmpty) {
      _inputCtrl.text = widget.initialPrompt!;
      WidgetsBinding.instance.addPostFrameCallback((_) => _send());
    }
  }

  @override
  void dispose() {
    _streamSub?.cancel();
    _inputCtrl.dispose();
    _scrollCtrl.dispose();
    super.dispose();
  }

  LearningService get _svc => LearningService(ApiClient(context.read<AuthService>()));

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollCtrl.hasClients) {
        _scrollCtrl.animateTo(
          _scrollCtrl.position.maxScrollExtent,
          duration: LATokens.durFast,
          curve: Curves.easeOut,
        );
      }
    });
  }

  Future<void> _ensureChatDoc(String firstPrompt) async {
    if (_chatId != null) return;
    final auth = context.read<AuthService>();
    final uid = auth.user?.uid;
    if (uid == null) return;
    final id = 'chat_${DateTime.now().millisecondsSinceEpoch}';
    _chatId = id;
    final now = DateTime.now().toUtc().toIso8601String();
    final title = firstPrompt.length > 60 ? '${firstPrompt.substring(0, 60)}...' : firstPrompt;
    try {
      await FirestoreService(auth).setDoc('users/$uid/chats/$id', {
        'title': title,
        'createdAt': now,
        'updatedAt': now,
        'messageCount': 0,
        'pinned': false,
      });
    } catch (_) {}
  }

  Future<void> _persistMessage(String role, String content) async {
    final auth = context.read<AuthService>();
    final uid = auth.user?.uid;
    if (uid == null || _chatId == null || content.trim().isEmpty) return;
    final now = DateTime.now().toUtc().toIso8601String();
    final msgId = 'm_${DateTime.now().microsecondsSinceEpoch}';
    try {
      final fs = FirestoreService(auth);
      await fs.setDoc('users/$uid/chats/$_chatId/messages/$msgId', {
        'role': role,
        'content': content,
        'ts': now,
      });
      await fs.setDoc('users/$uid/chats/$_chatId', {
        'updatedAt': now,
        'messageCount': _messages.length,
      });
    } catch (_) {}
  }

  Future<void> _send() async {
    final text = _inputCtrl.text.trim();
    if (text.isEmpty || _streaming) return;

    _inputCtrl.clear();
    setState(() {
      _messages.add({'role': 'user', 'content': text});
      _messages.add({'role': 'assistant', 'content': '', 'streaming': true});
      _streaming = true;
    });
    _scrollToBottom();

    await _ensureChatDoc(text);
    _persistMessage('user', text);

    if (_tutorStructuredMode) {
      await _runTutorChat(text);
    } else {
      await _runStreamChat();
    }
  }

  Future<void> _runTutorChat(String question) async {
    try {
      final completed = _messages
          .where((m) => m['streaming'] != true && (m['content'] ?? '').toString().isNotEmpty)
          .toList();
      final recent = completed.length > 12 ? completed.sublist(completed.length - 12) : completed;
      final history = recent
          .map((m) => {
                'role': m['role'].toString(),
                'content': m['content'].toString(),
              })
          .toList();

      final res = await _svc.tutorChat(
        question: question,
        conceptId: _conceptId,
        history: history,
        model: _model == 'auto' ? null : _model,
      );

      final reply = res['reply'] as Map<String, dynamic>?;
      final formatted = _formatTutorReply(reply, res);

      if (!mounted) return;
      setState(() {
        _messages.last = {
          'role': 'assistant',
          'content': formatted,
          'meta': res['meta'],
          'streaming': false,
        };
        _streaming = false;
      });
      _persistMessage('assistant', formatted);
      _scrollToBottom();
    } on ApiException catch (e) {
      _handleApiError(e);
    } catch (e) {
      _handleGenericError(e);
    }
  }

  String _formatTutorReply(Map<String, dynamic>? reply, Map<String, dynamic> raw) {
    if (reply == null) return raw['answer']?.toString() ?? 'No response.';
    final buf = StringBuffer();
    final title = (reply['title'] ?? '').toString().trim();
    final direct = (reply['directAnswer'] ?? '').toString().trim();
    final keyIdea = (reply['keyIdea'] ?? '').toString().trim();
    final example = (reply['example'] ?? '').toString().trim();

    if (title.isNotEmpty) buf.writeln('### $title\n');
    if (direct.isNotEmpty) buf.writeln('$direct\n');
    if (keyIdea.isNotEmpty) buf.writeln('**Key Idea:** $keyIdea\n');

    final sections = reply['sections'];
    if (sections is List) {
      for (final s in sections) {
        if (s is Map) {
          final h = (s['heading'] ?? s['title'] ?? '').toString().trim();
          final b = (s['body'] ?? s['content'] ?? '').toString().trim();
          if (h.isNotEmpty) buf.writeln('**$h**');
          if (b.isNotEmpty) buf.writeln('$b\n');
        }
      }
    }

    if (example.isNotEmpty) buf.writeln('**Example:**\n$example\n');

    final check = reply['check'];
    if (check is Map && (check['question'] ?? '').toString().trim().isNotEmpty) {
      buf.writeln('> **Quick check:** ${check['question']}');
    }

    final out = buf.toString().trim();
    return out.isNotEmpty ? out : 'No response generated.';
  }

  Future<void> _runStreamChat() async {
    final history = _messages
        .where((m) => m['streaming'] != true && (m['content'] ?? '').toString().isNotEmpty)
        .map((m) => {
              'role': m['role'].toString(),
              'content': m['content'].toString(),
            })
        .toList();

    final msgs = <Map<String, String>>[
      {
        'role': 'system',
        'content': 'You are Learning Allied, a clear, accurate AI tutor for school and competitive exams. Use markdown and LaTeX (\$...\$) for formulas.',
      },
      ...history,
    ];

    final acc = StringBuffer();
    try {
      final stream = _svc.streamChat(messages: msgs, model: _model);
      _streamSub = stream.listen(
        (chunk) {
          if (!mounted) return;
          if (chunk['event'] == 'provider_switch' && chunk['reset'] == true) {
            acc.clear();
            setState(() {
              _messages.last['content'] = '';
            });
            return;
          }
          final choices = chunk['choices'];
          if (choices is List && choices.isNotEmpty) {
            final delta = choices.first['delta'];
            if (delta is Map && delta['content'] != null) {
              acc.write(delta['content'].toString());
              setState(() {
                _messages.last['content'] = acc.toString();
              });
              _scrollToBottom();
            }
          }
        },
        onError: (e) {
          if (e is ApiException) {
            _handleApiError(e);
          } else {
            _handleGenericError(e);
          }
        },
        onDone: () {
          if (!mounted) return;
          final finalText = acc.toString().trim();
          setState(() {
            _messages.last['content'] = finalText.isNotEmpty ? finalText : 'No response received.';
            _messages.last['streaming'] = false;
            _streaming = false;
          });
          if (finalText.isNotEmpty) {
            _persistMessage('assistant', finalText);
          }
        },
      );
    } on ApiException catch (e) {
      _handleApiError(e);
    } catch (e) {
      _handleGenericError(e);
    }
  }

  void _stopStreaming() {
    _streamSub?.cancel();
    _streamSub = null;
    if (mounted) {
      setState(() {
        if (_messages.isNotEmpty) _messages.last['streaming'] = false;
        _streaming = false;
      });
    }
  }

  void _handleApiError(ApiException e) {
    if (!mounted) return;
    setState(() {
      if (_messages.isNotEmpty && _messages.last['streaming'] == true) {
        _messages.last = {
          'role': 'assistant',
          'content': e.message,
          'error': true,
          'streaming': false,
        };
      }
      _streaming = false;
    });
    if (e.isLimitReached) {
      showDialog(
        context: context,
        builder: (_) => AlertDialog(
          title: const Text('Daily limit reached'),
          content: Text(e.message),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Close')),
            FilledButton(
              onPressed: () {
                Navigator.pop(context);
                Navigator.push(context, MaterialPageRoute(builder: (_) => const SubscriptionScreen()));
              },
              child: const Text('View Pro'),
            ),
          ],
        ),
      );
    }
  }

  void _handleGenericError(Object e) {
    if (!mounted) return;
    setState(() {
      if (_messages.isNotEmpty && _messages.last['streaming'] == true) {
        _messages.last = {
          'role': 'assistant',
          'content': 'Connection error: $e',
          'error': true,
          'streaming': false,
        };
      }
      _streaming = false;
    });
  }

  void _newChat() {
    _stopStreaming();
    setState(() {
      _chatId = null;
      _messages.clear();
    });
  }

  void _openHistorySheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => _ChatHistorySheet(
        onSelectChat: (chatId) async {
          Navigator.pop(context);
          await _loadChat(chatId);
        },
        onDeleteChat: (chatId) async {
          await _svc.deleteChat(chatId);
          if (_chatId == chatId) _newChat();
        },
      ),
    );
  }

  Future<void> _loadChat(String chatId) async {
    try {
      final auth = context.read<AuthService>();
      final uid = auth.user?.uid;
      if (uid == null) return;
      final fs = FirestoreService(auth);
      final docs = await fs.listDocs(
        'users/$uid/chats/$chatId/messages',
        pageSize: 100,
        orderBy: 'ts',
      );
      if (!mounted) return;
      setState(() {
        _chatId = chatId;
        _messages
          ..clear()
          ..addAll(docs.map((d) => {
                'role': (d['role'] ?? 'assistant').toString(),
                'content': (d['content'] ?? '').toString(),
                'streaming': false,
              }));
      });
      _scrollToBottom();
    } catch (e) {
      if (mounted) LAToast.show(context, 'Failed to load chat: $e', isError: true);
    }
  }

  void _openVoiceSheet() {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => _VoiceSessionSheet(svc: _svc),
    );
  }

  Future<void> _sendFeedback(String content, bool positive) async {
    try {
      await _svc.submitFeedback(
        category: 'ai_response',
        rating: positive ? 5 : 2,
        page: 'mobile_chat',
        message: '${positive ? 'Helpful' : 'Needs improvement'}: ${content.substring(0, content.length.clamp(0, 160))}',
      );
      if (mounted) LAToast.show(context, 'Feedback submitted', isSuccess: true);
    } catch (e) {
      if (mounted) LAToast.show(context, 'Feedback error: $e', isError: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    return Scaffold(
      appBar: AppBar(
        title: const Text('AI Tutor'),
        actions: [
          PopupMenuButton<String>(
            tooltip: 'Model',
            initialValue: _model,
            onSelected: (v) => setState(() => _model = v),
            itemBuilder: (_) => _models
                .map((m) => PopupMenuItem(value: m.$1, child: Text(m.$2)))
                .toList(),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 6),
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                decoration: BoxDecoration(
                  color: c.surfaceElevated,
                  borderRadius: BorderRadius.circular(LATokens.radiusFull),
                  border: Border.all(color: c.border),
                ),
                child: Row(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      _models.firstWhere((m) => m.$1 == _model).$2.split(' ').first,
                      style: TextStyle(fontSize: LATokens.fsXs, fontWeight: FontWeight.w600, color: c.text),
                    ),
                    const SizedBox(width: 4),
                    Icon(Icons.expand_more_rounded, size: 15, color: c.textMuted),
                  ],
                ),
              ),
            ),
          ),
          IconButton(
            tooltip: 'Voice session',
            icon: const Icon(Icons.graphic_eq_rounded),
            onPressed: _openVoiceSheet,
          ),
          IconButton(
            tooltip: 'Chat history',
            icon: const Icon(Icons.history_rounded),
            onPressed: _openHistorySheet,
          ),
          IconButton(
            tooltip: 'New chat',
            icon: const Icon(Icons.add_comment_outlined),
            onPressed: _newChat,
          ),
        ],
      ),
      body: Column(
        children: [
          // Mode bar: Tutor (structured) vs Stream (SSE)
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 4, 16, 8),
            child: LASegmentedControl<bool>(
              value: _tutorStructuredMode,
              items: const [
                (true, 'Structured Tutor'),
                (false, 'Live Stream'),
              ],
              onChanged: (v) => setState(() => _tutorStructuredMode = v),
            ),
          ),

          Expanded(
            child: _messages.isEmpty
                ? _buildEmptyState(c)
                : ListView.builder(
                    controller: _scrollCtrl,
                    keyboardDismissBehavior: ScrollViewKeyboardDismissBehavior.onDrag,
                    padding: const EdgeInsets.all(LATokens.space4),
                    itemCount: _messages.length,
                    itemBuilder: (_, i) => _buildMessage(c, _messages[i]),
                  ),
          ),

          // Composer
          Container(
            padding: EdgeInsets.fromLTRB(
              LATokens.space3,
              LATokens.space2,
              LATokens.space3,
              LATokens.space2 + MediaQuery.of(context).viewPadding.bottom,
            ),
            decoration: BoxDecoration(
              color: c.surface,
              border: Border(top: BorderSide(color: c.border)),
            ),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
                    decoration: BoxDecoration(
                      color: c.surfaceInput,
                      borderRadius: BorderRadius.circular(LATokens.radiusXl),
                      border: Border.all(color: c.border),
                    ),
                    child: TextField(
                      controller: _inputCtrl,
                      minLines: 1,
                      maxLines: 5,
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(),
                      style: TextStyle(color: c.text, fontSize: LATokens.fsBase),
                      decoration: InputDecoration(
                        hintText: 'Ask anything about your syllabus...',
                        hintStyle: TextStyle(color: c.textFaint),
                        border: InputBorder.none,
                        enabledBorder: InputBorder.none,
                        focusedBorder: InputBorder.none,
                        filled: false,
                        contentPadding: const EdgeInsets.symmetric(vertical: 8),
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                SizedBox(
                  width: 42,
                  height: 42,
                  child: Material(
                    color: _streaming ? c.red : c.text,
                    borderRadius: BorderRadius.circular(LATokens.radiusFull),
                    child: InkWell(
                      borderRadius: BorderRadius.circular(LATokens.radiusFull),
                      onTap: _streaming ? _stopStreaming : _send,
                      child: Icon(
                        _streaming ? Icons.stop_rounded : Icons.arrow_upward_rounded,
                        color: _streaming ? Colors.white : c.bg,
                        size: 20,
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildEmptyState(LAColors c) {
    return ListView(
      padding: LALayout.pagePadding(context, top: 28, bottom: 24),
      children: [
        const Center(child: LALogoMark(size: 38)),
        const SizedBox(height: LATokens.space4),
        Text(
          'What are we learning today?',
          textAlign: TextAlign.center,
          style: LATypo.screenTitle(c),
        ),
        const SizedBox(height: 6),
        Text(
          'Use Structured Tutor for guided lessons or Live Stream for direct answers.',
          textAlign: TextAlign.center,
          style: LATypo.secondary(c),
        ),
        const SizedBox(height: LATokens.space6),
        LAGroupedList(
          children: _suggestions.map((s) {
            return LAListRow(
              title: s,
              trailing: Icon(Icons.arrow_upward_rounded, size: 17, color: c.textMuted),
              onTap: () {
                _inputCtrl.text = s;
                _send();
              },
            );
          }).toList(),
        ),
      ],
    );
  }

  Widget _buildMessage(LAColors c, Map<String, dynamic> m) {
    final isUser = m['role'] == 'user';
    final content = (m['content'] ?? '').toString();
    final isStreaming = m['streaming'] == true;
    final isError = m['error'] == true;

    if (isUser) {
      return Align(
        alignment: Alignment.centerRight,
        child: Container(
          margin: const EdgeInsets.only(bottom: LATokens.space3, left: 48),
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: c.surfaceElevated,
            borderRadius: BorderRadius.circular(LATokens.radiusLg),
            border: Border.all(color: c.border),
          ),
          child: Text(content, style: TextStyle(fontSize: LATokens.fsBase, color: c.text, height: LATokens.lhNormal)),
        ),
      );
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: LATokens.space4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const LALogoMark(size: 22),
              const SizedBox(width: 8),
              Text('Learning Allied', style: TextStyle(fontSize: LATokens.fsXs, fontWeight: FontWeight.w600, color: c.textSecondary)),
            ],
          ),
          const SizedBox(height: 8),
          if (content.isEmpty && isStreaming)
            Row(
              children: [
                SizedBox(width: 14, height: 14, child: CircularProgressIndicator(strokeWidth: 2, color: c.accent)),
                const SizedBox(width: 8),
                Text('Thinking...', style: TextStyle(fontSize: LATokens.fsSm, color: c.textMuted)),
              ],
            )
          else if (isError)
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: c.redSoft,
                borderRadius: BorderRadius.circular(LATokens.radiusMd),
                border: Border.all(color: c.red.withValues(alpha: 0.3)),
              ),
              child: Text(content, style: TextStyle(color: c.red, fontSize: LATokens.fsSm)),
            )
          else ...[
            MarkdownMathText(text: content),
            if (!isStreaming) ...[
              const SizedBox(height: 6),
              Row(
                children: [
                  IconButton(
                    icon: Icon(Icons.copy_rounded, size: 16, color: c.textMuted),
                    tooltip: 'Copy',
                    constraints: const BoxConstraints(),
                    padding: const EdgeInsets.all(6),
                    onPressed: () {
                      Clipboard.setData(ClipboardData(text: content));
                      LAToast.show(context, 'Copied to clipboard');
                    },
                  ),
                  IconButton(
                    icon: Icon(Icons.thumb_up_outlined, size: 16, color: c.textMuted),
                    tooltip: 'Helpful',
                    constraints: const BoxConstraints(),
                    padding: const EdgeInsets.all(6),
                    onPressed: () => _sendFeedback(content, true),
                  ),
                  IconButton(
                    icon: Icon(Icons.thumb_down_outlined, size: 16, color: c.textMuted),
                    tooltip: 'Needs improvement',
                    constraints: const BoxConstraints(),
                    padding: const EdgeInsets.all(6),
                    onPressed: () => _sendFeedback(content, false),
                  ),
                ],
              ),
            ],
          ],
        ],
      ),
    );
  }
}

class _ChatHistorySheet extends StatefulWidget {
  final ValueChanged<String> onSelectChat;
  final Future<void> Function(String) onDeleteChat;

  const _ChatHistorySheet({
    required this.onSelectChat,
    required this.onDeleteChat,
  });

  @override
  State<_ChatHistorySheet> createState() => _ChatHistorySheetState();
}

class _ChatHistorySheetState extends State<_ChatHistorySheet> {
  bool _loading = true;
  List<Map<String, dynamic>> _chats = [];
  String _query = '';

  @override
  void initState() {
    super.initState();
    _load();
  }

  Future<void> _load() async {
    try {
      final auth = context.read<AuthService>();
      final uid = auth.user?.uid;
      if (uid == null) {
        if (mounted) setState(() => _loading = false);
        return;
      }
      final docs = await FirestoreService(auth).listDocs('users/$uid/chats', pageSize: 50);
      docs.sort((a, b) {
        final ap = a['pinned'] == true ? 1 : 0;
        final bp = b['pinned'] == true ? 1 : 0;
        if (ap != bp) return bp.compareTo(ap);
        return (b['updatedAt'] ?? '').toString().compareTo((a['updatedAt'] ?? '').toString());
      });
      if (mounted) {
        setState(() {
          _chats = docs;
          _loading = false;
        });
      }
    } catch (_) {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _togglePin(Map<String, dynamic> ch) async {
    final auth = context.read<AuthService>();
    final uid = auth.user?.uid;
    final id = (ch['_id'] ?? '').toString();
    if (uid == null || id.isEmpty) return;
    final nextPinned = ch['pinned'] != true;
    await FirestoreService(auth).setDoc('users/$uid/chats/$id', {
      'pinned': nextPinned,
      if (nextPinned) 'pinnedAt': DateTime.now().toUtc().toIso8601String(),
    });
    _load();
  }

  Future<void> _renameChat(Map<String, dynamic> ch) async {
    final ctrl = TextEditingController(text: (ch['title'] ?? '').toString());
    final nextTitle = await showDialog<String>(
      context: context,
      builder: (_) => AlertDialog(
        title: const Text('Rename conversation'),
        content: TextField(controller: ctrl, autofocus: true),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(context, ctrl.text.trim()), child: const Text('Save')),
        ],
      ),
    );
    ctrl.dispose();
    if (nextTitle == null || nextTitle.isEmpty || !mounted) return;
    final auth = context.read<AuthService>();
    final uid = auth.user?.uid;
    final id = (ch['_id'] ?? '').toString();
    if (uid == null || id.isEmpty) return;
    await FirestoreService(auth).setDoc('users/$uid/chats/$id', {'title': nextTitle});
    _load();
  }

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    final filtered = _query.isEmpty
        ? _chats
        : _chats
            .where((ch) => (ch['title'] ?? '').toString().toLowerCase().contains(_query.toLowerCase()))
            .toList();

    return SafeArea(
      child: SizedBox(
        height: MediaQuery.of(context).size.height * 0.7,
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(20, 16, 12, 8),
              child: Row(
                children: [
                  Text('Conversations', style: TextStyle(fontSize: LATokens.fsLg, fontWeight: FontWeight.w700, color: c.text)),
                  const Spacer(),
                  IconButton(icon: Icon(Icons.close_rounded, color: c.textMuted), onPressed: () => Navigator.pop(context)),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 8),
              child: LAInput(
                hint: 'Search conversations...',
                prefixIcon: Icons.search_rounded,
                onChanged: (v) => setState(() => _query = v),
              ),
            ),
            const Divider(),
            Expanded(
              child: _loading
                  ? const Center(child: CircularProgressIndicator())
                  : filtered.isEmpty
                      ? const Center(child: Text('No matching conversations.'))
                      : ListView.builder(
                          itemCount: filtered.length,
                          itemBuilder: (_, i) {
                            final ch = filtered[i];
                            final id = (ch['_id'] ?? '').toString();
                            final title = (ch['title'] ?? 'Untitled chat').toString();
                            final pinned = ch['pinned'] == true;
                            return ListTile(
                              leading: Icon(
                                pinned ? Icons.push_pin_rounded : Icons.chat_bubble_outline_rounded,
                                size: 19,
                                color: pinned ? c.accent : c.textSecondary,
                              ),
                              title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
                              trailing: PopupMenuButton<String>(
                                onSelected: (action) async {
                                  if (action == 'pin') await _togglePin(ch);
                                  if (action == 'rename') await _renameChat(ch);
                                  if (action == 'delete') {
                                    if (!context.mounted) return;
                                    final confirm = await showDialog<bool>(
                                      context: context,
                                      builder: (_) => AlertDialog(
                                        title: const Text('Delete conversation?'),
                                        content: Text('Delete "$title"? This cannot be undone.'),
                                        actions: [
                                          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
                                          FilledButton(
                                            style: FilledButton.styleFrom(backgroundColor: c.red),
                                            onPressed: () => Navigator.pop(context, true),
                                            child: const Text('Delete'),
                                          ),
                                        ],
                                      ),
                                    );
                                    if (confirm == true) {
                                      await widget.onDeleteChat(id);
                                      _load();
                                    }
                                  }
                                },
                                itemBuilder: (_) => [
                                  PopupMenuItem(value: 'pin', child: Text(pinned ? 'Unpin' : 'Pin')),
                                  const PopupMenuItem(value: 'rename', child: Text('Rename')),
                                  PopupMenuItem(value: 'delete', child: Text('Delete', style: TextStyle(color: c.red))),
                                ],
                              ),
                              onTap: () => widget.onSelectChat(id),
                            );
                          },
                        ),
            ),
          ],
        ),
      ),
    );
  }
}

class _VoiceSessionSheet extends StatefulWidget {
  final LearningService svc;
  const _VoiceSessionSheet({required this.svc});

  @override
  State<_VoiceSessionSheet> createState() => _VoiceSessionSheetState();
}

class _VoiceSessionSheetState extends State<_VoiceSessionSheet> {
  late final VoiceSessionService _voice;

  @override
  void initState() {
    super.initState();
    _voice = VoiceSessionService(widget.svc)..addListener(_onVoiceChange);
    _voice.start();
  }

  void _onVoiceChange() {
    if (mounted) setState(() {});
  }

  @override
  void dispose() {
    _voice.removeListener(_onVoiceChange);
    _voice.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    final st = _voice.state;
    final active = st == VoiceSessionState.listening || st == VoiceSessionState.speaking;
    final isError = st == VoiceSessionState.error;

    return Padding(
      padding: EdgeInsets.fromLTRB(
        LATokens.space5,
        LATokens.space5,
        LATokens.space5,
        LATokens.space5 + MediaQuery.of(context).viewPadding.bottom,
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 60,
            height: 60,
            decoration: BoxDecoration(
              color: isError ? c.redSoft : (active ? c.greenSoft : c.accentSoft),
              shape: BoxShape.circle,
            ),
            child: Icon(
              isError
                  ? Icons.error_outline_rounded
                  : (st == VoiceSessionState.speaking
                      ? Icons.volume_up_rounded
                      : (_voice.isMuted ? Icons.mic_off_rounded : Icons.mic_rounded)),
              size: 28,
              color: isError ? c.red : (active ? c.green : c.accent),
            ),
          ),
          const SizedBox(height: LATokens.space3),
          Text('AI Voice Tutor', style: TextStyle(fontSize: LATokens.fsLg, fontWeight: FontWeight.w700, color: c.text)),
          const SizedBox(height: LATokens.space2),
          if (st == VoiceSessionState.connecting)
            const Padding(padding: EdgeInsets.all(10), child: CircularProgressIndicator()),
          Text(
            _voice.statusMessage,
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: LATokens.fsSm, color: isError ? c.red : c.textSecondary),
          ),
          const SizedBox(height: LATokens.space4),
          Row(
            children: [
              if (st == VoiceSessionState.listening ||
                  st == VoiceSessionState.speaking ||
                  st == VoiceSessionState.muted) ...[
                Expanded(
                  child: LAButton(
                    text: _voice.isMuted ? 'Unmute' : 'Mute',
                    icon: _voice.isMuted ? Icons.mic_rounded : Icons.mic_off_rounded,
                    type: ButtonType.secondary,
                    onPressed: _voice.toggleMute,
                  ),
                ),
                const SizedBox(width: 10),
              ],
              Expanded(
                child: LAButton(
                  text: 'End session',
                  type: ButtonType.danger,
                  onPressed: () {
                    _voice.stop();
                    Navigator.pop(context);
                  },
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
