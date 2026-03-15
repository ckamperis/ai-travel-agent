import { searchPlaces as googleSearch } from "@/lib/google-places";
import { EmailAnalysis, PlaceResult } from "./types";

export async function searchPlaces(analysis: EmailAnalysis): Promise<PlaceResult[]> {
  const city = analysis.destination || "Athens";

  const queries = [
    `best traditional restaurants in ${city}`,
    `historical sites and monuments in ${city}`,
    `best neighborhoods to walk in ${city}`,
  ];

  try {
    const results = await Promise.all(
      queries.map((q) => googleSearch(q, 3))
    );

    const all = results.flat();

    // Deduplicate by name
    const seen = new Set<string>();
    const unique: PlaceResult[] = [];
    for (const place of all) {
      const key = place.name.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        unique.push({
          name: place.name,
          rating: place.rating,
          address: place.address,
          summary: place.summary,
          mapsUrl: place.mapsUrl,
        });
      }
    }

    return unique;
  } catch (error) {
    console.error("Places agent failed:", error);
    return [];
  }
}
