'use client';

import { useState, useCallback, useRef } from 'react';
import {
  Play,
  Mail,
  Plane,
  Building2,
  Search,
  MapPin,
  PenTool,
  RefreshCw,
  Clock,
  Zap,
} from 'lucide-react';
import AgentStatusBar, { type AgentStatus } from '@/components/AgentStatusBar';
import EmailInbox from '@/components/EmailInbox';
import AgentCard from '@/components/AgentCard';
import ResultsPanel from '@/components/ResultsPanel';
import EmailComposer from '@/components/EmailComposer';
import ActionButton from '@/components/ActionButton';

/* ---------- Types ---------- */

type Phase =
  | 'landing'
  | 'email-arrived'
  | 'analyzing'
  | 'processing'
  | 'review'
  | 'composing'
  | 'done';

interface FlightResult {
  airline: string;
  departure: string;
  arrival: string;
  stops: number;
  price: string;
  isBest?: boolean;
  source?: 'live' | 'mock';
  duration?: string;
}

interface HotelResult {
  name: string;
  area: string;
  pricePerNight: number;
  rating: number;
  stars: number;
  metroStation: string;
  metroDistance: string;
  source?: 'live' | 'mock';
}

interface PlaceResult {
  name: string;
  rating: number;
  category: string;
  address: string;
  source?: 'live' | 'mock';
}

interface ResearchDay {
  day: string;
  description: string;
}

/* ---------- Fallback mock data ---------- */

const MOCK_FLIGHTS: FlightResult[] = [
  { airline: 'Aegean Airlines', departure: '06:45', arrival: '10:30', stops: 0, price: '289€', isBest: true, source: 'mock' },
  { airline: 'Lufthansa', departure: '08:15', arrival: '13:50', stops: 1, price: '312€', source: 'mock' },
  { airline: 'Ryanair', departure: '11:30', arrival: '15:20', stops: 0, price: '198€', source: 'mock' },
  { airline: 'Austrian Airlines', departure: '07:00', arrival: '12:45', stops: 1, price: '275€', source: 'mock' },
];

const MOCK_HOTELS: HotelResult[] = [
  { name: 'Hermes Hotel', area: 'Syntagma', pricePerNight: 142, rating: 8.9, stars: 3, metroStation: 'Syntagma', metroDistance: '3 min', source: 'mock' },
  { name: 'Hotel Plaka', area: 'Plaka', pricePerNight: 135, rating: 8.7, stars: 3, metroStation: 'Monastiraki', metroDistance: '2 min', source: 'mock' },
  { name: 'Electra Palace Athens', area: 'Plaka', pricePerNight: 195, rating: 9.1, stars: 5, metroStation: 'Syntagma', metroDistance: '4 min', source: 'mock' },
];

const MOCK_PLACES: PlaceResult[] = [
  { name: 'Acropolis', rating: 4.8, category: 'Landmark', address: 'Athens 105 58', source: 'mock' },
  { name: 'Ta Karamanlidika tou Fani', rating: 4.6, category: 'Restaurant', address: 'Sokratous 1, Athens', source: 'mock' },
  { name: 'Acropolis Museum', rating: 4.7, category: 'Museum', address: 'Dionysiou Areopagitou 15', source: 'mock' },
  { name: 'To Kafeneio', rating: 4.5, category: 'Restaurant', address: 'Loukianou 26, Kolonaki', source: 'mock' },
  { name: 'Ancient Agora', rating: 4.6, category: 'Landmark', address: 'Adrianou 24, Athens', source: 'mock' },
];

const MOCK_RESEARCH: ResearchDay[] = [
  { day: 'Day 1', description: 'Arrive in Athens, check-in, walk through Plaka, dinner at taverna' },
  { day: 'Day 2', description: 'Acropolis & Museum, lunch at Monastiraki, sunset' },
  { day: 'Day 3', description: 'Ancient Agora, Kerameikos, street food tour in Psyrri' },
  { day: 'Day 4', description: 'Day trip to Aegina or Hydra island' },
  { day: 'Day 5', description: 'Second island day — beaches, local cuisine' },
  { day: 'Day 6', description: 'National Archaeological Museum, Exarchia, Kolonaki' },
  { day: 'Day 7', description: 'Last shopping, Lycabettus Hill, departure' },
];

