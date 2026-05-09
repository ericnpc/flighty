// Read-only trip renderer used by the public (statically-exported) site.
// Server-renders cleanly — no client interactivity required.

import type { BudgetItem, Stay, Trip, TripFlight } from "@/lib/types";
import type { PriceSnapshot } from "@/lib/fs-storage";
import { formatLocalDate, isInvalidRange, nightsBetween } from "@/lib/dates";
import { toEmbedSrc } from "@/lib/maps";
import { formatMoney } from "@/lib/money";
import { ItineraryPanel } from "./ItineraryDisplay";

function parseCost(s: string): number {
  const n = Number(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

export default function TripView({
  trip,
  histories,
}: {
  trip: Trip;
  histories: Record<string, PriceSnapshot[]>;
}) {
  const embedSrc = toEmbedSrc(trip.mapsUrl);
  const datesInvalid = isInvalidRange(trip.startDate, trip.endDate);
  const nights = nightsBetween(trip.startDate, trip.endDate);

  return (
    <div className="grid gap-6">
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
          <h1 className="flex-1 text-2xl font-semibold">{trip.name || "Untitled trip"}</h1>
          {nights > 0 && !datesInvalid && (
            <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
              {nights} night{nights !== 1 ? "s" : ""}
            </span>
          )}
        </div>

        {(trip.startDate || trip.endDate) && (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            {trip.startDate && formatLocalDate(trip.startDate)}
            {trip.startDate && trip.endDate && " → "}
            {trip.endDate && formatLocalDate(trip.endDate)}
          </p>
        )}

        {trip.destinations.length > 0 && (
          <p className="text-sm font-medium">{trip.destinations.join(" → ")}</p>
        )}

        {trip.notes && (
          <p className="whitespace-pre-wrap text-sm text-neutral-700 dark:text-neutral-300">{trip.notes}</p>
        )}
      </section>

      {trip.flights.length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Flights</h2>
          <div className="grid gap-3">
            {trip.flights.map((f) => (
              <FlightCard key={f.id} flight={f} currency={trip.currency} history={histories[f.id] ?? []} />
            ))}
          </div>
        </section>
      )}

      {trip.stays.length > 0 && (
        <section className="grid gap-3">
          <h2 className="text-lg font-semibold">Places to stay</h2>
          <div className="grid gap-3">
            {trip.stays.map((s) => (
              <StayCard key={s.id} stay={s} />
            ))}
          </div>
        </section>
      )}

      {(trip.budget.length > 0 || trip.flights.some((f) => f.bought) || trip.stays.some((s) => s.bought)) && (
        <BudgetSection trip={trip} />
      )}
    </div>
  );
}

function FlightCard({ flight, currency, history }: { flight: TripFlight; currency: string; history: PriceSnapshot[] }) {
  const cardCls = flight.bought
    ? "rounded-xl border border-green-300 bg-green-50 p-4 dark:border-green-700/50 dark:bg-green-950/30"
    : "rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900";

  return (
    <div className={cardCls}>
      <div className="mb-3 flex items-center gap-2">
        <h3 className="flex-1 text-lg font-semibold">{flight.title || "Flight"}</h3>
        {flight.bought && (
          <span className="rounded-md bg-green-600 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
            Bought
          </span>
        )}
      </div>

      {flight.itinerary ? (
        <ItineraryPanel itinerary={flight.itinerary} lastCheckedAt={flight.lastCheckedAt} />
      ) : (
        <ManualFlightSummary flight={flight} currency={currency} />
      )}

      {flight.notes && (
        <p className="mt-3 text-sm text-neutral-600 dark:text-neutral-400">{flight.notes}</p>
      )}

      {history.length > 1 && <PriceHistory history={history} currency={flight.itinerary?.currency} />}
    </div>
  );
}

function ManualFlightSummary({ flight, currency }: { flight: TripFlight; currency: string }) {
  const cost = parseCost(flight.manualCost ?? "");
  return (
    <dl className="grid grid-cols-3 gap-3 rounded-lg bg-neutral-50/80 p-3 text-sm dark:bg-neutral-950/50">
      <Field label="Depart">{flight.manualDepartDate ? formatLocalDate(flight.manualDepartDate) : "—"}</Field>
      <Field label="Return">{flight.manualReturnDate ? formatLocalDate(flight.manualReturnDate) : "—"}</Field>
      <Field label="Cost">{cost > 0 ? formatMoney(cost, currency) : "—"}</Field>
    </dl>
  );
}

function PriceHistory({ history, currency }: { history: PriceSnapshot[]; currency?: string }) {
  // Show last 6 snapshots, oldest first.
  const recent = history.slice(-6);
  return (
    <details className="mt-3 rounded-lg bg-neutral-50/80 p-3 text-xs dark:bg-neutral-950/50">
      <summary className="cursor-pointer font-medium text-neutral-700 dark:text-neutral-300">
        Price history ({history.length} snapshot{history.length !== 1 ? "s" : ""})
      </summary>
      <ul className="mt-2 grid gap-0.5 tabular-nums">
        {recent.map((s, i) => (
          <li key={i} className="flex justify-between text-neutral-500">
            <span>{new Date(s.at).toLocaleString()}</span>
            <span>
              {s.price !== undefined ? formatMoney(s.price, s.currency ?? currency) : (s.error ? "(failed)" : "—")}
            </span>
          </li>
        ))}
      </ul>
    </details>
  );
}

function StayCard({ stay }: { stay: Stay }) {
  const nights = nightsBetween(stay.startDate, stay.endDate);
  const cardCls = stay.bought
    ? "rounded-xl border border-green-300 bg-green-50 p-4 dark:border-green-700/50 dark:bg-green-950/30"
    : "rounded-xl border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900";
  return (
    <div className={cardCls}>
      <div className="mb-2 flex items-center gap-2">
        <h3 className="flex-1 text-lg font-semibold">{stay.city || "Stay"}</h3>
        {nights > 0 && (
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
            {nights} night{nights !== 1 ? "s" : ""}
          </span>
        )}
        {stay.bought && (
          <span className="rounded-md bg-green-600 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-white">
            Booked
          </span>
        )}
      </div>
      {stay.address && <p className="text-sm text-neutral-600 dark:text-neutral-400">{stay.address}</p>}
      <p className="mt-1 text-xs text-neutral-500">
        {stay.startDate && formatLocalDate(stay.startDate)}
        {stay.startDate && stay.endDate && " → "}
        {stay.endDate && formatLocalDate(stay.endDate)}
      </p>
    </div>
  );
}

function BudgetSection({ trip }: { trip: Trip }) {
  type Row = { id: string; icon: string; label: string; cost: number; costDisplay: string; notes?: string };
  const tc = trip.currency;
  const flightRows: Row[] = trip.flights
    .filter((f) => f.bought)
    .map((f) => {
      const it = f.itinerary;
      const label = f.title || (it ? `${it.outbound.legs[0]?.origin} → ${it.outbound.legs[it.outbound.legs.length - 1]?.destination}` : "Flight");
      const cost = it ? (it.price ?? 0) : parseCost(f.manualCost ?? "");
      // Imported flights stay in their scraped currency; manual flights use trip currency.
      const display = it ? formatMoney(cost, it.currency) : formatMoney(cost, tc);
      return { id: `f-${f.id}`, icon: "✈", label, cost, costDisplay: cost > 0 ? display : "—" };
    });
  const stayRows: Row[] = trip.stays
    .filter((s) => s.bought)
    .map((s) => {
      const cost = parseCost(s.cost);
      return { id: `s-${s.id}`, icon: "🏨", label: s.city ? `Stay in ${s.city}` : "Stay", cost, costDisplay: cost > 0 ? formatMoney(cost, tc) : "—" };
    });
  const itemRows: Row[] = trip.budget.map((b: BudgetItem) => {
    const cost = parseCost(b.cost);
    return { id: `b-${b.id}`, icon: "•", label: b.item || "—", cost, costDisplay: cost > 0 ? formatMoney(cost, tc) : "—", notes: b.notes };
  });
  const all: Row[] = [...flightRows, ...stayRows, ...itemRows];
  const total = all.reduce((s, r) => s + r.cost, 0);

  return (
    <section className="grid gap-3">
      <h2 className="text-lg font-semibold">Budget</h2>
      <div className="grid gap-1.5">
        {all.map((r) => (
          <div key={r.id} className="flex items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm dark:bg-neutral-900">
            <span className="flex items-center gap-2">
              <span className="text-base">{r.icon}</span>
              <span>{r.label}</span>
              {r.notes && <span className="text-xs text-neutral-500">— {r.notes}</span>}
            </span>
            <span className="font-medium tabular-nums">{r.costDisplay}</span>
          </div>
        ))}
        <div className="mt-1 flex items-baseline justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950">
          <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total</span>
          <span className="text-xl font-semibold tabular-nums">{formatMoney(total, tc)}</span>
        </div>
      </div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}
