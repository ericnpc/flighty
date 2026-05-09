# flighty

Personal trip planner + flight price tracker. Edit locally, publish a
read-only static site to GitHub Pages.

```
┌──────────────────────────────────────────────────────┐
│  data/trips/<id>/                ← single source of  │
│    trip.json                       truth, git-tracked│
│    history/<flight-id>.jsonl                         │
└──────────────────────────────────────────────────────┘
            ▲                            │
            │ writes (dev only)          │ reads
            │                            ▼
   ┌────────────────┐          ┌──────────────────────┐
   │  Editor app    │          │  Static site (Pages) │
   │  npm run dev   │          │  npm run build:static│
   │  ↳ /api/trips  │          │  ↳ no /api routes    │
   │  ↳ TripEditor  │          │  ↳ TripView only     │
   │  ↳ Scraper     │          │  ↳ ./out/            │
   └────────────────┘          └──────────────────────┘
```

The same Next.js app serves two modes:

- **`npm run dev`** — full editor. API routes read/write `data/`. Refresh
  buttons hit the local Playwright scraper.
- **`npm run build:static`** — exports a read-only site to `out/`. No API
  routes, no editing UI. Drop `out/` on GitHub Pages.

## Concepts

- **Trip** — name, dates, destinations, free-text notes, optional Google
  Maps embed, plus three child collections: flights, stays, budget.
- **Flight** — title, optional Google Flights booking URL. With a URL, the
  itinerary (legs + price) is scraped from Google. Without one, you fill in
  Depart / Return / Cost manually. Bought toggle adds it to the budget.
- **Stay** — city, address, check-in/out, cost, bought toggle.
- **Budget item** — free-form item / cost / notes.

## Filesystem layout

```
data/
  trips/
    <trip-id>/
      trip.json                ← Trip object, pretty-printed
      history/
        <flight-id>.jsonl      ← one price snapshot per line
                                 { "at", "price", "currency", "error" }
```

Commit `data/` to git — that's your archive.

## Local setup

Two terminals.

**Scraper** (in `scraper/`):
```bash
npm install                 # also installs Playwright Chromium
cp .env.example .env        # set SCRAPER_TOKEN
npm run dev                 # http://localhost:8787
```

**App** (repo root):
```bash
npm install
cp .env.example .env.local  # SCRAPER_URL=http://localhost:8787, same SCRAPER_TOKEN
npm run dev                 # http://localhost:3000
```

If you've been using a previous version, your old trips are still in
browser localStorage. The trip list shows a banner letting you import them
into `data/` with one click.

## Editing flow

1. **+ New trip** on the home page.
2. Fill in name, dates, destinations, notes; paste a Google Maps URL via
   the `⋯` menu if you want an embedded map.
3. Add **Flights**:
   - With a Google Flights booking URL: paste it under `⋯`, click Fetch.
     Itinerary + price come back; Refresh later to update.
   - Without a URL: just fill in the manual Depart / Return / Cost fields.
4. Add **Stays** with city / address / dates / cost.
5. Toggle **Bought** / **Booked** to push items into the auto-budget.
6. Add ad-hoc **Budget** items for the rest (taxis, food, etc).

Every change autosaves to `data/trips/<id>/trip.json` (debounced 500ms).
Refreshing a flight scrapes the page, updates `trip.json`, **and**
appends a snapshot line to `data/trips/<id>/history/<flight-id>.jsonl`.

## Publishing to GitHub Pages

```bash
npm run build:static          # → out/
```

That folder is a complete static site. Two ways to deploy:

**Project page** (`https://<user>.github.io/flighty/`):
```bash
BASE_PATH=/flighty npm run build:static
# Push out/ to the gh-pages branch (manually or via a workflow):
npx gh-pages -d out
```
GitHub Pages settings → source: `gh-pages` branch, root.

**User/org page** (`https://<user>.github.io/`): no `BASE_PATH` needed.
Same steps, push `out/` to a repo named `<user>.github.io`.

