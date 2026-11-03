/**
 * Lesson content renderers shared by the chat bubbles and the Learning Hub.
 * The markup mirrors components/learning/LessonBlocks.tsx so both surfaces use
 * the same CSS contract.
 */

import { el } from "./dom.js";

export const LEVEL_LABEL = {
  foundation: "Foundation",
  intermediate: "Intermediate",
  advanced: "Advanced",
};

export function renderTeaching(content) {
  const wrap = el("div", "learn-teaching");

  const head = el("div", "learn-teaching-head");
  if (content.title) head.appendChild(el("h3", "learn-title", content.title));
  const tags = el("div", "learn-teaching-tags");
  if (content.teachingStrategy) {
    tags.appendChild(
      el("span", "learn-badge learn-badge--accent", content.teachingStrategy.label)
    );
  }
  if (content.level) {
    tags.appendChild(
      el(
        "span",
        "learn-badge learn-badge--soft",
        LEVEL_LABEL[content.level] || content.level
      )
    );
  }
  if (content.source === "authored" && content.reviewed !== false) {
    tags.appendChild(el("span", "learn-badge learn-badge--ok", "Reviewed lesson"));
  }
  head.appendChild(tags);
  wrap.appendChild(head);

  if (content.personalization) {
    wrap.appendChild(el("p", "learn-personal", content.personalization));
  }
  if (content.fallbackNote) {
    wrap.appendChild(
      el("p", "learn-callout learn-callout--warn", content.fallbackNote)
    );
  }
  if (content.generatedNotice) {
    wrap.appendChild(
      el("p", "learn-callout learn-callout--soft", content.generatedNotice)
    );
  }

  if (content.crossSubjectLink) {
    const cs = el("div", "learn-cross-subject");
    cs.appendChild(
      el("span", "learn-badge learn-badge--soft", `Connected subject: ${content.crossSubjectLink.targetSubject}`)
    );
    cs.appendChild(el("p", null, content.crossSubjectLink.rationale));
    wrap.appendChild(cs);
  }

  if (content.keyIdea) {
    const ki = el("div", "learn-key-idea");
    ki.appendChild(el("strong", null, "Key Takeaway: "));
    ki.appendChild(document.createTextNode(content.keyIdea));
    wrap.appendChild(ki);
  }

  const exampleBlock = renderExample(content.example);
  if (content.exampleFirst && exampleBlock) wrap.appendChild(exampleBlock);

  if (content.directAnswer) {
    wrap.appendChild(el("p", "learn-lead", content.directAnswer));
  }

  for (const section of content.sections || []) {
    const block = el("section", "learn-section");
    block.appendChild(el("h4", null, section.heading));
    block.appendChild(el("p", null, section.body));
    if (section.equation) {
      const pre = el("pre", "learn-equation");
      pre.appendChild(el("code", null, section.equation));
      block.appendChild(pre);
    }
    wrap.appendChild(block);
  }

  if (!content.exampleFirst && exampleBlock) wrap.appendChild(exampleBlock);

  if (content.advanced) {
    const details = el("details", "learn-advanced");
    details.appendChild(
      el("summary", null, content.advanced.heading || "Go deeper")
    );
    details.appendChild(el("p", null, content.advanced.body));
    wrap.appendChild(details);
  }

  return wrap;
}

export function renderExample(example) {
  if (!example) return null;

  const block = el("div", "learn-example");
  const head = el("div", "learn-example-head");
  head.appendChild(el("span", "learn-badge learn-badge--soft", "Worked example"));
  block.appendChild(head);
  if (example.problem) {
    block.appendChild(el("p", "learn-example-problem", example.problem));
  }
  if (Array.isArray(example.steps) && example.steps.length) {
    const steps = el("ol", "learn-steps");
    for (const step of example.steps) steps.appendChild(el("li", null, step));
    block.appendChild(steps);
  }
  if (example.answer) {
    const answer = el("p", "learn-answer");
    answer.appendChild(el("strong", null, "Answer:"));
    answer.appendChild(document.createTextNode(` ${example.answer}`));
    block.appendChild(answer);
  }
  return block;
}
