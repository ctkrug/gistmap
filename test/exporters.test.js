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
  it('falls back to a blank label when a point has no matching cluster', () => {
    const rows = toRows({ points: [{ text: 'x', x: 0, y: 0, cluster: 9 }], clusters: [] })
    expect(rows[0].label).toBe('')
  })
  it('tolerates a map missing points/clusters entirely', () => {
    expect(toRows({})).toEqual([])
  })
})

describe('toJSON', () => {
  it('round-trips to an object with k, clusters, and points', () => {
    const parsed = JSON.parse(toJSON(MAP))
    expect(parsed.k).toBe(2)
    expect(parsed.clusters).toHaveLength(2)
    expect(parsed.points[0].line).toBe('Book flights')
  })
  it('defaults k to 0 and clusters to [] when absent', () => {
    const parsed = JSON.parse(toJSON({ points: [] }))
    expect(parsed.k).toBe(0)
    expect(parsed.clusters).toEqual([])
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
  it('neutralizes spreadsheet formula injection in text cells', () => {
    // A pasted line that begins with =, +, -, @ (or a control char) is a
    // formula-injection payload when the CSV is opened in Excel/Sheets.
    const evil = {
      k: 1,
      clusters: [{ id: 0, label: '@evil' }],
      points: [
        { text: '=SUM(A1:A9)', x: -0.2, y: 0.5, cluster: 0 },
        { text: '+1+1', x: 0.1, y: 0.1, cluster: 0 },
      ],
    }
    const rows = toCSV(evil).split('\r\n')
    // Dangerous leading char is defused with a leading apostrophe...
    expect(rows[1].startsWith("'=SUM(A1:A9)")).toBe(true)
    expect(rows[1]).toContain("'@evil")
    expect(rows[2].startsWith("'+1+1")).toBe(true)
    // ...but the numeric coordinate column, which legitimately starts with a
    // minus sign, must stay a bare number so the CSV parses as data.
    expect(rows[1].endsWith(',-0.2,0.5')).toBe(true)
  })
  it('handles an empty map with just a header', () => {
    expect(toCSV({ points: [], clusters: [] })).toBe('line,cluster,label,x,y')
  })
})
