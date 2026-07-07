// Pure 2D geometry for the map renderer: mapping normalized model coordinates
// into screen pixels, hit-testing the nearest point under the cursor, the
// scatter start-state for the snap animation, and coordinate rotation for
// reprojection. Kept DOM-free so the renderer's math is unit-testable.

/**
 * Map points with normalized coords (x,y in [-1,1]) into screen pixels inside
 * a `w`×`h` box with `pad` px of margin. Preserves the incoming aspect ratio.
 * @param {{x:number,y:number}[]} points
 * @returns {{x:number,y:number}[]} screen coordinates
 */
export function scaleToViewport(points, w, h, pad = 48) {
  const innerW = Math.max(1, w - 2 * pad)
  const innerH = Math.max(1, h - 2 * pad)
  return points.map((p) => ({
    x: pad + ((p.x + 1) / 2) * innerW,
    y: pad + ((p.y + 1) / 2) * innerH,
  }))
}

/**
 * Index of the point nearest (px,py) within `radius` px, or -1 if none.
 * @param {number} px
 * @param {number} py
 * @param {{x:number,y:number}[]} screenPoints
 * @param {number} radius
 */
export function pickNearest(px, py, screenPoints, radius = 14) {
  let best = -1
  let bestD = radius * radius
  for (let i = 0; i < screenPoints.length; i++) {
    const dx = screenPoints[i].x - px
    const dy = screenPoints[i].y - py
    const d = dx * dx + dy * dy
    if (d <= bestD) {
      bestD = d
      best = i
    }
  }
  return best
}

/**
 * Random start positions for the snap animation — points begin scattered and
 * settle into their cluster layout. `rand` is a seeded [0,1) generator so the
 * scatter is reproducible.
 * @param {number} n
 * @param {() => number} rand
 * @returns {{x:number,y:number}[]} normalized [-1,1] coordinates
 */
export function scatterPositions(n, rand) {
  const out = []
  for (let i = 0; i < n; i++) {
    // Uniform-ish disc so the scatter reads as a cloud, not a square.
    const angle = rand() * Math.PI * 2
    const r = Math.sqrt(rand())
    out.push({ x: Math.cos(angle) * r, y: Math.sin(angle) * r })
  }
  return out
}

/**
 * Rotate normalized coords about the origin by `angle` radians. Used by
 * reproject to give a visibly different layout without touching cluster
 * membership. Coordinates stay within their original bounds up to the rotation.
 * @param {{x:number,y:number}[]} coords
 * @param {number} angle
 */
export function rotateCoords(coords, angle) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return coords.map((c) => ({
    x: c.x * cos - c.y * sin,
    y: c.x * sin + c.y * cos,
  }))
}
