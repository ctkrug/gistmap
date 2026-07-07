import { describe, it, expect } from 'vitest'
import { createSfx, MUTE_KEY } from '../src/lib/sfx.js'

function fakeStorage(initial = {}) {
  const map = new Map(Object.entries(initial))
  return {
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => map.set(k, String(v)),
    _map: map,
  }
}

// Minimal AudioContext double that records how many oscillators were started.
function fakeAudioCtxClass() {
  const started = { count: 0 }
  class FakeParam {
    setValueAtTime() {}
    exponentialRampToValueAtTime() {}
  }
  class FakeNode {
    constructor() {
      this.frequency = new FakeParam()
      this.gain = new FakeParam()
    }
    connect() {
      return this
    }
    start() {
      started.count++
    }
    stop() {}
  }
  class FakeCtx {
    constructor() {
      this.currentTime = 0
      this.state = 'running'
      this.destination = {}
    }
    createOscillator() {
      return new FakeNode()
    }
    createGain() {
      return new FakeNode()
    }
  }
  return { FakeCtx, started }
}

describe('createSfx mute', () => {
  it('defaults to unmuted with empty storage', () => {
    const sfx = createSfx({ storage: fakeStorage(), AudioCtx: null })
    expect(sfx.isMuted()).toBe(false)
  })
  it('reads a persisted muted state', () => {
    const sfx = createSfx({ storage: fakeStorage({ [MUTE_KEY]: '1' }), AudioCtx: null })
    expect(sfx.isMuted()).toBe(true)
  })
  it('persists mute changes to storage', () => {
    const storage = fakeStorage()
    const sfx = createSfx({ storage, AudioCtx: null })
    sfx.setMuted(true)
    expect(storage.getItem(MUTE_KEY)).toBe('1')
    expect(sfx.toggle()).toBe(false)
    expect(storage.getItem(MUTE_KEY)).toBe('0')
  })
})

describe('createSfx playback', () => {
  it('is a safe no-op when no AudioContext is available', () => {
    const sfx = createSfx({ storage: fakeStorage(), AudioCtx: null })
    expect(() => sfx.play('complete')).not.toThrow()
  })
  it('produces sound when unmuted', () => {
    const { FakeCtx, started } = fakeAudioCtxClass()
    const sfx = createSfx({ storage: fakeStorage(), AudioCtx: FakeCtx })
    sfx.play('complete')
    expect(started.count).toBeGreaterThan(0)
  })
  it('produces no sound when muted', () => {
    const { FakeCtx, started } = fakeAudioCtxClass()
    const sfx = createSfx({ storage: fakeStorage({ [MUTE_KEY]: '1' }), AudioCtx: FakeCtx })
    sfx.play('complete')
    expect(started.count).toBe(0)
  })
  it('ignores unknown sound names', () => {
    const { FakeCtx, started } = fakeAudioCtxClass()
    const sfx = createSfx({ storage: fakeStorage(), AudioCtx: FakeCtx })
    sfx.play('does-not-exist')
    expect(started.count).toBe(0)
  })
  it('throttles rapid ticks', () => {
    const { FakeCtx, started } = fakeAudioCtxClass()
    let t = 0
    const sfx = createSfx({ storage: fakeStorage(), AudioCtx: FakeCtx, now: () => t })
    sfx.play('tick')
    sfx.play('tick') // same instant → throttled
    expect(started.count).toBe(1)
    t = 100
    sfx.play('tick') // enough time elapsed → plays
    expect(started.count).toBe(2)
  })
  it('plays the reproject sweep and the complete arpeggio', () => {
    const { FakeCtx, started } = fakeAudioCtxClass()
    const sfx = createSfx({ storage: fakeStorage(), AudioCtx: FakeCtx })
    sfx.play('reproject')
    expect(started.count).toBe(1) // single swept tone
    sfx.play('complete')
    expect(started.count).toBe(5) // + four arpeggio notes
  })
  it('does not throw when the AudioContext constructor throws', () => {
    class Broken {
      constructor() {
        throw new Error('no audio')
      }
    }
    const sfx = createSfx({ storage: fakeStorage(), AudioCtx: Broken })
    expect(() => sfx.play('complete')).not.toThrow()
    expect(() => sfx.resume()).not.toThrow()
  })
})

describe('createSfx resume', () => {
  it('resumes a suspended context after a user gesture', () => {
    let resumed = 0
    class SuspendedCtx {
      constructor() {
        this.state = 'suspended'
        this.currentTime = 0
        this.destination = {}
      }
      resume() {
        resumed++
        this.state = 'running'
      }
      createOscillator() {
        return { frequency: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, type: '', connect() { return this }, start() {}, stop() {} }
      }
      createGain() {
        return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() { return this } }
      }
    }
    const sfx = createSfx({ storage: fakeStorage(), AudioCtx: SuspendedCtx })
    sfx.resume()
    expect(resumed).toBe(1)
  })
  it('is a safe no-op with no AudioContext', () => {
    const sfx = createSfx({ storage: fakeStorage(), AudioCtx: null })
    expect(() => sfx.resume()).not.toThrow()
  })
})

describe('createSfx defaults', () => {
  it('constructs with no deps, falling back to platform storage/clock', () => {
    // In the node test env localStorage is absent, so safeLocalStorage()
    // falls back to null and isMuted() reads as false.
    const sfx = createSfx()
    expect(sfx.isMuted()).toBe(false)
    expect(() => sfx.setMuted(true)).not.toThrow()
  })

  it('exercises the default performanceNow clock via an unmuted tick', () => {
    // tick() calls now() -> performanceNow() as its first statement, before
    // anything else could short-circuit it (e.g. a prior setMuted(true)).
    const sfx = createSfx()
    expect(() => sfx.play('tick')).not.toThrow()
  })

  it('falls back to null storage when localStorage access throws', () => {
    // Mirrors Safari private-mode / storage-blocked embeds, where merely
    // referencing localStorage throws a SecurityError.
    const original = Object.getOwnPropertyDescriptor(globalThis, 'localStorage')
    Object.defineProperty(globalThis, 'localStorage', {
      configurable: true,
      get() {
        throw new Error('storage disabled')
      },
    })
    try {
      expect(() => createSfx()).not.toThrow()
    } finally {
      if (original) Object.defineProperty(globalThis, 'localStorage', original)
      else delete globalThis.localStorage
    }
  })

  it('falls back to 0 when performance access throws', () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, 'performance')
    Object.defineProperty(globalThis, 'performance', {
      configurable: true,
      get() {
        throw new Error('performance disabled')
      },
    })
    try {
      const sfx = createSfx()
      expect(() => sfx.play('tick')).not.toThrow()
    } finally {
      if (original) Object.defineProperty(globalThis, 'performance', original)
      else delete globalThis.performance
    }
  })
})
