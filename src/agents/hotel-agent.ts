import { getHotels } from "@/lib/mock-hotels";
import { EmailAnalysis, HotelResult } from "./types";

export async function searchHotels(analysis: EmailAnalysis): Promise<HotelResult[]> {
  try {
    const budget = analysis.budget.max > 0
      ? { min: analysis.budget.min, max: analysis.budget.max }
      : undefined;

    const hotels = getHotels(budget, analysis.destination);

    return hotels.slice(0, 4).map((h) => ({
      name: h.name,
      area: h.area,
      address: h.address,
      pricePerNight: h.pricePerNight,
      currency: h.currency,
      rating: h.rating,
      stars: h.stars,
      metroStation: h.metroStation,
      metroDistance: h.metroDistance,
      amenities: h.amenities,
      highlights: h.highlights,
      lat: h.lat,
      lng: h.lng,
    }));
  } catch (error) {
    console.error("Hotel agent failed:", error);
    return [];
  }
}
