import OpenAI from "openai";

export interface PlaceResult {
  name: string;
  rating: number | null;
  address: string;
  summary: string;
  mapsUrl: string;
  lat?: number;
  lng?: number;
}

/* ── GPT-4o fallback for places ──────────────────────────────────── */

async function getGptPlaces(query: string, maxResults: number): Promise<PlaceResult[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.warn("OPENAI_API_KEY not set — returning generic fallback places");
    return getGenericFallbackPlaces(query, maxResults);
  }

  try {
    const client = new OpenAI({ apiKey });
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      max_tokens: 1500,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "You are a travel expert. Return ONLY valid JSON.",
        },
        {
          role: "user",
          content: `Suggest ${maxResults} real places for: "${query}".

For each place return a JSON object with:
- name: string (real place name)
- rating: number (out of 5, e.g. 4.6) or null
- address: string (real address)
- summary: string (1-2 sentence description)
- lat: number (approximate latitude)
- lng: number (approximate longitude)

Use REAL places that actually exist. Return a JSON object with a "places" array.`,
        },
      ],
    });

    const text = response.choices[0]?.message?.content || "";
    const parsed = JSON.parse(text);
    const places = (parsed.places || parsed) as PlaceResult[];

    if (!Array.isArray(places) || places.length === 0) {
      throw new Error("GPT returned no places");
    }

    return places.slice(0, maxResults).map(p => ({
      name: p.name || "Unknown Place",
      rating: p.rating != null ? Number(p.rating) : null,
      address: p.address || "",
      summary: p.summary || "",
      mapsUrl: "",
      lat: p.lat != null ? Number(p.lat) : undefined,
      lng: p.lng != null ? Number(p.lng) : undefined,
    }));
  } catch (error) {
    console.error("GPT-4o places fallback failed:", error);
    return getGenericFallbackPlaces(query, maxResults);
  }
}

/* ── Generic fallback (last resort) ──────────────────────────────── */

function getGenericFallbackPlaces(query: string, maxResults: number): PlaceResult[] {
  // Extract city name from query
  const cityMatch = query.match(/in\s+(.+?)(?:\s+(?:area|district|neighborhood))?$/i);
  const city = cityMatch ? cityMatch[1] : query.split(" ").slice(-1)[0];

  const templates = [
    { suffix: "Old Town", rating: 4.6, cat: "Historic neighborhood" },
    { suffix: "Central Market", rating: 4.4, cat: "Local market with authentic atmosphere" },
    { suffix: "National Museum", rating: 4.5, cat: "Must-visit cultural attraction" },
    { suffix: "Cathedral", rating: 4.3, cat: "Historic landmark" },
    { suffix: "Waterfront", rating: 4.5, cat: "Scenic area with restaurants" },
    { suffix: "City Park", rating: 4.2, cat: "Green space for relaxation" },
    { suffix: "Art Gallery", rating: 4.4, cat: "Contemporary and classical art" },
    { suffix: "Food District", rating: 4.3, cat: "Local restaurants and street food" },
  ];

  return templates.slice(0, maxResults).map(t => ({
    name: `${city} ${t.suffix}`,
    rating: t.rating,
    address: `${city} Center`,
    summary: t.cat,
    mapsUrl: "",
  }));
}

/* ── Google Places API ─────────────────────────────────────────── */

const FIELD_MASK = [
  "places.displayName",
  "places.rating",
  "places.formattedAddress",
  "places.types",
  "places.editorialSummary",
  "places.googleMapsUri",
  "places.location",
].join(",");

export async function searchPlaces(
  query: string,
  maxResults: number = 5
): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_PLACES_API_KEY not set — using GPT-4o for places");
    return getGptPlaces(query, maxResults);
  }

  try {
    const res = await fetch(
      "https://places.googleapis.com/v1/places:searchText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Goog-Api-Key": apiKey,
          "X-Goog-FieldMask": FIELD_MASK,
        },
        body: JSON.stringify({
          textQuery: query,
          maxResultCount: maxResults,
        }),
      }
    );

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Google Places API error ${res.status}: ${errorText}`);
      return getGptPlaces(query, maxResults);
    }

    const json = await res.json();
    const places = json.places ?? [];

    if (places.length === 0) {
      console.warn("Google Places returned no results — using GPT-4o fallback");
      return getGptPlaces(query, maxResults);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return places.map((p: any) => ({
      name: p.displayName?.text ?? "Unknown",
      rating: p.rating ?? null,
      address: p.formattedAddress ?? "",
      summary: p.editorialSummary?.text ?? "",
      mapsUrl: p.googleMapsUri ?? "",
      lat: p.location?.latitude ?? undefined,
      lng: p.location?.longitude ?? undefined,
    }));
  } catch (error) {
    console.error("Google Places API call failed:", error);
    return getGptPlaces(query, maxResults);
  }
}
