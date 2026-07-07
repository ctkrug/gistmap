import { describe, it, expect } from 'vitest'
import { projectPCA, normalizeCoords } from '../src/lib/project.js'

describe('projectPCA', () => {
  it('returns one coordinate per input vector', () => {
    const vecs = [
      [1, 0, 0], [2, 0, 0], [0, 1, 0], [0, 2, 0],
    ]
    const coords = projectPCA(vecs)
    expect(coords).toHaveLength(4)
    for (const c of coords) {
      expect(Number.isFinite(c.x)).toBe(true)
      expect(Number.isFinite(c.y)).toBe(true)
    }
  })

  it('keeps output within the [-1, 1] box', () => {
    const vecs = Array.from({ length: 20 }, (_, i) => [i, i * 2, -i, i % 3])
    const coords = projectPCA(vecs)
    for (const c of coords) {
      expect(Math.abs(c.x)).toBeLessThanOrEqual(1.0001)
      expect(Math.abs(c.y)).toBeLessThanOrEqual(1.0001)
    }
  })

  it('separates two distinct groups along an axis', () => {
    // Group A near origin, group B far away — should land on opposite sides.
    const vecs = [
      [0, 0, 0], [0.1, 0, 0], [0, 0.1, 0],
      [9, 9, 9], [9.1, 9, 9], [9, 9.1, 9],
    ]
    const coords = projectPCA(vecs)
    const meanA = (coords[0].x + coords[1].x + coords[2].x) / 3
    const meanB = (coords[3].x + coords[4].x + coords[5].x) / 3
    expect(Math.abs(meanA - meanB)).toBeGreaterThan(0.5)
  })

  it('handles trivial sizes', () => {
    expect(projectPCA([])).toEqual([])
    expect(projectPCA([[1, 2, 3]])).toEqual([{ x: 0, y: 0 }])
  })
})

describe('normalizeCoords', () => {
  it('centers and scales into the box', () => {
    const out = normalizeCoords([{ x: 0, y: 0 }, { x: 10, y: 10 }])
    expect(out[0].x).toBeCloseTo(-1)
    expect(out[1].x).toBeCloseTo(1)
  })

  it('collapses coincident points to the origin without dividing by zero', () => {
    // Zero span on both axes → the `|| 1` guard keeps the result finite.
    const out = normalizeCoords([{ x: 2, y: 2 }, { x: 2, y: 2 }])
    expect(out).toEqual([{ x: 0, y: 0 }, { x: 0, y: 0 }])
  })

  it('is empty for an empty input', () => {
    expect(normalizeCoords([])).toEqual([])
  })
})
