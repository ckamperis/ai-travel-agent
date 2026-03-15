'use client';

import { useState, useCallback } from 'react';
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
}

interface HotelResult {
  name: string;
  area: string;
  pricePerNight: number;
  rating: number;
  stars: number;
  metroStation: string;
  metroDistance: string;
}

interface PlaceResult {
  name: string;
  rating: number;
  category: string;
  address: string;
}

interface ResearchDay {
  day: string;
  description: string;
}

/* ---------- Mock data ---------- */

const MOCK_FLIGHTS: FlightResult[] = [
  { airline: 'Aegean Airlines', departure: '06:45', arrival: '10:30', stops: 0, price: '289€', isBest: true },
  { airline: 'Lufthansa', departure: '08:15', arrival: '13:50', stops: 1, price: '312€' },
  { airline: 'Ryanair', departure: '11:30', arrival: '15:20', stops: 0, price: '198€' },
  { airline: 'Austrian Airlines', departure: '07:00', arrival: '12:45', stops: 1, price: '275€' },
];

const MOCK_HOTELS: HotelResult[] = [
  { name: 'Hermes Hotel', area: 'Σύνταγμα', pricePerNight: 142, rating: 8.9, stars: 3, metroStation: 'Σύνταγμα', metroDistance: '3 λεπτά' },
  { name: 'Hotel Plaka', area: 'Πλάκα', pricePerNight: 135, rating: 8.7, stars: 3, metroStation: 'Μοναστηράκι', metroDistance: '2 λεπτά' },
  { name: 'Electra Palace Athens', area: 'Πλάκα', pricePerNight: 195, rating: 9.1, stars: 5, metroStation: 'Σύνταγμα', metroDistance: '4 λεπτά' },
];

const MOCK_PLACES: PlaceResult[] = [
  { name: 'Ακρόπολη', rating: 4.8, category: 'Αξιοθέατο', address: 'Athens 105 58' },
  { name: 'Τα Καραμανλίδικα του Φάνη', rating: 4.6, category: 'Εστιατόριο', address: 'Σωκράτους 1, Αθήνα' },
  { name: 'Μουσείο Ακρόπολης', rating: 4.7, category: 'Μουσείο', address: 'Διονυσίου Αρεοπαγίτου 15' },
  { name: 'To Kafeneio', rating: 4.5, category: 'Εστιατόριο', address: 'Λουκιανού 26, Κολωνάκι' },
  { name: 'Αρχαία Αγορά', rating: 4.6, category: 'Αξιοθέατο', address: 'Adrianou 24, Αθήνα' },
];

const MOCK_RESEARCH: ResearchDay[] = [
  { day: 'Ημέρα 1', description: 'Άφιξη στην Αθήνα, check-in, περπάτημα στην Πλάκα, δείπνο σε ταβέρνα' },
  { day: 'Ημέρα 2', description: 'Ακρόπολη & Μουσείο, γεύμα στο Μοναστηράκι, Ανάφη - ηλιοβασίλεμα' },
  { day: 'Ημέρα 3', description: 'Αρχαία Αγορά, Κεραμεικός, street food tour στου Ψυρρή' },
  { day: 'Ημέρα 4', description: 'Ημερήσια εκδρομή στην Αίγινα ή Ύδρα (νησί)' },
  { day: 'Ημέρα 5', description: 'Δεύτερη ημέρα στο νησί - παραλίες, τοπική κουζίνα' },
  { day: 'Ημέρα 6', description: 'Εθνικό Αρχαιολογικό Μουσείο, Εξάρχεια, Κολωνάκι' },
  { day: 'Ημέρα 7', description: 'Τελευταίες αγορές, Λυκαβηττός, αναχώρηση' },
];

