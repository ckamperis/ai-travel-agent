import { AgentEvent, AgentName, AgentStatus, EmailAnalysis, TripLeg } from "./types";
import { analyzeEmail } from "./email-analyzer";
import { searchFlights, type FlightSearchResult } from "./flight-agent";
import { searchHotels, type HotelSearchResult } from "./hotel-agent";
import { researchDestination } from "./research-agent";
import { searchPlaces } from "./places-agent";

function makeEvent(
  agent: AgentName,
  status: AgentStatus,
  message: string,
  data?: unknown,
  source?: 'live' | 'ai' | 'mock',
  legIndex?: number
): AgentEvent {
  const event: AgentEvent = { agent, status, message, data, source, timestamp: Date.now() };
  if (legIndex !== undefined) event.legIndex = legIndex;
  return event;
}

function getAgentSource(agent: AgentName): 'live' | 'ai' | 'mock' {
  switch (agent) {
    case 'email': return process.env.OPENAI_API_KEY ? 'live' : 'mock';
    case 'flight': return process.env.RAPIDAPI_KEY ? 'live' : process.env.OPENAI_API_KEY ? 'ai' : 'mock';
    case 'hotel': return process.env.RAPIDAPI_KEY ? 'live' : process.env.OPENAI_API_KEY ? 'ai' : 'mock';
    case 'research': return process.env.OPENAI_API_KEY ? 'live' : 'mock';
    case 'places': return process.env.GOOGLE_PLACES_API_KEY ? 'live' : 'mock';
    default: return 'mock';
  }
}

export async function* orchestrate(
  emailText: string,
  mode: 'full' | 'analyze' | 'search' = 'full',
  preAnalysis?: EmailAnalysis
): AsyncGenerator<AgentEvent> {
  // ── Phase 1: Email Analysis ──────────────────────────────────────
  let analysis: EmailAnalysis;

  if (mode === 'search' && preAnalysis) {
    // Skip email analysis — use the pre-supplied analysis directly
    analysis = preAnalysis;
    yield makeEvent("email", "done", "Using previous analysis", analysis, getAgentSource("email"));
  } else {
    // Run email analysis
    yield makeEvent("email", "started", "Reading and understanding the request...");

    try {
      analysis = await analyzeEmail(emailText);
      yield makeEvent("email", "done", "Analysis complete", analysis, getAgentSource("email"));
    } catch {
      yield makeEvent("email", "error", "Email analysis failed");
      return;
    }

    // If mode is 'analyze', stop here — only email analysis was requested
    if (mode === 'analyze') {
      return;
    }
  }

  // ── Phase 2: Parallel Agents ──────────────────────────────────────
  console.log(`[Orchestrator] Dispatching agents for: ${analysis.origin}(${analysis.originIATA}) → ${analysis.destination}(${analysis.destinationIATA}), ${analysis.dates.duration} days`);
  yield makeEvent("flight", "started", `Sky Scrapper: ${analysis.originIATA} → ${analysis.destinationIATA}`);
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

  const runAgent = async (
    name: AgentName,
    fn: () => Promise<unknown>,
    doneMsg: string,
  ) => {
    try {
      const data = await fn();
      arrivals.push(makeEvent(name, "done", doneMsg, data, getAgentSource(name)));
    } catch {
      arrivals.push(makeEvent(name, "error", `Agent failed: ${name}`));
    }
    notify();
  };

  // Flight agent returns { flights, source } — unwrap and use actual source
  (async () => {
    try {
      const result: FlightSearchResult = await searchFlights(analysis);
      arrivals.push(makeEvent("flight", "done", "Flights found", result.flights, result.source));
    } catch {
      arrivals.push(makeEvent("flight", "error", "Agent failed: flight"));
    }
    notify();
  })();
  // Hotel agent returns { hotels, source } — unwrap and use actual source
  (async () => {
    try {
      const result: HotelSearchResult = await searchHotels(analysis);
      arrivals.push(makeEvent("hotel", "done", "Hotels found", result.hotels, result.source));
    } catch {
      arrivals.push(makeEvent("hotel", "error", "Agent failed: hotel"));
    }
    notify();
  })();
  runAgent("research", () => researchDestination(analysis), "Research complete");
  runAgent("places", () => searchPlaces(analysis), "Places found");

  while (yielded < 4) {
    await waitForArrival();
    while (yielded < arrivals.length) {
      yield arrivals[yielded];
      yielded++;
    }
  }
}

/**
 * Build a per-leg EmailAnalysis from the base analysis and a TripLeg.
 * originIATA for leg 0 = trip origin; for leg N = leg[N-1].destinationIATA.
 */
