import { describe, it, expect } from 'vitest'
import { cosine, euclidean, centroid, normalize, norm } from '../src/lib/vec.js'

describe('vec', () => {
  it('cosine of identical direction is 1', () => {
    expect(cosine([1, 0], [2, 0])).toBeCloseTo(1)
  })

  it('cosine of orthogonal vectors is 0', () => {
    expect(cosine([1, 0], [0, 1])).toBeCloseTo(0)
  })

  it('cosine handles zero vectors without NaN', () => {
    expect(cosine([0, 0], [1, 1])).toBe(0)
  })

  it('euclidean distance is symmetric', () => {
    expect(euclidean([0, 0], [3, 4])).toBeCloseTo(5)
    expect(euclidean([3, 4], [0, 0])).toBeCloseTo(5)
  })

  it('centroid averages component-wise', () => {
    expect(centroid([[0, 0], [2, 4]])).toEqual([1, 2])
  })

  it('normalize returns a unit vector', () => {
    const u = normalize([3, 4])
    expect(norm(u)).toBeCloseTo(1)
  })
})
