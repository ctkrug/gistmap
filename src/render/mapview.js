// The interactive semantic map. Owns the canvas and a requestAnimationFrame
// loop that (1) snaps scattered points into their cluster layout, (2) draws
// faint constellation lines to each cluster centroid, (3) twinkles the stars,
// and (4) hit-tests the pointer for hover. Cluster highlight (from the legend)
// dims the rest. Honors prefers-reduced-motion by settling instantly.
//
// The pure geometry/easing math lives in ../lib/geometry.js and ../lib/anim.js
// (unit-tested); this module wires it to the DOM. clusterCentroids2D is exported
// pure so its math is testable without a canvas.

import { clusterColor } from '../lib/palette.js'
import { scaleToViewport, pickNearest, scatterPositions } from '../lib/geometry.js'
import { lerp, staggeredProgress, easeOutCubic } from '../lib/anim.js'
import { mulberry32 } from '../lib/rng.js'

const PAD = 56
const SNAP_MS = 480

/**
 * Mean 2D position of each cluster, in the same normalized space as the points.
 * @param {{x:number,y:number,cluster:number}[]} points
 * @param {number} k
 * @returns {{x:number,y:number}[]} one centroid per cluster id
 */
export function clusterCentroids2D(points, k) {
  const sums = Array.from({ length: k }, () => ({ x: 0, y: 0, n: 0 }))
  for (const p of points) {
    const s = sums[p.cluster]
    if (!s) continue
    s.x += p.x
    s.y += p.y
    s.n++
  }
  return sums.map((s) => (s.n ? { x: s.x / s.n, y: s.y / s.n } : { x: 0, y: 0 }))
}

