import './style.css'
import { SAMPLES, SAMPLE_NAMES } from './lib/samples.js'
import { buildMap, reprojectMap, clampK } from './lib/pipeline.js'
import { clusterColor } from './lib/palette.js'
import { createMapView } from './render/mapview.js'
import { createSfx } from './lib/sfx.js'
import { toJSON, toCSV } from './lib/exporters.js'
import { parseLines, MAX_LINES } from './lib/input.js'

// App shell: paste → embed → map, then explore (hover, legend, k-slider,
// reproject, export). The pure math lives under lib/; the map render under
// render/. This module is the DOM/orchestration glue.

const MIN_LINES = 3
const reduceMotion =
  typeof window !== 'undefined' &&
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

const app = document.getElementById('app')

app.innerHTML = `
  <div class="shell">
    <aside class="rail">
      <header>
        <h1 class="wordmark">Gistmap<span class="star">✦</span></h1>
        <p class="tagline">Paste a messy list. It clusters into a labeled
          semantic map — right here in your tab, nothing uploaded.</p>
      </header>

      <div>
        <label class="field" for="input">Your lines (one per row)</label>
        <textarea id="input" aria-describedby="status-line"
          placeholder="Paste tasks, tweets, feedback, bookmarks…
one item per line"></textarea>
        <p class="inline-hint" id="input-hint" hidden></p>
      </div>

      <div class="row">
        <button class="btn" id="map-btn">Map it</button>
        <button class="btn ghost" id="clear-btn">Clear</button>
      </div>

      <div>
        <label class="field">Or try a sample</label>
        <div class="samples" id="samples"></div>
      </div>

      <div class="tools" id="tools" hidden>
        <div class="tool-block">
          <label class="field" for="k-slider">Constellations
            <span class="k-val" id="k-val">–</span></label>
          <input type="range" id="k-slider" min="2" max="12" step="1" value="4"
            aria-label="Number of clusters" />
        </div>
        <div class="row">
          <button class="btn ghost sm" id="reproject-btn">Reproject</button>
          <button class="btn ghost sm" id="export-json">JSON</button>
          <button class="btn ghost sm" id="export-csv">CSV</button>
        </div>
      </div>

      <div class="rail-foot">
        <button class="icon-btn" id="mute-btn" aria-label="Mute sound"
          aria-pressed="false">🔊</button>
        <p class="hint" id="status-line" role="status" aria-live="polite">idle · 0 lines</p>
      </div>
    </aside>

    <section class="stage">
      <canvas id="map" role="img"
        aria-label="Semantic map — points clustered into labeled constellations"></canvas>
      <div class="coord" id="coord" aria-hidden="true"></div>
      <div class="legend" id="legend" hidden></div>
      <div class="tooltip" id="tooltip" role="status" hidden></div>
      <div class="stage-status" id="stage-status">
        <div class="empty-badge">✦</div>
        <h2>You are here</h2>
        <p>Paste some lines and press <strong>Map it</strong> — or pick a sample.
          Everything runs in your tab; nothing is uploaded.</p>
      </div>
    </section>
  </div>
`

// --- Element handles ------------------------------------------------------
const input = el('input')
const canvas = el('map')
const statusLine = el('status-line')
const stageStatus = el('stage-status')
const mapBtn = el('map-btn')
const inputHint = el('input-hint')
const tools = el('tools')
const kSlider = el('k-slider')
const kVal = el('k-val')
const legend = el('legend')
const tooltip = el('tooltip')
const coord = el('coord')
const muteBtn = el('mute-btn')

// --- App state ------------------------------------------------------------
const sfx = createSfx()
let current = null // { vectors, texts, map }
const view = createMapView(canvas, { reduceMotion, onHover })

syncMuteButton()

// --- Sample pills ---------------------------------------------------------
const samplesEl = el('samples')
for (const name of SAMPLE_NAMES) {
  const b = document.createElement('button')
  b.className = 'pill'
  b.type = 'button'
  b.textContent = name
  b.addEventListener('click', () => {
    input.value = SAMPLES[name].join('\n')
    clearHint()
    updateCount()
  })
  samplesEl.appendChild(b)
}

// --- Input handling -------------------------------------------------------
function parsed() {
  return parseLines(input.value)
}
function lines() {
  return parsed().lines
}

function updateCount() {
  if (!current) setStatus(`idle · ${lines().length} lines`)
}
input.addEventListener('input', () => {
  clearHint()
  updateCount()
})
// Cmd/Ctrl+Enter maps without reaching for the mouse.
input.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    e.preventDefault()
    sfx.resume()
    mapIt()
  }
})

