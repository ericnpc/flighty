import { chromium, type BrowserContext } from "playwright";
import { mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createHash } from "node:crypto";
import type { Itinerary, OneWay } from "./types.js";
import { parseTfs, tfsFromUrl } from "./tfs.js";

let ctxPromise: Promise<BrowserContext> | null = null;

async function getContext(): Promise<BrowserContext> {
  if (!ctxPromise) {
    ctxPromise = (async () => {
      const dir = resolve(process.cwd(), ".playwright-data");
      await mkdir(dir, { recursive: true });
      const ctx = await chromium.launchPersistentContext(dir, {
        headless: process.env.HEADED !== "1",
        locale: "en-US",
        userAgent:
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      });
      await ctx.addCookies([
        { name: "CONSENT", value: "YES+", domain: ".google.com", path: "/" },
        { name: "SOCS", value: "CAI", domain: ".google.com", path: "/" },
      ]);
      return ctx;
    })();
  }
  return ctxPromise;
}

export function isBookingUrl(raw: string): boolean {
  try {
    const u = new URL(raw);
    return (
      /^(www\.)?google\.[a-z.]+$/.test(u.host) &&
      u.pathname.startsWith("/travel/flights/booking") &&
      u.searchParams.has("tfs")
    );
  } catch {
    return false;
  }
}

function itineraryId(url: string): string {
  const tfs = new URL(url).searchParams.get("tfs") ?? url;
  return createHash("sha1").update(tfs).digest("hex").slice(0, 16);
}

function detectCurrency(url: string): string {
  return new URL(url).searchParams.get("curr") ?? "USD";
}

// Matches either "$1,234" / "US$1,234" / "€1.234" (symbol-prefix) or "1,234 USD"
// (currency-code-suffix, common in Spanish/European locales).
const PRICE_PREFIX_RE = /(US\$|\$|€|£|₹|¥|USD|EUR|GBP|INR|JPY)\s*([\d.,]+)/g;
const PRICE_SUFFIX_RE = /([\d.,]+)\s*(USD|EUR|GBP|INR|JPY)\b/g;

const SYMBOL_TO_CURRENCY: Record<string, string> = {
  "$": "USD", "US$": "USD", "USD": "USD",
  "€": "EUR", "EUR": "EUR",
  "£": "GBP", "GBP": "GBP",
  "₹": "INR", "INR": "INR",
  "¥": "JPY", "JPY": "JPY",
};

// Parse a number string written in any common locale. Flight prices are
// effectively integers, so we just figure out where the (optional) decimal is.
function parseAmount(s: string): number {
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  const lastSep = Math.max(lastDot, lastComma);
  if (lastSep === -1) return Number(s);
  const after = s.length - lastSep - 1;
  if (after === 3) {
    // 3 digits after a separator → thousands separator, no decimal.
    return Number(s.replace(/[.,]/g, ""));
  }
  // Otherwise treat the rightmost separator as the decimal point.
  const intPart = s.slice(0, lastSep).replace(/[.,]/g, "");
  return Number(`${intPart}.${s.slice(lastSep + 1)}`);
}

function extractPrices(text: string): { symbol: string; amount: number }[] {
  const out: { symbol: string; amount: number }[] = [];
  for (const m of text.matchAll(PRICE_PREFIX_RE)) {
    const amount = parseAmount(m[2]);
    if (Number.isFinite(amount) && amount > 0) out.push({ symbol: m[1], amount });
  }
  for (const m of text.matchAll(PRICE_SUFFIX_RE)) {
    const amount = parseAmount(m[1]);
    if (Number.isFinite(amount) && amount > 0) out.push({ symbol: m[2], amount });
  }
  return out;
}

// Force English locale and the requested currency. The `tfs` (itinerary)
// is unchanged; only display locale + currency shifts.
function normalizeUrl(url: string, currency: string): string {
  const u = new URL(url);
  u.searchParams.set("hl", "en");
  u.searchParams.set("gl", "US");
  u.searchParams.set("curr", currency);
  return u.toString();
}

async function collectPageText(page: import("playwright").Page): Promise<string> {
  // Pull text from the main document plus any same-origin iframes — booking
  // pages sometimes embed the airline's price in a frame.
  const main = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
  const frames = await Promise.all(
    page.frames().map(async (f) => {
      if (f === page.mainFrame()) return "";
      try {
        return await f.evaluate(() => document.body?.innerText ?? "");
      } catch {
        return ""; // cross-origin frame, skip
      }
    }),
  );
  return [main, ...frames].join("\n");
}

