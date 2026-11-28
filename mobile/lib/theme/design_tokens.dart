import 'package:flutter/material.dart';

/// Unified mobile design tokens for Learning Allied.
/// Single cohesive theme inspired by the supplied reference:
/// - Sky-blue atmospheric hero gradient (#0A7FF5 -> #7AC0FA)
/// - Crisp white content sheets & cards (#FFFFFF on #F6F8FB)
/// - Deep charcoal-black primary ink & pill CTAs (#141518)
/// - Floating dark-pill bottom navigation with white active indicator
class LATokens {
  LATokens._();

  // Brand & hero sky-blue palette
  static const Color heroTop = Color(0xFF0A7FF5);
  static const Color heroMid = Color(0xFF3E9BF7);
  static const Color heroBottom = Color(0xFF83C0FA);

  static const LinearGradient heroGradient = LinearGradient(
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
    colors: [heroTop, heroMid, heroBottom],
  );

  // Brand accents
  static const Color accent = Color(0xFF0A7FF5);
  static const Color accentStrong = Color(0xFF0669CE);
  static const Color accent2 = Color(0xFF38BDF8);
  static const Color green = Color(0xFF22C58B);
  static const Color amber = Color(0xFFF59E0B);
  static const Color red = Color(0xFFEF4444);

  // Unified surfaces
  static const Color bg = Color(0xFFF6F8FB);
  static const Color surface = Color(0xFFFFFFFF);
  static const Color surfaceElevated = Color(0xFFF1F5F9);
  static const Color surfaceInput = Color(0xFFF4F6FA);
  static const Color border = Color(0xFFE5EAF0);
  static const Color borderSubtle = Color(0xFFF0F4F8);
  static const Color borderStrong = Color(0xFFD0D7E2);

  // Unified text ink
  static const Color textPrimary = Color(0xFF141518);
  static const Color textSecondary = Color(0xFF5B6472);
  static const Color textMuted = Color(0xFF8B94A2);
  static const Color textFaint = Color(0xFFA6AFBC);

  // Floating dark-pill navigation bar
  static const Color navPillBg = Color(0xFF141518);
  static const Color navPillActive = Color(0xFFFFFFFF);
  static const Color navPillInactiveInk = Color(0xFF8E95A2);

  // Radii
  static const double radiusXs = 6;
  static const double radiusSm = 10;
  static const double radiusMd = 14;
  static const double radiusLg = 18;
  static const double radiusXl = 24;
  static const double radiusSheet = 28;
  static const double radiusFull = 999;

  // Spacing
  static const double space1 = 4;
  static const double space2 = 8;
  static const double space3 = 12;
  static const double space4 = 16;
  static const double space5 = 20;
  static const double space6 = 28;
  static const double space7 = 40;

  // Font sizes
  static const double fsXs = 11.5;
  static const double fsSm = 13;
  static const double fsBase = 14.5;
  static const double fsMd = 15.5;
  static const double fsLg = 18;
  static const double fsXl = 21;
  static const double fs2xl = 25;
  static const double fs3xl = 32;

  // Line heights
  static const double lhTight = 1.2;
  static const double lhNormal = 1.5;
  static const double lhRelaxed = 1.65;

  // Durations
  static const Duration durFast = Duration(milliseconds: 140);
  static const Duration durMed = Duration(milliseconds: 220);
  static const Duration durSlow = Duration(milliseconds: 340);
}

class LALayout {
  LALayout._();

  static bool isCompact(BuildContext context) =>
      MediaQuery.sizeOf(context).width < 360;

  static bool isTablet(BuildContext context) =>
      MediaQuery.sizeOf(context).width >= 600;

  static double horizontalMargin(BuildContext context) {
    final w = MediaQuery.sizeOf(context).width;
    if (w >= 600) return 24;
    if (w < 360) return 14;
    return 18;
  }

  static EdgeInsets pagePadding(BuildContext context,
      {double top = 16, double bottom = 28}) {
    final h = horizontalMargin(context);
    return EdgeInsets.fromLTRB(h, top, h, bottom);
  }
}

class LATypo {
  LATypo._();

  static TextStyle screenTitle(LAColors c) => TextStyle(
        fontSize: LATokens.fs2xl,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.5,
        height: LATokens.lhTight,
        color: c.text,
      );

  static TextStyle sectionHeading(LAColors c) => TextStyle(
        fontSize: LATokens.fsMd,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.2,
        color: c.text,
      );

  static TextStyle cardTitle(LAColors c) => TextStyle(
        fontSize: LATokens.fsBase,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.1,
        color: c.text,
      );

  static TextStyle body(LAColors c) => TextStyle(
        fontSize: LATokens.fsBase,
        fontWeight: FontWeight.w400,
        height: LATokens.lhNormal,
        color: c.text,
      );

  static TextStyle educational(LAColors c) => TextStyle(
        fontSize: LATokens.fsMd,
        fontWeight: FontWeight.w400,
        height: LATokens.lhRelaxed,
        color: c.text,
      );

  static TextStyle secondary(LAColors c) => TextStyle(
        fontSize: LATokens.fsSm,
        fontWeight: FontWeight.w400,
        height: LATokens.lhNormal,
        color: c.textSecondary,
      );

