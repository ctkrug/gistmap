# Gistmap

**Paste a messy list. Watch it snap into a labeled semantic map — instantly, and entirely inside your browser tab.**

Gistmap takes any pile of short text — tasks, tweets, survey answers, bookmarks, feedback,
research notes — and turns it into a live 2D map where similar items cluster together, each
cluster automatically named. A real embedding model runs in WebAssembly on your own machine,
so **nothing you paste ever leaves the tab**. No upload, no login, no API key, no code.

> Paste 150 unsorted lines → in ~2 seconds they cluster into colored, labeled islands on a map.

## Why it exists

Every "organize my messy text" tool asks you to sign up, upload your data to someone's cloud,
and often to write a prompt or a bit of code. That is overkill — and a privacy problem — for the
everyday task of *seeing the shape of a list*. Gistmap does the whole NLP pipeline locally:

- **Embed** each line with a genuine sentence-transformer model (`all-MiniLM-L6-v2`, ~7 MB
  quantized) via [Transformers.js](https://huggingface.co/docs/transformers.js) on WASM.
- **Cluster** the embeddings (k-means, with an automatic *k* estimate).
- **Label** each cluster from its most distinctive terms — a readable name, not "Cluster 3".
- **Project** the high-dimensional vectors down to a 2D map you can pan, zoom, and read.

All of it in one static page. The model is fetched once and cached; after that Gistmap works
offline.

## Features (planned)

- 📋 **Paste-and-go** — drop in newline-separated text, get a map. No config required.
- 🧠 **On-device embeddings** — sentence-transformer model in WASM; data never leaves the browser.
- 🗺️ **Live semantic map** — clusters as colored islands, hover a point to read the line.
- 🏷️ **Automatic labels** — each cluster named from its signature terms.
- 🎛️ **Tune it** — adjust cluster count, reproject, and re-cluster live.
- 💾 **Export** — download the clustered result as JSON or CSV.
- ⚡ **Sample datasets** — one click to see it work on real messy data.
- 🔒 **Fully private & offline** — after first load, no network needed.

See [`docs/VISION.md`](docs/VISION.md) for the full design and [`docs/BACKLOG.md`](docs/BACKLOG.md)
for the build plan.

## Stack

- **Vanilla JavaScript** (ES modules) + [Vite](https://vitejs.dev/) for the build.
- [Transformers.js](https://huggingface.co/docs/transformers.js) for in-browser embeddings (WASM).
- Canvas 2D for the map render (`devicePixelRatio`-aware).
- [Vitest](https://vitest.dev/) for the pure-logic units (clustering, projection, labeling).
- Zero backend. Builds to a single static directory; hostable under any base path.

## Getting started

```bash
npm install
npm run dev      # local dev server
npm test         # run the unit suite
npm run build    # produce the static site in dist/
```

Then open the printed URL, paste some lines, and press **Map it**.

## Privacy

Gistmap makes no requests to any server with your text. The only network traffic is the
one-time download of the embedding model weights from the CDN (cached thereafter). Everything
else — embedding, clustering, labeling, projection, rendering — happens in your browser.

## License

MIT © ctkrug. See [`LICENSE`](LICENSE).
