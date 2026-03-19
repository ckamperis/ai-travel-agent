# Voyager AI

### Smart Lead Response for Travel Agencies

Voyager AI helps travel agencies respond to customer inquiries 10x faster with AI-powered proposals.

## What it does

- Reads customer emails and extracts trip details in seconds
- Searches real flights (Skyscanner) and hotels (Booking.com) automatically
- Generates professional, multi-destination travel proposals
- Supports multi-leg trips across any number of countries
- Classifies incoming Gmail emails as travel inquiries
- Integrates with CRMs (SoftOne, HubSpot, Salesforce, and more)
- Full conversation threading with trip revision support
- Customer CRM with tags, notes, and trip history
- Follow-up scheduling with AI-generated reminder emails
- Dark/light mode, responsive design, multi-language support

## Tech Stack

- **Framework:** Next.js 16, TypeScript, Tailwind CSS
- **AI:** OpenAI GPT-4o (analysis, research, composition, classification)
- **Database:** Supabase (PostgreSQL)
- **Auth:** Auth.js v5 (Google OAuth with Gmail API)

## APIs

- **OpenAI** — Email analysis, itinerary research, email composition, Gmail classification
- **Booking.com** (RapidAPI) — Real hotel search with prices, ratings, coordinates
- **Sky Scrapper** (RapidAPI) — Real flight search with airlines, times, prices
- **Google Places** — Restaurant, attraction, and POI discovery
- **Google Maps** — Interactive maps with hotel and place pins
- **Gmail API** — Inbox sync, email classification, compose integration
- **Open-Meteo** — Weather forecasts for travel destinations

## Getting Started

```bash
npm install
cp .env.local.example .env.local
# Fill in API keys
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Architecture

```
Voyager AI
├── Next.js 16 App Router (React 19)
├── 6 AI Agents (Email Analyzer, Flight, Hotel, Research, Places, Composer)
├── Gmail OAuth2 Integration (read + classify + compose)
├── Supabase Database (customers, conversations, trips, versions)
├── CRM Integration Layer (SoftOne, Webhook, HubSpot, Salesforce...)
└── Real-time SSE Streaming (agent status + email composition)
```

## Built by

**Revival SA — AI & Business Intelligence**
