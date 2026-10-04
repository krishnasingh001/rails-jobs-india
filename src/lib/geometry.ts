import type { IndiaGeometry } from '../types.ts'

export function geometryBBox(geometry: IndiaGeometry): [number, number, number, number] {
  let minX = 180
  let minY = 90
  let maxX = -180
  let maxY = -90

  const walk = (node: unknown) => {
    if (!Array.isArray(node) || node.length === 0) return
    if (typeof node[0] === 'number' && typeof node[1] === 'number') {
      const x = node[0]
      const y = node[1]
      minX = Math.min(minX, x)
      minY = Math.min(minY, y)
      maxX = Math.max(maxX, x)
      maxY = Math.max(maxY, y)
      return
    }
    node.forEach(walk)
  }

  walk(geometry.coordinates)
  return [minX, minY, maxX, maxY]
}

export function bboxCenter(bounds: [number, number, number, number]): { longitude: number; latitude: number } {
  return {
    longitude: (bounds[0] + bounds[2]) / 2,
    latitude: (bounds[1] + bounds[3]) / 2,
  }
}

type Position = [number, number]

export function squareRing(longitude: number, latitude: number, halfKm: number): Position[] {
  const latRad = (latitude * Math.PI) / 180
  const dLat = halfKm / 110.574
  const dLng = halfKm / (111.32 * Math.cos(latRad))
  const ring: Position[] = [
    [longitude - dLng, latitude - dLat],
    [longitude + dLng, latitude - dLat],
    [longitude + dLng, latitude + dLat],
    [longitude - dLng, latitude + dLat],
    [longitude - dLng, latitude - dLat],
  ]
  return ring
}
