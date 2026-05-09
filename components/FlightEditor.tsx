"use client";

import { useState } from "react";
import type { TripFlight } from "@/lib/types";
import EllipsisMenu from "./EllipsisMenu";
import { ItineraryPanel } from "./ItineraryDisplay";

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-300";

function isBookingUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return /^(www\.)?google\.[a-z.]+$/.test(u.host) && u.pathname.startsWith("/travel/flights/booking");
  } catch {
    return false;
  }
}

export default function FlightEditor({
  flight,
  onChange,
  onRemove,
  onRefresh,
}: {
  flight: TripFlight;
  onChange: (f: TripFlight) => void;
  onRemove: () => void;
  // Triggers a server-side scrape + history append. Parent re-fetches the
  // trip on success and pushes the updated flight back via onChange.
  onRefresh: () => Promise<void>;
}) {
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchPrice() {
    setFetching(true);
    setError(null);
    try {
      await onRefresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setFetching(false);
    }
  }

  const isImported = !!flight.itinerary;
  const url = flight.googleFlightsUrl ?? "";
  const urlIsValid = url === "" || isBookingUrl(url);

  const cardCls = flight.bought
    ? "rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-700/50 dark:bg-green-950/30"
    : "rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900";

  return (
    <div className={cardCls}>
      <div className="flex items-center gap-2">
        <input
          className="flex-1 bg-transparent text-lg font-semibold focus:outline-none"
          value={flight.title}
          onChange={(e) => onChange({ ...flight, title: e.target.value })}
          placeholder="Flight title"
        />
        {isImported && (
          <span className="rounded-md bg-neutral-200 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-neutral-700 dark:bg-neutral-700 dark:text-neutral-200">
            Imported
          </span>
        )}
        <EllipsisMenu label="Flight options">
          {(close) => (
            <div className="grid gap-3">
              <label className="grid gap-1">
                <span className="text-[10px] uppercase tracking-wide text-neutral-500">Google Flights link</span>
                <textarea
                  className={`${inputCls} min-h-[60px] resize-y font-mono text-xs`}
                  value={url}
                  onChange={(e) => onChange({ ...flight, googleFlightsUrl: e.target.value || undefined })}
                  placeholder="https://www.google.com/travel/flights/booking?tfs=..."
                />
              </label>
              {url && !urlIsValid && (
                <div className="text-xs text-amber-600 dark:text-amber-400">
                  Doesn't look like a booking URL.
                </div>
              )}
              {error && <div className="text-xs text-red-600 dark:text-red-400">{error}</div>}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await fetchPrice();
                    close();
                  }}
                  disabled={!url || !urlIsValid || fetching}
                  className="rounded-md bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 disabled:opacity-50 dark:bg-white dark:text-neutral-900 dark:hover:bg-neutral-200"
                >
                  {fetching ? "Fetching…" : isImported ? "Refresh price" : "Fetch flight"}
                </button>
                {isImported && (
                  <button
                    type="button"
                    onClick={() => {
                      onChange({
                        ...flight,
                        googleFlightsUrl: undefined,
                        itinerary: undefined,
                        lastCheckedAt: undefined,
                      });
                      close();
                    }}
                    className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs hover:bg-red-100 hover:text-red-700 dark:bg-neutral-800 dark:hover:bg-red-950 dark:hover:text-red-300"
                  >
                    Remove import
                  </button>
                )}
              </div>
            </div>
          )}
        </EllipsisMenu>
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove flight"
          className="rounded-md bg-neutral-100 px-2 py-0.5 text-sm leading-none hover:bg-red-100 hover:text-red-700 dark:bg-neutral-800 dark:hover:bg-red-950 dark:hover:text-red-300"
        >
          ×
        </button>
      </div>

      <div className="mt-3 grid gap-3">
        {isImported ? (
          <ItineraryPanel itinerary={flight.itinerary!} lastCheckedAt={flight.lastCheckedAt} />
        ) : (
          <ManualFlightFields flight={flight} onChange={onChange} />
        )}

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-neutral-500">Notes</span>
          <input
            className={inputCls}
            value={flight.notes ?? ""}
            onChange={(e) => onChange({ ...flight, notes: e.target.value || undefined })}
            placeholder="Anything else…"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={() => onChange({ ...flight, bought: !flight.bought })}
        className={`mt-4 w-full rounded-md py-2 text-sm font-medium ${
          flight.bought
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
        }`}
      >
        {flight.bought ? "✓ Bought" : "Mark as bought"}
      </button>
    </div>
  );
}

function ManualFlightFields({
  flight,
  onChange,
}: {
  flight: TripFlight;
  onChange: (f: TripFlight) => void;
}) {
  function set<K extends "manualDepartDate" | "manualReturnDate" | "manualCost">(key: K, value: string) {
    onChange({ ...flight, [key]: value || undefined });
  }
  return (
    <div className="grid grid-cols-3 gap-2">
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wide text-neutral-500">Depart</span>
        <input type="date" className={inputCls} value={flight.manualDepartDate ?? ""} onChange={(e) => set("manualDepartDate", e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wide text-neutral-500">Return (optional)</span>
        <input type="date" className={inputCls} value={flight.manualReturnDate ?? ""} onChange={(e) => set("manualReturnDate", e.target.value)} />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-[10px] uppercase tracking-wide text-neutral-500">Cost</span>
        <input
          className={`${inputCls} tabular-nums`}
          value={flight.manualCost ?? ""}
          onChange={(e) => set("manualCost", e.target.value)}
          placeholder="0"
          inputMode="decimal"
        />
      </label>
    </div>
  );
}
