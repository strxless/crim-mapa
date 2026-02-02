# CRiIM Mapa
A mobile-first, team-friendly map for tracking locations, field visits, and operational stats — built with **Next.js (App Router)**, **Leaflet**, and a **SQLite/Postgres** dual-database backend.

This project is intentionally designed as a “portfolio-grade” internal tool: it focuses on practical UX, fast iteration, and robust data handling (conflict detection, schema bootstrapping, exports, tests).

## What it does
- **Interactive map** (OpenStreetMap tiles) with point creation, editing and deletion
- **Categories with colors** (server-persisted) + category filtering
- **Visit history** per pin (quick updates + notes)
- **Near real-time collaboration** via polling (SWR refresh) without WebSockets
- **Conflict-safe editing** using optimistic concurrency (`expectedUpdatedAt` → HTTP **409** on conflict)
- **Analytics dashboard** (`/stats`) with charts + exports (**Excel / DOCX**) for reporting
- **Streetwork stats module** (`/street`) for monthly team KPIs (interactions / new contacts / interventions)
- **Authentication flow** with session cookies + password change on first login + lockout after repeated attempts

## Tech stack
- **Next.js 14** (App Router) + **React 18**
- **TypeScript**
- **Leaflet / react-leaflet**
- **SWR** for caching + background refresh
- **SQLite** (via `@libsql/client`, optionally Turso) for zero-config local dev
- **Postgres** for production (works great with **Vercel Postgres**)
- **Tailwind CSS**
- **Vitest** (integration/unit) + **Playwright** (E2E)

## Engineering highlights (CV-ready)
- Implemented a **dual database provider** (SQLite ↔ Postgres) with **automatic schema creation** on startup (`lib/store.ts`) to keep local dev friction-free while supporting production deployments.
- Built **optimistic concurrency control** for shared edits (client sends `expectedUpdatedAt`; API returns **409** on conflicts), preventing silent overwrites during concurrent updates.
- Designed a **near real-time UX** without sockets: SWR polling every ~3s balances freshness, simplicity, and operational cost.
- Added a reporting pipeline: **JSON export API** + **DOCX/XLSX generation** for stakeholders who need offline, shareable artifacts.
- Backed the core flows with **integration tests** (API + store) and **E2E smoke tests**.

## Quick start (local)
Prereqs: Node.js 18+ recommended.

```bash
npm install
npm run dev
```

By default, local development uses SQLite (see `.env.local`). The database file is created automatically and schema is bootstrapped on first run.

Open: `http://localhost:3000`

## Configuration
Key environment variables:
- `USE_SQLITE=true` — force SQLite (recommended for local + E2E)
- `SQLITE_PATH=./data.sqlite` — change SQLite file location
- `TURSO_DATABASE_URL=...` / `TURSO_AUTH_TOKEN=...` — optional: run SQLite in the cloud via Turso
- `DB_PROVIDER=postgres` — force Postgres
- `POSTGRES_URL=...` — Postgres connection string (required when using Postgres)
- `AUTH_DB_PATH=./data/auth.db` — auth database path (when `USE_SQLITE=true`)

Note: the auth DB is initialized automatically on first run. For a real deployment, you should provision your own users / seeding logic.

## Deployment (Vercel)
- Attach **Vercel Postgres** to inject `POSTGRES_URL`.
- The app auto-detects Postgres in production (or you can force it via `DB_PROVIDER=postgres`).

## API overview
- `GET /api/pins?category=...` → list pins (includes `visitsCount`)
- `POST /api/pins` → create pin `{ title, description?, lat, lng, category, imageUrl? }`
- `GET /api/pins/:id` → `{ pin, visits }`
- `PUT /api/pins/:id` → update `{ title, description?, category, imageUrl?, expectedUpdatedAt }` (returns **409** on conflict)
- `DELETE /api/pins/:id` → delete pin
- `POST /api/pins/:id/visits` → add visit `{ name, note?, imageUrl? }`
- `GET /api/pins/export` → export all pins + visits as JSON
- `GET /api/categories` / `POST /api/categories` → list/create categories
- `GET /api/streetwork` / `POST /api/streetwork` → streetwork KPI stats

## Data model
- `pins`: `id`, `title`, `description`, `lat`, `lng`, `category`, `image_url`, `created_at`, `updated_at`, `version`
- `visits`: `id`, `pin_id` (FK), `name`, `note`, `image_url`, `visited_at`
- `categories`: `name`, `color`
- `streetwork_stats`: `worker_name`, `month`, `interactions`, `new_contacts`, `interventions`, `avatar`, `bg_color`

## Tests
```bash
npm run test          # vitest (unit/integration)
npm run e2e           # playwright
npm run test:coverage # coverage report
```

## Roadmap (nice-to-have)
- Replace polling with **SSE/WebSockets** for true real-time updates
- Stronger auth + password hashing (e.g., bcrypt/argon2) + RBAC
- Photo uploads for pins/visits (the schema supports `imageUrl` already)
- Map clustering / heatmaps for dense areas
