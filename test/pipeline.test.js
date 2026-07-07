import { describe, it, expect } from 'vitest'
import { buildMap, clampK, reprojectMap } from '../src/lib/pipeline.js'

// Fake "embeddings": three separable groups so we don't need the WASM model.
const vectors = [
  [1, 0, 0], [0.9, 0.1, 0], [1, 0.1, 0.1],
  [0, 1, 0], [0.1, 0.9, 0], [0, 1, 0.1],
  [0, 0, 1], [0.1, 0, 0.9], [0, 0.1, 1],
]
const texts = [
  'apple orange banana', 'orange banana grape', 'apple grape melon',
  'car truck bus', 'truck bus train', 'car train tram',
  'python rust golang', 'rust golang java', 'python java kotlin',
]

describe('buildMap', () => {
  it('returns aligned points, coordinates, and labels', () => {
    const map = buildMap(vectors, texts, { k: 3 })
    expect(map.k).toBe(3)
    expect(map.points).toHaveLength(9)
    expect(map.clusters).toHaveLength(3)
    for (const p of map.points) {
      expect(typeof p.text).toBe('string')
      expect(Number.isFinite(p.x)).toBe(true)
      expect(p.cluster).toBeGreaterThanOrEqual(0)
      expect(p.cluster).toBeLessThan(3)
    }
  })

  it('cluster sizes sum to the number of points', () => {
    const map = buildMap(vectors, texts, { k: 3 })
    const total = map.clusters.reduce((s, c) => s + c.size, 0)
    expect(total).toBe(9)
  })

  it('every cluster has a non-empty label', () => {
    const map = buildMap(vectors, texts, { k: 3 })
    for (const c of map.clusters) expect(c.label.length).toBeGreaterThan(0)
  })

  it('handles empty input gracefully', () => {
    expect(buildMap([], [])).toEqual({ k: 0, points: [], clusters: [] })
  })

  it('estimates k automatically when none is supplied', () => {
    // No opts.k → buildMap falls through to estimateK; three separable groups
    // should yield a small, sane cluster count.
    const map = buildMap(vectors, texts)
    expect(map.k).toBeGreaterThanOrEqual(1)
    expect(map.k).toBeLessThanOrEqual(vectors.length)
    expect(map.points).toHaveLength(vectors.length)
    const total = map.clusters.reduce((s, c) => s + c.size, 0)
    expect(total).toBe(vectors.length)
  })
})

describe('reprojectMap', () => {
  it('keeps cluster membership and labels, changes positions', () => {
    const map = buildMap(vectors, texts, { k: 3 })
    const re = reprojectMap(map, Math.PI / 3)
    expect(re.points.map((p) => p.cluster)).toEqual(map.points.map((p) => p.cluster))
    expect(re.clusters).toEqual(map.clusters)
    const moved = re.points.some((p, i) => Math.abs(p.x - map.points[i].x) > 1e-6)
    expect(moved).toBe(true)
  })

  it('stays within the normalized [-1,1] box', () => {
    const re = reprojectMap(buildMap(vectors, texts, { k: 3 }), 1.1)
    for (const p of re.points) {
      expect(p.x).toBeGreaterThanOrEqual(-1.0001)
      expect(p.x).toBeLessThanOrEqual(1.0001)
      expect(p.y).toBeGreaterThanOrEqual(-1.0001)
      expect(p.y).toBeLessThanOrEqual(1.0001)
    }
  })

  it('is a no-op for an empty map', () => {
    const empty = buildMap([], [])
    expect(reprojectMap(empty, 1)).toEqual(empty)
  })
})

describe('clampK', () => {
  it('bounds k between 1 and n', () => {
    expect(clampK(0, 5)).toBe(1)
    expect(clampK(99, 5)).toBe(5)
    expect(clampK(3.4, 5)).toBe(3)
  })
})
