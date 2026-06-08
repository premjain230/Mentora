const { applyCors, rateLimit } = require("./_shared");

function required(name) {
  const value = process.env[name];
  if (!value) {
    const err = new Error(`${name} is not configured.`);
    err.statusCode = 500;
    throw err;
  }
  return value;
}

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["GET", "OPTIONS"])) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!rateLimit(req, res, { name: "firebase-config", limit: 60 })) return;

  try {
    return res.status(200).json({
      apiKey: required("FIREBASE_API_KEY"),
      authDomain: required("FIREBASE_AUTH_DOMAIN"),
      projectId: required("FIREBASE_PROJECT_ID"),
      storageBucket: required("FIREBASE_STORAGE_BUCKET"),
      messagingSenderId: required("FIREBASE_MESSAGING_SENDER_ID"),
      appId: required("FIREBASE_APP_ID"),
    });
  } catch (err) {
    console.error(JSON.stringify({ level: "error", path: req.url, message: err.message }));
    return res.status(500).json({ error: "Firebase configuration is not available." });
  }
};
