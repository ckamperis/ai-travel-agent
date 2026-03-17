import OpenAI from "openai";

const MODEL = "gpt-4o";

function getClient(): OpenAI {
  return new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

export interface EmailAnalysis {
  origin: string;
  destination: string;
  dates: { start: string; end: string; duration: number };
  travelers: { adults: number; children: number; names: string[] };
  budget: { min: number; max: number; currency: string };
  interests: string[];
  language: string;
  requests: string[];
}

export async function analyzeEmail(emailText: string): Promise<EmailAnalysis> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1024,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You are a travel email analyzer. Extract structured information from customer emails.
Today's date is ${new Date().toISOString().split("T")[0]}.
When the email says "next week", calculate the actual dates from today.
Respond ONLY with valid JSON matching this schema:
{
  "origin": "IATA code or city",
  "destination": "IATA code or city",
  "dates": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "duration": number },
  "travelers": { "adults": number, "children": number, "names": ["string"] },
  "budget": { "min": number, "max": number, "currency": "EUR" },
  "interests": ["string"],
  "language": "detected language code",
  "requests": ["specific request strings"]
}`,
      },
      { role: "user", content: emailText },
    ],
  });

  const text = response.choices[0]?.message?.content || "";

  const jsonMatch = text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("GPT did not return valid JSON for email analysis");
  }

  return JSON.parse(jsonMatch[0]) as EmailAnalysis;
}

export async function researchDestination(
  destination: string,
  interests: string[],
  days: number
): Promise<string> {
  const client = getClient();

  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 2048,
    messages: [
      {
        role: "system",
        content: `You are an expert Greece travel advisor. Provide detailed, practical travel recommendations.
Include day-by-day suggestions, local tips, and insider knowledge.
Write in a warm, professional tone suitable for a travel agency response.
Focus on: ${interests.join(", ")}.`,
      },
      {
        role: "user",
        content: `Create a ${days}-day travel itinerary for ${destination}. Include must-see sights, recommended restaurants, neighborhood walks, and a day trip suggestion. If relevant, suggest a 2-day island excursion.`,
      },
    ],
  });

  return response.choices[0]?.message?.content || "";
}

export async function* composeEmail(
  allResults: {
    emailAnalysis: EmailAnalysis;
    flights: unknown[];
    hotels: unknown[];
    research: string;
    places: unknown[];
  },
  originalEmail: string
): AsyncGenerator<string> {
  const client = getClient();

  const stream = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 3000,
    stream: true,
    messages: [
      {
        role: "system",
        content: `You are a professional travel agent composing a response email.
Write a warm, detailed, and well-organized response that:
- Addresses the customer by name
- Presents flight options in a clear format
- Recommends hotels with key details
- Includes the travel itinerary highlights
- Mentions recommended restaurants and places
- Ends with a professional closing
- Write in English (the customers wrote in English despite being German)
- Use clean formatting with sections and bullet points`,
      },
      {
        role: "user",
        content: `Original customer email:
${originalEmail}

Email analysis:
${JSON.stringify(allResults.emailAnalysis, null, 2)}

Flight options found:
${JSON.stringify(allResults.flights, null, 2)}

Hotel recommendations:
${JSON.stringify(allResults.hotels, null, 2)}

Travel research & itinerary:
${allResults.research}

Recommended places:
${JSON.stringify(allResults.places, null, 2)}

Compose a complete, professional response email from Afea Travel to the customer.`,
      },
    ],
  });

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      yield delta;
    }
  }
}
