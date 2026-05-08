"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Trip } from "@/lib/types";
import { createTrip, deleteTrip, loadTrips } from "@/lib/storage";

function formatDateRange(start: string, end: string): string {
  if (!start && !end) return "Dates not set";
  if (start && !end) return `From ${start}`;
  if (!start && end) return `Until ${end}`;
  return `${start} → ${end}`;
}

export default function TripList() {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>([]);

  useEffect(() => {
    setTrips(loadTrips());
  }, []);

  function handleNew() {
    const trip = createTrip();
    router.push(`/trips/${trip.id}`);
  }

  function handleDelete(id: string) {
    if (!confirm("Delete this trip?")) return;
    setTrips(deleteTrip(id));
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Your trips</h1>
        <button
          onClick={handleNew}
          className="rounded-xl bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
        >
          + New trip
        </button>
      </div>

      {trips.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          No trips yet. Create one to start adding flights and places to stay.
        </p>
      ) : (
        <div className="grid gap-3">
          {trips.map((t) => {
            const flightCount = t.flights.length;
            const stayCount = t.stays.length;
            return (
              <div key={t.id} className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900">
                <Link href={`/trips/${t.id}`} className="flex-1 grid gap-1">
                  <div className="text-base font-medium">{t.name || "Untitled trip"}</div>
                  <div className="text-xs text-neutral-500">
                    {formatDateRange(t.startDate, t.endDate)}
                    {t.destinations.length > 0 && ` · ${t.destinations.join(" → ")}`}
                  </div>
                  <div className="text-xs text-neutral-500">
                    {flightCount} flight{flightCount !== 1 ? "s" : ""} · {stayCount} stay{stayCount !== 1 ? "s" : ""}
                  </div>
                </Link>
                <button
                  onClick={() => handleDelete(t.id)}
                  className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs hover:bg-red-100 hover:text-red-700 dark:bg-neutral-800 dark:hover:bg-red-950 dark:hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
