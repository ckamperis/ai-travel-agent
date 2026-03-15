'use client';

/* ---------- Types ---------- */

interface FlightResult {
  airline: string;
  departure: string;
  arrival: string;
  stops: number;
  price: string;
  isBest?: boolean;
}

interface HotelResult {
  name: string;
  area: string;
  pricePerNight: number;
  rating: number;
  stars: number;
  metroStation: string;
  metroDistance: string;
}

interface PlaceResult {
  name: string;
  rating: number;
  category: string;
  address: string;
}

interface ResearchDay {
  day: string;
  description: string;
}

interface ResultsPanelProps {
  flights: FlightResult[] | null;
  hotels: HotelResult[] | null;
  places: PlaceResult[] | null;
  research: ResearchDay[] | null;
}

/* ---------- Sub-components ---------- */

function FlightsTable({ flights }: { flights: FlightResult[] }) {
  return (
    <div className="animate-fade-in-up glass-card overflow-hidden stagger-1">
      <div className="flex items-center gap-2 border-b border-card-border px-5 py-3">
        <span className="text-lg">✈️</span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-cyan">
          Πτήσεις
        </h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-card-border text-left text-xs uppercase tracking-wider text-foreground/40">
              <th className="px-5 py-3">Αεροπορική</th>
              <th className="px-5 py-3">Αναχώρηση</th>
              <th className="px-5 py-3">Άφιξη</th>
              <th className="px-5 py-3">Στάσεις</th>
              <th className="px-5 py-3 text-right">Τιμή</th>
            </tr>
          </thead>
          <tbody>
            {flights.map((f, i) => (
              <tr
                key={i}
                className={`border-b border-card-border/50 transition-colors hover:bg-cyan/5 ${
                  f.isBest ? 'bg-cyan/10' : ''
                }`}
              >
                <td className="px-5 py-3 font-medium">
                  {f.isBest && (
                    <span className="mr-2 inline-block rounded bg-cyan/20 px-1.5 py-0.5 text-[10px] font-bold uppercase text-cyan">
                      Best
                    </span>
                  )}
                  {f.airline}
                </td>
                <td className="px-5 py-3 tabular-nums text-foreground/70">
                  {f.departure}
                </td>
                <td className="px-5 py-3 tabular-nums text-foreground/70">
                  {f.arrival}
                </td>
                <td className="px-5 py-3 text-foreground/70">
                  {f.stops === 0 ? 'Απευθείας' : `${f.stops} στάση`}
                </td>
                <td
                  className={`px-5 py-3 text-right font-semibold tabular-nums ${
                    f.isBest ? 'text-cyan' : 'text-foreground/80'
                  }`}
                >
                  {f.price}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function HotelCards({ hotels }: { hotels: HotelResult[] }) {
  return (
    <div className="animate-fade-in-up stagger-2">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">🏨</span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-amber">
          Ξενοδοχεία
        </h3>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {hotels.map((h, i) => (
          <div key={i} className="glass-card p-4 transition-all duration-300 hover:border-amber/40">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="font-semibold text-foreground">{h.name}</h4>
                <p className="mt-0.5 text-xs text-foreground/50">{h.area}</p>
              </div>
              <div className="flex items-center gap-1 rounded-lg bg-amber/15 px-2 py-1 text-xs font-bold text-amber">
                ★ {h.rating}
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between border-t border-card-border/50 pt-3">
              <div className="flex items-center gap-1 text-xs text-foreground/50">
                🚇 {h.metroStation} ({h.metroDistance})
              </div>
              <div className="text-base font-bold text-amber">
                {h.pricePerNight}€
                <span className="text-xs font-normal text-foreground/40">
                  /βράδυ
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function PlacesList({ places }: { places: PlaceResult[] }) {
  return (
    <div className="animate-fade-in-up stagger-3">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">📍</span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-purple">
          Αξιοθέατα & Εστιατόρια
        </h3>
      </div>
      <div className="glass-card divide-y divide-card-border/50">
        {places.map((p, i) => (
          <div key={i} className="flex items-center justify-between px-5 py-3">
            <div>
              <span className="font-medium text-foreground">{p.name}</span>
              <span className="ml-2 rounded bg-purple/15 px-2 py-0.5 text-[10px] uppercase tracking-wider text-purple">
                {p.category}
              </span>
              <p className="mt-0.5 text-xs text-foreground/40">{p.address}</p>
            </div>
            <div className="flex items-center gap-1 text-sm font-semibold text-purple">
              ★ {p.rating}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ResearchPreview({ research }: { research: ResearchDay[] }) {
  return (
    <div className="animate-fade-in-up stagger-4">
      <div className="mb-3 flex items-center gap-2">
        <span className="text-lg">🔍</span>
        <h3 className="text-sm font-bold uppercase tracking-wider text-green">
          Πρόγραμμα Ταξιδιού
        </h3>
      </div>
      <div className="glass-card divide-y divide-card-border/50">
        {research.slice(0, 4).map((r, i) => (
          <div key={i} className="px-5 py-3">
            <span className="mr-2 inline-block rounded bg-green/15 px-2 py-0.5 text-xs font-bold text-green">
              {r.day}
            </span>
            <span className="text-sm text-foreground/70">{r.description}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------- Main component ---------- */

export default function ResultsPanel({
  flights,
  hotels,
  places,
  research,
}: ResultsPanelProps) {
  const hasAny = flights || hotels || places || research;
  if (!hasAny) return null;

  return (
    <div className="mx-auto w-full max-w-5xl space-y-5">
      {flights && <FlightsTable flights={flights} />}
      {hotels && <HotelCards hotels={hotels} />}
      {places && <PlacesList places={places} />}
      {research && <ResearchPreview research={research} />}
    </div>
  );
}
