/**
 * POST /api/revise — Trip revision endpoint.
 *
 * Loads existing trip + latest version, runs only affected agents
 * based on the revision analysis, creates a new trip_version,
 * and streams the updated proposal email.
 */

import { getTrip, getLatestTripVersion, createTripVersion, getMessages } from "@/lib/db";
import { analyzeRevision, mergeAgentResults, type AgentName } from "@/lib/revision-detector";
import { classifyIntent, type ChangeRequest } from "@/lib/intent-classifier";
import { searchFlights, type FlightSearchResult } from "@/agents/flight-agent";
import { searchHotels, type HotelSearchResult } from "@/agents/hotel-agent";
import { researchDestination } from "@/agents/research-agent";
import { searchPlaces } from "@/agents/places-agent";
import { composeResponse } from "@/agents/composer-agent";
import type { EmailAnalysis, AgentEvent, FlightResult, HotelResult, PlaceResult } from "@/agents/types";

interface ReviseRequestBody {
  tripId: string;
  /** The new customer message requesting changes */
  customerMessage: string;
  /** Original email text (for composer context) */
  originalEmail: string;
  /** Pre-classified changes (optional — will classify if not provided) */
  changes?: ChangeRequest[];
  /** Composer settings (language, tone, etc.) */
  settings?: Record<string, unknown>;
}

