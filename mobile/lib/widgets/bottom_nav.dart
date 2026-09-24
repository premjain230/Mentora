import 'package:flutter/material.dart';
import '../theme/tokens.dart';

class LearningAlliedBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;
  const LearningAlliedBottomNav({super.key, required this.currentIndex, required this.onTap});

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: LearningAlliedTokens.bgSidebar,
        border: Border(top: BorderSide(color: Colors.white.withOpacity(0.06))),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.35), blurRadius: 12, offset: const Offset(0, -2))],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: [
              _item(context, 0, Icons.home_rounded, 'Home', currentIndex == 0),
              _item(context, 1, Icons.menu_book_rounded, 'Study', currentIndex == 1),
              _item(context, 2, Icons.chat_bubble_rounded, 'Chat', currentIndex == 2),
              _item(context, 3, Icons.sports_esports_rounded, 'Arena', currentIndex == 3),
              _item(context, 4, Icons.person_rounded, 'Profile', currentIndex == 4),
            ],
          ),
        ),
      ),
    );
  }

  Widget _item(BuildContext context, int index, IconData icon, String label, bool active) {
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(LearningAlliedTokens.radiusMd),
        onTap: () => onTap(index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: active ? LearningAlliedTokens.accent.withOpacity(0.12) : Colors.transparent,
            borderRadius: BorderRadius.circular(LearningAlliedTokens.radiusMd),
            border: Border.all(color: active ? LearningAlliedTokens.accent.withOpacity(0.25) : Colors.transparent),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 22, color: active ? LearningAlliedTokens.accent : LearningAlliedTokens.textMuted),
              const SizedBox(height: 2),
              Text(label, style: TextStyle(fontSize: 11, fontWeight: active ? FontWeight.w600 : FontWeight.w500, color: active ? LearningAlliedTokens.accent : LearningAlliedTokens.textMuted, fontFamily: LearningAlliedTokens.fontMain)),
            ],
          ),
        ),
      ),
    );
  }
}

// Alias for backward compat
typedef AquilaBottomNav = LearningAlliedBottomNav;
