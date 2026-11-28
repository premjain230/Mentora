import 'package:flutter/material.dart';
import '../services/arena_curriculum.dart';
import '../services/arena_progress.dart';
import '../theme/design_tokens.dart';

class ChapterNode extends StatelessWidget {
  final Chapter chapter;
  final ChapterProgress? progress;
  final bool isCurrent;
  final VoidCallback onTap;

  const ChapterNode({
    super.key,
    required this.chapter,
    required this.progress,
    required this.isCurrent,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    final state = progress?.state ?? ArenaState.locked;

    late final IconData icon;
    late final Color badgeColor;
    switch (state) {
      case ArenaState.available:
        icon = Icons.play_arrow_rounded;
        badgeColor = c.accent;
        break;
      case ArenaState.inProgress:
        icon = Icons.local_fire_department_rounded;
        badgeColor = c.amber;
        break;
      case ArenaState.mastered:
        icon = Icons.workspace_premium_rounded;
        badgeColor = c.amber;
        break;
      case ArenaState.defeated:
        icon = Icons.check_rounded;
        badgeColor = c.green;
        break;
      default:
        icon = Icons.lock_outline_rounded;
        badgeColor = c.textMuted;
    }

    Color border = c.border;
    Color bg = c.surface;
    if (isCurrent) {
      border = c.accent.withValues(alpha: 0.55);
      bg = c.accentSoft;
    } else if (state == ArenaState.defeated) {
      border = c.green.withValues(alpha: 0.4);
    } else if (state == ArenaState.mastered) {
      border = c.amber.withValues(alpha: 0.45);
    }

    return Material(
      color: bg,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(LATokens.radiusLg),
        side: BorderSide(color: border),
      ),
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(LATokens.radiusLg),
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 11),
          child: Row(
            children: [
              Container(
                width: 36,
                height: 36,
                decoration: BoxDecoration(
                  color: state == ArenaState.locked
                      ? c.surfaceElevated
                      : badgeColor.withValues(alpha: 0.16),
                  borderRadius: BorderRadius.circular(LATokens.radiusMd),
                ),
                child: Icon(icon, size: 18, color: badgeColor),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      chapter.name,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(fontWeight: FontWeight.w600, fontSize: LATokens.fsSm, color: c.text),
                    ),
                    Text(
                      '${chapter.topic} · ${chapter.difficultyLabel}',
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: TextStyle(color: c.textMuted, fontSize: LATokens.fsXs),
                    ),
                  ],
                ),
              ),
              if (progress != null && progress!.bestScore > 0)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: c.surfaceElevated,
                    borderRadius: BorderRadius.circular(LATokens.radiusFull),
                  ),
                  child: Text(
                    '${(progress!.bestScore * 100).round()}%',
                    style: TextStyle(
                      color: c.textSecondary,
                      fontSize: LATokens.fsXs,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
            ],
          ),
        ),
      ),
    );
  }
}
