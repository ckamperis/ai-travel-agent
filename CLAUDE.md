# Voyager AI — Smart Lead Response for Travel Agencies

## Product Overview
A product-ready AI-powered email assistant that handles travel inquiries. Multiple AI agents collaborate to analyze customer emails, search flights/hotels/places, research itineraries, and compose professional responses — all in real-time.

**Concept: "Your AI Employee"** — A complete SaaS tool with dashboard, customer CRM, follow-up system, email preview, price comparison, weather forecasts, multi-language translation, and AI output cleanup. Human-in-the-loop: every AI action is reviewed before sending.

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
│Sky   │Booking│GPT-4o │Google│  GPT-4o       │
│Scrpr │COM API│       │Places│  (synthesis)  │
│+GPT4o│+GPT4o│       │API   │               │
└──────┴──────┴──────┴──────┴────────────────┘
```

## Tech Stack
- **Framework:** Next.js 14+ (App Router)
- **UI:** React + Tailwind CSS
- **Streaming:** Server-Sent Events (SSE) for real-time agent updates
- **AI:** OpenAI API (gpt-4o)
- **Flight Data:** Sky Scrapper API via RapidAPI (real data) → GPT-4o fallback → generic fallback
- **Hotel Data:** Booking.com API via RapidAPI (real data) → GPT-4o fallback → generic fallback
- **Places/POI:** Google Places API (New, v1)
- **Language:** TypeScript throughout

## API Keys Required (in .env.local)
```
OPENAI_API_KEY=sk-...                 # OpenAI API — from platform.openai.com
GOOGLE_PLACES_API_KEY=AIza...         # Google Cloud Console → Places API (New)
RAPIDAPI_KEY=...                      # RapidAPI — for Sky Scrapper flights + Booking.com hotels
```

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
│   │   ├── page.tsx                  # Dashboard (home page)
│   │   ├── inbox/page.tsx            # Inbox — 4-step wizard (main flow)
│   │   ├── processed/page.tsx        # Processed emails history
│   │   ├── follow-ups/page.tsx       # Follow-up management
│   │   ├── customers/page.tsx        # Customer CRM
│   │   ├── settings/page.tsx         # Settings (AI, follow-up, content)
│   │   ├── agents/page.tsx           # Agent configuration
│   │   ├── templates/page.tsx        # Email templates CRUD
│   │   ├── profile/page.tsx          # Profile settings
│   │   └── api/
│   │       ├── orchestrate/route.ts  # SSE: analyze + agents (mode: full|analyze|search)
│   │       ├── compose/route.ts      # SSE: compose with selections + settings
│   │       ├── translate/route.ts    # Translate composed email
│   │       └── follow-up-compose/route.ts  # SSE: generate follow-up email
│   ├── agents/                       # (unchanged from before)
│   ├── components/
│   │   ├── Sidebar.tsx               # Collapsible navigation sidebar (9 items)
│   │   ├── Header.tsx                # Top header: breadcrumb, notifications, profile, theme toggle
│   │   ├── ThemeProvider.tsx          # Dark/light mode context + localStorage
│   │   ├── MapView.tsx                # Google Maps component (hotel/place pins)
│   │   ├── Breadcrumb.tsx            # Breadcrumb navigation
│   │   └── Toast.tsx                 # Toast notification system (top-right)
│   ├── lib/
│   │   ├── settings.ts              # Settings, Profile, Templates, History, Customers, Follow-ups
│   │   ├── ai.ts                     # OpenAI: compose, translate, follow-up (no markdown)
│   │   ├── markdown-strip.ts         # Strip markdown from AI output
│   │   ├── email-to-html.ts          # Convert plain text to styled HTML preview
│   │   ├── weather.ts                # Weather forecasts (Open-Meteo + fallback)
│   │   ├── skyscrapper-api.ts         # Sky Scrapper API client (flights via RapidAPI)
│   │   ├── google-places.ts          # Google Places API client (GPT-4o fallback)
│   │   ├── booking-api.ts            # Booking.com API client via RapidAPI
│   │   └── hotel-fallback.ts         # Generic fallback hotel generator
```

## Agent Definitions

