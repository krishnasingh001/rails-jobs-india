export type CompanyPlace = {
  name: string | null
  address: string
  latitude: number | null
  longitude: number | null
  mapsUrl: string | null
}

function isPlace(value: unknown): value is CompanyPlace {
  if (!value || typeof value !== 'object') return false
  const place = value as Partial<CompanyPlace>
  return typeof place.address === 'string'
}

export async function loadCompanyPlace(jobId: string): Promise<CompanyPlace | null> {
  const response = await fetch(`/api/v1/place?job_id=${encodeURIComponent(jobId)}`)
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'error' in payload && typeof payload.error === 'string'
        ? payload.error
        : 'Could not look up this office.'
    throw new Error(message)
  }
  if (!payload || typeof payload !== 'object' || !('place' in payload)) {
    throw new Error('SerpApi returned an unexpected office.')
  }
  if (payload.place == null) return null
  if (!isPlace(payload.place)) throw new Error('SerpApi returned an unexpected office.')
  return payload.place
}
