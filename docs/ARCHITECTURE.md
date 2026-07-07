# Gistmap — Architecture

A concise map of the codebase for anyone picking it up cold. Gistmap is a static,
client-side web app: paste text → embed on-device → cluster → project to 2D →
label → render an interactive "constellation" map. Nothing is uploaded.

## Data flow

```
paste text ─▶ embed.js ─▶ vectors ─┬─▶ cluster.js (k-means) ─▶ assignments
 (main.js)   (WASM model)           ├─▶ project.js (PCA) ─────▶ 2D coords
                                    └─▶ labels.js (c-TF-IDF) ─▶ names
                                              │
                              pipeline.buildMap() assembles the map model
                                              │
                                      render/mapview.js (canvas + rAF)
```

`buildMap(vectors, texts, {k?})` returns the single model everything else consumes:

```js
{ k, points: [{ text, x, y, cluster }], clusters: [{ id, label, size }] }
```

The pasted vectors are cached in `main.js` so the k-slider and reproject can
re-run `buildMap` / `reprojectMap` without re-embedding.

## Modules

### `src/lib/` — pure, DOM-free, unit-tested
- **vec.js** — cosine, euclidean, centroid, normalize (vector primitives).
- **rng.js** — `mulberry32` seeded PRNG for deterministic clustering/projection.
- **cluster.js** — `kmeans` (k-means++ seeding) + `estimateK` (elbow heuristic).
- **project.js** — `projectPCA` (top-2 PCs via power iteration) + `normalizeCoords`.
- **labels.js** — `tokenize` + `labelClusters` (class-based TF-IDF cluster names).
- **pipeline.js** — `buildMap` (embed-agnostic orchestration), `clampK`,
  `reprojectMap` (rotate layout, keep membership).
- **geometry.js** — `scaleToViewport`, `pickNearest` (hover hit-test),
  `scatterPositions` (snap start), `rotateCoords`.
- **anim.js** — `easeOutCubic`, `lerp`, `clamp01`, `staggeredProgress` (snap wave).
- **exporters.js** — `toRows`, `toJSON`, `toCSV` (RFC-4180-ish escaping +
  spreadsheet formula-injection guard on text cells).
- **input.js** — `parseLines` (trim/drop-blanks + `MAX_LINES` cap) so a huge
  paste can't freeze the tab.
- **sfx.js** — `createSfx` (WebAudio synth chime/tick/sweep, persisted mute,
  guarded AudioContext). Dependency-injected for testing.
- **samples.js** — three built-in messy datasets.
- **palette.js** — 12-hue cluster color ramp + `clusterColor(id)`.

### `src/lib/embed.js` — browser-only
Lazily loads the quantized `Xenova/all-MiniLM-L6-v2` sentence-transformer via
`@huggingface/transformers` (WASM), caches the pipeline, returns normalized
mean-pooled vectors. Not unit-tested (it fetches weights); the math it feeds is.

### `src/render/mapview.js` — canvas renderer
`createMapView(canvas, {reduceMotion, onHover})` owns a `requestAnimationFrame`
loop: scatters points and snaps them into cluster layout (`staggeredProgress`),
fades in constellation lines to each centroid, twinkles the field, and hit-tests
the pointer for hover. `setMap(map, {mode:'snap'|'tween'})`, `setHighlight(id)`,
`resize()`, `destroy()`. `clusterCentroids2D` is exported pure and unit-tested.

### `src/main.js` — DOM/orchestration glue
Builds the shell, wires paste→embed→map, the k-slider (live re-cluster),
reproject, JSON/CSV export, the clickable legend (cluster highlight), the hover
tooltip + coordinate readout, the persisted mute toggle, and the designed
empty/loading(+progress)/error states.

### `src/style.css` — the celestial theme (tokens mirror `docs/DESIGN.md`).

### `site/index.html` — standalone landing page (same brand), built as a second
Vite entry into `dist/site/`.

## Run / test / build

- **Dev:** `npm run dev` (Vite dev server).
- **Test:** `npm test` (Vitest, node env — pure logic only, no browser needed).
- **Coverage:** `npm run test:coverage` (v8; reports on `src/lib/` core, ~99%
  lines — includes fast-check property tests for the math and IO invariants).
- **Lint:** `npm run lint` (ESLint).
- **Build:** `npm run build` → `dist/` (static, base-path-relative for subpaths).
  Two HTML entries: `dist/index.html` (app) and `dist/site/index.html` (landing).

## Conventions
- Everything runs client-side; the only network call is the one-time model
  weight download. Keep it that way.
- Randomness is seeded so maps are reproducible across runs.
- Pure logic lives in `src/lib/` and ships with tests in the same change; the
  canvas/DOM layers are exercised via the build + manual QA.
