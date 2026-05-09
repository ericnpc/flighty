// Turn a free-form trip name into a directory- and URL-friendly slug.
export function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip combining accents
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

// Disambiguate against an existing list — `italy-2026`, `italy-2026-2`, …
export function uniqueSlug(base: string, existing: Iterable<string>): string {
  const seed = base || "trip";
  const taken = new Set(existing);
  if (!taken.has(seed)) return seed;
  let i = 2;
  while (taken.has(`${seed}-${i}`)) i++;
  return `${seed}-${i}`;
}

// Validate user-supplied or stored slug — same rules as slugify produces.
export function isValidSlug(s: string): boolean {
  return /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s.length <= 60;
}
