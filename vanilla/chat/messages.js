/**
 * Message shapes shared by the chat controller and its view modules.
 * The teaching reply contract itself lives in lib/learning/types.ts.
 */

export const WELCOME_TEXT =
  "Hello! I am your Learning Allied tutor. Ask me to explain a concept, work through a problem, or check your reasoning. I will keep simple questions short and go deeper when a topic needs it.";

export const STARTERS = [
  "Why is the current the same everywhere in a series circuit?",
  "Help me understand photosynthesis instead of memorising it.",
  "Give me a worked example of a quadratic with two real roots.",
];

export const VERDICT_META = {
  correct: { label: "Correct", className: "verdict-good" },
  partially_correct: { label: "Almost there", className: "verdict-partial" },
  incorrect: { label: "Not yet", className: "verdict-bad" },
  unknown: { label: "Not evaluated", className: "verdict-unknown" },
};

export const NEW_CHAT_TITLE = "New study session";

export function makeId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `m${Date.now()}${Math.random().toString(36).slice(2, 8)}`;
}

export function welcomeMessage() {
  return {
    id: "welcome",
    role: "assistant",
    content: WELCOME_TEXT,
    reply: {
      kind: "short",
      title: null,
      directAnswer: WELCOME_TEXT,
      sections: [],
      example: null,
      check: null,
      visual: null,
      personalization: null,
      advanced: null,
      level: "intermediate",
      source: "system",
    },
  };
}

export function fallbackReply(text, source, retry = false) {
  return {
    kind: "fallback",
    title: null,
    directAnswer: text,
    sections: [],
    example: null,
    check: null,
    visual: null,
    personalization: null,
    advanced: null,
    level: "intermediate",
    source,
    ...(retry ? { retry: true } : {}),
  };
}

export function option(value, label) {
  const node = document.createElement("option");
  node.value = value;
  node.textContent = label;
  return node;
}

/** Plain-text form of a teaching reply, used by the copy action. */
export function replyToText(message) {
  const reply = message?.reply;
  if (!reply) return String(message?.content || "");
  const parts = [reply.directAnswer || message.content || ""];
  for (const section of reply.sections || []) {
    if (section.heading) parts.push(section.heading);
    if (section.body) parts.push(section.body);
  }
  if (reply.example) {
    if (reply.example.problem) parts.push(reply.example.problem);
    for (const step of reply.example.steps || []) parts.push(step);
    if (reply.example.answer) parts.push(`Answer: ${reply.example.answer}`);
  }
  return parts.filter(Boolean).join("\n\n");
}
