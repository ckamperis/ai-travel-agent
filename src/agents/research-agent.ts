import { researchDestination as claudeResearch } from "@/lib/claude";
import { EmailAnalysis } from "./types";

const MOCK_RESEARCH = `## 7-Day Athens & Greek Islands Itinerary

**Day 1 (Monday) — Arrival & Plaka**
Arrive in Athens, check into your hotel. Afternoon stroll through Plaka, Athens' oldest neighborhood. Dinner at a traditional taverna on Adrianou Street.

**Day 2 — Acropolis & Ancient Athens**
Morning visit to the Acropolis and Parthenon. Explore the Acropolis Museum. Lunch in Monastiraki. Afternoon walk through the Ancient Agora and Roman Forum.

**Day 3 — Neighborhoods & Local Life**
Morning at the Central Market (Varvakeios). Walk through Psyrri and Exarchia neighborhoods. Lunch at a local mezedopoleio. Afternoon at the National Archaeological Museum.

**Day 4 — Day Trip to Cape Sounion**
Visit the Temple of Poseidon at Cape Sounion. Stunning sunset views over the Aegean. Stop at a seaside taverna for fresh fish on the way back.

**Day 5 — Ferry to Hydra Island**
Early ferry to Hydra (1.5 hrs from Piraeus). No cars on the island — explore on foot or by donkey. Swim at Vlychos beach. Seafood dinner at the port.

**Day 6 — Hydra & Return**
Morning swim and explore the hillside paths. Visit the Historical Archives Museum. Afternoon ferry back to Athens. Evening in Gazi neighborhood.

**Day 7 — Final Day & Departure**
Morning visit to Syntagma Square for the changing of the guard. Last-minute shopping in Ermou Street. Departure from Athens airport.

**Local Tips:**
- Buy a combined archaeological sites ticket (€30) — covers Acropolis + 6 other sites
- Athens metro is excellent — stay near a station
- Try: loukoumades (honey donuts), souvlaki at Kostas in Syntagma, coffee at Tailor Made`;

export async function researchDestination(analysis: EmailAnalysis): Promise<string> {
  try {
    const result = await claudeResearch(
      analysis.destination,
      analysis.interests,
      analysis.dates.duration
    );
    return result;
  } catch (error) {
    console.error("Research agent failed:", error);
    return MOCK_RESEARCH;
  }
}
