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

/**
 * Safely parses inline markdown into DOM nodes without innerHTML:
 * - Bold: **text**
 * - Italic: *text* or _text_
 * - Inline code: `code`
 * - Inline math: $formula$
 * - Links: [label](https://...)
 * - Citations: [1], [2]
 */
export function renderInlineMarkdown(parent, text) {
  if (!text) return;
  const raw = String(text);

  // Pattern matches: code, math, bold, italic, markdown link, citation [n]
  const tokenRegex = /(`[^`]+`|\$[^\$\n]+\$|\*\*[^*]+\*\*|\*[^*]+\*|\[(?:cite-)?\d+\]|\[([^\]]+)\]\((https?:\/\/[^\s)]+)\))/g;
  let lastIndex = 0;
  let match;

  while ((match = tokenRegex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      parent.appendChild(document.createTextNode(raw.slice(lastIndex, match.index)));
    }

    const token = match[0];
    if (token.startsWith("`") && token.endsWith("`")) {
      const codeNode = el("code", "learn-inline-code", token.slice(1, -1));
      parent.appendChild(codeNode);
    } else if (token.startsWith("$") && token.endsWith("$")) {
      const mathNode = el("span", "learn-inline-math", token.slice(1, -1));
      parent.appendChild(mathNode);
    } else if (token.startsWith("**") && token.endsWith("**")) {
      const strongNode = el("strong", null, token.slice(2, -2));
      parent.appendChild(strongNode);
    } else if (token.startsWith("*") && token.endsWith("*")) {
      const emNode = el("em", null, token.slice(1, -1));
      parent.appendChild(emNode);
    } else if (token.startsWith("[") && match[2] && match[3]) {
      const a = el("a", "learn-link", match[2]);
      a.href = match[3];
      a.target = "_blank";
      a.rel = "noopener noreferrer";
      parent.appendChild(a);
    } else if (/^\[(?:cite-)?\d+\]$/.test(token)) {
      const numMatch = token.match(/\d+/);
      const num = numMatch ? numMatch[0] : "";
      const sup = el("sup", "learn-cite-ref");
      const a = el("a", null, `[${num}]`);
      a.href = `#cite-${num}`;
      a.title = `View source reference [${num}]`;
      sup.appendChild(a);
      parent.appendChild(sup);
    } else {
      parent.appendChild(document.createTextNode(token));
    }

    lastIndex = tokenRegex.lastIndex;
  }

  if (lastIndex < raw.length) {
    parent.appendChild(document.createTextNode(raw.slice(lastIndex)));
  }
}

/**
 * Intelligent structured content parser and DOM renderer.
 * Formats code blocks, tables, math blocks, lists, blockquotes, and paragraphs.
 */
