import { describe, it, expect } from 'vitest'
import { tokenize, labelClusters } from '../src/lib/labels.js'

describe('tokenize', () => {
  it('drops stopwords, short tokens, and punctuation', () => {
    expect(tokenize('The quick, brown fox!')).toEqual(['quick', 'brown', 'fox'])
  })

  it('drops pure numbers', () => {
    expect(tokenize('order 12345 shipped')).toEqual(['order', 'shipped'])
  })

  it('keeps accented letters intact rather than mangling them', () => {
    // Regression: a Latin-1 replace turned "café" into "caf" and "résumé"
    // into "sum". Unicode-aware tokenization preserves the whole word.
    expect(tokenize('Café résumé naïve')).toEqual(['café', 'résumé', 'naïve'])
    expect(tokenize('über Zürich')).toEqual(['über', 'zürich'])
  })

  it('drops non-ASCII numerals as it drops ASCII ones', () => {
    // Arabic-Indic digits are numbers too — they should not become labels.
    expect(tokenize('order ٥٥٥ shipped')).toEqual(['order', 'shipped'])
  })

  it('returns nothing for emoji-only or punctuation-only text', () => {
    expect(tokenize('🎉🚀✨')).toEqual([])
    expect(tokenize('!!! ... ??? —')).toEqual([])
    expect(tokenize('   ')).toEqual([])
  })
})

describe('labelClusters', () => {
  it('names clusters by their distinctive terms', () => {
    const texts = [
      'refund my invoice please',
      'billing invoice was wrong',
      'the login page is broken',
      'cannot login to my account',
    ]
    const assignments = [0, 0, 1, 1]
    const labels = labelClusters(texts, assignments, 2)
    expect(labels[0]).toMatch(/invoice/)
    expect(labels[1]).toMatch(/login/)
  })

  it('returns a label for every cluster', () => {
    const labels = labelClusters(['apple pie', 'apple tart'], [0, 1], 2)
    expect(labels).toHaveLength(2)
    expect(labels[1]).toBeTruthy()
  })

  it('falls back to "misc" for an empty cluster', () => {
    const labels = labelClusters(['hello world'], [0], 2)
    expect(labels[1]).toBe('misc')
  })

  it('ignores documents whose assignment is out of range', () => {
    // A negative, null, or >= k assignment must be skipped, not crash or leak
    // its terms into a cluster.
    const texts = ['alpha beta', 'gamma delta', 'orphaned words', 'nullish words']
    const assignments = [0, 0, -1, 5] // last two are out of range for k=1
    const labels = labelClusters(texts, assignments, 1)
    expect(labels).toHaveLength(1)
    expect(labels[0]).toMatch(/alpha|beta|gamma|delta/)
    expect(labels[0]).not.toMatch(/orphaned|nullish/)
  })

  it('labels a single-cluster corpus from its own terms', () => {
    // Exercises the idf denominator when every doc shares the term.
    const labels = labelClusters(['mango mango', 'mango sweet'], [0, 0], 1)
    expect(labels[0]).toMatch(/mango/)
  })

  it('handles an empty corpus without dividing by zero', () => {
    // texts.length is 0 here, exercising the `totalDocs = texts.length || 1`
    // fallback; every cluster is empty so all labels fall back to "misc".
    expect(labelClusters([], [], 3)).toEqual(['misc', 'misc', 'misc'])
  })
})
