// Pure animation math: easing, interpolation, and the staggered-progress curve
// that drives the constellation "snap" (points settle in a gentle wave rather
// than all at once). No timers or DOM here — the render loop supplies elapsed
// time and these functions return the eased 0..1 progress for a given point.

/** Ease-out cubic: fast start, soft landing. t clamped to [0,1]. */
export function easeOutCubic(t) {
  const c = clamp01(t)
  return 1 - Math.pow(1 - c, 3)
}

/** Linear interpolation. */
export function lerp(a, b, t) {
  return a + (b - a) * t
}

/** Clamp to [0,1]. */
export function clamp01(t) {
  if (t < 0) return 0
  if (t > 1) return 1
  return t
}

/**
 * Eased progress of point `index` at `elapsed` ms, where each point's start is
 * staggered so the cluster forms in a wave. Total duration for the last point
 * is `duration`; earlier points finish sooner. `stagger` (0..1) is the fraction
 * of the window spread across the point starts.
 *
 * @param {number} elapsed  ms since the animation began
 * @param {number} duration total animation window in ms
 * @param {number} index    point index
 * @param {number} n        total points
 * @param {number} stagger  0..1 spread of start times (0 = all together)
 * @returns {number} eased progress in [0,1]
 */
export function staggeredProgress(elapsed, duration, index, n, stagger = 0.4) {
  if (duration <= 0) return 1
  const s = clamp01(stagger)
  const window = duration * (1 - s)
  const start = n <= 1 ? 0 : (index / (n - 1)) * (duration * s)
  const raw = (elapsed - start) / (window || duration)
  return easeOutCubic(raw)
}
