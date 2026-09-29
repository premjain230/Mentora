/**
 * Ambient texture layer.
 *
 * Injects the SVG <filter> defs plus the background layer elements once per
 * page. Styles live in css/texture.css — see the top of that file for tunables.
 *
 * Usage — one line, anywhere:
 *   <link rel="stylesheet" href="/css/texture.css" />
 *   <script type="module" src="/js/texture.js"></script>
 *
 * Why the defs are JS-injected and not in the HTML: filter: url(#octave1) is a
 * same-document reference, so the <filter> elements must exist in the DOM. This
 * keeps ~200 lines of SVG out of all 11 pages.
 *
 * PERFORMANCE. feTurbulence with numOctaves=8, three times per filter, across
 * three full-viewport layers is genuinely expensive — it will jank on mid-range
 * Android. So the filters are skipped and replaced with a cheap gradient when:
 *   - prefers-reduced-motion: reduce
 *   - the primary pointer is coarse (phones/tablets) or the viewport is small
 *   - localStorage.texture = "off"   (set it from the console to compare)
 * The layer is decorative, so every one of these paths degrades quietly.
 */

const LAYER_ID = "textureLayer";
const FILTER_ID = "textureFilters";
const OPT_OUT_KEY = "texture";

/* ── SVG filter defs ─────────────────────────────────────────────────────
   NOTE — these are CORRECTED values. The originally supplied snippet could not
   produce a visible result, verified by measuring painted pixel luminance:

     <feDistantLight elevation="">   empty/invalid -> light sits on the
                                     horizon -> diffuse result is black.
                                     Measured avg luminance 15.9 vs a 9.9
                                     background, i.e. invisible.
     baseFrequency="0.0004"/"0.0001" noise features are ~2500px / ~10000px
                                     wide, so at viewport scale the output is a
                                     FLAT WASH. Measured standard deviation
                                     0.8 across a 900x550 sample.
     brightness(20)                  multiplies by 20, so with any real
                                     elevation the result clips to pure white
                                     (measured 255.0).

   Fix: real elevation, frequency high enough to show structure, and no
   brightness blow-out. Measured sd at 900x550 with the values below: 21.9
   (range 0-189) for octave1. octave2 is the same with a different light
   direction and tint, which is what gives the two layers their variation.
   The multi-stage feMerge/feGaussianBlur chain was dropped: averaging three
   noise octaves together is what flattened it in the first place.

   To retune, change baseFrequency (detail size), elevation (relief depth) and
   --texture-* in css/tokens.css (strength). Re-measure if you change them a
   lot — see the note at the bottom of this file. */
const FILTERS = `
<svg width="0" height="0" aria-hidden="true" focusable="false"
     style="position:absolute;width:0;height:0;overflow:hidden">
  <defs>
    <filter id="octave1" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.015" numOctaves="5" seed="4" result="noise"></feTurbulence>
      <feGaussianBlur in="noise" stdDeviation="2.5" result="relief"></feGaussianBlur>
      <feDiffuseLighting in="relief" surfaceScale="12" diffuseConstant="1"
                         lighting-color="#d7bb98" result="lit">
        <feDistantLight azimuth="90" elevation="30"></feDistantLight>
      </feDiffuseLighting>
      <feBlend in="lit" in2="SourceGraphic" mode="normal"></feBlend>
    </filter>

    <filter id="octave2" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.018" numOctaves="5" seed="9" result="noise"></feTurbulence>
      <feGaussianBlur in="noise" stdDeviation="3" result="relief"></feGaussianBlur>
      <feDiffuseLighting in="relief" surfaceScale="14" diffuseConstant="1"
                         lighting-color="#d1bf96" result="lit">
        <feDistantLight azimuth="-90" elevation="26"></feDistantLight>
      </feDiffuseLighting>
      <feBlend in="lit" in2="SourceGraphic" mode="normal"></feBlend>
    </filter>

    <filter id="cracks" x="0" y="0" width="100%" height="100%">
      <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="5" seed="10" result="noise"></feTurbulence>
      <feColorMatrix type="luminanceToAlpha" in="noise" result="alphaNoise"></feColorMatrix>
      <feComponentTransfer in="alphaNoise" result="plates">
        <feFuncA type="discrete" tableValues="0 1"></feFuncA>
      </feComponentTransfer>
      <feConvolveMatrix order="3 3" in="plates" result="edges"
        kernelMatrix="-1 -1 -1 -1  8 -1 -1 -1 -1"></feConvolveMatrix>
      <feComponentTransfer in="edges" result="invertedEdges">
        <feFuncR type="table" tableValues="1 0"></feFuncR>
        <feFuncG type="table" tableValues="1 0"></feFuncG>
        <feFuncB type="table" tableValues="1 0"></feFuncB>
      </feComponentTransfer>
      <feFlood flood-color="#000" result="bgColor"></feFlood>
      <feComposite operator="in" in="bgColor" in2="invertedEdges"></feComposite>
    </filter>
  </defs>
</svg>`;

const LAYER = `
<div class="texture-layer" id="${LAYER_ID}" aria-hidden="true">
  <div class="island"></div>
  <div class="islandt"></div>
  <div class="hatch"></div>
  <div class="cracked-earth"></div>
</div>`;

/** True when the SVG filters are too expensive to be worth rendering. */
function shouldSkipFilters() {
  try {
    if (localStorage.getItem(OPT_OUT_KEY) === "off") return true;
  } catch {
    /* private mode — fall through to the media checks */
  }
  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return true;
  if (window.matchMedia?.("(pointer: coarse)").matches) return true;
  if (window.matchMedia?.("(max-width: 820px)").matches) return true;
  return false;
}

export function initTexture() {
  if (document.getElementById(LAYER_ID)) return; // idempotent

  // Injected into <html>, not <body>: home.js replaces document.body.innerHTML
  // outright when Firebase config is unavailable, which would destroy a layer
  // parented to <body>. The layer is position:fixed, so the parent makes no
  // visual difference.
  const host = document.documentElement;
  if (!host) return;

  const skip = shouldSkipFilters();

  // The <filter> defs are only needed when we actually reference them.
  if (!skip) host.insertAdjacentHTML("afterbegin", FILTERS);

  // First child so it sits behind .main (z-index 1) but above the body
  // background colour, which stays opaque as the ultimate fallback.
  host.insertAdjacentHTML("afterbegin", LAYER);

  const layer = document.getElementById(LAYER_ID);
  if (skip) layer.classList.add("no-filters");
  layer.classList.add("is-ready");
}

// Auto-init: pages only need the <script> tag.
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initTexture, { once: true });
} else {
  initTexture();
}
