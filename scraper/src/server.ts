import { createServer } from "node:http";
import { existsSync, readFileSync } from "node:fs";
import { scrapeItinerary, isBookingUrl } from "./google-flights.js";

if (existsSync(".env")) {
  for (const line of readFileSync(".env", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m && process.env[m[1]] === undefined) process.env[m[1]] = m[2];
  }
}

const PORT = Number(process.env.PORT ?? 8787);
const TOKEN = process.env.SCRAPER_TOKEN;

function readBody(req: import("node:http").IncomingMessage): Promise<string> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(Buffer.concat(chunks).toString("utf8")));
    req.on("error", reject);
  });
}

const server = createServer(async (req, res) => {
  res.setHeader("Content-Type", "application/json");

  if (req.method === "GET" && (req.url === "/" || req.url === "/health")) {
    res.end(JSON.stringify({ ok: true, service: "flighty-scraper", usage: "POST /scrape { url }" }));
    return;
  }

  if (req.method !== "POST" || req.url !== "/scrape") {
    res.statusCode = 404;
    res.end(JSON.stringify({ error: "Not found" }));
    return;
  }

  if (TOKEN) {
    const auth = req.headers.authorization ?? "";
    if (auth !== `Bearer ${TOKEN}`) {
      res.statusCode = 401;
      res.end(JSON.stringify({ error: "Unauthorized" }));
      return;
    }
  }

  try {
    const body = await readBody(req);
    const { url } = JSON.parse(body) as { url?: string };
    if (!url || !isBookingUrl(url)) {
      res.statusCode = 400;
      res.end(JSON.stringify({
        error: "Provide a google.com/travel/flights/booking URL with a `tfs` parameter.",
      }));
      return;
    }
    const itinerary = await scrapeItinerary(url);
    res.end(JSON.stringify(itinerary));
  } catch (err) {
    console.error("[scraper] error:", err);
    res.statusCode = 500;
    res.end(JSON.stringify({ error: (err as Error).message }));
  }
});

server.listen(PORT, () => {
  console.log(`[scraper] listening on http://localhost:${PORT}`);
  if (!TOKEN) console.warn("[scraper] WARNING: SCRAPER_TOKEN not set — endpoint is unauthenticated");
});
