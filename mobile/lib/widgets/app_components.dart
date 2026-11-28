import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';
import 'learning_allied_logo.dart';

enum ButtonType { primary, secondary, ghost, danger }

/// Official Learning Allied monogram mark, backed by [LearningAlliedLogo].
class LALogoMark extends StatelessWidget {
  final double size;
  const LALogoMark({super.key, this.size = 28});

  @override
  Widget build(BuildContext context) {
    return LearningAlliedLogo(size: size);
  }
}

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
    final c = LAColors.of(context);
    final enabled = onPressed != null && !loading;

    late final Color bg;
    late final Color fg;
    late final Color bd;

    switch (type) {
      case ButtonType.primary:
        bg = enabled ? c.text : c.text.withValues(alpha: 0.35);
        fg = c.bg;
        bd = bg;
        break;
      case ButtonType.secondary:
        bg = enabled ? c.surface : c.surfaceElevated;
        fg = enabled ? c.text : c.textMuted;
        bd = enabled ? c.borderStrong : c.border;
        break;
      case ButtonType.ghost:
        bg = Colors.transparent;
        fg = enabled ? c.textSecondary : c.textMuted;
        bd = Colors.transparent;
        break;
      case ButtonType.danger:
        bg = enabled ? c.redSoft : c.redSoft.withValues(alpha: 0.4);
        fg = enabled ? c.red : c.red.withValues(alpha: 0.4);
        bd = enabled ? c.red.withValues(alpha: 0.3) : c.red.withValues(alpha: 0.15);
        break;
    }

    final content = loading
        ? SizedBox(
            width: 18,
            height: 18,
            child: CircularProgressIndicator(strokeWidth: 2, color: fg),
          )
        : Row(
            mainAxisSize: MainAxisSize.min,
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              if (icon != null) ...[
                Icon(icon, size: 17, color: fg),
                const SizedBox(width: LATokens.space2),
              ],
              Flexible(
                child: Text(
                  text,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: LATokens.fsBase,
                    fontWeight: FontWeight.w600,
                    letterSpacing: -0.1,
                    color: fg,
                  ),
                ),
              ),
            ],
          );

    return SizedBox(
      width: fullWidth ? double.infinity : width,
      height: 48,
      child: Material(
        color: bg,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(LATokens.radiusFull),
          side: BorderSide(color: bd, width: 1),
        ),
        child: InkWell(
          borderRadius: BorderRadius.circular(LATokens.radiusFull),
          onTap: enabled ? onPressed : null,
          child: Padding(
            padding: padding ?? const EdgeInsets.symmetric(horizontal: LATokens.space5),
            child: Center(child: content),
          ),
        ),
      ),
    );
  }
}

class LAInput extends StatelessWidget {
  final TextEditingController? controller;
  final String? hint;
  final String? label;
  final IconData? prefixIcon;
  final Widget? suffixIcon;
  final bool obscureText;
  final TextInputType? keyboardType;
  final TextInputAction? textInputAction;
  final int? maxLines;
  final int? minLines;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
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
    this.suffixIcon,
    this.obscureText = false,
    this.keyboardType,
    this.textInputAction,
    this.maxLines,
    this.minLines,
    this.onChanged,
    this.onSubmitted,
    this.onTap,
    this.enabled = true,
    this.errorText,
    this.validator,
  });

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      mainAxisSize: MainAxisSize.min,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: TextStyle(
              fontSize: LATokens.fsSm,
              fontWeight: FontWeight.w500,
              color: c.textSecondary,
            ),
          ),
          const SizedBox(height: 6),
        ],
        TextFormField(
          controller: controller,
          enabled: enabled,
          obscureText: obscureText,
          keyboardType: keyboardType,
          textInputAction: textInputAction,
          maxLines: obscureText ? 1 : (maxLines ?? 1),
          minLines: minLines,
          onChanged: onChanged,
          onFieldSubmitted: onSubmitted,
          onTap: onTap,
          validator: validator,
          style: TextStyle(fontSize: LATokens.fsBase, color: c.text),
          decoration: InputDecoration(
            hintText: hint,
            hintStyle: TextStyle(color: c.textFaint, fontSize: LATokens.fsBase),
            prefixIcon: prefixIcon != null
                ? Icon(prefixIcon, size: 19, color: c.textMuted)
                : null,
            suffixIcon: suffixIcon,
            filled: true,
            fillColor: c.surfaceInput,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: LATokens.space4,
              vertical: LATokens.space3,
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(LATokens.radiusMd),
              borderSide: BorderSide(color: c.border),
            ),
            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(LATokens.radiusMd),
              borderSide: BorderSide(color: errorText != null ? c.red : c.border),
            ),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(LATokens.radiusMd),
              borderSide: BorderSide(
                color: errorText != null ? c.red : c.accent,
                width: 1.5,
              ),
            ),
            errorBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(LATokens.radiusMd),
              borderSide: BorderSide(color: c.red),
            ),
            errorText: errorText,
            errorStyle: TextStyle(color: c.red, fontSize: LATokens.fsXs),
          ),
        ),
      ],
    );
  }
}

