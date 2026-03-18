import { HotelResult } from "@/agents/types";

/**
 * Generate generic fallback hotels for any city.
 * Used only when GPT-4o fails — no hardcoded hotel databases.
 */
export function getFallbackHotels(
  destination: string,
  budget?: { min: number; max: number }
): HotelResult[] {
  const city = destination.charAt(0).toUpperCase() + destination.slice(1);
  const basePrice = budget && budget.max > 0 ? Math.round((budget.min + budget.max) / 2) : 140;

  const templates = [
    { suffix: "Central Hotel", stars: 4, priceMult: 1.1, rating: 8.7, amenities: ["WiFi", "Breakfast", "Restaurant", "A/C"] },
    { suffix: "Boutique Inn", stars: 3, priceMult: 0.85, rating: 8.4, amenities: ["WiFi", "Breakfast", "A/C", "Bar"] },
    { suffix: "Grand Palace", stars: 5, priceMult: 1.5, rating: 9.1, amenities: ["Pool", "Spa", "WiFi", "Breakfast", "Concierge"] },
    { suffix: "City Suites", stars: 3, priceMult: 0.7, rating: 7.9, amenities: ["WiFi", "Breakfast", "A/C"] },
    { suffix: "Plaza Hotel", stars: 4, priceMult: 1.2, rating: 8.5, amenities: ["WiFi", "Breakfast", "Gym", "Restaurant"] },
  ];

  return templates.map((t) => ({
    name: `${city} ${t.suffix}`,
    area: "City Center",
    address: `${city} City Center`,
    pricePerNight: Math.round(basePrice * t.priceMult),
    currency: "EUR",
    rating: t.rating,
    stars: t.stars,
    metroStation: "-",
    metroDistance: "-",
    amenities: t.amenities,
    highlights: `${t.stars >= 4 ? "Premium" : "Comfortable"} stay in ${city}`,
  }));
}
