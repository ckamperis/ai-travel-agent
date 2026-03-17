export interface Hotel {
  name: string;
  area: string;
  address: string;
  pricePerNight: number;
  currency: string;
  rating: number;
  stars: number;
  metroStation: string;
  metroDistance: string;
  amenities: string[];
  highlights: string;
  lat?: number;
  lng?: number;
}

/* ── Hotel databases by destination ─────────────────────────────── */

const HOTELS_DB: Record<string, Hotel[]> = {
  athens: [
    { name: "Hermes Hotel", area: "Syntagma", address: "Apollonos 19, Athens 105 57", pricePerNight: 142, currency: "EUR", rating: 8.9, stars: 3, metroStation: "Syntagma", metroDistance: "3 min", amenities: ["WiFi", "Breakfast", "A/C", "Rooftop bar"], highlights: "Acropolis views from rooftop, next to Plaka", lat: 37.9755, lng: 23.7348 },
    { name: "Hotel Plaka", area: "Plaka", address: "Kapnikareas 7, Athens 105 56", pricePerNight: 135, currency: "EUR", rating: 8.7, stars: 3, metroStation: "Monastiraki", metroDistance: "2 min", amenities: ["WiFi", "Breakfast", "Rooftop terrace"], highlights: "Heart of Plaka, rooftop with Acropolis view", lat: 37.9758, lng: 23.7268 },
    { name: "Athens Center Square", area: "Monastiraki", address: "Aristogeitonos 15, Athens 105 52", pricePerNight: 125, currency: "EUR", rating: 8.4, stars: 3, metroStation: "Monastiraki", metroDistance: "1 min", amenities: ["WiFi", "Breakfast", "Restaurant"], highlights: "On Monastiraki Square, ideal for exploring", lat: 37.9762, lng: 23.7255 },
    { name: "Electra Palace Athens", area: "Plaka", address: "Navarchou Nikodimou 18-20, Athens 105 57", pricePerNight: 195, currency: "EUR", rating: 9.1, stars: 5, metroStation: "Syntagma", metroDistance: "4 min", amenities: ["Pool", "Spa", "Rooftop restaurant", "WiFi", "Breakfast"], highlights: "Luxury option, rooftop pool with Acropolis view", lat: 37.9735, lng: 23.7335 },
    { name: "Fresh Hotel", area: "Omonia", address: "Sofokleous 26, Athens 105 52", pricePerNight: 105, currency: "EUR", rating: 8.2, stars: 4, metroStation: "Omonia", metroDistance: "2 min", amenities: ["Pool", "WiFi", "Restaurant", "Rooftop bar"], highlights: "Modern design hotel, rooftop pool, budget-friendly", lat: 37.9810, lng: 23.7280 },
  ],
  rome: [
    { name: "Hotel Raphael", area: "Navona", address: "Largo Febo 2, Roma 00186", pricePerNight: 210, currency: "EUR", rating: 9.0, stars: 5, metroStation: "Spagna", metroDistance: "10 min", amenities: ["WiFi", "Breakfast", "Rooftop terrace", "Spa"], highlights: "Iconic ivy-covered facade, rooftop with St Peter's view", lat: 41.8986, lng: 12.4708 },
    { name: "Hotel Lancelot", area: "Colosseum", address: "Via Capo d'Africa 47, Roma 00184", pricePerNight: 155, currency: "EUR", rating: 8.8, stars: 3, metroStation: "Colosseo", metroDistance: "3 min", amenities: ["WiFi", "Breakfast", "Garden", "A/C"], highlights: "Family-run, steps from the Colosseum", lat: 41.8879, lng: 12.4965 },
    { name: "Hotel Adriano", area: "Pantheon", address: "Via di Pallacorda 2, Roma 00186", pricePerNight: 175, currency: "EUR", rating: 8.6, stars: 4, metroStation: "Spagna", metroDistance: "8 min", amenities: ["WiFi", "Breakfast", "Bar", "A/C"], highlights: "Elegant boutique hotel near the Pantheon", lat: 41.9009, lng: 12.4762 },
    { name: "Roma Luxus Hotel", area: "Repubblica", address: "Via Velletri 39, Roma 00198", pricePerNight: 140, currency: "EUR", rating: 8.3, stars: 4, metroStation: "Repubblica", metroDistance: "2 min", amenities: ["WiFi", "Breakfast", "Fitness", "Restaurant"], highlights: "Modern luxury near Termini, great transport links", lat: 41.9097, lng: 12.4950 },
    { name: "Hotel Santa Maria", area: "Trastevere", address: "Vicolo del Piede 2, Roma 00153", pricePerNight: 165, currency: "EUR", rating: 8.9, stars: 3, metroStation: "Trastevere FS", metroDistance: "5 min", amenities: ["WiFi", "Breakfast", "Garden", "Bikes"], highlights: "Charming courtyard hotel in lively Trastevere", lat: 41.8890, lng: 12.4698 },
  ],
  santorini: [
    { name: "Cosmopolitan Suites", area: "Fira", address: "Fira 847 00, Santorini", pricePerNight: 250, currency: "EUR", rating: 9.2, stars: 4, metroStation: "Fira bus", metroDistance: "2 min", amenities: ["Pool", "WiFi", "Breakfast", "Caldera view"], highlights: "Infinity pool overlooking the caldera", lat: 36.4167, lng: 25.4316 },
    { name: "Katikies Hotel", area: "Oia", address: "Oia 847 02, Santorini", pricePerNight: 380, currency: "EUR", rating: 9.5, stars: 5, metroStation: "Oia bus", metroDistance: "3 min", amenities: ["Pool", "Spa", "WiFi", "Restaurant", "Butler"], highlights: "Iconic luxury cave hotel, famous sunset views", lat: 36.4614, lng: 25.3725 },
    { name: "Hotel Atlantis", area: "Fira", address: "Fira 847 00, Santorini", pricePerNight: 180, currency: "EUR", rating: 8.4, stars: 3, metroStation: "Fira bus", metroDistance: "1 min", amenities: ["WiFi", "Breakfast", "Pool", "A/C"], highlights: "Central location, caldera views at mid-range price", lat: 36.4171, lng: 25.4310 },
    { name: "Astra Suites", area: "Imerovigli", address: "Imerovigli 847 00, Santorini", pricePerNight: 310, currency: "EUR", rating: 9.3, stars: 5, metroStation: "Imerovigli bus", metroDistance: "2 min", amenities: ["Pool", "Spa", "WiFi", "Breakfast", "Gym"], highlights: "Highest point on caldera, stunning panoramic views", lat: 36.4317, lng: 25.4225 },
    { name: "Santorini Palace", area: "Fira", address: "Fira 847 00, Santorini", pricePerNight: 150, currency: "EUR", rating: 8.1, stars: 3, metroStation: "Fira bus", metroDistance: "4 min", amenities: ["Pool", "WiFi", "A/C", "Restaurant"], highlights: "Good value with pool, close to nightlife", lat: 36.4160, lng: 25.4330 },
  ],
  paris: [
    { name: "Hotel Le Marais", area: "Le Marais", address: "16 Rue de Beauce, 75003 Paris", pricePerNight: 185, currency: "EUR", rating: 8.7, stars: 3, metroStation: "Temple", metroDistance: "2 min", amenities: ["WiFi", "Breakfast", "A/C", "Bar"], highlights: "Charming boutique in the trendy Marais district", lat: 48.8650, lng: 2.3620 },
    { name: "Hotel des Arts Montmartre", area: "Montmartre", address: "5 Rue Tholozé, 75018 Paris", pricePerNight: 145, currency: "EUR", rating: 8.5, stars: 3, metroStation: "Abbesses", metroDistance: "3 min", amenities: ["WiFi", "Breakfast", "A/C"], highlights: "Artistic neighbourhood, near Sacré-Coeur", lat: 48.8860, lng: 2.3380 },
    { name: "Hotel Monge", area: "Latin Quarter", address: "55 Rue Monge, 75005 Paris", pricePerNight: 220, currency: "EUR", rating: 9.0, stars: 4, metroStation: "Place Monge", metroDistance: "1 min", amenities: ["WiFi", "Breakfast", "Spa", "A/C", "Bar"], highlights: "Elegant Left Bank hotel near Pantheon", lat: 48.8440, lng: 2.3520 },
    { name: "Generator Paris", area: "Canal St-Martin", address: "9-11 Place du Colonel Fabien, 75010 Paris", pricePerNight: 95, currency: "EUR", rating: 7.8, stars: 2, metroStation: "Colonel Fabien", metroDistance: "1 min", amenities: ["WiFi", "Bar", "Terrace", "Cafe"], highlights: "Stylish budget option, rooftop terrace", lat: 48.8780, lng: 2.3710 },
    { name: "Hotel La Comtesse", area: "Eiffel Tower", address: "29 Avenue de Tourville, 75007 Paris", pricePerNight: 250, currency: "EUR", rating: 8.9, stars: 4, metroStation: "Ecole Militaire", metroDistance: "2 min", amenities: ["WiFi", "Breakfast", "A/C", "Concierge"], highlights: "Eiffel Tower views from upper floors", lat: 48.8550, lng: 2.3050 },
  ],
  london: [
    { name: "The Hoxton Shoreditch", area: "Shoreditch", address: "81 Great Eastern St, London EC2A 3HU", pricePerNight: 165, currency: "GBP", rating: 8.6, stars: 4, metroStation: "Old Street", metroDistance: "3 min", amenities: ["WiFi", "Restaurant", "Bar", "Gym"], highlights: "Trendy East London, great restaurant and bar", lat: 51.5250, lng: -0.0796 },
    { name: "Premier Inn London City", area: "Tower Hill", address: "22-24 Prescot St, London E1 8BB", pricePerNight: 120, currency: "GBP", rating: 8.2, stars: 3, metroStation: "Tower Hill", metroDistance: "2 min", amenities: ["WiFi", "Breakfast", "A/C"], highlights: "Budget-friendly near Tower of London", lat: 51.5115, lng: -0.0706 },
    { name: "The Zetter Townhouse", area: "Clerkenwell", address: "49-50 St John's Sq, London EC1V 4JJ", pricePerNight: 240, currency: "GBP", rating: 9.1, stars: 4, metroStation: "Farringdon", metroDistance: "3 min", amenities: ["WiFi", "Bar", "Concierge", "A/C"], highlights: "Quirky boutique with award-winning cocktail bar", lat: 51.5225, lng: -0.1028 },
    { name: "Hub by Premier Inn Westminster", area: "Westminster", address: "30 Whitehall, London SW1A 2BD", pricePerNight: 140, currency: "GBP", rating: 8.4, stars: 3, metroStation: "Westminster", metroDistance: "1 min", amenities: ["WiFi", "A/C", "Smart room controls"], highlights: "Central location, views of Big Ben", lat: 51.5064, lng: -0.1263 },
    { name: "The Savoy", area: "Strand", address: "Strand, London WC2R 0EZ", pricePerNight: 450, currency: "GBP", rating: 9.4, stars: 5, metroStation: "Charing Cross", metroDistance: "2 min", amenities: ["Pool", "Spa", "WiFi", "Restaurant", "Bar", "Gym"], highlights: "Iconic luxury on the Thames", lat: 51.5096, lng: -0.1204 },
  ],
};

/* Destination name → key resolver */
function resolveDestination(destination: string): string {
  const lower = destination.toLowerCase().replace(/[^a-z]/g, '');
  for (const key of Object.keys(HOTELS_DB)) {
    if (lower.includes(key)) return key;
  }
  return '';
}

/* ── Public API ─────────────────────────────────────────────────── */

export function getHotels(
  budget?: { min: number; max: number },
  destination?: string
): Hotel[] {
  const key = destination ? resolveDestination(destination) : 'athens';
  const hotels = HOTELS_DB[key] || HOTELS_DB.athens;

  if (!budget || (budget.min === 0 && budget.max === 0)) return hotels;

  const filtered = hotels.filter(
    (h) => h.pricePerNight >= budget.min && h.pricePerNight <= budget.max * 1.2
  );

  // If budget filter is too restrictive, return all hotels for this destination
  return filtered.length > 0 ? filtered : hotels;
}
