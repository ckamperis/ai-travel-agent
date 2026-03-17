export interface PlaceResult {
  name: string;
  rating: number | null;
  address: string;
  summary: string;
  mapsUrl: string;
  lat?: number;
  lng?: number;
}

/* ── City-specific mock place data with coordinates ──────────── */

const MOCK_DB: Record<string, PlaceResult[]> = {
  athens: [
    { name: "Acropolis", rating: 4.8, address: "Athens 105 58", summary: "The iconic ancient citadel perched above Athens, home to the Parthenon and other classical monuments.", mapsUrl: "", lat: 37.9715, lng: 23.7257 },
    { name: "Ta Karamanlidika tou Fani", rating: 4.6, address: "Sokratous 1, Athina 105 52", summary: "Traditional deli-restaurant in the Athens Central Market area, serving authentic Greek mezes and cured meats.", mapsUrl: "", lat: 37.9795, lng: 23.7275 },
    { name: "Mavro Provato", rating: 4.5, address: "Arrianou 31, Athina 116 36", summary: "Modern taverna in Pangrati with creative twists on classic Greek dishes and excellent wine list.", mapsUrl: "", lat: 37.9680, lng: 23.7465 },
    { name: "Plaka Neighborhood", rating: 4.7, address: "Plaka, Athens", summary: "Athens' oldest neighborhood with neoclassical architecture, winding streets, and tavernas at the foot of the Acropolis.", mapsUrl: "", lat: 37.9725, lng: 23.7310 },
    { name: "Acropolis Museum", rating: 4.7, address: "Dionysiou Areopagitou 15, Athens", summary: "World-class museum housing artifacts from the Acropolis archaeological site.", mapsUrl: "", lat: 37.9685, lng: 23.7285 },
    { name: "Ancient Agora", rating: 4.6, address: "Adrianou 24, Athens 105 55", summary: "The commercial and civic center of ancient Athens, with the well-preserved Temple of Hephaestus.", mapsUrl: "", lat: 37.9750, lng: 23.7220 },
  ],
  rome: [
    { name: "Colosseum", rating: 4.8, address: "Piazza del Colosseo, Roma 00184", summary: "The largest ancient amphitheatre, an iconic symbol of Imperial Rome.", mapsUrl: "", lat: 41.8902, lng: 12.4922 },
    { name: "Vatican Museums", rating: 4.7, address: "Viale Vaticano, 00165 Roma", summary: "Vast art collection including the Sistine Chapel ceiling painted by Michelangelo.", mapsUrl: "", lat: 41.9065, lng: 12.4536 },
    { name: "Trattoria Da Enzo al 29", rating: 4.6, address: "Via dei Vascellari 29, Roma 00153", summary: "Beloved Trastevere trattoria serving classic Roman dishes.", mapsUrl: "", lat: 41.8875, lng: 12.4725 },
    { name: "Trastevere", rating: 4.7, address: "Trastevere, Roma", summary: "Charming medieval neighborhood across the Tiber, known for cobblestone streets and nightlife.", mapsUrl: "", lat: 41.8893, lng: 12.4693 },
    { name: "Pantheon", rating: 4.8, address: "Piazza della Rotonda, Roma 00186", summary: "Remarkably preserved Roman temple with the world's largest unreinforced concrete dome.", mapsUrl: "", lat: 41.8986, lng: 12.4769 },
    { name: "Trevi Fountain", rating: 4.7, address: "Piazza di Trevi, Roma 00187", summary: "Baroque masterpiece — toss a coin to ensure your return to Rome.", mapsUrl: "", lat: 41.9009, lng: 12.4833 },
  ],
  santorini: [
    { name: "Oia Sunset Viewpoint", rating: 4.9, address: "Oia 847 02, Santorini", summary: "The most famous sunset spot in the world, overlooking the caldera from the castle ruins.", mapsUrl: "", lat: 36.4618, lng: 25.3753 },
    { name: "Ammoudi Bay", rating: 4.6, address: "Ammoudi, Oia 847 02", summary: "Tiny fishing port below Oia, accessible by 300 steps, with waterfront seafood tavernas.", mapsUrl: "", lat: 36.4640, lng: 25.3710 },
    { name: "Red Beach", rating: 4.4, address: "Akrotiri 847 00, Santorini", summary: "Dramatic volcanic beach with towering red cliffs, near the Akrotiri archaeological site.", mapsUrl: "", lat: 36.3478, lng: 25.3958 },
    { name: "Selene Restaurant", rating: 4.5, address: "Fira 847 00, Santorini", summary: "Fine dining showcasing modern Santorinian cuisine with local wines and caldera views.", mapsUrl: "", lat: 36.4167, lng: 25.4300 },
    { name: "Akrotiri Archaeological Site", rating: 4.7, address: "Akrotiri 847 00, Santorini", summary: "Minoan Bronze Age settlement preserved under volcanic ash — the 'Greek Pompeii'.", mapsUrl: "", lat: 36.3519, lng: 25.4033 },
    { name: "Fira to Oia Hike", rating: 4.8, address: "Fira to Oia trail, Santorini", summary: "Scenic 10km caldera-edge trail connecting Fira to Oia with spectacular views.", mapsUrl: "", lat: 36.4390, lng: 25.4050 },
  ],
  paris: [
    { name: "Eiffel Tower", rating: 4.7, address: "Champ de Mars, 5 Av. Anatole France, 75007 Paris", summary: "The iconic iron lattice tower and the most-visited paid monument in the world.", mapsUrl: "", lat: 48.8584, lng: 2.2945 },
    { name: "Louvre Museum", rating: 4.7, address: "Rue de Rivoli, 75001 Paris", summary: "The world's largest art museum, home to the Mona Lisa and Venus de Milo.", mapsUrl: "", lat: 48.8606, lng: 2.3376 },
    { name: "Le Comptoir du Pantheon", rating: 4.4, address: "5 Rue Soufflot, 75005 Paris", summary: "Classic Parisian brasserie with Pantheon views, serving traditional French cuisine.", mapsUrl: "", lat: 48.8462, lng: 2.3449 },
    { name: "Montmartre", rating: 4.6, address: "Montmartre, 75018 Paris", summary: "Hilltop artistic quarter with Sacre-Coeur basilica, street artists, and charming cafes.", mapsUrl: "", lat: 48.8867, lng: 2.3431 },
    { name: "Musee d'Orsay", rating: 4.8, address: "1 Rue de la Legion d'Honneur, 75007 Paris", summary: "Impressionist masterpieces in a stunning converted railway station.", mapsUrl: "", lat: 48.8600, lng: 2.3266 },
    { name: "Le Marais", rating: 4.6, address: "Le Marais, 75004 Paris", summary: "Historic district with medieval architecture, trendy boutiques, and lively cafe culture.", mapsUrl: "", lat: 48.8593, lng: 2.3622 },
  ],
  london: [
    { name: "British Museum", rating: 4.7, address: "Great Russell St, London WC1B 3DG", summary: "World-renowned museum with artifacts spanning two million years of human history.", mapsUrl: "", lat: 51.5194, lng: -0.1270 },
    { name: "Tower of London", rating: 4.6, address: "London EC3N 4AB", summary: "Historic castle and fortress on the Thames, home to the Crown Jewels.", mapsUrl: "", lat: 51.5081, lng: -0.0759 },
    { name: "Borough Market", rating: 4.5, address: "8 Southwark St, London SE1 1TL", summary: "London's most renowned food market, with artisan producers and street food stalls.", mapsUrl: "", lat: 51.5055, lng: -0.0910 },
    { name: "Dishoom", rating: 4.6, address: "12 Upper St Martin's Ln, London WC2H 9FB", summary: "Bombay-inspired cafe serving legendary bacon naan rolls and aromatic curries.", mapsUrl: "", lat: 51.5130, lng: -0.1265 },
    { name: "Westminster Abbey", rating: 4.7, address: "20 Deans Yd, London SW1P 3PA", summary: "Gothic abbey where British monarchs have been crowned since 1066.", mapsUrl: "", lat: 51.4993, lng: -0.1273 },
    { name: "South Bank Walk", rating: 4.5, address: "South Bank, London SE1", summary: "Riverside promenade from Westminster Bridge to Tower Bridge with street performers and views.", mapsUrl: "", lat: 51.5064, lng: -0.1058 },
  ],
};

