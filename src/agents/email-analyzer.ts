import OpenAI from "openai";
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
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OPENAI_API_KEY not set — returning mock analysis");
    return detectMultiLegMock(emailText);
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You are a travel email analyzer. Extract structured information from customer emails.
Today's date is ${new Date().toISOString().split("T")[0]}.
When the email says "next week", calculate the actual dates from today.

IMPORTANT RULES:
1. Budget values should be PER NIGHT, not total trip cost. If the customer says '120-150€/night', return min:120, max:150.
2. You MUST ALWAYS return valid 3-letter IATA airport codes for both origin and destination.
   - If the customer mentions a city, use the city's main airport (e.g., Paris → CDG, London → LHR, Rome → FCO, Athens → ATH, Hamburg → HAM, Berlin → BER, Santorini → JTR).
   - If origin city is not explicitly stated but the customer's country/city is clear from their name or email address (e.g., a German name from Hamburg → HAM, a French email → CDG), use the most likely airport.
   - NEVER return an empty string for originIATA or destinationIATA.
3. Extract the customer's full name from the email signature or greeting.
4. MULTI-DESTINATION TRIPS: If the email mentions multiple destinations (e.g., "3 days in Rome then 4 days in Santorini", "Rome and Athens", "island-hopping"), return a "legs" array. Each leg represents a distinct destination stop. If only a single destination, do NOT include the "legs" field at all.
   - Each leg has: destination, destinationIATA, nights, budget (per night), interests for that leg.
   - Split total trip duration across legs based on context. If not specified, distribute evenly.
   - The top-level "destination" and "destinationIATA" should be the FIRST leg's destination.
   - The top-level "dates.duration" should be the total trip duration across all legs.

