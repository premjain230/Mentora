import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../screens/arena_landing_screen.dart';

class AppDrawer extends StatelessWidget {
  final String activeRoute; // 'arena', 'home', etc
  const AppDrawer({super.key, this.activeRoute = 'arena'});

  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    return Drawer(
      backgroundColor: const Color(0xFF0E1016),
      width: 280,
      child: SafeArea(
        child: Column(
          children: [
            // Header
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
              child: Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF4F8CFF), Color(0xFF8B5CF6)]),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: const Center(child: Text('A', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w800))),
                  ),
                  const SizedBox(width: 10),
                  const Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Learning Allied', style: TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15)),
                        Text('Arena', style: TextStyle(color: Colors.white38, fontSize: 11)),
                      ],
                    ),
                  ),
                  IconButton(
                    icon: const Icon(Icons.close, size: 18, color: Colors.white54),
                    onPressed: () => Navigator.pop(context),
                  ),
                ],
              ),
            ),
            const Divider(color: Colors.white10, height: 1),
            // Nav
            Expanded(
              child: ListView(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                children: [
                  const Padding(
                    padding: EdgeInsets.fromLTRB(12, 12, 12, 4),
                    child: Text('MAIN', style: TextStyle(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
                  ),
                  _navItem(
                    context,
                    icon: Icons.home_rounded,
                    label: 'Home',
                    active: activeRoute == 'home',
                    onTap: () {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Home — coming soon, use Arena for now')));
                    },
                  ),
                  _navItem(
                    context,
                    icon: Icons.sports_esports_rounded,
                    label: 'Arena',
                    active: activeRoute == 'arena',
                    trailing: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                      decoration: BoxDecoration(color: const Color(0xFF0EA5E9).withOpacity(0.16), borderRadius: BorderRadius.circular(20)),
                      child: const Text('⚔', style: TextStyle(fontSize: 10)),
                    ),
                    onTap: () {
                      Navigator.pop(context);
                      // if not already on arena, push
                      if (activeRoute != 'arena') {
                        Navigator.pushAndRemoveUntil(
                          context,
                          MaterialPageRoute(builder: (_) => const ArenaLandingScreen()),
                          (_) => false,
                        );
                      }
                    },
                  ),
                  _navItem(
                    context,
                    icon: Icons.chat_bubble_rounded,
                    label: 'Chat',
                    active: false,
                    onTap: () {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Chat — open web app for chat')));
                    },
                  ),
                  _navItem(
                    context,
                    icon: Icons.bolt_rounded,
                    label: 'Study Session',
                    active: false,
                    badge: 'New',
                    onTap: () {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Study Session — coming to mobile')));
                    },
                  ),
                  _navItem(
                    context,
                    icon: Icons.calendar_month_rounded,
                    label: 'Study Planner',
                    active: false,
                    onTap: () {
                      Navigator.pop(context);
                      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Planner — web only')));
                    },
                  ),
                  const Padding(
                    padding: EdgeInsets.fromLTRB(12, 16, 12, 4),
                    child: Text('ACCOUNT', style: TextStyle(color: Colors.white38, fontSize: 11, fontWeight: FontWeight.w700, letterSpacing: 0.8)),
                  ),
                  _navItem(context, icon: Icons.person_rounded, label: 'Profile', onTap: () { Navigator.pop(context); }),
                  _navItem(context, icon: Icons.settings_rounded, label: 'Settings', onTap: () { Navigator.pop(context); }),
                ],
              ),
            ),
            // Bottom card + user
            Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                children: [
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(colors: [Color(0xFF0F172A), Color(0xFF1E293B)]),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: Colors.white10),
                    ),
                    child: Row(
                      children: [
                        Container(
                          width: 32,
                          height: 32,
                          decoration: BoxDecoration(color: const Color(0xFF10B981).withOpacity(0.14), borderRadius: BorderRadius.circular(8)),
                          child: const Icon(Icons.menu_book_rounded, size: 16, color: Color(0xFF10B981)),
                        ),
                        const SizedBox(width: 10),
                        const Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text('Syllabus', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600)),
                              Text('Upload personalises plan', style: TextStyle(color: Colors.white38, fontSize: 10)),
                            ],
                          ),
                        ),
                        const Icon(Icons.arrow_forward, size: 14, color: Colors.white38),
                      ],
                    ),
                  ),
                  const SizedBox(height: 12),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                    decoration: BoxDecoration(color: Colors.white.withOpacity(0.04), borderRadius: BorderRadius.circular(12)),
                    child: Row(
                      children: [
                        CircleAvatar(
                          radius: 16,
                          backgroundColor: const Color(0xFF0EA5E9),
                          backgroundImage: user?.photoURL != null ? NetworkImage(user!.photoURL!) : null,
                          child: user?.photoURL == null ? Text((user?.displayName ?? user?.email ?? 'G')[0].toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 12)) : null,
                        ),
                        const SizedBox(width: 10),
                        Expanded(
                          child: Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(user?.displayName ?? user?.email ?? 'Guest', maxLines: 1, overflow: TextOverflow.ellipsis, style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.w600)),
                              const Text('Free Plan', style: TextStyle(color: Colors.white38, fontSize: 10)),
                            ],
                          ),
                        ),
                        IconButton(
                          icon: const Icon(Icons.logout_rounded, size: 16, color: Colors.white38),
                          onPressed: () async {
                            await FirebaseAuth.instance.signOut();
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
        color: active ? const Color(0xFF2563EB) : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        child: InkWell(
          borderRadius: BorderRadius.circular(10),
          onTap: onTap,
          child: Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
            child: Row(
              children: [
                Icon(icon, size: 18, color: active ? Colors.white : Colors.white54),
                const SizedBox(width: 10),
                Text(label, style: TextStyle(color: active ? Colors.white : Colors.white70, fontSize: 13, fontWeight: active ? FontWeight.w600 : FontWeight.w500)),
                const Spacer(),
                if (badge != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 2),
                    decoration: BoxDecoration(color: const Color(0xFF10B981).withOpacity(0.12), borderRadius: BorderRadius.circular(20)),
                    child: Text(badge, style: const TextStyle(color: Color(0xFF10B981), fontSize: 10, fontWeight: FontWeight.w700)),
                  ),
                if (trailing != null) ...[const SizedBox(width: 6), trailing],
              ],
            ),
          ),
        ),
      ),
    );
  }
}
