'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Plane, Building2, Search, MapPin, Loader2, CheckCircle, AlertCircle,
  Copy, Check, Clock, ArrowRight, ArrowLeft, Radio, Star, TrainFront,
  Send, PenTool, Mail, RotateCcw, ChevronDown, ChevronUp, X, Plus,
  ExternalLink,
} from 'lucide-react';
import type { EmailAnalysis, FlightResult, HotelResult, PlaceResult } from '@/agents/types';
import Breadcrumb from '@/components/Breadcrumb';
import { useToast } from '@/components/Toast';
import {
  loadSettings, type AppSettings,
  loadProfile, type Profile,
  addToHistory,
} from '@/lib/settings';

/* ================================================================
   Sample Emails
   ================================================================ */

const SAMPLE_EMAILS = [
  {
    id: 'greece',
    from: 'klaus.mueller@gmail.com',
    subject: 'Trip to Greece — 7 days',
    preview: 'We are Klaus and Anna Mueller from Hamburg, planning a trip to Greece...',
    date: '2 hours ago',
    body: `Guten Tag,

We are Klaus and Anna Mueller from Hamburg, Germany. We are planning a trip to Greece for next week (7 days) and we are looking for:

- Flights from Hamburg to Athens (arriving Monday morning if possible)
- A nice hotel in central Athens, close to metro, mid-range budget (~120-150€/night)
- A complete travel plan: what to see, where to eat, day trips from Athens
- We love history, local food, and walking around neighborhoods
- We would also like to visit one island for 2 days if possible

Could you please help us organize everything?

Best regards,
Klaus & Anna Mueller`,
  },
  {
    id: 'rome',
    from: 'sarah.johnson@outlook.com',
    subject: 'Family vacation to Rome — 5 days',
    preview: 'Hi! Our family of 4 is looking for a Rome trip next month...',
    date: '5 hours ago',
    body: `Hi there!

We're the Johnson family — myself, my husband Tom, and our two kids (ages 8 and 12). We'd love to plan a 5-day trip to Rome next month.

What we need:
- Flights from London Heathrow to Rome (flexible on dates)
- A family-friendly hotel near the Vatican area, budget around 130-180€/night
- Kid-friendly activities and restaurant suggestions
- We want to see the Colosseum, Vatican, and Trevi Fountain
- Any tips for traveling with kids in Rome?

Thank you so much!
Sarah Johnson`,
  },
  {
    id: 'santorini',
    from: 'marie.dupont@gmail.com',
    subject: 'Lune de miel à Santorin',
    preview: 'Bonjour, mon mari et moi souhaitons organiser notre lune de miel...',
    date: 'Yesterday',
    body: `Bonjour,

Mon mari et moi souhaitons organiser notre lune de miel à Santorin pour la semaine prochaine (5 jours).

Nous recherchons:
- Des vols depuis Paris CDG vers Santorin
- Un hôtel romantique avec vue sur la caldeira à Oia ou Fira, budget 200-300€/nuit
- Les meilleurs restaurants pour un dîner romantique
- Les couchers de soleil à ne pas manquer
- Excursion en bateau recommandée

Merci beaucoup!
Marie & Pierre Dupont`,
  },
];

/* ================================================================
   Types & Helpers
   ================================================================ */

type Step = 1 | 2 | 3 | 4;

interface EditableAnalysis {
  origin: string; originIATA: string;
  destination: string; destinationIATA: string;
  startDate: string; endDate: string; duration: number;
  adults: number; children: number;
  budgetMin: number; budgetMax: number; currency: string;
  interests: string[]; language: string;
  specialRequests: string[];
}

function toEditable(a: EmailAnalysis): EditableAnalysis {
  return {
    origin: a.origin, originIATA: a.originIATA,
    destination: a.destination, destinationIATA: a.destinationIATA,
    startDate: a.dates.start, endDate: a.dates.end, duration: a.dates.duration,
    adults: a.travelers.adults, children: a.travelers.children,
    budgetMin: a.budget.min, budgetMax: a.budget.max, currency: a.budget.currency,
    interests: [...a.interests], language: a.language,
    specialRequests: [...a.specialRequests],
  };
}

function toAnalysis(e: EditableAnalysis): EmailAnalysis {
  return {
    origin: e.origin, originIATA: e.originIATA,
    destination: e.destination, destinationIATA: e.destinationIATA,
    dates: { start: e.startDate, end: e.endDate, duration: e.duration },
    travelers: { adults: e.adults, children: e.children, names: [] },
    budget: { min: e.budgetMin, max: e.budgetMax, currency: e.currency },
    interests: e.interests, language: e.language,
    specialRequests: e.specialRequests,
  };
}

function fmtTime(ms: number) { return `${(ms / 1000).toFixed(1)}s`; }
function fmtClock(iso: string) {
  try { return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }); }
  catch { return iso; }
}

