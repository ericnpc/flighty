"use client";

import { useState } from "react";
import type { Itinerary, Leg, OneWay, TripFlight } from "@/lib/types";
import { formatLocalDate } from "@/lib/dates";
import EllipsisMenu from "./EllipsisMenu";

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-300";

function formatPrice(price: number, currency?: string): string {
  if (currency === "USD") return `$${price.toLocaleString()}`;
  return `${currency ?? ""} ${price.toLocaleString()}`.trim();
}

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
}: {
  flight: TripFlight;
  onChange: (f: TripFlight) => void;
  onRemove: () => void;
}) {
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function fetchPrice() {
    if (!flight.googleFlightsUrl) return;
    setFetching(true);
    setError(null);
    try {
      const r = await fetch("/api/flights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: flight.googleFlightsUrl }),
      });
      if (!r.ok) {
        const body = await r.json().catch(() => ({}));
        throw new Error(body.error ?? `HTTP ${r.status}`);
      }
      const itinerary = (await r.json()) as Itinerary;
      onChange({ ...flight, itinerary, lastCheckedAt: new Date().toISOString() });
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
                    if (!error) close();
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

function ItineraryPanel({ itinerary, lastCheckedAt }: { itinerary: Itinerary; lastCheckedAt?: string }) {
  return (
    <div className="grid gap-3 rounded-lg bg-neutral-50/80 p-3 text-sm dark:bg-neutral-950/50">
      <OneWaySection label="Out" data={itinerary.outbound} />
      {itinerary.return && <OneWaySection label="Return" data={itinerary.return} />}
      <div className="flex items-baseline justify-between border-t border-neutral-200 pt-2 dark:border-neutral-800">
        <span className="text-base font-semibold tabular-nums">
          {itinerary.price !== undefined
            ? formatPrice(itinerary.price, itinerary.currency)
            : <span className="text-sm font-normal text-neutral-400">Price unknown</span>}
        </span>
        <span className="text-xs text-neutral-500">
          {lastCheckedAt ? `Checked ${new Date(lastCheckedAt).toLocaleString()}` : "Never checked"}
        </span>
      </div>
      {itinerary.priceError && (
        <div className="text-xs text-amber-600 dark:text-amber-400">price scrape failed: {itinerary.priceError}</div>
      )}
    </div>
  );
}

function OneWaySection({ label, data }: { label: string; data: OneWay }) {
  const offset = data.arriveDayOffset ?? 0;
  const route = `${data.legs[0]?.origin ?? ""} → ${data.legs[data.legs.length - 1]?.destination ?? ""}`;
  return (
    <div>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</span>
        <span className="text-xs text-neutral-600 dark:text-neutral-400">{formatLocalDate(data.departDate)}</span>
      </div>
      <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
        {data.departTime && data.arriveTime ? (
          <>
            <span className="text-base font-medium tabular-nums">
              {data.departTime} → {data.arriveTime}
            </span>
            {offset > 0 && (
              <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-800 dark:bg-amber-900/40 dark:text-amber-200">
                +{offset}
              </span>
            )}
          </>
        ) : (
          <span className="text-sm text-neutral-400">Times unknown</span>
        )}
        <span className="ml-auto text-xs text-neutral-500 tabular-nums">{route}</span>
      </div>
      <div className="grid gap-0.5">
        {data.legs.map((leg, i) => (
          <LegRow key={i} leg={leg} />
        ))}
      </div>
    </div>
  );
}

function LegRow({ leg }: { leg: Leg }) {
  return (
    <div className="flex items-baseline gap-2 text-xs text-neutral-500">
      <span className="w-12 shrink-0 tabular-nums text-neutral-400">{leg.airline}{leg.flightNumber}</span>
      <span className="tabular-nums">{leg.origin} → {leg.destination}</span>
    </div>
  );
}
