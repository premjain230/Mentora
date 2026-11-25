import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { splitTextWithMath, renderKatexString } from "./vanilla/shared/math-renderer.js";

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}\n    ${err.message}`);
    failed++;
  }
}

console.log("============================================================");
console.log("Learning Allied — Math Rendering & Global Platform Tests");
console.log("============================================================");

console.log("\n[Suite 1] KaTeX Math Renderer (Inline, Block, Bare LaTeX, Streaming)");

test("renders delimited inline math $W = \\vec{F} \\cdot \\vec{d}$", () => {
  const tokens = splitTextWithMath("Work is $W = \\vec{F} \\cdot \\vec{d} = F \\cdot d \\cdot \\cos\\theta$.");
  const mathTok = tokens.find((t) => t.type === "inline-math");
  assert.ok(mathTok, "Expected inline-math token");
  const html = renderKatexString(mathTok.value, { displayMode: false });
  assert.ok(html.includes('class="katex"'), "Expected KaTeX HTML output");
  assert.ok(html.includes("<math"), "Expected MathML output");
});

test("renders bare LaTeX without $ delimiters (user example)", () => {
  const tokens = splitTextWithMath("W = \\vec{F} \\cdot \\vec{d} = F \\cdot d \\cdot \\cos\\theta");
  const mathTok = tokens.find((t) => t.type === "inline-math");
  assert.ok(mathTok, "Expected bare LaTeX to be detected as math");
  const html = renderKatexString(mathTok.value, { displayMode: false });
  assert.ok(html.includes('class="katex"'), "Expected KaTeX HTML output for bare LaTeX");
});

test("renders block math $$...$$ and \\[...\\] for fractions, integrals, matrices, roots", () => {
  const samples = [
    "$$\\frac{-b \\pm \\sqrt{b^2 - 4ac}}{2a}$$",
    "\\[\\int_0^{\\infty} e^{-x^2} \\, dx = \\frac{\\sqrt{\\pi}}{2}\\]",
    "$$A = \\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}$$",
  ];
  for (const sample of samples) {
    const tokens = splitTextWithMath(sample);
    assert.equal(tokens.length, 1);
    assert.equal(tokens[0].type, "block-math");
    const html = renderKatexString(tokens[0].value, { displayMode: true });
    assert.ok(html.includes("katex-display"), `Expected display KaTeX for ${sample}`);
  }
});

test("renders inline \\(...\\) notation", () => {
  const tokens = splitTextWithMath("The angle is \\(\\theta = \\frac{\\pi}{4}\\) radians.");
  const mathTok = tokens.find((t) => t.type === "inline-math");
  assert.ok(mathTok);
  assert.equal(mathTok.value, "\\theta = \\frac{\\pi}{4}");
});

test("handles incomplete streaming math gracefully without crashing", () => {
  const tokens = splitTextWithMath("Using Newton's law: $$F = \\frac{dp}{");
  const mathTok = tokens.find((t) => t.type === "block-math");
  assert.ok(mathTok && mathTok.streaming, "Expected streaming block-math token");
  const html = renderKatexString(mathTok.value, { displayMode: true, isStreaming: true });
  assert.ok(html.includes("katex"), "Expected partial streaming equation to render in KaTeX");
});

test("protects currency ($100 and $200) from being parsed as math", () => {
  const tokens = splitTextWithMath("The course costs $100 and the book costs $200.");
  assert.ok(tokens.every((t) => t.type === "text"), "Currency should remain plain text");
});

console.log("\n[Suite 2] Global Platform Localization & Non-India-Default Checks");

test("CountryContext does not default to IN or INR", () => {
  const src = fs.readFileSync(path.resolve("src/lib/i18n/CountryContext.tsx"), "utf8");
  assert.ok(!src.includes('DEFAULT_COUNTRY_CODE = "IN"'), "CountryContext should not default to IN");
  assert.ok(!src.includes('formatPrice: (amt) => `₹${amt}`'), "CountryContext should not default to ₹");
});

test("Onboarding does not default to IN or in_cbse", () => {
  const src = fs.readFileSync(path.resolve("app/onboarding/page.tsx"), "utf8");
  assert.ok(!src.includes('useState("IN")'), "Onboarding should not default country to IN");
  assert.ok(!src.includes('useState("in_cbse")'), "Onboarding should not default track to in_cbse");
});

test("Profile markup and controller do not hardcode India/CBSE defaults", () => {
  const markup = fs.readFileSync(path.resolve("components/pages/profile/ProfileMarkup.tsx"), "utf8");
  assert.ok(!markup.includes('>🇮🇳<'), "ProfileMarkup should not hardcode Indian flag");
  assert.ok(!markup.includes('>CBSE<'), "ProfileMarkup should not hardcode CBSE");
  const ctrl = fs.readFileSync(path.resolve("vanilla/profile.js"), "utf8");
  assert.ok(!ctrl.includes('exam: "CBSE Class 12"'), "profile.js should not hardcode CBSE Class 12");
});

test("format.js does not hardcode en-IN locale", () => {
  const src = fs.readFileSync(path.resolve("vanilla/shared/format.js"), "utf8");
  assert.ok(!src.includes('"en-IN"'), "format.js should not hardcode en-IN");
});

test("System prompt enables LaTeX math and is globally adaptive", () => {
  const src = fs.readFileSync(path.resolve("js/ai/system-prompt.js"), "utf8");
  assert.ok(!src.includes("# Math Rendering — Unicode, not LaTeX"), "Old Unicode-only math rule should be removed");
  assert.ok(!src.includes("# JEE and NEET Problem Solving"), "Unconditional JEE/NEET heading should be removed");
  assert.ok(src.includes("# Math Rendering — Clean LaTeX"), "Clean LaTeX rule should be present");
});

test("PublicNavbar and ArenaMarkup are globally framed", () => {
  const nav = fs.readFileSync(path.resolve("components/PublicNavbar.tsx"), "utf8");
  assert.ok(!nav.includes('>JEE</Link>'), "Navbar should not have India-only JEE top link");
  const arena = fs.readFileSync(path.resolve("components/pages/arena/ArenaMarkup.tsx"), "utf8");
  assert.ok(!arena.includes("JEE · NEET · Maharashtra · CBSE"), "ArenaMarkup should not hardcode Indian exams");
});

console.log(`\n============================================================`);
console.log(`Results: ${passed} passed, ${failed} failed`);
console.log(`============================================================`);
if (failed > 0) process.exit(1);
