import type { BudgetItem, Stay, Trip, TripFlight } from "./types";

const KEY = "flighty.trips.v3";

function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 12);
}

function migrateStay(s: Partial<Stay>): Stay {
  return {
    id: s.id ?? newId(),
    city: s.city ?? "",
    address: s.address ?? "",
    startDate: s.startDate ?? "",
    endDate: s.endDate ?? "",
    cost: s.cost ?? "",
    bought: s.bought ?? false,
  };
}

function migrateFlight(f: Partial<TripFlight>): TripFlight {
  return {
    id: f.id ?? newId(),
    title: f.title ?? "",
    bought: f.bought ?? false,
    googleFlightsUrl: f.googleFlightsUrl,
    itinerary: f.itinerary,
    lastCheckedAt: f.lastCheckedAt,
    notes: f.notes,
    manualDepartDate: f.manualDepartDate,
    manualReturnDate: f.manualReturnDate,
    manualCost: f.manualCost,
  };
}

function migrate(t: Partial<Trip>): Trip {
  return {
    id: t.id ?? newId(),
    name: t.name ?? "Untitled trip",
    startDate: t.startDate ?? "",
    endDate: t.endDate ?? "",
    destinations: t.destinations ?? [],
    notes: t.notes ?? "",
    mapsUrl: t.mapsUrl ?? "",
    flights: (t.flights ?? []).map(migrateFlight),
    stays: (t.stays ?? []).map(migrateStay),
    budget: t.budget ?? [],
    createdAt: t.createdAt ?? new Date().toISOString(),
  };
}

export function loadTrips(): Trip[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    return (JSON.parse(raw) as Partial<Trip>[]).map(migrate);
  } catch {
    return [];
  }
}

export function writeTrips(trips: Trip[]): void {
  window.localStorage.setItem(KEY, JSON.stringify(trips));
}

export function getTrip(id: string): Trip | undefined {
  return loadTrips().find((t) => t.id === id);
}

export function createTrip(): Trip {
  const trip: Trip = migrate({});
  writeTrips([trip, ...loadTrips()]);
  return trip;
}

export function saveTrip(trip: Trip): void {
  const trips = loadTrips();
  const i = trips.findIndex((t) => t.id === trip.id);
  if (i >= 0) trips[i] = trip;
  else trips.unshift(trip);
  writeTrips(trips);
}

export function deleteTrip(id: string): Trip[] {
  const next = loadTrips().filter((t) => t.id !== id);
  writeTrips(next);
  return next;
}

export function newFlight(): TripFlight {
  return migrateFlight({});
}

export function newStay(): Stay {
  return migrateStay({});
}

export function newBudgetItem(): BudgetItem {
  return { id: newId(), item: "", cost: "", notes: "" };
}
