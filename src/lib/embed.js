// In-browser embeddings via Transformers.js (WASM). Lazily loads the quantized
// all-MiniLM-L6-v2 sentence-transformer (~7 MB) on first use, caches the
// pipeline, and returns normalized mean-pooled sentence vectors.
//
// This module is browser-only (it fetches model weights); the pure math it
// feeds — clustering, projection, labeling — lives in sibling modules and is
// what the unit tests exercise.

const MODEL_ID = 'Xenova/all-MiniLM-L6-v2'

let extractorPromise = null

/**
 * Load (once) and return the feature-extraction pipeline.
 * @param {(p:{status:string,progress?:number})=>void} [onProgress]
 */
export async function getExtractor(onProgress) {
  if (!extractorPromise) {
    extractorPromise = (async () => {
      const { pipeline, env } = await import('@huggingface/transformers')
      // Keep everything local to the browser: no remote code execution.
      env.allowLocalModels = false
      return pipeline('feature-extraction', MODEL_ID, {
        progress_callback: onProgress,
      })
    })().catch((err) => {
      // A rejected promise is still truthy, so without this the singleton
      // above would replay the same failure forever — e.g. a transient
      // network blip permanently breaks the page even after Retry, since
      // getExtractor() would keep returning this same dead promise.
      extractorPromise = null
      throw err
    })
  }
  return extractorPromise
}

/**
 * Embed an array of strings into an array of normalized vectors.
 * @param {string[]} texts
 * @param {{onProgress?:Function, batchSize?:number}} [opts]
 * @returns {Promise<number[][]>}
 */
export async function embedTexts(texts, opts = {}) {
  const extractor = await getExtractor(opts.onProgress)
  const output = await extractor(texts, { pooling: 'mean', normalize: true })
  // output is a Tensor of shape [n, dim]; tolist() gives plain arrays.
  return output.tolist()
}

export { MODEL_ID }
