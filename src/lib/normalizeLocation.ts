import { CITIES, type CityRecord } from '../data/cities.ts'

export type NormalizedLocation = {
  city: string | null
  state: string | null
  code: string | null
  latitude: number | null
  longitude: number | null
  workMode: 'onsite' | 'hybrid' | 'remote'
}

const STATE_ALIASES: { phrase: string; state: string; code: string }[] = [
  { phrase: 'andaman and nicobar islands', state: 'Andaman and Nicobar Islands', code: 'AN' },
  { phrase: 'andaman and nicobar', state: 'Andaman and Nicobar Islands', code: 'AN' },
  { phrase: 'andhra pradesh', state: 'Andhra Pradesh', code: 'AP' },
  { phrase: 'arunachal pradesh', state: 'Arunachal Pradesh', code: 'AR' },
  { phrase: 'assam', state: 'Assam', code: 'AS' },
  { phrase: 'bihar', state: 'Bihar', code: 'BR' },
  { phrase: 'chandigarh', state: 'Chandigarh', code: 'CH' },
  { phrase: 'chhattisgarh', state: 'Chhattisgarh', code: 'CT' },
  { phrase: 'dadra and nagar haveli', state: 'Dadra and Nagar Haveli', code: 'DN' },
  { phrase: 'daman and diu', state: 'Daman and Diu', code: 'DD' },
  { phrase: 'new delhi', state: 'Delhi', code: 'DL' },
  { phrase: 'delhi', state: 'Delhi', code: 'DL' },
  { phrase: 'goa', state: 'Goa', code: 'GA' },
  { phrase: 'gujarat', state: 'Gujarat', code: 'GJ' },
  { phrase: 'haryana', state: 'Haryana', code: 'HR' },
  { phrase: 'himachal pradesh', state: 'Himachal Pradesh', code: 'HP' },
  { phrase: 'jammu and kashmir', state: 'Jammu and Kashmir', code: 'JK' },
  { phrase: 'jharkhand', state: 'Jharkhand', code: 'JH' },
  { phrase: 'karnataka', state: 'Karnataka', code: 'KA' },
  { phrase: 'kerala', state: 'Kerala', code: 'KL' },
  { phrase: 'lakshadweep', state: 'Lakshadweep', code: 'LD' },
  { phrase: 'madhya pradesh', state: 'Madhya Pradesh', code: 'MP' },
  { phrase: 'maharashtra', state: 'Maharashtra', code: 'MH' },
  { phrase: 'manipur', state: 'Manipur', code: 'MN' },
  { phrase: 'meghalaya', state: 'Meghalaya', code: 'ML' },
  { phrase: 'mizoram', state: 'Mizoram', code: 'MZ' },
  { phrase: 'nagaland', state: 'Nagaland', code: 'NL' },
  { phrase: 'odisha', state: 'Odisha', code: 'OR' },
  { phrase: 'orissa', state: 'Odisha', code: 'OR' },
  { phrase: 'puducherry', state: 'Puducherry', code: 'PY' },
  { phrase: 'pondicherry', state: 'Puducherry', code: 'PY' },
  { phrase: 'punjab', state: 'Punjab', code: 'PB' },
  { phrase: 'rajasthan', state: 'Rajasthan', code: 'RJ' },
  { phrase: 'sikkim', state: 'Sikkim', code: 'SK' },
  { phrase: 'tamil nadu', state: 'Tamil Nadu', code: 'TN' },
  { phrase: 'telangana', state: 'Telangana', code: 'TG' },
  { phrase: 'tripura', state: 'Tripura', code: 'TR' },
  { phrase: 'uttar pradesh', state: 'Uttar Pradesh', code: 'UP' },
  { phrase: 'uttarakhand', state: 'Uttarakhand', code: 'UK' },
  { phrase: 'uttaranchal', state: 'Uttarakhand', code: 'UK' },
  { phrase: 'west bengal', state: 'West Bengal', code: 'WB' },
]

const CITY_MATCHES = CITIES.flatMap((city) =>
  city.aliases.map((alias) => ({ alias, city })),
).sort((a, b) => b.alias.length - a.alias.length)

const STATE_MATCHES = [...STATE_ALIASES].sort((a, b) => b.phrase.length - a.phrase.length)

function soften(input: string): string {
  return input
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z]+/g, ' ')
    .trim()
}

function hasPhrase(text: string, phrase: string): boolean {
  return new RegExp(`(?:^|\\s)${phrase}(?:\\s|$)`).test(text)
}

function mentionsRemote(text: string): boolean {
  return hasPhrase(text, 'work from home') || hasPhrase(text, 'remote') || hasPhrase(text, 'wfh')
}

function matchCity(text: string): CityRecord | null {
  const found = CITY_MATCHES.find((entry) => hasPhrase(text, entry.alias))
  return found?.city ?? null
}

function matchState(text: string): { state: string; code: string } | null {
  return STATE_MATCHES.find((entry) => hasPhrase(text, entry.phrase)) ?? null
}

export function normalizeLocation(input: string): NormalizedLocation {
  const text = soften(input)
  const remote = mentionsRemote(text)
  const city = matchCity(text)

  if (city) {
    return {
      city: city.name,
      state: city.state,
      code: city.code,
      latitude: city.latitude,
      longitude: city.longitude,
      workMode: remote ? 'hybrid' : 'onsite',
    }
  }

  if (remote) {
    return {
      city: null,
      state: null,
      code: null,
      latitude: null,
      longitude: null,
      workMode: 'remote',
    }
  }

  const state = matchState(text)
  if (state) {
    return {
      city: null,
      state: state.state,
      code: state.code,
      latitude: null,
      longitude: null,
      workMode: 'onsite',
    }
  }

  return {
    city: null,
    state: null,
    code: null,
    latitude: null,
    longitude: null,
    workMode: 'onsite',
  }
}
