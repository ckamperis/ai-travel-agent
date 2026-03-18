import { FlightResult } from "@/agents/types";

const BASE_URL = "https://sky-scrapper.p.rapidapi.com";
const RATE_LIMIT_MS = 1500;

function getHeaders(): Record<string, string> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error("RAPIDAPI_KEY not set");
  return {
    "X-RapidAPI-Key": key,
    "X-RapidAPI-Host": "sky-scrapper.p.rapidapi.com",
  };
}

/* ── Rate limiter: max 1 API call per 1.5s ─────────────────────── */

let rateLimitQueue: Promise<void> = Promise.resolve();
let lastCallTime = 0;

async function rateLimitedFetch(url: string): Promise<Response> {
  // Chain onto previous call — ensures sequential execution with delay
  const execute = async (): Promise<Response> => {
    const now = Date.now();
    const waitMs = Math.max(0, RATE_LIMIT_MS - (now - lastCallTime));
    if (waitMs > 0) await new Promise(r => setTimeout(r, waitMs));
    lastCallTime = Date.now();
    return fetch(url, { headers: getHeaders() });
  };

  // Queue this call after any pending ones
  const resultPromise = rateLimitQueue.then(execute, execute);
  // Update queue (swallow errors so next call still runs)
  rateLimitQueue = resultPromise.then(() => {}, () => {});
  return resultPromise;
}

/* ── 429/403 retry logic ────────────────────────────────────────── */

let subscriptionWarned = false;

async function fetchWithRetry(url: string): Promise<Response | null> {
  const res = await rateLimitedFetch(url);

  // 403 = not subscribed
  if (res.status === 403) {
    if (!subscriptionWarned) {
      subscriptionWarned = true;
      console.warn("[SkyScrapper] RapidAPI key not subscribed to Sky Scrapper API — using GPT-4o for flights");
    }
    return null;
  }

  // 429 = rate limited — wait 2s and retry once
  if (res.status === 429) {
    console.warn("[SkyScrapper] Rate limited, retrying in 2s...");
    await new Promise(r => setTimeout(r, 2000));
    lastCallTime = Date.now(); // reset rate limiter after wait
    const retry = await fetch(url, { headers: getHeaders() });
    if (retry.status === 429 || retry.status === 403) {
      console.warn("[SkyScrapper] Rate limited, falling back to GPT-4o");
      return null;
    }
    return retry;
  }

  return res;
}

/* ── Airport lookup with cache ─────────────────────────────────── */

interface AirportInfo {
  skyId: string;
  entityId: string;
  name: string;
}

const airportCache = new Map<string, AirportInfo>();

export async function searchAirport(query: string): Promise<AirportInfo | null> {
  const cacheKey = query.toUpperCase().trim();
  if (airportCache.has(cacheKey)) return airportCache.get(cacheKey)!;

  const url = `${BASE_URL}/api/v1/flights/searchAirport?query=${encodeURIComponent(query)}&locale=en-US`;
  const res = await fetchWithRetry(url);

  if (!res) return null; // 403/429 — trigger fallback
  if (!res.ok) {
    console.error(`[SkyScrapper] searchAirport failed ${res.status}: ${await res.text()}`);
    return null;
  }

  const json = await res.json();
  const results = json.data;

  if (!Array.isArray(results) || results.length === 0) {
    console.warn(`[SkyScrapper] No airport found for "${query}"`);
    return null;
  }

  // Extract from navigation.relevantFlightParams
  const best = results[0];
  const params = best.navigation?.relevantFlightParams;
  if (!params?.skyId || !params?.entityId) {
    console.warn(`[SkyScrapper] Airport result missing skyId/entityId for "${query}"`);
    return null;
  }

  const info: AirportInfo = {
    skyId: params.skyId,
    entityId: params.entityId,
    name: params.localizedName || best.presentation?.title || query,
  };

  airportCache.set(cacheKey, info);
  // Also cache by skyId for IATA code lookups
  if (info.skyId !== cacheKey) {
    airportCache.set(info.skyId.toUpperCase(), info);
  }

  return info;
}

