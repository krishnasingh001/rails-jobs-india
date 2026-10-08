import { useEffect, useMemo, useRef, useState } from 'react'
import Map, { Layer, Marker, Popup, Source } from 'react-map-gl/maplibre'
import type { CircleLayerSpecification, FillLayerSpecification, LineLayerSpecification, StyleSpecification } from 'maplibre-gl'
import type { MapLayerMouseEvent, MapRef } from 'react-map-gl/maplibre'
import 'maplibre-gl/dist/maplibre-gl.css'
import { cityByName } from '../data/cities.ts'
import { harvestJobs } from '../data/serpJobs.ts'
import {
  cityCounts,
  countJobsByState,
  jobsInCity,
  remoteJobs,
  stateCountsFromMap,
  withJobCounts,
} from '../lib/aggregateJobs.ts'
import { geometryBBox } from '../lib/geometry.ts'
import { useMediaQuery, usePrefersReducedMotion } from '../lib/useMedia.ts'
import type { IndiaFeatureCollection, JobPin, Origin, Panel } from '../types.ts'
import { JobDrawer } from './JobDrawer.tsx'
import { MapChrome } from './MapChrome.tsx'
import { PlaceList } from './PlaceList.tsx'

const INDIA_VIEW = { longitude: 79.2, latitude: 22.2, zoom: 1.7, bearing: 0 }
const INDIA_MAX_BOUNDS: [number, number, number, number] = [67.2, 5.8, 98.2, 36.2]
const STREET_STYLE = 'https://tiles.openfreemap.org/styles/bright'
const EARTH_STYLE = {
  version: 8,
  projection: { type: 'globe' },
  sources: {
    satellite: {
      type: 'raster',
      tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'],
      tileSize: 256,
      attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
    },
  },
  layers: [
    { id: 'ocean', type: 'background', paint: { 'background-color': '#16324f' } },
    { id: 'satellite', type: 'raster', source: 'satellite' },
  ],
} as StyleSpecification
const GLOBE_FOV = 0.6435011087932844

function fittedGlobeZoom(width: number, height: number, wide: boolean) {
  const horizontalRoom = wide ? Math.max(280, width - 660) : Math.max(220, width - 24)
  const verticalRoom = wide ? Math.max(280, height - 32) : Math.max(220, height * 0.46)
  const targetRadius = (Math.min(horizontalRoom, verticalRoom) * 0.96) / 2
  const distance = (0.5 / Math.tan(GLOBE_FOV / 2)) * Math.max(height, 1)
  const radius = (targetRadius * distance) / Math.hypot(distance, targetRadius)
  const cosLat = Math.cos((INDIA_VIEW.latitude * Math.PI) / 180)
  return Math.log2((radius * 2 * Math.PI * cosLat) / 512)
}

