import './style.css'
import { SAMPLES, SAMPLE_NAMES } from './lib/samples.js'
import { buildMap } from './lib/pipeline.js'
import { CLUSTER_COLORS } from './lib/palette.js'
import { drawMap, drawStarfield } from './render/canvas.js'

// Minimal-but-real shell: renders the designed layout, shows the starfield
// empty state, and wires paste → embed → map. The embedding model loads
// lazily on first "Map it"; the map render is fleshed out in the BUILD phase.

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
        <textarea id="input" placeholder="Paste tasks, tweets, feedback, bookmarks…
one item per line"></textarea>
      </div>

      <div class="row">
        <button class="btn" id="map-btn">Map it</button>
        <button class="btn ghost" id="clear-btn">Clear</button>
      </div>

      <div>
        <label class="field">Or try a sample</label>
        <div class="samples" id="samples"></div>
      </div>

      <p class="hint" id="status-line">idle · 0 lines</p>
    </aside>

    <section class="stage">
      <canvas id="map"></canvas>
      <div class="stage-status" id="stage-status">
        <h2>Your map starts here</h2>
        <p>Paste some lines and press <strong>Map it</strong> — or pick a sample.</p>
      </div>
    </section>
  </div>
`

const input = document.getElementById('input')
const canvas = document.getElementById('map')
const statusLine = document.getElementById('status-line')
const stageStatus = document.getElementById('stage-status')
const mapBtn = document.getElementById('map-btn')

// Sample pills
const samplesEl = document.getElementById('samples')
for (const name of SAMPLE_NAMES) {
  const b = document.createElement('button')
  b.className = 'pill'
  b.textContent = name
  b.addEventListener('click', () => {
    input.value = SAMPLES[name].join('\n')
    updateCount()
  })
  samplesEl.appendChild(b)
}

function lines() {
  return input.value
    .split('\n')
    .map((s) => s.trim())
    .filter(Boolean)
}

function updateCount() {
  statusLine.textContent = `idle · ${lines().length} lines`
}
input.addEventListener('input', updateCount)

document.getElementById('clear-btn').addEventListener('click', () => {
  input.value = ''
  updateCount()
  stageStatus.style.display = 'grid'
  stageStatus.innerHTML = '<h2>Your map starts here</h2><p>Paste some lines and press <strong>Map it</strong> — or pick a sample.</p>'
  drawStarfield(canvas)
})

async function mapIt() {
  const texts = lines()
  if (texts.length < 3) {
    setStatus('Add at least 3 lines to map.', true)
    return
  }
  mapBtn.disabled = true
  stageStatus.style.display = 'grid'
  stageStatus.innerHTML = '<h2>Mapping…</h2><p id="prog">Loading the on-device model…</p>'
  setStatus('loading model…')

  try {
    const { embedTexts } = await import('./lib/embed.js')
    const prog = document.getElementById('prog')
    const vectors = await embedTexts(texts, {
      onProgress: (p) => {
        if (p?.status === 'progress' && p.progress != null) {
          prog.textContent = `Downloading model… ${Math.round(p.progress)}%`
        }
      },
    })
    setStatus('clustering…')
    const map = buildMap(vectors, texts)
    stageStatus.style.display = 'none'
    drawMap(canvas, map)
    setStatus(`${texts.length} lines · ${map.k} clusters`)
  } catch (err) {
    console.error(err)
    setStatus('Something went wrong — see console.', true)
    stageStatus.innerHTML = '<h2>Couldn’t map that</h2><p>The model failed to load. Check your connection and retry.</p>'
  } finally {
    mapBtn.disabled = false
  }
}

function setStatus(msg, isError = false) {
  statusLine.textContent = msg
  statusLine.style.color = isError ? 'var(--danger)' : 'var(--muted)'
}

mapBtn.addEventListener('click', mapIt)

// First paint: the empty starfield.
drawStarfield(canvas)
window.addEventListener('resize', () => drawStarfield(canvas))
updateCount()

export { CLUSTER_COLORS }
