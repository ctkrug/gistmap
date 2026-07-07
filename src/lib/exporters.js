// Serialize a built map (from buildMap) to downloadable JSON and CSV. Pure
// string builders — the DOM download wiring lives in main.js. Each exported
// row carries the source line, its cluster id + human label, and 2D position,
// so the result reflects the current k and reprojection state.

/**
 * Flatten a map model into export rows.
 * @param {{points:{text:string,x:number,y:number,cluster:number}[],
 *          clusters:{id:number,label:string}[]}} map
 * @returns {{line:string,cluster:number,label:string,x:number,y:number}[]}
 */
export function toRows(map) {
  const labelOf = new Map((map.clusters || []).map((c) => [c.id, c.label]))
  return (map.points || []).map((p) => ({
    line: p.text,
    cluster: p.cluster,
    label: labelOf.get(p.cluster) ?? '',
    x: round4(p.x),
    y: round4(p.y),
  }))
}

/** Pretty-printed JSON with k, cluster summary, and the rows. */
export function toJSON(map) {
  return JSON.stringify(
    {
      k: map.k ?? 0,
      clusters: map.clusters ?? [],
      points: toRows(map),
    },
    null,
    2,
  )
}

/** RFC-4180-ish CSV with a header row; fields are quote-escaped as needed. */
export function toCSV(map) {
  const header = ['line', 'cluster', 'label', 'x', 'y']
  const rows = toRows(map).map((r) => [r.line, r.cluster, r.label, r.x, r.y])
  return [header, ...rows].map((cols) => cols.map(csvCell).join(',')).join('\r\n')
}

function csvCell(value) {
  let s = String(value)
  // Defuse spreadsheet formula injection: a cell beginning with = + - @ (or a
  // tab/CR) is executed as a formula by Excel/Sheets. Prefix an apostrophe so
  // it renders as text — but never mangle a plain number (coordinates are
  // legitimately negative), so a bare "-0.2" stays parseable.
  if (/^[=+\-@\t\r]/.test(s) && !isPlainNumber(s)) {
    s = `'${s}`
  }
  // Quote when the cell contains a delimiter, quote, or newline; double inner quotes.
  if (/[",\r\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function isPlainNumber(s) {
  return s.trim() !== '' && Number.isFinite(Number(s))
}

function round4(n) {
  return Math.round(n * 1e4) / 1e4
}
