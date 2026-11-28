import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import '../theme/design_tokens.dart';

/// Native Markdown + LaTeX/Math renderer for AI Tutor responses and lessons.
/// Handles headings, bold, italic, inline code, fenced code blocks (with copy),
/// bullet/numbered lists, blockquotes, and inline/display math ($...$, $$...$$).
class MarkdownMathText extends StatelessWidget {
  final String text;
  final TextStyle? baseStyle;

  const MarkdownMathText({
    super.key,
    required this.text,
    this.baseStyle,
  });

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    final style = baseStyle ??
        TextStyle(
          fontSize: LATokens.fsBase,
          color: c.text,
          height: LATokens.lhRelaxed,
        );

    final blocks = _parseBlocks(text);
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        for (int i = 0; i < blocks.length; i++) ...[
          _buildBlock(context, blocks[i], style, c),
          if (i != blocks.length - 1) const SizedBox(height: 8),
        ],
      ],
    );
  }

  Widget _buildBlock(
    BuildContext context,
    _Block block,
    TextStyle base,
    LAColors c,
  ) {
    switch (block.type) {
      case _BlockType.heading:
        final size = block.level == 1
            ? LATokens.fsXl
            : (block.level == 2 ? LATokens.fsLg : LATokens.fsMd);
        return Text.rich(
          TextSpan(children: _parseInline(block.content, base.copyWith(fontSize: size, fontWeight: FontWeight.w700, height: 1.3), c)),
        );
      case _BlockType.code:
        return Container(
          width: double.infinity,
          decoration: BoxDecoration(
            color: c.isDark ? const Color(0xFF0A0A0C) : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(LATokens.radiusMd),
            border: Border.all(color: c.border),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                decoration: BoxDecoration(
                  border: Border(bottom: BorderSide(color: c.borderSubtle)),
                ),
                child: Row(
                  children: [
                    Text(
                      block.lang.isEmpty ? 'code' : block.lang,
                      style: TextStyle(
                        fontSize: LATokens.fsXs,
                        fontFamily: 'monospace',
                        color: c.textMuted,
                      ),
                    ),
                    const Spacer(),
                    InkWell(
                      onTap: () {
                        Clipboard.setData(ClipboardData(text: block.content));
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(
                            content: Text('Code copied'),
                            duration: Duration(milliseconds: 1400),
                          ),
                        );
                      },
                      child: Row(
                        children: [
                          Icon(Icons.copy_rounded, size: 13, color: c.textMuted),
                          const SizedBox(width: 4),
                          Text('Copy', style: TextStyle(fontSize: LATokens.fsXs, color: c.textMuted)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              SingleChildScrollView(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.all(12),
                child: SelectableText(
                  block.content,
                  style: TextStyle(
                    fontFamily: 'monospace',
                    fontSize: 12.5,
                    color: c.text,
                    height: 1.5,
                  ),
                ),
              ),
            ],
          ),
        );
      case _BlockType.mathDisplay:
        return Container(
          width: double.infinity,
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
          decoration: BoxDecoration(
            color: c.surfaceElevated,
            borderRadius: BorderRadius.circular(LATokens.radiusMd),
            border: Border.all(color: c.borderSubtle),
          ),
          child: SingleChildScrollView(
            scrollDirection: Axis.horizontal,
            child: SelectableText(
              _formatMath(block.content),
              style: TextStyle(
                fontFamily: 'serif',
                fontSize: 16,
                fontStyle: FontStyle.italic,
                color: c.text,
                height: 1.4,
              ),
            ),
          ),
        );
      case _BlockType.quote:
        return Container(
          padding: const EdgeInsets.fromLTRB(12, 6, 8, 6),
          decoration: BoxDecoration(
            border: Border(left: BorderSide(color: c.accent, width: 3)),
          ),
          child: Text.rich(
            TextSpan(children: _parseInline(block.content, base.copyWith(color: c.textSecondary), c)),
          ),
        );
      case _BlockType.bullet:
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Padding(
              padding: const EdgeInsets.only(top: 7, right: 8),
              child: Container(
                width: 5,
                height: 5,
                decoration: BoxDecoration(color: c.accent, shape: BoxShape.circle),
              ),
            ),
            Expanded(
              child: Text.rich(
                TextSpan(children: _parseInline(block.content, base, c)),
              ),
            ),
          ],
        );
      case _BlockType.numbered:
        return Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              width: 22,
              child: Text(
                '${block.level}.',
                style: base.copyWith(fontWeight: FontWeight.w600, color: c.accent),
              ),
            ),
            Expanded(
              child: Text.rich(
                TextSpan(children: _parseInline(block.content, base, c)),
              ),
            ),
          ],
        );
      case _BlockType.paragraph:
        return SelectableText.rich(
          TextSpan(children: _parseInline(block.content, base, c)),
        );
    }
  }

  List<_Block> _parseBlocks(String raw) {
    final lines = raw.replaceAll('\r\n', '\n').split('\n');
    final out = <_Block>[];
    int i = 0;

    while (i < lines.length) {
      final line = lines[i];
      final trimmed = line.trim();

      if (trimmed.isEmpty) {
        i++;
        continue;
      }

      // Fenced code block
      if (trimmed.startsWith('```')) {
        final lang = trimmed.substring(3).trim();
        final buf = <String>[];
        i++;
        while (i < lines.length && !lines[i].trim().startsWith('```')) {
          buf.add(lines[i]);
          i++;
        }
        i++; // skip closing ```
        out.add(_Block(_BlockType.code, buf.join('\n'), lang: lang));
        continue;
      }

      // Display math $$...$$ or \[...\]
      if (trimmed.startsWith(r'$$') || trimmed.startsWith(r'\[')) {
        final isBracket = trimmed.startsWith(r'\[');
        final close = isBracket ? r'\]' : r'$$';
        final first = trimmed.substring(2).trim();
        if (first.endsWith(close) && first.length >= 2) {
          out.add(_Block(_BlockType.mathDisplay, first.substring(0, first.length - 2).trim()));
          i++;
          continue;
        }
        final buf = <String>[if (first.isNotEmpty) first];
        i++;
        while (i < lines.length) {
          final l = lines[i].trim();
          if (l.endsWith(close)) {
            final rem = l.substring(0, l.length - 2).trim();
            if (rem.isNotEmpty) buf.add(rem);
            i++;
            break;
          }
          buf.add(lines[i]);
          i++;
        }
        out.add(_Block(_BlockType.mathDisplay, buf.join(' ')));
        continue;
      }

      // Headings
      final hMatch = RegExp(r'^(#{1,3})\s+(.+)$').firstMatch(trimmed);
      if (hMatch != null) {
        out.add(_Block(_BlockType.heading, hMatch.group(2)!, level: hMatch.group(1)!.length));
        i++;
        continue;
      }

      // Blockquote
      if (trimmed.startsWith('> ')) {
        out.add(_Block(_BlockType.quote, trimmed.substring(2)));
        i++;
        continue;
      }

      // Bullet
      if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('• ')) {
        out.add(_Block(_BlockType.bullet, trimmed.substring(2)));
        i++;
        continue;
      }

      // Numbered list
      final nMatch = RegExp(r'^(\d+)\.\s+(.+)$').firstMatch(trimmed);
      if (nMatch != null) {
        out.add(_Block(_BlockType.numbered, nMatch.group(2)!, level: int.tryParse(nMatch.group(1)!) ?? 1));
        i++;
        continue;
      }

      // Paragraph (accumulate consecutive non-special lines)
      final pBuf = <String>[trimmed];
      i++;
      while (i < lines.length) {
        final next = lines[i].trim();
        if (next.isEmpty ||
            next.startsWith('```') ||
            next.startsWith('#') ||
            next.startsWith('> ') ||
            next.startsWith('- ') ||
            next.startsWith('* ') ||
            next.startsWith(r'$$') ||
            next.startsWith(r'\[') ||
            RegExp(r'^\d+\.\s+').hasMatch(next)) {
          break;
        }
        pBuf.add(next);
        i++;
      }
      out.add(_Block(_BlockType.paragraph, pBuf.join(' ')));
    }
    return out;
  }

  List<InlineSpan> _parseInline(String input, TextStyle base, LAColors c) {
    final spans = <InlineSpan>[];
    final tokenPattern = RegExp(
      r'(\$\$.+?\$\$|\$[^$\n]+?\$|\\\(.+?\\\)|`[^`]+?`|\*\*[^*]+?\*\*|\*[^*]+?\*)',
    );
    int pos = 0;
    for (final m in tokenPattern.allMatches(input)) {
      if (m.start > pos) {
        spans.add(TextSpan(text: input.substring(pos, m.start), style: base));
      }
      final tok = m.group(0)!;
      if (tok.startsWith(r'$$') && tok.endsWith(r'$$')) {
        spans.add(TextSpan(
          text: _formatMath(tok.substring(2, tok.length - 2)),
          style: base.copyWith(fontFamily: 'serif', fontStyle: FontStyle.italic),
        ));
      } else if (tok.startsWith(r'$') && tok.endsWith(r'$')) {
        spans.add(TextSpan(
          text: _formatMath(tok.substring(1, tok.length - 1)),
          style: base.copyWith(fontFamily: 'serif', fontStyle: FontStyle.italic),
        ));
      } else if (tok.startsWith(r'\(') && tok.endsWith(r'\)')) {
        spans.add(TextSpan(
          text: _formatMath(tok.substring(2, tok.length - 2)),
          style: base.copyWith(fontFamily: 'serif', fontStyle: FontStyle.italic),
        ));
      } else if (tok.startsWith('`') && tok.endsWith('`')) {
        spans.add(TextSpan(
          text: ' ${tok.substring(1, tok.length - 1)} ',
          style: base.copyWith(
            fontFamily: 'monospace',
            fontSize: (base.fontSize ?? 14) - 1,
            backgroundColor: c.surfaceElevated,
          ),
        ));
      } else if (tok.startsWith('**') && tok.endsWith('**')) {
        spans.add(TextSpan(
          text: tok.substring(2, tok.length - 2),
          style: base.copyWith(fontWeight: FontWeight.w700),
        ));
      } else if (tok.startsWith('*') && tok.endsWith('*')) {
        spans.add(TextSpan(
          text: tok.substring(1, tok.length - 1),
          style: base.copyWith(fontStyle: FontStyle.italic),
        ));
      }
      pos = m.end;
    }
    if (pos < input.length) {
      spans.add(TextSpan(text: input.substring(pos), style: base));
    }
    return spans;
  }

  static String _formatMath(String tex) {
    var s = tex.trim();
    const replacements = <String, String>{
      r'\times': '×',
      r'\cdot': '·',
      r'\div': '÷',
      r'\pm': '±',
      r'\mp': '∓',
      r'\leq': '≤',
      r'\le': '≤',
      r'\geq': '≥',
      r'\ge': '≥',
      r'\neq': '≠',
      r'\ne': '≠',
      r'\approx': '≈',
      r'\equiv': '≡',
      r'\infty': '∞',
      r'\rightarrow': '→',
      r'\to': '→',
      r'\leftarrow': '←',
      r'\Rightarrow': '⇒',
      r'\Leftrightarrow': '⇔',
      r'\alpha': 'α',
      r'\beta': 'β',
      r'\gamma': 'γ',
      r'\delta': 'δ',
      r'\Delta': 'Δ',
      r'\theta': 'θ',
      r'\lambda': 'λ',
      r'\mu': 'μ',
      r'\pi': 'π',
      r'\rho': 'ρ',
      r'\sigma': 'σ',
      r'\omega': 'ω',
      r'\Omega': 'Ω',
      r'\sum': '∑',
      r'\int': '∫',
      r'\partial': '∂',
      r'\nabla': '∇',
      r'\sqrt': '√',
      r'\degree': '°',
      r'^\circ': '°',
    };
    replacements.forEach((k, v) {
      s = s.replaceAll(k, v);
    });
    // Convert \frac{a}{b} -> (a)/(b)
    s = s.replaceAllMapped(
      RegExp(r'\\frac\{([^{}]+)\}\{([^{}]+)\}'),
      (m) => '(${m.group(1)})/(${m.group(2)})',
    );
    // Clean remaining braces
    s = s.replaceAll('{', '').replaceAll('}', '');
    return s;
  }
}

enum _BlockType { heading, code, mathDisplay, quote, bullet, numbered, paragraph }

class _Block {
  final _BlockType type;
  final String content;
  final int level;
  final String lang;

  _Block(this.type, this.content, {this.level = 0, this.lang = ''});
}