/// Dedicated search field with optional clear action.
class LASearchField extends StatelessWidget {
  final TextEditingController controller;
  final String hint;
  final ValueChanged<String>? onChanged;
  final ValueChanged<String>? onSubmitted;
  final VoidCallback? onClear;

  const LASearchField({
    super.key,
    required this.controller,
    this.hint = 'Search...',
    this.onChanged,
    this.onSubmitted,
    this.onClear,
  });

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    return ValueListenableBuilder<TextEditingValue>(
      valueListenable: controller,
      builder: (_, value, __) => LAInput(
        controller: controller,
        hint: hint,
        prefixIcon: Icons.search_rounded,
        textInputAction: TextInputAction.search,
        onChanged: onChanged,
        onSubmitted: onSubmitted,
        suffixIcon: value.text.isNotEmpty
            ? IconButton(
                tooltip: 'Clear',
                icon: Icon(Icons.close_rounded, size: 18, color: c.textMuted),
                onPressed: () {
                  controller.clear();
                  onClear?.call();
                  onChanged?.call('');
                },
              )
            : null,
      ),
    );
  }
}

class LACard extends StatelessWidget {
  final Widget child;
  final EdgeInsetsGeometry padding;
  final VoidCallback? onTap;
  final Color? backgroundColor;
  final Color? borderColor;
  final double radius;

  const LACard({
    super.key,
    required this.child,
    this.padding = const EdgeInsets.all(LATokens.space4),
    this.onTap,
    this.backgroundColor,
    this.borderColor,
    this.radius = LATokens.radiusLg,
  });

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    final bg = backgroundColor ?? c.surface;
    final bd = borderColor ?? c.border;

    return Material(
      color: bg,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radius),
        side: BorderSide(color: bd, width: 1),
      ),
      child: onTap == null
          ? Padding(padding: padding, child: child)
          : InkWell(
              borderRadius: BorderRadius.circular(radius),
              onTap: onTap,
              child: Padding(padding: padding, child: child),
            ),
    );
  }
}

/// Clean Apple/Linear-style grouped container with hairline dividers between rows.
class LAGroupedList extends StatelessWidget {
  final List<Widget> children;
  final Color? backgroundColor;
  final Color? borderColor;
  final double radius;

  const LAGroupedList({
    super.key,
    required this.children,
    this.backgroundColor,
    this.borderColor,
    this.radius = LATokens.radiusLg,
  });

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    final nonEmpty = children;
    return Material(
      color: backgroundColor ?? c.surface,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(radius),
        side: BorderSide(color: borderColor ?? c.border),
      ),
      clipBehavior: Clip.antiAlias,
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          for (int i = 0; i < nonEmpty.length; i++) ...[
            nonEmpty[i],
            if (i != nonEmpty.length - 1)
              Divider(height: 1, thickness: 1, indent: LATokens.space4, color: c.borderSubtle),
          ],
        ],
      ),
    );
  }
}

