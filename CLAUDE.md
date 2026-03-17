# AI Travel Agent — Agentic Demo for Tourism Conference

## Project Overview
An agentic AI travel assistant that demonstrates how multiple AI agents collaborate to handle a customer email inquiry. Built as a live demo for a tourism industry conference presentation.

**Scenario:** A German couple emails a travel agency asking for help planning a week in Greece. The system reads the email, dispatches specialized agents (flights, hotels, research), and composes a complete response — all in real-time with a visual UI.

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Next.js UI                  │
│  (Real-time agent status, results, email)    │
├─────────────────────────────────────────────┤
│              API Routes (Edge)               │
│         /api/orchestrate (SSE stream)        │
├─────────────────────────────────────────────┤
│            Orchestrator Agent                │
│  Reads email → dispatches agents → collects  │
├──────┬──────┬──────┬──────┬────────────────┤
│Flight│Hotel │Research│Places│  Composer      │
│Agent │Agent │Agent  │Agent │  Agent         │
│      │      │       │      │               │
│Duffel│Mock  │GPT-4o │Google│  GPT-4o       │
│API   │Data  │       │Places│  (synthesis)  │
│(test)│+AI   │       │API   │               │
└──────┴──────┴──────┴──────┴────────────────┘
```

## Tech Stack
- **Framework:** Next.js 14+ (App Router)
- **UI:** React + Tailwind CSS
- **Streaming:** Server-Sent Events (SSE) for real-time agent updates
- **AI:** OpenAI API (gpt-4o)
- **Flight Data:** Duffel API (test mode — no signup needed)
- **Hotel Data:** Curated mock data + Claude enhancement (guaranteed reliability)
- **Places/POI:** Google Places API (New, v1)
- **Language:** TypeScript throughout

## API Keys Required (in .env.local)
```
OPENAI_API_KEY=sk-...                 # OpenAI API — from platform.openai.com
GOOGLE_PLACES_API_KEY=AIza...         # Google Cloud Console → Places API (New)
DUFFEL_API_KEY=duffel_test            # Test mode — works immediately, no signup
```

Note: Duffel test key `duffel_test` returns simulated but realistic flight data.
When ready for real data, sign up at https://app.duffel.com and get a live key.

## Project Structure
```
ai-travel-agent/
├── CLAUDE.md                         # This file (project memory)
├── .env.local                        # API keys (gitignored)
├── package.json
├── tailwind.config.ts
├── tsconfig.json
├── next.config.ts
├── public/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                  # Main demo UI
│   │   └── api/
│   │       └── orchestrate/
│   │           └── route.ts          # SSE endpoint — orchestrator
│   ├── agents/
│   │   ├── types.ts                  # Shared types for all agents
│   │   ├── orchestrator.ts           # Main orchestrator logic
│   │   ├── email-analyzer.ts         # Parses & extracts intent from email
│   │   ├── flight-agent.ts           # Duffel API flight search
│   │   ├── hotel-agent.ts            # Mock data + Claude enrichment
│   │   ├── research-agent.ts         # Claude web search for itinerary
│   │   ├── places-agent.ts           # Google Places for restaurants, sights
│   │   └── composer-agent.ts         # Claude API — composes final email
│   ├── lib/
│   │   ├── duffel.ts                 # Duffel API client
│   │   ├── google-places.ts          # Google Places API client
│   │   ├── ai.ts                     # OpenAI API helper
│   │   └── mock-hotels.ts            # Curated Athens hotel data
│   └── components/
│       ├── DemoPanel.tsx             # Main demo container
│       ├── EmailInbox.tsx            # Shows incoming email
│       ├── AgentStatusBar.tsx        # Top bar with agent statuses
│       ├── AgentCard.tsx             # Individual agent progress card
│       ├── ResultsPanel.tsx          # Flight/hotel/places results
│       ├── EmailComposer.tsx         # Streaming composed email
│       └── ActionButton.tsx          # Start/Review/Send buttons
```

## Agent Definitions

### 1. Email Analyzer Agent
- **Input:** Raw email text
- **Process:** OpenAI API call to extract structured data
- **Output:** `{ origin, destination, dates, travelers, budget, interests, language, requests[] }`
- **API:** OpenAI (gpt-4o)

### 2. Flight Agent
- **Input:** Origin IATA, destination IATA, dates, passengers
- **Process:** Duffel Offer Requests API (test mode)
- **Output:** Top 3-5 flight options with price, times, airline, stops
- **API:** Duffel (key: duffel_test)
- **Duffel flow:**
  1. POST /air/offer_requests — create search
  2. Response includes offers[] with slices, segments, price
  3. Parse and return top results sorted by price
- **Fallback:** If Duffel fails, return curated mock flight data

### 3. Hotel Agent
- **Input:** City, check-in/out dates, guests, budget range
- **Process:** Return curated mock data for Athens hotels
- **Output:** Top 3-5 hotels with name, location, price, rating, metro proximity
- **API:** None (mock data)
- **Why mock:** Guaranteed to work in live demo. Hotel APIs require paid accounts.
  The data is realistic and based on real Athens hotels.

### 4. Research Agent
- **Input:** Destination, interests, duration
- **Process:** OpenAI API with system prompt for Greece travel expertise
- **Output:** Day-by-day itinerary suggestions, local tips, island recommendations
- **API:** OpenAI (gpt-4o)

### 5. Places Agent
- **Input:** City, categories (restaurants, sights, neighborhoods)
- **Process:** Google Places Text Search API (New, v1)
- **Output:** Curated list of places with ratings, addresses
- **API:** Google Places
- **Fallback:** Mock places data if API fails

### 6. Composer Agent
- **Input:** All agent results + original email
- **Process:** OpenAI API call to synthesize everything into response email
- **Output:** Professional, warm response email — streamed token by token
- **API:** OpenAI (gpt-4o, streaming)

## SSE Event Format
Each agent sends events through the SSE stream:
```typescript
type AgentEvent = {
  agent: 'email' | 'flight' | 'hotel' | 'research' | 'places' | 'composer';
  status: 'started' | 'working' | 'done' | 'error';
  message: string;         // Human-readable status in Greek
  data?: any;              // Results when done
  timestamp: number;
}
```

## UI Flow / Phases
1. **landing** — "Εκκίνηση Demo" button with scenario description
2. **email-arrived** — Animated inbox notification, email content displayed
3. **analyzing** — Email Analyzer agent runs (sequential, ~2s)
4. **processing** — Flight, Hotel, Research, Places run in PARALLEL
   - Each agent shows: icon → spinner → results when done
   - Results panels appear progressively as agents complete
5. **review** — Summary panel with all findings + "Σύνθεση Απάντησης" button
6. **composing** — Streaming email composition (token by token, ~10s)
7. **done** — Final email displayed, timing stat, "Επανεκκίνηση" button

## Duffel API Reference
- **Base URL:** https://api.duffel.com
- **Auth:** Bearer token in header
- **Test key:** `duffel_test` (returns simulated data, no real bookings)

### Search Flights
```
POST /air/offer_requests
Headers:
  Authorization: Bearer duffel_test
  Duffel-Version: v2
  Content-Type: application/json

