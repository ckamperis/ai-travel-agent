import { FlightResult } from "@/agents/types";

const BASE_URL = "https://sky-scrapper.p.rapidapi.com";

function getHeaders(): Record<string, string> {
  const key = process.env.RAPIDAPI_KEY;
  if (!key) throw new Error("RAPIDAPI_KEY not set");
  return {
    "X-RapidAPI-Key": key,
    "X-RapidAPI-Host": "sky-scrapper.p.rapidapi.com",
  };
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
  const res = await fetch(url, { headers: getHeaders() });

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

export async function searchSkyscrapperFlights(
  originIATA: string,
  destinationIATA: string,
  date: string,
  adults: number = 2,
  currency: string = "EUR"
): Promise<FlightResult[]> {
  // Step A: Resolve both airports to get entityIds
  const [originAirport, destAirport] = await Promise.all([
    searchAirport(originIATA),
    searchAirport(destinationIATA),
  ]);

  if (!originAirport || !destAirport) {
    console.error(`[SkyScrapper] Could not resolve airports: origin=${originIATA} (${originAirport ? "ok" : "fail"}), dest=${destinationIATA} (${destAirport ? "ok" : "fail"})`);
    return [];
  }

  console.log(`[SkyScrapper] Resolved: ${originIATA} → skyId=${originAirport.skyId}, entityId=${originAirport.entityId} | ${destinationIATA} → skyId=${destAirport.skyId}, entityId=${destAirport.entityId}`);

  // Step B: Search flights
  const params = new URLSearchParams({
    originSkyId: originAirport.skyId,
    destinationSkyId: destAirport.skyId,
    originEntityId: originAirport.entityId,
    destinationEntityId: destAirport.entityId,
    date,
    adults: String(adults),
    cabinClass: "economy",
    currency,
    sortBy: "best",
  });

  const url = `${BASE_URL}/api/v2/flights/searchFlights?${params}`;
  const res = await fetch(url, { headers: getHeaders() });

  if (!res.ok) {
    console.error(`[SkyScrapper] searchFlights failed ${res.status}: ${await res.text()}`);
    return [];
  }

  const json = await res.json();
  const itineraries = json.data?.itineraries;

  if (!Array.isArray(itineraries) || itineraries.length === 0) {
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
