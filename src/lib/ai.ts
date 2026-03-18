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
  customerName?: string;
}

export interface ComposeSettings {
  responseLanguage?: string;
  tone?: string;
  emailSignature?: string;
  defaultGreeting?: string;
  includePriceBreakdown?: boolean;
  includeItinerary?: boolean;
  includeWeatherInfo?: boolean;
  includedPlaces?: string[];
  responseLength?: 'concise' | 'standard' | 'detailed';
  returningCustomerContext?: { name: string; tripCount: number; lastDestination: string };
}

const LANGUAGE_MAP: Record<string, string> = {
  en: "English",
  de: "German",
  el: "Greek",
  fr: "French",
  it: "Italian",
  es: "Spanish",
};

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
    max_tokens: 1500,
    messages: [
      {
        role: "system",
        content: `You are a travel advisor. Write a CONCISE day-by-day plan. For each day: 2-3 bullet points max. Focus on: ${interests.join(", ")}. No lengthy descriptions.`,
      },
      {
        role: "user",
        content: `Create a concise ${days}-day itinerary for ${destination}. Format: "Day 1 - Title: activity, activity, restaurant". Keep each day to 2-3 sentences.`,
      },
    ],
  });

  return response.choices[0]?.message?.content || "";
}

export interface PerLegSelection {
  legName: string;
  selectedFlight?: unknown;
  selectedHotel?: unknown;
  flights?: unknown[];
  hotels?: unknown[];
  topPlaces?: unknown[];
  itinerarySummary?: string;
}

