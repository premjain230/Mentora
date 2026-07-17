const { applyCors, rateLimit } = require("./_shared");

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["GET", "OPTIONS"])) return;

  if (req.method !== "GET") {
    res.setHeader("Allow", "GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!rateLimit(req, res, { name: "health", limit: 60 })) return;

  return res.status(200).json({
    ok: true,
    service: "mentora-ai-api",
    timestamp: new Date().toISOString(),
    providers: {
      openai: Boolean(process.env.OPENAI_API_KEY),
      gemini: Boolean(process.env.GEMINI_API_KEY),
    },
  });
};
