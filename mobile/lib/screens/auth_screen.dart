import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../services/auth_service.dart';
import '../services/firestore_service.dart';
import '../theme/design_tokens.dart';
import '../widgets/app_components.dart';

class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  // 'signin' | 'signup' | 'forgot'
  String _mode = 'signin';
  int _signupStep = 1;
  bool _loading = false;
  bool _obscure = true;

  final _nameCtrl = TextEditingController();
  final _emailCtrl = TextEditingController();
  final _passCtrl = TextEditingController();
  String _role = 'student';
  String _goal = 'Concept mastery';

  @override
  void dispose() {
    _nameCtrl.dispose();
    _emailCtrl.dispose();
    _passCtrl.dispose();
    super.dispose();
  }

  Future<void> _submitSignIn() async {
    final email = _emailCtrl.text.trim();
    final pass = _passCtrl.text;
    if (email.isEmpty || pass.isEmpty) {
      LAToast.show(context, 'Enter your email and password', isError: true);
      return;
    }
    setState(() => _loading = true);
    try {
      await context.read<AuthService>().signInWithEmail(email, pass);
    } catch (e) {
      if (mounted) LAToast.show(context, e.toString().replaceFirst('Exception: ', ''), isError: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submitSignUp() async {
    final name = _nameCtrl.text.trim();
    final email = _emailCtrl.text.trim();
    final pass = _passCtrl.text;
    if (_signupStep == 1) {
      if (name.isEmpty || email.isEmpty || pass.length < 6) {
        LAToast.show(context, 'Enter your name, email, and a 6+ character password', isError: true);
        return;
      }
      setState(() => _signupStep = 2);
      return;
    }

    setState(() => _loading = true);
    try {
      final auth = context.read<AuthService>();
      await auth.signUpWithEmail(name: name, email: email, password: pass);
      final uid = auth.user?.uid;
      if (uid != null && uid.isNotEmpty) {
        final fs = FirestoreService(auth);
        await fs.setDoc('users/$uid', {
          'uid': uid,
          'displayName': name,
          'name': name,
          'email': email,
          'plan': 'free',
          'role': _role,
          'goal': _goal,
          'createdAt': DateTime.now().toUtc().toIso8601String(),
          'updatedAt': DateTime.now().toUtc().toIso8601String(),
        });
      }
    } catch (e) {
      if (mounted) LAToast.show(context, e.toString().replaceFirst('Exception: ', ''), isError: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submitForgot() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty) {
      LAToast.show(context, 'Enter your account email', isError: true);
      return;
    }
    setState(() => _loading = true);
    try {
      await context.read<AuthService>().sendPasswordResetEmail(email);
      if (mounted) {
        LAToast.show(context, 'Password reset email sent to $email', isSuccess: true);
        setState(() => _mode = 'signin');
      }
    } catch (e) {
      if (mounted) LAToast.show(context, e.toString().replaceFirst('Exception: ', ''), isError: true);
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _submitGoogle() async {
    setState(() => _loading = true);
    try {
      await context.read<AuthService>().signInWithGoogle();
    } catch (e) {
      if (mounted) {
        LAToast.show(context, e.toString().replaceFirst('Exception: ', ''), isError: true);
      }
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: LALayout.pagePadding(context, top: 24, bottom: 24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Row(
                    children: [
                      const LALogoMark(size: 36),
                      const SizedBox(width: LATokens.space3),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              'Learning Allied',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(
                                fontSize: LATokens.fsLg,
                                fontWeight: FontWeight.w700,
                                letterSpacing: -0.3,
                                color: c.text,
                              ),
                            ),
                            Text(
                              'AI learning environment',
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                              style: TextStyle(fontSize: LATokens.fsXs, color: c.textMuted),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: LATokens.space7),
                  Text(
                    _mode == 'signin'
                        ? 'Welcome back'
                        : (_mode == 'signup' ? 'Create your account' : 'Reset password'),
                    style: LATypo.screenTitle(c),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _mode == 'signin'
                        ? 'Sign in to continue your learning, plans, and tutor sessions.'
                        : (_mode == 'signup'
                            ? (_signupStep == 1 ? 'Step 1 of 2 — Account details' : 'Step 2 of 2 — Learning focus')
                            : 'Enter your email to receive a password reset link.'),
                    style: LATypo.secondary(c),
                  ),
                  const SizedBox(height: LATokens.space6),
                  if (_mode == 'signup' && _signupStep == 1) ...[
                    LAInput(
                      label: 'Full name',
                      hint: 'Alex Rivera',
                      controller: _nameCtrl,
                      prefixIcon: Icons.person_outline_rounded,
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: LATokens.space3),
                  ],
                  if (!(_mode == 'signup' && _signupStep == 2)) ...[
                    LAInput(
                      label: 'Email',
                      hint: 'you@example.com',
                      controller: _emailCtrl,
                      prefixIcon: Icons.mail_outline_rounded,
                      keyboardType: TextInputType.emailAddress,
                      textInputAction: _mode == 'forgot' ? TextInputAction.done : TextInputAction.next,
                    ),
                  ],
                  if (_mode == 'signin' || (_mode == 'signup' && _signupStep == 1)) ...[
                    const SizedBox(height: LATokens.space3),
                    LAInput(
                      label: 'Password',
                      hint: 'At least 6 characters',
                      controller: _passCtrl,
                      prefixIcon: Icons.lock_outline_rounded,
                      obscureText: _obscure,
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _mode == 'signin' ? _submitSignIn() : _submitSignUp(),
                      suffixIcon: IconButton(
                        icon: Icon(
                          _obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined,
                          size: 19,
                          color: c.textMuted,
                        ),
                        onPressed: () => setState(() => _obscure = !_obscure),
                      ),
                    ),
                  ],
                  if (_mode == 'signup' && _signupStep == 2) ...[
                    Text('I am a', style: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w500, color: c.textSecondary)),
                    const SizedBox(height: LATokens.space2),
                    Wrap(
                      spacing: 8,
                      children: ['student', 'parent', 'educator'].map((r) {
                        final selected = _role == r;
                        return ChoiceChip(
                          label: Text(r[0].toUpperCase() + r.substring(1)),
                          selected: selected,
                          onSelected: (_) => setState(() => _role = r),
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: LATokens.space4),
                    Text('Primary goal', style: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w500, color: c.textSecondary)),
                    const SizedBox(height: LATokens.space2),
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: [
                        'Concept mastery',
                        'Exam preparation',
                        'Daily practice',
                        'Revision',
                      ].map((g) {
                        final selected = _goal == g;
                        return ChoiceChip(
                          label: Text(g),
                          selected: selected,
                          onSelected: (_) => setState(() => _goal = g),
                        );
                      }).toList(),
                    ),
                  ],
                  if (_mode == 'signin') ...[
                    const SizedBox(height: LATokens.space2),
                    Align(
                      alignment: Alignment.centerRight,
                      child: TextButton(
                        onPressed: () => setState(() => _mode = 'forgot'),
                        child: Text('Forgot password?', style: TextStyle(fontSize: LATokens.fsSm, color: c.accent)),
                      ),
                    ),
                  ] else
                    const SizedBox(height: LATokens.space5),
                  LAButton(
                    text: _mode == 'signin'
                        ? 'Sign in'
                        : (_mode == 'signup'
                            ? (_signupStep == 1 ? 'Continue' : 'Create account')
                            : 'Send reset link'),
                    loading: _loading,
                    onPressed: _mode == 'signin'
                        ? _submitSignIn
                        : (_mode == 'signup' ? _submitSignUp : _submitForgot),
                  ),
                  if (_mode == 'signin' || (_mode == 'signup' && _signupStep == 1)) ...[
                    const SizedBox(height: LATokens.space4),
                    Row(
                      children: [
                        Expanded(child: Divider(color: c.borderSubtle)),
                        Padding(
                          padding: const EdgeInsets.symmetric(horizontal: 12),
                          child: Text('or', style: TextStyle(fontSize: LATokens.fsXs, color: c.textMuted)),
                        ),
                        Expanded(child: Divider(color: c.borderSubtle)),
                      ],
                    ),
                    const SizedBox(height: LATokens.space4),
                    LAButton(
                      text: 'Continue with Google',
                      icon: Icons.g_mobiledata_rounded,
                      type: ButtonType.secondary,
                      onPressed: _loading ? null : _submitGoogle,
                    ),
                  ],
                  if (_mode == 'signup' && _signupStep == 2) ...[
                    const SizedBox(height: LATokens.space2),
                    LAButton(
                      text: 'Back',
                      type: ButtonType.ghost,
                      onPressed: () => setState(() => _signupStep = 1),
                    ),
                  ],
                  const SizedBox(height: LATokens.space5),
                  Wrap(
                    alignment: WrapAlignment.center,
                    crossAxisAlignment: WrapCrossAlignment.center,
                    children: [
                      Text(
                        _mode == 'signin' ? "Don't have an account?" : 'Already have an account?',
                        style: TextStyle(fontSize: LATokens.fsSm, color: c.textSecondary),
                      ),
                      TextButton(
                        onPressed: () => setState(() {
                          _mode = _mode == 'signin' ? 'signup' : 'signin';
                          _signupStep = 1;
                        }),
                        child: Text(
                          _mode == 'signin' ? 'Sign up' : 'Sign in',
                          style: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w600, color: c.accent),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class VerifyEmailGate extends StatefulWidget {
  const VerifyEmailGate({super.key});

  @override
  State<VerifyEmailGate> createState() => _VerifyEmailGateState();
}

class _VerifyEmailGateState extends State<VerifyEmailGate> {
  bool _checking = false;
  bool _resending = false;

  Future<void> _checkVerified() async {
    setState(() => _checking = true);
    try {
      final auth = context.read<AuthService>();
      await auth.reloadUser();
      if (mounted && auth.user?.emailVerified != true) {
        LAToast.show(context, 'Email not verified yet. Check your inbox.', isError: true);
      }
    } catch (e) {
      if (mounted) LAToast.show(context, e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _checking = false);
    }
  }

  Future<void> _resend() async {
    setState(() => _resending = true);
    try {
      await context.read<AuthService>().sendVerificationEmail();
      if (mounted) LAToast.show(context, 'Verification email sent', isSuccess: true);
    } catch (e) {
      if (mounted) LAToast.show(context, e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _resending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    final email = context.watch<AuthService>().user?.email ?? '';
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: Padding(
            padding: LALayout.pagePadding(context),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 400),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.mark_email_unread_outlined, size: 32, color: c.accent),
                  const SizedBox(height: LATokens.space4),
                  Text('Verify your email', style: LATypo.screenTitle(c), textAlign: TextAlign.center),
                  const SizedBox(height: LATokens.space2),
                  Text(
                    'We sent a verification link to $email. Open it and tap the button below to continue.',
                    textAlign: TextAlign.center,
                    style: LATypo.secondary(c),
                  ),
                  const SizedBox(height: LATokens.space6),
                  LAButton(
                    text: "I've verified my email",
                    loading: _checking,
                    onPressed: _checkVerified,
                  ),
                  const SizedBox(height: LATokens.space2),
                  LAButton(
                    text: 'Resend email',
                    type: ButtonType.secondary,
                    loading: _resending,
                    onPressed: _resend,
                  ),
                  const SizedBox(height: LATokens.space2),
                  LAButton(
                    text: 'Sign out',
                    type: ButtonType.ghost,
                    onPressed: () => context.read<AuthService>().signOut(),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
