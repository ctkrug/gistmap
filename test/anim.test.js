import { describe, it, expect } from 'vitest'
import { easeOutCubic, lerp, clamp01, staggeredProgress } from '../src/lib/anim.js'

describe('easeOutCubic', () => {
  it('pins the endpoints', () => {
    expect(easeOutCubic(0)).toBe(0)
    expect(easeOutCubic(1)).toBe(1)
  })
  it('clamps out-of-range input', () => {
    expect(easeOutCubic(-5)).toBe(0)
    expect(easeOutCubic(5)).toBe(1)
  })
  it('decelerates: past the halfway mark by t=0.5', () => {
    expect(easeOutCubic(0.5)).toBeGreaterThan(0.5)
  })
})

describe('lerp', () => {
  it('interpolates linearly', () => {
    expect(lerp(0, 10, 0.5)).toBe(5)
    expect(lerp(-1, 1, 0)).toBe(-1)
    expect(lerp(-1, 1, 1)).toBe(1)
  })
})

describe('clamp01', () => {
  it('bounds to the unit interval', () => {
    expect(clamp01(-2)).toBe(0)
    expect(clamp01(0.3)).toBe(0.3)
    expect(clamp01(9)).toBe(1)
  })
})

describe('staggeredProgress', () => {
  it('is 0 at the very start and 1 well past the window', () => {
    expect(staggeredProgress(0, 400, 0, 10)).toBe(0)
    expect(staggeredProgress(1000, 400, 9, 10)).toBe(1)
  })
  it('later points start after earlier points', () => {
    // At a moment early in the window, point 0 has more progress than point 9.
    const early = 60
    expect(staggeredProgress(early, 400, 0, 10)).toBeGreaterThan(
      staggeredProgress(early, 400, 9, 10),
    )
  })
  it('returns 1 immediately for a zero-length animation', () => {
    expect(staggeredProgress(0, 0, 3, 10)).toBe(1)
  })
  it('handles a single point without dividing by zero', () => {
    const p = staggeredProgress(200, 400, 0, 1)
    expect(Number.isFinite(p)).toBe(true)
    expect(p).toBeGreaterThan(0)
  })
  it('stays finite when the settle window collapses (stagger = 1)', () => {
    // stagger=1 makes window=0; the `window || duration` guard must kick in.
    const p = staggeredProgress(100, 400, 5, 10, 1)
    expect(Number.isFinite(p)).toBe(true)
    expect(p).toBeGreaterThanOrEqual(0)
    expect(p).toBeLessThanOrEqual(1)
  })
})
