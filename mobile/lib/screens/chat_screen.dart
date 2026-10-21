import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';
import '../theme/design_tokens.dart';
import '../theme/app_theme.dart';
import '../widgets/app_components.dart';
import '../widgets/app_drawer.dart';

class ChatScreen extends StatefulWidget {
  const ChatScreen({super.key});

  @override
  State<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends State<ChatScreen> {
  final List<Map<String, dynamic>> _messages = [];
  final TextEditingController _controller = TextEditingController();
  bool _sending = false;
  bool _searchEnabled = false;
  bool _showWelcome = true;
  double _scrollPercent = 0;
  String _scrollDirection = 'down';

  @override
  void initState() {
    super.initState();
    _addWelcome();
  }

  void _addWelcome() {
    setState(() {
      _messages.add({
        'type': 'assistant',
        'text': 'Hi! I’m Learning Allied — your study companion. Ask me anything about Physics, Chemistry, Maths or your syllabus.',
        'time': DateTime.now(),
      });
      _showWelcome = false;
    });
  }

  void _sendMessage() {
    final text = _controller.text.trim();
    if (text.isEmpty || _sending) return;
    setState(() {
      _messages.add({'type': 'user', 'text': text, 'time': DateTime.now()});
      _controller.clear();
      _sending = true;
      _showWelcome = false;
    });
    _callGroqProxy(text);
  }

  Future<void> _callGroqProxy(String text) async {
    final user = FirebaseAuth.instance.currentUser;
    String? token;
    if (user != null) token = await user.getIdToken();
    try {
      final resp = await http.post(
        Uri.parse('https://www.learningallied.world/api/groq-proxy'),
        headers: {
          'Content-Type': 'application/json',
          if (token != null) 'Authorization': 'Bearer $token',
        },
        body: jsonEncode({
          'model': 'openai/gpt-oss-120b',
          'messages': [
            {'role': 'system', 'content': 'You are a helpful AI tutor for JEE, NEET and Board exam students.'},
            {'role': 'user', 'content': text},
          ],
          'max_tokens': 1024,
          'temperature': 0.7,
        }),
      );
      if (!mounted) return;
      String reply;
      if (resp.statusCode == 200) {
        final data = jsonDecode(resp.body);
        reply = data['choices']?[0]?['message']?['content'] ?? 'No response from AI.';
      } else {
        reply = 'AI service error (${resp.statusCode}). Please try again.';
      }
      setState(() {
        _messages.add({'type': 'assistant', 'text': reply, 'time': DateTime.now()});
        _sending = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _messages.add({'type': 'assistant', 'text': 'Unable to reach AI service. Please check your connection.', 'time': DateTime.now()});
        _sending = false;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Scaffold(
      drawer: const AppDrawer(activeRoute: 'chat'),
      appBar: AppBar(
        leading: Builder(builder: (ctx) => IconButton(icon: const Icon(Icons.menu_rounded), onPressed: () => Scaffold.of(ctx).openDrawer())),
        title: Row(mainAxisSize: MainAxisSize.min, children: [
          Container(width: 8, height: 8, decoration: BoxDecoration(color: LATokens.accent, shape: BoxShape.circle), child: const SizedBox()),
          const SizedBox(width: 8),
          Text('Learning Allied', style: TextStyle(fontFamily: LATokens.fontDisplay, fontWeight: FontWeight.w700)),
        ]),
        backgroundColor: Colors.transparent,
        elevation: 0,
        centerTitle: false,
        actions: [
          IconButton(icon: const Icon(Icons.history_rounded, size: 20), onPressed: () {}),
          const SizedBox(width: LATokens.space1),
          CircleAvatar(
            radius: 16,
            backgroundColor: LATokens.accent,
            child: const Text('U', style: TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w700)),
          ),
          const SizedBox(width: LATokens.space1),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _showWelcome && _messages.isEmpty
                ? _buildWelcome(context)
                : _buildChatArea(context),
          ),
          _buildInputArea(context),
        ],
      ),
    );
  }

  Widget _buildWelcome(BuildContext context) {
    return Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Container(
            width: 52,
            height: 52,
            decoration: BoxDecoration(color: LATokens.bgCard, borderRadius: BorderRadius.circular(LATokens.radiusLg), border: Border.all(color: LATokens.border)),
            child: const Center(child: Text('A', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: LATokens.textMuted))),
          ),
          const SizedBox(height: LATokens.space2),
          const Text('Learning Allied', style: TextStyle(fontFamily: LATokens.fontDisplay, fontSize: LATokens.fs3xl, fontWeight: FontWeight.w700, color: LATokens.textPrimary)),
          const SizedBox(height: LATokens.space2),
          const Text('Ask me anything about your studies — JEE, NEET, Boards, or any subject.', style: TextStyle(color: LATokens.textSecondary, fontSize: LATokens.fsBase, height: LATokens.lhNormal), textAlign: TextAlign.center),
          const SizedBox(height: LATokens.space4),
          const Text('Suggestions', style: TextStyle(fontSize: LATokens.fsXs, fontWeight: FontWeight.w600, color: LATokens.textMuted, letterSpacing: 0.08)),
          const SizedBox(height: LATokens.space2),
          Wrap(
            spacing: LATokens.space1,
            runSpacing: LATokens.space1,
            children: [
              _suggestionChip('Explain a concept'),
              _suggestionChip('Practice quiz'),
              _suggestionChip('Study plan'),
              _suggestionChip('Arena battles'),
            ],
          ),
        ],
      ),
    );
  }

  Widget _suggestionChip(String text) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return GestureDetector(
      onTap: () {
        _controller.text = text;
        _sendMessage();
      },
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: LATokens.space3, vertical: LATokens.space1),
        decoration: BoxDecoration(
          color: dark ? LATokens.bgCard : LATokens.lightBgCard,
          borderRadius: BorderRadius.circular(LATokens.radiusLg),
          border: Border.all(color: (dark ? LATokens.border : LATokens.lightBorder)),
        ),
        child: Text(text, style: const TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w500, color: LATokens.textPrimary)),
      ),
    );
  }

  Widget _buildChatArea(BuildContext context) {
    return ListView.builder(
      padding: const EdgeInsets.all(LATokens.space3),
      itemCount: _messages.length,
      itemBuilder: (context, i) {
        final m = _messages[i];
        final isUser = m['type'] == 'user';
        return _messageRow(isUser, m['text'], m['time']);
      },
    );
  }

  Widget _messageRow(bool isUser, String text, DateTime time) {
    return Padding(
      padding: const EdgeInsets.only(bottom: LATokens.space3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: isUser ? MainAxisAlignment.end : MainAxisAlignment.start,
        children: [
          if (!isUser) ...[
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(color: LATokens.bgCard, borderRadius: BorderRadius.circular(8)),
              child: const Center(child: Text('A', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: LATokens.textMuted))),
            ),
            const SizedBox(width: LATokens.space1),
          ],
          Flexible(
            child: Container(
              constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.78),
              padding: const EdgeInsets.all(LATokens.space3),
              decoration: BoxDecoration(
                color: isUser ? LATokens.bgElevated : LATokens.bgCard,
                borderRadius: BorderRadius.circular(LATokens.radiusLg),
                border: Border.all(color: isUser ? LATokens.borderSubtle : LATokens.border),
              ),
              child: Text(text, style: const TextStyle(fontSize: LATokens.fsBase, color: LATokens.textPrimary, height: LATokens.lhNormal)),
            ),
          ),
          if (isUser) ...[
            const SizedBox(width: LATokens.space1),
            Container(
              width: 28,
              height: 28,
              decoration: BoxDecoration(color: LATokens.bgCard, borderRadius: BorderRadius.circular(8)),
              child: const Center(child: Text('U', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w700, color: LATokens.textMuted))),
            ),
          ],
        ],
      ),
    );
  }

  Widget _buildInputArea(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: EdgeInsets.fromLTRB(LATokens.space2, LATokens.space2, LATokens.space2, LATokens.space2 + MediaQuery.of(context).viewPadding.bottom),
      decoration: BoxDecoration(
        color: dark ? LATokens.bgCard : LATokens.lightBgCard,
        border: Border(top: BorderSide(color: (dark ? LATokens.border : LATokens.lightBorder))),
      ),
      child: Row(
        children: [
          Expanded(
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: LATokens.space3),
              decoration: BoxDecoration(
                color: dark ? LATokens.bgElevated : LATokens.lightBgCard,
                borderRadius: BorderRadius.circular(LATokens.radiusFull),
                border: Border.all(color: (dark ? LATokens.border : LATokens.lightBorder)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _controller,
                      enabled: !_sending,
                      minLines: 1,
                      maxLines: 5,
                      style: const TextStyle(color: LATokens.textPrimary, fontSize: LATokens.fsBase),
                      decoration: InputDecoration(
                        hintText: 'Ask me anything about your studies…',
                        hintStyle: const TextStyle(color: LATokens.textFaint, fontSize: LATokens.fsBase),
                        border: InputBorder.none,
                        contentPadding: const EdgeInsets.symmetric(vertical: LATokens.space1),
                      ),
                      onSubmitted: (_) => _sendMessage(),
                    ),
                  ),
                  const SizedBox(width: LATokens.space1),
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(color: LATokens.textPrimary, borderRadius: BorderRadius.circular(LATokens.radiusMd)),
                    child: Icon(Icons.arrow_upward_rounded, size: 18, color: LATokens.bgBase),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
