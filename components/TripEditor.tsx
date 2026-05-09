"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BudgetItem, Stay, Trip, TripCurrency, TripFlight } from "@/lib/types";
import { newBudgetItem, newFlight, newStay } from "@/lib/defaults";
import { deleteTripApi, getTripApi, refreshFlightApi, renameSlugApi, saveTripApi } from "@/lib/api-client";
import { isInvalidRange, nightsBetween } from "@/lib/dates";
import { toEmbedSrc } from "@/lib/maps";
import EllipsisMenu from "./EllipsisMenu";
import FlightEditor from "./FlightEditor";
import StayEditor from "./StayEditor";
import BudgetEditor from "./BudgetEditor";

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-300";

const inputErrCls =
  "w-full rounded-md border border-red-400 bg-white px-2 py-1.5 text-sm placeholder:text-neutral-400 focus:border-red-500 focus:outline-none dark:border-red-700 dark:bg-neutral-950 dark:focus:border-red-500";

export default function TripEditor({ id }: { id: string }) {
  const router = useRouter();
  const [trip, setTrip] = useState<Trip | null | "missing">(null);
  const [destText, setDestText] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);
  const lastSaved = useRef<string>("");

  useEffect(() => {
    getTripApi(id).then((t) => {
      if (!t) {
        setTrip("missing");
        return;
      }
      setTrip(t);
      setDestText(t.destinations.join(", "));
      lastSaved.current = JSON.stringify(t);
    });
  }, [id]);

  // Debounced autosave: 500ms after last change.
  useEffect(() => {
    if (!trip || trip === "missing") return;
    const serialized = JSON.stringify(trip);
    if (serialized === lastSaved.current) return;
    const t = setTimeout(() => {
      saveTripApi(trip)
        .then(() => {
          lastSaved.current = serialized;
          setSaveError(null);
        })
        .catch((err) => setSaveError((err as Error).message));
    }, 500);
    return () => clearTimeout(t);
  }, [trip]);

  const embedSrc = useMemo(
    () => (trip && trip !== "missing" ? toEmbedSrc(trip.mapsUrl) : null),
    [trip],
  );

  if (trip === null) return <div className="text-sm text-neutral-500">Loading…</div>;
  if (trip === "missing") {
    return (
      <div className="text-sm text-neutral-600 dark:text-neutral-400">
        Trip not found. <Link href="/" className="underline">Back to trips</Link>
      </div>
    );
  }

  function update(patch: Partial<Trip>) {
    setTrip((t) => (t && t !== "missing" ? { ...t, ...patch } : t));
  }
  function updateFlight(flightId: string, next: TripFlight) {
    setTrip((t) => (t && t !== "missing" ? { ...t, flights: t.flights.map((f) => (f.id === flightId ? next : f)) } : t));
  }
  function removeFlight(flightId: string) {
    setTrip((t) => (t && t !== "missing" ? { ...t, flights: t.flights.filter((f) => f.id !== flightId) } : t));
  }
  function addFlight() {
    setTrip((t) => (t && t !== "missing" ? { ...t, flights: [...t.flights, newFlight()] } : t));
  }
  function updateStay(stayId: string, next: Stay) {
    setTrip((t) => (t && t !== "missing" ? { ...t, stays: t.stays.map((s) => (s.id === stayId ? next : s)) } : t));
  }
  function removeStay(stayId: string) {
    setTrip((t) => (t && t !== "missing" ? { ...t, stays: t.stays.filter((s) => s.id !== stayId) } : t));
  }
  function addStay() {
    setTrip((t) => (t && t !== "missing" ? { ...t, stays: [...t.stays, newStay()] } : t));
  }
  function updateBudget(itemId: string, next: BudgetItem) {
    setTrip((t) => (t && t !== "missing" ? { ...t, budget: t.budget.map((b) => (b.id === itemId ? next : b)) } : t));
  }
  function removeBudget(itemId: string) {
    setTrip((t) => (t && t !== "missing" ? { ...t, budget: t.budget.filter((b) => b.id !== itemId) } : t));
  }
  function addBudget() {
    setTrip((t) => (t && t !== "missing" ? { ...t, budget: [...t.budget, newBudgetItem()] } : t));
  }

  async function refreshFlight(flightId: string) {
    // Trip needs to be saved first so the server has the URL the user just typed.
    await saveTripApi(trip as Trip);
    lastSaved.current = JSON.stringify(trip);
    const updated = await refreshFlightApi(id, flightId);
    setTrip(updated);
    lastSaved.current = JSON.stringify(updated);
  }

  const tripId = trip.id;
  async function handleDelete() {
    if (!confirm("Delete this trip?")) return;
    await deleteTripApi(tripId);
    router.push("/");
  }

  const datesInvalid = isInvalidRange(trip.startDate, trip.endDate);
  const nights = nightsBetween(trip.startDate, trip.endDate);
  const dateInput = datesInvalid ? inputErrCls : inputCls;

  return (
    <div className="grid gap-6">
      <div className="flex items-center justify-between">
        <Link href={`/trips/${trip.id}`} className="text-xs text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100">
          ← View
        </Link>
        {saveError && <span className="text-xs text-red-600">Save failed: {saveError}</span>}
      </div>

      {embedSrc && (
        <div className="overflow-hidden rounded-2xl border border-neutral-200 shadow-sm dark:border-neutral-800">
          <iframe
            src={embedSrc}
            title="Trip map"
            className="h-56 w-full border-0"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        </div>
      )}

      <section className="grid gap-3 rounded-2xl border border-neutral-200 bg-white p-5 dark:border-neutral-800 dark:bg-neutral-900">
        <div className="flex items-center gap-3">
          <input
            className="flex-1 bg-transparent text-2xl font-semibold focus:outline-none"
            value={trip.name}
            onChange={(e) => update({ name: e.target.value })}
            placeholder="Trip name"
          />
          {nights > 0 && !datesInvalid && (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
              {nights} night{nights !== 1 ? "s" : ""}
            </span>
          )}
          <EllipsisMenu label="Trip options">
            {(close) => (
              <div className="grid gap-4">
                <label className="grid gap-1">
                  <span className="text-[10px] uppercase tracking-wide text-neutral-500">Currency</span>
                  <select
                    className={inputCls}
                    value={trip.currency}
                    onChange={(e) => update({ currency: e.target.value as TripCurrency })}
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                  </select>
                  <span className="text-xs text-neutral-500">
                    Used for the budget total and any manual costs. Imported flights keep their own currency — Refresh
                    after switching to re-scrape in the new currency.
                  </span>
                </label>

                <div className="grid gap-1">
                  <span className="text-[10px] uppercase tracking-wide text-neutral-500">URL slug</span>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 truncate rounded bg-neutral-100 px-2 py-1 text-xs dark:bg-neutral-800">{trip.id}</code>
                    <button
                      type="button"
                      onClick={async () => {
                        // Make sure the latest name is on disk before renaming.
                        await saveTripApi(trip);
                        const updated = await renameSlugApi(trip.id);
                        if (updated.id !== trip.id) {
                          close();
                          router.replace(`/trips/${updated.id}/edit`);
                        }
                      }}
                      className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
                    >
                      Update from name
                    </button>
                  </div>
                  <span className="text-xs text-neutral-500">
                    Renames the directory and changes the URL.
                  </span>
                </div>

                <label className="grid gap-1">
                  <span className="text-[10px] uppercase tracking-wide text-neutral-500">Google Maps link</span>
                  <textarea
                    className={`${inputCls} min-h-[60px] resize-y font-mono text-xs`}
                    value={trip.mapsUrl}
                    onChange={(e) => update({ mapsUrl: e.target.value })}
                    placeholder="Paste a Google Maps URL or <iframe> embed snippet"
                  />
                </label>
                {trip.mapsUrl && !embedSrc && (
                  <div className="text-xs text-amber-600 dark:text-amber-400">
                    Couldn't embed that URL. Use "Share → Embed map" in Google Maps for the iframe snippet.
                  </div>
                )}
                {trip.mapsUrl && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => {
                        update({ mapsUrl: "" });
                        close();
                      }}
                      className="rounded-md bg-neutral-100 px-3 py-1.5 text-xs hover:bg-red-100 hover:text-red-700 dark:bg-neutral-800 dark:hover:bg-red-950 dark:hover:text-red-300"
                    >
                      Remove map
                    </button>
                  </div>
                )}
              </div>
            )}
          </EllipsisMenu>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">Start date</span>
            <input type="date" className={dateInput} value={trip.startDate} onChange={(e) => update({ startDate: e.target.value })} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">End date</span>
            <input type="date" className={dateInput} value={trip.endDate} onChange={(e) => update({ endDate: e.target.value })} />
          </label>
        </div>
        {datesInvalid && (
          <span className="text-sm font-medium text-red-600 dark:text-red-400">End date is before start date.</span>
        )}

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-neutral-500">Destinations (comma-separated)</span>
          <input
            className={inputCls}
            value={destText}
            onChange={(e) => setDestText(e.target.value)}
            onBlur={() => update({ destinations: destText.split(",").map((s) => s.trim()).filter(Boolean) })}
            placeholder="Madrid, Milan, Rome"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-neutral-500">Notes</span>
          <textarea
            className={`${inputCls} min-h-[80px] resize-y`}
            value={trip.notes}
            onChange={(e) => update({ notes: e.target.value })}
            placeholder="Anything you want to remember about this trip…"
          />
        </label>
      </section>

      <section className="grid gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Flights</h2>
          <button
            type="button"
            onClick={addFlight}
            className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          >
            + Add flight
          </button>
        </div>
        {trip.flights.length === 0 ? (
          <p className="text-sm text-neutral-500">No flights yet.</p>
        ) : (
          <div className="grid gap-3">
            {trip.flights.map((f) => (
              <FlightEditor
                key={f.id}
                flight={f}
                onChange={(next) => updateFlight(f.id, next)}
                onRemove={() => removeFlight(f.id)}
                onRefresh={() => refreshFlight(f.id)}
              />
            ))}
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-lg font-semibold">Places to stay</h2>
          <button
            type="button"
            onClick={addStay}
            className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
          >
            + Add stay
          </button>
        </div>
        {trip.stays.length === 0 ? (
          <p className="text-sm text-neutral-500">No stays yet.</p>
        ) : (
          <div className="grid gap-3">
            {trip.stays.map((s) => (
              <StayEditor key={s.id} stay={s} onChange={(next) => updateStay(s.id, next)} onRemove={() => removeStay(s.id)} />
            ))}
          </div>
        )}
      </section>

      <BudgetEditor
        items={trip.budget}
        flights={trip.flights}
        stays={trip.stays}
        currency={trip.currency}
        onChange={updateBudget}
        onAdd={addBudget}
        onRemove={removeBudget}
      />

      <div className="pt-4">
        <button
          type="button"
          onClick={handleDelete}
          className="text-xs text-red-600 hover:underline dark:text-red-400"
        >
          Delete trip
        </button>
      </div>
    </div>
  );
}
