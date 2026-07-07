// Project high-dimensional embeddings to 2D for the map, using PCA (the top
// two principal components via power iteration + deflation). Deterministic,
// dependency-free, and good enough to give clusters visible separation.

import { mulberry32 } from './rng.js'

function meanVector(vectors) {
  const dim = vectors[0].length
  const mean = new Array(dim).fill(0)
  for (const v of vectors) for (let i = 0; i < dim; i++) mean[i] += v[i]
  for (let i = 0; i < dim; i++) mean[i] /= vectors.length
  return mean
}

function center(vectors, mean) {
  return vectors.map((v) => v.map((x, i) => x - mean[i]))
}

// Dominant eigenvector of the covariance of `centered` via power iteration.
// We never materialize the covariance matrix: cov·w = Xᵀ(Xw) / n.
function powerIteration(centered, dim, rand, iters = 100) {
  let w = Array.from({ length: dim }, () => rand() * 2 - 1)
  let wn = Math.hypot(...w) || 1
  w = w.map((x) => x / wn)

  for (let it = 0; it < iters; it++) {
    // proj[i] = centered[i] · w
    const proj = centered.map((row) => {
      let s = 0
      for (let j = 0; j < dim; j++) s += row[j] * w[j]
      return s
    })
    // next = Xᵀ · proj
    const next = new Array(dim).fill(0)
    for (let i = 0; i < centered.length; i++) {
      const p = proj[i]
      const row = centered[i]
      for (let j = 0; j < dim; j++) next[j] += row[j] * p
    }
    const n = Math.hypot(...next) || 1
    for (let j = 0; j < dim; j++) next[j] /= n
    w = next
  }
  return w
}

// Remove the component of each row along direction `w` (deflation).
function deflate(centered, w) {
  return centered.map((row) => {
    let p = 0
    for (let j = 0; j < row.length; j++) p += row[j] * w[j]
    return row.map((x, j) => x - p * w[j])
  })
}

/**
 * @param {number[][]} vectors  high-dim embeddings
 * @returns {{x:number,y:number}[]} 2D coordinates, normalized into [-1, 1]
 */
export function projectPCA(vectors, opts = {}) {
  const n = vectors.length
  if (n === 0) return []
  if (n === 1) return [{ x: 0, y: 0 }]
  const dim = vectors[0].length
  const rand = mulberry32(opts.seed ?? 7)

  const mean = meanVector(vectors)
  const centered = center(vectors, mean)

  const pc1 = powerIteration(centered, dim, rand, opts.iters ?? 100)
  const deflated = deflate(centered, pc1)
  const pc2 = powerIteration(deflated, dim, rand, opts.iters ?? 100)

  const coords = centered.map((row) => {
    let x = 0
    let y = 0
    for (let j = 0; j < dim; j++) {
      x += row[j] * pc1[j]
      y += row[j] * pc2[j]
    }
    return { x, y }
  })

  return normalizeCoords(coords)
}

/** Scale coordinates into the [-1, 1] box, preserving aspect ratio. */
export function normalizeCoords(coords) {
  let minX = Infinity
  let maxX = -Infinity
  let minY = Infinity
  let maxY = -Infinity
  for (const c of coords) {
    if (c.x < minX) minX = c.x
    if (c.x > maxX) maxX = c.x
    if (c.y < minY) minY = c.y
    if (c.y > maxY) maxY = c.y
  }
  const spanX = maxX - minX || 1
  const spanY = maxY - minY || 1
  const span = Math.max(spanX, spanY)
  const cx = (minX + maxX) / 2
  const cy = (minY + maxY) / 2
  return coords.map((c) => ({
    x: (2 * (c.x - cx)) / span,
    y: (2 * (c.y - cy)) / span,
  }))
}