// Booking pages render each direction as `<depart> – <arrive>(+N)?` — overall
// times for the whole journey, not per leg. The "+1" appears flush against
// the arrival time when the flight lands the next day. Per-leg times require
// expanding details and aren't available without a click; we don't bother.
const DIRECTION_TIMES_RE =
  /(\d{1,2}:\d{2}\s*(?:AM|PM))\s*[–\-—]\s*(\d{1,2}:\d{2}\s*(?:AM|PM))(?:\s*\+(\d+))?/gi;

function extractDirectionTimes(pageText: string): { depart: string; arrive: string; arriveDayOffset: number }[] {
  return [...pageText.matchAll(DIRECTION_TIMES_RE)].map((m) => ({
    depart: m[1].toUpperCase().replace(/\s+/g, " "),
    arrive: m[2].toUpperCase().replace(/\s+/g, " "),
    arriveDayOffset: m[3] ? Number(m[3]) : 0,
  }));
}

type PageScrape = {
  priceMatches: { symbol: string; amount: number }[];
  text: string;
  pageError?: string;
};

async function loadAndExtract(url: string, currency: string): Promise<PageScrape> {
  const ctx = await getContext();
  const page = await ctx.newPage();
  try {
    await page.goto(normalizeUrl(url, currency), { waitUntil: "domcontentloaded", timeout: 45_000 });

    if (page.url().includes("consent.google.com")) {
      const button = page.locator(
        'button:has-text("Accept all"), button:has-text("I agree"), form[action*="save"] button[type="submit"]',
      ).first();
      if (await button.isVisible({ timeout: 5000 }).catch(() => false)) {
        await Promise.all([
          page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 30_000 }).catch(() => {}),
          button.click(),
        ]);
      }
    }

    await page.waitForLoadState("networkidle", { timeout: 15_000 }).catch(() => {});

    // Poll for price text. "Loading results" can linger in the DOM as an
    // accessibility announcement even after the price has rendered, so we
    // always run the extractor and rely on regex matches as the signal.
    const deadline = Date.now() + 25_000;
    let text = "";
    let priceMatches: { symbol: string; amount: number }[] = [];
    while (Date.now() < deadline) {
      text = await collectPageText(page);
      priceMatches = extractPrices(text);
      if (priceMatches.length > 0) break;
      await page.waitForTimeout(500);
    }

    if (priceMatches.length === 0) {
      const title = await page.title().catch(() => "");
      const snippet = text.replace(/\s+/g, " ").slice(0, 200);
      return {
        priceMatches: [],
        text,
        pageError: `No price text on page. Title: "${title}". Body starts: "${snippet}…"`,
      };
    }

    return { priceMatches, text };
  } catch (err) {
    return { priceMatches: [], text: "", pageError: (err as Error).message };
  } finally {
    await page.close();
  }
}

function withTimes(direction: OneWay, t?: { depart: string; arrive: string; arriveDayOffset: number }): OneWay {
  if (!t) return direction;
  return { ...direction, departTime: t.depart, arriveTime: t.arrive, arriveDayOffset: t.arriveDayOffset };
}

export async function scrapeItinerary(
  url: string,
  currency?: string,
): Promise<Itinerary & { _debugSample?: string }> {
  const parsed = parseTfs(tfsFromUrl(url));
  // Caller-supplied currency wins over whatever's in the URL — the trip
  // controls the price currency, not the link the user happened to copy.
  const targetCurrency = currency ?? detectCurrency(url);
  const { priceMatches, text, pageError } = await loadAndExtract(url, targetCurrency);

  // Booking pages lead with the main fare; later prices are alternatives.
  const main = priceMatches[0];

  // Two direction-level matches expected: outbound first, return second.
  const directionTimes = extractDirectionTimes(text);

  return {
    id: itineraryId(url),
    url,
    outbound: withTimes(parsed.outbound, directionTimes[0]),
    return: parsed.return ? withTimes(parsed.return, directionTimes[1]) : undefined,
    price: main?.amount,
    currency: main ? (SYMBOL_TO_CURRENCY[main.symbol] ?? targetCurrency) : undefined,
    priceError: pageError,
    scrapedAt: new Date().toISOString(),
    _debugSample: process.env.DEBUG_PAGE_TEXT ? text.replace(/\s+/g, " ").slice(0, 4000) : undefined,
  };
}
