// Small vector helpers used by clustering and projection.
// Vectors are plain Arrays / Float32Arrays of equal length.

export function dot(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) s += a[i] * b[i]
  return s
}

export function norm(a) {
  return Math.sqrt(dot(a, a))
}

/** Cosine similarity in [-1, 1]. Returns 0 if either vector is zero-length. */
export function cosine(a, b) {
  const na = norm(a)
  const nb = norm(b)
  if (na === 0 || nb === 0) return 0
  return dot(a, b) / (na * nb)
}

/** Euclidean distance between two equal-length vectors. */
export function euclidean(a, b) {
  let s = 0
  for (let i = 0; i < a.length; i++) {
    const d = a[i] - b[i]
    s += d * d
  }
  return Math.sqrt(s)
}

/** Element-wise mean of a list of equal-length vectors. */
export function centroid(vectors) {
  if (vectors.length === 0) return []
  const dim = vectors[0].length
  const out = new Array(dim).fill(0)
  for (const v of vectors) {
    for (let i = 0; i < dim; i++) out[i] += v[i]
  }
  for (let i = 0; i < dim; i++) out[i] /= vectors.length
  return out
}

/** Return a copy scaled to unit length (L2). Zero vectors are returned as-is. */
export function normalize(a) {
  const n = norm(a)
  if (n === 0) return Array.from(a)
  return Array.from(a, (x) => x / n)
}
