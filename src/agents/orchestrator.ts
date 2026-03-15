import { AgentEvent, AgentName, AgentStatus, EmailAnalysis, AllAgentResults } from "./types";
import { analyzeEmail } from "./email-analyzer";
import { searchFlights } from "./flight-agent";
import { searchHotels } from "./hotel-agent";
import { researchDestination } from "./research-agent";
import { searchPlaces } from "./places-agent";
import { composeResponse } from "./composer-agent";

function makeEvent(
  agent: AgentName,
  status: AgentStatus,
  message: string,
  data?: unknown
): AgentEvent {
  return { agent, status, message, data, timestamp: Date.now() };
}

export async function* orchestrate(emailText: string): AsyncGenerator<AgentEvent> {
  // ── Phase 1: Email Analysis (sequential) ──────────────────────────
  yield makeEvent("email", "started", "Ανάλυση email πελάτη...");

  let analysis: EmailAnalysis;
  try {
    analysis = await analyzeEmail(emailText);
    yield makeEvent("email", "done", "Ανάλυση ολοκληρώθηκε", analysis);
  } catch {
    yield makeEvent("email", "error", "Σφάλμα στην ανάλυση email");
    return;
  }

  // ── Phase 2: Parallel Agents ──────────────────────────────────────
  yield makeEvent("flight", "started", "Αναζήτηση πτήσεων...");
  yield makeEvent("hotel", "started", "Αναζήτηση ξενοδοχείων...");
  yield makeEvent("research", "started", "Έρευνα προορισμού...");
  yield makeEvent("places", "started", "Αναζήτηση τοποθεσιών...");

  // Event queue with notification — yields events as each agent completes
  const arrivals: AgentEvent[] = [];
  let notifyResolve: (() => void) | null = null;

  const notify = () => {
    if (notifyResolve) {
      notifyResolve();
      notifyResolve = null;
    }
  };

  const waitForArrival = (): Promise<void> => {
    if (arrivals.length > yielded) return Promise.resolve();
    return new Promise((r) => { notifyResolve = r; });
  };

  const allResults: AllAgentResults = {
    emailAnalysis: analysis,
    flights: [],
    hotels: [],
    research: "",
    places: [],
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
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (allResults as any)[key] = data;
      arrivals.push(makeEvent(name, "done", doneMsg, data));
    } catch {
      arrivals.push(makeEvent(name, "error", `Σφάλμα: ${name}`));
    }
    notify();
  };

  // Fire all 4 in parallel (no await — they run concurrently)
  runAgent("flight", () => searchFlights(analysis), "Βρέθηκαν πτήσεις", "flights");
  runAgent("hotel", () => searchHotels(analysis), "Βρέθηκαν ξενοδοχεία", "hotels");
  runAgent("research", () => researchDestination(analysis), "Έρευνα ολοκληρώθηκε", "research");
  runAgent("places", () => searchPlaces(analysis), "Βρέθηκαν τοποθεσίες", "places");

  // Yield events as they arrive (real-time, not waiting for all to finish)
  let yielded = 0;
  while (yielded < 4) {
    await waitForArrival();
    while (yielded < arrivals.length) {
      yield arrivals[yielded];
      yielded++;
    }
  }

  // ── Phase 3: Compose Response (streaming) ─────────────────────────
  yield makeEvent("composer", "started", "Σύνθεση απάντησης...");

  try {
    const stream = composeResponse(allResults, emailText);
    for await (const chunk of stream) {
      yield makeEvent("composer", "working", chunk);
    }
    yield makeEvent("composer", "done", "Η απάντηση είναι έτοιμη");
  } catch {
    yield makeEvent("composer", "error", "Σφάλμα στη σύνθεση απάντησης");
  }
}
