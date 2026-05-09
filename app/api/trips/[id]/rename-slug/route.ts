import { NextResponse } from "next/server";
import { listTripIds, readTrip, renameTripDir, writeTrip } from "@/lib/fs-storage";
import { slugify, uniqueSlug } from "@/lib/slugify";

export const runtime = "nodejs";

// Regenerate the trip's slug (and directory name) from its current name.
// The URL segment changes too — caller should navigate to the returned id.
export async function POST(_: Request, { params }: { params: { id: string } }) {
  const trip = await readTrip(params.id);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const otherIds = (await listTripIds()).filter((x) => x !== params.id);
  const desired = uniqueSlug(slugify(trip.name) || "trip", otherIds);

  if (desired === params.id) return NextResponse.json(trip);

  trip.id = desired;
  await renameTripDir(params.id, desired);
  await writeTrip(trip);
  return NextResponse.json(trip);
}