export function renderRichContent(container, contentText, { isLead = false } = {}) {
  if (!contentText) return;
  const raw = String(contentText).trim();
  if (!raw) return;

  // 1) Split by fenced code blocks: ```lang ... ```
  const codeBlockRegex = /```([a-zA-Z0-9_-]*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(raw)) !== null) {
    if (match.index > lastIndex) {
      renderTextBlocks(container, raw.slice(lastIndex, match.index), isLead);
    }

    const lang = (match[1] || "code").trim().toLowerCase();
    const codeContent = match[2];

    const block = el("div", "learn-code-block");
    const head = el("div", "learn-code-head");
    head.appendChild(el("span", "learn-code-lang", lang || "code"));

    const copyBtn = el("button", "learn-code-copy", "Copy");
    copyBtn.type = "button";
    copyBtn.setAttribute("aria-label", "Copy code");
    copyBtn.addEventListener("click", () => {
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(codeContent).then(() => {
          copyBtn.textContent = "Copied!";
          copyBtn.classList.add("is-copied");
          setTimeout(() => {
            copyBtn.textContent = "Copy";
            copyBtn.classList.remove("is-copied");
          }, 1800);
        });
      }
    });
    head.appendChild(copyBtn);
    block.appendChild(head);

    const pre = el("pre", "learn-code-pre");
    const code = el("code", `learn-code-snippet language-${lang}`, codeContent);
    pre.appendChild(code);
    block.appendChild(pre);

    container.appendChild(block);
    lastIndex = codeBlockRegex.lastIndex;
  }

  if (lastIndex < raw.length) {
    renderTextBlocks(container, raw.slice(lastIndex), isLead);
  }
}

function renderTextBlocks(container, text, isLead) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    // Table check: | col1 | col2 |
    if (isMarkdownTable(block)) {
      container.appendChild(renderTable(block));
      continue;
    }

    // Display / Block equation check: $$ ... $$
    if (block.startsWith("$$") && block.endsWith("$$")) {
      const eq = el("div", "learn-math-block");
      const code = el("code", "learn-math-code", block.slice(2, -2).trim());
      eq.appendChild(code);
      container.appendChild(eq);
      continue;
    }

    // Numbered step list: 1. ... 2. ...
    if (/^\d+\.\s+/m.test(block)) {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const isAllSteps = lines.every((l) => /^\d+\.\s+/.test(l));
      if (isAllSteps) {
        const ol = el("ol", "learn-steps");
        for (const line of lines) {
          const itemText = line.replace(/^\d+\.\s+/, "");
          const li = el("li", null);
          renderInlineMarkdown(li, itemText);
          ol.appendChild(li);
        }
        container.appendChild(ol);
        continue;
      }
    }

    // Unordered bullet list: - ... or * ...
    if (/^[-*•]\s+/m.test(block)) {
      const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);
      const isAllBullets = lines.every((l) => /^[-*•]\s+/.test(l));
      if (isAllBullets) {
        const ul = el("ul", "learn-list");
        for (const line of lines) {
          const itemText = line.replace(/^[-*•]\s+/, "");
          const li = el("li", null);
          renderInlineMarkdown(li, itemText);
          ul.appendChild(li);
        }
        container.appendChild(ul);
        continue;
      }
    }

    // Blockquote: > ...
    if (block.startsWith(">")) {
      const lines = block.split("\n").map((l) => l.replace(/^>\s?/, "").trim()).filter(Boolean);
      const bq = el("blockquote", "learn-blockquote");
      renderInlineMarkdown(bq, lines.join(" "));
      container.appendChild(bq);
      continue;
    }

    // Headings: ### Heading
    if (block.startsWith("### ")) {
      const h5 = el("h5", "learn-subheading");
      renderInlineMarkdown(h5, block.slice(4).trim());
      container.appendChild(h5);
      continue;
    }

    // Standard paragraph
    const pClass = isLead && i === 0 ? "learn-lead" : null;
    const p = el("p", pClass);
    renderInlineMarkdown(p, block);
    container.appendChild(p);
  }
}

function isMarkdownTable(text) {
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines.length < 2) return false;
  return lines[0].includes("|") && /^\|?[\s-:]+\|[\s-:|]+$/.test(lines[1]);
}

function renderTable(tableText) {
  const lines = tableText.split("\n").map((l) => l.trim()).filter(Boolean);
  const wrap = el("div", "learn-table-wrap");
  const table = el("table", "learn-table");

  const parseRow = (line) => {
    return line
      .replace(/^\|/, "")
      .replace(/\|$/, "")
      .split("|")
      .map((c) => c.trim());
  };

  if (lines.length > 0) {
    const thead = el("thead", null);
    const headerRow = el("tr", null);
    const headers = parseRow(lines[0]);
    for (const h of headers) {
      const th = el("th", null);
      renderInlineMarkdown(th, h);
      headerRow.appendChild(th);
    }
    thead.appendChild(headerRow);
    table.appendChild(thead);
  }

  const tbody = el("tbody", null);
  for (let i = 2; i < lines.length; i++) {
    const cells = parseRow(lines[i]);
    const tr = el("tr", null);
    for (const cell of cells) {
      const td = el("td", null);
      renderInlineMarkdown(td, cell);
      tr.appendChild(td);
    }
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);
  wrap.appendChild(table);
  return wrap;
}

/**
 * Renders verified research sources and citations.
 */
export function renderCitations(citations) {
  if (!Array.isArray(citations) || citations.length === 0) return null;

  const box = el("div", "learn-citations");
  const head = el("div", "learn-citations-head");
  head.appendChild(el("span", "learn-badge learn-badge--accent", "Verified Sources"));
  head.appendChild(
    el("span", "learn-citations-meta", `${citations.length} authoritative reference${citations.length === 1 ? "" : "s"}`)
  );
  box.appendChild(head);

  const grid = el("div", "learn-citations-grid");
  citations.forEach((c, i) => {
    const refNum = c.refNumber || i + 1;
    const card = el("a", "learn-citation-card");
    card.id = `cite-${refNum}`;
    card.href = c.url || "#";
    card.target = "_blank";
    card.rel = "noopener noreferrer";

    const badge = el("span", "learn-citation-badge", `[${refNum}]`);
    card.appendChild(badge);

    const body = el("div", "learn-citation-body");
    const title = el("span", "learn-citation-title", c.title || "External Source");
    body.appendChild(title);

    if (c.snippet) {
      const snippet = el("span", "learn-citation-snippet", c.snippet);
      body.appendChild(snippet);
    }

    const host = el("span", "learn-citation-source", `${c.sourceLabel || "source"} ↗`);
    body.appendChild(host);

    card.appendChild(body);
    grid.appendChild(card);
  });

  box.appendChild(grid);
  return box;
}

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
    renderInlineMarkdown(ki, content.keyIdea);
    wrap.appendChild(ki);
  }

  const exampleBlock = renderExample(content.example);
  if (content.exampleFirst && exampleBlock) wrap.appendChild(exampleBlock);

  if (content.directAnswer) {
    renderRichContent(wrap, content.directAnswer, { isLead: true });
  }

  for (const section of content.sections || []) {
    const block = el("section", "learn-section");
    block.appendChild(el("h4", null, section.heading));
    renderRichContent(block, section.body);
    if (section.equation) {
      const pre = el("pre", "learn-equation");
      pre.appendChild(el("code", null, section.equation));
      block.appendChild(pre);
    }
    wrap.appendChild(block);
  }

  if (!content.exampleFirst && exampleBlock) wrap.appendChild(exampleBlock);

  if (content.citations && content.citations.length) {
    const citeBlock = renderCitations(content.citations);
    if (citeBlock) wrap.appendChild(citeBlock);
  }

  if (content.advanced) {
    const details = el("details", "learn-advanced");
    details.appendChild(
      el("summary", null, content.advanced.heading || "Go deeper")
    );
    renderRichContent(details, content.advanced.body);
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
    const p = el("p", "learn-example-problem");
    renderInlineMarkdown(p, example.problem);
    block.appendChild(p);
  }
  if (Array.isArray(example.steps) && example.steps.length) {
    const steps = el("ol", "learn-steps");
    for (const step of example.steps) {
      const li = el("li", null);
      renderInlineMarkdown(li, step);
      steps.appendChild(li);
    }
    block.appendChild(steps);
  }
  if (example.answer) {
    const answer = el("p", "learn-answer");
    answer.appendChild(el("strong", null, "Answer:"));
    answer.appendChild(document.createTextNode(" "));
    renderInlineMarkdown(answer, String(example.answer));
    block.appendChild(answer);
  }
  return block;
}