  static TextStyle label(LAColors c) => TextStyle(
        fontSize: LATokens.fsXs,
        fontWeight: FontWeight.w600,
        letterSpacing: 0.2,
        color: c.textMuted,
      );
}

@immutable
class LAColors extends ThemeExtension<LAColors> {
  final bool isDark;
  final Color bg;
  final Color surface;
  final Color surfaceElevated;
  final Color surfaceInput;
  final Color border;
  final Color borderSubtle;
  final Color borderStrong;
  final Color text;
  final Color textSecondary;
  final Color textMuted;
  final Color textFaint;
  final Color accent;
  final Color accentSoft;
  final Color accent2;
  final Color green;
  final Color greenSoft;
  final Color amber;
  final Color amberSoft;
  final Color red;
  final Color redSoft;
  final Color selection;
  final Color focus;
  final Color disabled;

  const LAColors({
    required this.isDark,
    required this.bg,
    required this.surface,
    required this.surfaceElevated,
    required this.surfaceInput,
    required this.border,
    required this.borderSubtle,
    required this.borderStrong,
    required this.text,
    required this.textSecondary,
    required this.textMuted,
    required this.textFaint,
    required this.accent,
    required this.accentSoft,
    required this.accent2,
    required this.green,
    required this.greenSoft,
    required this.amber,
    required this.amberSoft,
    required this.red,
    required this.redSoft,
    required this.selection,
    required this.focus,
    required this.disabled,
  });

  static const unified = LAColors(
    isDark: false,
    bg: LATokens.bg,
    surface: LATokens.surface,
    surfaceElevated: LATokens.surfaceElevated,
    surfaceInput: LATokens.surfaceInput,
    border: LATokens.border,
    borderSubtle: LATokens.borderSubtle,
    borderStrong: LATokens.borderStrong,
    text: LATokens.textPrimary,
    textSecondary: LATokens.textSecondary,
    textMuted: LATokens.textMuted,
    textFaint: LATokens.textFaint,
    accent: LATokens.accent,
    accentSoft: Color(0xFFE8F3FF),
    accent2: LATokens.accent2,
    green: LATokens.green,
    greenSoft: Color(0x1A22C58B),
    amber: LATokens.amber,
    amberSoft: Color(0x1AF59E0B),
    red: LATokens.red,
    redSoft: Color(0x14EF4444),
    selection: Color(0x240A7FF5),
    focus: LATokens.accent,
    disabled: Color(0xFFCBD5E1),
  );

  // Kept as aliases pointing to the single unified theme so existing callers stay compatible.
  static const light = unified;
  static const dark = unified;

  static LAColors of(BuildContext context) {
    return Theme.of(context).extension<LAColors>() ?? unified;
  }

  Color get navBg => LATokens.navPillBg;
  Color get navSurface => const Color(0xFF22242A);
  Color get navActive => LATokens.navPillActive;
  Color get navBorder => const Color(0xFF2A2D35);
  Color get navMuted => LATokens.navPillInactiveInk;
  Color get navSecondary => LATokens.navPillInactiveInk;
  Color get navActiveInk => LATokens.navPillBg;

  @override
  LAColors copyWith({
    bool? isDark,
    Color? bg,
    Color? surface,
    Color? surfaceElevated,
    Color? surfaceInput,
    Color? border,
    Color? borderSubtle,
    Color? borderStrong,
    Color? text,
    Color? textSecondary,
    Color? textMuted,
    Color? textFaint,
    Color? accent,
    Color? accentSoft,
    Color? accent2,
    Color? green,
    Color? greenSoft,
    Color? amber,
    Color? amberSoft,
    Color? red,
    Color? redSoft,
    Color? selection,
    Color? focus,
    Color? disabled,
  }) {
    return LAColors(
      isDark: isDark ?? this.isDark,
      bg: bg ?? this.bg,
      surface: surface ?? this.surface,
      surfaceElevated: surfaceElevated ?? this.surfaceElevated,
      surfaceInput: surfaceInput ?? this.surfaceInput,
      border: border ?? this.border,
      borderSubtle: borderSubtle ?? this.borderSubtle,
      borderStrong: borderStrong ?? this.borderStrong,
      text: text ?? this.text,
      textSecondary: textSecondary ?? this.textSecondary,
      textMuted: textMuted ?? this.textMuted,
      textFaint: textFaint ?? this.textFaint,
      accent: accent ?? this.accent,
      accentSoft: accentSoft ?? this.accentSoft,
      accent2: accent2 ?? this.accent2,
      green: green ?? this.green,
      greenSoft: greenSoft ?? this.greenSoft,
      amber: amber ?? this.amber,
      amberSoft: amberSoft ?? this.amberSoft,
      red: red ?? this.red,
      redSoft: redSoft ?? this.redSoft,
      selection: selection ?? this.selection,
      focus: focus ?? this.focus,
      disabled: disabled ?? this.disabled,
    );
  }

  @override
  LAColors lerp(ThemeExtension<LAColors>? other, double t) => this;
}
