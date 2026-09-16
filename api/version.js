// Lightweight app-version endpoint used by the mobile app's UpdateService.
//
// Compares integer version codes (build numbers). These can be overridden with
// Vercel env vars (useful once the app is versioned further):
//   AQUILA_LATEST_VERSION  e.g. "2"
//   AQUILA_MINIMUM_VERSION e.g. "1"
//   AQUILA_DOWNLOAD_URL    Play Store / direct APK release URL
//   AQUILA_UPDATE_NOTES    Short changelog
//
// Defaults keep the in-app updater working out of the box: the app is on
// versionCode 2 and downloads the direct APK asset from the GitHub release.
// Featured announcements surfaced inside the app's "Update / What's New"
// section so every user of an installed build sees new features without
// shipping an app update. The app keeps per-announcement read/seen state
// locally (shared_preferences); the web mirrors it via localStorage.
const DEFAULT_ANNOUNCEMENTS = [
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
    return res.status(200).json({
      latestVersion: process.env.AQUILA_LATEST_VERSION ?? "9",
      minimumVersion: process.env.AQUILA_MINIMUM_VERSION ?? "1",
      downloadUrl:
        process.env.AQUILA_DOWNLOAD_URL ??
        "https://github.com/premjain230/aquila-mobile/releases/download/v1.4.1/app-release.apk",
      notes:
        process.env.AQUILA_UPDATE_NOTES ??
        "What's new in v1.4.1: ship-ready polish — fixed syllabus upload permissions (added token refresh + Storage rules, real file picker + Storage upload on mobile, user-isolated paths), made website fully responsive on phones (320-430px, tablets, safe areas, 44px touch targets, fixed topbar overflow, experience mock stack), polished mobile UX (Android back handling, live theme toggle, quiz overflow fix, syllabus Storage, study-session lifecycle). Plus all v1.4.0 parity fixes.",
      announcements:
        process.env.AQUILA_ANNOUNCEMENTS
          ? JSON.parse(process.env.AQUILA_ANNOUNCEMENTS)
          : DEFAULT_ANNOUNCEMENTS,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: "Server error" });
  }
}