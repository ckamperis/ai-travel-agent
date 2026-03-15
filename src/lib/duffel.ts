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

const MOCK_FLIGHTS: FlightOffer[] = [
  {
    airline: "Aegean Airlines",
    price: 289,
    currency: "EUR",
    departureTime: "2025-08-04T06:30:00",
    arrivalTime: "2025-08-04T10:45:00",
    origin: "HAM",
    destination: "ATH",
    stops: 0,
    duration: "3h 15m",
    segments: [
      { carrier: "Aegean Airlines", origin: "HAM", destination: "ATH", departureTime: "2025-08-04T06:30:00", arrivalTime: "2025-08-04T10:45:00" },
    ],
  },
  {
    airline: "Lufthansa",
    price: 342,
    currency: "EUR",
    departureTime: "2025-08-04T07:15:00",
    arrivalTime: "2025-08-04T13:20:00",
    origin: "HAM",
    destination: "ATH",
    stops: 1,
    duration: "5h 05m",
    segments: [
      { carrier: "Lufthansa", origin: "HAM", destination: "MUC", departureTime: "2025-08-04T07:15:00", arrivalTime: "2025-08-04T08:30:00" },
      { carrier: "Lufthansa", origin: "MUC", destination: "ATH", departureTime: "2025-08-04T09:45:00", arrivalTime: "2025-08-04T13:20:00" },
    ],
  },
  {
    airline: "Ryanair",
    price: 178,
    currency: "EUR",
    departureTime: "2025-08-04T05:50:00",
    arrivalTime: "2025-08-04T10:10:00",
    origin: "HAM",
    destination: "ATH",
    stops: 0,
    duration: "3h 20m",
    segments: [
      { carrier: "Ryanair", origin: "HAM", destination: "ATH", departureTime: "2025-08-04T05:50:00", arrivalTime: "2025-08-04T10:10:00" },
    ],
  },
];

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
    console.warn("DUFFEL_API_KEY not set — returning mock flights");
    return MOCK_FLIGHTS;
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
      return MOCK_FLIGHTS;
    }

    const json = await res.json();
    const offers = json.data?.offers ?? [];

    if (offers.length === 0) {
      console.warn("Duffel returned no offers — using mock data");
      return MOCK_FLIGHTS;
    }

    const parsed = offers.map(parseOffer);
    parsed.sort((a: FlightOffer, b: FlightOffer) => a.price - b.price);
    return parsed.slice(0, 5);
  } catch (error) {
    console.error("Duffel API call failed:", error);
    return MOCK_FLIGHTS;
  }
}
