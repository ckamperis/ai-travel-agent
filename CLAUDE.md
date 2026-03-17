# AI Travel Agent — Agentic Demo for Tourism Conference

## Project Overview
An agentic AI travel assistant that demonstrates how multiple AI agents collaborate to handle a customer email inquiry. Built as a live demo for a tourism industry conference presentation.

**Concept: "Your AI Employee"** — Show that this system can handle ANY real travel inquiry in real-time, not a pre-scripted demo. A text area accepts any customer email, AI agents process it live, the user reviews and selects options, then AI composes a professional response.

## Architecture

```
┌─────────────────────────────────────────────┐
│                  Next.js UI                  │
│  (Real-time agent status, results, email)    │
├─────────────────────────────────────────────┤
│              API Routes (Edge)               │
│  /api/orchestrate + /api/compose (SSE)       │
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
- **Hotel Data:** Curated mock data (guaranteed reliability)
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
│   │       ├── orchestrate/
│   │       │   └── route.ts          # SSE endpoint — analysis + agents
│   │       └── compose/
│   │           └── route.ts          # SSE endpoint — compose with selections
│   ├── agents/
│   │   ├── types.ts                  # Shared types for all agents
│   │   ├── orchestrator.ts           # Main orchestrator logic
│   │   ├── email-analyzer.ts         # Parses & extracts intent from email
│   │   ├── flight-agent.ts           # Duffel API flight search
│   │   ├── hotel-agent.ts            # Mock hotel data
│   │   ├── research-agent.ts         # GPT-4o itinerary generation
│   │   ├── places-agent.ts           # Google Places for restaurants, sights
│   │   └── composer-agent.ts         # GPT-4o — composes final email
│   ├── lib/
│   │   ├── duffel.ts                 # Duffel API client
│   │   ├── google-places.ts          # Google Places API client
│   │   ├── ai.ts                     # OpenAI API helper
│   │   └── mock-hotels.ts            # Curated Athens hotel data
│   └── (all UI inlined in page.tsx — no separate components)
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
- **Process:** OpenAI API with system prompt for travel expertise (any destination)
- **Output:** Day-by-day itinerary suggestions, local tips, day trip suggestions
- **API:** OpenAI (gpt-4o)

### 5. Places Agent
- **Input:** City, categories (restaurants, sights, neighborhoods)
- **Process:** Google Places Text Search API (New, v1)
- **Output:** Curated list of places with ratings, addresses
- **API:** Google Places
- **Fallback:** Mock places data if API fails

### 6. Composer Agent
- **Input:** All agent results + original email + user's flight/hotel selections
- **Process:** OpenAI API call to synthesize everything into response email
- **Output:** Professional, warm response email — streamed token by token
- **API:** OpenAI (gpt-4o, streaming)
- **Selection-aware:** Highlights user's chosen flight/hotel as recommendations

## SSE Event Format
### /api/orchestrate — analysis + 4 agents
```typescript
type AgentEvent = {
  agent: 'email' | 'flight' | 'hotel' | 'research' | 'places';
  status: 'started' | 'done' | 'error';
  message: string;
  data?: any;              // Results when done
  source?: 'live' | 'mock';
  timestamp: number;
}
```

### /api/compose — streaming email composition
```typescript
// Each SSE line: data: {"chunk": "partial text"}
// Final line:    data: [DONE]
```

## UI Flow / Phases
1. **input** — Text area pre-filled with demo email, "Process Email" button
   - User can paste ANY email in any language
2. **processing** — Text area locks, Agent Pipeline section appears:
   - Email Analysis with extracted key-value data
   - 4-column grid (Flights, Hotels, Research, Places) with live status
   - Each column: spinner → API info → results + elapsed time + LIVE badge
3. **review** — "Review & Select" section auto-appears when all agents done
   - Flights: clickable table rows (first pre-selected)
   - Hotels: clickable cards (first pre-selected)
   - "Compose Response" button
4. **composing** — GPT-4o streams response email token by token
   - Incorporates user's flight & hotel selections
5. **done** — "Response Ready" with copy button, total time, "New Email" reset

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

## Demo Email (pre-filled, editable)
The text area is pre-filled with a German couple's Greece trip request, but the user
(presenter or audience member) can paste ANY email. The entire pipeline adapts to
whatever origin, destination, dates, language, and interests are in the email.

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
- **Dynamic:** Accepts any email, any language, any destination. Pipeline adapts.
- **No fake delays:** All timing is from real API calls. No artificial setTimeouts.
- **LIVE badges:** Results from real APIs show a green "LIVE" badge; mock data does not.
- **Streaming:** All status updates push via SSE immediately. UI feels alive.
- **Parallel:** Flight, Hotel, Research, Places agents run simultaneously.
- **Human-in-the-loop:** User selects flight + hotel before compose step.
- **No hardcoded keys:** Everything from .env.local
- **English UI labels:** Clean, professional labels for international conference audience.
- **Projector-optimized:** Min 16px body, 24px+ headers, dark navy theme, 1920x1080.