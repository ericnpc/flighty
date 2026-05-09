// Currency formatting. Trip-level currency is currently USD or EUR, but we
// also see other codes coming back from Google Flights itineraries (GBP,
// JPY, etc.) so the formatter accepts any string.

const SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  JPY: "¥",
  INR: "₹",
};

export function symbolFor(currency?: string): string {
  if (!currency) return "$";
  return SYMBOLS[currency] ?? "";
}

export function formatMoney(amount: number, currency?: string): string {
  const c = currency ?? "USD";
  const s = SYMBOLS[c];
  const n = amount.toLocaleString(undefined, { maximumFractionDigits: 2 });
  return s ? `${s}${n}` : `${c} ${n}`;
}