function parseResearchDays(text: string) {
  const lines = text.split('\n').filter(l => l.trim());
  const days: { day: string; desc: string }[] = [];
  let cur = '', desc = '';
  for (const line of lines) {
    const m = line.match(/\*?\*?(?:Day|Ημέρα|Tag|Jour)\s*(\d+)/i);
    if (m) { if (cur) days.push({ day: cur, desc: desc.trim() }); cur = `Day ${m[1]}`; desc = line.replace(/^[\s*]*(?:Day|Ημέρα|Tag|Jour)\s*\d+[^a-zA-Z]*/i, ''); }
    else if (cur) desc += ' ' + line;
  }
  if (cur) days.push({ day: cur, desc: desc.trim() });
  return days;
}

type AgentStatus = 'idle' | 'active' | 'done' | 'error';

const INPUT_CLS = 'w-full rounded-lg border border-card-border bg-navy-deep/50 px-4 py-2.5 text-sm text-foreground/80 outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/20';

function LiveBadge({ source }: { source?: 'live' | 'mock' }) {
  if (source !== 'live') return null;
  return (
    <span className="inline-flex items-center gap-1 rounded bg-green/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-green">
      <Radio size={8} className="animate-pulse" />Live
    </span>
  );
}

/* ================================================================
   Main Component
   ================================================================ */

