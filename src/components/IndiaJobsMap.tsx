import { useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, Marker, Popup, Source } from 'react-map-gl/maplibre'
import type { CircleLayerSpecification, FillLayerSpecification, LineLayerSpecification } from 'maplibre-gl'
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { cityCounts, countJobsByState, stateCountsFromMap, withJobCounts } from '../lib/aggregateJobs.ts'
import { applyFilters, filterWithoutMode, type JobFilters, type ModeFilter } from '../lib/filterJobs.ts'
import { geometryBBox } from '../lib/geometry.ts'
import { useMediaQuery, usePrefersReducedMotion } from '../lib/useMedia.ts'
import type { IndiaFeatureCollection, JobPin, Origin } from '../types.ts'
import { JobBrowser } from './JobBrowser.tsx'
import { MapChrome } from './MapChrome.tsx'

const INDIA_VIEW = { longitude: 79.2, latitude: 22.2, zoom: 3.6, bearing: 0 }
const INDIA_MAX_BOUNDS: [number, number, number, number] = [67.2, 5.8, 98.2, 37.6]
const STREET_STYLE = 'https://tiles.openfreemap.org/styles/bright'
// Hover only darkens the state border, so the red job-count fill stays readable.
const HOVER_LINE = '#7F1D1D'
// The basemap draws de facto borders. India's own outline is drawn from our state data instead.
const BASEMAP_BOUNDARY_LAYERS = ['boundary_2', 'boundary_3', 'boundary_disputed']
const MAP_PITCH = 28
const DEFAULT_FILTERS: JobFilters = { query: '', city: '', stateCode: null, mode: 'all', sort: 'recent' }

type IndiaJobsMapProps = {
  geo: IndiaFeatureCollection
  jobs: JobPin[]
  showPanels: boolean
  onOpenJob: (job: JobPin) => void
}

type OfficePin = {
  name: string
  address: string
  latitude: number
  longitude: number
}

type HoverTip = {
  name: string
  code: string
  jobs: number
  longitude: number
  latitude: number
}

// Only used to order the city dots; the sidebar no longer shows distances.
const REFERENCE_ORIGIN: Origin = { name: 'Bengaluru', latitude: 12.9716, longitude: 77.5946 }

function readFeature(event: MapLayerMouseEvent, layerId: string) {
  return (event.features ?? []).find((feature) => feature.layer.id === layerId)
}

