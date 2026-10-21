import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';

class LearningAlliedBottomNav extends StatelessWidget {
  final int currentIndex;
  final ValueChanged<int> onTap;

  const LearningAlliedBottomNav({super.key, required this.currentIndex, required this.onTap});

  // Website sidebar nav items translated to mobile bottom nav
  static const List<Map<String, dynamic>> _items = [
    {'icon': Icons.home_rounded, 'label': 'Home', 'route': 'home'},
    {'icon': Icons.menu_book_rounded, 'label': 'Study', 'route': 'study'},
    {'icon': Icons.chat_bubble_rounded, 'label': 'Chat', 'route': 'chat'},
    {'icon': Icons.sports_esports_rounded, 'label': 'Arena', 'route': 'arena'},
    {'icon': Icons.person_rounded, 'label': 'Profile', 'route': 'profile'},
  ];

  @override
  Widget build(BuildContext context) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Container(
      decoration: BoxDecoration(
        color: dark ? LATokens.bgSidebar : LATokens.lightBgSidebar,
        border: Border(top: BorderSide(color: dark ? LATokens.border : LATokens.lightBorder)),
        boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.35), blurRadius: 12, offset: const Offset(0, -2))],
      ),
      child: SafeArea(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 6),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceAround,
            children: List.generate(_items.length, (i) {
              final item = _items[i];
              final active = currentIndex == i;
              return _item(context, i, item['icon'], item['label'], active);
            }),
          ),
        ),
      ),
    );
  }

  Widget _item(BuildContext context, int index, IconData icon, String label, bool active) {
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Expanded(
      child: InkWell(
        borderRadius: BorderRadius.circular(LATokens.radiusMd),
        onTap: () => onTap(index),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 6),
          decoration: BoxDecoration(
            color: active ? LATokens.accent.withOpacity(0.12) : Colors.transparent,
            borderRadius: BorderRadius.circular(LATokens.radiusMd),
            border: Border.all(color: active ? LATokens.accent.withOpacity(0.25) : Colors.transparent),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 22, color: active ? LATokens.accent : (dark ? LATokens.textMuted : LATokens.lightTextMuted)),
              const SizedBox(height: 2),
              Text(label, style: TextStyle(fontSize: 11, fontWeight: active ? FontWeight.w600 : FontWeight.w500, color: active ? LATokens.accent : (dark ? LATokens.textMuted : LATokens.lightTextMuted), fontFamily: LATokens.fontMain)),
            ],
          ),
        ),
      ),
    );
  }
}

typedef AquilaBottomNav = LearningAlliedBottomNav;
