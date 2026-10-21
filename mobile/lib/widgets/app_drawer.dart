import 'package:flutter/material.dart';
import '../theme/design_tokens.dart';
import '../screens/arena_landing_screen.dart';
import '../screens/profile_screen.dart';
import '../screens/learning_hub_screen.dart';
import '../screens/study_session_screen.dart';

class AppDrawer extends StatelessWidget {
  final String activeRoute;

  const AppDrawer({super.key, this.activeRoute = 'arena'});

  @override
  Widget build(BuildContext context) {
    final _userName = 'Student';
    final _userPhotoUrl = '';
    final dark = Theme.of(context).brightness == Brightness.dark;
    return Drawer(
      backgroundColor: dark ? LATokens.bgSidebar : LATokens.lightBgSidebar,
      width: 280,
      child: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(LATokens.space4, LATokens.space3, LATokens.space3, LATokens.space3),
              child: Row(
                children: [
                  Container(
                    width: LATokens.radiusLg.toDouble() + 4,
                    height: LATokens.radiusLg.toDouble() + 4,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF4F8CFF), Color(0xFF8B5CF6)]),
                      borderRadius: BorderRadius.circular(LATokens.radiusMd),
                    ),
                    child: const Center(child: Text('A', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800))),
                  ),
                  const SizedBox(width: LATokens.space2),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Learning Allied', style: TextStyle(color: LATokens.textPrimary, fontWeight: FontWeight.w700, fontSize: 15)),
                        Text('Arena', style: TextStyle(color: LATokens.textMuted, fontSize: 11)),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 18, color: LATokens.textMuted),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(color: LATokens.borderSubtle, height: 1),
            // Nav
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: LATokens.space1, vertical: LATokens.space1),
                children: [
                  const Padding(
                    padding: EdgeInsets.fromLTRB(LATokens.space3, LATokens.space3, LATokens.space3, LATokens.space1),
                    child: Text('MAIN', style: TextStyle(color: LATokens.textMuted, fontSize: LATokens.fsXs, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
                  ),
                  _navItem(context, icon: Icons.home_rounded, label: 'Home', active: activeRoute == 'home', onTap: () {
                    Navigator.pop(context);
                    // Pop to root then replace with home shell - handled by parent
                  }),
                  _navItem(context, icon: Icons.menu_book_rounded, label: 'Study', active: activeRoute == 'study', onTap: () {
                    Navigator.pop(context);
                  }),
                  _navItem(context, icon: Icons.chat_bubble_rounded, label: 'Chat', active: activeRoute == 'chat', onTap: () {
                    Navigator.pop(context);
                  }),
                  _navItem(context, icon: Icons.sports_esports_rounded, label: 'Arena', active: activeRoute == 'arena', trailing: const Text('⚔', style: TextStyle(fontSize: 10)), onTap: () {
                    Navigator.pop(context);
                    if (activeRoute != 'arena') {
                      Navigator.pushAndRemoveUntil(context, MaterialPageRoute(builder: (_) => const ArenaLandingScreen()), (_) => false);
                    }
                  }),
                  _navItem(context, icon: Icons.school_rounded, label: 'Learning Hub', active: activeRoute == 'learning_hub', onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const LearningHubScreen()));
                  }),
                  _navItem(context, icon: Icons.play_circle_rounded, label: 'Study Session', active: activeRoute == 'study_session', badge: 'New', onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const StudySessionScreen()));
                  }),
                  const Padding(
                    padding: EdgeInsets.fromLTRB(LATokens.space3, LATokens.space4, LATokens.space3, LATokens.space1),
                    child: Text('ACCOUNT', style: TextStyle(color: LATokens.textMuted, fontSize: LATokens.fsXs, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
                  ),
                  _navItem(context, icon: Icons.person_rounded, label: 'Profile', onTap: () {
                    Navigator.pop(context);
                    Navigator.push(context, MaterialPageRoute(builder: (_) => const ProfileScreen()));
                  }),
                  _navItem(context, icon: Icons.settings_rounded, label: 'Settings', onTap: () {
                    Navigator.pop(context);
                  }),
                ],
              ),
            ),
            // Bottom card + user
            Padding(
              padding: const EdgeInsets.all(LATokens.space3),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(LATokens.space3),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF0F172A), Color(0xFF1E293B)]),
                      borderRadius: BorderRadius.circular(LATokens.radiusMd),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(color: LATokens.green.withOpacity(0.14), borderRadius: BorderRadius.circular(LATokens.radiusSm)),
                          child: const Icon(Icons.menu_book_rounded, size: 16, color: Color(0xFF10B981)),
                        ),
                        const SizedBox(width: LATokens.space2),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Syllabus', style: TextStyle(color: LATokens.textPrimary, fontSize: LATokens.fsXs, fontWeight: FontWeight.w600)),
                              Text('Upload personalises plan', style: TextStyle(color: LATokens.textMuted, fontSize: LATokens.fsXs)),
                            ],
                          ),
                        ),
                        const Icon(Icons.arrow_forward, size: 14, color: LATokens.textMuted),
                      ],
                    ),
                  ),
                  const SizedBox(height: LATokens.space3),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: LATokens.space2, vertical: LATokens.space2),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.04), borderRadius: BorderRadius.circular(LATokens.radiusMd)),
                    child: Row(
                      children: [
                  CircleAvatar(
                          radius: 16,
                          backgroundColor: LATokens.accent,
                          backgroundImage: _userPhotoUrl.isNotEmpty ? NetworkImage(_userPhotoUrl) : null,
                          child: _userPhotoUrl.isEmpty ? Text(_userName[0].toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)) : null,
                        ),
                        const SizedBox(width: LATokens.space2),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(_userName, maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: LATokens.textPrimary, fontSize: LATokens.fsSm, fontWeight: FontWeight.w600)),
                              const Text('Free Plan', style: TextStyle(color: LATokens.textMuted, fontSize: LATokens.fsXs)),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.logout_rounded, size: 16, color: LATokens.textMuted),
                          onPressed: () async {
                            if (context.mounted) Navigator.pop(context);
                          },
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _navItem(BuildContext context,
      {required IconData icon, required String label, bool active = false, Widget? trailing, String? badge, VoidCallback? onTap}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 1),
      child: Material(
        color: active ? LATokens.accent.withOpacity(0.16) : Colors.transparent,
        borderRadius: BorderRadius.circular(LATokens.radiusMd),
        child: InkWell(
          borderRadius: BorderRadius.circular(LATokens.radiusMd),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: LATokens.space3, vertical: LATokens.space2),
            child: Row(
              children: [
                Container(
                  width: 36,
                  height: 36,
                  decoration: BoxDecoration(
                    color: active ? LATokens.accent : (darkMode(context) ? LATokens.bgElevated : LATokens.lightBgCardHover),
                    borderRadius: BorderRadius.circular(LATokens.radiusSm),
                  ),
                  child: Icon(icon, size: 18, color: active ? Colors.white : (darkMode(context) ? LATokens.textSecondary : LATokens.lightTextSecondary)),
                ),
                const SizedBox(width: LATokens.space3),
                Expanded(
                  child: Text(label, style: TextStyle(color: active ? LATokens.accent : (darkMode(context) ? LATokens.textPrimary : LATokens.lightTextPrimary), fontSize: LATokens.fsSm, fontWeight: active ? FontWeight.w600 : FontWeight.w500)),
                ),
                const Spacer(),
                if (badge != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(color: LATokens.green.withOpacity(0.12), borderRadius: BorderRadius.circular(LATokens.radiusFull)),
                    child: Text(badge, style: const TextStyle(color: LATokens.green, fontSize: LATokens.fsXs, fontWeight: FontWeight.w700)),
                  ),
                if (trailing != null) ...[const SizedBox(width: LATokens.space1), trailing],
              ],
            ),
          ),
        ),
      ),
    );
  }

  bool darkMode(BuildContext context) => Theme.of(context).brightness == Brightness.dark;
}
