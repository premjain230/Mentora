/**
 * Message shapes shared by the chat controller and its view modules.
 * The teaching reply contract itself lives in lib/learning/types.ts.
 */

export const EMPTY_ACTIONS = [
  {
    icon: "bulb",
    label: "Explain a concept",
    hint: "Start with a topic you want broken down",
    prompt: "Explain this concept: ",
  },
  {
    icon: "layers",
    label: "Help me understand a difficult topic",
    hint: "Bring the part that has not clicked yet",
    prompt: "Help me understand this topic: ",
  },
  {
    icon: "message",
    label: "Ask a question",
    hint: "Get a direct answer from your tutor",
    prompt: "",
  },
  {
    icon: "target",
    label: "Quiz me on a topic",
    hint: "Practise one question at a time",
    prompt: "Quiz me on ",
  },
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
