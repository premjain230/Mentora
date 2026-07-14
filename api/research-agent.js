const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");

// Note: In Vercel serverless, this in-memory store is per-instance and ephemeral.
// For production, findings should be persisted to Firestore or a database.
const FINDINGS_STORE = [];

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["POST", "GET", "OPTIONS"])) return;

  if (req.method === "GET") {
    return res.status(200).json({
      findings: FINDINGS_STORE.slice(-20),
      totalFindings: FINDINGS_STORE.length
    });
  }

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, GET, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!rateLimit(req, res, { name: "research-agent", limit: 20 })) return;

  try {
    const body = await readJsonBody(req);
    const { action, finding } = body;

    if (action === "submit" && finding) {
      const entry = {
        id: `finding-${Date.now()}`,
        ...finding,
        submittedAt: new Date().toISOString(),
        qualityRating: rateEvidence(finding)
      };
      FINDINGS_STORE.push(entry);
      return res.status(200).json({ success: true, finding: entry });
    }

    if (action === "assess" && body.claim) {
      const claim = body.claim;
      const relevant = FINDINGS_STORE.filter(f =>
        f.keyClaim?.toLowerCase().includes(claim.toLowerCase())
      );
      return res.status(200).json({
        claim,
        findingCount: relevant.length,
        consensus: relevant.length > 0 ? "Evidence found" : "No evidence found",
        findings: relevant.slice(0, 10)
      });
    }

    if (action === "summary") {
      return res.status(200).json({
        totalFindings: FINDINGS_STORE.length,
        recentFindings: FINDINGS_STORE.slice(-5).map(f => ({
          title: f.title,
          quality: f.qualityRating,
          level: f.evidenceLevel
        }))
      });
    }

    return res.status(400).json({ error: "Invalid action. Use: submit, assess, summary" });
  } catch (err) {
    return sendError(req, res, err, "Research agent error.");
  }
};

function rateEvidence(finding) {
  let rating = 50;
  if (finding.evidenceLevel === "META_ANALYSIS") rating += 40;
  else if (finding.evidenceLevel === "RCT") rating += 30;
  else if (finding.evidenceLevel === "QUASI_EXPERIMENTAL") rating += 20;
  else if (finding.evidenceLevel === "CORRELATIONAL") rating += 10;
  if (finding.sampleSize > 1000) rating += 10;
  if (finding.effectSize > 0.5) rating += 10;
  if (finding.reproducible) rating += 10;
  return Math.min(100, rating);
}