export async function* composeEmail(
  allResults: {
    emailAnalysis: EmailAnalysis;
    selectedFlight?: unknown;
    selectedHotel?: unknown;
    flights: unknown[];
    hotels: unknown[];
    research: string;
    places: unknown[];
  },
  originalEmail: string,
  settings?: ComposeSettings,
  perLegData?: PerLegSelection[]
): AsyncGenerator<string> {
  const client = getClient();

  // Build language instruction
  let languageInstruction: string;
  if (settings?.responseLanguage && LANGUAGE_MAP[settings.responseLanguage]) {
    languageInstruction = `Write in ${LANGUAGE_MAP[settings.responseLanguage]}`;
  } else if (settings?.responseLanguage) {
    languageInstruction = `Write in ${settings.responseLanguage}`;
  } else {
    languageInstruction = "Write in the same language the customer used in their email";
  }

  // Build additional settings instructions
  const settingsInstructions: string[] = [];

  if (settings?.tone) {
    settingsInstructions.push(`Tone: ${settings.tone}`);
  }

  if (settings?.emailSignature) {
    settingsInstructions.push(`SIGN OFF WITH:\n${settings.emailSignature}`);
  }

  if (settings?.defaultGreeting) {
    settingsInstructions.push(`Start with: "${settings.defaultGreeting}"`);
  }

  if (settings?.includePriceBreakdown === false) {
    settingsInstructions.push("Do not include detailed price breakdowns");
  }

  if (settings?.includeItinerary === false) {
    settingsInstructions.push("Briefly mention itinerary highlights only, skip the full day-by-day");
  }

  if (settings?.includeWeatherInfo === true) {
    settingsInstructions.push("Include a brief note about expected weather at the destination");
  }

  // Response length support
  if (settings?.responseLength === 'concise') {
    settingsInstructions.push("Keep the response brief, under 300 words.");
  } else if (settings?.responseLength === 'detailed') {
    settingsInstructions.push("Provide a comprehensive, detailed response.");
  }

  // Returning customer context
  if (settings?.returningCustomerContext) {
    const ctx = settings.returningCustomerContext;
    settingsInstructions.push(
      `This is a returning customer who has traveled with us ${ctx.tripCount} times. Their last trip was to ${ctx.lastDestination}. Open with a personal touch referencing their history with the agency.`
    );
  }

  const settingsBlock = settingsInstructions.length > 0
    ? `\n${settingsInstructions.join("\n")}`
    : "";

  // Filter places if includedPlaces is specified
  let placesData = allResults.places;
  if (settings?.includedPlaces && settings.includedPlaces.length > 0) {
    const includedSet = new Set(settings.includedPlaces);
    placesData = (allResults.places as Array<{ name: string; [key: string]: unknown }>).filter(
      (p) => includedSet.has(p.name)
    );
  }

  // Build user content based on single-leg vs multi-leg
  let userContent: string;

  if (perLegData && perLegData.length > 1) {
    // Multi-leg compose
    const legSections = perLegData.map((leg, i) => {
      const parts: string[] = [`--- DESTINATION ${i + 1}: ${leg.legName} ---`];
      if (leg.selectedFlight) {
        parts.push(`Recommended flight:\n${JSON.stringify(leg.selectedFlight, null, 2)}`);
      }
      if (leg.flights && leg.flights.length > 0) {
        parts.push(`All flight options:\n${JSON.stringify(leg.flights, null, 2)}`);
      }
      if (leg.selectedHotel) {
        parts.push(`Recommended hotel:\n${JSON.stringify(leg.selectedHotel, null, 2)}`);
      }
      if (leg.hotels && leg.hotels.length > 0) {
        parts.push(`All hotel options:\n${JSON.stringify(leg.hotels, null, 2)}`);
      }
      if (leg.itinerarySummary) {
        parts.push(`Itinerary:\n${leg.itinerarySummary}`);
      }
      if (leg.topPlaces && leg.topPlaces.length > 0) {
        parts.push(`Recommended places:\n${JSON.stringify(leg.topPlaces, null, 2)}`);
      }
      return parts.join('\n\n');
    }).join('\n\n');

    // Calculate total budget
    const totalBudgetNote = `\nIMPORTANT: Include a TOTAL BUDGET BREAKDOWN at the end covering all destinations — flights + hotels + estimated daily expenses for each leg, then a grand total.`;

    userContent = `Original customer email:
${originalEmail}

Email analysis:
${JSON.stringify(allResults.emailAnalysis, null, 2)}

This is a MULTI-DESTINATION trip with ${perLegData.length} stops. Structure the email with clear sections for each destination.

${legSections}
${totalBudgetNote}

Compose a complete, professional response email from Afea Travel to the customer, with a clear section for each destination.`;
  } else {
    // Single-leg compose (original behavior)
    const selectionInstructions: string[] = [];
    if (allResults.selectedFlight) {
      selectionInstructions.push(
        `RECOMMENDED FLIGHT (present this as your primary recommendation):\n${JSON.stringify(allResults.selectedFlight, null, 2)}`
      );
    }
    if (allResults.selectedHotel) {
      selectionInstructions.push(
        `RECOMMENDED HOTEL (present this as your primary recommendation):\n${JSON.stringify(allResults.selectedHotel, null, 2)}`
      );
    }

    userContent = `Original customer email:
${originalEmail}

Email analysis:
${JSON.stringify(allResults.emailAnalysis, null, 2)}

${selectionInstructions.length > 0 ? selectionInstructions.join('\n\n') + '\n\n' : ''}All flight options found:
${JSON.stringify(allResults.flights, null, 2)}

All hotel options:
${JSON.stringify(allResults.hotels, null, 2)}

Travel research & itinerary:
${allResults.research}

Recommended places:
${JSON.stringify(placesData, null, 2)}

Compose a complete, professional response email from Afea Travel to the customer.`;
  }

  const isMultiLeg = perLegData && perLegData.length > 1;

  const stream = await client.chat.completions.create({
    model: MODEL,
    max_tokens: isMultiLeg ? 4000 : 3000,
    stream: true,
    messages: [
      {
        role: "system",
        content: `CRITICAL: Do NOT use markdown formatting. No **, ##, *, bullet lists with -, or numbered lists with 1. 2. 3. Write in clean, natural paragraphs with proper sentence structure. This is a professional email, not a markdown document. Write as a human travel consultant would — warm, clear, with paragraph breaks for structure.

You are a professional travel agent at Afea Travel composing a response email.
Write a warm, detailed, and well-organized response that:
- Addresses the customer by name
${isMultiLeg
  ? `- Organizes the email by destination, with a clear section for each stop
- For each destination: presents the recommended flight and hotel, brief itinerary highlights, and top places
- Includes inter-destination travel details (flights between cities)
- Ends with a total budget breakdown across all destinations`
  : `- ${allResults.selectedFlight ? 'Presents the RECOMMENDED flight prominently, then briefly mentions 1-2 alternatives' : 'Presents flight options in a clear format'}
- ${allResults.selectedHotel ? 'Presents the RECOMMENDED hotel prominently, then briefly mentions alternatives' : 'Recommends hotels with key details'}
- Includes the travel itinerary highlights
- Mentions recommended restaurants and places`}
- Ends with a professional closing and next steps
- ${languageInstruction}
- Use clean formatting with sections and bullet points${settingsBlock}`,
      },
      {
        role: "user",
        content: userContent,
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

export async function translateText(text: string, targetLanguage: string): Promise<string> {
  const client = getClient();
  const langName = LANGUAGE_MAP[targetLanguage] || targetLanguage;
  const response = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 3000,
    messages: [
      { role: "system", content: `Translate the following travel agency email to ${langName}. Preserve the formatting, tone, and structure exactly. Do not add any markdown formatting. Output clean text only.` },
      { role: "user", content: text },
    ],
  });
  return response.choices[0]?.message?.content || text;
}

export async function* composeFollowUp(
  customerName: string,
  destination: string,
  originalResponse: string,
  settings?: ComposeSettings
): AsyncGenerator<string> {
  const client = getClient();
  // Build language instruction same as composeEmail
  let langInst = "Write in English";
  if (settings?.responseLanguage && LANGUAGE_MAP[settings.responseLanguage]) {
    langInst = `Write in ${LANGUAGE_MAP[settings.responseLanguage]}`;
  }
  const stream = await client.chat.completions.create({
    model: MODEL,
    max_tokens: 1000,
    stream: true,
    messages: [
      { role: "system", content: `You are a professional travel agent writing a friendly follow-up email. ${langInst}. Do NOT use markdown formatting. Write clean, natural paragraphs. Be warm and helpful. Keep it brief — 100-150 words.${settings?.emailSignature ? `\n\nSign off with:\n${settings.emailSignature}` : ''}` },
      { role: "user", content: `Write a follow-up email to ${customerName} about their trip to ${destination}. We sent them a proposal but haven't heard back. Reference that we previously provided flight and hotel options. Ask if they'd like to proceed or need any changes.\n\nOriginal response we sent (for context, do not repeat it):\n${originalResponse.slice(0, 500)}` },
    ],
  });
  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) yield delta;
  }
}
