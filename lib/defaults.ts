// Shared defaults + migration. Used both server-side (when creating a trip
// via API) and client-side (when importing from localStorage).

import type { BudgetItem, Stay, Trip, TripFlight } from "./types";

export function newId(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) return crypto.randomUUID();
  return Math.random().toString(36).slice(2, 12);
}

export function migrateStay(s: Partial<Stay>): Stay {
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

export function migrateFlight(f: Partial<TripFlight>): TripFlight {
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

export function migrateTrip(t: Partial<Trip>): Trip {
  return {
    id: t.id ?? newId(),
    name: t.name ?? "Untitled trip",
    startDate: t.startDate ?? "",
    endDate: t.endDate ?? "",
    destinations: t.destinations ?? [],
    notes: t.notes ?? "",
    mapsUrl: t.mapsUrl ?? "",
    currency: t.currency ?? "USD",
    flights: (t.flights ?? []).map(migrateFlight),
    stays: (t.stays ?? []).map(migrateStay),
    budget: t.budget ?? [],
    createdAt: t.createdAt ?? new Date().toISOString(),
  };
}

export function newBudgetItem(): BudgetItem {
  return { id: newId(), item: "", cost: "", notes: "" };
}
export function newFlight(): TripFlight {
  return migrateFlight({});
}
export function newStay(): Stay {
  return migrateStay({});
}
