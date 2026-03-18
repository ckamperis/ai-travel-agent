export type AgentName = "email" | "flight" | "hotel" | "research" | "places" | "composer";
export type AgentStatus = "started" | "working" | "done" | "error";

export interface AgentEvent {
  agent: AgentName;
  status: AgentStatus;
  message: string;
  data?: unknown;
  source?: 'live' | 'mock';
  timestamp: number;
}

export interface EmailAnalysis {
  origin: string;
  originIATA: string;
  destination: string;
  destinationIATA: string;
  dates: { start: string; end: string; duration: number };
  travelers: { adults: number; children: number; names: string[] };
  budget: { min: number; max: number; currency: string };
  interests: string[];
  language: string;
  specialRequests: string[];
  customerName?: string;
  legs?: LegAnalysis[];
}

export interface FlightResult {
  airline: string;
  price: number;
  currency: string;
  departureTime: string;
  arrivalTime: string;
  origin: string;
  destination: string;
  stops: number;
  duration: string;
}

export interface HotelResult {
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

export interface PlaceResult {
  name: string;
  rating: number | null;
  address: string;
  summary: string;
  mapsUrl: string;
  lat?: number;
  lng?: number;
}

export interface LegAnalysis {
  destination: string;
  destinationIATA: string;
  nights: number;
  budget: { min: number; max: number; currency: string };
  interests: string[];
}

export interface AllAgentResults {
  emailAnalysis: EmailAnalysis;
  flights: FlightResult[];
  hotels: HotelResult[];
  research: string;
  places: PlaceResult[];
}