function resolveCity(query: string): string {
  const lower = query.toLowerCase();
  for (const key of Object.keys(MOCK_DB)) {
    if (lower.includes(key)) return key;
  }
  if (lower.includes('roma') || lower.includes('roman')) return 'rome';
  if (lower.includes('santorin') || lower.includes('thira') || lower.includes('oia') || lower.includes('fira')) return 'santorini';
  if (lower.includes('athen') || lower.includes('plaka') || lower.includes('acropolis')) return 'athens';
  if (lower.includes('london') || lower.includes('westminster')) return 'london';
  if (lower.includes('paris') || lower.includes('montmartre') || lower.includes('marais')) return 'paris';
  return '';
}

function getMockPlaces(query: string, maxResults: number): PlaceResult[] {
  const city = resolveCity(query);
  const places = MOCK_DB[city] || MOCK_DB.athens;
  return places.slice(0, maxResults);
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
    console.warn("GOOGLE_PLACES_API_KEY not set — returning city-specific mock places");
    return getMockPlaces(query, maxResults);
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
      return getMockPlaces(query, maxResults);
    }

    const json = await res.json();
    const places = json.places ?? [];

    if (places.length === 0) {
      console.warn("Google Places returned no results — using city-specific mock data");
      return getMockPlaces(query, maxResults);
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
    return getMockPlaces(query, maxResults);
  }
}
