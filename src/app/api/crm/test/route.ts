import { getAdapter } from "@/lib/crm/registry";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { provider, settings } = body;

    if (!provider) {
      return Response.json({ ok: false, message: "No provider specified" });
    }

    const adapter = getAdapter(provider);
    if (!adapter) {
      return Response.json({ ok: false, message: `Unknown provider: ${provider}` });
    }

    const result = await adapter.testConnection({
      name: provider,
      enabled: true,
      settings: settings || {},
    });

    return Response.json(result);
  } catch (err) {
    return Response.json({
      ok: false,
      message: err instanceof Error ? err.message : "Test failed",
    });
  }
}