const MOCK_COMPOSED_EMAIL = `Liebe Frau und Herr Mueller,

vielen Dank für Ihre Anfrage! Wir freuen uns, Ihnen bei der Planung Ihrer Griechenlandreise helfen zu können. Hier ist unser Vorschlag:

FLÜGE
Wir empfehlen den Direktflug mit Aegean Airlines:
- Hamburg → Athen: Montag, 06:45 - 10:30 (Direktflug)
- Preis: 289€ pro Person

HOTEL
Das Hermes Hotel im Stadtzentrum (Syntagma):
- 142€ pro Nacht, Bewertung 8.9/10
- 3 Minuten zur Metro, ideal für Erkundungen
- Frühstück, WiFi, Rooftop-Bar mit Akropolis-Blick

REISEPLAN
Tag 1: Ankunft, Check-in, Spaziergang durch Plaka
Tag 2: Akropolis & Museum, Abendessen in Monastiraki
Tag 3: Antike Agora, Street Food Tour in Psyrri
Tag 4-5: Ausflug nach Hydra (Insel) — Geschichte & Strände
Tag 6: Nationalmuseum, Exarchia & Kolonaki Viertel
Tag 7: Letzte Einkäufe, Lykavittos-Hügel, Abreise

RESTAURANT-TIPPS
- Ta Karamanlidika tou Fani — authentische griechische Küche
- To Kafeneio — traditionelles Café in Kolonaki

Sollen wir die Flüge und das Hotel für Sie buchen?

Mit freundlichen Grüßen,
Ihr Afea Travel Team`;

/* ---------- Agent icon map ---------- */

const AGENT_ICONS: Record<string, React.ReactNode> = {
  email: <Mail size={18} />,
  flight: <Plane size={18} />,
  hotel: <Building2 size={18} />,
  research: <Search size={18} />,
  places: <MapPin size={18} />,
  composer: <PenTool size={18} />,
};

const AGENT_COLORS: Record<string, string> = {
  email: '#0891B2',
  flight: '#22D3EE',
  hotel: '#F59E0B',
  research: '#10B981',
  places: '#A78BFA',
  composer: '#EC4899',
};

const AGENT_NAMES: Record<string, string> = {
  email: 'Ανάλυση Email',
  flight: 'Πτήσεις',
  hotel: 'Ξενοδοχεία',
  research: 'Έρευνα',
  places: 'Τοποθεσίες',
  composer: 'Σύνθεση',
};

const AGENTS_PREVIEW = [
  { id: 'email', name: 'Ανάλυση Email', icon: <Mail size={13} />, color: '#0891B2' },
  { id: 'flight', name: 'Αναζήτηση Πτήσεων', icon: <Plane size={13} />, color: '#22D3EE' },
  { id: 'hotel', name: 'Αναζήτηση Ξενοδοχείων', icon: <Building2 size={13} />, color: '#F59E0B' },
  { id: 'research', name: 'Έρευνα Προορισμού', icon: <Search size={13} />, color: '#10B981' },
  { id: 'places', name: 'Τοποθεσίες & Εστιατόρια', icon: <MapPin size={13} />, color: '#A78BFA' },
  { id: 'composer', name: 'Σύνθεση Απάντησης', icon: <PenTool size={13} />, color: '#EC4899' },
];

/* ---------- Helpers ---------- */

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function parseResearchTodays(text: string): ResearchDay[] {
  const lines = text.split('\n').filter((l) => l.trim());
  const days: ResearchDay[] = [];
  let currentDay = '';
  let currentDesc = '';

  for (const line of lines) {
    const dayMatch = line.match(/^(?:Day|Ημέρα|Tag)\s*(\d+)/i);
    if (dayMatch) {
      if (currentDay) days.push({ day: currentDay, description: currentDesc.trim() });
      currentDay = `Day ${dayMatch[1]}`;
      currentDesc = line.replace(/^(?:Day|Ημέρα|Tag)\s*\d+[:\-–—.\s]*/i, '');
    } else if (currentDay) {
      currentDesc += ' ' + line;
    }
  }
  if (currentDay) days.push({ day: currentDay, description: currentDesc.trim() });
  return days.length > 0 ? days : MOCK_RESEARCH;
}

