import OpenAI from "openai";
import { searchSkyscrapperFlights } from "@/lib/skyscrapper-api";
import { EmailAnalysis, FlightResult } from "./types";

export type FlightSource = "live" | "ai" | "mock";

export interface FlightSearchResult {
  flights: FlightResult[];
  source: FlightSource;
}

function getValidDate(dateStr: string): string {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return dateStr;
  }
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const fallback = tomorrow.toISOString().split("T")[0];
  console.warn(`Invalid departure date "${dateStr}" — using ${fallback}`);
  return fallback;
}

export async function searchFlights(analysis: EmailAnalysis): Promise<FlightSearchResult> {
  if (!analysis.originIATA || analysis.originIATA.length !== 3 ||
      !analysis.destinationIATA || analysis.destinationIATA.length !== 3) {
    console.error(`Invalid IATA codes: origin="${analysis.originIATA}", dest="${analysis.destinationIATA}"`);
    return { flights: [], source: "mock" };
  }

  const departureDate = getValidDate(analysis.dates.start);
  const currency = analysis.budget.currency || "EUR";

  // Tier 1: Sky Scrapper API (real data)
  if (process.env.RAPIDAPI_KEY) {
    try {
      const flights = await searchSkyscrapperFlights(
        analysis.originIATA,
        analysis.destinationIATA,
        departureDate,
        analysis.travelers.adults,
        currency
      );
      if (flights.length > 0) {
        console.log(`[FlightAgent] Sky Scrapper: ${analysis.originIATA} → ${analysis.destinationIATA}, found ${flights.length} flights`);
        return { flights, source: "live" };
      }
    } catch (err) {
      console.error("[FlightAgent] Sky Scrapper failed:", err);
    }
  }

  // Tier 2: GPT-4o (AI-generated suggestions)
  if (process.env.OPENAI_API_KEY) {
    try {
      const flights = await searchFlightsViaGpt(analysis, departureDate, currency);
      if (flights.length > 0) {
        console.log(`[FlightAgent] GPT-4o: ${analysis.originIATA} → ${analysis.destinationIATA}, generated ${flights.length} flights`);
        return { flights, source: "ai" };
      }
    } catch (err) {
      console.error("[FlightAgent] GPT-4o failed:", err);
    }
  }

  // Tier 3: Generic mock fallback
  console.warn(`[FlightAgent] All sources failed — using generic fallback for ${analysis.originIATA} → ${analysis.destinationIATA}`);
  return {
    flights: getFallbackFlights(analysis.originIATA, analysis.destinationIATA, departureDate, currency),
    source: "mock",
  };
}

/* ── Tier 2: GPT-4o ──────────────────────────────────────────── */

async function searchFlightsViaGpt(
  analysis: EmailAnalysis,
  departureDate: string,
  currency: string
): Promise<FlightResult[]> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const pax = analysis.travelers.adults + analysis.travelers.children;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a flight search expert with deep knowledge of airline routes and pricing worldwide. Return ONLY valid JSON.",
      },
      {
        role: "user",
        content: `Suggest 5 realistic flights from ${analysis.origin} (${analysis.originIATA}) to ${analysis.destination} (${analysis.destinationIATA}) on ${departureDate} for ${pax} traveler(s).

For each flight return a JSON object with these fields:
- airline: string (real airline name that actually operates this route)
- price: number (approximate price per person in ${currency})
- currency: "${currency}"
- departureTime: string (ISO datetime, e.g. "${departureDate}T08:30:00")
- arrivalTime: string (ISO datetime)
- origin: "${analysis.originIATA}"
- destination: "${analysis.destinationIATA}"
- stops: number (0 for direct, 1-2 for connections)
- duration: string (e.g. "3h 45m")

Use realistic airlines that actually fly this route, realistic prices, and realistic schedules. Return a JSON object with a "flights" array containing exactly 5 flights, sorted by price ascending.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content || "";
  const parsed = JSON.parse(text);
  const flights = parsed.flights || parsed;

  if (!Array.isArray(flights) || flights.length === 0) {
    throw new Error("GPT returned no flights");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return flights.slice(0, 5).map((f: any) => ({
    airline: f.airline || "Unknown Airline",
    price: Number(f.price) || 150,
    currency: f.currency || currency,
    departureTime: f.departureTime || `${departureDate}T08:00:00`,
    arrivalTime: f.arrivalTime || `${departureDate}T12:00:00`,
    origin: f.origin || analysis.originIATA,
    destination: f.destination || analysis.destinationIATA,
    stops: Number(f.stops) ?? 0,
    duration: f.duration || "3h 30m",
  }));
}

/* ── Tier 3: Generic mock fallback ────────────────────────────── */

const FALLBACK_AIRLINES = [
  "Aegean Airlines", "Lufthansa", "Ryanair", "Austrian Airlines",
  "EasyJet", "Air France", "KLM", "Turkish Airlines",
];

function getFallbackFlights(
  origin: string,
  destination: string,
  date: string,
  currency: string
): FlightResult[] {
  const seed = (origin + destination).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const pick = (i: number) => FALLBACK_AIRLINES[(seed + i) % FALLBACK_AIRLINES.length];

  return [
    { airline: pick(0), price: 145 + (seed % 85), currency, departureTime: `${date}T06:15:00`, arrivalTime: `${date}T09:50:00`, origin, destination, stops: 0, duration: "3h 35m" },
    { airline: pick(1), price: 175 + (seed % 100), currency, departureTime: `${date}T11:20:00`, arrivalTime: `${date}T15:00:00`, origin, destination, stops: 0, duration: "3h 40m" },
    { airline: pick(2), price: 210 + (seed % 130), currency, departureTime: `${date}T08:40:00`, arrivalTime: `${date}T14:25:00`, origin, destination, stops: 1, duration: "5h 45m" },
    { airline: pick(3), price: 255 + (seed % 95), currency, departureTime: `${date}T15:50:00`, arrivalTime: `${date}T19:30:00`, origin, destination, stops: 0, duration: "3h 40m" },
  ];
}
