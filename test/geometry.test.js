import { describe, it, expect } from 'vitest'
import {
  scaleToViewport,
  pickNearest,
  scatterPositions,
  rotateCoords,
} from '../src/lib/geometry.js'
import { mulberry32 } from '../src/lib/rng.js'

describe('scaleToViewport', () => {
  it('maps the normalized corners into the padded box', () => {
    const pts = [
      { x: -1, y: -1 },
      { x: 1, y: 1 },
      { x: 0, y: 0 },
    ]
    const s = scaleToViewport(pts, 200, 200, 20)
    expect(s[0]).toEqual({ x: 20, y: 20 })
    expect(s[1]).toEqual({ x: 180, y: 180 })
    expect(s[2]).toEqual({ x: 100, y: 100 })
  })

  it('never divides by zero for a degenerate viewport', () => {
    const s = scaleToViewport([{ x: 0, y: 0 }], 0, 0, 0)
    expect(Number.isFinite(s[0].x)).toBe(true)
    expect(Number.isFinite(s[0].y)).toBe(true)
  })
})

describe('pickNearest', () => {
  const pts = [
    { x: 10, y: 10 },
    { x: 100, y: 100 },
    { x: 50, y: 50 },
  ]
  it('returns the index of the closest point within radius', () => {
    expect(pickNearest(12, 9, pts, 14)).toBe(0)
    expect(pickNearest(52, 47, pts, 14)).toBe(2)
  })
  it('returns -1 when nothing is within radius', () => {
    expect(pickNearest(500, 500, pts, 14)).toBe(-1)
  })
  it('returns -1 for an empty set', () => {
    expect(pickNearest(0, 0, [], 14)).toBe(-1)
  })
})

describe('scatterPositions', () => {
  it('produces n points inside the unit disc, deterministically', () => {
    const a = scatterPositions(50, mulberry32(1))
    const b = scatterPositions(50, mulberry32(1))
    expect(a).toEqual(b)
    expect(a).toHaveLength(50)
    for (const p of a) {
      expect(Math.hypot(p.x, p.y)).toBeLessThanOrEqual(1.0001)
    }
  })
  it('returns an empty array for zero points', () => {
    expect(scatterPositions(0, mulberry32(1))).toEqual([])
  })
})

describe('rotateCoords', () => {
  it('rotating by 2π is a near-identity', () => {
    const c = [{ x: 0.5, y: -0.3 }]
    const r = rotateCoords(c, Math.PI * 2)
    expect(r[0].x).toBeCloseTo(0.5, 6)
    expect(r[0].y).toBeCloseTo(-0.3, 6)
  })
  it('rotating by 90° swaps axes as expected', () => {
    const r = rotateCoords([{ x: 1, y: 0 }], Math.PI / 2)
    expect(r[0].x).toBeCloseTo(0, 6)
    expect(r[0].y).toBeCloseTo(1, 6)
  })
  it('preserves the distance from the origin', () => {
    const c = { x: 0.4, y: 0.7 }
    const r = rotateCoords([c], 1.234)[0]
    expect(Math.hypot(r.x, r.y)).toBeCloseTo(Math.hypot(c.x, c.y), 6)
  })
})
