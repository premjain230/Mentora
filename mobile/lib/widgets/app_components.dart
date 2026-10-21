// Shared UI widgets — mirrors website base.css component styles:
//   .btn, .btn-primary, .btn-secondary, .btn-ghost, .btn-danger
//   .field, .card, .toast, .empty-state
import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';

// ── Buttons ──────────────────────────────────────────────────────────────

class LAButton extends StatelessWidget {
  final String text;
  final IconData? icon;
  final VoidCallback? onPressed;
  final bool loading;
  final ButtonType type;
  final bool fullWidth;
  final double? width;
  final EdgeInsetsGeometry? padding;

  const LAButton({
    super.key,
    required this.text,
    this.icon,
    this.onPressed,
    this.loading = false,
    this.type = ButtonType.primary,
    this.fullWidth = true,
    this.width,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final enabled = onPressed != null && !loading;
    Widget child;
    if (loading) {
      child = SizedBox(width: 18, height: 18, child: CircularProgressIndicator(strokeWidth: 2, color: _inkColor(context)));
    } else {
      child = Row(mainAxisSize: MainAxisSize.min, children: [
        if (icon != null) ...[Icon(icon, size: 18), const SizedBox(width: LATokens.space2)],
        Text(text, style: const TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w500, letterSpacing: -0.01)),
      ]);
    }

    late final Color bg, fg, bd;
    switch (type) {
      case ButtonType.primary:
        bg = enabled ? _primaryBg(context) : _primaryBgDisabled(context);
        fg = enabled ? _primaryFg(context) : _primaryFgDisabled(context);
        bd = enabled ? _primaryBg(context) : _primaryBgDisabled(context);
        break;
      case ButtonType.secondary:
        bg = enabled ? LATokens.bgCard : LATokens.bgElevated;
        fg = enabled ? LATokens.textPrimary : LATokens.textMuted;
        bd = enabled ? LATokens.borderStrong : LATokens.border;
        break;
      case ButtonType.ghost:
        bg = Colors.transparent;
        fg = enabled ? LATokens.textSecondary : LATokens.textMuted;
        bd = Colors.transparent;
        break;
      case ButtonType.danger:
        bg = enabled ? LATokens.accent3.withOpacity(0.08) : LATokens.accent3.withOpacity(0.04);
        fg = enabled ? LATokens.accent3 : LATokens.accent3.withOpacity(0.4);
        bd = enabled ? LATokens.accent3.withOpacity(0.2) : LATokens.accent3.withOpacity(0.1);
        break;
    }

    return AnimatedContainer(
      duration: LATokens.durFast,
      width: fullWidth ? double.infinity : width,
      height: 44,
      padding: padding ?? const EdgeInsets.symmetric(horizontal: LATokens.space4),
      decoration: BoxDecoration(
        color: bg,
        border: Border.all(color: bd, width: 1),
        borderRadius: BorderRadius.circular(LATokens.radiusMd),
      ),
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(LATokens.radiusMd),
          onTap: enabled ? onPressed : null,
          child: Center(child: child),
        ),
      ),
    );
  }

  Color _inkColor(BuildContext context) => Theme.of(context).brightness == Brightness.dark ? LATokens.bgBase : Colors.white;
  Color _primaryBg(BuildContext context) => Theme.of(context).brightness == Brightness.dark ? LATokens.textPrimary : const Color(0xFF0F172A);
  Color _primaryFg(BuildContext context) => Theme.of(context).brightness == Brightness.dark ? LATokens.bgBase : Colors.white;
  Color _primaryBgDisabled(BuildContext context) => LATokens.textPrimary.withOpacity(0.45);
  Color _primaryFgDisabled(BuildContext context) => LATokens.textPrimary.withOpacity(0.45);
}

enum ButtonType { primary, secondary, ghost, danger }

// ── Input field ──────────────────────────────────────────────────────────

class LAInput extends StatelessWidget {
  final TextEditingController? controller;
  final String? hint;
  final String? label;
  final IconData? prefixIcon;
  final bool obscureText;
  final TextInputType? keyboardType;
  final int? maxLines;
  final int? minLines;
  final ValueChanged<String>? onChanged;
  final VoidCallback? onTap;
  final bool enabled;
  final String? errorText;
  final String? Function(String?)? validator;

