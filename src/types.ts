export type WorkMode = 'onsite' | 'hybrid' | 'remote'

export type JobPin = {
  id: string
  title: string
  company: string
  city: string | null
  state: string | null
  code: string | null
  latitude: number | null
  longitude: number | null
  workMode: WorkMode
  locationLabel: string
  salaryLabel: string | null
  applyHost: string | null
  applyUrl: string | null
  postedAt: string
}

export type StateCount = {
  code: string
  name: string
  jobs: number
}

export type CityCount = {
  city: string
  state: string
  code: string
  latitude: number
  longitude: number
  jobs: number
  distanceKm: number
}

export type Origin = {
  name: string
  latitude: number
  longitude: number
}

export type IndiaGeometry = {
  type: 'Polygon' | 'MultiPolygon'
  coordinates: number[] | number[][] | number[][][] | number[][][][]
}

export type IndiaFeature = {
  type: 'Feature'
  properties: {
    name: string
    code: string
    jobs: number
  }
  geometry: IndiaGeometry
}

export type IndiaFeatureCollection = {
  type: 'FeatureCollection'
  features: IndiaFeature[]
}

export type Panel =
  | { kind: 'states' }
  | { kind: 'cities'; code: string }
  | { kind: 'jobs'; code: string; city: string }
  | { kind: 'remote' }

export interface JobsSource {
  load(): Promise<JobPin[]>
}
