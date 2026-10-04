export type CityRecord = {
  name: string
  state: string
  code: string
  latitude: number
  longitude: number
  aliases: string[]
}

export const CITIES: CityRecord[] = [
  { name: 'Bengaluru', state: 'Karnataka', code: 'KA', latitude: 12.9716, longitude: 77.5946, aliases: ['bengaluru', 'bangalore', 'blr'] },
  { name: 'Mysuru', state: 'Karnataka', code: 'KA', latitude: 12.2958, longitude: 76.6394, aliases: ['mysuru', 'mysore'] },
  { name: 'Hyderabad', state: 'Telangana', code: 'TG', latitude: 17.385, longitude: 78.4867, aliases: ['hyderabad'] },
  { name: 'Pune', state: 'Maharashtra', code: 'MH', latitude: 18.5204, longitude: 73.8567, aliases: ['pune'] },
  { name: 'Mumbai', state: 'Maharashtra', code: 'MH', latitude: 19.076, longitude: 72.8777, aliases: ['mumbai', 'bombay'] },
  { name: 'Nagpur', state: 'Maharashtra', code: 'MH', latitude: 21.1458, longitude: 79.0882, aliases: ['nagpur'] },
  { name: 'Delhi', state: 'Delhi', code: 'DL', latitude: 28.6139, longitude: 77.209, aliases: ['new delhi', 'delhi', 'ncr'] },
  { name: 'Noida', state: 'Uttar Pradesh', code: 'UP', latitude: 28.5355, longitude: 77.391, aliases: ['noida'] },
  { name: 'Gurugram', state: 'Haryana', code: 'HR', latitude: 28.4595, longitude: 77.0266, aliases: ['gurugram', 'gurgaon'] },
  { name: 'Chennai', state: 'Tamil Nadu', code: 'TN', latitude: 13.0827, longitude: 80.2707, aliases: ['chennai', 'madras'] },
  { name: 'Coimbatore', state: 'Tamil Nadu', code: 'TN', latitude: 11.0168, longitude: 76.9558, aliases: ['coimbatore'] },
  { name: 'Kolkata', state: 'West Bengal', code: 'WB', latitude: 22.5726, longitude: 88.3639, aliases: ['kolkata', 'calcutta'] },
  { name: 'Ahmedabad', state: 'Gujarat', code: 'GJ', latitude: 23.0225, longitude: 72.5714, aliases: ['ahmedabad'] },
  { name: 'Jaipur', state: 'Rajasthan', code: 'RJ', latitude: 26.9124, longitude: 75.7873, aliases: ['jaipur'] },
  { name: 'Kochi', state: 'Kerala', code: 'KL', latitude: 9.9312, longitude: 76.2673, aliases: ['kochi', 'cochin'] },
  { name: 'Indore', state: 'Madhya Pradesh', code: 'MP', latitude: 22.7196, longitude: 75.8577, aliases: ['indore'] },
  { name: 'Chandigarh', state: 'Chandigarh', code: 'CH', latitude: 30.7333, longitude: 76.7794, aliases: ['chandigarh'] },
  { name: 'Lucknow', state: 'Uttar Pradesh', code: 'UP', latitude: 26.8467, longitude: 80.9462, aliases: ['lucknow'] },
  { name: 'Bhubaneswar', state: 'Odisha', code: 'OR', latitude: 20.2961, longitude: 85.8245, aliases: ['bhubaneswar', 'bhubaneshwar'] },
  { name: 'Visakhapatnam', state: 'Andhra Pradesh', code: 'AP', latitude: 17.6868, longitude: 83.2185, aliases: ['visakhapatnam', 'vizag'] },
]

export const ORIGIN_CHOICES = [
  'Bengaluru',
  'Hyderabad',
  'Pune',
  'Mumbai',
  'Delhi',
  'Chennai',
  'Noida',
  'Gurugram',
  'Kolkata',
  'Ahmedabad',
  'Jaipur',
  'Kochi',
  'Indore',
  'Chandigarh',
] as const

export function cityByName(name: string): CityRecord | undefined {
  return CITIES.find((city) => city.name === name)
}