export function createMapView(canvas, opts = {}) {
  const reduceMotion = !!opts.reduceMotion
  const onHover = opts.onHover ?? (() => {})

  const ctx = canvas.getContext('2d')
  let dpr = 1
  let w = 0
  let h = 0

  let map = null
  let starts = [] // screen-space start positions for the current transition
  let targets = [] // screen-space settle positions
  let displayed = [] // current per-frame screen positions (for hit-testing)
  let centroids = [] // screen-space cluster centroids
  let animStart = 0
  let linesAlpha = 0
  let highlight = -1
  let hoverIndex = -1
  let raf = 0
  let bgStars = []

  function fit() {
    dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    w = Math.max(1, Math.floor(rect.width))
    h = Math.max(1, Math.floor(rect.height))
    canvas.width = w * dpr
    canvas.height = h * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    bgStars = makeStars(w, h)
  }

  function computeGeometry(mode) {
    targets = scaleToViewport(
      map.points.map((p) => ({ x: p.x, y: p.y })),
      w,
      h,
      PAD,
    )
    centroids = scaleToViewport(clusterCentroids2D(map.points, map.k), w, h, PAD)
    if (mode === 'tween') {
      // Start from wherever points currently sit (reproject / re-cluster).
      starts = displayed.length === targets.length ? displayed.map((p) => ({ ...p })) : targets
    } else {
      // Snap: begin scattered across a disc.
      const scattered = scatterPositions(targets.length, mulberry32(99))
      starts = scaleToViewport(scattered, w, h, PAD)
    }
    displayed = starts.map((p) => ({ ...p }))
  }

  function start() {
    animStart = performance.now()
    linesAlpha = 0
    cancelAnimationFrame(raf)
    if (reduceMotion) {
      displayed = targets.map((p) => ({ ...p }))
      linesAlpha = 1
      draw(animStart)
      return
    }
    loop()
  }

  // Runs forever once started (stopped only by destroy()): drives the snap/
  // fade-in tween while one is in flight, then keeps rescheduling itself so
  // the background starfield (drawStars, driven by `now`) keeps twinkling
  // at rest instead of freezing on the last animated frame.
  function loop() {
    raf = requestAnimationFrame((now) => {
      const elapsed = now - animStart
      const settled = elapsed >= SNAP_MS
      if (!settled) {
        for (let i = 0; i < targets.length; i++) {
          const t = staggeredProgress(elapsed, SNAP_MS, i, targets.length)
          displayed[i] = {
            x: lerp(starts[i].x, targets[i].x, t),
            y: lerp(starts[i].y, targets[i].y, t),
          }
        }
        // Fade the constellation lines in after the points begin settling.
        linesAlpha = easeOutCubic((elapsed - SNAP_MS * 0.5) / (SNAP_MS * 0.8))
      } else if (linesAlpha < 1) {
        displayed = targets.map((p) => ({ ...p }))
        linesAlpha = 1
      }
      draw(now)
      loop()
    })
  }

  function draw(now) {
    ctx.clearRect(0, 0, w, h)
    drawStars(now)
    if (!map) return
    drawLines()
    drawPoints(now)
    drawCentroidLabels()
  }

  function drawStars(now) {
    for (const s of bgStars) {
      const tw = reduceMotion ? 1 : 0.75 + 0.25 * Math.sin(now / 900 + s.p)
      ctx.beginPath()
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(240, 234, 217, ${s.a * tw})`
      ctx.fill()
    }
  }

  function drawLines() {
    if (linesAlpha <= 0) return
    ctx.lineWidth = 1
    for (let i = 0; i < displayed.length; i++) {
      const cl = map.points[i].cluster
      const dim = highlight >= 0 && cl !== highlight
      const a = (dim ? 0.05 : 0.16) * Math.min(1, linesAlpha)
      const c = centroids[cl]
      if (!c) continue
      ctx.beginPath()
      ctx.moveTo(displayed[i].x, displayed[i].y)
      ctx.lineTo(c.x, c.y)
      ctx.strokeStyle = withAlpha(clusterColor(cl), a)
      ctx.stroke()
    }
  }

  function drawPoints(now) {
    // Cluster of the hovered point — its siblings get a faint highlight so the
    // constellation the cursor is over reads as a group.
    const hoverCluster = hoverIndex >= 0 ? map.points[hoverIndex].cluster : -1
    for (let i = 0; i < displayed.length; i++) {
      const cl = map.points[i].cluster
      const color = clusterColor(cl)
      const dim = highlight >= 0 && cl !== highlight
      const isHover = i === hoverIndex
      const isSibling = !isHover && cl === hoverCluster
      const tw = reduceMotion ? 1 : 0.85 + 0.15 * Math.sin(now / 700 + i)
      const r = (isHover ? 8 : isSibling ? 5.5 : 4.5) * (dim ? 0.7 : 1)
      const p = displayed[i]
      ctx.globalAlpha = dim ? 0.28 : 1
      ctx.beginPath()
      ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.shadowColor = color
      ctx.shadowBlur = (isHover ? 18 : isSibling ? 14 : 9) * tw
      ctx.fill()
      ctx.shadowBlur = 0
      if (isHover) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, r + 4, 0, Math.PI * 2)
        ctx.strokeStyle = withAlpha('#f0ead9', 0.9)
        ctx.lineWidth = 1.5
        ctx.stroke()
      }
      ctx.globalAlpha = 1
    }
  }

  function drawCentroidLabels() {
    if (linesAlpha < 0.6 || !map.clusters) return
    ctx.font = '600 12px Fraunces, Georgia, serif'
    ctx.textAlign = 'center'
    for (const c of map.clusters) {
      const pos = centroids[c.id]
      if (!pos || !c.label) continue
      const dim = highlight >= 0 && c.id !== highlight
      ctx.fillStyle = withAlpha('#f0ead9', (dim ? 0.25 : 0.7) * linesAlpha)
      ctx.fillText(shorten(c.label), pos.x, pos.y - 12)
    }
    ctx.textAlign = 'start'
  }

  // --- Public API ---------------------------------------------------------

  function setMap(next, { mode = 'snap' } = {}) {
    map = next
    hoverIndex = -1
    fit()
    if (!map || !map.points.length) {
      draw(performance.now())
      return
    }
    computeGeometry(mode)
    start()
  }

  function setHighlight(clusterId) {
    highlight = clusterId == null ? -1 : clusterId
    draw(performance.now())
  }

  function resize() {
    if (!map || !map.points.length) {
      fit()
      draw(performance.now())
      return
    }
    fit()
    // Recompute settled positions at the new size and redraw in place.
    targets = scaleToViewport(
      map.points.map((p) => ({ x: p.x, y: p.y })),
      w,
      h,
      PAD,
    )
    centroids = scaleToViewport(clusterCentroids2D(map.points, map.k), w, h, PAD)
    displayed = targets.map((p) => ({ ...p }))
    linesAlpha = 1
    draw(performance.now())
  }

  function handleMove(clientX, clientY) {
    if (!map || !displayed.length) return
    const rect = canvas.getBoundingClientRect()
    const idx = pickNearest(clientX - rect.left, clientY - rect.top, displayed, 14)
    if (idx !== hoverIndex) {
      hoverIndex = idx
      draw(performance.now())
      onHover(idx, idx >= 0 ? { point: map.points[idx], screen: displayed[idx] } : null)
    }
  }

  function onPointerMove(e) {
    handleMove(e.clientX, e.clientY)
  }
  function onPointerLeave() {
    if (hoverIndex !== -1) {
      hoverIndex = -1
      draw(performance.now())
      onHover(-1, null)
    }
  }

  canvas.addEventListener('pointermove', onPointerMove)
  canvas.addEventListener('pointerleave', onPointerLeave)
  canvas.addEventListener('pointerdown', onPointerMove) // tap-to-hover on touch

  fit()
  if (reduceMotion) {
    draw(performance.now())
  } else {
    animStart = performance.now()
    loop()
  }

  function destroy() {
    cancelAnimationFrame(raf)
    canvas.removeEventListener('pointermove', onPointerMove)
    canvas.removeEventListener('pointerleave', onPointerLeave)
    canvas.removeEventListener('pointerdown', onPointerMove)
  }

  return { setMap, setHighlight, resize, destroy }
}

function makeStars(w, h) {
  const stars = []
  const rand = mulberry32(20260707)
  const count = Math.floor((w * h) / 9000)
  for (let i = 0; i < count; i++) {
    stars.push({
      x: rand() * w,
      y: rand() * h,
      r: rand() * 1.1 + 0.2,
      a: rand() * 0.45 + 0.12,
      p: rand() * Math.PI * 2,
    })
  }
  return stars
}

function withAlpha(hex, a) {
  const n = hex.replace('#', '')
  const r = parseInt(n.slice(0, 2), 16)
  const g = parseInt(n.slice(2, 4), 16)
  const b = parseInt(n.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

function shorten(label, max = 22) {
  return label.length > max ? label.slice(0, max - 1) + '…' : label
}
