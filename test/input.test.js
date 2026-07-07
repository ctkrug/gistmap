import { describe, it, expect } from 'vitest'
import { parseLines, MAX_LINES } from '../src/lib/input.js'

describe('parseLines', () => {
  it('splits on newlines, trims, and drops blank lines', () => {
    const r = parseLines('  apple \n\n banana\t\n   \ncherry')
    expect(r.lines).toEqual(['apple', 'banana', 'cherry'])
    expect(r.truncated).toBe(0)
  })

  it('handles CRLF input', () => {
    expect(parseLines('a\r\nb\r\nc').lines).toEqual(['a', 'b', 'c'])
  })

  it('returns nothing for empty or whitespace-only input', () => {
    expect(parseLines('').lines).toEqual([])
    expect(parseLines('   \n\t\n  ').lines).toEqual([])
    expect(parseLines(null).lines).toEqual([])
    expect(parseLines(undefined).lines).toEqual([])
  })

  it('caps the number of lines and reports how many were dropped', () => {
    const many = Array.from({ length: MAX_LINES + 25 }, (_, i) => `line ${i}`).join('\n')
    const r = parseLines(many)
    expect(r.lines).toHaveLength(MAX_LINES)
    expect(r.truncated).toBe(25)
    expect(r.lines[0]).toBe('line 0')
  })

  it('does not report truncation when exactly at the cap', () => {
    const exact = Array.from({ length: MAX_LINES }, (_, i) => `l${i}`).join('\n')
    const r = parseLines(exact)
    expect(r.lines).toHaveLength(MAX_LINES)
    expect(r.truncated).toBe(0)
  })

  it('counts blank lines against the paste, not against the cap', () => {
    // Blanks are dropped before the cap, so a padded paste still yields all
    // its real lines.
    const padded = ['a', '', 'b', '   ', 'c'].join('\n')
    expect(parseLines(padded).lines).toEqual(['a', 'b', 'c'])
  })

  it('respects a custom max', () => {
    const r = parseLines('a\nb\nc\nd', { max: 2 })
    expect(r.lines).toEqual(['a', 'b'])
    expect(r.truncated).toBe(2)
  })
})
