import type { EmailAnalysis, FlightResult, HotelResult, PlaceResult } from '@/agents/types';

/* ================================================================
   Mock data for multi-leg trip testing.
   Will be replaced by real backend responses when merged.
   ================================================================ */

export const MOCK_MULTI_LEG_ANALYSIS: EmailAnalysis = {
  origin: 'Berlin',
  originIATA: 'BER',
  destination: 'Greece',
  destinationIATA: 'ATH',
  dates: { start: '2025-08-04', end: '2025-08-14', duration: 10 },
  travelers: { adults: 2, children: 0, names: ['Hans Schneider', 'Maria Schneider'] },
  budget: { min: 120, max: 180, currency: 'EUR' },
  interests: ['history', 'food', 'beaches', 'nature'],
  language: 'German',
  specialRequests: [],
  customerName: 'Hans Schneider',
  legs: [
    { destination: 'Athens', destinationIATA: 'ATH', nights: 4, budget: { min: 120, max: 180, currency: 'EUR' }, interests: ['history', 'food', 'Acropolis'] },
    { destination: 'Santorini', destinationIATA: 'JTR', nights: 3, budget: { min: 150, max: 250, currency: 'EUR' }, interests: ['beaches', 'sunset', 'romance'] },
    { destination: 'Crete', destinationIATA: 'HER', nights: 3, budget: { min: 100, max: 160, currency: 'EUR' }, interests: ['nature', 'Samaria Gorge', 'local cuisine'] },
  ],
};

/* ---- Per-destination mock data ---- */

interface LegMockData {
  flights: FlightResult[];
  hotels: HotelResult[];
  research: string;
  places: PlaceResult[];
}

const ATHENS_DATA: LegMockData = {
  flights: [
    { airline: 'Aegean Airlines', price: 189, currency: 'EUR', departureTime: '2025-08-04T06:30:00', arrivalTime: '2025-08-04T10:45:00', origin: 'BER', destination: 'ATH', stops: 0, duration: '3h 15m' },
    { airline: 'Ryanair', price: 89, currency: 'EUR', departureTime: '2025-08-04T11:00:00', arrivalTime: '2025-08-04T15:30:00', origin: 'BER', destination: 'ATH', stops: 1, duration: '4h 30m' },
    { airline: 'Lufthansa', price: 245, currency: 'EUR', departureTime: '2025-08-04T08:15:00', arrivalTime: '2025-08-04T12:00:00', origin: 'BER', destination: 'ATH', stops: 0, duration: '3h 45m' },
  ],
  hotels: [
    { name: 'Hermes Hotel', area: 'Syntagma', address: 'Apollonos 19, Athens 105 57', pricePerNight: 142, currency: 'EUR', rating: 8.9, stars: 3, metroStation: 'Syntagma', metroDistance: '3 min', amenities: ['WiFi', 'Breakfast', 'AC', 'Rooftop bar'], highlights: 'Acropolis view from rooftop, next to Plaka', lat: 37.9745, lng: 23.7335 },
    { name: 'Hotel Plaka', area: 'Plaka', address: 'Kapnikareas 7, Athens 105 56', pricePerNight: 135, currency: 'EUR', rating: 8.7, stars: 3, metroStation: 'Monastiraki', metroDistance: '2 min', amenities: ['WiFi', 'Breakfast', 'Rooftop terrace'], highlights: 'Heart of Plaka, rooftop with Acropolis view', lat: 37.9755, lng: 23.7275 },
    { name: 'Electra Palace Athens', area: 'Plaka', address: 'Navarchou Nikodimou 18-20, Athens', pricePerNight: 195, currency: 'EUR', rating: 9.1, stars: 5, metroStation: 'Syntagma', metroDistance: '4 min', amenities: ['Pool', 'Spa', 'Rooftop restaurant', 'WiFi'], highlights: 'Luxury, rooftop pool with Acropolis view', lat: 37.9735, lng: 23.7325 },
  ],
  research: 'Day 1: Visit the Acropolis and Parthenon in the morning. Explore the Acropolis Museum. Afternoon stroll through Plaka neighborhood.\nDay 2: Ancient Agora and National Archaeological Museum. Evening at Monastiraki flea market and Psyrri district.\nDay 3: Day trip to Cape Sounion and the Temple of Poseidon. Sunset views over the Aegean.\nDay 4: Ermou Street shopping, climb Lycabettus Hill for panoramic sunset. Farewell dinner in Plaka.',
  places: [
    { name: 'Acropolis Museum', rating: 4.7, address: 'Dionysiou Areopagitou 15, Athens', summary: 'World-class museum showcasing Parthenon sculptures', mapsUrl: '', lat: 37.9685, lng: 23.7285 },
    { name: 'Plaka District', rating: 4.6, address: 'Plaka, Athens', summary: 'Historic neighborhood with tavernas and shops', mapsUrl: '', lat: 37.9730, lng: 23.7310 },
    { name: 'Athens Central Market', rating: 4.4, address: 'Athinas, Athens 105 51', summary: 'Vibrant market with fresh produce and local delicacies', mapsUrl: '', lat: 37.9785, lng: 23.7265 },
  ],
};