function buildLegAnalysis(
  base: EmailAnalysis,
  leg: TripLeg,
  legIndex: number,
  legs: TripLeg[],
  startDate: string
): EmailAnalysis {
  const origin = legIndex === 0
    ? base.origin
    : legs[legIndex - 1].destination;
  const originIATA = legIndex === 0
    ? base.originIATA
    : legs[legIndex - 1].destinationIATA;

  const start = new Date(startDate);
  // Offset start by sum of previous legs' nights
  for (let i = 0; i < legIndex; i++) {
    start.setDate(start.getDate() + legs[i].nights);
  }
  const end = new Date(start);
  end.setDate(end.getDate() + leg.nights);

  return {
    ...base,
    origin,
    originIATA,
    destination: leg.destination,
    destinationIATA: leg.destinationIATA,
    dates: {
      start: start.toISOString().split('T')[0],
      end: end.toISOString().split('T')[0],
      duration: leg.nights,
    },
    budget: leg.budget,
    interests: leg.interests.length > 0 ? leg.interests : base.interests,
    legs: undefined, // per-leg analysis doesn't carry nested legs
  };
}

/**
 * Multi-leg orchestration: runs all legs in parallel, each leg runs its
 * 4 agents (flight, hotel, research, places) in parallel internally.
 * Also adds a return flight from the last leg back to origin.
 */
export async function* orchestrateMultiLeg(
  emailText: string,
  mode: 'full' | 'analyze' | 'search' = 'full',
  preAnalysis?: EmailAnalysis
): AsyncGenerator<AgentEvent> {
  // ── Phase 1: Email Analysis ──────────────────────────────────────
  let analysis: EmailAnalysis;

  if (mode === 'search' && preAnalysis) {
    analysis = preAnalysis;
    yield makeEvent("email", "done", "Using previous analysis", analysis, getAgentSource("email"));
  } else {
    yield makeEvent("email", "started", "Reading and understanding the request...");
    try {
      analysis = await analyzeEmail(emailText);
      yield makeEvent("email", "done", "Analysis complete", analysis, getAgentSource("email"));
    } catch {
      yield makeEvent("email", "error", "Email analysis failed");
      return;
    }
    if (mode === 'analyze') return;
  }

  // If not actually multi-leg, delegate to regular orchestrate
  if (!analysis.legs || analysis.legs.length <= 1) {
    // Re-yield the analysis events won't work since we already yielded them.
    // Just run the agent phase from the regular orchestrate logic.
    yield* orchestrateSingleLegAgents(analysis);
    return;
  }

  const legs = analysis.legs;
  console.log(`[Orchestrator] Multi-leg trip: ${legs.length} destinations — ${legs.map(l => l.destination).join(' → ')}`);

  // ── Phase 2: Parallel per-leg agents ────────────────────────────
  const totalAgents = legs.length * 4 + 1; // 4 agents per leg + 1 return flight
  const arrivals: AgentEvent[] = [];
  let notifyResolve: (() => void) | null = null;
  let yielded = 0;

  const notify = () => {
    if (notifyResolve) { notifyResolve(); notifyResolve = null; }
  };
  const waitForArrival = (): Promise<void> => {
    if (arrivals.length > yielded) return Promise.resolve();
    return new Promise((r) => { notifyResolve = r; });
  };

  const pushEvent = (event: AgentEvent) => {
    arrivals.push(event);
    notify();
  };

  // Emit started events for all legs
  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const fromIATA = i === 0 ? analysis.originIATA : legs[i - 1].destinationIATA;
    yield makeEvent("flight", "started", `Leg ${i + 1}: ${fromIATA} → ${leg.destinationIATA}`, undefined, undefined, i);
    yield makeEvent("hotel", "started", `Leg ${i + 1}: Hotels in ${leg.destination}`, undefined, undefined, i);
    yield makeEvent("research", "started", `Leg ${i + 1}: ${leg.nights}-day itinerary for ${leg.destination}`, undefined, undefined, i);
    yield makeEvent("places", "started", `Leg ${i + 1}: Places in ${leg.destination}`, undefined, undefined, i);
  }
  // Return flight
  const lastLeg = legs[legs.length - 1];
  yield makeEvent("flight", "started", `Return: ${lastLeg.destinationIATA} → ${analysis.originIATA}`, undefined, undefined, legs.length);

  // Launch all legs in parallel
  for (let i = 0; i < legs.length; i++) {
    const legAnalysis = buildLegAnalysis(analysis, legs[i], i, legs, analysis.dates.start);

    // Flight — returns { flights, source }
    (async () => {
      try {
        const result: FlightSearchResult = await searchFlights(legAnalysis);
        pushEvent(makeEvent("flight", "done", `Leg ${i + 1}: Flights found`, result.flights, result.source, i));
      } catch {
        pushEvent(makeEvent("flight", "error", `Leg ${i + 1}: Flight search failed`, undefined, undefined, i));
      }
    })();

    // Hotel — returns { hotels, source }
    (async () => {
      try {
        const result: HotelSearchResult = await searchHotels(legAnalysis);
        pushEvent(makeEvent("hotel", "done", `Leg ${i + 1}: Hotels found`, result.hotels, result.source, i));
      } catch {
        pushEvent(makeEvent("hotel", "error", `Leg ${i + 1}: Hotel search failed`, undefined, undefined, i));
      }
    })();

    // Research
    (async () => {
      try {
        const data = await researchDestination(legAnalysis);
        pushEvent(makeEvent("research", "done", `Leg ${i + 1}: Research complete`, data, getAgentSource("research"), i));
      } catch {
        pushEvent(makeEvent("research", "error", `Leg ${i + 1}: Research failed`, undefined, undefined, i));
      }
    })();

    // Places
    (async () => {
      try {
        const data = await searchPlaces(legAnalysis);
        pushEvent(makeEvent("places", "done", `Leg ${i + 1}: Places found`, data, getAgentSource("places"), i));
      } catch {
        pushEvent(makeEvent("places", "error", `Leg ${i + 1}: Places search failed`, undefined, undefined, i));
      }
    })();
  }

  // Return flight: last destination → origin
  (async () => {
    try {
      const returnAnalysis: EmailAnalysis = {
        ...analysis,
        origin: lastLeg.destination,
        originIATA: lastLeg.destinationIATA,
        destination: analysis.origin,
        destinationIATA: analysis.originIATA,
        dates: {
          ...analysis.dates,
          start: analysis.dates.end,
        },
        legs: undefined,
      };
      const result: FlightSearchResult = await searchFlights(returnAnalysis);
      pushEvent(makeEvent("flight", "done", `Return: Flights found`, result.flights, result.source, legs.length));
    } catch {
      pushEvent(makeEvent("flight", "error", `Return: Flight search failed`, undefined, undefined, legs.length));
    }
  })();

  // Yield events as they arrive
  while (yielded < totalAgents) {
    await waitForArrival();
    while (yielded < arrivals.length) {
      yield arrivals[yielded];
      yielded++;
    }
  }
}

