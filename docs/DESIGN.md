# Gistmap — Design Direction

> Decided at SCOPE, before any UI code. Every build/QA run follows this file. Change it only
> deliberately (own commit, say why). The landing page (`site/`) and the app share this brand.

## 1. Aesthetic direction

**Gistmap is a night-sky cartographer's table: ink-blue astronomical depths, warm ivory
constellation labels, and brass-instrument accents.** A pasted list becomes a *sky* — points
are stars, clusters are constellations with faint lines drawn to their center, and each
constellation is named like an entry in a star atlas. The mood is calm, precise, and a little
wondrous: a planetarium crossed with an antique nautical chart, not a dashboard.

This direction is chosen because the product's core metaphor *is* a map of meaning — leaning
into celestial cartography makes the semantic map feel like a place, and gives the clustering
moment ("the stars find their constellations") genuine delight. It is deliberately **not** the
default "dark-gray cards + one accent" SaaS look.

## 2. Tokens (actual values)

**Color** — deep-space neutral ramp + warm brass accent + phosphor-cyan support.

| Token            | Value       | Use                                              |
|------------------|-------------|--------------------------------------------------|
| `--bg`           | `#0a0f1f`   | page base — deep ink-blue night                  |
| `--surface-1`    | `#111a30`   | panels, cards                                     |
| `--surface-2`    | `#1a2646`   | raised controls, hovered rows                     |
| `--line`         | `#2a3860`   | hairline borders, constellation lines            |
| `--text`         | `#f0ead9`   | primary — warm ivory                              |
| `--muted`        | `#94a0c0`   | secondary text, axis ticks                        |
| `--accent`       | `#e7b24c`   | brass — primary action, wordmark star, active     |
| `--accent-2`     | `#5ec6d8`   | phosphor cyan — highlights, selection, links      |
| `--success`      | `#79d79a`   | done / valid states                               |
| `--danger`       | `#e8746b`   | errors, destructive                               |

Cluster colors come from a **12-hue harmonious palette** tuned for the dark bg (mid-saturation,
lightness ~65%) so up to a dozen constellations stay legible and distinct.

**Type**
- Display / wordmark + headings: **Fraunces** (soft editorial serif, optical size, some
  personality). Fallback: `Georgia, 'Times New Roman', serif`.
- UI / body: **Inter** (variable). Fallback: `system-ui, -apple-system, sans-serif`.
- Numeric readouts (coordinates, counts, k value): **Space Mono** as a support face for tabular
  figures only. Fallback: `ui-monospace, 'SF Mono', monospace`.
- Scale: 1.25 ratio — 12 / 14 / 16(base) / 20 / 25 / 31 / 39 px.

**Spacing** — 4/8px scale: 4, 8, 12, 16, 24, 32, 48, 64.
**Radius** — 10px on panels/cards, 8px on controls, 999px on pills/toggles.
**Elevation** — layered soft glow, not hard drop shadows:
`0 1px 0 rgba(255,255,255,.04) inset, 0 8px 30px rgba(0,0,0,.45)`; interactive glow uses the
accent at low alpha.
**Motion** — UI transitions 160–220ms ease-out; the cluster "snap" 300–500ms ease-out with a
gentle stagger; twinkle 2–4s loops. Honor `prefers-reduced-motion` (drop twinkle + snap
stagger, keep final positions).

## 3. Layout intent

The **map canvas is the hero** — it occupies ~65% of the viewport on desktop and sits center
stage on a faint starfield background.

- **Desktop (1440×900):** two-column. Left: a slim control rail (paste box collapses to a
  "re-map" panel after first run — cluster count slider, reproject, export, sample loader,
  mute). Right + center: the full-height map canvas with a floating legend of named
  constellations and a coordinate readout in the corner. No dead background — the starfield and
  a subtle vignette fill any negative space.
- **Phone (390×844):** single column. Map takes the top ~60vh; controls dock to a bottom sheet
  with the slider and actions; the paste box is a full-screen overlay on first run. Legend
  becomes a horizontal scroll of pills.

## 4. Signature detail

**The wordmark's dot is a star that twinkles**, and on a successful map the constellations
*draw themselves in* — points drift from a scattered pre-layout into their cluster positions
while faint lines connect each star to its constellation centroid, accompanied by an optional
soft synth chime. The empty state is a single labeled "You are here" marker on the starfield
inviting a paste. This constellation-forming moment is the page's memory hook.

## 5. Juice plan (this is a calm data toy, not a game — but it earns delight)

- **Map-it transition:** stars animate from scatter → cluster positions (staggered, 400ms
  ease-out); constellation lines fade in after points settle.
- **Hover a star:** it brightens + scales ~1.4×, shows its text in a themed tooltip; sibling
  stars in the same constellation gain a faint glow.
- **Cluster label pop:** each name fades up with a tiny rise as its constellation settles.
- **Slider re-cluster:** points tween to new positions rather than jumping.
- **Empty / loading / error / success** are all designed states (loading = a shimmer over the
  starfield with model-download progress; error = an inline chart-less message, never a crash).
- **Synth SFX (WebAudio, generated in code, zero files):** a soft *chime* when the map
  completes, a tiny *tick* on slider notches, a *whoosh* on reproject. Subtle volumes,
  rate-throttled. **Mute toggle persists in `localStorage`**; AudioContext created lazily on
  first user gesture; guarded for environments without WebAudio (tests).
- Respect `prefers-reduced-motion`: drop twinkle, snap stagger, and shake; keep final layout
  and sound (sound is opt-out via mute, independent of motion).

## Brand assets

- **Favicon:** inline SVG data-URI — a brass four-point star (`--accent`) on the ink-blue bg,
  never the default globe.
- **Wordmark:** "Gistmap" in Fraunces, with the dot of the *i* replaced by a small twinkling
  brass star glyph.
