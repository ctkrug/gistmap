# Gistmap — Backlog

Epic/story breakdown for the build. Each story has verifiable acceptance criteria a later run
can confirm true/false. All start unchecked; BUILD implements to the criteria and QA attacks
them. The **first story is the wow moment** — it lands before anything optional.

Legend: `[ ]` todo · `[~]` in progress · `[x]` done.

---

## Epic 1 — The wow moment: paste → live semantic map

> Goal: pasting a messy list produces a labeled, colored 2D map in ~2 seconds, on-device.

- [ ] **1.1 — Paste → clustered, labeled 2D map (THE WOW MOMENT)**
  - AC1: Pasting ≥50 short lines and pressing **Map it** renders colored points on the canvas,
    each point's color matching its cluster.
  - AC2: The full pipeline (embed → cluster → project → label) runs client-side with no network
    request carrying the pasted text (only the one-time model weight download).
  - AC3: For a 150-line sample on a warm model (weights cached), map-to-render completes in
    under ~2s.

- [ ] **1.2 — On-device embedding with visible model-download progress**
  - AC1: First map load shows a progress indicator that advances while the model downloads.
  - AC2: The model is fetched once and reused for subsequent maps (no re-download within a
    session).
  - AC3: With no network after first load, mapping still works (offline-capable).

- [ ] **1.3 — Constellation-forming "snap" animation + cluster lines**
  - AC1: On map completion points animate from a scattered layout into cluster positions over
    ~300–500ms (skipped/instant under `prefers-reduced-motion`).
  - AC2: Faint lines connect each point to its cluster centroid after points settle.
  - AC3: A soft synth chime plays on completion unless muted.

- [ ] **1.4 — Design polish: execute the celestial theme on the map**
  - AC1: Background renders the starfield + vignette from `docs/DESIGN.md`; no flat empty color.
  - AC2: Points use the 12-hue cluster palette with a subtle glow; tokens match DESIGN.md.
  - AC3: Wordmark uses Fraunces with the twinkling star glyph; favicon is the brass star.

## Epic 2 — Explore & tune the map

> Goal: the map is interactive — read points, see cluster names, and re-cluster live.

- [ ] **2.1 — Hover a point to read its line**
  - AC1: Hovering (or focusing) a point shows a themed tooltip with that line's full text.
  - AC2: The hovered point brightens/scales and its cluster siblings gain a faint highlight.
  - AC3: On touch, tapping a point shows the same tooltip; it dismisses on tap-away.

- [ ] **2.2 — Cluster legend with names and sizes**
  - AC1: A legend lists each cluster with its auto-label, color swatch, and point count.
  - AC2: Clicking a legend entry highlights that cluster on the map and dims the others.
  - AC3: Cluster labels are the distinctive-term names (not "Cluster N").

- [ ] **2.3 — Cluster-count slider re-clusters live**
  - AC1: A styled slider sets k within a sensible range; changing it re-clusters and re-labels.
  - AC2: Points tween to new positions/colors rather than jumping.
  - AC3: The slider defaults to the auto-estimated k on first map.

- [ ] **2.4 — Reproject control**
  - AC1: A "reproject" action re-runs the 2D projection and animates points to new positions.
  - AC2: Reprojection never changes cluster membership or labels — only layout.
  - AC3: The control has hover/focus/active states and an accessible label.

- [ ] **2.5 — Design polish: interaction states + juice + SFX**
  - AC1: Every control has themed hover, focus-visible, active, and disabled states.
  - AC2: Synth SFX exist for map-complete, slider tick, and reproject; a mute toggle persists in
    `localStorage`; AudioContext is created lazily and guarded when unavailable.
  - AC3: `prefers-reduced-motion` drops non-essential motion while keeping function.

## Epic 3 — Trust, export & ship

> Goal: it's robust, exportable, private-by-proof, and publicly shippable as one brand.

- [ ] **3.1 — One-click sample datasets**
  - AC1: At least three sample lists load into the input with one click.
  - AC2: Loading a sample and mapping it produces sensibly separated, named clusters.

- [ ] **3.2 — Export the clustered result**
  - AC1: An export control downloads the current result as JSON (line, cluster id, label, x, y).
  - AC2: A CSV export produces a valid, spreadsheet-openable file with a header row.
  - AC3: Export reflects the current k/reprojection state.

- [ ] **3.3 — Designed empty, loading, error states + input validation**
  - AC1: Empty state shows the "You are here" starfield invitation, not a blank canvas.
  - AC2: Fewer than 3 non-empty lines shows an inline hint, not a crash or empty map.
  - AC3: A model-load or runtime failure shows a themed error message with a retry, not a
    stack trace or blank screen.

- [ ] **3.4 — Landing page (`site/`) sharing the app brand**
  - AC1: A landing page uses the same DESIGN.md direction/tokens as the app (one brand).
  - AC2: It states the privacy pitch, shows the wow moment, and links to launch the app.
  - AC3: It builds into the static output with relative asset paths (hostable under a subpath).

- [ ] **3.5 — Design polish: responsive + accessibility pass**
  - AC1: Composed with no overlap/horizontal-scroll at 390 / 768 / 1440 px widths.
  - AC2: Keyboard focus order is sane, focus-visible everywhere, icon buttons have `aria-label`,
    status uses a live region; text contrast ≥ 4.5:1.
  - AC3: Touch targets ≥ 44px and the map is usable by tap on a phone.
