"use client";

// Tiny client-side i18n. Strings are baked into the bundle (small enough),
// the active language lives in localStorage, components subscribe via useT().
//
// Static HTML pre-renders in the default language (English). On hydration,
// the saved preference takes over — there's a brief flash on first visit
// for Spanish-preferring users. Acceptable for a personal archive site.

import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type Lang = "en" | "es";

const STORAGE_KEY = "flighty.lang";

const DICT = {
  en: {
    "nav.trips": "Trips",
    "footer.note": "Personal use. Flight prices scraped from Google Flights — selectors may break at any time.",

    "list.title": "Your trips",
    "list.new": "+ New trip",
    "list.edit": "Edit",
    "list.delete": "Delete",
    "list.empty.published": "No trips published yet.",
    "list.empty.editor": "No trips yet. Create one to start adding flights and places to stay.",
    "list.import.banner": "Found {count} trips in browser storage from before the filesystem migration.",
    "list.import.banner_one": "Found 1 trip in browser storage from before the filesystem migration.",
    "list.import.action": "Import to data/",
    "list.summary.flights": "{count} flights",
    "list.summary.flights_one": "1 flight",
    "list.summary.stays": "{count} stays",
    "list.summary.stays_one": "1 stay",
    "list.summary.dates.range": "{start} → {end}",
    "list.summary.dates.from": "From {start}",
    "list.summary.dates.until": "Until {end}",
    "list.summary.dates.none": "Dates not set",

    "trip.untitled": "Untitled trip",
    "trip.flights": "Flights",
    "trip.stays": "Places to stay",
    "trip.budget": "Budget",
    "trip.budget.total": "Total",
    "trip.nights": "{count} nights",
    "trip.nights_one": "1 night",

    "flight.bought": "Bought",
    "flight.default": "Flight",
    "flight.viewOnGoogleFlights": "View on Google Flights",
    "flight.depart": "Depart",
    "flight.return": "Return",
    "flight.cost": "Cost",

    "stay.booked": "Booked",
    "stay.default": "Stay",
    "stay.stayIn": "Stay in {city}",

    "itin.out": "Out",
    "itin.return": "Return",
    "itin.timesUnknown": "Times unknown",
    "itin.priceUnknown": "Price unknown",
    "itin.checked": "Checked {time}",
    "itin.neverChecked": "Never checked",
    "itin.priceError": "price scrape failed: {error}",

    "history.title": "Price history ({count} snapshots)",
    "history.title_one": "Price history (1 snapshot)",
    "history.now": "Now",
    "history.min": "Min",
    "history.max": "Max",
    "history.delta": "Δ",
    "history.failed": "(failed)",
  },
  es: {
    "nav.trips": "Viajes",
    "footer.note": "Uso personal. Los precios se obtienen de Google Flights — los selectores pueden romperse en cualquier momento.",

    "list.title": "Tus viajes",
    "list.new": "+ Nuevo viaje",
    "list.edit": "Editar",
    "list.delete": "Eliminar",
    "list.empty.published": "Aún no hay viajes publicados.",
    "list.empty.editor": "Aún no hay viajes. Crea uno para empezar a añadir vuelos y alojamientos.",
    "list.import.banner": "Se encontraron {count} viajes en el almacenamiento del navegador, anteriores a la migración al sistema de archivos.",
    "list.import.banner_one": "Se encontró 1 viaje en el almacenamiento del navegador, anterior a la migración al sistema de archivos.",
    "list.import.action": "Importar a data/",
    "list.summary.flights": "{count} vuelos",
    "list.summary.flights_one": "1 vuelo",
    "list.summary.stays": "{count} alojamientos",
    "list.summary.stays_one": "1 alojamiento",
    "list.summary.dates.range": "{start} → {end}",
    "list.summary.dates.from": "Desde {start}",
    "list.summary.dates.until": "Hasta {end}",
    "list.summary.dates.none": "Sin fechas",

    "trip.untitled": "Viaje sin título",
    "trip.flights": "Vuelos",
    "trip.stays": "Alojamientos",
    "trip.budget": "Presupuesto",
    "trip.budget.total": "Total",
    "trip.nights": "{count} noches",
    "trip.nights_one": "1 noche",

    "flight.bought": "Comprado",
    "flight.default": "Vuelo",
    "flight.viewOnGoogleFlights": "Ver en Google Flights",
    "flight.depart": "Salida",
    "flight.return": "Regreso",
    "flight.cost": "Costo",

    "stay.booked": "Reservado",
    "stay.default": "Alojamiento",
    "stay.stayIn": "Alojamiento en {city}",

    "itin.out": "Ida",
    "itin.return": "Vuelta",
    "itin.timesUnknown": "Horarios desconocidos",
    "itin.priceUnknown": "Precio desconocido",
    "itin.checked": "Consultado {time}",
    "itin.neverChecked": "Nunca consultado",
    "itin.priceError": "no se pudo obtener el precio: {error}",

    "history.title": "Historial de precios ({count} muestras)",
    "history.title_one": "Historial de precios (1 muestra)",
    "history.now": "Ahora",
    "history.min": "Mín",
    "history.max": "Máx",
    "history.delta": "Δ",
    "history.failed": "(falló)",
  },
} as const;

type Dict = typeof DICT.en;
export type DictKey = keyof Dict;

const Ctx = createContext<{ lang: Lang; setLang: (l: Lang) => void }>({
  lang: "en",
  setLang: () => {},
});

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Read saved preference once on mount. The initial render uses "en" so SSR
  // and first paint match the static HTML; we swap after hydration.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === "es" || saved === "en") setLangState(saved);
    } catch {
      // ignore
    }
  }, []);

  const value = useMemo(
    () => ({
      lang,
      setLang: (l: Lang) => {
        setLangState(l);
        try {
          window.localStorage.setItem(STORAGE_KEY, l);
        } catch {
          // ignore
        }
      },
    }),
    [lang],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useLang(): { lang: Lang; setLang: (l: Lang) => void } {
  return useContext(Ctx);
}

// `useT()` returns a translator function. Pass `{count}` to get auto plural
// (uses `<key>_one` when count === 1). Other vars are simple {name}
// substitutions.
export function useT(): (key: DictKey, vars?: Record<string, string | number>) => string {
  const { lang } = useContext(Ctx);
  return (key, vars) => {
    let resolvedKey: string = key;
    if (vars && Number(vars.count) === 1) {
      const oneKey = `${key}_one`;
      if (oneKey in DICT[lang]) resolvedKey = oneKey;
    }
    let template: string =
      (DICT[lang] as Record<string, string>)[resolvedKey] ??
      (DICT.en as Record<string, string>)[resolvedKey] ??
      key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        template = template.replace(`{${k}}`, String(v));
      }
    }
    return template;
  };
}

// Locale string for `Intl.*` formatters.
export function localeOf(lang: Lang): string {
  return lang === "es" ? "es" : "en";
}