/// Clean, restrained list row without decorative icon boxes.
class LAListRow extends StatelessWidget {
  final IconData? icon;
  final Color? iconColor;
  final String title;
  final String? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  final bool showChevron;
  final EdgeInsetsGeometry? padding;

  const LAListRow({
    super.key,
    this.icon,
    this.iconColor,
    required this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
    this.showChevron = true,
    this.padding,
  });

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    return InkWell(
      onTap: onTap,
      child: Padding(
        padding: padding ?? const EdgeInsets.symmetric(horizontal: LATokens.space4, vertical: 14),
        child: Row(
          children: [
            if (icon != null) ...[
              Icon(icon, size: 20, color: iconColor ?? c.textSecondary),
              const SizedBox(width: LATokens.space3),
            ],
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    title,
                    maxLines: 2,
                    overflow: TextOverflow.ellipsis,
                    style: TextStyle(
                      fontSize: LATokens.fsBase,
                      fontWeight: FontWeight.w500,
                      color: c.text,
                    ),
                  ),
                  if (subtitle != null && subtitle!.isNotEmpty) ...[
                    const SizedBox(height: 2),
                    Text(
                      subtitle!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(
                        fontSize: LATokens.fsXs,
                        color: c.textMuted,
                      ),
                    ),
                  ],
                ],
              ),
            ),
            if (trailing != null) ...[
              const SizedBox(width: LATokens.space2),
              trailing!,
            ] else if (showChevron && onTap != null) ...[
              const SizedBox(width: LATokens.space2),
              Icon(Icons.chevron_right_rounded, size: 20, color: c.textFaint),
            ],
          ],
        ),
      ),
    );
  }
}

/// Clean segmented control for switching between 2-3 modes.
class LASegmentedControl<T> extends StatelessWidget {
  final T value;
  final List<(T, String)> items;
  final ValueChanged<T> onChanged;

  const LASegmentedControl({
    super.key,
    required this.value,
    required this.items,
    required this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    return Container(
      padding: const EdgeInsets.all(3),
      decoration: BoxDecoration(
        color: c.surfaceElevated,
        borderRadius: BorderRadius.circular(LATokens.radiusMd),
        border: Border.all(color: c.borderSubtle),
      ),
      child: Row(
        children: items.map((item) {
          final selected = item.$1 == value;
          return Expanded(
            child: GestureDetector(
              behavior: HitTestBehavior.opaque,
              onTap: () => onChanged(item.$1),
              child: AnimatedContainer(
                duration: LATokens.durFast,
                padding: const EdgeInsets.symmetric(vertical: 7, horizontal: 10),
                decoration: BoxDecoration(
                  color: selected ? c.surface : Colors.transparent,
                  borderRadius: BorderRadius.circular(LATokens.radiusSm),
                  border: selected ? Border.all(color: c.border) : null,
                ),
                child: Text(
                  item.$2,
                  textAlign: TextAlign.center,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    fontSize: LATokens.fsSm,
                    fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                    color: selected ? c.text : c.textMuted,
                  ),
                ),
              ),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class SectionHeader extends StatelessWidget {
  final IconData? icon;
  final String title;
  final String? actionLabel;
  final VoidCallback? onAction;

  const SectionHeader({
    super.key,
    this.icon,
    required this.title,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    return Row(
      children: [
        Expanded(
          child: Text(
            title,
            style: TextStyle(
              fontSize: LATokens.fsSm,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.1,
              color: c.textSecondary,
            ),
          ),
        ),
        if (actionLabel != null && onAction != null)
          TextButton(
            onPressed: onAction,
            style: TextButton.styleFrom(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              minimumSize: Size.zero,
              tapTargetSize: MaterialTapTargetSize.shrinkWrap,
            ),
            child: Text(
              actionLabel!,
              style: TextStyle(
                fontSize: LATokens.fsSm,
                fontWeight: FontWeight.w600,
                color: c.accent,
              ),
            ),
          ),
      ],
    );
  }
}

class StatTile extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color? color;
  final VoidCallback? onTap;

  const StatTile({
    super.key,
    required this.label,
    required this.value,
    required this.icon,
    this.color,
    this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    return LACard(
      onTap: onTap,
      padding: const EdgeInsets.symmetric(horizontal: LATokens.space3, vertical: LATokens.space3),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Icon(icon, size: 15, color: color ?? c.textMuted),
              const SizedBox(width: 6),
              Expanded(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(fontSize: LATokens.fsXs, color: c.textMuted),
                ),
              ),
            ],
          ),
          const SizedBox(height: 6),
          Text(
            value,
            maxLines: 1,
            overflow: TextOverflow.ellipsis,
            style: TextStyle(
              fontSize: LATokens.fsXl,
              fontWeight: FontWeight.w700,
              letterSpacing: -0.4,
              color: c.text,
            ),
          ),
        ],
      ),
    );
  }
}

class EmptyStateView extends StatelessWidget {
  final IconData icon;
  final String title;
  final String message;
  final String? actionLabel;
  final VoidCallback? onAction;

  const EmptyStateView({
    super.key,
    required this.icon,
    required this.title,
    required this.message,
    this.actionLabel,
    this.onAction,
  });

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: LATokens.space4, vertical: LATokens.space6),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 28, color: c.textMuted),
          const SizedBox(height: LATokens.space3),
          Text(
            title,
            textAlign: TextAlign.center,
            style: TextStyle(
              fontSize: LATokens.fsMd,
              fontWeight: FontWeight.w600,
              color: c.text,
            ),
          ),
          const SizedBox(height: 6),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 320),
            child: Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontSize: LATokens.fsSm,
                color: c.textSecondary,
                height: LATokens.lhNormal,
              ),
            ),
          ),
          if (actionLabel != null && onAction != null) ...[
            const SizedBox(height: LATokens.space4),
            LAButton(
              text: actionLabel!,
              onPressed: onAction,
              fullWidth: false,
            ),
          ],
        ],
      ),
    );
  }
}

