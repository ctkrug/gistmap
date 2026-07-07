import { describe, it, expect } from 'vitest'
import fc from 'fast-check'
import { normalizeCoords, projectPCA } from '../src/lib/project.js'
import { kmeans } from '../src/lib/cluster.js'
import { toCSV } from '../src/lib/exporters.js'
import { parseLines } from '../src/lib/input.js'
import { clampK } from '../src/lib/pipeline.js'

// Property-based tests — they probe the invariants example tests assume, over
// thousands of random inputs, catching the edge case a hand-picked case misses.

const finite = () => fc.double({ min: -1e6, max: 1e6, noNaN: true, noDefaultInfinity: true })
const coord = () => fc.record({ x: finite(), y: finite() })

describe('normalizeCoords properties', () => {
  it('always lands every point inside the [-1,1] box', () => {
    fc.assert(
      fc.property(fc.array(coord(), { minLength: 1, maxLength: 40 }), (coords) => {
        for (const c of normalizeCoords(coords)) {
          expect(c.x).toBeGreaterThanOrEqual(-1.0001)
          expect(c.x).toBeLessThanOrEqual(1.0001)
          expect(c.y).toBeGreaterThanOrEqual(-1.0001)
          expect(c.y).toBeLessThanOrEqual(1.0001)
        }
      }),
    )
  })

  it('preserves the point count', () => {
    fc.assert(
      fc.property(fc.array(coord(), { maxLength: 40 }), (coords) => {
        expect(normalizeCoords(coords)).toHaveLength(coords.length)
      }),
    )
  })
})

describe('projectPCA properties', () => {
  it('returns one finite coordinate per input, in the box', () => {
    const vec = fc.array(finite(), { minLength: 2, maxLength: 6 })
    fc.assert(
      fc.property(fc.array(vec, { minLength: 1, maxLength: 25 }), (vectors) => {
        // Equal-length vectors, as the real embeddings always are.
        const dim = vectors[0].length
        const uniform = vectors.map((v) => v.slice(0, dim).concat(Array(dim).fill(0)).slice(0, dim))
        const out = projectPCA(uniform)
        expect(out).toHaveLength(uniform.length)
        for (const c of out) {
          expect(Number.isFinite(c.x)).toBe(true)
          expect(Number.isFinite(c.y)).toBe(true)
          expect(Math.abs(c.x)).toBeLessThanOrEqual(1.0001)
          expect(Math.abs(c.y)).toBeLessThanOrEqual(1.0001)
        }
      }),
    )
  })
})

describe('kmeans properties', () => {
  it('assigns every point a label in [0, k) for any k', () => {
    const vec = fc.array(finite(), { minLength: 2, maxLength: 4 }).filter((v) => v.length === 2 || v.length === 3)
    fc.assert(
      fc.property(
        fc.array(vec, { minLength: 1, maxLength: 20 }),
        fc.integer({ min: 1, max: 15 }),
        (vectors, k) => {
          const dim = vectors[0].length
          const uniform = vectors.filter((v) => v.length === dim)
          const { assignments, k: usedK } = kmeans(uniform, k)
          expect(usedK).toBeGreaterThanOrEqual(1)
          expect(usedK).toBeLessThanOrEqual(uniform.length)
          for (const a of assignments) {
            expect(a).toBeGreaterThanOrEqual(0)
            expect(a).toBeLessThan(usedK)
          }
        },
      ),
    )
  })
})

describe('clampK properties', () => {
  it('always yields an integer in [1, n]', () => {
    fc.assert(
      fc.property(fc.integer({ min: -50, max: 50 }), fc.integer({ min: 1, max: 50 }), (k, n) => {
        const r = clampK(k, n)
        expect(Number.isInteger(r)).toBe(true)
        expect(r).toBeGreaterThanOrEqual(1)
        expect(r).toBeLessThanOrEqual(n)
      }),
    )
  })
})

describe('toCSV structural integrity', () => {
  it('every data row parses back to exactly five fields', () => {
    const point = fc.record({
      text: fc.string(),
      x: finite(),
      y: finite(),
      cluster: fc.nat({ max: 5 }),
    })
    fc.assert(
      fc.property(fc.array(point, { minLength: 1, maxLength: 15 }), (points) => {
        const clusters = [...new Set(points.map((p) => p.cluster))].map((id) => ({
          id,
          label: `c${id}`,
        }))
        const csv = toCSV({ k: clusters.length, clusters, points })
        for (const row of parseCsvRows(csv)) {
          expect(row).toHaveLength(5)
        }
      }),
    )
  })
})

describe('parseLines properties', () => {
  it('never exceeds the cap and never emits a blank/untrimmed line', () => {
    fc.assert(
      fc.property(fc.array(fc.string(), { maxLength: 700 }), fc.integer({ min: 1, max: 50 }), (raw, max) => {
        const { lines, truncated } = parseLines(raw.join('\n'), { max })
        expect(lines.length).toBeLessThanOrEqual(max)
        expect(truncated).toBeGreaterThanOrEqual(0)
        for (const l of lines) {
          expect(l).toBe(l.trim())
          expect(l.length).toBeGreaterThan(0)
        }
      }),
    )
  })
})

// A minimal RFC-4180 CSV parser (handles quoted fields, doubled quotes, and
// embedded delimiters/newlines) — used only to verify structural integrity.
function parseCsvRows(csv) {
  const rows = []
  let field = ''
  let row = []
  let inQuotes = false
  for (let i = 0; i < csv.length; i++) {
    const ch = csv[i]
    if (inQuotes) {
      if (ch === '"') {
        if (csv[i + 1] === '"') {
          field += '"'
          i++
        } else inQuotes = false
      } else field += ch
    } else if (ch === '"') {
      inQuotes = true
    } else if (ch === ',') {
      row.push(field)
      field = ''
    } else if (ch === '\r') {
      // swallow; the \n handles the row break
    } else if (ch === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else field += ch
  }
  row.push(field)
  rows.push(row)
  // Drop the header row; keep only non-empty trailing rows.
  return rows.slice(1).filter((r) => !(r.length === 1 && r[0] === ''))
}
