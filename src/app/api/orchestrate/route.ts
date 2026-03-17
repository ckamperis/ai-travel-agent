import { orchestrate } from "@/agents/orchestrator";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const emailText = body.email;
  const mode = body.mode || 'full';
  const analysis = body.analysis;

  if (!emailText || typeof emailText !== "string") {
    return new Response(
      JSON.stringify({ error: "email field is required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of orchestrate(emailText, mode, analysis)) {
          const data = JSON.stringify(event);
          controller.enqueue(encoder.encode(`data: ${data}\n\n`));
        }
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
      } catch (err) {
        const errorEvent = JSON.stringify({
          agent: "email",
          status: "error",
          message: `Orchestration error: ${err instanceof Error ? err.message : "unknown"}`,
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
