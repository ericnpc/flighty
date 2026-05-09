// Filesystem storage. Server-side only — do not import from client components.
import "server-only";
import { mkdir, readdir, readFile, writeFile, rm, appendFile } from "node:fs/promises";
import { join, resolve } from "node:path";
import type { Trip } from "./types";

const DATA_DIR = resolve(process.cwd(), "data", "trips");

function tripDir(id: string): string {
  return join(DATA_DIR, id);
}
function tripFile(id: string): string {
  return join(tripDir(id), "trip.json");
}
function historyFile(tripId: string, flightId: string): string {
  return join(tripDir(tripId), "history", `${flightId}.jsonl`);
}

export async function listTrips(): Promise<Trip[]> {
  try {
    await mkdir(DATA_DIR, { recursive: true });
    const entries = await readdir(DATA_DIR, { withFileTypes: true });
    const trips: Trip[] = [];
    for (const e of entries) {
      if (!e.isDirectory()) continue;
      const t = await readTrip(e.name);
      if (t) trips.push(t);
    }
    return trips.sort((a, b) => (b.createdAt ?? "").localeCompare(a.createdAt ?? ""));
  } catch {
    return [];
  }
}

export async function readTrip(id: string): Promise<Trip | null> {
  try {
    const raw = await readFile(tripFile(id), "utf8");
    return JSON.parse(raw) as Trip;
  } catch {
    return null;
  }
}

export async function writeTrip(trip: Trip): Promise<void> {
  await mkdir(tripDir(trip.id), { recursive: true });
  await writeFile(tripFile(trip.id), JSON.stringify(trip, null, 2) + "\n");
}

export async function deleteTrip(id: string): Promise<void> {
  await rm(tripDir(id), { recursive: true, force: true });
}

export type PriceSnapshot = {
  at: string;
  price?: number;
  currency?: string;
  error?: string;
};

export async function appendPriceHistory(
  tripId: string,
  flightId: string,
  snapshot: PriceSnapshot,
): Promise<void> {
  await mkdir(join(tripDir(tripId), "history"), { recursive: true });
  await appendFile(historyFile(tripId, flightId), JSON.stringify(snapshot) + "\n");
}

export async function readPriceHistory(
  tripId: string,
  flightId: string,
): Promise<PriceSnapshot[]> {
  try {
    const raw = await readFile(historyFile(tripId, flightId), "utf8");
    return raw.split("\n").filter(Boolean).map((line) => JSON.parse(line) as PriceSnapshot);
  } catch {
    return [];
  }
}
