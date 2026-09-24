import 'package:flutter/material.dart';
import 'package:firebase_auth/firebase_auth.dart';
import '../theme/tokens.dart';
import '../widgets/app_drawer.dart';

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});
  @override
  Widget build(BuildContext context) {
    final user = FirebaseAuth.instance.currentUser;
    return Scaffold(
      drawer: const AppDrawer(activeRoute: 'profile'),
      appBar: AppBar(leading: Builder(builder: (ctx) => IconButton(icon: const Icon(Icons.menu_rounded), onPressed: () => Scaffold.of(ctx).openDrawer())), title: const Text('Profile', style: TextStyle(fontFamily: LearningAlliedTokens.fontDisplay, fontWeight: FontWeight.w700)), backgroundColor: Colors.transparent, elevation: 0),
      body: ListView(padding: const EdgeInsets.all(16), children: [
        Container(padding: const EdgeInsets.all(16), decoration: BoxDecoration(color: LearningAlliedTokens.bgCard, borderRadius: BorderRadius.circular(LearningAlliedTokens.radiusXl), border: Border.all(color: Colors.white.withOpacity(0.06))), child: Row(children: [
          CircleAvatar(radius: 28, backgroundColor: LearningAlliedTokens.accent, backgroundImage: user?.photoURL != null ? NetworkImage(user!.photoURL!) : null, child: user?.photoURL == null ? Text((user?.displayName ?? 'G')[0].toUpperCase(), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700)) : null),
          const SizedBox(width: 14),
          Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(user?.displayName ?? user?.email ?? 'Guest', style: const TextStyle(fontWeight: FontWeight.w700, color: LearningAlliedTokens.textPrimary)), Text(user?.email ?? '', style: const TextStyle(color: LearningAlliedTokens.textMuted, fontSize: 11)), const SizedBox(height: 4), Container(padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4), decoration: BoxDecoration(color: LearningAlliedTokens.green.withOpacity(0.12), borderRadius: BorderRadius.circular(20)), child: const Text('Free Plan', style: TextStyle(color: LearningAlliedTokens.green, fontSize: 10, fontWeight: FontWeight.w700)))])),
        ])),
        const SizedBox(height: 16),
        _tile(Icons.settings_rounded, 'Settings', 'AI memory, notifications, theme'),
        _tile(Icons.card_giftcard_rounded, 'Refer & Earn', 'Share Learning Allied, earn Pro'),
        _tile(Icons.workspace_premium_rounded, 'Subscription', 'Upgrade to Pro'),
        const SizedBox(height: 16),
        SizedBox(width: double.infinity, child: OutlinedButton.icon(onPressed: () async { await FirebaseAuth.instance.signOut(); }, icon: const Icon(Icons.logout_rounded, size: 16), label: const Text('Sign out'), style: OutlinedButton.styleFrom(foregroundColor: LearningAlliedTokens.red, side: BorderSide(color: LearningAlliedTokens.red.withOpacity(0.25)), padding: const EdgeInsets.symmetric(vertical: 14), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(LearningAlliedTokens.radiusMd))))),
      ]),
    );
  }
  static Widget _tile(IconData icon, String title, String subtitle) {
    return Container(margin: const EdgeInsets.only(bottom: 8), padding: const EdgeInsets.all(14), decoration: BoxDecoration(color: LearningAlliedTokens.bgCard, borderRadius: BorderRadius.circular(LearningAlliedTokens.radiusLg), border: Border.all(color: Colors.white.withOpacity(0.06))), child: Row(children: [Container(width: 36, height: 36, decoration: BoxDecoration(color: LearningAlliedTokens.bgElevated, borderRadius: BorderRadius.circular(10)), child: Icon(icon, size: 18, color: LearningAlliedTokens.textMuted)), const SizedBox(width: 12), Expanded(child: Column(crossAxisAlignment: CrossAxisAlignment.start, children: [Text(title, style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, color: LearningAlliedTokens.textPrimary)), Text(subtitle, style: const TextStyle(color: LearningAlliedTokens.textMuted, fontSize: 11))])), const Icon(Icons.arrow_forward_ios_rounded, size: 14, color: LearningAlliedTokens.textMuted)]));
  }
}