/* ---------- Component ---------- */

export default function Home() {
  const [phase, setPhase] = useState<Phase>('landing');
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [agentMessages, setAgentMessages] = useState<Record<string, string>>({});
  const [agentTimes, setAgentTimes] = useState<Record<string, number>>({});
  const [flights, setFlights] = useState<FlightResult[] | null>(null);
  const [hotels, setHotels] = useState<HotelResult[] | null>(null);
  const [places, setPlaces] = useState<PlaceResult[] | null>(null);
  const [research, setResearch] = useState<ResearchDay[] | null>(null);
  const [composedEmail, setComposedEmail] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);
  const [usedLiveApi, setUsedLiveApi] = useState(false);

  const agentStartTimes = useRef<Record<string, number>>({});

  const setAgent = useCallback(
    (id: string, status: AgentStatus, message: string) => {
      setAgentStatuses((prev) => ({ ...prev, [id]: status }));
      setAgentMessages((prev) => ({ ...prev, [id]: message }));
    },
    []
  );

  const resetAll = useCallback(() => {
    setPhase('landing');
    setAgentStatuses({});
    setAgentMessages({});
    setAgentTimes({});
    setFlights(null);
    setHotels(null);
    setPlaces(null);
    setResearch(null);
    setComposedEmail('');
    setIsStreaming(false);
    setTotalTime(0);
    setUsedLiveApi(false);
    agentStartTimes.current = {};
  }, []);

  /* ---------- Live SSE streaming ---------- */
  const runLiveDemo = useCallback(async () => {
    const t0 = Date.now();
    setStartTime(t0);

    // Phase 1: Email arrives
    setPhase('email-arrived');
    await sleep(1800);

    // Phase 2: Start SSE
    setPhase('analyzing');
    setUsedLiveApi(true);

    let composerText = '';

    try {
      const response = await fetch('/api/orchestrate', { method: 'POST' });
      if (!response.ok || !response.body) throw new Error('SSE failed');

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;

          try {
            const event = JSON.parse(payload);
            const { agent, status, message, data } = event;

            // Map backend statuses to frontend
            if (status === 'started') {
              agentStartTimes.current[agent] = Date.now();
              setAgent(agent, 'active', message);

              // Transition to processing phase when parallel agents start
              if (agent === 'flight') {
                setPhase('processing');
              }
            } else if (status === 'working') {
              if (agent === 'composer') {
                if (!isStreaming) {
                  setPhase('composing');
                  setIsStreaming(true);
                }
                composerText += message;
                setComposedEmail(composerText);
              } else {
                setAgent(agent, 'active', message);
              }
            } else if (status === 'done') {
              const elapsed = agentStartTimes.current[agent]
                ? Date.now() - agentStartTimes.current[agent]
                : null;
              if (elapsed != null) {
                setAgentTimes((prev) => ({ ...prev, [agent]: elapsed }));
              }
              setAgent(agent, 'done', message);

              // Store results
              if (agent === 'flight' && data) {
                const flightData = (Array.isArray(data) ? data : []).map(
                  (f: { owner?: { name?: string }; total_amount?: string; total_currency?: string; departureTime?: string; arrivalTime?: string; airline?: string; price?: number; currency?: string; stops?: number; duration?: string; slices?: Array<{ segments?: Array<{ departing_at?: string; arriving_at?: string; marketing_carrier?: { name?: string } }> }> }, i: number) => ({
                    airline: f.airline || f.owner?.name || `Flight ${i + 1}`,
                    departure: f.departureTime || (f.slices?.[0]?.segments?.[0]?.departing_at ? new Date(f.slices[0].segments[0].departing_at).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'),
                    arrival: f.arrivalTime || (f.slices?.[0]?.segments?.[(f.slices[0].segments?.length || 1) - 1]?.arriving_at ? new Date(f.slices[0].segments![(f.slices[0].segments?.length || 1) - 1].arriving_at!).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }) : '--:--'),
                    stops: f.stops ?? 0,
                    price: f.price != null ? `${f.price}${f.currency || '€'}` : f.total_amount ? `${f.total_amount}${f.total_currency || '€'}` : 'N/A',
                    isBest: i === 0,
                    source: 'live' as const,
                    duration: f.duration,
                  })
                );
                setFlights(flightData.length > 0 ? flightData : MOCK_FLIGHTS);
              }
              if (agent === 'hotel' && data) {
                const hotelData = (Array.isArray(data) ? data : []).map(
                  (h: { name?: string; area?: string; pricePerNight?: number; rating?: number; stars?: number; metroStation?: string; metroDistance?: string }) => ({
                    name: h.name || 'Hotel',
                    area: h.area || '',
                    pricePerNight: h.pricePerNight || 0,
                    rating: h.rating || 0,
                    stars: h.stars || 3,
                    metroStation: h.metroStation || '',
                    metroDistance: h.metroDistance || '',
                    source: 'live' as const,
                  })
                );
                setHotels(hotelData.length > 0 ? hotelData : MOCK_HOTELS);
              }
              if (agent === 'places' && data) {
                const placeData = (Array.isArray(data) ? data : []).map(
                  (p: { name?: string; displayName?: { text?: string }; rating?: number; address?: string; formattedAddress?: string; summary?: string; editorialSummary?: { text?: string }; category?: string; types?: string[] }) => ({
                    name: p.name || p.displayName?.text || 'Place',
                    rating: p.rating || 0,
                    category: p.category || (p.types?.[0] || 'Place'),
                    address: p.address || p.formattedAddress || '',
                    source: 'live' as const,
                  })
                );
                setPlaces(placeData.length > 0 ? placeData : MOCK_PLACES);
              }
              if (agent === 'research' && data) {
                const researchText = typeof data === 'string' ? data : JSON.stringify(data);
                setResearch(parseResearchTodays(researchText));
              }
              if (agent === 'composer') {
                setIsStreaming(false);
                setTotalTime(Math.round((Date.now() - t0) / 1000));
                setPhase('done');
              }
            } else if (status === 'error') {
              setAgent(agent, 'error', message);
            }
          } catch {
            // skip unparseable lines
          }
        }
      }
    } catch {
      // Fallback to mock if SSE fails
      runMockDemo();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [setAgent]);

  /* ---------- Mock fallback ---------- */
  const runMockDemo = useCallback(async () => {
    const t0 = Date.now();
    setStartTime(t0);

    setPhase('email-arrived');
    await sleep(1800);

    setPhase('analyzing');
    setAgent('email', 'active', 'Ανάλυση περιεχομένου email...');
    await sleep(1800 + Math.random() * 800);
    setAgent('email', 'done', 'Εξήχθησαν: προορισμός, ημερομηνίες, προτιμήσεις');
    setAgentTimes((prev) => ({ ...prev, email: 1800 + Math.round(Math.random() * 800) }));
    await sleep(600);

    setPhase('processing');

    setAgent('flight', 'active', 'Αναζήτηση πτήσεων HAM → ATH...');
    setAgent('hotel', 'active', 'Αναζήτηση ξενοδοχείων στην Αθήνα...');
    setAgent('research', 'active', 'Δημιουργία προγράμματος ταξιδιού...');
    setAgent('places', 'active', 'Αναζήτηση εστιατορίων & αξιοθέατων...');

    agentStartTimes.current = {
      flight: Date.now(),
      hotel: Date.now(),
      research: Date.now(),
      places: Date.now(),
    };

    await sleep(2200 + Math.random() * 600);
    setAgent('flight', 'done', '4 πτήσεις βρέθηκαν');
    setFlights(MOCK_FLIGHTS);
    setAgentTimes((prev) => ({ ...prev, flight: Date.now() - agentStartTimes.current.flight }));

    await sleep(1000 + Math.random() * 500);
    setAgent('hotel', 'done', '3 ξενοδοχεία βρέθηκαν');
    setHotels(MOCK_HOTELS);
    setAgentTimes((prev) => ({ ...prev, hotel: Date.now() - agentStartTimes.current.hotel }));

    await sleep(800 + Math.random() * 700);
    setAgent('places', 'done', '5 τοποθεσίες βρέθηκαν');
    setPlaces(MOCK_PLACES);
    setAgentTimes((prev) => ({ ...prev, places: Date.now() - agentStartTimes.current.places }));

    await sleep(1200 + Math.random() * 400);
    setAgent('research', 'done', 'Πρόγραμμα 7 ημερών');
    setResearch(MOCK_RESEARCH);
    setAgentTimes((prev) => ({ ...prev, research: Date.now() - agentStartTimes.current.research }));

    await sleep(1200);
    setPhase('review');
  }, [setAgent]);

  const runComposer = useCallback(async () => {
    setPhase('composing');
    setAgent('composer', 'active', 'Σύνθεση email απάντησης...');
    setIsStreaming(true);
    agentStartTimes.current.composer = Date.now();

    for (let i = 0; i <= MOCK_COMPOSED_EMAIL.length; i++) {
      setComposedEmail(MOCK_COMPOSED_EMAIL.slice(0, i));
      const char = MOCK_COMPOSED_EMAIL[i];
      const delay = char === '\n' ? 35 + Math.random() * 20 : char === ' ' ? 12 + Math.random() * 8 : 8 + Math.random() * 10;
      await sleep(delay);
    }

    setIsStreaming(false);
    setAgent('composer', 'done', 'Email απάντησης έτοιμο');
    setAgentTimes((prev) => ({ ...prev, composer: Date.now() - agentStartTimes.current.composer }));
    setTotalTime(Math.round((Date.now() - startTime) / 1000));
    setPhase('done');
  }, [setAgent, startTime]);

  const runDemo = useCallback(async () => {
    try {
      await runLiveDemo();
    } catch {
      await runMockDemo();
    }
  }, [runLiveDemo, runMockDemo]);

  /* ---------- Render ---------- */

  const showStatusBar = phase !== 'landing';

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background grid */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
          backgroundSize: '48px 48px',
        }}
      />

      <AgentStatusBar statuses={agentStatuses} visible={showStatusBar} />

      <main
        className={`relative z-10 flex min-h-screen flex-col items-center px-6 ${
          showStatusBar ? 'pt-24' : 'pt-0'
        } pb-20`}
      >
        {/* ===== LANDING ===== */}
        {phase === 'landing' && (
          <div className="flex min-h-screen flex-col items-center justify-center gap-8">
            {/* Header */}
            <div className="animate-fade-in-up text-center">
              <div className="mb-4 flex items-center justify-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal/20 to-cyan/20 border border-teal/20">
                  <Zap size={24} className="text-teal" />
                </div>
              </div>
              <h1 className="text-5xl font-bold tracking-tight text-foreground">
                AI Travel Assistant
              </h1>
              <p className="mt-2 text-sm font-medium uppercase tracking-widest text-foreground/30">
                Agentic Workflow Demo
              </p>
            </div>

            <div className="animate-fade-in-up stagger-2 flex flex-col items-center gap-5">
              {/* Scenario */}
              <div className="glass-card max-w-lg px-5 py-3.5 text-center">
                <p className="text-sm text-foreground/45 leading-relaxed">
                  <span className="font-medium text-teal/80">Scenario:</span>{' '}
                  A German couple sends an email requesting help planning a week-long trip to Greece.
                  Multiple AI agents collaborate in real-time to compose a complete response.
                </p>
              </div>

              <ActionButton
                label="Start Demo"
                icon={<Play size={18} />}
                onClick={runDemo}
                size="large"
              />
            </div>

            {/* Agent preview pills */}
            <div className="animate-fade-in stagger-4 mt-2 flex flex-wrap justify-center gap-2">
              {AGENTS_PREVIEW.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1 text-[11px]"
                  style={{
                    background: `${a.color}08`,
                    border: `1px solid ${a.color}18`,
                    color: `${a.color}cc`,
                  }}
                >
                  {a.icon}
                  <span className="font-medium">{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== EMAIL ARRIVED ===== */}
        {phase === 'email-arrived' && (
          <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6">
            <div className="animate-fade-in flex items-center gap-2 text-sm text-teal/80">
              <Mail size={16} />
              <span className="font-medium">New email received</span>
            </div>
            <EmailInbox visible />
          </div>
        )}

        {/* ===== ANALYZING ===== */}
        {phase === 'analyzing' && (
          <div className="flex w-full max-w-4xl flex-col items-center gap-6">
            <EmailInbox visible compact />
            <div className="w-full max-w-md">
              <AgentCard
                icon={AGENT_ICONS.email}
                name={AGENT_NAMES.email}
                color={AGENT_COLORS.email}
                status={agentStatuses.email || 'idle'}
                message={agentMessages.email || ''}
                elapsed={agentTimes.email}
              />
            </div>
          </div>
        )}

        {/* ===== PROCESSING ===== */}
        {phase === 'processing' && (
          <div className="flex w-full max-w-6xl gap-8">
            {/* Left: agents */}
            <div className="w-72 flex-shrink-0 space-y-2">
              <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-foreground/25">
                Active Agents
              </h2>
              {(['email', 'flight', 'hotel', 'research', 'places'] as const).map((id, i) => (
                <AgentCard
                  key={id}
                  icon={AGENT_ICONS[id]}
                  name={AGENT_NAMES[id]}
                  color={AGENT_COLORS[id]}
                  status={agentStatuses[id] || 'idle'}
                  message={agentMessages[id] || ''}
                  delay={i * 80}
                  elapsed={agentTimes[id]}
                />
              ))}
            </div>

            {/* Right: results */}
            <div className="min-w-0 flex-1">
              <h2 className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-foreground/25">
                Results
              </h2>
              <ResultsPanel
                flights={flights}
                hotels={hotels}
                places={places}
                research={research}
              />
              {!flights && !hotels && !places && !research && (
                <div className="glass-card flex h-40 items-center justify-center">
                  <p className="text-xs text-foreground/25">
                    Waiting for results...
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===== REVIEW ===== */}
        {phase === 'review' && (
          <div className="flex w-full max-w-5xl flex-col items-center gap-8">
            <div className="animate-fade-in text-center">
              <h2 className="text-2xl font-bold text-foreground">
                All data collected
              </h2>
              <p className="mt-1.5 text-sm text-foreground/40">
                Ready to compose response email
              </p>
            </div>
            <ResultsPanel
              flights={flights}
              hotels={hotels}
              places={places}
              research={research}
            />
            <div className="animate-fade-in-up stagger-3">
              <ActionButton
                label="Compose Response"
                icon={<PenTool size={16} />}
                onClick={usedLiveApi ? runComposer : runComposer}
                size="large"
              />
            </div>
          </div>
        )}

        {/* ===== COMPOSING ===== */}
        {phase === 'composing' && (
          <div className="flex w-full max-w-4xl flex-col items-center gap-6">
            <AgentCard
              icon={AGENT_ICONS.composer}
              name={AGENT_NAMES.composer}
              color={AGENT_COLORS.composer}
              status={agentStatuses.composer || 'idle'}
              message={agentMessages.composer || ''}
              elapsed={agentTimes.composer}
            />
            <EmailComposer
              text={composedEmail}
              isStreaming={isStreaming}
              visible
            />
          </div>
        )}

        {/* ===== DONE ===== */}
        {phase === 'done' && (
          <div className="flex w-full max-w-4xl flex-col items-center gap-6">
            <div className="animate-fade-in text-center">
              <h2 className="text-2xl font-bold text-foreground">
                Complete
              </h2>
              {totalTime > 0 && (
                <p className="mt-1.5 flex items-center justify-center gap-1.5 text-sm text-foreground/40">
                  <Clock size={14} />
                  Total time:{' '}
                  <span className="font-semibold text-teal tabular-nums">{totalTime}s</span>
                </p>
              )}
            </div>
            <EmailComposer
              text={composedEmail}
              isStreaming={false}
              visible
              onSend={() => alert('Email sent! (demo)')}
            />
            <ActionButton
              label="Restart"
              icon={<RefreshCw size={15} />}
              onClick={resetAll}
              variant="secondary"
            />
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="fixed bottom-0 left-0 right-0 z-20 border-t border-white/[0.04] bg-navy-deep/80 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl items-center justify-center gap-1.5 px-6 py-2.5 text-[11px] text-foreground/20">
          Powered by
          <span className="font-medium text-foreground/30">GPT-4o</span>
          <span className="text-foreground/10">+</span>
          <span className="font-medium text-foreground/30">Duffel</span>
          <span className="text-foreground/10">+</span>
          <span className="font-medium text-foreground/30">Google Places</span>
        </div>
      </footer>
    </div>
  );
}