export async function POST(request: Request) {
  const body: ReviseRequestBody = await request.json().catch(() => ({} as ReviseRequestBody));

  if (!body.tripId || !body.customerMessage) {
    return new Response(
      JSON.stringify({ error: "tripId and customerMessage are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  // Load existing trip and latest version
  const trip = await getTrip(body.tripId);
  if (!trip) {
    return new Response(
      JSON.stringify({ error: "Trip not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  const latestVersion = await getLatestTripVersion(body.tripId);
  if (!latestVersion) {
    return new Response(
      JSON.stringify({ error: "No trip version found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // If changes not provided, classify intent to extract them
  let changes = body.changes;
  if (!changes) {
    // Get previous messages for context
    let previousMessages: { direction: string; body_text: string }[] = [];
    if (trip.conversation_id) {
      const messages = await getMessages(trip.conversation_id);
      if (messages) {
        previousMessages = messages.slice(-3).reverse().map((m) => ({
          direction: m.direction,
          body_text: m.body_text,
        }));
      }
    }

    const intent = await classifyIntent(body.customerMessage, previousMessages);
    changes = intent.changes || [];
  }

  // Analyze which agents need to be re-run
  const revision = analyzeRevision(changes, latestVersion);

  // Reconstruct EmailAnalysis from trip data
  const emailAnalysis: EmailAnalysis = {
    origin: (trip.travelers as Record<string, unknown>)?.origin as string || "",
    originIATA: (trip.travelers as Record<string, unknown>)?.originIATA as string || "",
    destination: trip.destinations[0] || "",
    destinationIATA: (trip.travelers as Record<string, unknown>)?.destinationIATA as string || "",
    dates: trip.dates as EmailAnalysis["dates"],
    travelers: trip.travelers as EmailAnalysis["travelers"],
    budget: trip.budget as EmailAnalysis["budget"],
    interests: (trip.special_requests || []).slice(0, 5),
    language: "en",
    specialRequests: trip.special_requests || [],
  };

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: AgentEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        // Emit revision analysis event
        emit({
          agent: "email",
          status: "done",
          message: `Revision detected: ${revision.changeSummary}`,
          data: {
            agentsToRerun: revision.agentsToRerun,
            unchanged: revision.unchanged,
            changeSummary: revision.changeSummary,
            changes,
          },
          timestamp: Date.now(),
        });

        // Previous agent results from latest version
        const prevResults = latestVersion.agent_results || {};
        const newResults: Record<string, unknown> = {};

        // Run only affected agents
        const agentPromises: Promise<void>[] = [];

        if (revision.agentsToRerun.includes("flight")) {
          emit({ agent: "flight", status: "started", message: "Re-searching flights...", timestamp: Date.now() });
          agentPromises.push(
            (async () => {
              try {
                const result: FlightSearchResult = await searchFlights(emailAnalysis);
                newResults.flights = result.flights;
                emit({ agent: "flight", status: "done", message: "Updated flights found", data: result.flights, source: result.source, timestamp: Date.now() });
              } catch {
                emit({ agent: "flight", status: "error", message: "Flight search failed", timestamp: Date.now() });
              }
            })()
          );
        } else {
          emit({ agent: "flight", status: "done", message: "Keeping previous flights (unchanged)", data: prevResults.flights, timestamp: Date.now() });
        }

        if (revision.agentsToRerun.includes("hotel")) {
          emit({ agent: "hotel", status: "started", message: "Re-searching hotels...", timestamp: Date.now() });
          agentPromises.push(
            (async () => {
              try {
                const result: HotelSearchResult = await searchHotels(emailAnalysis);
                newResults.hotels = result.hotels;
                emit({ agent: "hotel", status: "done", message: "Updated hotels found", data: result.hotels, source: result.source, timestamp: Date.now() });
              } catch {
                emit({ agent: "hotel", status: "error", message: "Hotel search failed", timestamp: Date.now() });
              }
            })()
          );
        } else {
          emit({ agent: "hotel", status: "done", message: "Keeping previous hotels (unchanged)", data: prevResults.hotels, timestamp: Date.now() });
        }

        if (revision.agentsToRerun.includes("research")) {
          emit({ agent: "research", status: "started", message: "Re-researching itinerary...", timestamp: Date.now() });
          agentPromises.push(
            (async () => {
              try {
                const data = await researchDestination(emailAnalysis);
                newResults.research = data;
                emit({ agent: "research", status: "done", message: "Updated research complete", data, timestamp: Date.now() });
              } catch {
                emit({ agent: "research", status: "error", message: "Research failed", timestamp: Date.now() });
              }
            })()
          );
        } else {
          emit({ agent: "research", status: "done", message: "Keeping previous research (unchanged)", data: prevResults.research, timestamp: Date.now() });
        }

        if (revision.agentsToRerun.includes("places")) {
          emit({ agent: "places", status: "started", message: "Re-searching places...", timestamp: Date.now() });
          agentPromises.push(
            (async () => {
              try {
                const data = await searchPlaces(emailAnalysis);
                newResults.places = data;
                emit({ agent: "places", status: "done", message: "Updated places found", data, timestamp: Date.now() });
              } catch {
                emit({ agent: "places", status: "error", message: "Places search failed", timestamp: Date.now() });
              }
            })()
          );
        } else {
          emit({ agent: "places", status: "done", message: "Keeping previous places (unchanged)", data: prevResults.places, timestamp: Date.now() });
        }

        // Wait for all re-run agents to complete
        await Promise.all(agentPromises);

        // Merge results: keep unchanged from previous, use new for re-run
        const merged = mergeAgentResults(prevResults, newResults, revision.agentsToRerun);

        // Compose the updated proposal email
        emit({ agent: "composer", status: "started", message: "Composing updated proposal...", timestamp: Date.now() });

        const flights = (merged.flights || []) as FlightResult[];
        const hotels = (merged.hotels || []) as HotelResult[];
        const research = (merged.research || "") as string;
        const places = (merged.places || []) as PlaceResult[];

        const composerResults = {
          emailAnalysis,
          flights,
          hotels,
          research,
          places,
        };

        // Build context about the revision for the composer
        const revisionContext = `\n\n[REVISION NOTE: The customer requested changes: ${revision.changeSummary}. This is an UPDATED proposal (version ${latestVersion.version_number + 1}). Acknowledge the changes in your response.]`;

        let composedEmail = "";
        const gen = composeResponse(
          composerResults,
          body.originalEmail + revisionContext,
          undefined, // selectedFlight — user will select after seeing results
          undefined, // selectedHotel
          body.settings as Record<string, string> | undefined,
        );

        for await (const chunk of gen) {
          composedEmail += chunk;
          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify({ chunk })}\n\n`)
          );
        }

        emit({ agent: "composer", status: "done", message: "Updated proposal ready", timestamp: Date.now() });

        // Save new trip version
        const newVersion = await createTripVersion({
          trip_id: body.tripId,
          version_number: latestVersion.version_number + 1,
          selected_flights: flights,
          selected_hotels: hotels,
          itinerary_text: research,
          included_places: places,
          composed_email: composedEmail,
          change_summary: revision.changeSummary,
          agent_results: merged,
        });

        if (newVersion) {
          emit({
            agent: "email",
            status: "done",
            message: `Version ${newVersion.version_number} saved`,
            data: { versionId: newVersion.id, versionNumber: newVersion.version_number },
            timestamp: Date.now(),
          });
        }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      } catch (err) {
        const errorEvent = JSON.stringify({
          agent: "email",
          status: "error",
          message: `Revision error: ${err instanceof Error ? err.message : "unknown"}`,
          timestamp: Date.now(),
        });
        controller.enqueue(encoder.encode(`data: ${errorEvent}\n\n`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
