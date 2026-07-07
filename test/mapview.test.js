import { describe, it, expect } from 'vitest'
import { clusterCentroids2D } from '../src/render/mapview.js'

describe('clusterCentroids2D', () => {
  it('averages each cluster’s member positions', () => {
    const points = [
      { x: 0, y: 0, cluster: 0 },
      { x: 2, y: 0, cluster: 0 },
      { x: 10, y: 10, cluster: 1 },
    ]
    const c = clusterCentroids2D(points, 2)
    expect(c[0]).toEqual({ x: 1, y: 0 })
    expect(c[1]).toEqual({ x: 10, y: 10 })
  })

  it('returns a centroid per cluster id, origin for empty clusters', () => {
    const points = [{ x: 4, y: 4, cluster: 0 }]
    const c = clusterCentroids2D(points, 3)
    expect(c).toHaveLength(3)
    expect(c[0]).toEqual({ x: 4, y: 4 })
    expect(c[1]).toEqual({ x: 0, y: 0 })
    expect(c[2]).toEqual({ x: 0, y: 0 })
  })

  it('ignores points whose cluster is out of range', () => {
    const points = [
      { x: 1, y: 1, cluster: 0 },
      { x: 9, y: 9, cluster: 5 }, // out of range for k=1
    ]
    const c = clusterCentroids2D(points, 1)
    expect(c).toHaveLength(1)
    expect(c[0]).toEqual({ x: 1, y: 1 })
  })
})
