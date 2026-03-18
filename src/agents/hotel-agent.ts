import OpenAI from "openai";
import { EmailAnalysis, HotelResult } from "./types";
import { searchDestination, searchBookingHotels } from "@/lib/booking-api";
import { getFallbackHotels } from "@/lib/hotel-fallback";

export type HotelSource = "live" | "ai" | "mock";

export interface HotelSearchResult {
  hotels: HotelResult[];
  source: HotelSource;
}

export async function searchHotels(analysis: EmailAnalysis): Promise<HotelSearchResult> {
  // Tier 1: Booking.com API (real data)
  if (process.env.RAPIDAPI_KEY) {
    try {
      const result = await searchHotelsViaBooking(analysis);
      if (result.length > 0) {
        console.log(`[HotelAgent] Booking.com: ${result.length} hotels for ${analysis.destination}`);
        return { hotels: result, source: "live" };
      }
    } catch (err) {
      console.error("[HotelAgent] Booking.com failed:", err);
    }
  }

  // Tier 2: GPT-4o (AI-generated suggestions)
  if (process.env.OPENAI_API_KEY) {
    try {
      const result = await searchHotelsViaGpt(analysis);
      if (result.length > 0) {
        console.log(`[HotelAgent] GPT-4o: ${result.length} hotels for ${analysis.destination}`);
        return { hotels: result, source: "ai" };
      }
    } catch (err) {
      console.error("[HotelAgent] GPT-4o failed:", err);
    }
  }

  // Tier 3: Generic fallback
  console.warn(`[HotelAgent] All sources failed — using generic fallback for ${analysis.destination}`);
  return {
    hotels: getFallbackHotels(analysis.destination, analysis.budget),
    source: "mock",
  };
}

/* ── Tier 1: Booking.com API ──────────────────────────────────── */

async function searchHotelsViaBooking(analysis: EmailAnalysis): Promise<HotelResult[]> {
  const dest = await searchDestination(analysis.destination);
  if (!dest) {
    console.warn(`[HotelAgent] Booking.com: could not resolve destination "${analysis.destination}"`);
    return [];
  }

  console.log(`[HotelAgent] Booking.com: resolved "${analysis.destination}" → dest_id=${dest.dest_id} (${dest.search_type})`);

  return searchBookingHotels({
    destId: dest.dest_id,
    searchType: dest.search_type,
    checkIn: analysis.dates.start,
    checkOut: analysis.dates.end,
    adults: analysis.travelers.adults,
    currency: analysis.budget.currency || "EUR",
  });
}

/* ── Tier 2: GPT-4o ──────────────────────────────────────────── */

async function searchHotelsViaGpt(analysis: EmailAnalysis): Promise<HotelResult[]> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const budgetStr = analysis.budget.max > 0
    ? `${analysis.budget.min}-${analysis.budget.max} EUR per night`
    : "mid-range";
  const travelers = analysis.travelers.adults + analysis.travelers.children;

  const response = await client.chat.completions.create({
    model: "gpt-4o",
    max_tokens: 2048,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: "You are a hotel expert with deep knowledge of accommodations worldwide. Return ONLY valid JSON.",
      },
      {
        role: "user",
        content: `Suggest 5 real hotels in ${analysis.destination} for ${travelers} travelers with a budget of ${budgetStr}.

For each hotel return a JSON object with these fields:
- name: string (real hotel name that actually exists)
- area: string (neighborhood/area)
- address: string (real street address)
- pricePerNight: number (approximate price in EUR)
- currency: "EUR"
- rating: number (out of 10, e.g. 8.5)
- stars: number (1-5)
- metroStation: string (nearest metro/bus/tram station)
- metroDistance: string (e.g. "3 min walk")
- amenities: string[] (e.g. ["WiFi", "Breakfast", "Pool"])
- highlights: string (one-line description of what makes it special)
- lat: number (approximate latitude)
- lng: number (approximate longitude)

Use REAL hotels that actually exist in ${analysis.destination}. Return a JSON object with a "hotels" array containing exactly 5 hotels, sorted by price ascending.`,
      },
    ],
  });

  const text = response.choices[0]?.message?.content || "";
  const parsed = JSON.parse(text);
  const hotels = (parsed.hotels || parsed);

  if (!Array.isArray(hotels) || hotels.length === 0) {
    throw new Error("GPT returned no hotels");
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return hotels.slice(0, 5).map((h: any) => ({
    name: h.name || "Unknown Hotel",
    area: h.area || "",
    address: h.address || "",
    pricePerNight: Number(h.pricePerNight) || 120,
    currency: h.currency || "EUR",
    rating: Number(h.rating) || 8.0,
    stars: Number(h.stars) || 3,
    metroStation: h.metroStation || "-",
    metroDistance: h.metroDistance || "-",
    amenities: Array.isArray(h.amenities) ? h.amenities : ["WiFi"],
    highlights: h.highlights || "",
    lat: h.lat != null ? Number(h.lat) : undefined,
    lng: h.lng != null ? Number(h.lng) : undefined,
  }));
}
