// Learning Allied — app-version endpoint used by mobile UpdateService.
// Rebranded from Aquila (keeps AQUILA_ env fallback for zero-downtime migration).
// Env overrides (Vercel):
//   LEARNING_ALLIED_LATEST_VERSION / AQUILA_LATEST_VERSION  e.g. "10"
//   LEARNING_ALLIED_MINIMUM_VERSION / AQUILA_MINIMUM_VERSION e.g. "1"
//   LEARNING_ALLIED_DOWNLOAD_URL    Play Store / direct APK release URL
//   LEARNING_ALLIED_UPDATE_NOTES    Short changelog
//
// Defaults: latest build 10 (v1.1.0 Learning Allied) downloads from Mentora release.
// Featured announcements surfaced in app's "Update / What's New" — per-announcement
// read/seen state stored locally (shared_preferences); web mirrors via localStorage.
const DEFAULT_ANNOUNCEMENTS = [
  {
    id: "learning-allied-rebrand",
    type: "feature",
    title: "Welcome to Learning Allied",
    description:
      "Aquila is now Learning Allied — same progress, same syllabus, ship-ready polish: unified brand, premium dark/light themes, reliable auth, responsive web + mobile as one product.",
    icon: "sparkles",
    releaseDate: "2026-09-24",
    url: "https://aquila-sand.vercel.app/",
    appPath: null,
  },
  {
    id: "study-session",
    type: "feature",
    title: "AI Study Sessions",
    description:
      "Focus on any topic with a guided study session — goals, key concepts, practice questions and a timer. Start one from the app or website.",
    icon: "timer",
    releaseDate: "2026-08-10",
    url: "https://aquila-sand.vercel.app/study-session.html",
    appPath: null, // deep-link target in-app; null falls back to opening url
  },
];

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const latest = process.env.LEARNING_ALLIED_LATEST_VERSION ?? process.env.AQUILA_LATEST_VERSION ?? "10";
    const minimum = process.env.LEARNING_ALLIED_MINIMUM_VERSION ?? process.env.AQUILA_MINIMUM_VERSION ?? "1";
    const dlUrl = process.env.LEARNING_ALLIED_DOWNLOAD_URL ?? process.env.AQUILA_DOWNLOAD_URL ?? "https://github.com/premjain230/Mentora/releases/download/v1.1.0/app-release.apk";
    const notesDefault =
      "What's new in v1.1.0 (Learning Allied): complete rebrand Aquila → Learning Allied, ship-ready polish — unified web+mobile design system, premium dark/light themes with no flash, reliable theme persistence, hardened auth/session, Firestore safety, responsive polish (320-430px phones, tablets, safe areas, 44px targets), navigation/a11y fixes, update-available flow, and updated mobile build (1.1.0+10).";
    return res.status(200).json({
      latestVersion: latest,
      minimumVersion: minimum,
      downloadUrl: dlUrl,
      notes: process.env.LEARNING_ALLIED_UPDATE_NOTES ?? process.env.AQUILA_UPDATE_NOTES ?? notesDefault,
      announcements:
        process.env.LEARNING_ALLIED_ANNOUNCEMENTS ?? process.env.AQUILA_ANNOUNCEMENTS
          ? JSON.parse(process.env.LEARNING_ALLIED_ANNOUNCEMENTS ?? process.env.AQUILA_ANNOUNCEMENTS)
          : DEFAULT_ANNOUNCEMENTS,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}