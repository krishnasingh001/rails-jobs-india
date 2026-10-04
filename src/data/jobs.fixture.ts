import type { JobPin, JobsSource } from '../types.ts'
import { normalizeLocation } from '../lib/normalizeLocation.ts'

type RawJob = {
  title: string
  company: string
  location: string
  salaryLabel: string
  applyHost: string
}

const TITLES = [
  'Ruby on Rails Engineer',
  'Senior Rails Developer',
  'Backend Engineer Rails',
  'Hotwire Developer',
  'Full Stack Rails Developer',
  'Rails API Engineer',
]

const COMPANIES = [
  'Freshworks',
  'Postman',
  'BrowserStack',
  'Chargebee',
  'Hasura',
  'CleverTap',
  'Gojek',
  'Thoughtworks',
  'Zendesk',
  'Juspay',
  'Public',
  'InMobi',
]

const HOSTS = ['greenhouse.io', 'lever.co', 'ashbyhq.com', 'indeed.com']

const SALARIES = ['12–20 LPA', '18–32 LPA', '30–48 LPA']

const PLACES: { location: string; count: number }[] = [
  { location: 'Bengaluru, Karnataka', count: 16 },
  { location: 'Bangalore', count: 2 },
  { location: 'Hyderabad, Telangana', count: 10 },
  { location: 'Hyderabad / Remote', count: 2 },
  { location: 'Pune, Maharashtra', count: 8 },
  { location: 'Mumbai, Maharashtra', count: 6 },
  { location: 'Bombay', count: 1 },
  { location: 'Delhi', count: 6 },
  { location: 'Gurgaon, Haryana', count: 5 },
  { location: 'Noida, Uttar Pradesh', count: 4 },
  { location: 'Chennai, Tamil Nadu', count: 4 },
  { location: 'Kolkata, West Bengal', count: 3 },
  { location: 'Ahmedabad, Gujarat', count: 2 },
  { location: 'Jaipur, Rajasthan', count: 2 },
  { location: 'Kochi, Kerala', count: 2 },
  { location: 'Indore, Madhya Pradesh', count: 2 },
  { location: 'Chandigarh', count: 2 },
  { location: 'Coimbatore, Tamil Nadu', count: 1 },
  { location: 'Mysuru, Karnataka', count: 2 },
  { location: 'Nagpur, Maharashtra', count: 1 },
  { location: 'Lucknow, Uttar Pradesh', count: 1 },
  { location: 'Bhubaneswar, Odisha', count: 1 },
  { location: 'Visakhapatnam, Andhra Pradesh', count: 1 },
  { location: 'Remote, India', count: 8 },
]

function buildJobs(): JobPin[] {
  const raw: RawJob[] = []
  for (const place of PLACES) {
    for (let index = 0; index < place.count; index += 1) {
      raw.push({
        title: TITLES[raw.length % TITLES.length],
        company: COMPANIES[raw.length % COMPANIES.length],
        location: place.location,
        salaryLabel: SALARIES[raw.length % SALARIES.length],
        applyHost: HOSTS[raw.length % HOSTS.length],
      })
    }
  }

  return raw.map((job, index) => {
    const located = normalizeLocation(job.location)
    const posted = new Date(Date.UTC(2026, 8, 20))
    posted.setUTCDate(posted.getUTCDate() - (index % 18))
    return {
      id: `job-${String(index + 1).padStart(3, '0')}`,
      title: job.title,
      company: job.company,
      city: located.city,
      state: located.state,
      code: located.code,
      latitude: located.latitude,
      longitude: located.longitude,
      workMode: located.workMode,
      locationLabel:
        located.workMode === 'remote'
          ? 'Remote, India'
          : [located.city, located.state].filter(Boolean).join(', ') || job.location,
      salaryLabel: job.salaryLabel,
      applyHost: job.applyHost,
      applyUrl: `https://${job.applyHost}`,
      postedAt: posted.toISOString().slice(0, 10),
    }
  })
}

export const JOBS: JobPin[] = buildJobs()

export const fixtureJobsSource: JobsSource = {
  async load() {
    return JOBS
  },
}
