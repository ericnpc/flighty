import { NextResponse } from "next/server";
import { deleteTrip, readTrip, writeTrip } from "@/lib/fs-storage";
import type { Trip } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const trip = await readTrip(params.id);
  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(trip);
}

export async function PUT(req: Request, { params }: { params: { id: string } }) {
  const trip = (await req.json()) as Trip;
  if (trip.id !== params.id) {
    return NextResponse.json({ error: "ID mismatch" }, { status: 400 });
  }
  await writeTrip(trip);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_: Request, { params }: { params: { id: string } }) {
  await deleteTrip(params.id);
  return NextResponse.json({ ok: true });
}
