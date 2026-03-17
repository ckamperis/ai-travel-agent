import { searchFlights as duffelSearch } from "@/lib/duffel";
import { EmailAnalysis, FlightResult } from "./types";

function getValidDate(dateStr: string): string {
  // Validate YYYY-MM-DD format
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    const d = new Date(dateStr);
    if (!isNaN(d.getTime())) return dateStr;
  }
  // Fallback: tomorrow's date
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const fallback = tomorrow.toISOString().split("T")[0];
  console.warn(`Invalid departure date "${dateStr}" — using ${fallback}`);
  return fallback;
}

export async function searchFlights(analysis: EmailAnalysis): Promise<FlightResult[]> {
  try {
    if (!analysis.originIATA || analysis.originIATA.length !== 3 ||
        !analysis.destinationIATA || analysis.destinationIATA.length !== 3) {
      console.error(`Invalid IATA codes: origin="${analysis.originIATA}", dest="${analysis.destinationIATA}"`);
      return [];
    }

    const departureDate = getValidDate(analysis.dates.start);
    console.log(`[FlightAgent] Searching: ${analysis.originIATA} → ${analysis.destinationIATA} on ${departureDate}`);

    const offers = await duffelSearch(
      analysis.originIATA,
      analysis.destinationIATA,
      departureDate,
      analysis.travelers.adults
    );

    return offers.map((offer) => ({
      airline: offer.airline,
      price: offer.price,
      currency: offer.currency,
      departureTime: offer.departureTime,
      arrivalTime: offer.arrivalTime,
      origin: offer.origin,
      destination: offer.destination,
      stops: offer.stops,
      duration: offer.duration,
    }));
  } catch (error) {
    console.error("Flight agent failed:", error);
    return [];
  }
}
