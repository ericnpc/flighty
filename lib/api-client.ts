"use client";

import type { Trip } from "./types";

async function unwrap<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const body = await r.json().catch(() => ({}));
    throw new Error(body.error ?? `HTTP ${r.status}`);
  }
  return r.json() as Promise<T>;
}

export async function listTripsApi(): Promise<Trip[]> {
  return unwrap<Trip[]>(await fetch("/api/trips"));
}

export async function getTripApi(id: string): Promise<Trip | null> {
  const r = await fetch(`/api/trips/${id}`);
  if (r.status === 404) return null;
  return unwrap<Trip>(r);
}

export async function createTripApi(): Promise<Trip> {
  return unwrap<Trip>(
    await fetch("/api/trips", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }),
  );
}

export async function importTripApi(trip: Trip): Promise<Trip> {
  return unwrap<Trip>(
    await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trip),
    }),
  );
}

export async function saveTripApi(trip: Trip): Promise<void> {
  await unwrap<{ ok: true }>(
    await fetch(`/api/trips/${trip.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(trip),
    }),
  );
}

export async function deleteTripApi(id: string): Promise<void> {
  await unwrap<{ ok: true }>(await fetch(`/api/trips/${id}`, { method: "DELETE" }));
}

export async function refreshFlightApi(tripId: string, flightId: string): Promise<Trip> {
  return unwrap<Trip>(
    await fetch(`/api/trips/${tripId}/refresh/${flightId}`, { method: "POST" }),
  );
}

// Returns the (possibly updated) trip; the id may have changed.
export async function renameSlugApi(tripId: string): Promise<Trip> {
  return unwrap<Trip>(
    await fetch(`/api/trips/${tripId}/rename-slug`, { method: "POST" }),
  );
}
