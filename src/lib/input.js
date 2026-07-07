// Parse the paste box into clean, mappable lines. Pure and DOM-free so the
// trimming, blank-dropping, and size-capping are unit-testable. The cap keeps
// a hostile or accidental mega-paste from freezing the tab: the on-device
// model embeds every line, so past a few hundred the "wow moment" turns into a
// multi-minute hang. We map the first MAX_LINES and tell the user the rest
// were dropped rather than silently wedging.

export const MAX_LINES = 500

/**
 * @param {string} text  raw textarea contents
 * @param {{max?: number}} [opts]
 * @returns {{ lines: string[], truncated: number }} cleaned lines and the
 *   count dropped by the cap (0 if none).
 */
export function parseLines(text, opts = {}) {
  const max = opts.max ?? MAX_LINES
  const all = String(text ?? '')
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
  if (all.length <= max) return { lines: all, truncated: 0 }
  return { lines: all.slice(0, max), truncated: all.length - max }
}
