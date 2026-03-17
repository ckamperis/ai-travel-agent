import { AgentEvent, AgentName, AgentStatus, EmailAnalysis } from "./types";
import { analyzeEmail } from "./email-analyzer";
import { searchFlights } from "./flight-agent";
import { searchHotels } from "./hotel-agent";
import { researchDestination } from "./research-agent";
import { searchPlaces } from "./places-agent";

function makeEvent(
  agent: AgentName,
  status: AgentStatus,
  message: string,
  data?: unknown,
  source?: 'live' | 'mock'
): AgentEvent {
  return { agent, status, message, data, source, timestamp: Date.now() };
}

function getAgentSource(agent: AgentName): 'live' | 'mock' {
  switch (agent) {
    case 'email': return process.env.OPENAI_API_KEY ? 'live' : 'mock';
    case 'flight': return process.env.DUFFEL_API_KEY ? 'live' : 'mock';
    case 'hotel': return 'mock';
    case 'research': return process.env.OPENAI_API_KEY ? 'live' : 'mock';
    case 'places': return process.env.GOOGLE_PLACES_API_KEY ? 'live' : 'mock';
    default: return 'mock';
  }
}

export async function* orchestrate(emailText: string): AsyncGenerator<AgentEvent> {
  // ── Phase 1: Email Analysis (sequential) ──────────────────────────
  yield makeEvent("email", "started", "Reading and understanding the request...");

  let analysis: EmailAnalysis;
  try {
    analysis = await analyzeEmail(emailText);
    yield makeEvent("email", "done", "Analysis complete", analysis, getAgentSource("email"));
  } catch {
    yield makeEvent("email", "error", "Email analysis failed");
    return;
  }

  // ── Phase 2: Parallel Agents ──────────────────────────────────────
  yield makeEvent("flight", "started", `Duffel API: ${analysis.originIATA} \u2192 ${analysis.destinationIATA}`);
  yield makeEvent("hotel", "started", `Hotels in ${analysis.destination}`);
  yield makeEvent("research", "started", `GPT-4o: ${analysis.dates.duration}-day itinerary for ${analysis.destination}`);
  yield makeEvent("places", "started", `Google Places: ${analysis.destination}`);

  const arrivals: AgentEvent[] = [];
  let notifyResolve: (() => void) | null = null;

  const notify = () => {
    if (notifyResolve) {
      notifyResolve();
      notifyResolve = null;
    }
  };

  let yielded = 0;
  const waitForArrival = (): Promise<void> => {
    if (arrivals.length > yielded) return Promise.resolve();
    return new Promise((r) => { notifyResolve = r; });
  };

  type ResultKey = "flights" | "hotels" | "research" | "places";

  const runAgent = async (
    name: AgentName,
    fn: () => Promise<unknown>,
    doneMsg: string,
    key: ResultKey
  ) => {
    try {
      const data = await fn();
      arrivals.push(makeEvent(name, "done", doneMsg, data, getAgentSource(name)));
    } catch {
      arrivals.push(makeEvent(name, "error", `Agent failed: ${name}`));
    }
    notify();
  };

  runAgent("flight", () => searchFlights(analysis), "Flights found", "flights");
  runAgent("hotel", () => searchHotels(analysis), "Hotels found", "hotels");
  runAgent("research", () => researchDestination(analysis), "Research complete", "research");
  runAgent("places", () => searchPlaces(analysis), "Places found", "places");

  while (yielded < 4) {
    await waitForArrival();
    while (yielded < arrivals.length) {
      yield arrivals[yielded];
      yielded++;
    }
  }
}
