# AI Travel Agent — Build Plan v3 (Worktrees + Parallel Claude Code Sessions)

## Workflow: Git Worktrees + Round-Robin Claude Code

Κάθε major module χτίζεται σε δικό του branch/worktree.
Τρέχεις 2-3 Claude Code terminals παράλληλα, κάθε ένα σε δικό του worktree.
Στο τέλος merge στο main.

```
ai-travel-agent/              ← main (scaffold only)
├── wt-api-clients/           ← worktree: feature/api-clients
├── wt-agents/                ← worktree: feature/agents  
├── wt-ui/                    ← worktree: feature/ui
└── wt-wire/                  ← worktree: feature/wire (final assembly)
```

---

## Phase 0: Προαπαιτούμενα

Πριν αρχίσεις — API tests + .env.local (βλέπε API_SETUP.md)

---

## Phase 1: Scaffold (main branch)

Ένα terminal, στο main.

```
Read CLAUDE.md carefully. Then:

1. Initialize:
   npx create-next-app@latest . --typescript --tailwind --app --src-dir --no-eslint

2. Install: npm install @anthropic-ai/sdk

3. Create full directory structure from CLAUDE.md:
   src/agents/, src/lib/, src/components/

4. Create placeholder files (empty exports) for every file in the structure:
   src/agents/types.ts, src/agents/orchestrator.ts, etc.
   src/lib/duffel.ts, src/lib/google-places.ts, etc.
   src/components/DemoPanel.tsx, etc.

5. Create .env.local.example

6. git init, git add -A, git commit -m "scaffold: project structure"
```

Μετά δημιούργησε τα worktrees:

```bash
# Branches
git branch feature/api-clients
git branch feature/agents
git branch feature/ui

# Worktrees
git worktree add ../wt-api-clients feature/api-clients
git worktree add ../wt-agents feature/agents
git worktree add ../wt-ui feature/ui
```

Αντέγραψε .env.local σε κάθε worktree:
```bash
cp .env.local ../wt-api-clients/.env.local
cp .env.local ../wt-agents/.env.local
cp .env.local ../wt-ui/.env.local
```

---

## Phase 2: Parallel Build (3 worktrees, 3 terminals)

### Terminal 1 → wt-api-clients (feature/api-clients)

```bash
cd ../wt-api-clients
claude
```

Prompt:
```
Read CLAUDE.md. Build the API client libraries in src/lib/:

1. src/lib/duffel.ts
   - searchFlights(origin, destination, departureDate, adults)
   - POST https://api.duffel.com/air/offer_requests
   - Auth: Bearer from env DUFFEL_API_KEY
   - Header: Duffel-Version: v2
   - Parse offers: airline name, departure/arrival times, price, stops, duration
   - Return top 5 sorted by price
   - Fallback mock data if API fails (3 realistic HAM→ATH flights)

2. src/lib/google-places.ts
   - searchPlaces(query, maxResults = 5)
   - POST https://places.googleapis.com/v1/places:searchText
   - Headers: X-Goog-Api-Key, X-Goog-FieldMask
   - Return { name, rating, address, summary, mapsUrl }[]
   - Fallback mock data for Athens

3. src/lib/claude.ts
   - Uses @anthropic-ai/sdk
   - analyzeEmail(emailText) → EmailAnalysis (structured JSON)
   - researchDestination(destination, interests[], days) → string (itinerary)
   - composeEmail(allResults, originalEmail) → AsyncGenerator<string> (streaming)
   - Model: claude-sonnet-4-20250514

4. src/lib/mock-hotels.ts
   - ATHENS_HOTELS array (copy the 5 hotels from CLAUDE.md)
   - getHotels(budget?: {min, max}) → filtered array

All with try/catch + typed returns. Test each client independently.
After building, run a quick test script to verify Duffel and Google Places work.
Commit: "feat: api clients — duffel, google places, claude, mock hotels"
```

---

### Terminal 2 → wt-agents (feature/agents)

```bash
cd ../wt-agents
claude
```

Prompt:
```
Read CLAUDE.md. Build the agent layer in src/agents/:

NOTE: The API clients in src/lib/ may be placeholder stubs. 
Import them but design agents so they work even if clients return mock data.
Each agent is a self-contained async function.

1. src/agents/types.ts — All types from CLAUDE.md:
   AgentEvent, AgentName, AgentStatus, EmailAnalysis,
   FlightResult, HotelResult, PlaceResult, AllAgentResults

2. src/agents/email-analyzer.ts
   - analyzeEmail(emailText) → Promise<EmailAnalysis>
   - Claude extracts: origin, originIATA, destination, destinationIATA, 
     dates, travelers, budget, interests, language, specialRequests

3. src/agents/flight-agent.ts
   - searchFlights(analysis: EmailAnalysis) → Promise<FlightResult[]>
   - Calls duffel.searchFlights()
   - Maps to FlightResult[]

4. src/agents/hotel-agent.ts
   - searchHotels(analysis: EmailAnalysis) → Promise<HotelResult[]>
   - Calls mock-hotels.getHotels()
   - Adds 1-2s artificial delay for demo realism
   - Returns top 3-4 within budget

5. src/agents/research-agent.ts
   - researchDestination(analysis: EmailAnalysis) → Promise<string>
   - Claude prompt: Greece travel expert, day-by-day plan
   - Include restaurant names, neighborhoods, island trip

6. src/agents/places-agent.ts
   - searchPlaces(analysis: EmailAnalysis) → Promise<PlaceResult[]>
   - 2-3 Google Places queries: restaurants, historical sites, neighborhoods
   - Combine + deduplicate

7. src/agents/composer-agent.ts
   - composeResponse(results: AllAgentResults, originalEmail: string) → AsyncGenerator<string>
   - Claude streaming: warm professional email with all details
   - Yields text chunks

8. src/agents/orchestrator.ts
   - orchestrate(emailText: string) → AsyncGenerator<AgentEvent>
   - Step 1: email-analyzer (sequential)
   - Step 2: flight + hotel + research + places (Promise.allSettled, parallel)
   - Step 3: composer (streaming)
   - Emits AgentEvent for every status change

Commit: "feat: all agents + orchestrator"
```

