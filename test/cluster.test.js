import { describe, it, expect } from 'vitest'
import { kmeans, estimateK } from '../src/lib/cluster.js'

// Three well-separated blobs in 2D.
const blobs = [
  [0, 0], [0.1, -0.1], [-0.1, 0.1],
  [10, 10], [10.1, 9.9], [9.9, 10.1],
  [-10, 8], [-10.2, 8.1], [-9.8, 7.9],
]

describe('kmeans', () => {
  it('recovers three separated blobs', () => {
    const { assignments } = kmeans(blobs, 3)
    // Points within a blob share a label; blobs differ.
    expect(assignments[0]).toBe(assignments[1])
    expect(assignments[1]).toBe(assignments[2])
    expect(assignments[3]).toBe(assignments[4])
    expect(assignments[0]).not.toBe(assignments[3])
    expect(assignments[3]).not.toBe(assignments[6])
  })

  it('is deterministic for a fixed seed', () => {
    const a = kmeans(blobs, 3, { seed: 42 }).assignments
    const b = kmeans(blobs, 3, { seed: 42 }).assignments
    expect(a).toEqual(b)
  })

  it('clamps k to the number of points', () => {
    const { k, centroids } = kmeans([[1, 1], [2, 2]], 9)
    expect(k).toBe(2)
    expect(centroids).toHaveLength(2)
  })

  it('returns empty structure for no input', () => {
    expect(kmeans([], 3)).toEqual({ assignments: [], centroids: [], inertia: 0, k: 0 })
  })

  it('inertia is lower for more clusters', () => {
    const i2 = kmeans(blobs, 2).inertia
    const i3 = kmeans(blobs, 3).inertia
    expect(i3).toBeLessThan(i2)
  })
})

describe('estimateK', () => {
  it('finds the elbow at three blobs', () => {
    expect(estimateK(blobs, { kMax: 6 })).toBe(3)
  })

  it('handles tiny inputs', () => {
    expect(estimateK([[1, 1]])).toBe(1)
    expect(estimateK([[1, 1], [2, 2]])).toBe(2)
  })
})