The published site contains:
- `/` — list of trips (read-only)
- `/trips/<id>/` — read-only trip view with itineraries, stays, budget,
  and price-history details (all snapshots in the history JSONL show up)

No edit affordances, no API calls. If someone navigates to
`/trips/<id>/edit/`, they get a static "editing not available here" notice.

## How price tracking works

A Google Flights booking URL contains the entire itinerary in its `tfs`
parameter (base64-url-encoded protobuf). We decode that locally to get the
exact legs (airline, flight number, dates, airports) — no scraping needed
for the itinerary itself. Playwright only opens the page to grab the live
total price + overall direction times.

This means the **itinerary data is rock-solid**; only the price scrape can
fail. If Google changes the booking-page layout, you still see what you
booked, just with a `priceError` until the price selector is fixed.

See [scraper/src/tfs.ts](scraper/src/tfs.ts) for the protobuf decoder and
[scraper/src/google-flights.ts](scraper/src/google-flights.ts) for the
price scraper.

## Heads-up

- Google's Terms of Service prohibit automated access. Personal use, low
  frequency only.
- The `tfs` schema isn't published. Field numbers were derived from real
  URLs — if Google changes them, [scraper/src/tfs.ts](scraper/src/tfs.ts)
  is the only file to update for itinerary parsing.
- The price selector uses "first currency-shaped string in document order
  on a booking page", with locale forced to `en/US`. More robust than CSS
  classes, but still best-effort.
- If you'd rather use a real API, [Amadeus](https://developers.amadeus.com/),
  [Duffel](https://duffel.com/), and
  [Kiwi Tequila](https://tequila.kiwi.com/) all have free tiers and will
  outlive any scraper. Replace `scrapeItinerary` and you're done.

## Project layout

```
app/
  page.tsx                     Trip list (Server Component, reads filesystem)
  trips/[id]/page.tsx          Read-only public view (Server Component)
  trips/[id]/edit/             Editor route
    page.tsx                   Server entry (generateStaticParams)
    EditClient.tsx             Client component, mounts TripEditor
  api/                         Dev-only — moved aside during static build
    trips/route.ts             GET list, POST create/import
    trips/[id]/route.ts        GET, PUT, DELETE
    trips/[id]/refresh/[fid]/  POST: scrape flight, update + append history
    flights/route.ts           Generic { url } scrape proxy (legacy)
components/
  TripList.tsx                 Home list (Client; works in both modes)
  TripEditor.tsx               Editor (Client; debounced API saves)
  TripView.tsx                 Read-only renderer (server-friendly)
  FlightEditor.tsx, StayEditor.tsx, BudgetEditor.tsx
  EllipsisMenu.tsx, ItineraryDisplay.tsx
lib/
  types.ts                     Trip, TripFlight, Stay, etc.
  fs-storage.ts                Node fs CRUD on data/, plus history JSONL
  api-client.ts                Browser fetch wrappers
  defaults.ts                  Migration + factory helpers
  dates.ts, maps.ts            Small helpers
scraper/
  src/server.ts                HTTP server, POST /scrape { url }
  src/tfs.ts                   base64-url + protobuf decoder
  src/google-flights.ts        Playwright orchestration
data/                          Your trips. Commit it.
  trips/<id>/trip.json
  trips/<id>/history/<fid>.jsonl
scripts/build-static.mjs       Moves app/api aside, runs `next build`
```

## Notes

- Consent screens: the scraper pre-sets `CONSENT` and `SOCS` cookies and
  uses a persistent browser profile (`scraper/.playwright-data/`). If
  Google still shows a wall, run `HEADED=1 npm run dev` once, click
  through, and the profile remembers it.
- Don't hammer Google. One refresh at a time.
- The `/api/flights` route still exists for back-compat (generic
  `{ url }` proxy). Use `/api/trips/<id>/refresh/<fid>` for trip-aware
  refresh — that one writes history.