---

### Terminal 3 → wt-ui (feature/ui)

```bash
cd ../wt-ui
claude
```

Prompt:
```
Read CLAUDE.md. Build ALL UI components.
The API route and agents are being built in parallel — use mock/placeholder data for now.
Focus purely on UI, animations, and layout.

Design: Dark navy (#0B1D3A) bg, teal (#0891B2) accents. 1920x1080 optimized.
Agent colors from CLAUDE.md.

1. src/app/layout.tsx — Dark theme, system-ui font, viewport fill

2. src/app/page.tsx — Main state machine:
   - phases: landing | email-arrived | analyzing | processing | review | composing | done
   - Mock SSE consumer (simulate events with setTimeout for now)
   - Will be rewired to real SSE in final phase

3. src/components/AgentStatusBar.tsx
   - Sticky top: 6 colored pills (idle→active→done)

4. src/components/EmailInbox.tsx
   - Dark card, from/subject header, scrollable body, "NEW" badge
   - Fade + slide entrance animation

5. src/components/AgentCard.tsx
   - Row: emoji icon + agent name + status message + spinner/checkmark
   - Entrance animation per card

6. src/components/ResultsPanel.tsx
   - Flights table (airline, times, price — best highlighted)
   - Hotel cards (name, area, price, rating, metro)
   - Places list (name, rating, category)
   - Research preview (day-by-day, first 3 days)
   - Each section fades in when data arrives

7. src/components/EmailComposer.tsx
   - Streaming text display with blinking cursor
   - Email header (To, Subject)
   - "Αποστολή" button when done

8. src/components/ActionButton.tsx
   - Gradient bg, hover scale, icon + label

Use CSS transitions/animations (no external motion libraries).
Greek labels: "Εκκίνηση Demo", "Σύνθεση Απάντησης", "Επανεκκίνηση", etc.
Demo email hardcoded from CLAUDE.md for testing.

Make it look AMAZING on a projector — big fonts, high contrast, smooth animations.
Commit: "feat: all UI components with animations"
```

---

## Phase 3: Merge + Wire (main branch)

Μετά ολοκληρώνονται τα 3 worktrees:

```bash
cd ai-travel-agent  # back to main
git merge feature/api-clients
git merge feature/agents
git merge feature/ui
# Resolve conflicts if any (mainly in types.ts imports)
```

Μετά δημιούργησε ένα τελευταίο worktree ή δούλεψε στο main:

```bash
claude
```

Prompt:
```
Read CLAUDE.md. All modules are now merged. Wire everything together:

1. Build src/app/api/orchestrate/route.ts (SSE endpoint):
   - POST handler, accepts { email: string }
   - ReadableStream → SSE format
   - Calls orchestrate() from orchestrator.ts
   - Each AgentEvent → `data: ${JSON.stringify(event)}\n\n`
   - Composer chunks as separate events
   - Error handling: agent failure sends error event, doesn't kill stream

2. Update src/app/page.tsx to consume real SSE:
   - Replace mock setTimeout with fetch + ReadableStream reader
   - Parse SSE lines, update state per agent event
   - Phase transitions based on agent completions

3. Add elapsed time counter
4. Add final stat: "Ολοκληρώθηκε σε X δευτερόλεπτα"
5. Add "Επανεκκίνηση Demo" reset button
6. Test full end-to-end flow

Commit: "feat: wired SSE + full integration"
```

---

## Phase 4: Polish

```
Read CLAUDE.md. Final polish pass:

1. Staggered entrance animations for agent cards
2. Smooth streaming text in EmailComposer
3. Header: "🌍 AI Travel Assistant — Live Demo"
4. Activity log at bottom (scrollable timestamps)
5. Timing: total 15-25 seconds ideal
6. Error UX: orange warning if agent fails, continue
7. Test at 1920x1080 full-screen (F11)
8. Run full demo 3 times for stability

Commit: "polish: animations, timing, error handling"
```

---

## Worktree Cleanup

```bash
git worktree remove ../wt-api-clients
git worktree remove ../wt-agents
git worktree remove ../wt-ui
git branch -d feature/api-clients feature/agents feature/ui
```

---

## Quick Reference: Worktree Commands

```bash
# Δημιουργία
git worktree add ../wt-NAME branch-name

# Λίστα
git worktree list

# Αφαίρεση
git worktree remove ../wt-NAME

# Αν κάτι κολλήσει
git worktree prune
```

---

## Session Overview

```
Phase 1 (5 min)     → Scaffold στο main, δημιουργία worktrees
Phase 2 (20-30 min) → 3 παράλληλα Claude Code terminals
Phase 3 (10 min)    → Merge + wire + SSE route
Phase 4 (10 min)    → Polish + test
─────────────────────
Total: ~45-60 min
```

---

## Αν κάτι σπάσει στο merge

Τα πιο πιθανά conflicts:
- **src/agents/types.ts** — κρατά τη version από feature/agents
- **src/app/page.tsx** — κρατά τη version από feature/ui, μετά rewire
- **imports** — μπορεί paths να διαφέρουν, fix manually ή πες στο Claude Code:
  "Read CLAUDE.md. Fix all import errors after merge."