# flighty

Personal trip planner with flight price tracking. Make a trip, list your
flights and places to stay, paste a Google Flights booking link on any
flight to track its price over time.

Next.js 14 + TypeScript + Tailwind on the front, a small Playwright service
on the back.

## Concepts

- **Trip** — name, start/end dates, destinations, flights, stays.
- **Flight** — bought-or-not flag, optional Google Flights booking URL,
  optional notes. If a URL is set, hitting Fetch parses the itinerary
  (airline, flight number, dates) from the URL and scrapes the live price.
- **Stay** — city, address, check-in/check-out dates.

Data lives in `localStorage` under `flighty.trips.v3`. There is no backend
or account.

## How price tracking works

A Google Flights booking URL looks like:

```
https://www.google.com/travel/flights/booking?tfs=CBwQAhpsEgoyMDI2LTA4LTI1...
```

The `tfs` parameter is base64-url-encoded protobuf. We decode it locally
to get the exact legs (airline, flight number, dates, airports) — no
scraping needed for the itinerary itself. Playwright only opens the page
to grab the live total price.

If Google changes the booking-page layout, the itinerary still parses
correctly; only the price falls back to "Price unknown" until the price
selector is fixed.

See [scraper/src/tfs.ts](scraper/src/tfs.ts) for the protobuf decoder and
[scraper/src/google-flights.ts](scraper/src/google-flights.ts) for the
price scraper.

## Architecture

```
┌──────────────┐      POST /api/flights       ┌──────────────────┐
│  Next.js app │ ───────────────────────────▶ │  Playwright      │
│  (Vercel)    │   ◀─── itinerary JSON ──     │  scraper (local) │
└──────────────┘                              └──────────────────┘
                                                       │
                                                       ▼
                                             google.com/travel/flights
```

Vercel doesn't run Playwright in serverless, so the scraper lives in
[scraper/](scraper/) as a standalone Node service. The Next.js API route
[app/api/flights/route.ts](app/api/flights/route.ts) proxies to it via the
`SCRAPER_URL` env var.

## Heads-up

- Google's Terms of Service prohibit automated access. Personal use, low
  frequency only.
- The `tfs` schema isn't published. Field numbers were derived from real
  URLs — if Google changes them, [scraper/src/tfs.ts](scraper/src/tfs.ts)
  is the only file to update for itinerary parsing.
- The price selector uses "first currency-shaped string in document order
  on a booking page", with locale forced to `en/US`. More robust than CSS
  classes, but still best-effort.
- For anything beyond personal tinkering, swap in a real API:
  [Amadeus](https://developers.amadeus.com/),
  [Duffel](https://duffel.com/), or
  [Kiwi Tequila](https://tequila.kiwi.com/) (free tier).

## Setup

### Two terminals

**Scraper** (in `scraper/`):

```bash
npm install                 # also installs Playwright Chromium
cp .env.example .env
npm run dev                 # listens on http://localhost:8787
```

**Next.js app** (in repo root):

```bash
npm install
cp .env.example .env.local
npm run dev                 # http://localhost:3000
```

Set the same `SCRAPER_TOKEN` in both `.env` files.

### Using it

1. Open `http://localhost:3000`.
2. Click **+ New trip**.
3. Fill in name, dates, destinations.
4. **+ Add flight**, paste a booking URL, click **Fetch** — itinerary +
   price appear inline.
5. **+ Add stay**, fill in city / address / check-in / check-out.
6. Come back later, click **Refresh** on a flight to pull the latest price.

To get a booking URL: search on
[google.com/travel/flights](https://www.google.com/travel/flights), click
a flight, click **Continue** until the URL contains `/booking?tfs=...`.
Copy that URL.

### Deploying the app to Vercel

```bash
vercel
```

Set in Vercel:
- `SCRAPER_URL` → your ngrok or VPS URL (see below)
- `SCRAPER_TOKEN` → shared secret

The scraper can't run in Vercel serverless. Two options:

**ngrok (quick).**
```bash
# in scraper/
npm run dev
# in another terminal
ngrok http 8787
```
Paste the `https://*.ngrok-free.app` URL into Vercel's `SCRAPER_URL`.

**Railway / Fly / VPS.** Deploy `scraper/` as a long-running Node service.
Anything that runs Node + Chromium works. Railway is simplest — point at
`scraper/`, start command `npm run start`.

## Project layout

```
app/
  page.tsx                  Trip list (home)
  trips/[id]/page.tsx       Trip editor
  api/flights/route.ts      Proxies { url } to the scraper
components/
  TripList.tsx              List of trips on home
  TripEditor.tsx            Trip name/dates/destinations + flights + stays
  FlightEditor.tsx          One flight row, with fetch/refresh price
  StayEditor.tsx            One stay row
lib/
  types.ts                  Trip, TripFlight, Stay, Itinerary, Leg
  storage.ts                localStorage CRUD for trips
scraper/
  src/server.ts             HTTP server, POST /scrape { url }
  src/tfs.ts                base64-url + protobuf decoder for the tfs param
  src/google-flights.ts     Orchestrates: parse tfs + scrape price
```

## Notes

- Consent screens: the scraper pre-sets `CONSENT` and `SOCS` cookies and
  uses a persistent browser profile (`scraper/.playwright-data/`). If
  Google still shows a consent wall, run with `HEADED=1`, click through
  once, the profile remembers it:
  ```bash
  HEADED=1 npm run dev
  ```
- Don't hammer Google. One refresh at a time.