/**
 * Helper: runs the 4 parallel agents for a single-leg trip (used as fallback
 * from orchestrateMultiLeg when legs <= 1).
 */
async function* orchestrateSingleLegAgents(analysis: EmailAnalysis): AsyncGenerator<AgentEvent> {
  console.log(`[Orchestrator] Single-leg: ${analysis.origin}(${analysis.originIATA}) → ${analysis.destination}(${analysis.destinationIATA}), ${analysis.dates.duration} days`);
  yield makeEvent("flight", "started", `Sky Scrapper: ${analysis.originIATA} → ${analysis.destinationIATA}`);
  yield makeEvent("hotel", "started", `Hotels in ${analysis.destination}`);
  yield makeEvent("research", "started", `GPT-4o: ${analysis.dates.duration}-day itinerary for ${analysis.destination}`);
  yield makeEvent("places", "started", `Google Places: ${analysis.destination}`);

  const arrivals: AgentEvent[] = [];
  let notifyResolve: (() => void) | null = null;
  let yielded = 0;

  const notify = () => { if (notifyResolve) { notifyResolve(); notifyResolve = null; } };
  const waitForArrival = (): Promise<void> => {
    if (arrivals.length > yielded) return Promise.resolve();
    return new Promise((r) => { notifyResolve = r; });
  };

  const runAgent = async (name: AgentName, fn: () => Promise<unknown>, doneMsg: string) => {
    try {
      const data = await fn();
      arrivals.push(makeEvent(name, "done", doneMsg, data, getAgentSource(name)));
    } catch {
      arrivals.push(makeEvent(name, "error", `Agent failed: ${name}`));
    }
    notify();
  };

  // Flight agent returns { flights, source } — unwrap and use actual source
  (async () => {
    try {
      const result: FlightSearchResult = await searchFlights(analysis);
      arrivals.push(makeEvent("flight", "done", "Flights found", result.flights, result.source));
    } catch {
      arrivals.push(makeEvent("flight", "error", "Agent failed: flight"));
    }
    notify();
  })();
  // Hotel agent returns { hotels, source } — unwrap and use actual source
  (async () => {
    try {
      const result: HotelSearchResult = await searchHotels(analysis);
      arrivals.push(makeEvent("hotel", "done", "Hotels found", result.hotels, result.source));
    } catch {
      arrivals.push(makeEvent("hotel", "error", "Agent failed: hotel"));
    }
    notify();
  })();
  runAgent("research", () => researchDestination(analysis), "Research complete");
  runAgent("places", () => searchPlaces(analysis), "Places found");

  while (yielded < 4) {
    await waitForArrival();
    while (yielded < arrivals.length) {
      yield arrivals[yielded];
      yielded++;
    }
  }
}