const SANTORINI_DATA: LegMockData = {
  flights: [
    { airline: 'Aegean Airlines', price: 95, currency: 'EUR', departureTime: '2025-08-08T07:00:00', arrivalTime: '2025-08-08T07:50:00', origin: 'ATH', destination: 'JTR', stops: 0, duration: '0h 50m' },
    { airline: 'Olympic Air', price: 85, currency: 'EUR', departureTime: '2025-08-08T14:30:00', arrivalTime: '2025-08-08T15:20:00', origin: 'ATH', destination: 'JTR', stops: 0, duration: '0h 50m' },
    { airline: 'Sky Express', price: 75, currency: 'EUR', departureTime: '2025-08-08T10:00:00', arrivalTime: '2025-08-08T10:55:00', origin: 'ATH', destination: 'JTR', stops: 0, duration: '0h 55m' },
  ],
  hotels: [
    { name: 'Oia Sunset Villas', area: 'Oia', address: 'Oia, Santorini 847 02', pricePerNight: 220, currency: 'EUR', rating: 9.3, stars: 4, metroStation: '-', metroDistance: '-', amenities: ['Pool', 'WiFi', 'Caldera View', 'Breakfast'], highlights: 'Stunning caldera views, infinity pool', lat: 36.4613, lng: 25.3753 },
    { name: 'Fira Palace Hotel', area: 'Fira', address: 'Fira, Santorini 847 00', pricePerNight: 165, currency: 'EUR', rating: 8.8, stars: 4, metroStation: '-', metroDistance: '-', amenities: ['WiFi', 'Breakfast', 'Terrace', 'Pool'], highlights: 'Central Fira location, sea views', lat: 36.4165, lng: 25.4315 },
    { name: 'Astra Suites', area: 'Imerovigli', address: 'Imerovigli, Santorini 847 00', pricePerNight: 280, currency: 'EUR', rating: 9.5, stars: 5, metroStation: '-', metroDistance: '-', amenities: ['Pool', 'Spa', 'WiFi', 'Breakfast', 'Butler'], highlights: 'Luxury suites, best caldera views on the island', lat: 36.4310, lng: 25.4225 },
  ],
  research: 'Day 1: Explore Oia village and its famous blue-domed churches. Watch the legendary sunset at Oia Castle.\nDay 2: Beach day at Red Beach and Perissa Black Sand Beach. Afternoon wine tasting at Santo Wines winery.\nDay 3: Visit the Akrotiri archaeological site (prehistoric Pompeii). Walk along Fira town caldera path. Optional caldera boat tour.',
  places: [
    { name: 'Oia Castle Viewpoint', rating: 4.8, address: 'Oia, Santorini', summary: 'The most famous sunset spot in Greece', mapsUrl: '', lat: 36.4620, lng: 25.3720 },
    { name: 'Red Beach', rating: 4.5, address: 'Akrotiri, Santorini', summary: 'Dramatic volcanic red cliffs and beach', mapsUrl: '', lat: 36.3475, lng: 25.3955 },
    { name: 'Santo Wines Winery', rating: 4.6, address: 'Pyrgos, Santorini', summary: 'Wine tasting with panoramic caldera views', mapsUrl: '', lat: 36.3860, lng: 25.4430 },
  ],
};

