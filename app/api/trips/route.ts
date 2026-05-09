import { NextResponse } from "next/server";
import { listTrips, writeTrip } from "@/lib/fs-storage";
import { migrateTrip } from "@/lib/defaults";
import type { Trip } from "@/lib/types";

export const runtime = "nodejs";

export async function GET() {
  const trips = await listTrips();
  return NextResponse.json(trips);
}

// POST creates a new trip, OR ingests a full trip object (used by
// localStorage import).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as Partial<Trip>;
  const trip = migrateTrip(body);
  await writeTrip(trip);
  return NextResponse.json(trip);
}
