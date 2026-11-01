// api/chat/manage.js
// Owner-verified conversation maintenance for AI Chat.
//
// Firestore rules make `users/{uid}/chats/{chatId}/messages/*` create-only, so a
// browser cannot delete a conversation and leave orphaned messages behind.
// Deleting the parent chat document is also a client capability, which would
// strand its subcollection. This endpoint performs the cascade with the Admin
// SDK after verifying the caller's ID token.

const { applyCors, rateLimit, readJsonBody, sendError } = require("./_shared");
const { verifyIdToken, firestore } = require("./_admin");

const CHAT_ID = /^[A-Za-z0-9_-]{1,120}$/;

module.exports = async function handler(req, res) {
  if (!applyCors(req, res, ["POST", "OPTIONS"])) return;

  if (req.method !== "POST") {
    res.setHeader("Allow", "POST, OPTIONS");
    return res.status(405).json({ error: "Method not allowed." });
  }

  if (!rateLimit(req, res, { name: "chat-manage", limit: 30 })) return;

  const authHeader = req.headers.authorization || "";
  const token = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  const decoded = await verifyIdToken(token);
  if (!decoded || !decoded.uid) {
    return res.status(401).json({ error: "Not authenticated. Please sign in and try again." });
  }

  let body;
  try {
    body = await readJsonBody(req);
  } catch (err) {
    return sendError(req, res, err, "Invalid JSON body.");
  }

  const action = typeof body.action === "string" ? body.action.trim() : "";
  const chatId = typeof body.chatId === "string" ? body.chatId.trim() : "";

  if (action !== "delete_chat") {
    return res.status(400).json({ error: "Unknown action." });
  }
  if (!CHAT_ID.test(chatId)) {
    return res.status(400).json({ error: "Invalid conversation id." });
  }

  // The path is built from the verified token, never from client input, so one
  // user can never address another user's conversation.
  const db = firestore();
  const chatRef = db.doc(`users/${decoded.uid}/chats/${chatId}`);

  try {
    const snapshot = await chatRef.get();
    if (!snapshot.exists) {
      return res.status(404).json({ error: "That conversation no longer exists." });
    }

    await db.recursiveDelete(chatRef);
    return res.status(200).json({ ok: true, deleted: chatId });
  } catch (err) {
    return sendError(req, res, err, "The conversation could not be deleted. Please retry.");
  }
};
