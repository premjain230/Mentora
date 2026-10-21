// Theme provider — persists light/dark choice in shared_preferences,
// using the same storage keys as the website:
//   learning-allied-theme / aquila-theme  →  'light' | 'dark'
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'design_tokens.dart';

class ThemeProvider extends ChangeNotifier {
  static const _key = 'learning-allied-theme';
  static const _keyAlt = 'aquila-theme';

  bool _isLight;

  ThemeProvider({bool isLight = false}) : _isLight = isLight;

  bool get isLight => _isLight;
  ThemeData get theme => _isLight ? _lightTheme : _darkTheme;

  Future<void> load() async {
    final prefs = await SharedPreferences.getInstance();
    final v = prefs.getString(_key) ?? prefs.getString(_keyAlt);
    _isLight = v != 'dark';
    notifyListeners();
  }

  Future<void> setLight(bool light) async {
    if (_isLight == light) return;
    _isLight = light;
    notifyListeners();
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_key, light ? 'light' : 'dark');
    await prefs.setString(_keyAlt, light ? 'light' : 'dark');
  }

  Future<void> toggle() async => setLight(!_isLight);
}

// ── Dark theme (default, mirrors css/tokens.css dark) ──────────────────
final ThemeData _darkTheme = ThemeData(
  brightness: Brightness.dark,
  scaffoldBackgroundColor: LATokens.bgBase,
  colorScheme: const ColorScheme.dark(
    primary: LATokens.accent,
    secondary: LATokens.accent2,
    surface: LATokens.bgCard,
    inverseSurface: LATokens.textPrimary,
    onPrimary: LATokens.bgBase,
    onSurface: LATokens.textPrimary,
  ),
  fontFamily: LATokens.fontMain,
  textTheme: const TextTheme(
    displayLarge: TextStyle(fontFamily: LATokens.fontDisplay, fontSize: LATokens.fs3xl, fontWeight: FontWeight.w700, letterSpacing: -0.02, color: LATokens.textPrimary),
    displayMedium: TextStyle(fontFamily: LATokens.fontDisplay, fontSize: LATokens.fs2xl, fontWeight: FontWeight.w700, letterSpacing: -0.02, color: LATokens.textPrimary),
    displaySmall: TextStyle(fontFamily: LATokens.fontDisplay, fontSize: LATokens.fsXl, fontWeight: FontWeight.w700, letterSpacing: -0.02, color: LATokens.textPrimary),
    headlineLarge: TextStyle(fontSize: LATokens.fs2xl, fontWeight: FontWeight.w700, color: LATokens.textPrimary),
    headlineMedium: TextStyle(fontSize: LATokens.fsXl, fontWeight: FontWeight.w600, color: LATokens.textPrimary),
    titleLarge: TextStyle(fontSize: LATokens.fsLg, fontWeight: FontWeight.w600, color: LATokens.textPrimary),
    bodyLarge: TextStyle(fontSize: LATokens.fsBase, fontWeight: FontWeight.w400, color: LATokens.textPrimary, height: LATokens.lhRelaxed),
    bodyMedium: TextStyle(fontSize: LATokens.fsBase, fontWeight: FontWeight.w400, color: LATokens.textSecondary, height: LATokens.lhNormal),
    bodySmall: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w400, color: LATokens.textMuted),
    labelLarge: TextStyle(fontSize: LATokens.fsMd, fontWeight: FontWeight.w500, color: LATokens.textPrimary),
    labelMedium: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w500, color: LATokens.textSecondary),
    labelSmall: TextStyle(fontSize: LATokens.fsXs, fontWeight: FontWeight.w500, color: LATokens.textMuted),
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: LATokens.textPrimary,
      foregroundColor: LATokens.bgBase,
      elevation: 0,
      shadowColor: Colors.transparent,
      padding: const EdgeInsets.symmetric(horizontal: LATokens.space4, vertical: LATokens.space2),
      minimumSize: const Size(double.infinity, 44),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(LATokens.radiusMd)),
    ),
  ),
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      backgroundColor: LATokens.bgCard,
      foregroundColor: LATokens.textPrimary,
      side: const BorderSide(color: LATokens.borderStrong),
      padding: const EdgeInsets.symmetric(horizontal: LATokens.space4, vertical: LATokens.space2),
      minimumSize: const Size(double.infinity, 44),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(LATokens.radiusMd)),
    ),
  ),
  textButtonTheme: TextButtonThemeData(
    style: TextButton.styleFrom(
      foregroundColor: LATokens.textSecondary,
      padding: const EdgeInsets.symmetric(horizontal: LATokens.space3, vertical: LATokens.space2),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(LATokens.radiusMd)),
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: LATokens.bgInput,
    contentPadding: const EdgeInsets.symmetric(horizontal: LATokens.space4, vertical: LATokens.space2),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(LATokens.radiusMd), borderSide: const BorderSide(color: LATokens.border)),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(LATokens.radiusMd), borderSide: const BorderSide(color: LATokens.border)),
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(LATokens.radiusMd), borderSide: const BorderSide(color: LATokens.borderHover)),
    hintStyle: const TextStyle(color: LATokens.textFaint, fontSize: LATokens.fsBase),
  ),
  cardTheme: CardThemeData(
    color: LATokens.bgCard,
    elevation: 0,
    shadowColor: Colors.transparent,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(LATokens.radiusLg), side: const BorderSide(color: LATokens.border)),
  ),
  dividerTheme: const DividerThemeData(color: LATokens.borderSubtle, space: LATokens.space2),
  popupMenuTheme: PopupMenuThemeData(
    color: LATokens.bgCard,
    elevation: 0,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(LATokens.radiusLg), side: const BorderSide(color: LATokens.border)),
  ),
);

