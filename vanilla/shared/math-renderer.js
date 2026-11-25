/**
 * Unified KaTeX math renderer for Learning Allied.
 * Supports:
 * - Block math: $$...$$, \[...\], and \begin{...}...\end{...}
 * - Inline math: $...$ and \(...\)
 * - Bare LaTeX expressions (e.g., W = \vec{F} \cdot \vec{d} = F \cdot d \cdot \cos\theta)
 * - Streaming / incomplete math delimiters without raw LaTeX flicker
 * - Currency protection ($100, $5.99) and code preservation
 */

import katex from "katex";

const LATEX_CMD_LIST = [
  "frac", "dfrac", "tfrac", "cfrac", "sqrt", "vec", "hat", "bar", "dot", "ddot",
  "tilde", "overline", "underline", "overbrace", "underbrace",
  "cdot", "times", "div", "pm", "mp", "ast", "star", "circ", "bullet",
  "leq", "le", "geq", "ge", "neq", "ne", "approx", "equiv", "sim", "simeq", "cong", "propto",
  "infty", "partial", "nabla", "forall", "exists", "nexists", "in", "notin", "ni",
  "subset", "subseteq", "supset", "supseteq", "cup", "cap", "setminus", "emptyset",
  "rightarrow", "leftarrow", "leftrightarrow", "Rightarrow", "Leftarrow", "Leftrightarrow", "to", "mapsto", "implies", "iff",
  "int", "iint", "iiint", "oint", "sum", "prod", "coprod", "lim", "limsup", "liminf", "sup", "inf", "max", "min",
  "sin", "cos", "tan", "cot", "sec", "csc", "arcsin", "arccos", "arctan", "sinh", "cosh", "tanh",
  "log", "ln", "lg", "exp", "det", "dim", "ker", "deg", "gcd", "arg",
  "alpha", "beta", "gamma", "delta", "epsilon", "varepsilon", "zeta", "eta", "theta", "vartheta",
  "iota", "kappa", "lambda", "mu", "nu", "xi", "pi", "varpi", "rho", "varrho", "sigma", "varsigma",
  "tau", "upsilon", "phi", "varphi", "chi", "psi", "omega",
  "Gamma", "Delta", "Theta", "Lambda", "Xi", "Pi", "Sigma", "Upsilon", "Phi", "Psi", "Omega",
  "mathbf", "mathrm", "mathit", "mathcal", "mathbb", "mathsf", "mathtt", "boldsymbol", "text", "textbf", "textit",
  "left", "right", "big", "Big", "bigg", "Bigg", "binom", "tbinom", "dbinom",
  "begin", "end", "quad", "qquad", "angle", "triangle", "perp", "parallel", "degree", "hbar", "ell", "Re", "Im", "aleph"
];

const LATEX_CMD_REGEX = new RegExp(`\\\\(?:${LATEX_CMD_LIST.join("|")})(?![a-zA-Z])`);

/**
 * Balance unclosed braces and strip trailing incomplete backslash commands
 * so streaming partial equations render cleanly in KaTeX.
 */
function sanitizePartialTex(tex) {
  let cleaned = String(tex || "").trim();
  // Strip trailing lone backslash or incomplete command name during streaming
  cleaned = cleaned.replace(/\\[a-zA-Z]*$/, (match) => {
    const cmd = match.slice(1);
    return LATEX_CMD_LIST.includes(cmd) ? match : "";
  });
  // Auto-close unclosed curly braces
  let openBraces = 0;
  for (let i = 0; i < cleaned.length; i++) {
    if (cleaned[i] === "\\" && i + 1 < cleaned.length) {
      i++;
      continue;
    }
    if (cleaned[i] === "{") openBraces++;
    else if (cleaned[i] === "}" && openBraces > 0) openBraces--;
  }
  if (openBraces > 0) {
    cleaned += "}".repeat(openBraces);
  }
  return cleaned;
}

/**
 * Renders a LaTeX string to HTML using KaTeX.
 * Never throws; falls back to escaped plain text if KaTeX fails.
 */
export function renderKatexString(tex, { displayMode = false, isStreaming = false } = {}) {
  const raw = String(tex || "").trim();
  if (!raw) return "";
  const input = isStreaming ? sanitizePartialTex(raw) : raw;
  if (!input) return "";

  try {
    return katex.renderToString(input, {
      displayMode,
      throwOnError: false,
      strict: false,
      trust: false,
      output: "htmlAndMathml",
      errorColor: "var(--accent, #3b82f6)",
    });
  } catch {
    return "";
  }
}

