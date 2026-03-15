import { searchFlights as duffelSearch } from "@/lib/duffel";
import { EmailAnalysis, FlightResult } from "./types";

export async function searchFlights(analysis: EmailAnalysis): Promise<FlightResult[]> {
  try {
    const offers = await duffelSearch(
      analysis.originIATA,
      analysis.destinationIATA,
      analysis.dates.start,
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
