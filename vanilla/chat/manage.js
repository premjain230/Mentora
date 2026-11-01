/**
 * Conversation maintenance calls. Messages are create-only in Firestore rules,
 * so deletion has to go through the owner-verified server endpoint.
 */

export async function deleteChatSession(getToken, chatId) {
  let token;
  try {
    token = await getToken();
  } catch (_) {
    throw new Error("Your sign-in session expired. Please sign in again.");
  }

  let response;
  try {
    response = await fetch("/api/chat/manage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ action: "delete_chat", chatId }),
    });
  } catch (_) {
    throw new Error("Could not reach the server. Check your connection and retry.");
  }

  let data = null;
  try {
    data = await response.json();
  } catch (_) {
    data = null;
  }

  if (!response.ok) {
    throw new Error(
      typeof data?.error === "string"
        ? data.error
        : "The conversation could not be deleted. Please retry."
    );
  }

  return true;
}
