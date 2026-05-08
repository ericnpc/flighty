"use client";

import type { BudgetItem, Stay, TripFlight } from "@/lib/types";

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-300";

function parseCost(s: string): number {
  const n = Number(s.replace(/[^0-9.\-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function formatPrice(price: number, currency?: string): string {
  if (currency === "USD") return `$${price.toLocaleString()}`;
  return `${currency ?? ""} ${price.toLocaleString()}`.trim();
}

type AutoEntry = {
  id: string;
  icon: string;
  label: string;
  cost: number;
  costDisplay: string;
};

function flightEntries(flights: TripFlight[]): AutoEntry[] {
  return flights
    .filter((f) => f.bought)
    .map((f) => {
      const it = f.itinerary;
      let label: string;
      let cost: number;
      let costDisplay: string;

      if (it) {
        const route = `${it.outbound.legs[0]?.origin ?? "?"} → ${it.outbound.legs[it.outbound.legs.length - 1]?.destination ?? "?"}${it.return ? " (round trip)" : ""}`;
        label = f.title || route;
        cost = it.price ?? 0;
        costDisplay = it.price !== undefined ? formatPrice(it.price, it.currency) : "—";
      } else {
        label = f.title || "Flight";
        cost = parseCost(f.manualCost ?? "");
        costDisplay = cost > 0 ? `$${cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—";
      }

      return { id: `flight-${f.id}`, icon: "✈", label, cost, costDisplay };
    });
}

function stayEntries(stays: Stay[]): AutoEntry[] {
  return stays
    .filter((s) => s.bought)
    .map((s) => {
      const cost = parseCost(s.cost);
      const label = s.city ? `Stay in ${s.city}` : "Stay";
      return {
        id: `stay-${s.id}`,
        icon: "🏨",
        label,
        cost,
        costDisplay: cost > 0 ? `$${cost.toLocaleString(undefined, { maximumFractionDigits: 2 })}` : "—",
      };
    });
}

export default function BudgetEditor({
  items,
  flights,
  stays,
  onChange,
  onAdd,
  onRemove,
}: {
  items: BudgetItem[];
  flights: TripFlight[];
  stays: Stay[];
  onChange: (id: string, next: BudgetItem) => void;
  onAdd: () => void;
  onRemove: (id: string) => void;
}) {
  const auto = [...flightEntries(flights), ...stayEntries(stays)];
  const manualTotal = items.reduce((sum, i) => sum + parseCost(i.cost), 0);
  const autoTotal = auto.reduce((sum, e) => sum + e.cost, 0);
  const total = manualTotal + autoTotal;

  return (
    <section className="grid gap-3">
      <div className="flex items-baseline justify-between">
        <h2 className="text-lg font-semibold">Budget</h2>
        <button
          type="button"
          onClick={onAdd}
          className="rounded-md bg-neutral-100 px-2.5 py-1 text-xs hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700"
        >
          + Add item
        </button>
      </div>

      {auto.length === 0 && items.length === 0 ? (
        <p className="text-sm text-neutral-500">No budget items yet. Mark a flight or stay as bought to add it here automatically.</p>
      ) : (
        <div className="grid gap-2">
          {auto.map((e) => (
            <AutoRow key={e.id} entry={e} />
          ))}
          {items.map((it) => (
            <BudgetRow key={it.id} item={it} onChange={(next) => onChange(it.id, next)} onRemove={() => onRemove(it.id)} />
          ))}
          <div className="mt-2 flex items-baseline justify-between gap-3 rounded-lg border border-neutral-200 bg-neutral-50 px-3 py-2 dark:border-neutral-800 dark:bg-neutral-950">
            <span className="text-sm font-medium text-neutral-600 dark:text-neutral-400">Total</span>
            <span className="text-xl font-semibold tabular-nums">
              ${total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            </span>
          </div>
        </div>
      )}
    </section>
  );
}

function AutoRow({ entry }: { entry: AutoEntry }) {
  return (
    <div className="grid grid-cols-12 items-center gap-2 rounded-lg border border-green-200 bg-green-50/60 p-2 dark:border-green-800/40 dark:bg-green-950/20">
      <div className="col-span-9 flex items-center gap-2 text-sm">
        <span className="text-base">{entry.icon}</span>
        <span className="font-medium">{entry.label}</span>
        <span className="text-xs text-neutral-500">(auto from bought)</span>
      </div>
      <div className="col-span-3 text-right text-sm font-medium tabular-nums">{entry.costDisplay}</div>
    </div>
  );
}

function BudgetRow({
  item,
  onChange,
  onRemove,
}: {
  item: BudgetItem;
  onChange: (next: BudgetItem) => void;
  onRemove: () => void;
}) {
  function set<K extends keyof BudgetItem>(key: K, value: BudgetItem[K]) {
    onChange({ ...item, [key]: value });
  }
  return (
    <div className="grid grid-cols-12 items-center gap-2 rounded-lg border border-neutral-200 bg-white p-2 dark:border-neutral-800 dark:bg-neutral-900">
      <input className={`${inputCls} col-span-4`} value={item.item} onChange={(e) => set("item", e.target.value)} placeholder="Item" />
      <input className={`${inputCls} col-span-2 tabular-nums`} value={item.cost} onChange={(e) => set("cost", e.target.value)} placeholder="0" inputMode="decimal" />
      <input className={`${inputCls} col-span-5`} value={item.notes} onChange={(e) => set("notes", e.target.value)} placeholder="Notes" />
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove item"
        className="col-span-1 rounded-md bg-neutral-100 py-1.5 text-sm hover:bg-red-100 hover:text-red-700 dark:bg-neutral-800 dark:hover:bg-red-950 dark:hover:text-red-300"
      >
        ×
      </button>
    </div>
  );
}
