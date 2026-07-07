// Canvas renderer for the semantic map. devicePixelRatio-aware so points stay
// crisp on retina. The BUILD phase layers on the constellation lines, the
// "snap" animation, hover, and labels; this SCOPE version draws the starfield
// empty state and a static clustered map so the pipeline is visibly working.

import { clusterColor } from '../lib/palette.js'

function fit(canvas) {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const rect = canvas.getBoundingClientRect()
  const w = Math.max(1, Math.floor(rect.width))
  const h = Math.max(1, Math.floor(rect.height))
  canvas.width = w * dpr
  canvas.height = h * dpr
  const ctx = canvas.getContext('2d')
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  return { ctx, w, h }
}

// Deterministic pseudo-stars so the empty state looks intentional, not random
// noise that reflows on every resize.
function backgroundStars(w, h) {
  const stars = []
  let seed = 20260707
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0
    return seed / 4294967296
  }
  const count = Math.floor((w * h) / 9000)
  for (let i = 0; i < count; i++) {
    stars.push({ x: rand() * w, y: rand() * h, r: rand() * 1.1 + 0.2, a: rand() * 0.5 + 0.15 })
  }
  return stars
}

export function drawStarfield(canvas) {
  const { ctx, w, h } = fit(canvas)
  ctx.clearRect(0, 0, w, h)
  for (const s of backgroundStars(w, h)) {
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(240, 234, 217, ${s.a})`
    ctx.fill()
  }
}

/**
 * Draw a built map model (from buildMap) onto the canvas.
 * @param {HTMLCanvasElement} canvas
 * @param {{points:{x:number,y:number,cluster:number,text:string}[], clusters:any[]}} map
 */
export function drawMap(canvas, map) {
  const { ctx, w, h } = fit(canvas)
  ctx.clearRect(0, 0, w, h)

  // Faint backdrop stars behind the data.
  for (const s of backgroundStars(w, h)) {
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(240, 234, 217, ${s.a * 0.5})`
    ctx.fill()
  }

  const pad = 48
  const toScreen = (p) => ({
    x: pad + ((p.x + 1) / 2) * (w - 2 * pad),
    y: pad + ((p.y + 1) / 2) * (h - 2 * pad),
  })

  for (const p of map.points) {
    const s = toScreen(p)
    const color = clusterColor(p.cluster)
    ctx.beginPath()
    ctx.arc(s.x, s.y, 5, 0, Math.PI * 2)
    ctx.fillStyle = color
    ctx.shadowColor = color
    ctx.shadowBlur = 10
    ctx.fill()
    ctx.shadowBlur = 0
  }
}
