/**
 * Revision detector: analyzes what changed in a customer's revision request
 * and determines which agents need to be re-run vs. which can be kept.
 */

import type { ChangeRequest } from "./intent-classifier";
import type { DbTripVersion } from "./db";

export type AgentName = "flight" | "hotel" | "research" | "places";

export interface RevisionAnalysis {
  /** Agents that need to be re-run due to changes */
  agentsToRerun: AgentName[];
  /** Agents whose results can be kept as-is */
  unchanged: AgentName[];
  /** Human-readable summary of what changed */
  changeSummary: string;
}

/**
 * Map of change aspects → which agents are affected.
 *
 * - hotel changes → rerun hotel only
 * - flight changes → rerun flight only
 * - date changes → rerun everything (flights, hotels, research, places all date-dependent)
 * - activity changes → rerun research + places (hotel/flights stay)
 * - budget changes → rerun hotel + flight (price-sensitive)
 * - traveler changes → rerun flight + hotel (passenger/room count)
 * - destination changes → rerun everything
 */
const ASPECT_TO_AGENTS: Record<string, AgentName[]> = {
  hotel: ["hotel"],
  flights: ["flight"],
  dates: ["flight", "hotel", "research", "places"],
  activities: ["research", "places"],
  budget: ["flight", "hotel"],
  travelers: ["flight", "hotel"],
  destination: ["flight", "hotel", "research", "places"],
  other: [], // manual review needed
};

const ALL_AGENTS: AgentName[] = ["flight", "hotel", "research", "places"];

/**
 * Analyze a revision request and determine which agents need to be re-run.
 */
export function analyzeRevision(
  changes: ChangeRequest[],
  currentVersion?: DbTripVersion | null
): RevisionAnalysis {
  if (!changes || changes.length === 0) {
    // No specific changes identified — rerun all to be safe
    return {
      agentsToRerun: [...ALL_AGENTS],
      unchanged: [],
      changeSummary: "General revision requested — re-running all agents",
    };
  }

  // Collect all affected agents from all change requests
  const affectedSet = new Set<AgentName>();
  const summaryParts: string[] = [];

  for (const change of changes) {
    const agents = ASPECT_TO_AGENTS[change.aspect] || [];
    for (const agent of agents) {
      affectedSet.add(agent);
    }
    summaryParts.push(`${change.aspect}: ${change.description}`);
  }

  const agentsToRerun = ALL_AGENTS.filter((a) => affectedSet.has(a));
  const unchanged = ALL_AGENTS.filter((a) => !affectedSet.has(a));

  // Build summary
  let changeSummary = summaryParts.join("; ");
  if (currentVersion) {
    changeSummary += ` (updating from version ${currentVersion.version_number})`;
  }

  return {
    agentsToRerun,
    unchanged,
    changeSummary,
  };
}

/**
 * Merge previous version's agent results with new results for unchanged agents.
 * This allows us to keep e.g. flight results when only the hotel changed.
 */
export function mergeAgentResults(
  previousResults: Record<string, unknown>,
  newResults: Record<string, unknown>,
  agentsRerun: AgentName[]
): Record<string, unknown> {
  const merged: Record<string, unknown> = { ...previousResults };

  // Overwrite only the agents that were re-run
  for (const agent of agentsRerun) {
    if (agent in newResults) {
      merged[agent] = newResults[agent];
    }
  }

  return merged;
}
