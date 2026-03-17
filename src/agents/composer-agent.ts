import { composeEmail } from "@/lib/ai";
import { AllAgentResults } from "./types";

export async function* composeResponse(
  results: AllAgentResults,
  originalEmail: string
): AsyncGenerator<string> {
  try {
    // Map agent-level EmailAnalysis to lib-level format
    const libAnalysis = {
      ...results.emailAnalysis,
      requests: results.emailAnalysis.specialRequests,
    };

    const stream = composeEmail(
      {
        emailAnalysis: libAnalysis,
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