const CRETE_DATA: LegMockData = {
  flights: [
    { airline: 'Sky Express', price: 65, currency: 'EUR', departureTime: '2025-08-11T09:00:00', arrivalTime: '2025-08-11T09:45:00', origin: 'JTR', destination: 'HER', stops: 0, duration: '0h 45m' },
    { airline: 'Olympic Air', price: 72, currency: 'EUR', departureTime: '2025-08-11T16:00:00', arrivalTime: '2025-08-11T16:45:00', origin: 'JTR', destination: 'HER', stops: 0, duration: '0h 45m' },
    { airline: 'Aegean Airlines', price: 88, currency: 'EUR', departureTime: '2025-08-11T12:00:00', arrivalTime: '2025-08-11T12:50:00', origin: 'JTR', destination: 'HER', stops: 0, duration: '0h 50m' },
  ],
  hotels: [
    { name: 'GDM Megaron Hotel', area: 'Heraklion Center', address: 'Beaufort 9, Heraklion 712 02', pricePerNight: 110, currency: 'EUR', rating: 8.9, stars: 5, metroStation: '-', metroDistance: '-', amenities: ['Pool', 'Spa', 'WiFi', 'Breakfast', 'Restaurant'], highlights: 'Luxury hotel in Heraklion center, rooftop pool', lat: 35.3405, lng: 25.1335 },
    { name: 'Lato Boutique Hotel', area: 'Heraklion Center', address: 'Epimenidou 15, Heraklion 712 02', pricePerNight: 95, currency: 'EUR', rating: 8.6, stars: 4, metroStation: '-', metroDistance: '-', amenities: ['WiFi', 'Breakfast', 'Sea View'], highlights: 'Venetian harbor views, walking distance to attractions', lat: 35.3425, lng: 25.1355 },
    { name: 'Olive Green Hotel', area: 'Heraklion Center', address: 'Idomeneos 22, Heraklion 712 02', pricePerNight: 85, currency: 'EUR', rating: 8.4, stars: 4, metroStation: '-', metroDistance: '-', amenities: ['WiFi', 'Breakfast', 'Eco-friendly'], highlights: 'Eco-boutique hotel, modern design, central location', lat: 35.3385, lng: 25.1315 },
  ],
  research: 'Day 1: Visit Knossos Palace (Minoan civilization) and the Heraklion Archaeological Museum. Evening walk along the Venetian walls.\nDay 2: Full-day hike through Samaria Gorge (16km, Europe\'s longest gorge). Transport included.\nDay 3: Explore the old town of Chania, its Venetian Harbor, and enjoy fresh seafood at local tavernas.',
  places: [
    { name: 'Knossos Palace', rating: 4.5, address: 'Knossos, Heraklion, Crete', summary: 'Ancient Minoan palace, center of the Minoan civilization', mapsUrl: '', lat: 35.2980, lng: 25.1630 },
    { name: 'Samaria Gorge', rating: 4.7, address: 'Samaria, Chania, Crete', summary: 'Europe\'s longest gorge — spectacular 16km hike', mapsUrl: '', lat: 35.3050, lng: 23.9630 },
    { name: 'Chania Old Town', rating: 4.6, address: 'Old Town, Chania, Crete', summary: 'Venetian harbor, narrow alleys, vibrant atmosphere', mapsUrl: '', lat: 35.5180, lng: 24.0175 },
  ],
};

const MOCK_DATA_BY_DEST: Record<string, LegMockData> = {
  'Athens': ATHENS_DATA,
  'Santorini': SANTORINI_DATA,
  'Crete': CRETE_DATA,
};

/* ---- Return flights (last dest → origin) ---- */

export const MOCK_RETURN_FLIGHTS: FlightResult[] = [
  { airline: 'Aegean Airlines', price: 195, currency: 'EUR', departureTime: '2025-08-14T11:00:00', arrivalTime: '2025-08-14T16:30:00', origin: 'HER', destination: 'BER', stops: 1, duration: '5h 30m' },
  { airline: 'Lufthansa', price: 275, currency: 'EUR', departureTime: '2025-08-14T08:00:00', arrivalTime: '2025-08-14T14:00:00', origin: 'HER', destination: 'BER', stops: 1, duration: '6h 00m' },
  { airline: 'Ryanair', price: 99, currency: 'EUR', departureTime: '2025-08-14T17:00:00', arrivalTime: '2025-08-14T23:30:00', origin: 'HER', destination: 'BER', stops: 1, duration: '6h 30m' },
];

/* ---- Fallback for unknown destinations ---- */

function generateFallbackData(destination: string, destIATA: string, fromIATA: string): LegMockData {
  return {
    flights: [
      { airline: 'Mock Airways', price: 150, currency: 'EUR', departureTime: '2025-08-04T09:00:00', arrivalTime: '2025-08-04T12:00:00', origin: fromIATA, destination: destIATA, stops: 0, duration: '3h 00m' },
      { airline: 'Budget Air', price: 95, currency: 'EUR', departureTime: '2025-08-04T14:00:00', arrivalTime: '2025-08-04T18:00:00', origin: fromIATA, destination: destIATA, stops: 1, duration: '4h 00m' },
    ],
    hotels: [
      { name: `${destination} Central Hotel`, area: 'Center', address: `${destination} City Center`, pricePerNight: 120, currency: 'EUR', rating: 8.5, stars: 4, metroStation: '-', metroDistance: '-', amenities: ['WiFi', 'Breakfast', 'AC'], highlights: 'Central location, modern amenities' },
      { name: `${destination} Budget Inn`, area: 'Center', address: `${destination} Downtown`, pricePerNight: 85, currency: 'EUR', rating: 7.8, stars: 3, metroStation: '-', metroDistance: '-', amenities: ['WiFi', 'AC'], highlights: 'Budget-friendly, clean rooms' },
    ],
    research: `Day 1: Explore ${destination} city center and main attractions. Visit the most popular museums and landmarks.\nDay 2: Day trip to nearby points of interest. Try local cuisine at recommended restaurants.`,
    places: [
      { name: `${destination} Museum`, rating: 4.5, address: `${destination} Center`, summary: 'Must-visit cultural attraction', mapsUrl: '' },
      { name: `${destination} Market`, rating: 4.3, address: `${destination} Old Town`, summary: 'Local market with authentic atmosphere', mapsUrl: '' },
    ],
  };
}

/**
 * Get mock data for a specific leg destination.
 * Falls back to generic data for unknown destinations.
 */
export function getMockLegData(destination: string, destIATA: string, fromIATA: string): LegMockData {
  return MOCK_DATA_BY_DEST[destination] || generateFallbackData(destination, destIATA, fromIATA);
}
