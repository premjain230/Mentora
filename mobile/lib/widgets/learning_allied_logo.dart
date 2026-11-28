import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';

/// Official Learning Allied geometric monogram, rendered directly from the
/// production website SVG (`learningallied-black.svg` / `learningallied-white.svg`,
/// viewBox 0 0 512 512, fill-rule: evenodd).
class LearningAlliedLogo extends StatelessWidget {
  final double size;
  final Color? color;

  const LearningAlliedLogo({
    super.key,
    this.size = 28,
    this.color,
  });

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    final fill = color ?? (c.isDark ? Colors.white : Colors.black);
    return Semantics(
      label: 'Learning Allied logo',
      image: true,
      child: SizedBox(
        width: size,
        height: size,
        child: CustomPaint(
          painter: _LearningAlliedLogoPainter(fill),
        ),
      ),
    );
  }
}

class _LearningAlliedLogoPainter extends CustomPainter {
  final Color color;

  _LearningAlliedLogoPainter(this.color);

  static final Path _cachedPath = _buildPath();

  static Path _buildPath() {
    final p = Path()..fillType = PathFillType.evenOdd;
    // Outer contour from learningallied-black.svg / learningallied-white.svg
    p.moveTo(306.52, 60.52);
    const outer = <Offset>[
      Offset(307.84, 61.84),
      Offset(308.71, 61.40),
      Offset(309.37, 62.50),
      Offset(323.43, 97.64),
      Offset(323.87, 99.84),
      Offset(464.00, 449.94),
      Offset(462.90, 451.48),
      Offset(446.65, 450.60),
      Offset(446.21, 450.16),
      Offset(442.69, 450.16),
      Offset(442.26, 449.72),
      Offset(431.27, 448.41),
      Offset(416.78, 444.89),
      Offset(407.55, 441.82),
      Offset(392.62, 434.79),
      Offset(385.15, 429.96),
      Offset(376.36, 422.93),
      Offset(366.92, 413.04),
      Offset(360.33, 403.82),
      Offset(354.18, 392.40),
      Offset(351.10, 384.93),
      Offset(348.03, 375.70),
      Offset(344.08, 356.82),
      Offset(343.20, 345.39),
      Offset(342.76, 344.95),
      Offset(342.10, 328.92),
      Offset(271.16, 440.28),
      Offset(264.57, 450.38),
      Offset(263.69, 450.38),
      Offset(263.47, 451.48),
      Offset(49.10, 451.48),
      Offset(48.88, 449.50),
      Offset(48.00, 449.06),
      Offset(50.20, 445.55),
      Offset(306.52, 60.52),
    ];
    for (final pt in outer) {
      p.lineTo(pt.dx, pt.dy);
    }
    p.close();

    // Inner cutout from learningallied-black.svg / learningallied-white.svg
    p.moveTo(307.40, 173.85);
    const inner = <Offset>[
      Offset(299.49, 179.56),
      Offset(290.26, 187.47),
      Offset(268.96, 208.34),
      Offset(248.31, 230.74),
      Offset(223.27, 259.73),
      Offset(223.49, 260.39),
      Offset(231.84, 256.00),
      Offset(246.34, 250.29),
      Offset(253.80, 248.53),
      Offset(260.83, 248.53),
      Offset(263.03, 249.41),
      Offset(265.01, 251.39),
      Offset(265.88, 253.14),
      Offset(265.88, 259.29),
      Offset(263.69, 265.01),
      Offset(234.69, 307.62),
      Offset(197.36, 359.45),
      Offset(167.48, 398.55),
      Offset(125.53, 449.72),
      Offset(191.21, 449.50),
      Offset(211.41, 415.68),
      Offset(229.86, 381.85),
      Offset(246.12, 349.35),
      Offset(246.12, 348.47),
      Offset(257.54, 324.75),
      Offset(258.86, 320.79),
      Offset(267.20, 302.34),
      Offset(271.16, 291.80),
      Offset(272.47, 289.61),
      Offset(282.58, 262.81),
      Offset(286.09, 257.54),
      Offset(288.95, 255.12),
      Offset(292.90, 253.36),
      Offset(298.61, 253.36),
      Offset(303.00, 254.68),
      Offset(309.59, 258.64),
      Offset(313.55, 261.71),
      Offset(324.31, 272.47),
      Offset(332.65, 282.58),
      Offset(340.12, 293.12),
      Offset(341.44, 294.00),
      Offset(340.56, 283.02),
      Offset(340.12, 282.58),
      Offset(340.12, 278.18),
      Offset(339.68, 277.74),
      Offset(339.24, 270.72),
      Offset(338.80, 270.28),
      Offset(337.49, 258.42),
      Offset(333.97, 239.97),
      Offset(330.46, 225.91),
      Offset(325.63, 210.53),
      Offset(320.35, 197.36),
      Offset(313.33, 183.30),
      Offset(307.40, 173.85),
    ];
    for (final pt in inner) {
      p.lineTo(pt.dx, pt.dy);
    }
    p.close();
    return p;
  }

  @override
  void paint(Canvas canvas, Size size) {
    final paint = Paint()
      ..color = color
      ..style = PaintingStyle.fill
      ..isAntiAlias = true;
    canvas.save();
    canvas.scale(size.width / 512.0, size.height / 512.0);
    canvas.drawPath(_cachedPath, paint);
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _LearningAlliedLogoPainter oldDelegate) =>
      oldDelegate.color != color;
}