type IndiaJobsMapProps = {
  geo: IndiaFeatureCollection
  jobs: JobPin[]
  showPanels: boolean
  onSignIn: () => void
  onSignUp: () => void
  onOpenApplications: () => void
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

function toOrigin(name: string): Origin {
  const city = cityByName(name)
  if (!city) return { name: 'Bengaluru', latitude: 12.9716, longitude: 77.5946 }
  return { name: city.name, latitude: city.latitude, longitude: city.longitude }
}

function readFeature(event: MapLayerMouseEvent, layerId: string) {
  return (event.features ?? []).find((feature) => feature.layer.id === layerId)
}

export function IndiaJobsMap({ geo, jobs: initialJobs, showPanels, onSignIn, onSignUp, onOpenApplications }: IndiaJobsMapProps) {
  const mapRef = useRef<MapRef>(null)
  const projectionRef = useRef<'globe' | 'mercator'>('globe')
  const globeZoomRef = useRef(INDIA_VIEW.zoom)
  const boundsLockedRef = useRef(false)
  const previousRef = useRef<Panel>({ kind: 'states' })
  const backRef = useRef<() => void>(() => {})
  const isWide = useMediaQuery('(min-width: 768px)')
  const reducedMotion = usePrefersReducedMotion()
  const [origin, setOrigin] = useState<Origin>(() => toOrigin('Bengaluru'))
  const [usingDeviceLocation, setUsingDeviceLocation] = useState(false)
  const [locateMessage, setLocateMessage] = useState<string | null>(null)
  const [pitched, setPitched] = useState(true)
  const [earth, setEarth] = useState(false)
  const [selectedCode, setSelectedCode] = useState<string | null>(null)
  const [panel, setPanel] = useState<Panel>({ kind: 'states' })
  const [query, setQuery] = useState('')
  const [hover, setHover] = useState<HoverTip | null>(null)
  const [jobs, setJobs] = useState(initialJobs)
  const [harvesting, setHarvesting] = useState(false)
  const [harvestMessage, setHarvestMessage] = useState<string | null>(null)
  const [harvestFailed, setHarvestFailed] = useState(false)
  const [office, setOffice] = useState<OfficePin | null>(null)
  const [streetLevel, setStreetLevel] = useState(false)

  if (panel.kind !== 'remote') previousRef.current = panel

  const counts = useMemo(() => countJobsByState(jobs), [jobs])
  const coloredGeo = useMemo(() => withJobCounts(geo, counts), [geo, counts])
  const states = useMemo(() => stateCountsFromMap(geo, counts), [geo, counts])
  const allCities = useMemo(() => cityCounts(jobs, origin), [jobs, origin])
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
  const remoteList = useMemo(() => remoteJobs(jobs), [jobs])
  const maxJobs = Math.max(1, ...states.map((state) => state.jobs))
  const scaleMax = Math.max(maxJobs, 2)
  const selectedState = states.find((state) => state.code === selectedCode) ?? null
  const activeCity = panel.kind === 'jobs' ? panel.city : ''
  const pitch = pitched ? 28 : 0
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

  const locatedJobs = jobs.filter((job) => job.workMode !== 'remote').length
  const hiringStates = states.filter((state) => state.jobs > 0).length

  const fillPaint = useMemo(() => {
    return {
      'fill-color': [
        'case',
        ['==', ['get', 'code'], selectedCode ?? ''],
        '#DC2626',
        ['==', ['get', 'code'], hover?.code ?? ''],
        '#F87171',
        ['==', ['get', 'jobs'], 0],
        '#FFFFFF',
        ['interpolate', ['linear'], ['get', 'jobs'], 1, '#FECACA', scaleMax, '#DC2626'],
      ],
      'fill-opacity': [
        '*',
        ['interpolate', ['linear'], ['zoom'], 5.2, 1, 7.4, 0.28, 9, 0],
        [
          'case',
          ['==', ['get', 'code'], selectedCode ?? ''],
          0.72,
          ['==', ['get', 'code'], hover?.code ?? ''],
          0.55,
          ['==', ['get', 'jobs'], 0],
          0.16,
          0.5,
        ],
      ],
    } as FillLayerSpecification['paint']
  }, [hover?.code, scaleMax, selectedCode])

  const linePaint = useMemo(() => {
    return {
      'line-color': [
        'case',
        ['==', ['get', 'code'], selectedCode ?? ''],
        '#DC2626',
        ['==', ['get', 'code'], hover?.code ?? ''],
        '#F87171',
        earth ? '#FFFFFF' : '#94A3B8',
      ],
      'line-width': ['case', ['==', ['get', 'code'], selectedCode ?? ''], 2.4, 1.1],
      'line-opacity': ['interpolate', ['linear'], ['zoom'], 5.2, 1, 7.4, 0.28, 9, 0],
    } as LineLayerSpecification['paint']
  }, [earth, hover?.code, selectedCode])

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
    setPanel({ kind: 'cities', code })
    setQuery('')
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
            ? { top: 88, right: 340, bottom: 36, left: 40 }
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
          ? { top: 88, right: 360, bottom: 48, left: 48 }
          : { top: 88, right: 24, bottom: 340, left: 24 },
      })
    })
  }

  function showIndia() {
    setSelectedCode(null)
    setOffice(null)
    setPanel({ kind: 'states' })
    setQuery('')
    runCamera((map) => {
      const canvas = map.getCanvas()
      const zoom = fittedGlobeZoom(canvas.clientWidth, canvas.clientHeight, isWide)
      globeZoomRef.current = zoom
      map.getMap().setMinZoom(Math.max(0.4, zoom - 0.35))
      map.flyTo({
        center: [INDIA_VIEW.longitude, INDIA_VIEW.latitude],
        zoom,
        pitch,
        bearing: 0,
        duration: reducedMotion ? 0 : 1100,
      })
    })
  }

  function togglePitch() {
    const next = !pitched
    setPitched(next)
    runCamera((map) => {
      map.easeTo({
        pitch: next ? 28 : 0,
        duration: reducedMotion ? 0 : 250,
      })
    })
  }

  function onLocate() {
    if (!navigator.geolocation) {
      setUsingDeviceLocation(false)
      setOrigin(toOrigin('Bengaluru'))
      setLocateMessage('Location is unavailable. Staying on Bengaluru.')
      return
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setOrigin({
          name: 'Your location',
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
        setUsingDeviceLocation(true)
        setLocateMessage(null)
      },
      () => {
        setUsingDeviceLocation(false)
        setOrigin(toOrigin('Bengaluru'))
        setLocateMessage('Location was denied. Staying on Bengaluru.')
      },
      { enableHighAccuracy: false, maximumAge: 60_000, timeout: 8_000 },
    )
  }

  function onOriginChange(name: string) {
    setUsingDeviceLocation(false)
    setLocateMessage(null)
    setOrigin(toOrigin(name))
  }

  function openRemote() {
    setPanel((current) => (current.kind === 'remote' ? previousRef.current : { kind: 'remote' }))
  }

  async function onHarvest() {
    setHarvesting(true)
    setHarvestFailed(false)
    setHarvestMessage(null)
    try {
      const { jobs: next, added } = await harvestJobs()
      setJobs(next)
      setHarvestMessage(
        added > 0
          ? `Added ${added} roles. ${next.length} are on the map.`
          : `No new roles in this search. ${next.length} are already on the map.`,
      )
    } catch (error) {
      setHarvestFailed(true)
      setHarvestMessage(error instanceof Error ? error.message : 'Could not fetch jobs.')
    } finally {
      setHarvesting(false)
    }
  }

  function syncView(zoom: number) {
    const map = mapRef.current?.getMap()
    if (map) {
      const next =
        projectionRef.current === 'globe' ? (zoom >= 6.2 ? 'mercator' : 'globe') : zoom <= 5.2 ? 'globe' : 'mercator'
      if (next !== projectionRef.current) {
        projectionRef.current = next
        map.setProjection({ type: next })
      }
      const lock = zoom >= 6.4 ? true : zoom <= 6 ? false : boundsLockedRef.current
      if (lock !== boundsLockedRef.current) {
        boundsLockedRef.current = lock
        map.setMaxBounds(lock ? INDIA_MAX_BOUNDS : null)
      }
    }
    const nextStreet = zoom >= 8.2
    setStreetLevel((current) => (current === nextStreet ? current : nextStreet))
  }

  function fitGlobe() {
    const map = mapRef.current
    if (!map) return
    const canvas = map.getCanvas()
    const width = canvas.clientWidth
    const height = canvas.clientHeight
    if (width < 10 || height < 10) return
    const zoom = fittedGlobeZoom(width, height, isWide)
    globeZoomRef.current = zoom
    map.getMap().setMinZoom(Math.max(0.4, zoom - 0.35))
    map.jumpTo({
      center: [INDIA_VIEW.longitude, INDIA_VIEW.latitude],
      zoom,
      pitch,
      bearing: 0,
    })
  }

  function onMapClick(event: MapLayerMouseEvent) {
    const cityFeature = (event.features ?? []).find((feature) => feature.layer.id === 'city-circles')
    const cityName = cityFeature?.properties?.city
    const cityCode = cityFeature?.properties?.code
    if (typeof cityName === 'string' && typeof cityCode === 'string') {
      setSelectedCode(cityCode)
      setPanel({ kind: 'jobs', code: cityCode, city: cityName })
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
    if (panel.kind === 'jobs') {
      setPanel({ kind: 'cities', code: panel.code })
      return
    }
    if (panel.kind === 'remote') {
      setPanel(previousRef.current)
      return
    }
    if (panel.kind === 'cities') showIndia()
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
      if (map.getZoom() > globeZoomRef.current + 0.45) return
      fitGlobeRef.current()
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  const cityJobs = panel.kind === 'jobs' ? jobsInCity(jobs, panel.city) : []
  const activeCityCount =
    panel.kind === 'jobs' ? (allCities.find((city) => city.city === panel.city) ?? null) : null

  const announcement =
    panel.kind === 'remote'
      ? `${remoteList.length} remote Rails roles.`
      : panel.kind === 'jobs'
        ? `${panel.city}, ${cityJobs.length} Rails roles.`
        : panel.kind === 'cities'
          ? `${selectedState?.name ?? 'State'} selected, ${selectedState?.jobs ?? 0} Rails roles.`
          : 'Showing Rails jobs across Indian states.'

  const panelClass = isWide
    ? 'absolute bottom-4 right-4 top-36 z-30 flex w-72 min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-lg backdrop-blur-md'
    : 'absolute inset-x-4 bottom-4 z-30 flex max-h-[min(46vh,calc(100dvh-19rem))] min-h-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white/90 shadow-lg backdrop-blur-md'

  return (
    <div className={`relative h-dvh w-full overflow-hidden font-sans text-ink ${earth ? 'bg-[#16324f]' : 'bg-[#f8f4f0]'}`}>
      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
      <div className="absolute inset-0" role="region" aria-label="Map of Rails jobs across Indian states">
        <Map
          ref={mapRef}
          mapStyle={earth ? EARTH_STYLE : STREET_STYLE}
          initialViewState={{ ...INDIA_VIEW, pitch }}
          minZoom={0.4}
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
            projectionRef.current = 'globe'
            boundsLockedRef.current = false
            mapRef.current?.getMap().setProjection({ type: 'globe' })
            mapRef.current?.getMap().setMaxBounds(null)
            fitGlobe()
          }}
          onStyleData={() => {
            const map = mapRef.current?.getMap()
            if (!map?.isStyleLoaded()) return
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
          {selectedCities.length > 0 ? (
            <Source id="cities" type="geojson" data={cityGeo}>
              <Layer id="city-circles" type="circle" paint={cityPaint} />
            </Source>
          ) : null}
          <Marker longitude={origin.longitude} latitude={origin.latitude} anchor="center">
            <span className="block h-4 w-4 rounded-full border-2 border-white bg-brand shadow-md" title={origin.name}>
              <span className="sr-only">Distance origin {origin.name}</span>
            </span>
          </Marker>
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

      <MapChrome
        origin={origin}
        usingDeviceLocation={usingDeviceLocation}
        locateMessage={locateMessage}
        remoteCount={remoteList.length}
        remoteActive={panel.kind === 'remote'}
        pitched={pitched}
        earth={earth}
        showPanels={showPanels}
        showBack={showPanels && selectedCode !== null}
        locatedJobs={locatedJobs}
        hiringStates={hiringStates}
        onOriginChange={onOriginChange}
        onLocate={onLocate}
        onTogglePitch={togglePitch}
        onToggleEarth={() => setEarth((current) => !current)}
        onBack={showIndia}
        onRemote={openRemote}
        harvesting={harvesting}
        harvestMessage={harvestMessage}
        harvestFailed={harvestFailed}
        onHarvest={() => {
          void onHarvest()
        }}
        onSignIn={onSignIn}
        onSignUp={onSignUp}
        onOpenApplications={onOpenApplications}
      />

      {showPanels ? <aside className={panelClass} data-panel={panel.kind}>
        {panel.kind === 'jobs' ? (
          <JobDrawer
            title={panel.city}
            jobs={cityJobs}
            distanceKm={activeCityCount?.distanceKm ?? null}
            emptyLabel="No Rails roles in this city yet."
            backLabel={selectedState?.name ?? 'Cities'}
            onBack={() => {
              setOffice(null)
              setPanel({ kind: 'cities', code: panel.code })
            }}
            onShowOffice={showOffice}
          />
        ) : null}
        {panel.kind === 'remote' ? (
          <JobDrawer
            title="Remote"
            jobs={remoteList}
            distanceKm={null}
            emptyLabel={null}
            backLabel="Back"
            onBack={() => {
              setOffice(null)
              setPanel(previousRef.current)
            }}
            onShowOffice={showOffice}
          />
        ) : null}
        {panel.kind === 'states' || panel.kind === 'cities' ? (
          <PlaceList
            mode={panel.kind}
            states={states}
            cities={selectedCities}
            stateName={selectedState?.name ?? null}
            query={query}
            hoverCode={hover?.code ?? null}
            selectedCode={selectedCode}
            onQuery={setQuery}
            onSelectState={selectState}
            onSelectCity={(code, city) => {
              setSelectedCode(code)
              setPanel({ kind: 'jobs', code, city })
            }}
            onBackToStates={showIndia}
          />
        ) : null}
      </aside> : null}
    </div>
  )
}
