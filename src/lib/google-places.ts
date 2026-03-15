export interface PlaceResult {
  name: string;
  rating: number | null;
  address: string;
  summary: string;
  mapsUrl: string;
}

const MOCK_PLACES: PlaceResult[] = [
  {
    name: "Τα Καραμανλίδικα του Φάνη",
    rating: 4.6,
    address: "Sokratous 1, Athina 105 52",
    summary: "Traditional deli-restaurant in the Athens Central Market area, serving authentic Greek mezes and cured meats.",
    mapsUrl: "https://maps.google.com/?cid=mock1",
  },
  {
    name: "Μαύρο Πρόβατο",
    rating: 4.5,
    address: "Arrianou 31, Athina 116 36",
    summary: "Modern taverna in Pangrati with creative twists on classic Greek dishes and excellent wine list.",
    mapsUrl: "https://maps.google.com/?cid=mock2",
  },
  {
    name: "Σχολαρχείον",
    rating: 4.4,
    address: "Tripodon 14, Athina 105 58",
    summary: "Atmospheric ouzeri in Plaka with rooftop Acropolis views and traditional meze platters.",
    mapsUrl: "https://maps.google.com/?cid=mock3",
  },
  {
    name: "Διπόρτο Αγοράς",
    rating: 4.3,
    address: "Theatrou 9, Athina 105 52",
    summary: "No-sign basement taverna near the Central Market — a local legend for barrel wine and simple home cooking.",
    mapsUrl: "https://maps.google.com/?cid=mock4",
  },
  {
    name: "Ακρόπολη (Acropolis)",
    rating: 4.8,
    address: "Athens 105 58",
    summary: "The iconic ancient citadel perched above Athens, home to the Parthenon and other classical monuments.",
    mapsUrl: "https://maps.google.com/?cid=mock5",
  },
];

const FIELD_MASK = [
  "places.displayName",
  "places.rating",
  "places.formattedAddress",
  "places.types",
  "places.editorialSummary",
  "places.googleMapsUri",
].join(",");

export async function searchPlaces(
  query: string,
  maxResults: number = 5
): Promise<PlaceResult[]> {
  const apiKey = process.env.GOOGLE_PLACES_API_KEY;
  if (!apiKey) {
    console.warn("GOOGLE_PLACES_API_KEY not set — returning mock places");
    return MOCK_PLACES.slice(0, maxResults);
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
      return MOCK_PLACES.slice(0, maxResults);
    }

    const json = await res.json();
    const places = json.places ?? [];

    if (places.length === 0) {
      console.warn("Google Places returned no results — using mock data");
      return MOCK_PLACES.slice(0, maxResults);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return places.map((p: any) => ({
      name: p.displayName?.text ?? "Unknown",
      rating: p.rating ?? null,
      address: p.formattedAddress ?? "",
      summary: p.editorialSummary?.text ?? "",
      mapsUrl: p.googleMapsUri ?? "",
    }));
  } catch (error) {
    console.error("Google Places API call failed:", error);
    return MOCK_PLACES.slice(0, maxResults);
  }
}