### 1. Email Analyzer Agent
- **Input:** Raw email text
- **Process:** OpenAI API call to extract structured data
- **Output:** `{ origin, destination, dates, travelers, budget, interests, language, requests[] }`
- **API:** OpenAI (gpt-4o)

### 2. Flight Agent
- **Input:** Origin IATA, destination IATA, dates, passengers
- **Process:** 3-tier fallback: Sky Scrapper API → GPT-4o → generic fallback
- **Output:** Top 5 flight options with price, times, airline, stops
- **API:** Sky Scrapper via RapidAPI (real data), OpenAI GPT-4o (AI suggestions)
- **Sky Scrapper flow:**
  1. GET /api/v1/flights/searchAirport — resolve IATA to skyId + entityId (cached)
  2. GET /api/v2/flights/searchFlights — search with skyIds, entityIds, date, adults
  3. Parse itineraries: extract airline, departure/arrival, price, stops, duration
- **Source badge:** "Live" = Sky Scrapper API, "AI" = GPT-4o, no badge = fallback
- **Fallback:** GPT-4o generates realistic flights; last resort = generic mock data

### 3. Hotel Agent
- **Input:** City, check-in/out dates, guests, budget range
- **Process:** 3-tier fallback: Booking.com API → GPT-4o → generic fallback
- **Output:** Top 5 hotels with name, location, price, rating, coordinates, amenities
- **API:** Booking.com via RapidAPI (real data), OpenAI GPT-4o (AI suggestions)
- **Booking.com flow:**
  1. GET /api/v1/hotels/searchDestination — resolve city to dest_id
  2. GET /api/v1/hotels/searchHotels — search with dates, guests, currency
  3. Map response to HotelResult (name, price/night, rating, lat/lng, etc.)
- **Source badge:** "Live" = Booking.com API, "AI" = GPT-4o, no badge = fallback
- **Fallback:** GPT-4o suggests real hotel names; last resort = generic "[City] Hotel"

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
- **Sidebar** (9 items): Dashboard, Inbox, Processed, Follow-ups, Customers, Settings, Agents, Templates, Profile
- **Main Content**: route-based pages with breadcrumb navigation

## Dashboard (/)
- 4 stat cards: Emails Processed, Avg Response Time, Completed Today, Pending Follow-ups
- Recent Activity feed from history
- Quick action: "Process New Email" → /inbox

## Inbox Step Wizard (/inbox)
1. **Step 1 — Email Input**: Sample inbox (3 emails) + paste custom
2. **Step 2 — Analysis**: Editable form. Customer recognition banner for returning customers.
3. **Step 3 — Results**: 5 tabs:
   - Flights: sortable table, radio selection
   - Hotels: cards with radio selection
   - Itinerary: collapsible day-by-day
   - Places: checkboxes + Google Maps links
   - Compare: price comparison matrix (flight+hotel combos, Best Value/Top Rated badges)
   - Weather widget above tabs (Open-Meteo API)
4. **Step 4 — Compose**:
   - Editor/Preview toggle: plain text editor vs styled HTML preview (iframe)
   - AI output cleaned of all markdown (stripMarkdown post-processing + prompt instruction)
   - Right sidebar: selected options + cost breakdown (flights + hotel + meals estimate)
   - Actions: Send, Save Draft, Copy, Translate (6 languages), Schedule Follow-up, New Email
   - Customer auto-saved to CRM. History entry saved with composed text.

## Other Pages
- **Follow-ups** (/follow-ups): manage scheduled follow-ups, mark sent/cancelled, AI-generated follow-up emails
- **Customers** (/customers): CRM with tags, notes, trip history, preferred language
- **Settings**: AI Behavior (review mode, response length), Follow-up (auto, days), Customer recognition, Email content toggles
- **Agents, Templates, Profile**: unchanged from before
- **Processed**: history table with composed response stored

## Sky Scrapper API Reference (via RapidAPI)
- **Base URL:** https://sky-scrapper.p.rapidapi.com
- **Auth:** X-RapidAPI-Key + X-RapidAPI-Host headers (same RAPIDAPI_KEY as Booking.com)

### Search Airport
```
GET /api/v1/flights/searchAirport?query=Athens&locale=en-US
→ { data: [{ navigation: { relevantFlightParams: { skyId, entityId, localizedName } } }] }
```

