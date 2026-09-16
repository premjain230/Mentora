const { applyCors } = require("./_shared");

const DEFAULTS = {
  authDomain: "mentora-c6dca.firebaseapp.com",
  projectId: "mentora-c6dca",
  storageBucket: "mentora-c6dca.firebasestorage.app",
  messagingSenderId: "",
  appId: "",
  measurementId: "",
};

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["GET", "OPTIONS"])) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const fullConfig = process.env.FIREBASE_CONFIG;
  if (fullConfig) {
    try {
      const parsed = JSON.parse(fullConfig);
      return res.status(200).json(parsed);
    } catch (e) {
      console.error("FIREBASE_CONFIG env var contains invalid JSON:", e.message);
    }
  }

  const config = {
    apiKey: process.env.FIREBASE_API_KEY || "",
    authDomain: process.env.FIREBASE_AUTH_DOMAIN || DEFAULTS.authDomain,
    projectId: process.env.FIREBASE_PROJECT_ID || DEFAULTS.projectId,
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET || DEFAULTS.storageBucket,
    messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID || DEFAULTS.messagingSenderId,
    appId: process.env.FIREBASE_APP_ID || DEFAULTS.appId,
    measurementId: process.env.FIREBASE_MEASUREMENT_ID || DEFAULTS.measurementId,
  };

  if (!config.apiKey) {
    return res.status(500).json({
      error: "Firebase configuration is incomplete.",
      hint: "Set FIREBASE_API_KEY (and optionally FIREBASE_CONFIG as full JSON) in Vercel Environment Variables.",
    });
  }

  res.status(200).json(config);
};