/* ── Flight search ──────────────────────────────────────────────── */

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${String(mins).padStart(2, "0")}m`;
}

/**
 * If the date is more than 3 months away, adjust to ~2 months from now
 * (Sky Scrapper often has no data for far-future dates).
 */
function getSearchDate(date: string): string {
  const target = new Date(date);
  const now = new Date();
  const threeMonths = new Date(now);
  threeMonths.setMonth(threeMonths.getMonth() + 3);

  if (target > threeMonths) {
    const adjusted = new Date(now);
    adjusted.setMonth(adjusted.getMonth() + 2);
    const adj = adjusted.toISOString().split("T")[0];
    console.log(`[SkyScrapper] Date ${date} is >3 months away, searching with ${adj} instead`);
    return adj;
  }
  return date;
}

function getNearTermDate(): string {
  const d = new Date();
  d.setDate(d.getDate() + 10);
  return d.toISOString().split("T")[0];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function doFlightSearch(
  origin: AirportInfo, dest: AirportInfo,
  date: string, adults: number, currency: string,
  originIATA: string, destIATA: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any[]> {
  const params = new URLSearchParams({
    originSkyId: origin.skyId,
    destinationSkyId: dest.skyId,
    originEntityId: origin.entityId,
    destinationEntityId: dest.entityId,
    date,
    adults: String(adults),
    cabinClass: "economy",
    currency,
    sortBy: "best",
  });

  const url = `${BASE_URL}/api/v2/flights/searchFlights?${params}`;
  const res = await fetchWithRetry(url);

  if (!res) return [];
  if (!res.ok) {
    console.error(`[SkyScrapper] searchFlights failed ${res.status}: ${await res.text()}`);
    return [];
  }

  const json = await res.json();
  return json.data?.itineraries || [];
}

export async function searchSkyscrapperFlights(
  originIATA: string,
  destinationIATA: string,
  date: string,
  adults: number = 2,
  currency: string = "EUR"
): Promise<FlightResult[]> {
  // Step A: Resolve airports sequentially (rate limit friendly, cache helps)
  const originAirport = await searchAirport(originIATA);
  if (!originAirport) {
    console.error(`[SkyScrapper] Could not resolve origin airport: ${originIATA}`);
    return [];
  }

  const destAirport = await searchAirport(destinationIATA);
  if (!destAirport) {
    console.error(`[SkyScrapper] Could not resolve destination airport: ${destinationIATA}`);
    return [];
  }

  console.log(`[SkyScrapper] Resolved: ${originIATA} → skyId=${originAirport.skyId}, entityId=${originAirport.entityId} | ${destinationIATA} → skyId=${destAirport.skyId}, entityId=${destAirport.entityId}`);

  // Step B: Search flights (with date fallback for far-future dates)
  const searchDate = getSearchDate(date);

  let itineraries = await doFlightSearch(
    originAirport, destAirport, searchDate, adults, currency, originIATA, destinationIATA
  );

  // If no results and we used the original date, try a near-term date as demo fallback
  if (itineraries.length === 0 && searchDate === date) {
    const nearDate = getNearTermDate();
    console.warn(`[SkyScrapper] No results for ${date}, trying near-term date ${nearDate}...`);
    itineraries = await doFlightSearch(
      originAirport, destAirport, nearDate, adults, currency, originIATA, destinationIATA
    );
  }

  if (itineraries.length === 0) {
    console.warn(`[SkyScrapper] No itineraries returned for ${originIATA} → ${destinationIATA}`);
    return [];
  }

  // Parse itineraries into FlightResult[]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const flights: FlightResult[] = itineraries.map((it: any): FlightResult | null => {
    const legs = it.legs;
    if (!Array.isArray(legs) || legs.length === 0) return null;

    // Use the first leg for a one-way flight
    const firstLeg = legs[0];
    const carriers = firstLeg.carriers?.marketing || [];
    const airlineName = carriers.map((c: { name: string }) => c.name).join(", ") || "Unknown";

    return {
      airline: airlineName,
      price: it.price?.raw ?? 0,
      currency,
      departureTime: firstLeg.departure || "",
      arrivalTime: firstLeg.arrival || "",
      origin: firstLeg.origin?.displayCode || originIATA,
      destination: firstLeg.destination?.displayCode || destinationIATA,
      stops: firstLeg.stopCount ?? 0,
      duration: firstLeg.durationInMinutes
        ? formatDuration(firstLeg.durationInMinutes)
        : "N/A",
    };
  }).filter((f: FlightResult | null): f is FlightResult => f !== null);

  // Sort by price and return top 5
  flights.sort((a, b) => a.price - b.price);
  return flights.slice(0, 5);
}
