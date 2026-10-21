// Design tokens — Dart mirror of website css/tokens.css.
// Keep in sync with css/tokens.css and css/auth.css.
import 'package:flutter/material.dart';

class LATokens {
  // Surfaces
  static const Color bgBase = Color(0xFF09090B);
  static const Color bgSidebar = Color(0xFF0E1013);
  static const Color bgCard = Color(0xFF0E1013);
  static const Color bgCardHover = Color(0xFF15181D);
  static const Color bgElevated = Color(0xFF15181D);
  static const Color bgInput = Color(0xFF15181D);
  static const Color bgInputHover = Color(0xFF1D2027);
  static const Color bgHover = Color(0x0AFFFFFF);
  static const Color bgActive = Color(0x1400D4FF);

  // Lines
  static const Color border = Color(0xFF23262D);
  static const Color borderSubtle = Color(0xFF1B1E24);
  static const Color borderStrong = Color(0xFF2B2F38);
  static const Color borderHover = Color(0x5800D4FF);

  // Brand accents
  static const Color accent = Color(0xFF0EA5E9);
  static const Color accentStrong = Color(0xFF38BDF8);
  static const Color accentSoft = Color(0x1A0EA5E9);
  static const Color accentMuted = Color(0x0F0EA5E9);
  static const Color accent2 = Color(0xFF8B7CF7);
  static const Color accent3 = Color(0xFFF87171);
  static const Color accent4 = Color(0xFFF59E0B);
  static const Color green = Color(0xFF10B981);
  static const Color amber = Color(0xFFF59E0B);

  // Text
  static const Color textPrimary = Color(0xFFEEF0F7);
  static const Color textSecondary = Color(0xFF9AA0B8);
  static const Color textMuted = Color(0xFF636983);
  static const Color textFaint = Color(0xFF4B5068);
  static const Color textAccent = Color(0xFF38BDF8);

  // Radii
  static const double radiusXs = 6;
  static const double radiusSm = 8;
  static const double radiusMd = 10;
  static const double radiusLg = 14;
  static const double radiusXl = 18;
  static const double radius2xl = 22;
  static const double radiusFull = 999;

  // Spacing
  static const double space1 = 4;
  static const double space2 = 8;
  static const double space3 = 12;
  static const double space4 = 16;
  static const double space5 = 20;
  static const double space6 = 28;
  static const double space7 = 44;
  static const double space8 = 64;

  // Font sizes
  static const double fsXs = 11;
  static const double fsSm = 12.5;
  static const double fsBase = 13.5;
  static const double fsMd = 14.5;
  static const double fsLg = 16;
  static const double fsXl = 19;
  static const double fs2xl = 24;
  static const double fs3xl = 30;

  // Line heights
  static const double lhTight = 1.25;
  static const double lhNormal = 1.55;
  static const double lhRelaxed = 1.65;

  // Durations
  static const Duration durFast = Duration(milliseconds: 140);
  static const Duration durMed = Duration(milliseconds: 280);
  static const Duration durSlow = Duration(milliseconds: 450);

  // Easings
  static const Curve easeOut = Curves.easeOut;
  static const Curve easeSpring = Curves.elasticIn;
  static const Curve easeInOut = Curves.easeInOut;

  // Layout
  static const double topbarH = 56;
  static const double sidebarW = 260;

  // Fonts
  static const String fontDisplay = 'Sora';
  static const String fontMain = 'Inter';
  static const String fontMono = 'Space Mono';

  // Light theme overrides
  static const Color lightBgBase = Color(0xFFFAFAFB);
  static const Color lightBgSidebar = Color(0xFFEEF0F4);
  static const Color lightBgCard = Color(0xFFFFFFFF);
  static const Color lightBgCardHover = Color(0xFFf9fafb);
  static const Color lightBgElevated = Color(0xFFFFFFFF);
  static const Color lightBgInput = Color(0xFFEEF0F4);
  static const Color lightBgInputHover = Color(0xFFE6E8EE);

  static const Color lightBorder = Color(0xFFE4E6EB);
  static const Color lightBorderSubtle = Color(0xFFEEF0F3);
  static const Color lightBorderStrong = Color(0xFFD5D8DE);

  static const Color lightTextPrimary = Color(0xFF0F172A);
  static const Color lightTextSecondary = Color(0xFF5B6478);
  static const Color lightTextMuted = Color(0xFF8A91A8);
  static const Color lightTextFaint = Color(0xFFA8AFC4);
  static const Color lightTextAccent = Color(0xFF0EA5E9);

  static const Color lightAccentSoft = Color(0x0F0EA5E9);
  static const Color lightAccentMuted = Color(0x070EA5E9);
  static const Color lightGreenSoft = Color(0x0F10B981);

  static const Color lightCardShadow = Color(0x0A000000);
  static const Color lightCardShadowHover = Color(0x0D000000);

  static const Color lightGlass = Color(0xC6FFFFFF);
  static const Color lightGlassStrong = Color(0xEBFFFFFF);
}
