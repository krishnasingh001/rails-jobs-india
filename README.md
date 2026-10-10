# Rails Jobs India

**See where the Ruby on Rails jobs are in India, and check if the company is worth your time, in one place.**

Built for the [SerpApi India Hackathon 2026](https://serpapi.github.io/serpapi-india-hackathon-2026/) · Track: **Knowledge & Public Interest** (jobs)

- Demo video: _add link here_
- Live demo: _add link here (or run it locally, see below)_

---

## The problem

If you are a Rails developer in India, finding a job is slow and scattered:

- Job boards list roles one by one. They do not show **where** the work is.
- You can't tell if a city has 2 openings or 20 without searching each one.
- Every board shows a slightly different copy of the same job.
- Before applying, you still have to research the company: layoffs, size, offices.
- Then you lose track of where you applied.

## What you get

| You want to... | What the app does |
|---|---|
| Know where the Rails jobs are | A map of India. Taller states have more openings. Pick a state to see its cities. |
| See fresh jobs, not last month's | The backend pulls new listings from Google Jobs on a schedule. Visitors never trigger a fetch. |
| Find jobs near you | Pick a city or tap Locate to see roles by distance. Filter by work mode, place or keyword. |
| Understand a job quickly | A detail page with the description, salary, work mode, posted date and every place you can apply. |
| See jobs picked for you | Save your cities, work mode, expected salary, years of experience and AI fluency (or read them from your resume). The **Jobs for you** page ranks every opening against them and shows why. |
| Know if you fit | A job fit check compares the skills in the posting with your saved skills and highlights what matches. |
| Improve your resume | An ATS resume checker scores your resume and finds your skills. |
| Know where the office is | A Google Maps lookup shows the company's real office location. |
| Judge the company | A company panel: layoffs, head count, offices, values and founding year, **with the sources linked** so you can check them. |
| Keep track | Create an account, save jobs and move them from applied to offer. |

**Business impact:** a job seeker spends minutes, not hours, finding relevant roles and screening companies. For community leaders, the map shows where Rails talent demand is concentrated across India.

---

## How SerpApi is used

SerpApi is the data source of the whole product. Nothing on the map is hand-written.

| SerpApi engine | What it does for the user |
|---|---|
| **Google Jobs** (`google_jobs`) | Finds live Rails openings across India. We keep the full original listing (description, salary, apply links) so nothing is lost or made up. |
| **Google Maps** (`google_maps`) | Finds the company's real office so you know where you would work. |
| **Brave AI Mode** (`brave_ai_mode`) | Builds a short, structured company profile (layoffs, head count, offices, values) and returns the web sources it used. |

How we keep it honest and cheap:

- **Fresh but not wasteful.** Jobs are stored in our database and served from there, so opening the app or a job costs no SerpApi credit. Only the backend job `HarvestJobsJob` (or `bin/rails jobs:harvest`) calls Google Jobs, and it remembers its page position per query.
- **Shows its sources.** Company facts always come with links. If we have no profile for a company, the page says so instead of guessing.
- **One lookup per company.** Offices and profiles are cached, so ten jobs at one company cost one request.
- **Your key stays on the server.** The browser never sees `SERPAPI_KEY`.

---

## Run it locally

You need Node 22, Ruby 3.4 and PostgreSQL. A free [SerpApi account](https://serpapi.com) (250 searches/month) is enough.

```bash
# 1. Backend (Rails API on port 3001)
cd api
bundle install
cp .env.example .env          # then put your key in: SERPAPI_KEY=...
bin/rails db:setup
bin/rails data:import         # loads the pre-collected jobs and company profiles
bin/rails s -p 3001

# 2. Frontend (in a second terminal, from the repo root)
npm install
npm run dev
```

Open the address Vite prints (usually http://localhost:5173).

Useful commands:

```bash
bin/rails jobs:harvest                          # fetch fresh Rails jobs from SerpApi right now
bin/rails data:fetch_company_profile COMPANY=GitLab   # build one company profile
bin/rails data:fetch_all_company_profiles       # build profiles for every company
bin/rails test                                  # backend tests
npm run lint && npm run build                   # frontend checks
```

The app works with no key too: it shows the pre-collected jobs from `api/data/`. You only need a key to fetch new data.

---

## Keeping jobs fresh

Visitors cannot trigger a fetch. `HarvestJobsJob` can run every day at 18:30 UTC (midnight in India) through Solid Queue. The schedule is currently commented out in `api/config/recurring.yml` to save SerpApi credits; uncomment it to turn it on. The Docker image sets `SOLID_QUEUE_IN_PUMA=true`, so the web process runs the scheduler too. On another host set that variable, or run `bin/jobs` as a second process. It needs `SERPAPI_KEY` and retries up to 3 times, 30 minutes apart, if SerpApi fails.

---

## How it works (short version)

```
Google Jobs / Maps / Brave AI Mode   (via SerpApi)
              │
        Rails API  ── stores jobs, offices, profiles in PostgreSQL
              │          (refreshed by a backend job, never by visitors)
        React + MapLibre map  ──►  state → city → job → company panel
```

- **Frontend:** React, TypeScript, MapLibre (the map), Tailwind.
- **Backend:** Rails API with PostgreSQL. The SerpApi calls live in `api/app/services/serpapi/`.
- **Pre-collected data:** `api/data/` holds jobs from 8 regions and the company profiles as JSON files, so the app works instantly after setup.
- **Accounts:** sign up, sign in, and a tracker for your applications.

Key places to look:

| Where | What |
|---|---|
| `api/app/services/serpapi/client.rb` | The one place that talks to SerpApi |
| `api/app/services/serpapi/harvest.rb` | Fetching jobs from Google Jobs and paging through results |
| `api/app/jobs/harvest_jobs_job.rb` | The scheduled backend job that keeps listings updated |
| `api/app/services/resume/job_fit.rb` | Job fit check (keyword match, no AI call) |
| `api/app/services/serpapi/place_lookup.rb` | Office lookup with Google Maps |
| `src/components/IndiaJobsMap.tsx` | The map |
| `src/components/JobDetailPage.tsx` | The job page |
| `src/components/CompanyInsightPanel.tsx` | The company panel with sources |

---

## Upcoming features

- **Recruiter accounts.** A separate sign-up for recruiters (business email only), so they can post roles and see Rails talent demand. Not available yet; every account today is a job seeker.

---

## Credits

- **[SerpApi](https://serpapi.com)** for all live data: Google Jobs, Google Maps and Brave AI Mode (see above).
- **[MapLibre GL JS](https://maplibre.org)** and **[react-map-gl](https://visgl.github.io/react-map-gl/)** draw the map.
- **[OpenFreeMap](https://openfreemap.org)** serves the street map tiles, built on data from **[OpenStreetMap](https://www.openstreetmap.org/copyright)** contributors.
- **[Data{Meet} community maps](https://github.com/datameet/maps)** provide the Indian state boundaries.
- **[Turf.js](https://turfjs.org)** works out distances between places.
- **[React](https://react.dev)**, **[Vite](https://vite.dev)**, **[Tailwind CSS](https://tailwindcss.com)**, **[React Router](https://reactrouter.com)** and **[Lucide](https://lucide.dev)** icons build the frontend.
- **[Ruby on Rails](https://rubyonrails.org)**, PostgreSQL, Solid Queue, Blueprinter, `pdf-reader` and `rubyzip` run the backend.
- Fonts: **Plus Jakarta Sans** and **Space Grotesk** from Google Fonts.
- Job logos, descriptions and apply links belong to the employers and job boards that posted them. We link back to the original listing.

---

## Limits (what we do not claim)

- Right now the focus is **Rails jobs** in 8 regions, not every tech job in India.
- Company profiles are AI-assisted summaries from web sources. They are a starting point: check the linked sources before you decide.
- Years of experience and AI fluency read from a resume are keyword and date-range estimates you can edit. "Jobs for you" scores only what both you and the job state; many listings have no salary or no years requirement.
- The job fit check is a keyword match against a fixed skills list. It does not read years of experience or soft requirements.
- Salary and apply links come from Google Jobs and are only as complete as the listing.

## Disclosure

Built with AI help (Claude Code) for coding and review. The backend has an automated test suite (`bin/rails test`).

## Team

_Add team names here._