### Search Flights
```
GET /api/v2/flights/searchFlights?originSkyId=HAM&destinationSkyId=ATH&originEntityId=27539604&destinationEntityId=95673635&date=2026-04-01&adults=2&cabinClass=economy&currency=EUR&sortBy=best
→ { data: { itineraries: [...] } }
Each itinerary has:
  - price.raw, price.formatted
  - legs[].origin.displayCode, legs[].destination.displayCode
  - legs[].departure, legs[].arrival (ISO datetime)
  - legs[].durationInMinutes
  - legs[].stopCount
  - legs[].carriers.marketing[].name
```

### Flight Agent Fallback Chain
1. **Sky Scrapper API** (RAPIDAPI_KEY) → real flight data with prices, airlines, times
2. **GPT-4o** (OPENAI_API_KEY) → AI generates realistic flights with approximate data
3. **Generic fallback** → mock flights with seeded airlines/prices

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

## Booking.com API Reference (via RapidAPI)
- **Base URL:** https://booking-com15.p.rapidapi.com
- **Auth:** X-RapidAPI-Key + X-RapidAPI-Host headers

### Search Destination
```
GET /api/v1/hotels/searchDestination?query=Athens
→ [{ dest_id, search_type, label }]
```

### Search Hotels
```
GET /api/v1/hotels/searchHotels?dest_id={id}&search_type=city&arrival_date=2026-04-01&departure_date=2026-04-04&adults=2&room_qty=1&currency_code=EUR
→ { data: { hotels: [{ property: { name, latitude, longitude, reviewScore, priceBreakdown, ... } }] } }
```

### Location to Lat/Long
```
GET /api/v1/meta/locationToLatLong?query=Istanbul
→ { data: { latitude, longitude } }
```

### Hotel Agent Fallback Chain
1. **Booking.com API** (RAPIDAPI_KEY) → real hotel data with prices, coordinates, ratings
2. **GPT-4o** (OPENAI_API_KEY) → AI suggests real hotel names with approximate data
3. **Generic fallback** → "[City] Central Hotel", "[City] Boutique Inn", etc.

## Demo Email (pre-filled, editable)
The text area is pre-filled with a German couple's Greece trip request, but the user
(presenter or audience member) can paste ANY email. The entire pipeline adapts to
whatever origin, destination, dates, language, and interests are in the email.

## Design System
Light fintech theme (Stripe/Linear-inspired) with dark mode toggle.

**Light mode (default):**
- Background: #FAFBFC | Surface: #FFFFFF | Border: #E5E7EB
- Primary: #0066FF (crisp blue) | Green: #10B981 | Amber: #F59E0B | Red: #EF4444
- Text: #111827 / #6B7280 / #9CA3AF (primary/secondary/muted)

**Dark mode:**
- Background: #0F172A | Surface: #1E293B | Border: #334155
- Same accents, slightly brighter

**Layout:** Sidebar (collapsible) + top header bar (notifications, profile dropdown, theme toggle)
**Fonts:** Inter / system-ui
**Maps:** Google Maps via @vis.gl/react-google-maps (hotel pins, place pins)
**Branding:** "© 2026 Revival SA — AI & Business Intelligence" (sidebar footer + email footer)
- CSS variables throughout for theme-switching
- All styling via `style={{ color: 'var(--color-text)' }}` pattern

## Important Rules
- **No markdown in emails:** Composer prompt explicitly forbids markdown. stripMarkdown() post-processes output.
- **Human-in-the-loop:** Every AI output is reviewed before sending. Editor + HTML preview.
- **Customer recognition:** Returning customers get a banner + personalized compose context.
- **Follow-up system:** Auto-scheduled follow-ups, AI-generated follow-up emails.
- **Resilience:** Every agent has try/catch with fallback mock data.
- **Dynamic:** Accepts any email, any language, any destination.
- **No fake delays:** All timing from real API calls.
- **Settings-aware:** Composer respects language, tone, signature, response length, content toggles.
- **Budget per-night:** Email analyzer explicitly returns per-night budget.
- **Design:** Light fintech theme + dark mode. CSS variables. Google Maps integration.
- **Branding:** Revival SA footer. Blue primary accent (#0066FF).