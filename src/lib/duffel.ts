export interface FlightOffer {
  airline: string;
  price: number;
  currency: string;
  departureTime: string;
  arrivalTime: string;
  origin: string;
  destination: string;
  stops: number;
  duration: string;
  segments: FlightSegment[];
}

export interface FlightSegment {
  carrier: string;
  origin: string;
  destination: string;
  departureTime: string;
  arrivalTime: string;
}

/* ── Dynamic mock flight generator ─────────────────────────────── */

const AIRLINES = [
  "Aegean Airlines", "Lufthansa", "Ryanair", "Austrian Airlines",
  "EasyJet", "Vueling", "Air France", "KLM", "Swiss", "Turkish Airlines",
  "ITA Airways", "Iberia", "TAP Portugal", "Wizz Air", "SAS",
];

const HUBS = ["MUC", "FRA", "VIE", "ZRH", "IST", "CDG", "AMS", "FCO", "MAD"];

function generateMockFlights(
  origin: string,
  destination: string,
  departureDate: string
): FlightOffer[] {
  const date = departureDate || new Date().toISOString().split("T")[0];

  // Pick 3-4 airlines (seeded by route so same route = same results)
  const seed = (origin + destination).split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const pick = (arr: string[], n: number) => {
    const shuffled = [...arr].sort((a, b) => {
      const ha = (seed * a.charCodeAt(0)) % 997;
      const hb = (seed * b.charCodeAt(0)) % 997;
      return ha - hb;
    });
    return shuffled.slice(0, n);
  };

  const airlines = pick(AIRLINES, 4);
  const hub = HUBS[seed % HUBS.length];

  const flights: FlightOffer[] = [];

  // Unique time slots spread across the day
  // Early morning direct
  flights.push({
    airline: airlines[0],
    price: 145 + (seed % 85),
    currency: "EUR",
    departureTime: `${date}T06:15:00`,
    arrivalTime: `${date}T09:50:00`,
    origin, destination, stops: 0, duration: "3h 35m",
    segments: [{ carrier: airlines[0], origin, destination, departureTime: `${date}T06:15:00`, arrivalTime: `${date}T09:50:00` }],
  });

  // Morning with connection
  flights.push({
    airline: airlines[1],
    price: 210 + (seed % 130),
    currency: "EUR",
    departureTime: `${date}T08:40:00`,
    arrivalTime: `${date}T14:25:00`,
    origin, destination, stops: 1, duration: "5h 45m",
    segments: [
      { carrier: airlines[1], origin, destination: hub, departureTime: `${date}T08:40:00`, arrivalTime: `${date}T10:10:00` },
      { carrier: airlines[1], origin: hub, destination, departureTime: `${date}T11:30:00`, arrivalTime: `${date}T14:25:00` },
    ],
  });

  // Late morning direct
  flights.push({
    airline: airlines[2],
    price: 175 + (seed % 100),
    currency: "EUR",
    departureTime: `${date}T11:20:00`,
    arrivalTime: `${date}T15:00:00`,
    origin, destination, stops: 0, duration: "3h 40m",
    segments: [{ carrier: airlines[2], origin, destination, departureTime: `${date}T11:20:00`, arrivalTime: `${date}T15:00:00` }],
  });

  // Afternoon direct
  flights.push({
    airline: airlines[3],
    price: 255 + (seed % 95),
    currency: "EUR",
    departureTime: `${date}T15:50:00`,
    arrivalTime: `${date}T19:30:00`,
    origin, destination, stops: 0, duration: "3h 40m",
    segments: [{ carrier: airlines[3], origin, destination, departureTime: `${date}T15:50:00`, arrivalTime: `${date}T19:30:00` }],
  });

  flights.sort((a, b) => a.price - b.price);
  return flights;
}

/* ── Duffel API ────────────────────────────────────────────────── */

function calculateDuration(departureAt: string, arrivalAt: string): string {
  const dep = new Date(departureAt);
  const arr = new Date(arrivalAt);
  const diffMs = arr.getTime() - dep.getTime();
  const hours = Math.floor(diffMs / (1000 * 60 * 60));
  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  return `${hours}h ${String(minutes).padStart(2, "0")}m`;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function parseOffer(offer: any): FlightOffer {
  const firstSlice = offer.slices?.[0];
  const segments: FlightSegment[] = (firstSlice?.segments ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (seg: any) => ({
      carrier: seg.marketing_carrier?.name ?? seg.operating_carrier?.name ?? "Unknown",
      origin: seg.origin?.iata_code ?? "",
      destination: seg.destination?.iata_code ?? "",
      departureTime: seg.departing_at ?? "",
      arrivalTime: seg.arriving_at ?? "",
    })
  );

  const firstSeg = segments[0];
  const lastSeg = segments[segments.length - 1];

  return {
    airline: offer.owner?.name ?? "Unknown Airline",
    price: parseFloat(offer.total_amount ?? "0"),
    currency: offer.total_currency ?? "EUR",
    departureTime: firstSeg?.departureTime ?? "",
    arrivalTime: lastSeg?.arrivalTime ?? "",
    origin: firstSeg?.origin ?? "",
    destination: lastSeg?.destination ?? "",
    stops: Math.max(0, segments.length - 1),
    duration: firstSeg && lastSeg
      ? calculateDuration(firstSeg.departureTime, lastSeg.arrivalTime)
      : "N/A",
    segments,
  };
}

export async function searchFlights(
  origin: string,
  destination: string,
  departureDate: string,
  adults: number = 2
): Promise<FlightOffer[]> {
  const apiKey = process.env.DUFFEL_API_KEY;
  if (!apiKey) {
    console.warn("DUFFEL_API_KEY not set — returning dynamic mock flights");
    return generateMockFlights(origin, destination, departureDate);
  }

  try {
    const passengers = Array.from({ length: adults }, () => ({ type: "adult" }));

    const res = await fetch("https://api.duffel.com/air/offer_requests", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Duffel-Version": "v2",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        data: {
          slices: [{ origin, destination, departure_date: departureDate }],
          passengers,
          cabin_class: "economy",
        },
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      console.error(`Duffel API error ${res.status}: ${errorText}`);
      return generateMockFlights(origin, destination, departureDate);
    }

    const json = await res.json();
    const offers = json.data?.offers ?? [];

    if (offers.length === 0) {
      console.warn("Duffel returned no offers — using dynamic mock data");
      return generateMockFlights(origin, destination, departureDate);
    }

    const parsed = offers.map(parseOffer);
    parsed.sort((a: FlightOffer, b: FlightOffer) => a.price - b.price);
    return parsed.slice(0, 5);
  } catch (error) {
    console.error("Duffel API call failed:", error);
    return generateMockFlights(origin, destination, departureDate);
  }
}
