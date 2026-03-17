import { translateText } from "@/lib/ai";

export async function POST(request: Request) {
  const body = await request.json().catch(() => ({}));
  const { text, targetLanguage } = body;
  if (!text || !targetLanguage) {
    return new Response(JSON.stringify({ error: "text and targetLanguage required" }), { status: 400, headers: { "Content-Type": "application/json" } });
  }
  try {
    const translated = await translateText(text, targetLanguage);
    return new Response(JSON.stringify({ translated }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : "unknown" }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
}
