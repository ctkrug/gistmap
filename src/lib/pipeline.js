// The end-to-end mapping pipeline, independent of the DOM: given embeddings
// and their source texts, cluster → project → label into a map model the
// renderer can draw. Kept pure so it is fully unit-testable with fake vectors.

import { kmeans, estimateK } from './cluster.js'
import { projectPCA } from './project.js'
import { labelClusters } from './labels.js'
import { rotateCoords } from './geometry.js'
import { normalizeCoords } from './project.js'

/**
 * @param {number[][]} vectors  embeddings (already normalized)
 * @param {string[]}   texts    source lines, aligned to vectors
 * @param {object}     opts     { k?: number, seed?: number }
 * @returns {{
 *   k: number,
 *   points: { text: string, x: number, y: number, cluster: number }[],
 *   clusters: { id: number, label: string, size: number }[],
 * }}
 */
export function buildMap(vectors, texts, opts = {}) {
  const n = vectors.length
  if (n === 0) return { k: 0, points: [], clusters: [] }

  const k = clampK(opts.k ?? estimateK(vectors), n)
  const { assignments } = kmeans(vectors, k, { seed: opts.seed ?? 1337 })
  const coords = projectPCA(vectors, { seed: opts.seed ?? 7 })
  const labels = labelClusters(texts, assignments, k)

  const sizes = new Array(k).fill(0)
  for (const c of assignments) sizes[c]++

  const points = texts.map((text, i) => ({
    text,
    x: coords[i].x,
    y: coords[i].y,
    cluster: assignments[i],
  }))

  // Degenerate input (e.g. every line embeds to the same vector) can leave
  // k-means unable to populate every requested cluster; drop the empty ones
  // rather than surface a phantom "misc, 0" constellation in the legend and
  // exports. `points[].cluster` keeps its original id either way, so this
  // never breaks centroid/color lookups by id.
  const clusters = labels.map((label, id) => ({ id, label, size: sizes[id] })).filter((c) => c.size > 0)

  return { k, points, clusters }
}

export function clampK(k, n) {
  return Math.max(1, Math.min(Math.round(k), n))
}

/**
 * Return a copy of `map` with its 2D layout rotated by `angle` radians and
 * re-normalized into the [-1,1] box. Cluster membership, labels, and sizes are
 * untouched — reproject changes only where points sit, never what they mean.
 * @param {ReturnType<typeof buildMap>} map
 * @param {number} angle
 */
export function reprojectMap(map, angle) {
  if (!map.points.length) return map
  const rotated = normalizeCoords(rotateCoords(map.points.map((p) => ({ x: p.x, y: p.y })), angle))
  const points = map.points.map((p, i) => ({ ...p, x: rotated[i].x, y: rotated[i].y }))
  return { ...map, points }
}
