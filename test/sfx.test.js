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
})
