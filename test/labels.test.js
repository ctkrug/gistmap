import { describe, it, expect } from 'vitest'
import { tokenize, labelClusters } from '../src/lib/labels.js'

describe('tokenize', () => {
  it('drops stopwords, short tokens, and punctuation', () => {
    expect(tokenize('The quick, brown fox!')).toEqual(['quick', 'brown', 'fox'])
  })

  it('drops pure numbers', () => {
    expect(tokenize('order 12345 shipped')).toEqual(['order', 'shipped'])
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
})
