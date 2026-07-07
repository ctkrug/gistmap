// k-means clustering with k-means++ seeding and an automatic k estimate.
// Operates on an array of equal-length numeric vectors.

import { euclidean, centroid } from './vec.js'
import { mulberry32 } from './rng.js'

function nearest(point, centroids) {
  let best = 0
  let bestD = Infinity
  for (let c = 0; c < centroids.length; c++) {
    const d = euclidean(point, centroids[c])
    if (d < bestD) {
      bestD = d
      best = c
    }
  }
  return { index: best, dist: bestD }
}

/** k-means++ seeding: spread initial centroids proportional to squared distance. */
function seed(vectors, k, rand) {
  const centroids = [vectors[Math.floor(rand() * vectors.length)]]
  while (centroids.length < k) {
    const d2 = vectors.map((v) => {
      const { dist } = nearest(v, centroids)
      return dist * dist
    })
    const total = d2.reduce((a, b) => a + b, 0)
    if (total === 0) {
      // All remaining points coincide with a centroid; pad with any point.
      centroids.push(vectors[Math.floor(rand() * vectors.length)])
      continue
    }
    let r = rand() * total
    let idx = 0
    while (r > d2[idx] && idx < d2.length - 1) {
      r -= d2[idx]
      idx++
    }
    centroids.push(vectors[idx])
  }
  return centroids.map((c) => Array.from(c))
}

/**
 * Run k-means.
 * @returns {{ assignments: number[], centroids: number[][], inertia: number, k: number }}
 */
export function kmeans(vectors, k, opts = {}) {
  const { maxIter = 50, seed: seedVal = 1337 } = opts
  const n = vectors.length
  if (n === 0) return { assignments: [], centroids: [], inertia: 0, k: 0 }
  k = Math.max(1, Math.min(k, n))

  const rand = mulberry32(seedVal)
  let centroids = seed(vectors, k, rand)
  let assignments = new Array(n).fill(0)

  for (let iter = 0; iter < maxIter; iter++) {
    let changed = false
    for (let i = 0; i < n; i++) {
      const { index } = nearest(vectors[i], centroids)
      if (index !== assignments[i]) {
        assignments[i] = index
        changed = true
      }
    }
    // Recompute centroids from members; keep empty clusters put.
    const groups = Array.from({ length: k }, () => [])
    for (let i = 0; i < n; i++) groups[assignments[i]].push(vectors[i])
    centroids = groups.map((g, c) => (g.length ? centroid(g) : centroids[c]))
    if (!changed) break
  }

  let inertia = 0
  for (let i = 0; i < n; i++) {
    const d = euclidean(vectors[i], centroids[assignments[i]])
    inertia += d * d
  }
  return { assignments, centroids, inertia, k }
}

/**
 * Estimate a reasonable k via the elbow of the inertia curve.
 * Scans k in [kMin, kMax] and picks the point of maximum curvature.
 */
export function estimateK(vectors, opts = {}) {
  const n = vectors.length
  if (n <= 2) return Math.max(1, n)
  const kMax = Math.min(opts.kMax ?? 10, n - 1)
  const kMin = Math.max(2, opts.kMin ?? 2)
  if (kMax < kMin) return kMin

  const inertias = []
  for (let k = kMin; k <= kMax; k++) {
    inertias.push(kmeans(vectors, k, opts).inertia)
  }
  // Distance-to-line elbow: pick k whose inertia point is farthest from the
  // chord joining the first and last measured points.
  let bestK = kMin
  let bestDist = -Infinity
  const x0 = kMin
  const y0 = inertias[0]
  const x1 = kMax
  const y1 = inertias[inertias.length - 1]
  const dx = x1 - x0
  const dy = y1 - y0
  const denom = Math.hypot(dx, dy) || 1
  for (let i = 0; i < inertias.length; i++) {
    const x = kMin + i
    const y = inertias[i]
    const dist = Math.abs(dy * x - dx * y + x1 * y0 - y1 * x0) / denom
    if (dist > bestDist) {
      bestDist = dist
      bestK = x
    }
  }
  return bestK
}
