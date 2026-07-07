import { describe, it, expect } from 'vitest'
import { toRows, toJSON, toCSV } from '../src/lib/exporters.js'

const MAP = {
  k: 2,
  clusters: [
    { id: 0, label: 'travel · trip', size: 2 },
    { id: 1, label: 'billing, "urgent"', size: 1 },
  ],
  points: [
    { text: 'Book flights', x: 0.123456, y: -0.2, cluster: 0 },
    { text: 'Renew passport', x: 0.5, y: 0.5, cluster: 0 },
    { text: 'Line with, comma\nand newline', x: -1, y: 1, cluster: 1 },
  ],
}

describe('toRows', () => {
  it('joins each point to its cluster label and rounds coords', () => {
    const rows = toRows(MAP)
    expect(rows).toHaveLength(3)
    expect(rows[0]).toEqual({
      line: 'Book flights',
      cluster: 0,
      label: 'travel · trip',
      x: 0.1235,
      y: -0.2,
    })
    expect(rows[2].label).toBe('billing, "urgent"')
  })
  it('is empty for an empty map', () => {
    expect(toRows({ points: [], clusters: [] })).toEqual([])
  })
})

describe('toJSON', () => {
  it('round-trips to an object with k, clusters, and points', () => {
    const parsed = JSON.parse(toJSON(MAP))
    expect(parsed.k).toBe(2)
    expect(parsed.clusters).toHaveLength(2)
    expect(parsed.points[0].line).toBe('Book flights')
  })
})

describe('toCSV', () => {
  it('starts with the header row', () => {
    expect(toCSV(MAP).split('\r\n')[0]).toBe('line,cluster,label,x,y')
  })
  it('quotes and escapes fields with commas, quotes, or newlines', () => {
    const csv = toCSV(MAP)
    // The label containing a comma and quotes must be wrapped and doubled.
    expect(csv).toContain('"billing, ""urgent"""')
    // The line containing a comma and a newline must be a single quoted cell.
    expect(csv).toContain('"Line with, comma\nand newline"')
  })
  it('emits one header plus one row per point', () => {
    const lines = toCSV(MAP).split('\r\n')
    // 1 header + 3 data rows; the embedded newline lives inside a quoted cell,
    // so splitting on \r\n (not \n) keeps the count correct.
    expect(lines).toHaveLength(4)
  })
  it('handles an empty map with just a header', () => {
    expect(toCSV({ points: [], clusters: [] })).toBe('line,cluster,label,x,y')
  })
})
