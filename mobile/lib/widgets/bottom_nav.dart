import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';

class LearningAlliedNavItem {
  final IconData icon;
  final IconData activeIcon;
  final String label;

  const LearningAlliedNavItem({
    required this.icon,
    required this.activeIcon,
    required this.label,
  });
}

const learningAlliedNavItems = [
  LearningAlliedNavItem(
    icon: Icons.home_outlined,
    activeIcon: Icons.home_rounded,
    label: 'Home',
  ),
  LearningAlliedNavItem(
    icon: Icons.school_outlined,
    activeIcon: Icons.school_rounded,
    label: 'Learn',
  ),
  LearningAlliedNavItem(
    icon: Icons.chat_bubble_outline_rounded,
    activeIcon: Icons.chat_bubble_rounded,
    label: 'Tutor',
  ),
  LearningAlliedNavItem(
    icon: Icons.shield_outlined,
    activeIcon: Icons.shield_rounded,
    label: 'Arena',
  ),
];

/// Floating dark-pill navigation bar inspired by the supplied reference:
/// deep charcoal pill (#141518) with a crisp white active pill (#FFFFFF).
class LearningAlliedBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const LearningAlliedBottomNav({
    super.key,
    required this.currentIndex,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final c = LAColors.of(context);
    return SafeArea(
      top: false,
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 4, 16, 10),
        child: Container(
          height: 62,
          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 6),
          decoration: BoxDecoration(
            color: c.navBg,
            borderRadius: BorderRadius.circular(LATokens.radiusFull),
            boxShadow: const [
              BoxShadow(
                color: Color(0x28141518),
                blurRadius: 20,
                offset: Offset(0, 8),
              ),
            ],
          ),
          child: Row(
            children: List.generate(learningAlliedNavItems.length, (i) {
              final item = learningAlliedNavItems[i];
              final active = currentIndex == i;
              return Expanded(
                child: Semantics(
                  selected: active,
                  button: true,
                  label: item.label,
                  child: Material(
                    color: Colors.transparent,
                    child: InkWell(
                      borderRadius: BorderRadius.circular(LATokens.radiusFull),
                      onTap: () => onTap(i),
                      child: AnimatedContainer(
                        duration: LATokens.durFast,
                        curve: Curves.easeOut,
                        height: double.infinity,
                        decoration: BoxDecoration(
                          color: active ? c.navActive : Colors.transparent,
                          borderRadius: BorderRadius.circular(LATokens.radiusFull),
                        ),
                        child: Row(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Icon(
                              active ? item.activeIcon : item.icon,
                              size: 20,
                              color: active ? c.navActiveInk : c.navMuted,
                            ),
                            if (active) ...[
                              const SizedBox(width: 6),
                              Flexible(
                                child: Text(
                                  item.label,
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: TextStyle(
                                    fontSize: LATokens.fsXs,
                                    fontWeight: FontWeight.w700,
                                    color: c.navActiveInk,
                                  ),
                                ),
                              ),
                            ],
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
              );
            }),
          ),
        ),
      ),
    );
  }
}