class ErrorStateView extends StatelessWidget {
  final String message;
  final VoidCallback? onRetry;

  const ErrorStateView({
    super.key,
    required this.message,
    this.onRetry,
  });

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(LATokens.space5),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline_rounded, size: 28, color: c.red),
            const SizedBox(height: LATokens.space3),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 320),
              child: Text(
                message,
                textAlign: TextAlign.center,
                style: TextStyle(
                  fontSize: LATokens.fsSm,
                  color: c.textSecondary,
                  height: LATokens.lhNormal,
                ),
              ),
            ),
            if (onRetry != null) ...[
              const SizedBox(height: LATokens.space4),
              LAButton(
                text: 'Try again',
                icon: Icons.refresh_rounded,
                onPressed: onRetry,
                type: ButtonType.secondary,
                fullWidth: false,
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class LAToast {
  static void show(
    BuildContext context,
    String message, {
    bool isError = false,
    bool isSuccess = false,
    Duration duration = const Duration(milliseconds: 2800),
  }) {
    if (!context.mounted) return;
    final c = LAColors.of(context);
    final bg = isError
        ? c.red
        : (isSuccess ? c.green : (c.isDark ? c.surfaceElevated : c.text));
    const fg = Colors.white;

    ScaffoldMessenger.of(context)
      ..hideCurrentSnackBar()
      ..showSnackBar(
        SnackBar(
          duration: duration,
          backgroundColor: bg,
          content: Row(
            children: [
              Icon(
                isError
                    ? Icons.error_outline_rounded
                    : (isSuccess
                        ? Icons.check_circle_outline_rounded
                        : Icons.info_outline_rounded),
                size: 18,
                color: fg,
              ),
              const SizedBox(width: LATokens.space2),
              Expanded(
                child: Text(
                  message,
                  style: const TextStyle(
                    color: fg,
                    fontSize: LATokens.fsSm,
                    fontWeight: FontWeight.w500,
                  ),
                ),
              ),
            ],
          ),
        ),
      );
  }
}