Body:
{
  "data": {
    "slices": [
      {
        "origin": "HAM",
        "destination": "ATH",
        "departure_date": "2025-08-04"
      }
    ],
    "passengers": [
      { "type": "adult" },
      { "type": "adult" }
    ],
    "cabin_class": "economy"
  }
}

Response: { data: { offers: [...], slices: [...] } }
Each offer has:
  - total_amount, total_currency
  - owner.name (airline)
  - slices[].segments[].departing_at, arriving_at
  - slices[].segments[].origin.iata_code, destination.iata_code
  - slices[].segments[].marketing_carrier.name
```

## Google Places API Reference (New v1)
```
POST https://places.googleapis.com/v1/places:searchText
Headers:
  Content-Type: application/json
  X-Goog-Api-Key: {GOOGLE_PLACES_API_KEY}
  X-Goog-FieldMask: places.displayName,places.rating,places.formattedAddress,places.types,places.editorialSummary,places.googleMapsUri

Body:
{
  "textQuery": "best traditional restaurants in Athens Plaka",
  "maxResultCount": 5
}
```

## Mock Hotel Data Structure
```typescript
// src/lib/mock-hotels.ts
// Based on real Athens hotels — realistic data for demo
const ATHENS_HOTELS = [
  {
    name: "Hermes Hotel",
    area: "Σύνταγμα",
    address: "Apollonos 19, Athens 105 57",
    pricePerNight: 142,
    currency: "EUR",
    rating: 8.9,
    stars: 3,
    metroStation: "Σύνταγμα",
    metroDistance: "3 λεπτά",
    amenities: ["WiFi", "Breakfast", "Air conditioning", "Rooftop bar"],
    highlights: "Θέα στην Ακρόπολη από το rooftop, δίπλα στην Πλάκα"
  },
  {
    name: "Hotel Plaka",
    area: "Πλάκα",
    address: "Kapnikareas 7, Athens 105 56",
    pricePerNight: 135,
    currency: "EUR",
    rating: 8.7,
    stars: 3,
    metroStation: "Μοναστηράκι",
    metroDistance: "2 λεπτά",
    amenities: ["WiFi", "Breakfast", "Rooftop terrace"],
    highlights: "Στην καρδιά της Πλάκας, rooftop με θέα Ακρόπολη"
  },
  {
    name: "Athens Center Square",
    area: "Μοναστηράκι",
    address: "Aristogeitonos 15, Athens 105 52",
    pricePerNight: 125,
    currency: "EUR",
    rating: 8.4,
    stars: 3,
    metroStation: "Μοναστηράκι",
    metroDistance: "1 λεπτό",
    amenities: ["WiFi", "Breakfast", "Restaurant"],
    highlights: "Πάνω στο Μοναστηράκι, ιδανικό για εξερεύνηση"
  },
  {
    name: "Electra Palace Athens",
    area: "Πλάκα",
    address: "Navarchou Nikodimou 18-20, Athens 105 57",
    pricePerNight: 195,
    currency: "EUR",
    rating: 9.1,
    stars: 5,
    metroStation: "Σύνταγμα",
    metroDistance: "4 λεπτά",
    amenities: ["Pool", "Spa", "Rooftop restaurant", "WiFi", "Breakfast"],
    highlights: "Luxury option, πισίνα στο rooftop με θέα Ακρόπολη"
  },
  {
    name: "Fresh Hotel",
    area: "Ομόνοια",
    address: "Sofokleous 26, Athens 105 52",
    pricePerNight: 105,
    currency: "EUR",
    rating: 8.2,
    stars: 4,
    metroStation: "Ομόνοια",
    metroDistance: "2 λεπτά",
    amenities: ["Pool", "WiFi", "Restaurant", "Rooftop bar"],
    highlights: "Modern design hotel, rooftop pool, budget-friendly"
  }
];
```

## Demo Email (hardcoded)
```
From: klaus.mueller@gmail.com
Subject: Trip to Greece - next week availability?

