import Anthropic from "@anthropic-ai/sdk";
import { EmailAnalysis } from "./types";

const MOCK_ANALYSIS: EmailAnalysis = {
  origin: "Hamburg",
  originIATA: "HAM",
  destination: "Athens",
  destinationIATA: "ATH",
  dates: { start: "2025-08-04", end: "2025-08-10", duration: 7 },
  travelers: { adults: 2, children: 0, names: ["Klaus Mueller", "Anna Mueller"] },
  budget: { min: 120, max: 150, currency: "EUR" },
  interests: ["history", "local food", "walking", "neighborhoods", "island trip"],
  language: "en",
  specialRequests: [
    "Arrive Monday morning",
    "Hotel close to metro",
    "2-day island excursion",
  ],
};

export async function analyzeEmail(emailText: string): Promise<EmailAnalysis> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.warn("ANTHROPIC_API_KEY not set — returning mock analysis");
    return MOCK_ANALYSIS;
  }

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      system: `You are a travel email analyzer. Extract structured information from customer emails.
Today's date is ${new Date().toISOString().split("T")[0]}.
When the email says "next week", calculate the actual dates from today.
Respond ONLY with valid JSON matching this exact schema:
{
  "origin": "city name",
  "originIATA": "3-letter IATA airport code",
  "destination": "city name",
  "destinationIATA": "3-letter IATA airport code",
  "dates": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "duration": number },
  "travelers": { "adults": number, "children": number, "names": ["string"] },
  "budget": { "min": number, "max": number, "currency": "EUR" },
  "interests": ["string"],
  "language": "detected language code (e.g. en, de)",
  "specialRequests": ["specific request strings"]
}`,
      messages: [{ role: "user", content: emailText }],
    });

    const text = response.content[0].type === "text" ? response.content[0].text : "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Claude did not return valid JSON for email analysis");
    }

    return JSON.parse(jsonMatch[0]) as EmailAnalysis;
  } catch (error) {
    console.error("Email analysis failed:", error);
    return MOCK_ANALYSIS;
  }
}