/**
 * Checks whether a `$...$` match is likely currency (e.g. "$50 and $60") rather than math.
 */
function isLikelyCurrencySpan(inner, fullText, matchStart, matchEnd) {
  const trimmed = inner.trim();
  if (!trimmed) return true;
  // "$50 and $60" -> starts with number + whitespace + word
  if (/^\d[\d,.]*\s+[a-zA-Z]/.test(trimmed) && !/[\\=^_{}]/.test(trimmed)) {
    return true;
  }
  // Leading or trailing space inside $ ... $ without LaTeX commands is usually prose/currency
  if ((inner.startsWith(" ") || inner.endsWith(" ")) && !LATEX_CMD_REGEX.test(inner)) {
    return true;
  }
  // Check if preceded by digit? No, `$50` has `$` before `50`. If `inner` is just digits like `50` and next char is space
  if (/^\d[\d,.]*$/.test(trimmed)) {
    const after = fullText[matchEnd] || "";
    if (after === " " || after === "," || after === ".") return true;
  }
  return false;
}

/**
 * Splits a plain-text segment (with no $ or \( \) delimiters) into text and bare LaTeX math segments.
 * Handles cases like: "Work is W = \vec{F} \cdot \vec{d} = F \cdot d \cdot \cos\theta in physics."
 */
function splitBareLatex(text) {
  if (!text || !LATEX_CMD_REGEX.test(text)) {
    return text ? [{ type: "text", value: text }] : [];
  }

  const tokens = [];
  // Process line by line so multi-line prose stays clean
  const lines = text.split(/(\n)/);

  for (const line of lines) {
    if (line === "\n") {
      tokens.push({ type: "text", value: "\n" });
      continue;
    }
    if (!line || !LATEX_CMD_REGEX.test(line)) {
      if (line) tokens.push({ type: "text", value: line });
      continue;
    }

    // Check for \begin{env}...\end{env}
    const envMatch = line.match(/\\begin\{([a-zA-Z*]+)\}[\s\S]*\\end\{\1\}/);
    if (envMatch) {
      const idx = envMatch.index;
      if (idx > 0) tokens.push(...splitBareLatex(line.slice(0, idx)));
      tokens.push({ type: "block-math", value: envMatch[0] });
      const rest = line.slice(idx + envMatch[0].length);
      if (rest) tokens.push(...splitBareLatex(rest));
      continue;
    }

    // Match bare math equations containing at least one LaTeX command.
    // A math span can include:
    // - Optional LHS identifier(s) + '=' / '<' / '>' (e.g. "W = " or "F_net = ")
    // - LaTeX commands (\cmd or \cmd{...}{...})
    // - Single-letter variables, numbers, operators (+, -, *, /, =, ^, _, <, >, |, (, ), [, ], {, }, ., ,)
    // - Single spaces between math tokens, stopping before 2+ letter English words
    const bareMathRegex = /(?:[A-Za-z0-9_]+(?:\s*[,']\s*[A-Za-z0-9_]+)*\s*[=<>≤≥≈∝→]\s*)?(?:\\[a-zA-Z]+(?:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})*|\b[A-Za-z]\b|[0-9]+(?:\.[0-9]+)?|[=<>+\-*/^_(){}[\]|.,'′°])(?:\s+(?:\\[a-zA-Z]+(?:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})*|\b[A-Za-z]\b|[0-9]+(?:\.[0-9]+)?|[=<>+\-*/^_(){}[\]|.,'′°])|\s*[=<>+\-*/^_(){}[\]|.,'′°]\s*|(?:\\[a-zA-Z]+(?:\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\})*))*/g;

    let lastIdx = 0;
    let m;
    while ((m = bareMathRegex.exec(line)) !== null) {
      const candidate = m[0];
      if (!LATEX_CMD_REGEX.test(candidate)) continue;

      // Trim trailing punctuation like period or comma at the end of a sentence
      let trimmed = candidate.replace(/[.,;:]+$/, "");
      // Also trim leading/trailing whitespace
      const leadingWs = trimmed.length - trimmed.trimStart().length;
      const start = m.index + leadingWs;
      trimmed = trimmed.trim();
      const end = start + trimmed.length;

      if (start > lastIdx) {
        tokens.push({ type: "text", value: line.slice(lastIdx, start) });
      }
      tokens.push({ type: "inline-math", value: trimmed });
      lastIdx = end;
    }

    if (lastIdx < line.length) {
      tokens.push({ type: "text", value: line.slice(lastIdx) });
    }
  }

  return tokens;
}

