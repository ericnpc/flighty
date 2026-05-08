"use client";

import type { Stay } from "@/lib/types";
import { isInvalidRange, nightsBetween } from "@/lib/dates";

const inputCls =
  "w-full rounded-md border border-neutral-300 bg-white px-2 py-1.5 text-sm placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none dark:border-neutral-700 dark:bg-neutral-950 dark:focus:border-neutral-300";

const inputErrCls =
  "w-full rounded-md border border-red-400 bg-white px-2 py-1.5 text-sm placeholder:text-neutral-400 focus:border-red-500 focus:outline-none dark:border-red-700 dark:bg-neutral-950 dark:focus:border-red-500";

export default function StayEditor({
  stay,
  onChange,
  onRemove,
}: {
  stay: Stay;
  onChange: (s: Stay) => void;
  onRemove: () => void;
}) {
  function set<K extends keyof Stay>(key: K, value: Stay[K]) {
    onChange({ ...stay, [key]: value });
  }

  const invalid = isInvalidRange(stay.startDate, stay.endDate);
  const nights = nightsBetween(stay.startDate, stay.endDate);
  const dateInput = invalid ? inputErrCls : inputCls;

  const cardCls = stay.bought
    ? "rounded-lg border border-green-300 bg-green-50 p-4 dark:border-green-700/50 dark:bg-green-950/30"
    : "rounded-lg border border-neutral-200 bg-white p-4 dark:border-neutral-800 dark:bg-neutral-900";

  return (
    <div className={cardCls}>
      <div className="flex items-center gap-2">
        <input
          className="flex-1 bg-transparent text-lg font-semibold focus:outline-none"
          value={stay.city}
          onChange={(e) => set("city", e.target.value)}
          placeholder="City"
        />
        {nights > 0 && !invalid && (
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900/40 dark:text-blue-200">
            {nights} night{nights !== 1 ? "s" : ""}
          </span>
        )}
        <button
          type="button"
          onClick={onRemove}
          aria-label="Remove stay"
          className="rounded-md bg-neutral-100 px-2 py-0.5 text-sm leading-none hover:bg-red-100 hover:text-red-700 dark:bg-neutral-800 dark:hover:bg-red-950 dark:hover:text-red-300"
        >
          ×
        </button>
      </div>

      <div className="mt-3 grid gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wide text-neutral-500">Address</span>
          <input className={inputCls} value={stay.address} onChange={(e) => set("address", e.target.value)} placeholder="Via Roma 1" />
        </label>

        <div className="grid grid-cols-3 gap-2">
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">Check-in</span>
            <input type="date" className={dateInput} value={stay.startDate} onChange={(e) => set("startDate", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">Check-out</span>
            <input type="date" className={dateInput} value={stay.endDate} onChange={(e) => set("endDate", e.target.value)} />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-[10px] uppercase tracking-wide text-neutral-500">Cost</span>
            <input
              className={`${inputCls} tabular-nums`}
              value={stay.cost}
              onChange={(e) => set("cost", e.target.value)}
              placeholder="0"
              inputMode="decimal"
            />
          </label>
        </div>

        {invalid && (
          <div className="text-xs text-red-600 dark:text-red-400">Check-out is before check-in.</div>
        )}
      </div>

      <button
        type="button"
        onClick={() => set("bought", !stay.bought)}
        className={`mt-4 w-full rounded-md py-2 text-sm font-medium ${
          stay.bought
            ? "bg-green-600 text-white hover:bg-green-700"
            : "bg-neutral-100 text-neutral-700 hover:bg-neutral-200 dark:bg-neutral-800 dark:text-neutral-200 dark:hover:bg-neutral-700"
        }`}
      >
        {stay.bought ? "✓ Booked" : "Mark as booked"}
      </button>
    </div>
  );
}
