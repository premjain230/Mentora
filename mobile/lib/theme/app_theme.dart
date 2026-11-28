import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'design_tokens.dart';

/// Single unified mobile theme for Learning Allied.
/// Uses clean white surfaces, sky-blue atmospheric hero accents, and
/// deep charcoal-black primary pill actions (#141518).
final ThemeData unifiedMobileTheme = _buildUnifiedTheme(LAColors.unified);

// Compatibility aliases so existing imports/tests remain clean.
final ThemeData lightTheme = unifiedMobileTheme;
final ThemeData darkTheme = unifiedMobileTheme;

ThemeData _buildUnifiedTheme(LAColors c) {
  return ThemeData(
    useMaterial3: true,
    brightness: Brightness.light,
    scaffoldBackgroundColor: c.bg,
    extensions: <ThemeExtension<dynamic>>[c],
    colorScheme: ColorScheme(
      brightness: Brightness.light,
      primary: c.accent,
      onPrimary: Colors.white,
      secondary: c.accent2,
      onSecondary: Colors.white,
      error: c.red,
      onError: Colors.white,
      surface: c.surface,
      onSurface: c.text,
      surfaceContainerHighest: c.surfaceElevated,
      outline: c.border,
      outlineVariant: c.borderSubtle,
    ),
    appBarTheme: AppBarTheme(
      backgroundColor: c.surface,
      foregroundColor: c.text,
      elevation: 0,
      scrolledUnderElevation: 0,
      centerTitle: false,
      surfaceTintColor: Colors.transparent,
      systemOverlayStyle: SystemUiOverlayStyle.dark.copyWith(
        statusBarColor: Colors.transparent,
        systemNavigationBarColor: c.bg,
      ),
      titleTextStyle: TextStyle(
        fontSize: LATokens.fsLg,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.3,
        color: c.text,
      ),
      iconTheme: IconThemeData(color: c.text, size: 22),
    ),
    textTheme: TextTheme(
      displayLarge: TextStyle(
        fontSize: LATokens.fs3xl,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.6,
        color: c.text,
      ),
      displayMedium: TextStyle(
        fontSize: LATokens.fs2xl,
        fontWeight: FontWeight.w700,
        letterSpacing: -0.4,
        color: c.text,
      ),
      headlineMedium: TextStyle(
        fontSize: LATokens.fsXl,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.3,
        color: c.text,
      ),
      titleLarge: TextStyle(
        fontSize: LATokens.fsLg,
        fontWeight: FontWeight.w600,
        letterSpacing: -0.2,
        color: c.text,
      ),
      titleMedium: TextStyle(
        fontSize: LATokens.fsMd,
        fontWeight: FontWeight.w600,
        color: c.text,
      ),
      bodyLarge: TextStyle(
        fontSize: LATokens.fsBase,
        fontWeight: FontWeight.w400,
        color: c.text,
        height: LATokens.lhRelaxed,
      ),
      bodyMedium: TextStyle(
        fontSize: LATokens.fsBase,
        fontWeight: FontWeight.w400,
        color: c.textSecondary,
        height: LATokens.lhNormal,
      ),
      bodySmall: TextStyle(
        fontSize: LATokens.fsSm,
        fontWeight: FontWeight.w400,
        color: c.textMuted,
      ),
      labelLarge: TextStyle(
        fontSize: LATokens.fsMd,
        fontWeight: FontWeight.w600,
        color: c.text,
      ),
      labelMedium: TextStyle(
        fontSize: LATokens.fsSm,
        fontWeight: FontWeight.w500,
        color: c.textSecondary,
      ),
      labelSmall: TextStyle(
        fontSize: LATokens.fsXs,
        fontWeight: FontWeight.w500,
        color: c.textMuted,
      ),
    ),
    cardTheme: CardThemeData(
      color: c.surface,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(LATokens.radiusLg),
        side: BorderSide(color: c.border),
      ),
    ),
    dividerTheme: DividerThemeData(
      color: c.borderSubtle,
      thickness: 1,
      space: 1,
    ),
    bottomSheetTheme: BottomSheetThemeData(
      backgroundColor: c.surface,
      surfaceTintColor: Colors.transparent,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(LATokens.radiusSheet)),
      ),
    ),
    dialogTheme: DialogThemeData(
      backgroundColor: c.surface,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(LATokens.radiusXl),
        side: BorderSide(color: c.border),
      ),
    ),
    snackBarTheme: SnackBarThemeData(
      backgroundColor: c.text,
      contentTextStyle: const TextStyle(
        color: Colors.white,
        fontSize: LATokens.fsSm,
        fontWeight: FontWeight.w500,
      ),
      behavior: SnackBarBehavior.floating,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(LATokens.radiusMd),
      ),
    ),
    inputDecorationTheme: InputDecorationTheme(
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
        borderSide: BorderSide(color: c.border),
      ),
      focusedBorder: OutlineInputBorder(
        borderRadius: BorderRadius.circular(LATokens.radiusMd),
        borderSide: BorderSide(color: c.accent, width: 1.5),
      ),
      hintStyle: TextStyle(color: c.textFaint, fontSize: LATokens.fsBase),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: c.text,
        foregroundColor: Colors.white,
        elevation: 0,
        minimumSize: const Size(0, 48),
        padding: const EdgeInsets.symmetric(horizontal: LATokens.space5, vertical: LATokens.space3),
        shape: const StadiumBorder(),
        textStyle: const TextStyle(fontSize: LATokens.fsBase, fontWeight: FontWeight.w600),
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        foregroundColor: c.text,
        side: BorderSide(color: c.borderStrong),
        minimumSize: const Size(0, 48),
        padding: const EdgeInsets.symmetric(horizontal: LATokens.space5, vertical: LATokens.space3),
        shape: const StadiumBorder(),
        textStyle: const TextStyle(fontSize: LATokens.fsBase, fontWeight: FontWeight.w600),
      ),
    ),
  );
}
