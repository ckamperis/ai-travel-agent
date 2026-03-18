import OpenAI from "openai";
import { EmailAnalysis, HotelResult } from "./types";
import { getFallbackHotels } from "@/lib/hotel-fallback";

export async function searchHotels(analysis: EmailAnalysis): Promise<HotelResult[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OPENAI_API_KEY not set — returning fallback hotels");
    return getFallbackHotels(analysis.destination, analysis.budget);
  }

  try {
    const client = new OpenAI({ apiKey });
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
          content: `You are a hotel expert with deep knowledge of accommodations worldwide. Return ONLY valid JSON.`,
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
    const hotels: HotelResult[] = (parsed.hotels || parsed).slice(0, 5);

    if (!Array.isArray(hotels) || hotels.length === 0) {
      throw new Error("GPT returned no hotels");
    }

    // Ensure all fields exist
    return hotels.map(h => ({
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
  } catch (error) {
    console.error("Hotel agent GPT-4o call failed:", error);
    return getFallbackHotels(analysis.destination, analysis.budget);
  }
}
