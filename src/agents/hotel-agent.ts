import { getHotels } from "@/lib/mock-hotels";
import { EmailAnalysis, HotelResult } from "./types";

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function searchHotels(analysis: EmailAnalysis): Promise<HotelResult[]> {
  try {
    // Artificial delay for demo realism (hotels "searching")
    await delay(1200 + Math.random() * 800);

    const budget = analysis.budget.max > 0
      ? { min: analysis.budget.min, max: analysis.budget.max }
      : undefined;

    const hotels = getHotels(budget);

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
    }));
  } catch (error) {
    console.error("Hotel agent failed:", error);
    return [];
  }
}
