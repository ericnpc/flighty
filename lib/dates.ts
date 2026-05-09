// Helpers for the simple ISO date strings (YYYY-MM-DD) we use everywhere.
// Note: ISO dates compare correctly with `<` because of fixed-width fields.

export function nightsBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const a = parseLocalDate(start).getTime();
  const b = parseLocalDate(end).getTime();
  return Math.max(0, Math.round((b - a) / 86_400_000));
}

export function isInvalidRange(start: string, end: string): boolean {
  return !!start && !!end && end < start;
}

// Parse YYYY-MM-DD as a local-calendar date, not UTC midnight.
function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function formatLocalDate(iso: string, locale?: string): string {
  if (!iso) return "";
  return parseLocalDate(iso).toLocaleDateString(locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

// Both args are HH:MM strings (12h with AM/PM or 24h). Returns true if the
// arrival is "earlier" than the departure, meaning the flight crossed
// midnight — used to render a "+1" indicator on overnight legs.
export function isOvernight(depart: string, arrive: string): boolean {
  if (!depart || !arrive) return false;
  return timeToMinutes(arrive) < timeToMinutes(depart);
}

function timeToMinutes(t: string): number {
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return 0;
  let h = Number(m[1]);
  const min = Number(m[2]);
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && h !== 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return h * 60 + min;
}
