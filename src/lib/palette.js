// A 12-hue palette tuned for the ink-blue background: mid-saturation, ~65%
// lightness so up to a dozen constellations stay distinct and legible.
// Pure data so it is importable by both the renderer and tests.

export const CLUSTER_COLORS = [
  '#e7b24c', // brass
  '#5ec6d8', // phosphor cyan
  '#79d79a', // sea green
  '#e8746b', // coral
  '#b48ce8', // lilac
  '#e8a3c8', // rose
  '#8cc6e8', // sky
  '#d8cf5e', // citron
  '#6ee0c4', // aqua
  '#e89a5e', // amber-orange
  '#9ad86e', // lime
  '#c0a0d8', // mauve
]

/** Color for a cluster id, wrapping if there are more clusters than hues. */
export function clusterColor(id) {
  return CLUSTER_COLORS[((id % CLUSTER_COLORS.length) + CLUSTER_COLORS.length) % CLUSTER_COLORS.length]
}
