import { composeResponse } from "@/agents/composer-agent";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));

  if (!body.email || !body.emailAnalysis) {
    return new Response(
      JSON.stringify({ error: "email and emailAnalysis fields are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const allResults = {
          emailAnalysis: body.emailAnalysis,
          flights: body.flights || [],
          hotels: body.hotels || [],
          research: body.research || "",
          places: body.places || [],
        };

        const composerSettings = body.settings
          ? {
              ...body.settings,
              includedPlaces: body.includedPlaces,
            }
          : body.includedPlaces
            ? { includedPlaces: body.includedPlaces }
            : undefined;

        const gen = composeResponse(
          allResults,
          body.email,
          body.selectedFlight ?? undefined,
          body.selectedHotel ?? undefined,
          composerSettings,
          body.perLegData ?? body.perLegSelections ?? undefined
        );

        for await (const chunk of gen) {
          const data = JSON.stringify({ chunk });
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "unknown";
        const data = JSON.stringify({ error: msg });
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
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