export function IndiaJobsMap({ geo, jobs: initialJobs, showPanels, onOpenJob }: IndiaJobsMapProps) {
  const mapRef = useRef<MapRef>(null)
  const projectionRef = useRef<'globe' | 'mercator'>('mercator')
  const countryZoomRef = useRef(INDIA_VIEW.zoom)
  const backRef = useRef<() => void>(() => {})
  const isWide = useMediaQuery('(min-width: 768px)')
  const reducedMotion = usePrefersReducedMotion()
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [filters, setFilters] = useState<JobFilters>(DEFAULT_FILTERS)
  const [hover, setHover] = useState<HoverTip | null>(null)
  const [hoveredJobCode, setHoveredJobCode] = useState<string | null>(null)
  const jobs = initialJobs
  const [office, setOffice] = useState<OfficePin | null>(null)
  const [streetLevel, setStreetLevel] = useState(false)

  const counts = useMemo(() => countJobsByState(jobs), [jobs])
  const coloredGeo = useMemo(() => withJobCounts(geo, counts), [geo, counts])
  const states = useMemo(() => stateCountsFromMap(geo, counts), [geo, counts])
  const allCities = useMemo(() => cityCounts(jobs, REFERENCE_ORIGIN), [jobs])
  const selectedCities = useMemo(
    () => (selectedCode ? allCities.filter((city) => city.code === selectedCode) : []),
    [allCities, selectedCode],
  )
  const cityGeo = useMemo(
    () => ({
      type: 'FeatureCollection' as const,
      features: selectedCities.map((city) => ({
        type: 'Feature' as const,
        properties: { city: city.city, code: city.code, jobs: city.jobs },
        geometry: { type: 'Point' as const, coordinates: [city.longitude, city.latitude] },
      })),
    }),
    [selectedCities],
  )
  const visibleCities = useMemo(
    () =>
      (filters.stateCode ? allCities.filter((city) => city.code === filters.stateCode) : allCities)
        .slice()
        .sort((a, b) => a.city.localeCompare(b.city)),
    [allCities, filters.stateCode],
  )
  const visibleJobs = useMemo(() => applyFilters(jobs, filters), [jobs, filters])
  const modeCounts = useMemo(() => {
    const rest = filterWithoutMode(jobs, filters)
    const counts: Record<ModeFilter, number> = { all: rest.length, remote: 0, hybrid: 0, onsite: 0 }
    for (const job of rest) counts[job.workMode] += 1
    return counts
  }, [jobs, filters])
  const maxJobs = Math.max(1, ...states.map((state) => state.jobs))
  const scaleMax = Math.max(maxJobs, 2)
  const selectedState = states.find((state) => state.code === selectedCode) ?? null
  const activeCity = filters.city
  const pitch = MAP_PITCH
  const duration = reducedMotion ? 0 : 900

  function runCamera(run: (map: MapRef) => void) {
    const map = mapRef.current
    if (!map) return
    const act = () => {
      const ready = mapRef.current
      if (!ready) return
      try {
        run(ready)
      } catch {
        // The style can still be swapping on the first frame.
      }
    }
    if (map.isStyleLoaded()) {
      act()
      return
    }
    map.once('load', act)
  }

  const highlightCode = hoveredJobCode ?? hover?.code ?? ''

  const fillPaint = useMemo(() => {
    const stateOpacity = (factor: number) => [
      '*',
      factor,
      [
        'case',
        ['==', ['get', 'code'], selectedCode ?? ''],
        0.72,
        ['==', ['get', 'jobs'], 0],
        0.16,
        0.5,
      ],
    ]
    return {
      'fill-color': [
        'case',
        ['==', ['get', 'code'], selectedCode ?? ''],
        '#DC2626',
        ['==', ['get', 'jobs'], 0],
        '#FFFFFF',
        ['interpolate', ['linear'], ['get', 'jobs'], 1, '#FECACA', scaleMax, '#DC2626'],
      ],
      'fill-opacity': [
        'interpolate',
        ['linear'],
        ['zoom'],
        5.2,
        stateOpacity(1),
        7.4,
        stateOpacity(0.28),
        9,
        0,
      ],
    } as unknown as FillLayerSpecification['paint']
  }, [scaleMax, selectedCode])

  const linePaint = useMemo(() => {
    return {
      'line-color': [
        'case',
        ['==', ['get', 'code'], highlightCode],
        HOVER_LINE,
        ['==', ['get', 'code'], selectedCode ?? ''],
        '#DC2626',
        '#94A3B8',
      ],
      'line-width': [
        'case',
        ['==', ['get', 'code'], highlightCode],
        3,
        ['==', ['get', 'code'], selectedCode ?? ''],
        2.4,
        1.1,
      ],
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 5.2, 1, 7.4, 0.28, 9, 0],
    } as LineLayerSpecification['paint']
  }, [highlightCode, selectedCode])

  const cityPaint = useMemo(() => {
    return {
      'circle-radius': ['interpolate', ['linear'], ['get', 'jobs'], 1, 7, scaleMax, 18],
      'circle-color': ['case', ['==', ['get', 'city'], activeCity], '#7F1D1D', '#DC2626'],
      'circle-stroke-width': 2,
      'circle-stroke-color': '#FFFFFF',
      'circle-opacity': ['interpolate', ['linear'], ['zoom'], 8, 0.95, 11.5, 0],
      'circle-stroke-opacity': ['interpolate', ['linear'], ['zoom'], 8, 1, 11.5, 0],
    } as CircleLayerSpecification['paint']
  }, [activeCity, scaleMax])

  const interactiveLayerIds = useMemo(() => {
    if (streetLevel) return selectedCities.length > 0 ? ['city-circles'] : []
    return selectedCities.length > 0 ? ['states-fill', 'city-circles'] : ['states-fill']
  }, [selectedCities.length, streetLevel])

  function selectState(code: string) {
    setSelectedCode(code)
    setFilters((current) => ({ ...current, stateCode: code, city: '' }))
    const feature = geo.features.find((item) => item.properties.code === code)
    if (!feature) return
    const [west, south, east, north] = geometryBBox(feature.geometry)
    runCamera((map) => {
      map.fitBounds(
        [
          [west, south],
          [east, north],
        ],
        {
          padding: isWide
            ? { top: 88, right: 40, bottom: 36, left: 40 }
            : { top: 240, right: 20, bottom: 320, left: 20 },
          pitch,
          bearing: 0,
          maxZoom: 6.4,
          duration,
        },
      )
    })
  }

  function showOffice(place: { name: string | null; address: string; latitude: number | null; longitude: number | null }) {
    if (place.latitude == null || place.longitude == null) return
    const latitude = place.latitude
    const longitude = place.longitude
    setOffice({
      name: place.name ?? 'Office',
      address: place.address,
      latitude,
      longitude,
    })
    runCamera((map) => {
      map.flyTo({
        center: [longitude, latitude],
        zoom: 14,
        pitch,
        bearing: 0,
        duration: reducedMotion ? 0 : 1100,
        padding: isWide
          ? { top: 88, right: 48, bottom: 48, left: 48 }
          : { top: 88, right: 24, bottom: Math.round(map.getCanvas().clientHeight * 0.62), left: 24 },
      })
    })
  }

  function indiaCamera(map: MapRef) {
    const fitted = map.getMap().cameraForBounds(INDIA_MAX_BOUNDS, {
      padding: isWide
        ? { top: 88, right: 24, bottom: 24, left: 24 }
        : { top: 88, right: 24, bottom: Math.round(map.getCanvas().clientHeight * 0.62), left: 24 },
    })
    const zoom = fitted?.zoom ?? 3.6
    map.getMap().setMinZoom(Math.max(2, zoom - 0.3))
    countryZoomRef.current = zoom
    return {
      center: [INDIA_VIEW.longitude, INDIA_VIEW.latitude] as [number, number],
      zoom,
      pitch,
      bearing: 0,
    }
  }

  function showIndia() {
    setSelectedCode(null)
    setOffice(null)
    setFilters((current) => ({ ...current, stateCode: null, city: '' }))
    runCamera((map) => {
      map.flyTo({ ...indiaCamera(map), duration: reducedMotion ? 0 : 1100 })
    })
  }

  function onFilters(patch: Partial<JobFilters>) {
    setFilters((current) => ({ ...current, ...patch }))
    if (patch.city === undefined) return
    if (patch.city === '') {
      setSelectedCode(filters.stateCode)
      return
    }
    const city = allCities.find((item) => item.city === patch.city)
    if (!city) return
    setSelectedCode(city.code)
    runCamera((map) => {
      map.flyTo({
        center: [city.longitude, city.latitude],
        zoom: 9,
        pitch,
        bearing: 0,
        duration,
        padding: isWide
          ? { top: 88, right: 40, bottom: 36, left: 40 }
          : { top: 240, right: 20, bottom: 320, left: 20 },
      })
    })
  }

  function resetFilters() {
    setOffice(null)
    setFilters(DEFAULT_FILTERS)
    if (selectedCode) showIndia()
  }

  function hideBasemapBoundaries() {
    const map = mapRef.current?.getMap()
    if (!map?.isStyleLoaded()) return
    for (const id of BASEMAP_BOUNDARY_LAYERS) {
      if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none')
    }
  }

  function syncView(zoom: number) {
    const nextStreet = zoom >= 8.2
    setStreetLevel((current) => (current === nextStreet ? current : nextStreet))
  }

  function fitGlobe() {
    const map = mapRef.current
    if (!map) return
    const canvas = map.getCanvas()
    if (canvas.clientWidth < 10 || canvas.clientHeight < 10) return
    map.jumpTo(indiaCamera(map))
  }

  function onMapClick(event: MapLayerMouseEvent) {
    const cityFeature = (event.features ?? []).find((feature) => feature.layer.id === 'city-circles')
    const cityName = cityFeature?.properties?.city
    const cityCode = cityFeature?.properties?.code
    if (typeof cityName === 'string' && typeof cityCode === 'string') {
      setSelectedCode(cityCode)
      setFilters((current) => ({ ...current, city: cityName }))
      return
    }
    const stateFeature =
      readFeature(event, 'states-fill')
    const code = stateFeature?.properties?.code
    if (typeof code === 'string') selectState(code)
  }

  function onMapMove(event: MapLayerMouseEvent) {
    const cityFeature = (event.features ?? []).find((feature) => feature.layer.id === 'city-circles')
    const stateFeature =
      readFeature(event, 'states-fill')
    const feature = cityFeature ?? stateFeature
    const properties = feature?.properties
    if (!feature || !properties) {
      setHover(null)
      return
    }
    const isCity = feature.layer.id === 'city-circles'
    const name = isCity ? properties.city : properties.name
    const code = properties.code
    if (typeof name !== 'string' || typeof code !== 'string') {
      setHover(null)
      return
    }
    const next = {
      name,
      code,
      jobs: Number(properties.jobs ?? 0),
      longitude: event.lngLat.lng,
      latitude: event.lngLat.lat,
    }
    setHover((current) => {
      if (
        current &&
        current.name === next.name &&
        current.code === next.code &&
        current.jobs === next.jobs &&
        Math.abs(current.longitude - next.longitude) < 0.05 &&
        Math.abs(current.latitude - next.latitude) < 0.05
      ) {
        return current
      }
      return next
    })
  }

  backRef.current = () => {
    if (selectedCode) showIndia()
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      backRef.current()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const fitGlobeRef = useRef(fitGlobe)
  fitGlobeRef.current = fitGlobe

  useEffect(() => {
    const onResize = () => {
      const map = mapRef.current
      if (!map) return
      if (map.getZoom() > countryZoomRef.current + 0.45) return
      fitGlobeRef.current()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const announcement = `${visibleJobs.length} of ${jobs.length} Rails roles shown.`

  const panelClass = isWide
    ? 'absolute bottom-0 left-0 top-[4.5rem] z-30 flex w-[min(34rem,45vw)] min-h-0 flex-col overflow-hidden border-r border-slate-200 bg-white shadow-lg'
    : 'absolute inset-x-4 bottom-4 z-30 flex max-h-[68dvh] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-lg backdrop-blur-md'

  return (
    <div className="relative h-dvh w-full overflow-hidden bg-[#f8f4f0] font-sans text-ink">
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <div
        className={`absolute inset-y-0 right-0 ${showPanels && isWide ? 'left-[min(34rem,45vw)]' : 'left-0'}`}
        role="region"
        aria-label="Map of Rails jobs across Indian states"
      >
        <Map
          ref={mapRef}
          mapStyle={STREET_STYLE}
          initialViewState={{ ...INDIA_VIEW, pitch }}
          minZoom={2}
          maxZoom={16}
          renderWorldCopies={false}
          dragRotate={false}
          pitchWithRotate={false}
          cooperativeGestures={false}
          scrollZoom
          style={{ width: '100%', height: '100%' }}
          interactiveLayerIds={interactiveLayerIds}
          cursor={hover ? 'pointer' : 'grab'}
          onLoad={() => {
            mapRef.current?.getMap().setProjection({ type: 'mercator' })
            mapRef.current?.getMap().setMaxBounds(INDIA_MAX_BOUNDS)
            hideBasemapBoundaries()
            fitGlobe()
          }}
          onStyleData={() => {
            const map = mapRef.current?.getMap()
            if (!map?.isStyleLoaded()) return
            hideBasemapBoundaries()
            if (map.getProjection()?.type === projectionRef.current) return
            map.setProjection({ type: projectionRef.current })
          }}
          onMove={(event) => {
            syncView(event.viewState.zoom)
          }}
          onClick={onMapClick}
          onMouseMove={onMapMove}
          onMouseLeave={() => setHover(null)}
        >
          <Source id="states" type="geojson" data={coloredGeo as GeoJSON.FeatureCollection}>
            <Layer id="states-fill" type="fill" paint={fillPaint} />
            <Layer id="states-line" type="line" paint={linePaint} />
          </Source>
          <Source id="india-outline" type="geojson" data="/india-outline.geojson">
            <Layer
              id="india-outline-line"
              type="line"
              paint={{ 'line-color': '#475569', 'line-width': 1.4, 'line-opacity': 0.9 }}
            />
          </Source>
          {selectedCities.length > 0 ? (
            <Source id="cities" type="geojson" data={cityGeo}>
              <Layer id="city-circles" type="circle" paint={cityPaint} />
            </Source>
          ) : null}
          {office ? (
            <>
              <Marker longitude={office.longitude} latitude={office.latitude} anchor="bottom">
                <span className="block h-5 w-5 rounded-full border-2 border-white bg-ink shadow-md" title={office.name}>
                  <span className="sr-only">{office.name}</span>
                </span>
              </Marker>
              <Popup
                longitude={office.longitude}
                latitude={office.latitude}
                closeButton={false}
                closeOnClick={false}
                anchor="top"
                offset={12}
                className="jobs-tip"
              >
                <p className="text-sm font-medium text-ink">{office.name}</p>
                <p className="mt-0.5 max-w-56 text-xs text-ink-muted">{office.address}</p>
              </Popup>
            </>
          ) : null}
          {hover ? (
            <Popup
              longitude={hover.longitude}
              latitude={hover.latitude}
              closeButton={false}
              closeOnClick={false}
              anchor="bottom"
              offset={16}
              className="jobs-tip"
            >
              <p className="text-sm font-medium text-ink">{hover.name}</p>
              <p className="font-brand text-sm text-brand">{hover.jobs} jobs</p>
            </Popup>
          ) : null}
        </Map>
      </div>

      <MapChrome showBack={showPanels && selectedCode !== null} onBack={showIndia} />

      {showPanels ? (
        <aside className={panelClass}>
          <JobBrowser
            jobs={visibleJobs}
            total={jobs.length}
            filters={filters}
            cities={visibleCities}
            stateName={selectedState && filters.stateCode ? selectedState.name : null}
            modeCounts={modeCounts}
            onFilters={onFilters}
            onClearState={showIndia}
            onReset={resetFilters}
            onHoverJob={setHoveredJobCode}
            onShowOffice={showOffice}
            onOpenJob={onOpenJob}
          />
        </aside>
      ) : null}
    </div>
  )
}
