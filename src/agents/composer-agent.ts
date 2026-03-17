import { composeEmail } from "@/lib/ai";
import { AllAgentResults, FlightResult, HotelResult } from "./types";

export async function* composeResponse(
  results: AllAgentResults,
  originalEmail: string,
  selectedFlight?: FlightResult,
  selectedHotel?: HotelResult,
): AsyncGenerator<string> {
  try {
    const libAnalysis = {
      ...results.emailAnalysis,
      requests: results.emailAnalysis.specialRequests,
    };

    const stream = composeEmail(
      {
        emailAnalysis: libAnalysis,
        selectedFlight,
        selectedHotel,
        flights: results.flights,
        hotels: results.hotels,
        research: results.research,
        places: results.places,
      },
      originalEmail
    );

    for await (const chunk of stream) {
      yield chunk;
    }
  } catch (error) {
    console.error("Composer agent failed:", error);
    yield "We apologize, but we encountered an issue composing your travel plan. Our team will follow up shortly with a complete proposal.\n\nBest regards,\nAfea Travel";
  }
}