export default function InboxPage() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => { setSettings(loadSettings()); setProfile(loadProfile()); }, []);

  // Step wizard
  const [step, setStep] = useState<Step>(1);
  const [emailText, setEmailText] = useState('');
  const [showPaste, setShowPaste] = useState(false);

  // Step 2: analysis
  const [analysis, setAnalysis] = useState<EmailAnalysis | null>(null);
  const [edited, setEdited] = useState<EditableAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<'live' | 'mock'>('mock');
  const [analysisTime, setAnalysisTime] = useState(0);

  // Step 3: results
  const [activeTab, setActiveTab] = useState<'flights' | 'hotels' | 'itinerary' | 'places'>('flights');
  const [flights, setFlights] = useState<FlightResult[]>([]);
  const [hotels, setHotels] = useState<HotelResult[]>([]);
  const [research, setResearch] = useState('');
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [selectedFlightIdx, setSelectedFlightIdx] = useState(0);
  const [selectedHotelIdx, setSelectedHotelIdx] = useState(0);
  const [includedPlaces, setIncludedPlaces] = useState<Set<string>>(new Set());
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [agentTimes, setAgentTimes] = useState<Record<string, number>>({});
  const [agentSources, setAgentSources] = useState<Record<string, 'live' | 'mock'>>({});
  const [agentMessages, setAgentMessages] = useState<Record<string, string>>({});
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [flightSort, setFlightSort] = useState<'price' | 'duration' | 'stops'>('price');

  // Step 4: compose
  const [composedEmail, setComposedEmail] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [totalTime, setTotalTime] = useState(0);
  const [copied, setCopied] = useState(false);

  const startTimeRef = useRef(0);
  const agentStartRef = useRef<Record<string, number>>({});
  const completedRef = useRef(0);

  // New interest input
  const [newInterest, setNewInterest] = useState('');

  /* ---- Breadcrumb ---- */
  const breadcrumbs = [
    { label: 'Inbox', onClick: step > 1 ? () => handleReset() : undefined },
    ...(step >= 2 ? [{ label: step === 2 ? 'Analysis' : step === 3 ? 'Results' : 'Compose' }] : []),
  ];

  /* ---- Step 1 → 2: Analyze email ---- */
  const analyzeEmail = useCallback(async (text: string) => {
    setEmailText(text);
    setStep(2);
    setAnalysisLoading(true);
    startTimeRef.current = Date.now();

    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: text, mode: 'analyze' }),
      });
      if (!res.ok || !res.body) throw new Error('Analysis failed');

      const reader = res.body.getReader();
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
            const ev = JSON.parse(payload);
            if (ev.agent === 'email' && ev.status === 'done' && ev.data) {
              const a = ev.data as EmailAnalysis;
              setAnalysis(a);
              setEdited(toEditable(a));
              setAnalysisSource(ev.source || 'mock');
              setAnalysisTime(Date.now() - startTimeRef.current);
              addToast('Email analyzed successfully', 'success');
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      console.error(err);
      addToast('Email analysis failed', 'error');
    } finally {
      setAnalysisLoading(false);
    }
  }, [addToast]);

  /* ---- Step 2 → 3: Search with (edited) analysis ---- */
  const confirmAndSearch = useCallback(async () => {
    if (!edited) return;
    const finalAnalysis = toAnalysis(edited);
    setAnalysis(finalAnalysis);
    setStep(3);
    setActiveTab('flights');
    setFlights([]); setHotels([]); setResearch(''); setPlaces([]);
    setSelectedFlightIdx(0); setSelectedHotelIdx(0);
    setIncludedPlaces(new Set());
    completedRef.current = 0;
    setAgentStatuses({ flight: 'idle', hotel: 'idle', research: 'idle', places: 'idle' });
    setAgentTimes({}); setAgentSources({}); setAgentMessages({});

    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailText, mode: 'search', analysis: finalAnalysis }),
      });
      if (!res.ok || !res.body) throw new Error('Search failed');

      const reader = res.body.getReader();
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
            const ev = JSON.parse(payload);
            const { agent, status, message, data, source } = ev;
            if (agent === 'email') continue; // skip analysis event

            if (status === 'started') {
              agentStartRef.current[agent] = Date.now();
              setAgentStatuses(p => ({ ...p, [agent]: 'active' }));
              setAgentMessages(p => ({ ...p, [agent]: message }));
            } else if (status === 'done') {
              const elapsed = Date.now() - (agentStartRef.current[agent] || Date.now());
              setAgentStatuses(p => ({ ...p, [agent]: 'done' }));
              setAgentMessages(p => ({ ...p, [agent]: message }));
              setAgentTimes(p => ({ ...p, [agent]: elapsed }));
              if (source) setAgentSources(p => ({ ...p, [agent]: source }));

              if (agent === 'flight') { setFlights((data as FlightResult[]) || []); addToast(`${((data as FlightResult[]) || []).length} flights found`, 'success'); }
              if (agent === 'hotel') { setHotels((data as HotelResult[]) || []); addToast(`${((data as HotelResult[]) || []).length} hotels found`, 'success'); }
              if (agent === 'research') { setResearch((data as string) || ''); addToast('Itinerary research complete', 'success'); }
              if (agent === 'places') {
                const p = (data as PlaceResult[]) || [];
                setPlaces(p);
                setIncludedPlaces(new Set(p.map(pl => pl.name)));
                addToast(`${p.length} places found`, 'success');
              }
              completedRef.current++;
            } else if (status === 'error') {
              setAgentStatuses(p => ({ ...p, [agent]: 'error' }));
              completedRef.current++;
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      console.error(err);
      addToast('Agent search failed', 'error');
    }
  }, [edited, emailText, addToast]);

  /* ---- Step 3 → 4: Compose ---- */
  const startCompose = useCallback(async () => {
    setStep(4);
    setIsStreaming(true);
    setComposedEmail('');
    setCopied(false);
    setIsEditing(false);
    let text = '';

    try {
      const res = await fetch('/api/compose', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailText,
          emailAnalysis: analysis,
          selectedFlight: flights[selectedFlightIdx] || null,
          selectedHotel: hotels[selectedHotelIdx] || null,
          flights, hotels, research, places,
          includedPlaces: [...includedPlaces],
          settings: settings ? {
            responseLanguage: settings.responseLanguage,
            tone: settings.tone,
            emailSignature: settings.emailSignature,
            defaultGreeting: settings.defaultGreeting,
            includePriceBreakdown: settings.includePriceBreakdown,
            includeItinerary: settings.includeItinerary,
            includeWeatherInfo: settings.includeWeatherInfo,
          } : undefined,
        }),
      });
      if (!res.ok || !res.body) throw new Error('Compose failed');

      const reader = res.body.getReader();
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
            const { chunk } = JSON.parse(payload);
            if (chunk) { text += chunk; setComposedEmail(text); }
          } catch { /* skip */ }
        }
      }

      addToast('Response composed — ready to send', 'success');
    } catch {
      if (!text) { text = 'We apologize, but we encountered an issue composing your travel plan.\n\nBest regards,\nAfea Travel'; setComposedEmail(text); }
      addToast('Composition failed', 'error');
    } finally {
      setIsStreaming(false);
      const total = Math.round((Date.now() - startTimeRef.current) / 1000);
      setTotalTime(total);

      // Save to history
      if (analysis) {
        addToHistory({
          id: Date.now().toString(),
          from: emailText.match(/(?:from|von|de)\s*:?\s*([\w.@]+)/i)?.[1] || 'Unknown',
          subject: `Trip to ${analysis.destination}`,
          destination: analysis.destination,
          processedAt: new Date().toISOString(),
          totalTime: total,
          status: text.length > 50 ? 'completed' : 'failed',
        });
      }
    }
  }, [emailText, analysis, flights, hotels, research, places, selectedFlightIdx, selectedHotelIdx, includedPlaces, settings, addToast]);

  /* ---- Reset ---- */
  const handleReset = useCallback(() => {
    setStep(1); setEmailText(''); setShowPaste(false);
    setAnalysis(null); setEdited(null); setAnalysisLoading(false);
    setFlights([]); setHotels([]); setResearch(''); setPlaces([]);
    setComposedEmail(''); setIsStreaming(false); setTotalTime(0);
    completedRef.current = 0;
  }, []);

  /* ---- Copy ---- */
  const copyEmail = useCallback(async () => {
    await navigator.clipboard.writeText(composedEmail);
    setCopied(true);
    addToast('Copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  }, [composedEmail, addToast]);

  /* ---- Sorted flights ---- */
  const sortedFlights = [...flights].sort((a, b) => {
    if (flightSort === 'price') return a.price - b.price;
    if (flightSort === 'stops') return a.stops - b.stops;
    return a.duration.localeCompare(b.duration);
  });

  const allAgentsDone = completedRef.current >= 4 ||
    ['flight', 'hotel', 'research', 'places'].every(k => agentStatuses[k] === 'done' || agentStatuses[k] === 'error');

  /* ================================================================
     Render
     ================================================================ */

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto min-h-screen">
      <Breadcrumb items={breadcrumbs} />

      {/* ===== STEP 1 — EMAIL INPUT ===== */}
      {step === 1 && (
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-1">Inbox</h1>
          <p className="text-sm text-foreground/40 mb-8">Select a customer email or paste your own</p>

          {/* Sample emails */}
          <div className="space-y-2 mb-6">
            {SAMPLE_EMAILS.map((email) => (
              <button
                key={email.id}
                onClick={() => analyzeEmail(email.body)}
                className="w-full glass-card flex items-center gap-4 px-5 py-4 text-left transition-all hover:border-teal/30 cursor-pointer group"
              >
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-teal/10 text-teal">
                  <Mail size={18} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-foreground/80 group-hover:text-foreground">{email.from}</span>
                    <span className="text-xs text-foreground/25">{email.date}</span>
                  </div>
                  <p className="text-sm font-medium text-foreground/60 mt-0.5">{email.subject}</p>
                  <p className="text-xs text-foreground/30 mt-0.5 truncate">{email.preview}</p>
                </div>
                <ArrowRight size={16} className="text-foreground/15 group-hover:text-teal transition-colors" />
              </button>
            ))}
          </div>

          {/* Paste custom */}
          {!showPaste ? (
            <button
              onClick={() => setShowPaste(true)}
              className="w-full rounded-lg border border-dashed border-card-border py-4 text-sm text-foreground/30 hover:border-teal/30 hover:text-foreground/50 transition-colors cursor-pointer"
            >
              + Paste a custom email
            </button>
          ) : (
            <div className="space-y-3 animate-fade-in">
              <textarea
                value={emailText}
                onChange={(e) => setEmailText(e.target.value)}
                className={`${INPUT_CLS} min-h-[200px] resize-none`}
                placeholder="Paste a customer email here..."
                autoFocus
              />
              <div className="flex gap-3">
                <button
                  onClick={() => analyzeEmail(emailText)}
                  disabled={!emailText.trim()}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal to-cyan px-6 py-2.5 text-sm font-semibold text-navy-deep transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
                >
                  <Send size={15} /> Process
                </button>
                <button onClick={() => { setShowPaste(false); setEmailText(''); }} className="text-sm text-foreground/35 hover:text-foreground/60 cursor-pointer">
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== STEP 2 — ANALYSIS (EDITABLE) ===== */}
      {step === 2 && (
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-1">Email Analysis</h1>
          <p className="text-sm text-foreground/40 mb-8">
            Review and edit the extracted information before searching
            {analysisSource === 'live' && <LiveBadge source="live" />}
            {analysisTime > 0 && <span className="ml-2 text-foreground/25"><Clock size={11} className="inline" /> {fmtTime(analysisTime)}</span>}
          </p>

          {analysisLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 size={32} className="animate-spin text-teal" />
              <p className="text-sm text-foreground/40">Analyzing email...</p>
            </div>
          )}

          {edited && !analysisLoading && (
            <div className="space-y-6 max-w-3xl">
              {/* Route */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground/40 mb-1.5">Origin</label>
                  <div className="flex gap-2">
                    <input value={edited.origin} onChange={e => setEdited({ ...edited, origin: e.target.value })} className={INPUT_CLS} />
                    <input value={edited.originIATA} onChange={e => setEdited({ ...edited, originIATA: e.target.value.toUpperCase() })} className={`${INPUT_CLS} w-20 text-center uppercase`} placeholder="IATA" />
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/40 mb-1.5">Destination</label>
                  <div className="flex gap-2">
                    <input value={edited.destination} onChange={e => setEdited({ ...edited, destination: e.target.value })} className={INPUT_CLS} />
                    <input value={edited.destinationIATA} onChange={e => setEdited({ ...edited, destinationIATA: e.target.value.toUpperCase() })} className={`${INPUT_CLS} w-20 text-center uppercase`} placeholder="IATA" />
                  </div>
                </div>
              </div>

              {/* Dates */}
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground/40 mb-1.5">Start Date</label>
                  <input type="date" value={edited.startDate} onChange={e => setEdited({ ...edited, startDate: e.target.value })} className={INPUT_CLS} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/40 mb-1.5">End Date</label>
                  <input type="date" value={edited.endDate} onChange={e => setEdited({ ...edited, endDate: e.target.value })} className={INPUT_CLS} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/40 mb-1.5">Duration (days)</label>
                  <input type="number" value={edited.duration} onChange={e => setEdited({ ...edited, duration: parseInt(e.target.value) || 1 })} className={INPUT_CLS} min={1} />
                </div>
              </div>

              {/* Travelers + Budget */}
              <div className="grid grid-cols-4 gap-4">
                <div>
                  <label className="block text-xs font-medium text-foreground/40 mb-1.5">Adults</label>
                  <input type="number" value={edited.adults} onChange={e => setEdited({ ...edited, adults: parseInt(e.target.value) || 1 })} className={INPUT_CLS} min={1} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/40 mb-1.5">Children</label>
                  <input type="number" value={edited.children} onChange={e => setEdited({ ...edited, children: parseInt(e.target.value) || 0 })} className={INPUT_CLS} min={0} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/40 mb-1.5">Budget Min (€/night)</label>
                  <input type="number" value={edited.budgetMin} onChange={e => setEdited({ ...edited, budgetMin: parseInt(e.target.value) || 0 })} className={INPUT_CLS} min={0} />
                </div>
                <div>
                  <label className="block text-xs font-medium text-foreground/40 mb-1.5">Budget Max (€/night)</label>
                  <input type="number" value={edited.budgetMax} onChange={e => setEdited({ ...edited, budgetMax: parseInt(e.target.value) || 0 })} className={INPUT_CLS} min={0} />
                </div>
              </div>

              {/* Interests */}
              <div>
                <label className="block text-xs font-medium text-foreground/40 mb-1.5">Interests</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {edited.interests.map((tag, i) => (
                    <span key={i} className="flex items-center gap-1.5 rounded-full bg-teal/10 px-3 py-1 text-xs text-teal/80">
                      {tag}
                      <button onClick={() => setEdited({ ...edited, interests: edited.interests.filter((_, j) => j !== i) })} className="text-teal/40 hover:text-teal cursor-pointer"><X size={12} /></button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    value={newInterest}
                    onChange={e => setNewInterest(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && newInterest.trim()) { setEdited({ ...edited, interests: [...edited.interests, newInterest.trim()] }); setNewInterest(''); } }}
                    className={`${INPUT_CLS} max-w-[200px]`}
                    placeholder="Add interest..."
                  />
                  <button
                    onClick={() => { if (newInterest.trim()) { setEdited({ ...edited, interests: [...edited.interests, newInterest.trim()] }); setNewInterest(''); } }}
                    className="rounded-lg bg-teal/10 px-3 py-2 text-teal hover:bg-teal/20 cursor-pointer transition-colors"
                  ><Plus size={16} /></button>
                </div>
              </div>

              {/* Language */}
              <div className="max-w-[200px]">
                <label className="block text-xs font-medium text-foreground/40 mb-1.5">Detected Language</label>
                <select value={edited.language} onChange={e => setEdited({ ...edited, language: e.target.value })} className={INPUT_CLS}>
                  <option value="en">English</option>
                  <option value="de">German</option>
                  <option value="el">Greek</option>
                  <option value="fr">French</option>
                  <option value="it">Italian</option>
                  <option value="es">Spanish</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex gap-3 pt-4 border-t border-card-border/30">
                <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 rounded-lg bg-card border border-card-border px-5 py-2.5 text-sm font-medium text-foreground/60 hover:border-foreground/20 hover:text-foreground cursor-pointer transition-all">
                  <ArrowLeft size={15} /> Back
                </button>
                <button
                  onClick={confirmAndSearch}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal to-cyan px-6 py-2.5 text-sm font-semibold text-navy-deep transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer"
                >
                  <Search size={15} /> Confirm &amp; Search
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== STEP 3 — RESULTS (TABS) ===== */}
      {step === 3 && (
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-1">Search Results</h1>
          <p className="text-sm text-foreground/40 mb-6">
            {analysis?.origin} → {analysis?.destination} · {analysis?.dates.duration} days · {analysis?.travelers.adults} adults
          </p>

          {/* Tab bar */}
          <div className="flex gap-1 border-b border-card-border/30 mb-6">
            {([
              { key: 'flights' as const, label: 'Flights', icon: Plane, color: '#22D3EE', count: flights.length },
              { key: 'hotels' as const, label: 'Hotels', icon: Building2, color: '#F59E0B', count: hotels.length },
              { key: 'itinerary' as const, label: 'Itinerary', icon: Search, color: '#10B981', count: null },
              { key: 'places' as const, label: 'Places', icon: MapPin, color: '#A78BFA', count: places.length },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer -mb-px ${
                  activeTab === tab.key ? 'border-current' : 'border-transparent text-foreground/35 hover:text-foreground/55'
                }`}
                style={{ color: activeTab === tab.key ? tab.color : undefined }}
              >
                <tab.icon size={15} />
                {tab.label}
                {agentStatuses[tab.key === 'itinerary' ? 'research' : tab.key] === 'active' && <Loader2 size={12} className="animate-spin" />}
                {agentStatuses[tab.key === 'itinerary' ? 'research' : tab.key] === 'done' && tab.count != null && (
                  <span className="rounded-full bg-foreground/[0.06] px-2 py-0.5 text-[10px]">{tab.count}</span>
                )}
                <LiveBadge source={agentSources[tab.key === 'itinerary' ? 'research' : tab.key]} />
                {agentTimes[tab.key === 'itinerary' ? 'research' : tab.key] != null && (
                  <span className="text-[10px] text-foreground/20">{fmtTime(agentTimes[tab.key === 'itinerary' ? 'research' : tab.key])}</span>
                )}
              </button>
            ))}
          </div>

          {/* FLIGHTS TAB */}
          {activeTab === 'flights' && (
            <div>
              {agentStatuses.flight === 'active' && (
                <div className="flex items-center gap-3 py-12 justify-center text-foreground/30"><Loader2 size={20} className="animate-spin text-cyan" /> Searching flights...</div>
              )}
              {flights.length > 0 && (
                <div>
                  <div className="flex gap-2 mb-3">
                    <span className="text-xs text-foreground/30">Sort:</span>
                    {(['price', 'duration', 'stops'] as const).map(s => (
                      <button key={s} onClick={() => setFlightSort(s)} className={`text-xs cursor-pointer transition-colors ${flightSort === s ? 'text-cyan font-medium' : 'text-foreground/30 hover:text-foreground/50'}`}>
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                      </button>
                    ))}
                  </div>
                  <div className="glass-card overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-card-border text-left text-[11px] uppercase tracking-wider text-foreground/25">
                          <th className="w-10 px-4 py-2.5" />
                          <th className="px-4 py-2.5 font-medium">Airline</th>
                          <th className="px-4 py-2.5 font-medium">Departure</th>
                          <th className="px-4 py-2.5 font-medium">Arrival</th>
                          <th className="px-4 py-2.5 font-medium">Stops</th>
                          <th className="px-4 py-2.5 font-medium">Duration</th>
                          <th className="px-4 py-2.5 font-medium text-right">Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {sortedFlights.map((f, i) => {
                          const origIdx = flights.indexOf(f);
                          return (
                            <tr key={i} onClick={() => setSelectedFlightIdx(origIdx)}
                              className={`border-b border-card-border/20 last:border-0 cursor-pointer transition-all hover:bg-white/[0.02] ${origIdx === selectedFlightIdx ? 'bg-cyan/[0.06]' : ''}`}>
                              <td className="px-4 py-3">
                                <div className={`flex h-5 w-5 items-center justify-center rounded-full border ${origIdx === selectedFlightIdx ? 'border-cyan bg-cyan/20' : 'border-foreground/15'}`}>
                                  {origIdx === selectedFlightIdx && <Check size={12} className="text-cyan" />}
                                </div>
                              </td>
                              <td className="px-4 py-3 font-medium text-foreground/80">{f.airline}</td>
                              <td className="px-4 py-3 tabular-nums text-foreground/60">{fmtClock(f.departureTime)}</td>
                              <td className="px-4 py-3 tabular-nums text-foreground/60">{fmtClock(f.arrivalTime)}</td>
                              <td className="px-4 py-3">{f.stops === 0 ? <span className="text-green/80">Direct</span> : `${f.stops} stop${f.stops > 1 ? 's' : ''}`}</td>
                              <td className="px-4 py-3 text-foreground/40">{f.duration}</td>
                              <td className={`px-4 py-3 text-right font-semibold tabular-nums ${origIdx === selectedFlightIdx ? 'text-cyan' : 'text-foreground/60'}`}>{f.price}€</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* HOTELS TAB */}
          {activeTab === 'hotels' && (
            <div>
              {agentStatuses.hotel === 'active' && (
                <div className="flex items-center gap-3 py-12 justify-center text-foreground/30"><Loader2 size={20} className="animate-spin text-amber" /> Searching hotels...</div>
              )}
              {hotels.length > 0 && (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {hotels.map((h, i) => (
                    <div key={i} onClick={() => setSelectedHotelIdx(i)}
                      className={`glass-card p-4 cursor-pointer transition-all hover:border-amber/30 ${i === selectedHotelIdx ? 'border-amber/40 bg-amber/[0.04]' : ''}`}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            {i === selectedHotelIdx && <CheckCircle size={14} className="text-amber" />}
                            <h4 className="text-sm font-medium text-foreground/90">{h.name}</h4>
                          </div>
                          <p className="mt-0.5 text-xs text-foreground/40">{h.area}</p>
                        </div>
                        <div className="flex items-center gap-1 rounded bg-amber/10 px-1.5 py-0.5 text-xs font-semibold text-amber">
                          <Star size={10} className="fill-amber" />{h.rating}
                        </div>
                      </div>
                      <div className="mt-2 text-xs text-foreground/30">{h.amenities?.join(' · ')}</div>
                      <div className="mt-3 flex items-center justify-between border-t border-card-border/30 pt-3">
                        <div className="flex items-center gap-1 text-[11px] text-foreground/40">
                          <TrainFront size={11} />{h.metroStation} ({h.metroDistance})
                        </div>
                        <div className="text-sm font-semibold text-amber">{h.pricePerNight}€<span className="ml-0.5 text-[10px] font-normal text-foreground/30">/night</span></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ITINERARY TAB */}
          {activeTab === 'itinerary' && (
            <div>
              {agentStatuses.research === 'active' && (
                <div className="flex items-center gap-3 py-12 justify-center text-foreground/30"><Loader2 size={20} className="animate-spin text-green" /> Generating itinerary...</div>
              )}
              {research && (
                <div className="space-y-2">
                  {parseResearchDays(research).map((d, i) => (
                    <div key={i} className="glass-card overflow-hidden">
                      <button onClick={() => setExpandedDays(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })}
                        className="w-full flex items-center justify-between px-5 py-3 cursor-pointer hover:bg-white/[0.02] transition-colors">
                        <div className="flex items-center gap-3">
                          <span className="rounded bg-green/10 px-2.5 py-0.5 text-xs font-semibold text-green">{d.day}</span>
                          <span className="text-sm text-foreground/70 truncate max-w-[500px]">{d.desc.split('.')[0]}</span>
                        </div>
                        {expandedDays.has(i) ? <ChevronUp size={16} className="text-foreground/25" /> : <ChevronDown size={16} className="text-foreground/25" />}
                      </button>
                      {expandedDays.has(i) && (
                        <div className="px-5 pb-4 text-sm text-foreground/50 leading-relaxed border-t border-card-border/20 pt-3">
                          {d.desc}
                        </div>
                      )}
                    </div>
                  ))}
                  {parseResearchDays(research).length === 0 && (
                    <div className="glass-card px-5 py-4 text-sm text-foreground/50 whitespace-pre-wrap leading-relaxed">{research}</div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* PLACES TAB */}
          {activeTab === 'places' && (
            <div>
              {agentStatuses.places === 'active' && (
                <div className="flex items-center gap-3 py-12 justify-center text-foreground/30"><Loader2 size={20} className="animate-spin text-purple" /> Searching places...</div>
              )}
              {places.length > 0 && (
                <div className="glass-card divide-y divide-card-border/20">
                  {places.map((p, i) => (
                    <div key={i} className="flex items-center gap-4 px-5 py-3">
                      <input
                        type="checkbox"
                        checked={includedPlaces.has(p.name)}
                        onChange={() => setIncludedPlaces(prev => { const n = new Set(prev); n.has(p.name) ? n.delete(p.name) : n.add(p.name); return n; })}
                        className="h-4 w-4 rounded border-foreground/20 bg-navy-deep accent-teal cursor-pointer"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground/80">{p.name}</span>
                          {p.rating != null && (
                            <span className="flex items-center gap-0.5 text-xs text-purple/60"><Star size={10} className="fill-current" />{p.rating}</span>
                          )}
                        </div>
                        <p className="text-xs text-foreground/30 truncate">{p.address}</p>
                        {p.summary && <p className="text-xs text-foreground/40 mt-0.5 line-clamp-1">{p.summary}</p>}
                      </div>
                      {p.mapsUrl && (
                        <a href={p.mapsUrl} target="_blank" rel="noopener noreferrer" className="text-foreground/20 hover:text-purple transition-colors">
                          <ExternalLink size={14} />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Compose button */}
          <div className="flex items-center gap-4 mt-8 pt-6 border-t border-card-border/30">
            <button onClick={() => setStep(2)} className="inline-flex items-center gap-2 rounded-lg bg-card border border-card-border px-5 py-2.5 text-sm font-medium text-foreground/60 hover:border-foreground/20 cursor-pointer transition-all">
              <ArrowLeft size={15} /> Back
            </button>
            <button
              onClick={startCompose}
              disabled={!allAgentsDone}
              className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-pink/90 to-purple/90 px-6 py-2.5 text-sm font-semibold text-white transition-all hover:from-pink hover:to-purple active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
            >
              <PenTool size={15} /> Compose Response
            </button>
            {!allAgentsDone && <span className="text-xs text-foreground/25">Waiting for all agents to complete...</span>}
          </div>
        </div>
      )}

      {/* ===== STEP 4 — COMPOSE ===== */}
      {step === 4 && (
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold text-foreground mb-1">
            {isStreaming ? 'Composing Response...' : 'Response Ready'}
          </h1>
          <p className="text-sm text-foreground/40 mb-6">
            {isStreaming ? 'AI is writing the response email' : `Completed in ${totalTime}s — manually this takes 30-45 minutes`}
          </p>

          <div className="flex gap-6">
            {/* Email */}
            <div className="flex-1 min-w-0">
              <div className="glass-card overflow-hidden" style={{ borderColor: isStreaming ? 'rgba(236,72,153,0.2)' : 'rgba(16,185,129,0.2)' }}>
                <div className="flex items-center justify-between border-b border-card-border px-5 py-3">
                  <div className="flex items-center gap-2">
                    {isStreaming ? <Loader2 size={14} className="animate-spin text-pink" /> : <CheckCircle size={14} className="text-green" />}
                    <span className="text-sm text-foreground/50">{isStreaming ? 'Writing...' : 'Complete'}</span>
                  </div>
                  <div className="flex gap-2">
                    {!isStreaming && composedEmail && (
                      <>
                        <button onClick={() => setIsEditing(!isEditing)} className="text-xs text-foreground/35 hover:text-foreground/60 cursor-pointer">
                          {isEditing ? 'Preview' : 'Edit'}
                        </button>
                        <button onClick={copyEmail} className="flex items-center gap-1.5 rounded-lg bg-card border border-card-border px-3 py-1.5 text-xs text-foreground/60 hover:border-foreground/20 cursor-pointer transition-all">
                          {copied ? <Check size={12} className="text-green" /> : <Copy size={12} />}
                          {copied ? 'Copied!' : 'Copy'}
                        </button>
                      </>
                    )}
                  </div>
                </div>
                <div className="min-h-[300px] px-5 py-4">
                  {isEditing ? (
                    <textarea
                      value={composedEmail}
                      onChange={e => setComposedEmail(e.target.value)}
                      className="w-full min-h-[300px] bg-transparent text-sm leading-relaxed text-foreground/80 outline-none resize-none"
                    />
                  ) : (
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground/80">
                      {composedEmail}
                      {isStreaming && <span className="animate-blink ml-0.5 inline-block h-4 w-[2px] translate-y-[2px] bg-pink/70" />}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              {!isStreaming && (
                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => { addToast('Email sent! (simulated)', 'success'); }}
                    className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal to-cyan px-6 py-2.5 text-sm font-semibold text-navy-deep transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer"
                  >
                    <Send size={15} /> Send
                  </button>
                  <button onClick={handleReset} className="inline-flex items-center gap-2 rounded-lg bg-card border border-card-border px-5 py-2.5 text-sm font-medium text-foreground/60 hover:border-foreground/20 cursor-pointer transition-all">
                    <RotateCcw size={14} /> New Email
                  </button>
                </div>
              )}
            </div>

            {/* Right sidebar: selected summary */}
            {!isStreaming && (
              <div className="hidden lg:block w-72 flex-shrink-0 space-y-4 animate-fade-in">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-foreground/25">Selected Options</h3>
                {flights[selectedFlightIdx] && (
                  <div className="glass-card p-3">
                    <div className="flex items-center gap-2 text-xs text-cyan mb-1"><Plane size={12} /> Flight</div>
                    <p className="text-sm font-medium text-foreground/80">{flights[selectedFlightIdx].airline}</p>
                    <p className="text-xs text-foreground/40">{fmtClock(flights[selectedFlightIdx].departureTime)} → {fmtClock(flights[selectedFlightIdx].arrivalTime)} · {flights[selectedFlightIdx].price}€</p>
                  </div>
                )}
                {hotels[selectedHotelIdx] && (
                  <div className="glass-card p-3">
                    <div className="flex items-center gap-2 text-xs text-amber mb-1"><Building2 size={12} /> Hotel</div>
                    <p className="text-sm font-medium text-foreground/80">{hotels[selectedHotelIdx].name}</p>
                    <p className="text-xs text-foreground/40">{hotels[selectedHotelIdx].area} · {hotels[selectedHotelIdx].pricePerNight}€/night · ★{hotels[selectedHotelIdx].rating}</p>
                  </div>
                )}
                {analysis && (
                  <div className="glass-card p-3">
                    <div className="flex items-center gap-2 text-xs text-teal mb-1"><Mail size={12} /> Trip</div>
                    <p className="text-xs text-foreground/40">{analysis.origin} → {analysis.destination}</p>
                    <p className="text-xs text-foreground/40">{analysis.dates.duration} days · {analysis.travelers.adults} adults</p>
                  </div>
                )}
                {totalTime > 0 && (
                  <div className="glass-card p-3">
                    <div className="flex items-center gap-2 text-xs text-green mb-1"><Clock size={12} /> Time</div>
                    <p className="text-sm font-bold text-green tabular-nums">{totalTime}s</p>
                    <p className="text-[10px] text-foreground/25">vs 30-45 min manually</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Powered by footer */}
      <div className="mt-12 pb-4 text-center text-[11px] text-foreground/15">
        Powered by <span className="text-foreground/25">GPT-4o</span> + <span className="text-foreground/25">Duffel</span> + <span className="text-foreground/25">Google Places</span>
      </div>
    </div>
  );
}
