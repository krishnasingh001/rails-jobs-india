export type InsightSource = { title: string; link: string; icon: string | null }

export type CompanyInsight = {
  companyName: string
  domainArea: string | null
  fetchedAt: string | null
  layoffs: string | null
  headCount: string | null
  values: string | null
  foundedYear: number | null
  offices: string[]
  sources: InsightSource[]
}

// One request per company: every job of that company reuses the same profile.
const cache = new Map<string, Promise<CompanyInsight | null>>()

function isInsight(value: unknown): value is CompanyInsight {
  if (!value || typeof value !== 'object') return false
  const insight = value as Partial<CompanyInsight>
  return Array.isArray(insight.offices) && Array.isArray(insight.sources)
}

async function fetchInsight(company: string): Promise<CompanyInsight | null> {
  const response = await fetch(`/api/v1/company_insight?company=${encodeURIComponent(company)}`)
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok || !payload || typeof payload !== 'object' || !('insight' in payload)) {
    throw new Error('Could not load the company insight.')
  }
  if (payload.insight == null) return null
  if (!isInsight(payload.insight)) throw new Error('The company insight was not in the expected shape.')
  return payload.insight
}

export function loadCompanyInsight(company: string): Promise<CompanyInsight | null> {
  const key = company.trim().toLowerCase()
  let pending = cache.get(key)
  if (!pending) {
    pending = fetchInsight(company)
    cache.set(key, pending)
    pending.catch(() => cache.delete(key))
  }
  return pending
}
