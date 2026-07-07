// Synthesized sound effects for the map — no audio files, just WebAudio
// oscillators. Sounds: a soft chime when a map completes, a tick on slider
// re-cluster, and a sweep on reproject. Mute state persists in localStorage.
//
// Built with dependency injection (storage + AudioContext factory) so the mute
// logic and the no-AudioContext guard are unit-testable without a browser.

const MUTE_KEY = 'gistmap:muted'

/**
 * @param {object} [deps]
 * @param {Storage} [deps.storage]   localStorage-like { getItem, setItem }
 * @param {new () => AudioContext} [deps.AudioCtx]  AudioContext constructor
 * @param {() => number} [deps.now]   monotonic ms source for rate-throttling
 */
export function createSfx(deps = {}) {
  const storage = deps.storage ?? safeLocalStorage()
  const AudioCtx =
    deps.AudioCtx ??
    (typeof window !== 'undefined' ? window.AudioContext || window.webkitAudioContext : null)
  const now = deps.now ?? (() => performanceNow())

  let muted = storage?.getItem?.(MUTE_KEY) === '1'
  let ctx = null
  let lastTick = -Infinity

  function ensureCtx() {
    if (ctx) return ctx
    if (!AudioCtx) return null
    try {
      ctx = new AudioCtx()
    } catch {
      ctx = null
    }
    return ctx
  }

  function tone(freq, { dur = 0.18, type = 'sine', gain = 0.06, delay = 0, slideTo = null } = {}) {
    const ac = ensureCtx()
    if (!ac) return
    const t0 = ac.currentTime + delay
    const osc = ac.createOscillator()
    const g = ac.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (slideTo != null) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur)
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(ac.destination)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  }

  const sounds = {
    // Rising major arpeggio — the "constellation found" moment.
    complete() {
      const notes = [523.25, 659.25, 783.99, 1046.5]
      notes.forEach((f, i) => tone(f, { delay: i * 0.07, dur: 0.32, gain: 0.05, type: 'triangle' }))
    },
    // Short, quiet click for slider changes — throttled so drags don't buzz.
    tick() {
      const t = now()
      if (t - lastTick < 45) return
      lastTick = t
      tone(880, { dur: 0.05, gain: 0.03, type: 'square' })
    },
    // Soft downward sweep for reproject.
    reproject() {
      tone(660, { dur: 0.28, gain: 0.045, type: 'sine', slideTo: 330 })
    },
  }

  return {
    isMuted: () => muted,
    setMuted(value) {
      muted = !!value
      storage?.setItem?.(MUTE_KEY, muted ? '1' : '0')
      return muted
    },
    toggle() {
      return this.setMuted(!muted)
    },
    /** Resume a suspended context after a user gesture (autoplay policy). */
    resume() {
      const ac = ensureCtx()
      if (ac?.state === 'suspended') ac.resume?.()
    },
    play(name) {
      if (muted) return
      const fn = sounds[name]
      if (fn) fn()
    },
  }
}

function safeLocalStorage() {
  try {
    return typeof localStorage !== 'undefined' ? localStorage : null
  } catch {
    return null
  }
}

function performanceNow() {
  try {
    return typeof performance !== 'undefined' ? performance.now() : 0
  } catch {
    return 0
  }
}

export { MUTE_KEY }
