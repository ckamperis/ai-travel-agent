# TravelAgent AI — SaaS Email Assistant for Travel Agencies

## Product Overview
A product-ready AI-powered email assistant that handles travel inquiries. Multiple AI agents collaborate to analyze customer emails, search flights/hotels/places, research itineraries, and compose professional responses — all in real-time.

**Concept: "Your AI Employee"** — A working SaaS tool (not a demo) with sidebar navigation, settings, templates, agent configuration, and a step-by-step wizard for processing any customer email in any language.

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
│   │   ├── layout.tsx                # Root layout with sidebar + toast
│   │   ├── page.tsx                  # Inbox — step wizard (main flow)
│   │   ├── settings/page.tsx         # Settings page
│   │   ├── agents/page.tsx           # Agent configuration
│   │   ├── templates/page.tsx        # Email templates CRUD
│   │   ├── profile/page.tsx          # Profile settings
│   │   ├── processed/page.tsx        # Processed emails history
│   │   └── api/
│   │       ├── orchestrate/route.ts  # SSE: analyze + agents (mode: full|analyze|search)
│   │       └── compose/route.ts      # SSE: compose with selections + settings
│   ├── agents/                       # (unchanged from before)
│   ├── components/
│   │   ├── Sidebar.tsx               # Navigation sidebar
│   │   ├── Breadcrumb.tsx            # Breadcrumb navigation
│   │   └── Toast.tsx                 # Toast notification system
│   ├── lib/
│   │   ├── settings.ts              # Settings, Profile, Templates, History + localStorage
│   │   ├── ai.ts                     # OpenAI API helper (with compose settings)
│   │   ├── duffel.ts                 # Duffel API client
│   │   ├── google-places.ts          # Google Places API client
│   │   └── mock-hotels.ts            # Curated Athens hotel data
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
### /api/orchestrate — analysis + agents
Accepts: `{ email: string, mode?: 'full'|'analyze'|'search', analysis?: EmailAnalysis }`
- `mode: 'analyze'` — run email analysis only
- `mode: 'search'` — skip analysis, run 4 agents with provided analysis
- `mode: 'full'` — run both (default)

```typescript
type AgentEvent = {
  agent: 'email' | 'flight' | 'hotel' | 'research' | 'places';
  status: 'started' | 'done' | 'error';
  message: string;
  data?: any;
  source?: 'live' | 'mock';
  timestamp: number;
}
```

### /api/compose — streaming email composition
Accepts: `{ email, emailAnalysis, selectedFlight, selectedHotel, flights, hotels, research, places, includedPlaces?, settings? }`
Settings: `{ responseLanguage, tone, emailSignature, defaultGreeting, includePriceBreakdown, includeItinerary, includeWeatherInfo }`

```typescript
// Each SSE line: data: {"chunk": "partial text"}
// Final line:    data: [DONE]
```

## UI Layout
- **Sidebar** (always visible): Logo, nav menu (Inbox, Processed, Settings, Agents, Templates, Profile), notification bell, user avatar
- **Main Content**: route-based pages

## Inbox Step Wizard (main flow)
1. **Step 1 — Email Input**: Sample inbox with 3 pre-loaded emails (Greece, Rome, Santorini) + "Paste custom email" option
2. **Step 2 — Analysis**: Editable form with all extracted fields (origin, destination, dates, travelers, budget, interests, language). User can modify before searching. "Confirm & Search" button.
3. **Step 3 — Results**: 4 tabs (Flights, Hotels, Itinerary, Places):
   - Flights: sortable table (price/duration/stops), radio selection
   - Hotels: cards with radio selection, amenities, metro info
   - Itinerary: collapsible day-by-day sections
   - Places: checkboxes to include/exclude from final email, Google Maps links
   - "Compose Response" button (enabled when all agents done)
4. **Step 4 — Compose**: Streaming email on left, selected options summary on right. Editable after streaming. Send + Copy + New Email buttons. Saves to history.

## Other Pages
- **Settings**: Response language, tone, email signature, greeting, toggles (price breakdown, itinerary, weather), budget tolerance slider, hotel min rating slider
- **Agents**: 5 agent cards with status dots (connected/mock/not configured), enable/disable toggles
- **Templates**: CRUD for email templates with variable placeholders ({{guest_name}}, {{flight_details}}, etc.)
- **Profile**: Agency name, agent name, email
- **Processed**: History table from localStorage

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
- **Resilience:** Every agent has a try/catch with fallback mock data. App MUST NOT break.
- **Dynamic:** Accepts any email, any language, any destination. Pipeline adapts.
- **No fake delays:** All timing is from real API calls. No artificial setTimeouts.
- **LIVE badges:** Results from real APIs show a green "LIVE" badge; mock data does not.
- **Streaming:** All status updates push via SSE immediately. UI feels alive.
- **Parallel:** Flight, Hotel, Research, Places agents run simultaneously.
- **Human-in-the-loop:** User edits analysis, selects flight + hotel, checks places.
- **Settings-aware:** Composer respects language, tone, signature, greeting, toggles from Settings page.
- **History:** Processed emails saved to localStorage for the Processed page.
- **No hardcoded keys:** Everything from .env.local
- **Budget per-night:** Email analyzer explicitly returns per-night budget, not total.
- **Design:** Dark navy theme, Linear/Vercel dashboard feel, sidebar + main content layout.