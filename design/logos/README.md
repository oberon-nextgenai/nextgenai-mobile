# Logo concepts — Nextgen AI Prime

Reference SVGs for the logo directions explored across rounds, plus the **live N letterform** that ships as the production mark. Open any of them in a browser, VS Code's SVG preview, or Figma. Drop them next to each other to compare at small sizes (favicon range) and large (sign-in lockup).

---

## Nextgen N-mark — **LIVE**

The production mark is the Nextgen AI N-mark: three flat shapes (left bar, diagonal swoosh, right bar) on a `0 0 64 38` viewBox. Theme-aware **flat fill** (no gradient) — dark mark on light surfaces, white on dark — so it tracks light/dark mode automatically. Source assets live in the `nextgen-mobile-logo-assets` pack.

- **Geometry** — three filled `<path>` shapes (`ICON_PATHS`), non-square (height ≈ width × 0.594)
- **Fill** — `colors.fg` (theme foreground); the violet `accent-2` is reserved for the "AI" in the wordmark
- **No gradient, no halo** — the filled N is the entire mark

The live `components/brand/Logo.tsx` extends `SvgProps` and supports `size` / `color` / `withBackground` / optional `backgroundColor` (the old gradient `accent` and `noHalo` props were removed). `withBackground` frames the mark on a rounded tile for splash / biometric. For the app launcher icon, generate a 1024×1024 PNG from the asset SVGs — do not wire SVG directly into `app.config.ts`.

## angular-n.svg — earlier

Angular N monogram — a single filled path on a `0 0 521 501` viewBox, with a theme-aware indigo → violet gradient. Was the live mark before the Nextgen N-mark shipped.

## outline-n.svg — earlier

Bold N letterform rendered as three separate hollow shapes (two vertical rectangles + a diagonal parallelogram) overlapping to form the hollow double-line effect with interlocking chiseled corners. Superseded by the Angular N monogram.

---

## Round 13 — refined concepts (alternative directions)

Four hand-crafted N marks, each carrying a single distinctive idea instead of a stacked trick. Kept as alternatives in case the live Outline N ever needs replacing. Indigo → violet vertical gradient hardcoded for these previews; if any get promoted later the RN component will swap to theme tokens.

### ribbon-n.svg

A single continuous polyline traces `M18,66 → M18,14 → M62,66 → M62,14` at `stroke-width=11` with a diagonal indigo → violet gradient running along the path (`userSpaceOnUse` from top-left to bottom-right). `stroke-linejoin="bevel"` makes the two pivot corners read as crisp 45° ribbon creases instead of mitered spikes; `stroke-linecap="butt"` gives the two terminal ends a cleanly cut ribbon edge. Thin perpendicular white hairlines (30% opacity) bisect each fold corner so the "folded material" affordance reads at a glance. One confident gesture; like a single strip of cast metal folded into an N.

### aperture-n.svg

Bold monoline N (`stroke-width=8`) inside a hairline circle frame (`r=32, stroke-width=1.5`). The left and right verticals sit entirely inside the circle, but the diagonal (`M14,10 → M66,70`) **extends past the circle on both ends** — top-left exit and bottom-right exit. The circle is a precision lens; the diagonal is the signal passing through it. The exit points outside the circle are the most distinctive detail and remain legible at favicon size. Indigo → violet vertical gradient on the three N strokes; circle stays solid indigo.

### bracket-n.svg

Clean bold monoline N (`stroke-width=10`, indigo → violet gradient) plus two precise violet L-shaped corner brackets (1.5px stroke) in the negative space — top-right (`M66,16 L66,8 L58,8`) and bottom-left (`M14,64 L14,72 L22,72`). The brackets imply technical framing / crop marks / focus reticle. They are the entire ornament; everything else is restraint. Reads as instrumentation.

### stacked-n.svg

N rendered as **double parallel hairline strokes** — for each of the three N arms, two 2px strokes spaced 4px apart, all carrying the same indigo → violet vertical gradient. Six paths total: left vertical pair, diagonal pair (parallel along the 45° axis), right vertical pair. Sheet-metal-stacked effect; depth without 3D extrusion. Refined version of the parallel-slash idea that appeared a dozen times on the inspiration sheet.

---

## notch-n.svg — earlier (Round 12)

Minimalistic, rich, futuristic. Bold N silhouette (3 strokes, width 11, viewBox 80, square caps) carrying a single vertical indigo → violet gradient on all three strokes. The right vertical is rendered as a filled polygon with a **45° chamfer cut at the top-right corner** — one intentional facet that implies a chip / circuit edge. No gloss, no diagonal ray, no second gradient. Previously shipped as the live mark; superseded by Outline N for being too filled — user wanted the hollow double-line typographic look instead.

- **Stroke gradient** — `#1E3A8A` → `#7C3AED` (light) / `#6366F1` → `#A78BFA` (dark, via `colors.accent` / `colors.accent2`)
- **Chamfer** — 4.5px × 4.5px triangular cut at the top-right of the right vertical, reads as a subtle facet at 24px and a clean chip cut at 48px
- **Halo** — wrapping View shadow, ~half the bloom of the archived v2

---

## Earlier explorations (pre–Round 12)

### split-beam-n.svg

Two bold gradient verticals + one thin floating violet diagonal hairline detached from the verticals by 2px at each terminus + a 2.5px filled accent node at the diagonal's exit. Structural frame with a light beam passing through.

### hairline-n-node.svg

Three 2px hairline N strokes (gradient) + a bold filled violet square at the bottom-right corner. Precision typography with a single emphasis node.

### refraction-n-v2.svg — archived

Refraction N with fade · gloss · halo. Vertical stroke gradient + white-to-transparent gloss overlay + diagonal ray gradient + soft violet halo. Superseded by Notch N — felt too cosmetic for the minimalistic direction the brand committed to.

### refraction-n.svg — earlier (v1)

Same N silhouette without gradient/gloss/halo — flat indigo strokes plus the violet hairline ray.

### letterform-n.svg

Same N silhouette without the violet ray — bookmark of the "pre-mix" state.

### pulse-orb.svg

A single filled accent dot at center, ringed by two thin concentric strokes. No N. Animates while Prime is streaming.

- Center dot: r=5, filled `#1E3A8A`
- Inner ring: r=16, stroke 1.6 at 45% opacity
- Outer ring: r=26, stroke 1.6 at 18% opacity

### aperture-hexagon.svg

A hexagonal aperture outline with three radial blade-lines converging on a center dot.

### prism-triangle.svg

A solid filled triangle split by a single thin internal ray-line. The "Prime" name maps to the prism / light-split metaphor.

### wordmark.svg

A custom-tracked "PRIME" wordmark with a thin accent bar under the `I`. Most serious option; matches the lineage of Anthropic / Vercel / Stripe wordmark-first identities.

---

## Sizing guidance

| Surface | Recommended size |
|---|---|
| Tab header / `AppHeader` | 30px |
| Sign-in lockup (`AppMark`) | 44px (icon) + wordmark beside it |
| BiometricGate | 64px `withBackground` (framed tile) |
| Splash | 64–96px |
| Favicon (web) | 24px / 32px |

The live `components/brand/Logo.tsx` implements the **Nextgen N-mark** (flat fill, theme-aware). The concepts below are kept as historical references.
