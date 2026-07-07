# Gistmap — Vision & Design

## The problem

People constantly accumulate short, unstructured text: a dumped brain-list of tasks, a column
of survey free-responses, a folder of bookmarks, a thread of tweets, a spreadsheet of customer
feedback. The useful next step is almost always the same — *see the shape of it*: what are the
natural groups, and what is each group about?

Today that means one of:

- **A cloud LLM** — paste it in, but now your data left your machine, you're rate-limited, and
  you get prose, not a durable map.
- **A notebook** — real embeddings and clustering, but you have to write Python, install
  packages, and it's nobody's idea of "quick."
- **A heavyweight data tool** — sign up, upload, configure, learn the UI.

All three are too much friction for the everyday act of triaging a messy list, and two of them
are a privacy problem.

## The core idea

**Do the entire NLP pipeline in the browser, on-device, in seconds, with zero setup.**

Gistmap is a single static web page. Paste newline-separated text and it:

1. **Embeds** each line with a real sentence-transformer (`all-MiniLM-L6-v2`, ~7 MB quantized)
   running in WebAssembly via Transformers.js.
2. **Clusters** the resulting vectors with k-means (auto-picking a sensible cluster count).
3. **Labels** each cluster from its most distinctive terms — a readable name, not a number.
4. **Projects** the high-dimensional vectors to 2D (PCA) and draws them as a live map, each
   cluster a colored "constellation."

No account, no upload, no code, no key. After the one-time model download it even works offline.

## Who it's for

- **Knowledge workers** triaging a brain-dump, meeting notes, or a backlog.
- **Researchers / PMs** eyeballing survey or feedback free-text before deeper analysis.
- **Anyone privacy-conscious** who won't paste internal text into a cloud LLM.
- **The curious** who want to *watch* an embedding model cluster text in real time.

## Key design decisions

- **On-device, always.** The single non-negotiable: text never leaves the tab. This drives the
  whole stack (WASM model, client-only math, static hosting).
- **Vanilla JS + small pure modules.** Clustering, projection, and labeling are dependency-free,
  deterministic (seeded), and unit-tested without the model — so the hard parts are provable and
  the bundle stays lean. Transformers.js is the only heavy dependency and is lazily loaded.
- **PCA over UMAP for v1.** PCA is deterministic, dependency-free, and fast; it gives clusters
  visible separation without shipping a heavier projector. A nicer projection is a later story.
- **k-means with an auto-k elbow.** Predictable, fast, explainable; the user can override the
  count with a slider.
- **Design is a feature.** The map is the product — it gets a deliberate celestial-cartography
  art direction (see `docs/DESIGN.md`), not a generic dashboard skin.
- **Static & relative-pathed.** Builds to one directory with relative asset paths, so it hosts
  under any subpath (e.g. `apps.charliekrug.com/gistmap`) with no server.

## The wow moment

Paste ~150 unsorted lines, press **Map it**, and within ~2 seconds the points animate from a
scatter into labeled, colored constellations on a 2D star-map — with no upload, no login, and
nothing leaving the tab.

## What "v1 done" looks like

- Paste (or load a sample) → embed → cluster → label → 2D map, end to end, in the browser.
- The map animates into place, clusters are colored and named, and hovering a point reveals its
  text.
- A cluster-count slider re-clusters live; a reproject control is available.
- Export the clustered result as JSON/CSV.
- Designed empty, loading (with model-download progress), error, and success states.
- Fully responsive (390 / 768 / 1440), keyboard-accessible, with synth SFX + a persistent mute.
- Green CI (lint + unit tests + build), and a landing page sharing the app's brand.

## Non-goals for v1

- No server, accounts, or persistence beyond the browser.
- No document-length text (v1 targets short lines/phrases).
- No supervised/labeled classification — this is unsupervised discovery.
- No multi-language guarantees beyond what the base model provides.