el('clear-btn').addEventListener('click', () => {
  runToken++ // invalidate any Map it run still in flight
  input.value = ''
  current = null
  clearHint()
  updateCount()
  legend.hidden = true
  tools.hidden = true
  coord.textContent = ''
  showEmptyState()
  view.setMap(null)
})

// --- The wow moment: map it -----------------------------------------------
let busy = false
// Bumped by Clear so a Map it run already in flight can tell, once its
// embed/cluster work resolves, that it's been superseded and must not
// resurrect a map the user explicitly cleared out from under it.
let runToken = 0
async function mapIt() {
  // Guard against overlapping runs: the button disables itself, but Ctrl+Enter
  // and the retry button call this directly, so a key-masher could otherwise
  // launch several embed pipelines at once.
  if (busy) return
  const { lines: texts, truncated } = parsed()
  if (texts.length < MIN_LINES) {
    showHint(`Add at least ${MIN_LINES} lines to map — you have ${texts.length}.`)
    return
  }
  if (truncated > 0) {
    showHint(`Mapping the first ${MAX_LINES} lines — ${truncated} more were left out to keep it fast.`)
  } else {
    clearHint()
  }
  busy = true
  const myRun = ++runToken
  mapBtn.disabled = true
  showLoading('Loading the on-device model…')
  setStatus('loading model…')
  announcedPctByFile.clear()

  try {
    const { embedTexts } = await import('./lib/embed.js')
    const vectors = await embedTexts(texts, { onProgress: onModelProgress })
    if (myRun !== runToken) return
    setStatus('clustering…')
    const map = buildMap(vectors, texts)
    if (myRun !== runToken) return
    current = { vectors, texts, map }
    revealMap(map, { mode: 'snap' })
    initTools(map)
    sfx.resume()
    sfx.play('complete')
  } catch (err) {
    if (myRun !== runToken) return
    console.error(err)
    showError()
    setStatus('model failed to load', true)
  } finally {
    busy = false
    mapBtn.disabled = false
  }
}
mapBtn.addEventListener('click', () => {
  sfx.resume()
  mapIt()
})

// The visual progress bar lives inside the (non-live) stage overlay, so
// screen readers heard nothing between "loading model…" and "clustering…"
// even though the download can take many seconds. Mirror it into the
// aria-live status line too, throttled to a few milestones per file so it
// doesn't spam an announcement on every percentage tick. Progress is
// reported per source file (tokenizer, config, weights, ...); tracking a
// single global threshold would let a small file's instant 100% suppress
// the one file (the actual model weights) whose progress is worth hearing.
let announcedPctByFile = new Map()
function onModelProgress(p) {
  if (p?.status === 'progress' && p.progress != null) {
    const pct = Math.round(p.progress)
    const bar = document.getElementById('prog-bar')
    if (bar) bar.style.width = `${pct}%`
    const label = document.getElementById('prog-label')
    if (label) label.textContent = `Downloading model… ${pct}%`
    const lastForFile = announcedPctByFile.get(p.file) ?? -1
    if (pct >= lastForFile + 20 || pct >= 100) {
      announcedPctByFile.set(p.file, pct)
      setStatus(`downloading model… ${pct}%`)
    }
  }
}

function revealMap(map, opts) {
  hideStageStatus()
  view.setMap(map, opts)
  legend.hidden = false
  renderLegend(map)
  setStatus(`${map.points.length} lines · ${map.k} constellations`)
  coord.textContent = `k=${map.k} · n=${map.points.length}`
}

// --- Tools: k-slider, reproject, export -----------------------------------
function initTools(map) {
  tools.hidden = false
  kSlider.value = String(clampK(map.k, map.points.length))
  kSlider.max = String(Math.min(12, map.points.length))
  kVal.textContent = map.k
}

kSlider.addEventListener('input', () => {
  if (!current) return
  const k = Number(kSlider.value)
  kVal.textContent = k
  const map = buildMap(current.vectors, current.texts, { k })
  current.map = map
  view.setMap(map, { mode: 'tween' })
  renderLegend(map)
  setStatus(`${map.points.length} lines · ${map.k} constellations`)
  coord.textContent = `k=${map.k} · n=${map.points.length}`
  sfx.play('tick')
})

el('reproject-btn').addEventListener('click', () => {
  if (!current) return
  // A fixed golden-angle turn gives a fresh-but-stable layout each press.
  const map = reprojectMap(current.map, 2.399963)
  current.map = map
  view.setMap(map, { mode: 'tween' })
  sfx.play('reproject')
  setStatus('reprojected')
})

el('export-json').addEventListener('click', () => {
  if (current) download('gistmap.json', 'application/json', toJSON(current.map))
})
el('export-csv').addEventListener('click', () => {
  if (current) download('gistmap.csv', 'text/csv', toCSV(current.map))
})