  const LAInput({
    super.key,
    this.controller,
    this.hint,
    this.label,
    this.prefixIcon,
    this.obscureText = false,
    this.keyboardType,
    this.maxLines,
    this.minLines,
    this.onChanged,
    this.onTap,
    this.enabled = true,
    this.errorText,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(label!, style: const TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w500, color: LATokens.textSecondary)),
          const SizedBox(height: LATokens.space1),
        ],
        TextFormField(
          controller: controller,
          enabled: enabled,
          obscureText: obscureText,
          keyboardType: keyboardType,
          maxLines: maxLines ?? 1,
          minLines: minLines,
          onChanged: onChanged,
          onTap: onTap,
          validator: validator,
          style: const TextStyle(fontSize: LATokens.fsBase, color: LATokens.textPrimary),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: const TextStyle(color: LATokens.textFaint, fontSize: LATokens.fsBase),
            prefixIcon: prefixIcon != null ? Icon(prefixIcon, size: 20, color: LATokens.textMuted) : null,
            filled: true,
            fillColor: dark ? LATokens.bgInput : LATokens.lightBgInput,
            contentPadding: const EdgeInsets.symmetric(horizontal: LATokens.space4, vertical: LATokens.space2),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(LATokens.radiusMd), borderSide: const BorderSide(color: LATokens.border)),
            enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(LATokens.radiusMd), borderSide: BorderSide(color: errorText != null ? LATokens.accent3 : LATokens.border)),
            focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(LATokens.radiusMd), borderSide: BorderSide(color: errorText != null ? LATokens.accent3 : LATokens.borderHover, width: 1.5)),
            errorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(LATokens.radiusMd), borderSide: const BorderSide(color: LATokens.accent3)),
            focusedErrorBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(LATokens.radiusMd), borderSide: const BorderSide(color: LATokens.accent3, width: 1.5)),
            errorText: errorText,
            errorStyle: const TextStyle(color: LATokens.accent3, fontSize: LATokens.fsXs),
          ),
        ),
      ],
    );
  }
}

// ── Card ─────────────────────────────────────────────────────────────────

class LACard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;

  const LACard({super.key, required this.child, this.padding = const EdgeInsets.all(LATokens.space5)});

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      padding: padding,
      decoration: BoxDecoration(
        color: dark ? LATokens.bgCard : LATokens.lightBgCard,
        borderRadius: BorderRadius.circular(LATokens.radiusLg),
        border: Border.all(color: dark ? LATokens.border : LATokens.lightBorder),
      ),
      child: child,
    );
  }
}

// ── Toast ────────────────────────────────────────────────────────────────

class LAToast {
  static void show(BuildContext context, String message, {bool isError = false, bool isSuccess = false, Duration duration = const Duration(milliseconds: 3200)}) {
    final overlay = Overlay.of(context);
    final entry = OverlayEntry(
      builder: (ctx) => _ToastWidget(message: message, isError: isError, isSuccess: isSuccess, duration: duration),
    );
    overlay.insert(entry);
    Future.delayed(duration, () => entry.remove());
  }
}

class _ToastWidget extends StatefulWidget {
  final String message;
  final bool isError;
  final bool isSuccess;
  final Duration duration;

  const _ToastWidget({
    required this.message,
    required this.isError,
    required this.isSuccess,
    required this.duration,
  });

  @override
  State<_ToastWidget> createState() => _ToastWidgetState();
}

class _ToastWidgetState extends State<_ToastWidget> with SingleTickerProviderStateMixin {
  late final AnimationController _controller;
  late final Animation<double> _fade;
  late final Animation<Offset> _slide;
  bool _visible = true;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(vsync: this, duration: LATokens.durMed);
    _fade = CurvedAnimation(parent: _controller, curve: Curves.easeOut);
    _slide = Tween<Offset>(begin: const Offset(0, 0.3), end: Offset.zero).animate(_controller);
    _controller.forward();

    Future.delayed(widget.duration, () {
      if (mounted) {
        _controller.reverse().then((_) {
          if (mounted) setState(() => _visible = false);
        });
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    if (!_visible) return const SizedBox.shrink();
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Positioned(
      bottom: 24,
      left: 0,
      right: 0,
      child: SlideTransition(
        position: _slide,
        child: FadeTransition(
          opacity: _fade,
          child: Center(
            child: Container(
              constraints: const BoxConstraints(maxWidth: 420),
              padding: const EdgeInsets.symmetric(horizontal: LATokens.space4, vertical: LATokens.space3),
              decoration: BoxDecoration(
                color: widget.isError ? LATokens.accent3 : (widget.isSuccess ? LATokens.green : (dark ? LATokens.bgCard : LATokens.lightBgCard)),
                border: Border.all(
                  color: widget.isError ? LATokens.accent3.withOpacity(0.5) : (widget.isSuccess ? LATokens.green.withOpacity(0.5) : (dark ? LATokens.borderStrong : LATokens.lightBorderStrong)),
                ),
                borderRadius: BorderRadius.circular(LATokens.radiusMd),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.25), blurRadius: 24, offset: const Offset(0, 8))],
              ),
              child: Row(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(widget.isError ? Icons.error_outline : (widget.isSuccess ? Icons.check_circle : Icons.info_outline), size: 16, color: widget.isError ? Colors.white : (widget.isSuccess ? Colors.white : LATokens.textPrimary)),
                  const SizedBox(width: LATokens.space2),
                  Flexible(child: Text(widget.message, style: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w500, color: widget.isError ? Colors.white : (widget.isSuccess ? Colors.white : LATokens.textPrimary)))),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}