Respond ONLY with valid JSON matching this exact schema:
{
  "origin": "city name",
  "originIATA": "3-letter IATA airport code (REQUIRED, never empty)",
  "destination": "first destination city name",
  "destinationIATA": "3-letter IATA airport code (REQUIRED, never empty)",
  "dates": { "start": "YYYY-MM-DD", "end": "YYYY-MM-DD", "duration": total_number_of_days },
  "travelers": { "adults": number, "children": number, "names": ["full names from email"] },
  "budget": { "min": number (per night), "max": number (per night), "currency": "EUR" },
  "interests": ["string"],
  "language": "detected language code (e.g. en, de, fr)",
  "specialRequests": ["specific request strings"],
  "customerName": "primary contact's full name (e.g. 'Klaus Mueller', 'Marie Dupont')",
  "legs": [
    {
      "destination": "city name",
      "destinationIATA": "3-letter IATA code",
      "nights": number,
      "budget": { "min": number, "max": number, "currency": "EUR" },
      "interests": ["interests specific to this destination"]
    }
  ]
}
NOTE: Only include "legs" if the email mentions 2+ distinct destinations. Omit it entirely for single-destination trips.`,
        },
        { role: "user", content: emailText },
      ],
    });

    const text = response.choices[0]?.message?.content || "";
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("GPT did not return valid JSON for email analysis");
    }

    const result = JSON.parse(jsonMatch[0]) as EmailAnalysis;

    // Validate IATA codes are not empty
    if (!result.originIATA || result.originIATA.length !== 3) {
      console.warn(`Invalid originIATA "${result.originIATA}" — defaulting to nearest major hub`);
      result.originIATA = guessOriginIATA(result.origin, emailText);
    }
    if (!result.destinationIATA || result.destinationIATA.length !== 3) {
      console.warn(`Invalid destinationIATA "${result.destinationIATA}"`);
      result.destinationIATA = guessIATA(result.destination);
    }

    console.log(`Email analysis: ${result.origin}(${result.originIATA}) → ${result.destination}(${result.destinationIATA}), ${result.dates.duration} days`);
    return result;
  } catch (error) {
    console.error("Email analysis failed:", error);
    return MOCK_ANALYSIS;
  }
}

const CITY_IATA_MAP: Record<string, string> = {
  athens: 'ATH', rome: 'FCO', paris: 'CDG', london: 'LHR', santorini: 'JTR',
  hamburg: 'HAM', berlin: 'BER', munich: 'MUC', frankfurt: 'FRA', vienna: 'VIE',
  barcelona: 'BCN', madrid: 'MAD', lisbon: 'LIS', amsterdam: 'AMS', istanbul: 'IST',
  crete: 'HER', mykonos: 'JMK', dubrovnik: 'DBV', zurich: 'ZRH', milan: 'MXP',
  prague: 'PRG', budapest: 'BUD', florence: 'FLR', venice: 'VCE', naples: 'NAP',
  thessaloniki: 'SKG', rhodes: 'RHO', corfu: 'CFU', nice: 'NCE', malaga: 'AGP',
  tokyo: 'NRT', bangkok: 'BKK', dubai: 'DXB', cairo: 'CAI', marrakech: 'RAK',
};

function detectMultiLegMock(emailText: string): EmailAnalysis {
  const lower = emailText.toLowerCase();
  const detectedCities: { name: string; iata: string }[] = [];

  for (const [city, iata] of Object.entries(CITY_IATA_MAP)) {
    if (lower.includes(city)) {
      // Capitalize the city name
      const name = city.charAt(0).toUpperCase() + city.slice(1);
      detectedCities.push({ name, iata });
    }
  }

  // Filter out potential origin cities (Hamburg, Berlin, etc.) if they appear with clear destinations
  const originKeywords = ['hamburg', 'berlin', 'munich', 'frankfurt', 'london', 'paris', 'amsterdam', 'vienna', 'zurich'];
  const destinations = detectedCities.filter(c => !originKeywords.includes(c.name.toLowerCase()));
  const origins = detectedCities.filter(c => originKeywords.includes(c.name.toLowerCase()));

  // If we have 2+ distinct destinations, create legs
  if (destinations.length >= 2) {
    const origin = origins[0] || { name: 'Hamburg', iata: 'HAM' };
    const nightsPerLeg = Math.max(2, Math.floor(7 / destinations.length));
    const totalNights = nightsPerLeg * destinations.length;

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + 14);
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + totalNights);

    const legs: import("./types").TripLeg[] = destinations.map(d => ({
      destination: d.name,
      destinationIATA: d.iata,
      nights: nightsPerLeg,
      budget: { min: 120, max: 150, currency: 'EUR' },
      interests: MOCK_ANALYSIS.interests,
    }));

    return {
      ...MOCK_ANALYSIS,
      origin: origin.name,
      originIATA: origin.iata,
      destination: destinations[0].name,
      destinationIATA: destinations[0].iata,
      dates: {
        start: startDate.toISOString().split('T')[0],
        end: endDate.toISOString().split('T')[0],
        duration: totalNights,
      },
      legs,
    };
  }

  return MOCK_ANALYSIS;
}

function guessIATA(city: string): string {
  const map: Record<string, string> = {
    athens: 'ATH', rome: 'FCO', paris: 'CDG', london: 'LHR', santorini: 'JTR',
    hamburg: 'HAM', berlin: 'BER', munich: 'MUC', frankfurt: 'FRA', vienna: 'VIE',
    barcelona: 'BCN', madrid: 'MAD', lisbon: 'LIS', amsterdam: 'AMS', istanbul: 'IST',
    crete: 'HER', mykonos: 'JMK', dubrovnik: 'DBV', zurich: 'ZRH', milan: 'MXP',
  };
  const lower = city.toLowerCase();
  for (const [key, code] of Object.entries(map)) {
    if (lower.includes(key)) return code;
  }
  return 'FRA'; // Frankfurt as European hub fallback
}

function guessOriginIATA(origin: string, emailText: string): string {
  if (origin) {
    const code = guessIATA(origin);
    if (code !== 'FRA') return code;
  }
  // Try to detect from email content
  const lower = emailText.toLowerCase();
  if (lower.includes('hamburg')) return 'HAM';
  if (lower.includes('berlin')) return 'BER';
  if (lower.includes('london') || lower.includes('heathrow')) return 'LHR';
  if (lower.includes('paris') || lower.includes('cdg')) return 'CDG';
  if (lower.includes('munich') || lower.includes('münchen')) return 'MUC';
  if (lower.includes('frankfurt')) return 'FRA';
  if (lower.includes('amsterdam')) return 'AMS';
  if (lower.includes('vienna') || lower.includes('wien')) return 'VIE';
  return 'FRA';
}
