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
}

const ATHENS_HOTELS: Hotel[] = [
  {
    name: "Hermes Hotel",
    area: "Σύνταγμα",
    address: "Apollonos 19, Athens 105 57",
    pricePerNight: 142,
    currency: "EUR",
    rating: 8.9,
    stars: 3,
    metroStation: "Σύνταγμα",
    metroDistance: "3 λεπτά",
    amenities: ["WiFi", "Breakfast", "Air conditioning", "Rooftop bar"],
    highlights: "Θέα στην Ακρόπολη από το rooftop, δίπλα στην Πλάκα",
  },
  {
    name: "Hotel Plaka",
    area: "Πλάκα",
    address: "Kapnikareas 7, Athens 105 56",
    pricePerNight: 135,
    currency: "EUR",
    rating: 8.7,
    stars: 3,
    metroStation: "Μοναστηράκι",
    metroDistance: "2 λεπτά",
    amenities: ["WiFi", "Breakfast", "Rooftop terrace"],
    highlights: "Στην καρδιά της Πλάκας, rooftop με θέα Ακρόπολη",
  },
  {
    name: "Athens Center Square",
    area: "Μοναστηράκι",
    address: "Aristogeitonos 15, Athens 105 52",
    pricePerNight: 125,
    currency: "EUR",
    rating: 8.4,
    stars: 3,
    metroStation: "Μοναστηράκι",
    metroDistance: "1 λεπτό",
    amenities: ["WiFi", "Breakfast", "Restaurant"],
    highlights: "Πάνω στο Μοναστηράκι, ιδανικό για εξερεύνηση",
  },
  {
    name: "Electra Palace Athens",
    area: "Πλάκα",
    address: "Navarchou Nikodimou 18-20, Athens 105 57",
    pricePerNight: 195,
    currency: "EUR",
    rating: 9.1,
    stars: 5,
    metroStation: "Σύνταγμα",
    metroDistance: "4 λεπτά",
    amenities: ["Pool", "Spa", "Rooftop restaurant", "WiFi", "Breakfast"],
    highlights: "Luxury option, πισίνα στο rooftop με θέα Ακρόπολη",
  },
  {
    name: "Fresh Hotel",
    area: "Ομόνοια",
    address: "Sofokleous 26, Athens 105 52",
    pricePerNight: 105,
    currency: "EUR",
    rating: 8.2,
    stars: 4,
    metroStation: "Ομόνοια",
    metroDistance: "2 λεπτά",
    amenities: ["Pool", "WiFi", "Restaurant", "Rooftop bar"],
    highlights: "Modern design hotel, rooftop pool, budget-friendly",
  },
];

export function getHotels(budget?: { min: number; max: number }): Hotel[] {
  if (!budget) return ATHENS_HOTELS;

  return ATHENS_HOTELS.filter(
    (h) => h.pricePerNight >= budget.min && h.pricePerNight <= budget.max
  );
}
