// Automatic cluster labeling. For each cluster we score terms by how
// distinctive they are to that cluster (a class-based TF-IDF), then join the
// top few into a readable name — so a cluster reads "billing, refund, invoice"
// rather than "Cluster 3".

const STOPWORDS = new Set(
  ('a an the and or but if then else of to in on at for with without from by is are was were be ' +
    'been being it its this that these those i you he she we they me my your our their as so not no ' +
    'do does did done have has had will would can could should may might must about into over under ' +
    'up down out just more most some any all each every than too very can\'t won\'t don\'t im ive'
  ).split(/\s+/),
)

export function tokenize(text) {
  return String(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s']/g, ' ')
    .split(/\s+/)
    .filter((t) => t.length > 2 && !STOPWORDS.has(t) && !/^\d+$/.test(t))
}

/**
 * @param {string[]} texts
 * @param {number[]} assignments  cluster index per text
 * @param {number}   k            number of clusters
 * @param {object}   opts         { topN = 3 }
 * @returns {string[]} label per cluster index
 */
export function labelClusters(texts, assignments, k, opts = {}) {
  const topN = opts.topN ?? 3
  // Document frequency across the whole corpus.
  const clusterCounts = Array.from({ length: k }, () => new Map())
  const globalDocFreq = new Map()

  for (let i = 0; i < texts.length; i++) {
    const c = assignments[i]
    if (c == null || c < 0 || c >= k) continue
    const seen = new Set(tokenize(texts[i]))
    for (const term of seen) {
      clusterCounts[c].set(term, (clusterCounts[c].get(term) || 0) + 1)
      globalDocFreq.set(term, (globalDocFreq.get(term) || 0) + 1)
    }
  }

  const totalDocs = texts.length || 1
  return clusterCounts.map((counts) => {
    const scored = []
    for (const [term, tf] of counts) {
      // c-TF-IDF: term frequency in cluster × inverse of global spread.
      const idf = Math.log(1 + totalDocs / (globalDocFreq.get(term) || 1))
      scored.push({ term, score: tf * idf })
    }
    scored.sort((a, b) => b.score - a.score || a.term.localeCompare(b.term))
    const top = scored.slice(0, topN).map((s) => s.term)
    return top.length ? top.join(' · ') : 'misc'
  })
}
