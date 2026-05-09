"use client";

// Shared, read-only renderer for an Itinerary. Used both inside the editor
// (FlightEditor) and on the public read-only trip view (TripView).

import type { Itinerary, Leg, OneWay } from "@/lib/types";
import { formatLocalDate } from "@/lib/dates";
import { formatMoney } from "@/lib/money";
import { localeOf, useLang, useT } from "@/lib/i18n";

// Re-exported for callers that already imported from this module.
export { formatMoney };

export function ItineraryPanel({
  itinerary,
  lastCheckedAt,
}: {
  itinerary: Itinerary;
  lastCheckedAt?: string;
}) {
  const t = useT();
  const { lang } = useLang();
  return (
    <div className="grid gap-3 rounded-lg bg-neutral-50/80 p-3 text-sm dark:bg-neutral-950/50">
      <OneWaySection label={t("itin.out")} data={itinerary.outbound} />
      {itinerary.return && <OneWaySection label={t("itin.return")} data={itinerary.return} />}
      <div className="flex items-baseline justify-between border-t border-neutral-200 pt-2 dark:border-neutral-800">
        <span className="text-base font-semibold tabular-nums">
          {itinerary.price !== undefined
            ? formatMoney(itinerary.price, itinerary.currency)
            : <span className="text-sm font-normal text-neutral-400">{t("itin.priceUnknown")}</span>}
        </span>
        <span className="text-xs text-neutral-500">
          {lastCheckedAt
            ? t("itin.checked", { time: new Date(lastCheckedAt).toLocaleString(localeOf(lang)) })
            : t("itin.neverChecked")}
        </span>
      </div>
      {itinerary.priceError && (
        <div className="text-xs text-amber-600 dark:text-amber-400">
          {t("itin.priceError", { error: itinerary.priceError })}
        </div>
      )}
    </div>
  );
}

export function OneWaySection({ label, data }: { label: string; data: OneWay }) {
  const t = useT();
  const { lang } = useLang();
  const offset = data.arriveDayOffset ?? 0;
  const route = `${data.legs[0]?.origin ?? ""} → ${data.legs[data.legs.length - 1]?.destination ?? ""}`;
  return (
    <div>
      <div className="mb-1 flex items-baseline gap-2">
        <span className="text-[10px] uppercase tracking-wide text-neutral-500">{label}</span>
        <span className="text-xs text-neutral-600 dark:text-neutral-400">{formatLocalDate(data.departDate, localeOf(lang))}</span>
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
          <span className="text-sm text-neutral-400">{t("itin.timesUnknown")}</span>
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
