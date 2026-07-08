---
title: "Gistmap: clustering a messy list with a sentence-transformer that never leaves the browser"
published: false
tags: javascript, webassembly, machinelearning, webdev
---

I keep pasting piles of short text somewhere to make sense of them: a column of survey answers,
a dump of feature requests, a hundred half-sorted to-dos. The useful next step is almost always
the same. I want to see the groups. What are the natural themes, and what is each one about?

The usual options all felt like too much. A cloud LLM means my text leaves the machine and I get
prose back instead of a durable map. A notebook means writing Python and installing packages. A
"real" data tool means signing up and learning a UI. So I built [Gistmap](https://github.com/ctkrug/gistmap):
paste a list, and a live 2D map groups the similar lines and names each group, with nothing
uploaded. The whole pipeline runs in the browser tab. Here are the two decisions that shaped it.

## Running a real embedding model client-side

The core claim is "nothing you paste leaves the tab," so the embeddings had to be computed
locally. I used [Transformers.js](https://huggingface.co/docs/transformers.js) to run
`all-MiniLM-L6-v2`, a quantized sentence-transformer that is about 7 MB, on WebAssembly. The
pipeline is small once you accept two constraints.

First, the model loads once and is reused. A rejected load is still a truthy promise, which bit
me: caching the promise meant a single transient network blip permanently broke the page, because
every retry returned the same dead promise. The fix is to clear the cached promise on failure so
Retry actually retries:

```js
let extractorPromise = null
export async function getExtractor(onProgress) {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers')
      env.allowLocalModels = false
      return pipeline('feature-extraction', 'Xenova/all-MiniLM-L6-v2', { progress_callback: onProgress })
    })().catch((err) => {
      extractorPromise = null // otherwise the singleton replays the failure forever
      throw err
    })
  }
  return extractorPromise
}
```

Second, I cap input at 500 lines. The model embeds every line, so an accidental mega-paste turns
the "wow moment" into a multi-minute hang. Gistmap maps the first 500 and tells you how many it
left out, rather than silently wedging the tab.

## Keeping the math pure so it is testable

Embedding is the part that needs a browser. Everything after it is ordinary math: k-means with a
k-means++ seed, an elbow scan to pick a cluster count, a PCA projection to 2D, and a class-based
TF-IDF to label each cluster from its most distinctive terms. I kept all of that in DOM-free
modules that take arrays in and return arrays out, so I can unit-test them with fake vectors and
never boot a canvas or a network. That split is why the suite covers the logic at 100% of lines
while the browser-only glue stays thin.

The labeling detail I like most is the c-TF-IDF: for each cluster, score a term by how often it
appears inside the cluster times the inverse of how widely it appears across the whole list. That
turns "Cluster 3" into "billing, refund, invoice", which is the difference between a chart and an
answer.

## What I would do differently

The one honest gap is offline support. Gistmap makes no network calls with your text, but it does
not yet ship a service worker to cache the app shell and model weights, so a reload still needs
the network. That is the next thing I would add. I would also try a UMAP-style projection; PCA is
fast and stable but sometimes flattens clusters that a neighbor-based method would keep distinct.

The map itself is a Canvas 2D starfield: points snap from a scatter into their clusters, faint
lines connect each star to its constellation centroid, and hovering a star reads back its line.
It renders at device pixel ratio and honors `prefers-reduced-motion`.

Try it: [apps.charliekrug.com/gistmap](https://apps.charliekrug.com/gistmap/)
Source: [github.com/ctkrug/gistmap](https://github.com/ctkrug/gistmap)

If you paste something into it, I would love to know where the clustering felt right and where it
felt off.