const MOCK_COMPOSED_EMAIL = `Liebe Frau und Herr Mueller,

vielen Dank für Ihre Anfrage! Wir freuen uns, Ihnen bei der Planung Ihrer Griechenlandreise helfen zu können. Hier ist unser Vorschlag:

✈️ FLÜGE
Wir empfehlen den Direktflug mit Aegean Airlines:
- Hamburg → Athen: Montag, 06:45 - 10:30 (Direktflug)
- Preis: 289€ pro Person

🏨 HOTEL
Das Hermes Hotel im Stadtzentrum (Syntagma):
- 142€ pro Nacht, Bewertung 8.9/10
- 3 Minuten zur Metro, ideal für Erkundungen
- Frühstück, WiFi, Rooftop-Bar mit Akropolis-Blick

📋 REISEPLAN
Tag 1: Ankunft, Check-in, Spaziergang durch Plaka
Tag 2: Akropolis & Museum, Abendessen in Monastiraki
Tag 3: Antike Agora, Street Food Tour in Psyrri
Tag 4-5: Ausflug nach Hydra (Insel) — Geschichte & Strände
Tag 6: Nationalmuseum, Exarchia & Kolonaki Viertel
Tag 7: Letzte Einkäufe, Lykavittos-Hügel, Abreise

📍 RESTAURANT-TIPPS
- Ta Karamanlidika tou Fani (★4.6) — authentische griechische Küche
- To Kafeneio (★4.5) — traditionelles Café in Kolonaki

Sollen wir die Flüge und das Hotel für Sie buchen?

Mit freundlichen Grüßen,
Ihr Afea Travel Team`;

/* ---------- Agent definitions ---------- */

const AGENTS = [
  { id: 'email', name: 'Ανάλυση Email', icon: '📧', color: '#0891B2' },
  { id: 'flight', name: 'Αναζήτηση Πτήσεων', icon: '✈️', color: '#22D3EE' },
  { id: 'hotel', name: 'Αναζήτηση Ξενοδοχείων', icon: '🏨', color: '#F59E0B' },
  { id: 'research', name: 'Έρευνα Προορισμού', icon: '🔍', color: '#10B981' },
  { id: 'places', name: 'Τοποθεσίες & Εστιατόρια', icon: '📍', color: '#A78BFA' },
  { id: 'composer', name: 'Σύνθεση Απάντησης', icon: '✍️', color: '#EC4899' },
] as const;

/* ---------- Helpers ---------- */

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/* ---------- Component ---------- */

