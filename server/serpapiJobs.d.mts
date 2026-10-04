export type SerpJobRecord = {
  id: string
  title: string
  company: string
  location: string
  salary: string | null
  applyUrl: string | null
  applyHost: string | null
  postedAt: string
}

export function loadSerpJobs(apiKey: string): Promise<SerpJobRecord[]>
