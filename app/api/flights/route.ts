import { NextResponse } from "next/server";
import type { Itinerary } from "@/lib/types";

export const runtime = "nodejs";

// TODO: Set SCRAPER_URL in .env.local (or Vercel env). For local dev, run the
// scraper service in ./scraper and expose it with `ngrok http 8787`, then put
// the ngrok URL here. See README.md for details.
const SCRAPER_URL = process.env.SCRAPER_URL;
const SCRAPER_TOKEN = process.env.SCRAPER_TOKEN;

function isBookingUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return (
      /^(www\.)?google\.[a-z.]+$/.test(u.host) &&
      u.pathname.startsWith("/travel/flights/booking") &&
      u.searchParams.has("tfs")
    );
  } catch {
    return false;
  }
}

export async function POST(req: Request) {
  if (!SCRAPER_URL) {
    return NextResponse.json(
      { error: "SCRAPER_URL is not configured. See README.md." },
      { status: 503 },
    );
  }

  const { url, currency } = (await req.json()) as { url?: string; currency?: string };
  if (!url || !isBookingUrl(url)) {
    return NextResponse.json(
      { error: "Provide a google.com/travel/flights/booking URL." },
      { status: 400 },
    );
  }

  const upstream = await fetch(`${SCRAPER_URL.replace(/\/$/, "")}/scrape`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(SCRAPER_TOKEN ? { Authorization: `Bearer ${SCRAPER_TOKEN}` } : {}),
    },
    body: JSON.stringify({ url, currency }),
    cache: "no-store",
  });

  if (!upstream.ok) {
    const text = await upstream.text().catch(() => "");
    return NextResponse.json(
      { error: `Scraper returned ${upstream.status}: ${text.slice(0, 200)}` },
      { status: 502 },
    );
  }

  const data = (await upstream.json()) as Itinerary;
  return NextResponse.json(data);
}
