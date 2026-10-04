import { distance } from '@turf/distance'
import type { CityCount, IndiaFeatureCollection, JobPin, Origin, StateCount } from '../types.ts'
import { squareRing } from './geometry.ts'

export function countJobsByState(jobs: JobPin[]): Record<string, number> {
  const counts: Record<string, number> = {}
  for (const job of jobs) {
    if (job.workMode === 'remote' || !job.code) continue
    counts[job.code] = (counts[job.code] ?? 0) + 1
  }
  return counts
}

export function stateCountsFromMap(geo: IndiaFeatureCollection, counts: Record<string, number>): StateCount[] {
  return geo.features
    .map((feature) => ({
      code: feature.properties.code,
      name: feature.properties.name,
      jobs: counts[feature.properties.code] ?? 0,
    }))
    .sort((a, b) => b.jobs - a.jobs || a.name.localeCompare(b.name))
}

export function withJobCounts(geo: IndiaFeatureCollection, counts: Record<string, number>): IndiaFeatureCollection {
  return {
    type: 'FeatureCollection',
    features: geo.features.map((feature) => ({
      ...feature,
      properties: {
        ...feature.properties,
        jobs: counts[feature.properties.code] ?? 0,
      },
    })),
  }
}

export function cityCounts(jobs: JobPin[], origin: Origin): CityCount[] {
  const grouped = new Map<string, CityCount>()

  for (const job of jobs) {
    if (job.workMode === 'remote' || !job.city || job.latitude == null || job.longitude == null || !job.code || !job.state) {
      continue
    }
    const existing = grouped.get(job.city)
    if (existing) {
      existing.jobs += 1
      continue
    }
    const distanceKm = distance([origin.longitude, origin.latitude], [job.longitude, job.latitude], {
      units: 'kilometers',
    })
    grouped.set(job.city, {
      city: job.city,
      state: job.state,
      code: job.code,
      latitude: job.latitude,
      longitude: job.longitude,
      jobs: 1,
      distanceKm,
    })
  }

  return [...grouped.values()].sort((a, b) => a.distanceKm - b.distanceKm || b.jobs - a.jobs)
}

export function cityColumnCollection(cities: CityCount[]) {
  return {
    type: 'FeatureCollection' as const,
    features: cities.map((city) => ({
      type: 'Feature' as const,
      properties: {
        city: city.city,
        code: city.code,
        jobs: city.jobs,
        distanceKm: Math.round(city.distanceKm),
      },
      geometry: {
        type: 'Polygon' as const,
        coordinates: [squareRing(city.longitude, city.latitude, 4.5)],
      },
    })),
  }
}

export function jobsInCity(jobs: JobPin[], city: string): JobPin[] {
  return jobs.filter((job) => job.workMode !== 'remote' && job.city === city)
}

export function remoteJobs(jobs: JobPin[]): JobPin[] {
  return jobs.filter((job) => job.workMode === 'remote')
}
