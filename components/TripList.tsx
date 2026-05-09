"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import type { Trip } from "@/lib/types";
import { createTripApi, deleteTripApi, importTripApi, listTripsApi } from "@/lib/api-client";

const IS_STATIC = process.env.NEXT_PUBLIC_STATIC === "1";

function formatDateRange(start: string, end: string): string {
  if (!start && !end) return "Dates not set";
  if (start && !end) return `From ${start}`;
  if (!start && end) return `Until ${end}`;
  return `${start} → ${end}`;
}

export default function TripList({ initialTrips }: { initialTrips: Trip[] }) {
  const router = useRouter();
  const [trips, setTrips] = useState<Trip[]>(initialTrips);
  const [importable, setImportable] = useState<Trip[] | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (IS_STATIC) return;
    // In dev, refresh from API on mount in case the static initialTrips are
    // stale (e.g. you just edited one and came back).
    listTripsApi().then(setTrips).catch(() => {});

    // One-time migration nag for users with leftover localStorage data.
    try {
      const raw = window.localStorage.getItem("flighty.trips.v3");
      if (raw) {
        const parsed = JSON.parse(raw) as Trip[];
        if (parsed.length > 0) setImportable(parsed);
      }
    } catch {
      // ignore
    }
  }, []);

  async function handleNew() {
    setBusy(true);
    try {
      const trip = await createTripApi();
      router.push(`/trips/${trip.id}/edit`);
    } finally {
      setBusy(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this trip?")) return;
    await deleteTripApi(id);
    setTrips((ts) => ts.filter((t) => t.id !== id));
  }

  async function handleImport() {
    if (!importable) return;
    setBusy(true);
    try {
      for (const t of importable) await importTripApi(t);
      window.localStorage.removeItem("flighty.trips.v3");
      setImportable(null);
      setTrips(await listTripsApi());
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-semibold">Your trips</h1>
        {!IS_STATIC && (
          <button
            onClick={handleNew}
            disabled={busy}
            className="rounded-xl bg-neutral-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
          >
            + New trip
          </button>
        )}
      </div>

      {!IS_STATIC && importable && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm dark:border-amber-700/50 dark:bg-amber-950/30">
          Found {importable.length} trip{importable.length !== 1 ? "s" : ""} in browser storage from before the
          filesystem migration.{" "}
          <button onClick={handleImport} disabled={busy} className="font-medium underline disabled:opacity-50">
            Import to data/
          </button>
        </div>
      )}

      {trips.length === 0 ? (
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {IS_STATIC ? "No trips published yet." : "No trips yet. Create one to start adding flights and places to stay."}
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
                {!IS_STATIC && (
                  <>
                    <Link
                      href={`/trips/${t.id}/edit`}
                      className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                    >
                      Edit
                    </Link>
                    <button
                      onClick={() => handleDelete(t.id)}
                      className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs hover:bg-red-100 hover:text-red-700 dark:bg-neutral-800 dark:hover:bg-red-950 dark:hover:text-red-300"
                    >
                      Delete
                    </button>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
