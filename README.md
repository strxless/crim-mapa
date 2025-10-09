# Mapa Pinezek (Next.js + Leaflet + SQLite/Postgres)

Prosta, minimalistyczna aplikacja do zarządzania pinezkami na mapie z prawie rzeczywistymi aktualizacjami.

- Interaktywna mapa z zarządzaniem pinezkami
- Częste odświeżanie (bez socketów) dla „prawie realtime” przy niskich kosztach
- SQLite domyślnie lokalnie lub Postgres na Vercel
- Operacje CRUD na pinezkach z kategoriami
- Historia odwiedzin (bez logowania; wpisujesz swoje imię przy dodawaniu)
- Interfejs mobilny, prosty i „slick” (mobile-first)
- Współdzielone edycje zabezpieczone przez optymistyczną kontrolę wersji (409 przy konflikcie)

## Stos
- Next.js 14 (App Router)
- React + SWR (odświeżanie co ~3 sekundy)
- Leaflet + react-leaflet z kafelkami OpenStreetMap (darmowe)
- SQLite (better-sqlite3) lokalnie; Postgres przez @vercel/postgres na produkcji

## Szybki start (lokalnie)

1) Instalacja zależności

   npm install

2) Uruchomienie dev

   npm run dev

Utworzy się lokalny plik SQLite ./data.sqlite, a tabele zostaną założone automatycznie.

## Deploy na Vercel

- Dodaj Vercel Postgres do projektu (z poziomu panelu Vercel), co doda zmienne POSTGRES_URL.
- Aplikacja automatycznie wykryje Postgresa na produkcji i go użyje.

Zmienne opcjonalne:
- DB_PROVIDER=postgres wymusza Postgresa
- SQLITE_PATH=./data.sqlite zmienia ścieżkę do SQLite lokalnie

## Model danych

- pins: id, title, description, lat, lng, category, created_at, updated_at, version
- visits: id, pin_id (FK), name, note, visited_at

Współbieżność: Klient przy aktualizacji wysyła expectedUpdatedAt. Jeśli updated_at na serwerze różni się, zwracany jest HTTP 409 (konflikt) i UI się odświeża.

## API
- GET /api/pins?category=... -> lista pinezek (z visitsCount)
- POST /api/pins -> utworzenie pinezki { title, description?, lat, lng, category }
- GET /api/pins/:id -> { pin, visits }
- PUT /api/pins/:id -> aktualizacja z optymistyczną kontrolą { title, description?, category, expectedUpdatedAt }
- DELETE /api/pins/:id -> usunięcie pinezki
- POST /api/pins/:id/visits -> dodanie odwiedzin { name, note? }

## Uwagi
- Częstotliwość odświeżania ustawiona na ~3 sekundy: balans między świeżością a kosztami.
- Gdy dwie osoby edytują tę samą pinezkę, druga dostanie 409; UI pokaże alert i odświeży dane.
- Brak autoryzacji; przestrzeń jest współdzielona.

## Skrypty
- npm run dev
- npm run build
- npm run start