Guten Tag,

We are Klaus and Anna Mueller from Hamburg, Germany. We are planning a trip to Greece for next week (7 days) and we are looking for:

- Flights from Hamburg to Athens (arriving Monday morning if possible)
- A nice hotel in central Athens, close to metro, mid-range budget (~120-150€/night)
- A complete travel plan: what to see, where to eat, day trips from Athens
- We love history, local food, and walking around neighborhoods
- We would also like to visit one island for 2 days if possible

Could you please help us organize everything?

Best regards,
Klaus & Anna Mueller
```

## Design System
- **Background:** Dark navy gradient (#0B1D3A → #0F2E5A)
- **Primary accent:** Teal (#0891B2)
- **Secondary accent:** Cyan (#22D3EE)
- **Agent colors:**
  - Email Analyzer: #0891B2 (teal)
  - Flight Agent: #22D3EE (cyan)
  - Hotel Agent: #F59E0B (amber)
  - Research Agent: #10B981 (green)
  - Places Agent: #A78BFA (purple)
  - Composer Agent: #EC4899 (pink)
- **Fonts:** System UI / Inter for body, Georgia for headings
- **Target resolution:** 1920x1080 (projector)

## Important Rules
- **Resilience:** Every agent has a try/catch with fallback mock data. Demo MUST NOT break.
- **Streaming:** All status updates push via SSE immediately. UI feels alive.
- **Timing:** Total demo should complete in 30-60 seconds.
- **Parallel:** Flight, Hotel, Research, Places agents run simultaneously (Promise.allSettled).
- **No hardcoded keys:** Everything from .env.local
- **Greek UI labels:** Agent names and status messages in Greek for the conference audience.
- **Mobile-responsive:** But optimized for large screen projection.

## Development Order
1. Scaffold Next.js + Tailwind + env setup
2. Build Duffel client (simple fetch with Bearer token)
3. Build Google Places client
4. Build Claude API helper (analyze, research, compose)
5. Build mock-hotels data module
6. Build each agent as independent async function
7. Build orchestrator (sequential email analysis → parallel agents → composer)
8. Build API route with SSE streaming
9. Build UI components (one by one)
10. Wire everything together
11. Test end-to-end with real API keys
12. Polish animations, timing, error handling