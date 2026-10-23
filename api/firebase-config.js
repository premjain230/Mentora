// Learning Allied — Firebase client config endpoint.
// Serves Firebase client-side configuration (API key, auth domain, project ID, etc.).
// These values are meant to be public — they identify the Firebase project,
// not secret credentials.
//
// Usage (client):
//   const response = await fetch("/api/firebase-config");
//   const config = await response.json();
//   // Pass config to initializeApp()
//
// Env overrides (Vercel):
//   FIREBASE_API_KEY, FIREBASE_APP_ID, FIREBASE_AUTH_DOMAIN,
//   FIREBASE_MESSAGING_SENDER_ID, FIREBASE_PROJECT_ID, FIREBASE_STORAGE_BUCKET

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const config = {
      apiKey: process.env.FIREBASE_API_KEY,
      appId: process.env.FIREBASE_APP_ID,
      authDomain: process.env.FIREBASE_AUTH_DOMAIN,
      messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
      projectId: process.env.FIREBASE_PROJECT_ID,
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    };

    // Validate required fields are present
    if (!config.apiKey || !config.projectId || !config.authDomain) {
      console.error("Firebase config missing required fields:", config);
      return res.status(500).json({ error: "Firebase configuration incomplete" });
    }

    return res.status(200).json(config);
  } catch (err) {
    console.error("Firebase config error:", err);
    return res.status(500).json({ error: "Server error" });
  }
}