/**
 * Tokenizes text into { type: "text" | "inline-math" | "block-math", value, streaming? }.
 * Handles delimited math ($$...$$, \[...\], \(...\), $...$), incomplete streaming math,
 * and bare LaTeX equations.
 */
export function splitTextWithMath(text) {
  if (!text) return [];
  const raw = String(text);
  const tokens = [];

  // Delimited math: $$...$$, \[...\], \(...\), $...$
  const delimRegex = /(\$\$[\s\S]+?\$\$|\\\[[\s\S]+?\\\]|\\\([\s\S]+?\\\)|\$(?:\\\$|[^$\n])+?\$)/g;
  let lastIndex = 0;
  let match;

  while ((match = delimRegex.exec(raw)) !== null) {
    const token = match[0];

    if (token.startsWith("$") && !token.startsWith("$$")) {
      const inner = token.slice(1, -1);
      if (isLikelyCurrencySpan(inner, raw, match.index, delimRegex.lastIndex)) {
        continue;
      }
    }

    if (match.index > lastIndex) {
      tokens.push(...splitBareLatex(raw.slice(lastIndex, match.index)));
    }

    if (token.startsWith("$$") && token.endsWith("$$")) {
      tokens.push({ type: "block-math", value: token.slice(2, -2).trim() });
    } else if (token.startsWith("\\[") && token.endsWith("\\]")) {
      tokens.push({ type: "block-math", value: token.slice(2, -2).trim() });
    } else if (token.startsWith("\\(") && token.endsWith("\\)")) {
      tokens.push({ type: "inline-math", value: token.slice(2, -2).trim() });
    } else if (token.startsWith("$") && token.endsWith("$")) {
      tokens.push({ type: "inline-math", value: token.slice(1, -1).trim() });
    }

    lastIndex = delimRegex.lastIndex;
  }

  const remaining = raw.slice(lastIndex);
  if (remaining) {
    // Check for unclosed streaming math delimiters at the end of remaining text
    const unclosedBlock = remaining.match(/^([\s\S]*?)(\$\$|\\\[)([\s\S]+)$/);
    const unclosedInline = !unclosedBlock ? remaining.match(/^([\s\S]*?)(\\\(|\$)([^\n]+)$/) : null;

    if (unclosedBlock) {
      if (unclosedBlock[1]) tokens.push(...splitBareLatex(unclosedBlock[1]));
      tokens.push({
        type: "block-math",
        value: unclosedBlock[3].trim(),
        streaming: true,
      });
    } else if (unclosedInline && (unclosedInline[2] === "\\(" || /[\\=^_{}]/.test(unclosedInline[3]))) {
      if (unclosedInline[1]) tokens.push(...splitBareLatex(unclosedInline[1]));
      tokens.push({
        type: "inline-math",
        value: unclosedInline[3].trim(),
        streaming: true,
      });
    } else {
      tokens.push(...splitBareLatex(remaining));
    }
  }

  return tokens;
}

/**
 * Creates a DOM element for inline math rendered via KaTeX.
 */
export function createInlineMathNode(tex, { isStreaming = false } = {}) {
  const span = document.createElement("span");
  span.className = "learn-inline-math";
  const html = renderKatexString(tex, { displayMode: false, isStreaming });
  if (html) {
    span.innerHTML = html;
  } else {
    span.textContent = tex;
  }
  return span;
}

/**
 * Creates a DOM element for block/display math rendered via KaTeX.
 */
export function createBlockMathNode(tex, { isStreaming = false } = {}) {
  const div = document.createElement("div");
  div.className = "learn-math-block";
  const html = renderKatexString(tex, { displayMode: true, isStreaming });
  if (html) {
    div.innerHTML = html;
  } else {
    const fallback = document.createElement("code");
    fallback.className = "learn-math-code";
    fallback.textContent = tex;
    div.appendChild(fallback);
  }
  return div;
}

/**
 * Renders plain text that may contain inline/block LaTeX math into a DOM container.
 * Safe against XSS: plain text segments are appended via document.createTextNode.
 */
export function renderTextWithMath(container, text) {
  if (!container) return;
  container.textContent = "";
  if (!text) return;
  const tokens = splitTextWithMath(text);
  for (const tok of tokens) {
    if (tok.type === "block-math") {
      container.appendChild(createBlockMathNode(tok.value, { isStreaming: tok.streaming }));
    } else if (tok.type === "inline-math") {
      container.appendChild(createInlineMathNode(tok.value, { isStreaming: tok.streaming }));
    } else {
      container.appendChild(document.createTextNode(tok.value));
    }
  }
}