// ── Light theme (mirrors css/tokens.css .light-mode) ───────────────────
final ThemeData _lightTheme = ThemeData(
  brightness: Brightness.light,
  scaffoldBackgroundColor: LATokens.lightBgBase,
  colorScheme: const ColorScheme.light(
    primary: LATokens.accent,
    secondary: LATokens.accent2,
    surface: LATokens.lightBgCard,
    inverseSurface: LATokens.lightTextPrimary,
    onPrimary: LATokens.lightBgBase,
    onSurface: LATokens.lightTextPrimary,
  ),
  fontFamily: LATokens.fontMain,
  textTheme: const TextTheme(
    displayLarge: TextStyle(fontFamily: LATokens.fontDisplay, fontSize: LATokens.fs3xl, fontWeight: FontWeight.w700, letterSpacing: -0.02, color: LATokens.lightTextPrimary),
    displayMedium: TextStyle(fontFamily: LATokens.fontDisplay, fontSize: LATokens.fs2xl, fontWeight: FontWeight.w700, letterSpacing: -0.02, color: LATokens.lightTextPrimary),
    displaySmall: TextStyle(fontFamily: LATokens.fontDisplay, fontSize: LATokens.fsXl, fontWeight: FontWeight.w700, letterSpacing: -0.02, color: LATokens.lightTextPrimary),
    headlineLarge: TextStyle(fontSize: LATokens.fs2xl, fontWeight: FontWeight.w700, color: LATokens.lightTextPrimary),
    headlineMedium: TextStyle(fontSize: LATokens.fsXl, fontWeight: FontWeight.w600, color: LATokens.lightTextPrimary),
    titleLarge: TextStyle(fontSize: LATokens.fsLg, fontWeight: FontWeight.w600, color: LATokens.lightTextPrimary),
    bodyLarge: TextStyle(fontSize: LATokens.fsBase, fontWeight: FontWeight.w400, color: LATokens.lightTextPrimary, height: LATokens.lhRelaxed),
    bodyMedium: TextStyle(fontSize: LATokens.fsBase, fontWeight: FontWeight.w400, color: LATokens.lightTextSecondary, height: LATokens.lhNormal),
    bodySmall: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w400, color: LATokens.lightTextMuted),
    labelLarge: TextStyle(fontSize: LATokens.fsMd, fontWeight: FontWeight.w500, color: LATokens.lightTextPrimary),
    labelMedium: TextStyle(fontSize: LATokens.fsSm, fontWeight: FontWeight.w500, color: LATokens.lightTextSecondary),
    labelSmall: TextStyle(fontSize: LATokens.fsXs, fontWeight: FontWeight.w500, color: LATokens.lightTextMuted),
  ),
  elevatedButtonTheme: ElevatedButtonThemeData(
    style: ElevatedButton.styleFrom(
      backgroundColor: const Color(0xFF0F172A),
      foregroundColor: Colors.white,
      elevation: 0,
      shadowColor: Colors.transparent,
      padding: const EdgeInsets.symmetric(horizontal: LATokens.space4, vertical: LATokens.space2),
      minimumSize: const Size(double.infinity, 44),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(LATokens.radiusMd)),
    ),
  ),
  outlinedButtonTheme: OutlinedButtonThemeData(
    style: OutlinedButton.styleFrom(
      backgroundColor: LATokens.lightBgCard,
      foregroundColor: LATokens.lightTextPrimary,
      side: const BorderSide(color: LATokens.lightBorderStrong),
      padding: const EdgeInsets.symmetric(horizontal: LATokens.space4, vertical: LATokens.space2),
      minimumSize: const Size(double.infinity, 44),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(LATokens.radiusMd)),
    ),
  ),
  textButtonTheme: TextButtonThemeData(
    style: TextButton.styleFrom(
      foregroundColor: LATokens.lightTextSecondary,
      padding: const EdgeInsets.symmetric(horizontal: LATokens.space3, vertical: LATokens.space2),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(LATokens.radiusMd)),
    ),
  ),
  inputDecorationTheme: InputDecorationTheme(
    filled: true,
    fillColor: LATokens.lightBgInput,
    contentPadding: const EdgeInsets.symmetric(horizontal: LATokens.space4, vertical: LATokens.space2),
    border: OutlineInputBorder(borderRadius: BorderRadius.circular(LATokens.radiusMd), borderSide: const BorderSide(color: LATokens.lightBorder)),
    enabledBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(LATokens.radiusMd), borderSide: const BorderSide(color: LATokens.lightBorder)),
    focusedBorder: OutlineInputBorder(borderRadius: BorderRadius.circular(LATokens.radiusMd), borderSide: const BorderSide(color: LATokens.lightBorder)),
    hintStyle: const TextStyle(color: LATokens.lightTextFaint, fontSize: LATokens.fsBase),
  ),
  cardTheme: CardThemeData(
    color: LATokens.lightBgCard,
    elevation: 0,
    shadowColor: Colors.transparent,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(LATokens.radiusLg), side: const BorderSide(color: LATokens.lightBorder)),
  ),
  dividerTheme: const DividerThemeData(color: LATokens.lightBorderSubtle, space: LATokens.space2),
  popupMenuTheme: PopupMenuThemeData(
    color: LATokens.lightBgCard,
    elevation: 0,
    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(LATokens.radiusLg), side: const BorderSide(color: LATokens.lightBorder)),
  ),
);
