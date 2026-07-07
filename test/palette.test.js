import { describe, it, expect } from 'vitest'
import { CLUSTER_COLORS, clusterColor } from '../src/lib/palette.js'

describe('palette', () => {
  it('exposes twelve distinct hex colors', () => {
    expect(CLUSTER_COLORS).toHaveLength(12)
    expect(new Set(CLUSTER_COLORS).size).toBe(12)
    for (const c of CLUSTER_COLORS) expect(c).toMatch(/^#[0-9a-f]{6}$/i)
  })

  it('wraps cluster ids around the palette', () => {
    expect(clusterColor(0)).toBe(CLUSTER_COLORS[0])
    expect(clusterColor(12)).toBe(CLUSTER_COLORS[0])
    expect(clusterColor(13)).toBe(CLUSTER_COLORS[1])
  })
})
