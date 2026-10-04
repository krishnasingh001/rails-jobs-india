export function formatKilometres(km: number): string {
  return `${Math.round(km)} km`
}

export function travelSense(km: number): string {
  if (km < 40) return 'same city'
  if (km < 300) return 'under 300 km'
  if (km > 1000) return 'over 1000 km'
  return `${Math.round(km)} km away`
}
