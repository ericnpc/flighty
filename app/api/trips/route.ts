import { NextResponse } from "next/server";
import { listTripIds, listTrips, writeTrip } from "@/lib/fs-storage";
import { migrateTrip } from "@/lib/defaults";
import { slugify, uniqueSlug } from "@/lib/slugify";
import type { Trip } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const trips = await listTrips();
  return NextResponse.json(trips);
}

// POST creates a new trip, OR ingests one from localStorage. In both cases
// we replace whatever id came in with a slug derived from the trip name —
// the slug becomes the directory name and the URL segment.
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<Trip>;
  const trip = migrateTrip(body);
  const existing = await listTripIds();
  trip.id = uniqueSlug(slugify(trip.name) || "trip", existing);
  await writeTrip(trip);
  return NextResponse.json(trip);
}
