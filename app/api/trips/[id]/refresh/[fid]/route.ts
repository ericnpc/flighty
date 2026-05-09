import { NextResponse } from "next/server";
import { appendPriceHistory, readTrip, writeTrip } from "@/lib/fs-storage";
import type { Itinerary } from "@/lib/types";

export const runtime = "nodejs";

const SCRAPER_URL = process.env.SCRAPER_URL;
const SCRAPER_TOKEN = process.env.SCRAPER_TOKEN;

// Triggers a scrape for one flight, updates trip.json, and appends a line
// to that flight's history JSONL.
export async function POST(_: Request, { params }: { params: { id: string; fid: string } }) {
  if (!SCRAPER_URL) {
    return NextResponse.json(
      { error: "SCRAPER_URL is not configured." },
      { status: 503 },
    );
  }

  const trip = await readTrip(params.id);
  if (!trip) return NextResponse.json({ error: "Trip not found" }, { status: 404 });

  const flight = trip.flights.find((f) => f.id === params.fid);
  if (!flight) return NextResponse.json({ error: "Flight not found" }, { status: 404 });
  if (!flight.googleFlightsUrl) {
    return NextResponse.json({ error: "Flight has no booking URL" }, { status: 400 });
  }

  const upstream = await fetch(`${SCRAPER_URL.replace(/\/$/, "")}/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(SCRAPER_TOKEN ? { Authorization: `Bearer ${SCRAPER_TOKEN}` } : {}),
    },
    body: JSON.stringify({ url: flight.googleFlightsUrl, currency: trip.currency }),
    cache: "no-store",
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: `Scraper returned ${upstream.status}: ${text.slice(0, 200)}` },
      { status: 502 },
    );
  }

  const itinerary = (await upstream.json()) as Itinerary;
  const now = new Date().toISOString();

  flight.itinerary = itinerary;
  flight.lastCheckedAt = now;
  await writeTrip(trip);

  await appendPriceHistory(params.id, params.fid, {
    at: now,
    price: itinerary.price,
    currency: itinerary.currency,
    error: itinerary.priceError,
  });

  return NextResponse.json(trip);
}