export default function Home() {
  const [phase, setPhase] = useState<Phase>('landing');
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [agentMessages, setAgentMessages] = useState<Record<string, string>>({});
  const [flights, setFlights] = useState<FlightResult[] | null>(null);
  const [hotels, setHotels] = useState<HotelResult[] | null>(null);
  const [places, setPlaces] = useState<PlaceResult[] | null>(null);
  const [research, setResearch] = useState<ResearchDay[] | null>(null);
  const [composedEmail, setComposedEmail] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [startTime, setStartTime] = useState(0);
  const [totalTime, setTotalTime] = useState(0);

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
    setFlights(null);
    setHotels(null);
    setPlaces(null);
    setResearch(null);
    setComposedEmail('');
    setIsStreaming(false);
    setTotalTime(0);
  }, []);

  /* ---------- Mock simulation ---------- */
  const runDemo = useCallback(async () => {
    const t0 = Date.now();
    setStartTime(t0);

    // Phase 1: Email arrives
    setPhase('email-arrived');
    await sleep(2000);

    // Phase 2: Analyzing email
    setPhase('analyzing');
    setAgent('email', 'active', 'Ανάλυση περιεχομένου email...');
    await sleep(2000);
    setAgent('email', 'done', 'Εξήχθησαν: προορισμός, ημερομηνίες, προτιμήσεις');
    await sleep(800);

    // Phase 3: Parallel agents
    setPhase('processing');

    // Start all 4 agents
    setAgent('flight', 'active', 'Αναζήτηση πτήσεων HAM → ATH...');
    setAgent('hotel', 'active', 'Αναζήτηση ξενοδοχείων στην Αθήνα...');
    setAgent('research', 'active', 'Δημιουργία προγράμματος ταξιδιού...');
    setAgent('places', 'active', 'Αναζήτηση εστιατορίων & αξιοθέατων...');

    // Stagger completions for visual effect
    await sleep(2500);
    setAgent('flight', 'done', '4 πτήσεις βρέθηκαν — καλύτερη: Aegean 289€');
    setFlights(MOCK_FLIGHTS);

    await sleep(1200);
    setAgent('hotel', 'done', '3 ξενοδοχεία — προτεινόμενο: Hermes Hotel 142€');
    setHotels(MOCK_HOTELS);

    await sleep(1500);
    setAgent('places', 'done', '5 τοποθεσίες — εστιατόρια & αξιοθέατα');
    setPlaces(MOCK_PLACES);

    await sleep(1000);
    setAgent('research', 'done', 'Πρόγραμμα 7 ημερών — Αθήνα + νησί');
    setResearch(MOCK_RESEARCH);

    await sleep(1500);

    // Phase 4: Review
    setPhase('review');
    await sleep(500);
  }, [setAgent]);

  const runComposer = useCallback(async () => {
    setPhase('composing');
    setAgent('composer', 'active', 'Σύνθεση email απάντησης...');
    setIsStreaming(true);

    // Simulate streaming
    for (let i = 0; i <= MOCK_COMPOSED_EMAIL.length; i++) {
      setComposedEmail(MOCK_COMPOSED_EMAIL.slice(0, i));
      // Variable speed: faster for spaces, slower for newlines
      const char = MOCK_COMPOSED_EMAIL[i];
      const delay = char === '\n' ? 40 : char === ' ' ? 15 : 12;
      await sleep(delay);
    }

    setIsStreaming(false);
    setAgent('composer', 'done', 'Email απάντησης έτοιμο');
    setTotalTime(Math.round((Date.now() - startTime) / 1000));
    setPhase('done');
  }, [setAgent, startTime]);

  /* ---------- Render ---------- */

  const showStatusBar = phase !== 'landing';

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      {/* Background pattern */}
      <div className="pointer-events-none fixed inset-0 z-0 opacity-[0.03]"
        style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
          backgroundSize: '40px 40px',
        }}
      />

      <AgentStatusBar statuses={agentStatuses} visible={showStatusBar} />

      <main
        className={`relative z-10 flex min-h-screen flex-col items-center px-6 ${
          showStatusBar ? 'pt-24' : 'pt-0'
        } pb-12`}
      >
        {/* ===== LANDING ===== */}
        {phase === 'landing' && (
          <div className="flex min-h-screen flex-col items-center justify-center gap-8">
            <div className="animate-fade-in-up text-center">
              <h1 className="font-serif text-6xl font-bold leading-tight">
                <span className="gradient-text">AI Travel Agent</span>
              </h1>
              <p className="mt-4 max-w-xl text-lg text-foreground/50 leading-relaxed">
                Δείτε πώς πολλαπλοί AI agents συνεργάζονται σε πραγματικό χρόνο
                για να απαντήσουν σε ένα email πελάτη
              </p>
            </div>

            <div className="animate-fade-in-up stagger-2 flex flex-col items-center gap-4">
              {/* Scenario card */}
              <div className="glass-card max-w-lg px-6 py-4 text-center">
                <p className="text-sm text-foreground/50">
                  <span className="font-semibold text-teal">Σενάριο:</span>{' '}
                  Ένα ζευγάρι από τη Γερμανία στέλνει email ζητώντας βοήθεια
                  για ταξίδι μίας εβδομάδας στην Ελλάδα
                </p>
              </div>

              <ActionButton
                label="Εκκίνηση Demo"
                icon="🚀"
                onClick={runDemo}
                size="large"
              />
            </div>

            {/* Agent preview */}
            <div className="animate-fade-in stagger-4 mt-4 flex flex-wrap justify-center gap-3">
              {AGENTS.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center gap-2 rounded-full px-3 py-1.5 text-xs"
                  style={{
                    background: `${a.color}15`,
                    border: `1px solid ${a.color}30`,
                    color: a.color,
                  }}
                >
                  <span>{a.icon}</span>
                  <span className="font-medium">{a.name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ===== EMAIL ARRIVED ===== */}
        {phase === 'email-arrived' && (
          <div className="flex min-h-[80vh] flex-col items-center justify-center gap-6">
            <div className="animate-fade-in text-center">
              <p className="text-lg text-teal font-medium">📨 Νέο email ελήφθη</p>
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
                icon="📧"
                name="Ανάλυση Email"
                color="#0891B2"
                status={agentStatuses.email || 'idle'}
                message={agentMessages.email || ''}
              />
            </div>
          </div>
        )}

        {/* ===== PROCESSING ===== */}
        {phase === 'processing' && (
          <div className="flex w-full max-w-6xl gap-8">
            {/* Left: agents */}
            <div className="w-80 flex-shrink-0 space-y-3">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-foreground/30">
                Agents
              </h2>
              <AgentCard icon="📧" name="Ανάλυση Email" color="#0891B2" status={agentStatuses.email || 'idle'} message={agentMessages.email || ''} />
              <AgentCard icon="✈️" name="Πτήσεις" color="#22D3EE" status={agentStatuses.flight || 'idle'} message={agentMessages.flight || ''} delay={100} />
              <AgentCard icon="🏨" name="Ξενοδοχεία" color="#F59E0B" status={agentStatuses.hotel || 'idle'} message={agentMessages.hotel || ''} delay={200} />
              <AgentCard icon="🔍" name="Έρευνα" color="#10B981" status={agentStatuses.research || 'idle'} message={agentMessages.research || ''} delay={300} />
              <AgentCard icon="📍" name="Τοποθεσίες" color="#A78BFA" status={agentStatuses.places || 'idle'} message={agentMessages.places || ''} delay={400} />
            </div>

            {/* Right: results */}
            <div className="min-w-0 flex-1">
              <h2 className="mb-4 text-xs font-bold uppercase tracking-wider text-foreground/30">
                Αποτελέσματα
              </h2>
              <ResultsPanel
                flights={flights}
                hotels={hotels}
                places={places}
                research={research}
              />
              {!flights && !hotels && !places && !research && (
                <div className="glass-card flex h-48 items-center justify-center">
                  <p className="text-sm text-foreground/30">
                    Αναμονή αποτελεσμάτων...
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
              <h2 className="font-serif text-3xl font-bold text-foreground">
                Όλα τα δεδομένα συλλέχθηκαν
              </h2>
              <p className="mt-2 text-foreground/50">
                Έτοιμο για σύνθεση απάντησης email
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
                label="Σύνθεση Απάντησης"
                icon="✍️"
                onClick={runComposer}
                size="large"
              />
            </div>
          </div>
        )}

        {/* ===== COMPOSING ===== */}
        {phase === 'composing' && (
          <div className="flex w-full max-w-4xl flex-col items-center gap-6">
            <AgentCard
              icon="✍️"
              name="Σύνθεση Απάντησης"
              color="#EC4899"
              status={agentStatuses.composer || 'idle'}
              message={agentMessages.composer || ''}
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
              <h2 className="font-serif text-3xl font-bold text-foreground">
                Ολοκληρώθηκε!
              </h2>
              {totalTime > 0 && (
                <p className="mt-2 text-foreground/50">
                  Συνολικός χρόνος:{' '}
                  <span className="font-semibold text-teal">{totalTime} δευτερόλεπτα</span>
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
              label="Επανεκκίνηση"
              icon="🔄"
              onClick={resetAll}
              variant="secondary"
            />
          </div>
        )}
      </main>
    </div>
  );
}