// --- Legend ---------------------------------------------------------------
function renderLegend(map) {
  legend.innerHTML = ''
  const heading = document.createElement('div')
  heading.className = 'legend-head'
  heading.textContent = 'Constellations'
  legend.appendChild(heading)

  for (const c of map.clusters) {
    const row = document.createElement('button')
    row.className = 'legend-row'
    row.type = 'button'
    row.dataset.cluster = String(c.id)
    row.innerHTML = `
      <span class="swatch" style="--c:${clusterColor(c.id)}"></span>
      <span class="legend-label">${escapeHtml(c.label)}</span>
      <span class="legend-count">${c.size}</span>`
    row.addEventListener('mouseenter', () => view.setHighlight(c.id))
    row.addEventListener('mouseleave', () => view.setHighlight(-1))
    row.addEventListener('focus', () => view.setHighlight(c.id))
    row.addEventListener('blur', () => view.setHighlight(-1))
    row.addEventListener('click', () => toggleLegendActive(row, c.id))
    legend.appendChild(row)
  }
}

let activeCluster = -1
function toggleLegendActive(row, id) {
  const nowActive = activeCluster !== id
  activeCluster = nowActive ? id : -1
  for (const r of legend.querySelectorAll('.legend-row')) r.classList.remove('active')
  if (nowActive) row.classList.add('active')
  view.setHighlight(activeCluster)
}

// --- Hover tooltip --------------------------------------------------------
function onHover(idx, info) {
  if (idx < 0 || !info) {
    tooltip.hidden = true
    if (current) coord.textContent = `k=${current.map.k} · n=${current.map.points.length}`
    return
  }
  const { point, screen } = info
  tooltip.textContent = point.text
  tooltip.hidden = false
  const rect = canvas.getBoundingClientRect()
  const maxX = rect.width - tooltip.offsetWidth - 12
  tooltip.style.left = `${Math.max(8, Math.min(screen.x + 14, maxX))}px`
  tooltip.style.top = `${Math.max(8, screen.y - 8)}px`
  coord.textContent = `x ${point.x.toFixed(2)}  y ${point.y.toFixed(2)}`
}

// --- Mute -----------------------------------------------------------------
muteBtn.addEventListener('click', () => {
  const muted = sfx.toggle()
  syncMuteButton(muted)
})
function syncMuteButton(muted = sfx.isMuted()) {
  muteBtn.textContent = muted ? '🔇' : '🔊'
  muteBtn.setAttribute('aria-pressed', String(muted))
  muteBtn.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound')
}

// --- Stage state overlays -------------------------------------------------
function showEmptyState() {
  stageStatus.hidden = false
  stageStatus.className = 'stage-status'
  stageStatus.innerHTML = `
    <div class="empty-badge">✦</div>
    <h2>You are here</h2>
    <p>Paste some lines and press <strong>Map it</strong> — or pick a sample.
      Everything runs in your tab; nothing is uploaded.</p>`
}
function showLoading(label) {
  stageStatus.hidden = false
  stageStatus.className = 'stage-status loading'
  stageStatus.innerHTML = `
    <div class="spinner" aria-hidden="true"></div>
    <h2>Charting the sky…</h2>
    <p id="prog-label">${escapeHtml(label)}</p>
    <div class="progress"><div class="progress-bar" id="prog-bar"></div></div>`
}
function showError() {
  stageStatus.hidden = false
  stageStatus.className = 'stage-status error'
  stageStatus.innerHTML = `
    <div class="empty-badge">⚠</div>
    <h2>Couldn’t chart that</h2>
    <p>The on-device model failed to load. Check your connection and try again.</p>
    <button class="btn" id="retry-btn">Retry</button>`
  document.getElementById('retry-btn')?.addEventListener('click', () => {
    sfx.resume()
    mapIt()
  })
}
function hideStageStatus() {
  stageStatus.hidden = true
}

// --- Small helpers --------------------------------------------------------
function showHint(msg) {
  inputHint.textContent = msg
  inputHint.hidden = false
}
function clearHint() {
  inputHint.hidden = true
}
function setStatus(msg, isError = false) {
  statusLine.textContent = msg
  statusLine.style.color = isError ? 'var(--danger)' : 'var(--muted)'
}
function download(filename, type, text) {
  const blob = new Blob([text], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}
function el(id) {
  return document.getElementById(id)
}
function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  })[c])
}

// --- First paint + resize -------------------------------------------------
updateCount()
let resizeTimer = 0
window.addEventListener('resize', () => {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => view.resize(), 120)
})
