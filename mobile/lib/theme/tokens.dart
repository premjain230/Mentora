// Learning Allied Design Tokens — Dart mirror of web css/tokens.css (single source of truth)
// Web: css/tokens.css:6-119 — Mobile: this file. Keep in sync.

import 'package:flutter/material.dart';

class LearningAlliedTokens {
  // Surfaces — refined premium dark (web --bg-base #080a0f, --bg-card #151821)
  static const bgBase = Color(0xFF080A0F);
  static const bgBaseSoft = Color(0xFF0C0E14);
  static const bgSidebar = Color(0xFF0E1016);
  static const bgCard = Color(0xFF151821);
  static const bgCardHover = Color(0xFF1A1D2A);
  static const bgElevated = Color(0xFF1E2230);
  static const bgInput = Color(0xFF1D2132);

  // Lines — hairline, premium
  static const border = Color(0x0FFFFFFF); // rgba(255,255,255,0.06) — use withOpacity
  static const borderSubtle = Color(0x0AFFFFFF);
  static const borderStrong = Color(0x1AFFFFFF);

  // Brand accents
  static const accent = Color(0xFF0EA5E9);
  static const accentStrong = Color(0xFF38BDF8);
  static const accent2 = Color(0xFF8B7CF7);
  static const green = Color(0xFF10B981);
  static const amber = Color(0xFFF59E0B);
  static const red = Color(0xFFF87171);

  // Text — refined contrast (WCAG AA)
  static const textPrimary = Color(0xFFEEF0F7);
  static const textSecondary = Color(0xFF9AA0B8);
  static const textMuted = Color(0xFF636983);
  static const textFaint = Color(0xFF4B5068);

  // Radii — refined, consistent
  static const radiusXs = 6.0;
  static const radiusSm = 8.0;
  static const radiusMd = 10.0;
  static const radiusLg = 14.0;
  static const radiusXl = 18.0;
  static const radiusFull = 999.0;

  // Shadows — layered, premium
  static const shadowSm = BoxShadow(color: Color(0x4D000000), blurRadius: 3, offset: Offset(0, 1));
  static const shadowMd = BoxShadow(color: Color(0x47000000), blurRadius: 12, offset: Offset(0, 4));
  static const shadowGlow = BoxShadow(color: Color(0x140EA5E9), blurRadius: 20, offset: Offset(0, 4));

  // Typography — Sora for display, Inter for UI
  static const fontDisplay = 'Sora';
  static const fontMain = 'Inter';
  static const fontMono = 'Space Mono';

  // Layout
  static const topbarH = 56.0;
}

// Backward compatibility alias — do not remove (existing imports may reference AquilaTokens)
typedef AquilaTokens = LearningAlliedTokens;
