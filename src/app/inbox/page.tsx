'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Plane, Building2, Search, MapPin, Loader2, CheckCircle, AlertCircle,
  Copy, Check, Clock, ArrowRight, ArrowLeft, Radio, Star, TrainFront,
  Send, PenTool, Mail, RotateCcw, ChevronDown, ChevronUp, X, Plus,
  ExternalLink, BarChart3, CloudSun, Eye, Languages, CalendarPlus,
  Save, RefreshCw,
} from 'lucide-react';
import type { EmailAnalysis, FlightResult, HotelResult, PlaceResult } from '@/agents/types';
import Breadcrumb from '@/components/Breadcrumb';
import { useToast } from '@/components/Toast';
import {
  loadSettings, type AppSettings,
  loadProfile, type Profile,
  addToHistory, findCustomerByEmail, upsertCustomer, type KnownCustomer,
  addFollowUp, getProcessedSampleIds, LANGUAGES,
} from '@/lib/settings';
import { stripMarkdown } from '@/lib/markdown-strip';
import { emailToHtml } from '@/lib/email-to-html';
import { getWeather, type WeatherDay } from '@/lib/weather';
import MapView from '@/components/MapView';

/* ================================================================ */

const SAMPLE_EMAILS = [
  {
    id: 'greece', from: 'klaus.mueller@gmail.com',
    subject: 'Trip to Greece — 7 days',
    preview: 'We are Klaus and Anna Mueller from Hamburg, planning a trip to Greece...',
    date: '2 hours ago',
    body: `Guten Tag,\n\nWe are Klaus and Anna Mueller from Hamburg, Germany. We are planning a trip to Greece for next week (7 days) and we are looking for:\n\n- Flights from Hamburg to Athens (arriving Monday morning if possible)\n- A nice hotel in central Athens, close to metro, mid-range budget (~120-150€/night)\n- A complete travel plan: what to see, where to eat, day trips from Athens\n- We love history, local food, and walking around neighborhoods\n- We would also like to visit one island for 2 days if possible\n\nCould you please help us organize everything?\n\nBest regards,\nKlaus & Anna Mueller`,
  },
  {
    id: 'rome', from: 'sarah.johnson@outlook.com',
    subject: 'Family vacation to Rome — 5 days',
    preview: 'Hi! Our family of 4 is looking for a Rome trip next month...',
    date: '5 hours ago',
    body: `Hi there!\n\nWe're the Johnson family — myself, my husband Tom, and our two kids (ages 8 and 12). We'd love to plan a 5-day trip to Rome next month.\n\nWhat we need:\n- Flights from London Heathrow to Rome (flexible on dates)\n- A family-friendly hotel near the Vatican area, budget around 130-180€/night\n- Kid-friendly activities and restaurant suggestions\n- We want to see the Colosseum, Vatican, and Trevi Fountain\n\nThank you so much!\nSarah Johnson`,
  },
  {
    id: 'santorini', from: 'marie.dupont@gmail.com',
    subject: 'Lune de miel à Santorin',
    preview: 'Bonjour, mon mari et moi souhaitons organiser notre lune de miel...',
    date: 'Yesterday',
    body: `Bonjour,\n\nMon mari et moi souhaitons organiser notre lune de miel à Santorin pour la semaine prochaine (5 jours).\n\nNous recherchons:\n- Des vols depuis Paris CDG vers Santorin\n- Un hôtel romantique avec vue sur la caldeira à Oia ou Fira, budget 200-300€/nuit\n- Les meilleurs restaurants pour un dîner romantique\n- Les couchers de soleil à ne pas manquer\n\nMerci beaucoup!\nMarie & Pierre Dupont`,
  },
];

/* ================================================================ */

type Step = 1 | 2 | 3 | 4;
type AgentStatus = 'idle' | 'active' | 'done' | 'error';

interface EditableAnalysis {
  origin: string; originIATA: string; destination: string; destinationIATA: string;
  startDate: string; endDate: string; duration: number;
  adults: number; children: number;
  budgetMin: number; budgetMax: number; currency: string;
  interests: string[]; language: string; specialRequests: string[];
  customerName?: string;
}

function toEditable(a: EmailAnalysis): EditableAnalysis {
  return { origin: a.origin, originIATA: a.originIATA, destination: a.destination, destinationIATA: a.destinationIATA, startDate: a.dates.start, endDate: a.dates.end, duration: a.dates.duration, adults: a.travelers.adults, children: a.travelers.children, budgetMin: a.budget.min, budgetMax: a.budget.max, currency: a.budget.currency, interests: [...a.interests], language: a.language, specialRequests: [...a.specialRequests], customerName: a.customerName };
}
function toAnalysis(e: EditableAnalysis): EmailAnalysis {
  return { origin: e.origin, originIATA: e.originIATA, destination: e.destination, destinationIATA: e.destinationIATA, dates: { start: e.startDate, end: e.endDate, duration: e.duration }, travelers: { adults: e.adults, children: e.children, names: [] }, budget: { min: e.budgetMin, max: e.budgetMax, currency: e.currency }, interests: e.interests, language: e.language, specialRequests: e.specialRequests, customerName: e.customerName };
}

function fmtTime(ms: number) { return `${(ms / 1000).toFixed(1)}s`; }
function fmtClock(iso: string) { try { return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }); } catch { return iso; } }
function parseResearchDays(text: string) {
  const lines = text.split('\n').filter(l => l.trim());
  const days: { day: string; desc: string }[] = [];
  let cur = '', desc = '';
  for (const line of lines) {
    const m = line.match(/\*?\*?(?:Day|Jour|Tag|Giorno)\s*(\d+)/i);
    if (m) { if (cur) days.push({ day: cur, desc: desc.trim() }); cur = `Day ${m[1]}`; desc = line.replace(/^[\s*]*(?:Day|Jour|Tag|Giorno)\s*\d+[^a-zA-Z]*/i, ''); }
    else if (cur) desc += ' ' + line;
  }
  if (cur) days.push({ day: cur, desc: desc.trim() });
  return days;
}
function extractEmail(text: string): string {
  const m = text.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return m ? m[0] : '';
}
const WEATHER_ICONS: Record<string, string> = { 'sunny': '☀️', 'partly-cloudy': '⛅', 'cloudy': '☁️', 'rainy': '🌧️', 'stormy': '⛈️' };
const INPUT_CLS = 'w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors';
const INPUT_STYLE: React.CSSProperties = { background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' };

function LiveBadge({ source }: { source?: 'live' | 'mock' }) {
  if (source !== 'live') return null;
  return <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ background: 'var(--color-green-light)', color: 'var(--color-green)' }}><Radio size={8} className="animate-pulse" />Live</span>;
}

/* ================================================================ */

export default function InboxPage() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  useEffect(() => { setSettings(loadSettings()); setProfile(loadProfile()); setProcessedSampleIds(getProcessedSampleIds()); }, []);

  const [step, setStep] = useState<Step>(1);
  const [emailText, setEmailText] = useState('');
  const [showPaste, setShowPaste] = useState(false);
  const [currentSampleId, setCurrentSampleId] = useState<string | null>(null);
  const [currentSampleFrom, setCurrentSampleFrom] = useState<string | null>(null);
  const [showOriginalEmail, setShowOriginalEmail] = useState(false);
  const [processedSampleIds, setProcessedSampleIds] = useState<Set<string>>(new Set());

  // Step 2
  const [analysis, setAnalysis] = useState<EmailAnalysis | null>(null);
  const [edited, setEdited] = useState<EditableAnalysis | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<'live' | 'mock'>('mock');
  const [analysisTime, setAnalysisTime] = useState(0);
  const [knownCustomer, setKnownCustomer] = useState<KnownCustomer | null>(null);
  const [newInterest, setNewInterest] = useState('');

  // Step 3
  const [activeTab, setActiveTab] = useState<'flights' | 'hotels' | 'itinerary' | 'places' | 'compare'>('flights');
  const [flights, setFlights] = useState<FlightResult[]>([]);
  const [hotels, setHotels] = useState<HotelResult[]>([]);
  const [research, setResearch] = useState('');
  const [places, setPlaces] = useState<PlaceResult[]>([]);
  const [selectedFlightIdx, setSelectedFlightIdx] = useState(-1);
  const [selectedHotelIdx, setSelectedHotelIdx] = useState(-1);
  const [includedPlaces, setIncludedPlaces] = useState<Set<string>>(new Set());
  const [agentStatuses, setAgentStatuses] = useState<Record<string, AgentStatus>>({});
  const [agentTimes, setAgentTimes] = useState<Record<string, number>>({});
  const [agentSources, setAgentSources] = useState<Record<string, 'live' | 'mock'>>({});
  const [agentMessages, setAgentMessages] = useState<Record<string, string>>({});
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [flightSort, setFlightSort] = useState<'price' | 'duration' | 'stops'>('price');
  const [weather, setWeather] = useState<WeatherDay[]>([]);

  // Step 4
  const [composedEmail, setComposedEmail] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [previewMode, setPreviewMode] = useState<'editor' | 'html'>('editor');
  const [totalTime, setTotalTime] = useState(0);
  const [copied, setCopied] = useState(false);
  const [translating, setTranslating] = useState(false);
  const [showFollowUpForm, setShowFollowUpForm] = useState(false);

  const startTimeRef = useRef(0);
  const agentStartRef = useRef<Record<string, number>>({});
  const completedRef = useRef(0);

  const breadcrumbs = [
    { label: 'Inbox', onClick: step > 1 ? () => handleReset() : undefined },
    ...(step >= 2 ? [{ label: step === 2 ? 'Analysis' : step === 3 ? 'Results' : 'Compose' }] : []),
  ];

  /* ---- Step 1 → 2 ---- */
  const analyzeEmail = useCallback(async (text: string, sampleId?: string, sampleFrom?: string) => {
    setEmailText(text);
    setCurrentSampleId(sampleId || null);
    setCurrentSampleFrom(sampleFrom || null);
    setShowOriginalEmail(true);
    setStep(2);
    setAnalysisLoading(true);
    setKnownCustomer(null);
    startTimeRef.current = Date.now();

    // Customer recognition
    if (settings?.customerRecognition) {
      const email = extractEmail(text);
      if (email) { const c = findCustomerByEmail(email); if (c) setKnownCustomer(c); }
    }

    try {
      const res = await fetch('/api/orchestrate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: text, mode: 'analyze' }) });
      if (!res.ok || !res.body) throw new Error('Analysis failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;
          try {
            const ev = JSON.parse(payload);
            if (ev.agent === 'email' && ev.status === 'done' && ev.data) {
              const a = ev.data as EmailAnalysis;
              setAnalysis(a); setEdited(toEditable(a));
              setAnalysisSource(ev.source || 'mock');
              setAnalysisTime(Date.now() - startTimeRef.current);
              addToast('Email analyzed successfully', 'success');
            }
          } catch { /* skip */ }
        }
      }
    } catch { addToast('Email analysis failed', 'error'); }
    finally { setAnalysisLoading(false); }
  }, [addToast, settings]);

  /* ---- Step 2 → 3 ---- */
  const confirmAndSearch = useCallback(async () => {
    if (!edited) return;
    const finalAnalysis = toAnalysis(edited);
    setAnalysis(finalAnalysis);
    setStep(3); setActiveTab('flights'); setShowOriginalEmail(false);
    setFlights([]); setHotels([]); setResearch(''); setPlaces([]);
    setSelectedFlightIdx(-1); setSelectedHotelIdx(-1); setIncludedPlaces(new Set());
    completedRef.current = 0;
    setAgentStatuses({ flight: 'idle', hotel: 'idle', research: 'idle', places: 'idle' });
    setAgentTimes({}); setAgentSources({}); setAgentMessages({});
    setWeather([]);

    // Fetch weather in background
    getWeather(finalAnalysis.destination, finalAnalysis.dates.start, Math.min(finalAnalysis.dates.duration, 7))
      .then(w => setWeather(w)).catch(() => {});

    try {
      const res = await fetch('/api/orchestrate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: emailText, mode: 'search', analysis: finalAnalysis }) });
      if (!res.ok || !res.body) throw new Error('Search failed');
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;
          try {
            const ev = JSON.parse(payload);
            const { agent, status, message, data, source } = ev;
            if (agent === 'email') continue;
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
              if (agent === 'research') { setResearch(stripMarkdown((data as string) || '')); }
              if (agent === 'places') { const p = (data as PlaceResult[]) || []; setPlaces(p); setIncludedPlaces(new Set(p.map(pl => pl.name))); }
              completedRef.current++;
            } else if (status === 'error') {
              setAgentStatuses(p => ({ ...p, [agent]: 'error' }));
              completedRef.current++;
            }
          } catch { /* skip */ }
        }
      }
    } catch { addToast('Agent search failed', 'error'); }
  }, [edited, emailText, addToast]);

  /* ---- Step 3 → 4 ---- */
  const startCompose = useCallback(async () => {
    setStep(4); setIsStreaming(true); setComposedEmail(''); setCopied(false); setIsEditing(false); setPreviewMode('editor');
    let text = '';
    try {
      const res = await fetch('/api/compose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailText, emailAnalysis: analysis,
          selectedFlight: flights[selectedFlightIdx] || null,
          selectedHotel: hotels[selectedHotelIdx] || null,
          flights, hotels, research, places,
          includedPlaces: [...includedPlaces],
          settings: settings ? {
            responseLanguage: settings.responseLanguage, tone: settings.tone,
            emailSignature: settings.emailSignature, defaultGreeting: settings.defaultGreeting,
            includePriceBreakdown: settings.includePriceBreakdown, includeItinerary: settings.includeItinerary,
            includeWeatherInfo: settings.includeWeatherInfo, responseLength: settings.responseLength,
            ...(knownCustomer ? { returningCustomerContext: { name: knownCustomer.name, tripCount: knownCustomer.trips.length, lastDestination: knownCustomer.trips[knownCustomer.trips.length - 1]?.destination || '' } } : {}),
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
        const lines = buffer.split('\n'); buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') continue;
          try { const { chunk } = JSON.parse(payload); if (chunk) { text += chunk; setComposedEmail(text); } } catch { /* skip */ }
        }
      }
      // Post-process: strip markdown
      text = stripMarkdown(text);
      setComposedEmail(text);
      addToast('Response composed — ready to review', 'success');
    } catch {
      if (!text) { text = 'We apologize, but we encountered an issue composing your travel plan.\n\nBest regards,\nAfea Travel'; setComposedEmail(text); }
      addToast('Composition failed', 'error');
    } finally {
      setIsStreaming(false);
      const total = Math.round((Date.now() - startTimeRef.current) / 1000);
      setTotalTime(total);
      const customerEmail = currentSampleFrom || extractEmail(emailText);
      const customerName = analysis?.customerName || analysis?.travelers.names?.[0] || '';
      if (analysis) {
        addToHistory({
          id: Date.now().toString(), from: customerName || customerEmail || 'Unknown',
          subject: `Trip to ${analysis.destination}`, destination: analysis.destination,
          processedAt: new Date().toISOString(), totalTime: total,
          status: text.length > 50 ? 'completed' : 'failed',
          composedResponse: text, customerEmail, customerName,
          sampleEmailId: currentSampleId || undefined,
        });
        if (currentSampleId) {
          setProcessedSampleIds(prev => new Set([...prev, currentSampleId]));
        }
        if (customerEmail) {
          upsertCustomer({ email: customerEmail, name: customerName, destination: analysis.destination, hotel: hotels[selectedHotelIdx]?.name, budget: `€${analysis.budget.min}-${analysis.budget.max}`, language: analysis.language });
        }
      }
    }
  }, [emailText, analysis, flights, hotels, research, places, selectedFlightIdx, selectedHotelIdx, includedPlaces, settings, knownCustomer, currentSampleId, currentSampleFrom, addToast]);

  /* ---- Translate ---- */
  const translateTo = useCallback(async (lang: string) => {
    setTranslating(true);
    try {
      const res = await fetch('/api/translate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text: composedEmail, targetLanguage: lang }) });
      if (!res.ok) throw new Error('Translation failed');
      const { translated } = await res.json();
      if (translated) { setComposedEmail(stripMarkdown(translated)); addToast(`Translated to ${LANGUAGES.find(l => l.value === lang)?.label || lang}`, 'success'); }
    } catch { addToast('Translation failed', 'error'); }
    finally { setTranslating(false); }
  }, [composedEmail, addToast]);

  /* ---- Schedule follow-up ---- */
  const scheduleFollowUp = useCallback(() => {
    if (!analysis) return;
    const days = settings?.followUpDays || 3;
    const scheduled = new Date(); scheduled.setDate(scheduled.getDate() + days);
    addFollowUp({
      customerEmail: currentSampleFrom || extractEmail(emailText), customerName: analysis.customerName || analysis.travelers.names?.[0] || currentSampleFrom || extractEmail(emailText),
      destination: analysis.destination, originalResponse: composedEmail,
      scheduledDate: scheduled.toISOString(), status: 'pending',
      processedEmailId: Date.now().toString(),
    });
    addToast(`Follow-up scheduled for ${days} days from now`, 'success');
    setShowFollowUpForm(false);
  }, [analysis, emailText, composedEmail, settings, addToast]);

  const handleReset = useCallback(() => {
    setStep(1); setEmailText(''); setShowPaste(false); setAnalysis(null); setEdited(null);
    setAnalysisLoading(false); setFlights([]); setHotels([]); setResearch(''); setPlaces([]);
    setComposedEmail(''); setIsStreaming(false); setTotalTime(0); setKnownCustomer(null);
    setWeather([]); setShowFollowUpForm(false); setCurrentSampleFrom(null);
    completedRef.current = 0;
  }, []);

  const copyEmail = useCallback(async () => {
    await navigator.clipboard.writeText(composedEmail);
    setCopied(true); addToast('Copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  }, [composedEmail, addToast]);

  const sortedFlights = [...flights].sort((a, b) => {
    if (flightSort === 'price') return a.price - b.price;
    if (flightSort === 'stops') return a.stops - b.stops;
    return a.duration.localeCompare(b.duration);
  });

  const allAgentsDone = completedRef.current >= 4 || ['flight', 'hotel', 'research', 'places'].every(k => agentStatuses[k] === 'done' || agentStatuses[k] === 'error');

  // Price comparison combos
  const combos = analysis ? flights.flatMap((f, fi) =>
    hotels.map((h, hi) => ({
      fi, hi, airline: f.airline, hotel: h.name,
      flightTotal: f.price * analysis.travelers.adults,
      hotelTotal: h.pricePerNight * analysis.dates.duration,
      total: f.price * analysis.travelers.adults + h.pricePerNight * analysis.dates.duration,
      hotelRating: h.rating,
    }))
  ).sort((a, b) => a.total - b.total) : [];

  const selectedFlight = flights[selectedFlightIdx];
  const selectedHotel = hotels[selectedHotelIdx];

  const hotelLocs = hotels
    .map((h, i) => (h.lat != null && h.lng != null ? { lat: h.lat, lng: h.lng, label: h.name, idx: i } : null))
    .filter((x): x is NonNullable<typeof x> => x !== null);

  /* ================================================================ */

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto min-h-screen">
      <Breadcrumb items={breadcrumbs} />

      {/* ===== STEP 1 ===== */}
      {step === 1 && (
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Inbox</h1>
          <p className="text-sm mb-8" style={{ color: 'var(--color-text-secondary)' }}>Select a customer email or paste your own</p>
          <div className="space-y-2 mb-6">
            {SAMPLE_EMAILS.filter(e => !processedSampleIds.has(e.id)).map(email => (
              <button key={email.id} onClick={() => analyzeEmail(email.body, email.id, email.from)}
                className="w-full glass-card flex items-center gap-4 px-5 py-4 text-left transition-all cursor-pointer group"
                style={{ borderColor: 'var(--color-border)' }}>
                <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}><Mail size={18} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{email.from}</span>
                    <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{email.date}</span>
                  </div>
                  <p className="text-sm font-medium mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{email.subject}</p>
                  <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--color-text-muted)' }}>{email.preview}</p>
                </div>
                <ArrowRight size={16} style={{ color: 'var(--color-text-muted)' }} />
              </button>
            ))}
          </div>
          {!showPaste ? (
            <button onClick={() => setShowPaste(true)} className="w-full rounded-lg border border-dashed py-4 text-sm transition-colors cursor-pointer" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>+ Paste a custom email</button>
          ) : (
            <div className="space-y-3 animate-fade-in">
              <textarea value={emailText} onChange={e => setEmailText(e.target.value)} className={`${INPUT_CLS} min-h-[200px] resize-none`} style={INPUT_STYLE} placeholder="Paste a customer email here..." autoFocus />
              <div className="flex gap-3">
                <button onClick={() => analyzeEmail(emailText)} disabled={!emailText.trim()} className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:pointer-events-none" style={{ background: 'var(--color-primary)', color: '#fff' }}><Send size={15} /> Process</button>
                <button onClick={() => { setShowPaste(false); setEmailText(''); }} className="text-sm cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>Cancel</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== ORIGINAL EMAIL PANEL (Steps 2-4) ===== */}
      {step >= 2 && emailText && (
        <div className="card mb-6 overflow-hidden shadow-sm">
          <button onClick={() => setShowOriginalEmail(!showOriginalEmail)}
            className="w-full flex items-center justify-between px-5 py-3 cursor-pointer transition-colors"
            style={{ borderBottom: showOriginalEmail ? '1px solid var(--color-border)' : 'none' }}>
            <div className="flex items-center gap-2 text-sm">
              <Mail size={14} style={{ color: 'var(--color-primary)' }} />
              <span className="font-medium" style={{ color: 'var(--color-text)' }}>Original Email</span>
              {analysis && <span style={{ color: 'var(--color-text-muted)' }}>&mdash; {currentSampleFrom || extractEmail(emailText) || 'Customer'}</span>}
            </div>
            <ChevronDown size={14} style={{ color: 'var(--color-text-muted)', transform: showOriginalEmail ? 'rotate(180deg)' : 'none', transition: 'transform 0.15s' }} />
          </button>
          {showOriginalEmail && (
            <div className="px-5 py-4 max-h-[240px] overflow-y-auto">
              <div className="flex gap-4 mb-3 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                <span><b style={{ color: 'var(--color-text-secondary)' }}>From:</b> {currentSampleFrom || extractEmail(emailText) || 'Unknown'}</span>
                {analysis && <span><b style={{ color: 'var(--color-text-secondary)' }}>Subject:</b> Trip to {analysis.destination}</span>}
              </div>
              <pre className="whitespace-pre-wrap text-sm leading-relaxed font-sans" style={{ color: 'var(--color-text-secondary)' }}>{emailText}</pre>
            </div>
          )}
        </div>
      )}

      {/* ===== STEP 2 ===== */}
      {step === 2 && (
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Email Analysis</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>Review and edit the extracted information before searching
            {analysisSource === 'live' && <> <LiveBadge source="live" /></>}
            {analysisTime > 0 && <span className="ml-2" style={{ color: 'var(--color-text-muted)' }}><Clock size={11} className="inline" /> {fmtTime(analysisTime)}</span>}
          </p>

          {/* Customer recognition banner */}
          {knownCustomer && (
            <div className="glass-card px-5 py-3 mb-6 animate-fade-in" style={{ borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-2 text-sm">
                <RefreshCw size={14} style={{ color: 'var(--color-primary)' }} />
                <span className="font-medium" style={{ color: 'var(--color-primary)' }}>Returning Customer</span>
                <span style={{ color: 'var(--color-text-secondary)' }}>— {knownCustomer.name}</span>
              </div>
              <p className="text-xs mt-1" style={{ color: 'var(--color-text-secondary)' }}>
                {knownCustomer.trips.length} previous trip{knownCustomer.trips.length !== 1 ? 's' : ''}
                {knownCustomer.trips.length > 0 && <> — Last: {knownCustomer.trips[knownCustomer.trips.length - 1].destination}</>}
                {knownCustomer.preferredLanguage && <> — Language: {LANGUAGES.find(l => l.value === knownCustomer.preferredLanguage)?.label || knownCustomer.preferredLanguage}</>}
              </p>
            </div>
          )}

          {analysisLoading && (
            <div className="flex flex-col items-center justify-center py-20 gap-4">
              <Loader2 size={32} className="animate-spin" style={{ color: 'var(--color-primary)' }} />
              <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>Analyzing email...</p>
            </div>
          )}

          {edited && !analysisLoading && (
            <div className="space-y-6 max-w-3xl">
              <div className="grid grid-cols-2 gap-4">
                <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Origin</label><div className="flex gap-2"><input value={edited.origin} onChange={e => setEdited({ ...edited, origin: e.target.value })} className={INPUT_CLS} style={INPUT_STYLE} /><input value={edited.originIATA} onChange={e => setEdited({ ...edited, originIATA: e.target.value.toUpperCase() })} className={`${INPUT_CLS} w-20 text-center uppercase`} style={INPUT_STYLE} placeholder="IATA" /></div></div>
                <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Destination</label><div className="flex gap-2"><input value={edited.destination} onChange={e => setEdited({ ...edited, destination: e.target.value })} className={INPUT_CLS} style={INPUT_STYLE} /><input value={edited.destinationIATA} onChange={e => setEdited({ ...edited, destinationIATA: e.target.value.toUpperCase() })} className={`${INPUT_CLS} w-20 text-center uppercase`} style={INPUT_STYLE} placeholder="IATA" /></div></div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Start Date</label><input type="date" value={edited.startDate} onChange={e => setEdited({ ...edited, startDate: e.target.value })} className={INPUT_CLS} style={INPUT_STYLE} /></div>
                <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>End Date</label><input type="date" value={edited.endDate} onChange={e => setEdited({ ...edited, endDate: e.target.value })} className={INPUT_CLS} style={INPUT_STYLE} /></div>
                <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Duration</label><input type="number" value={edited.duration} onChange={e => setEdited({ ...edited, duration: parseInt(e.target.value) || 1 })} className={INPUT_CLS} style={INPUT_STYLE} min={1} /></div>
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Adults</label><input type="number" value={edited.adults} onChange={e => setEdited({ ...edited, adults: parseInt(e.target.value) || 1 })} className={INPUT_CLS} style={INPUT_STYLE} min={1} /></div>
                <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Children</label><input type="number" value={edited.children} onChange={e => setEdited({ ...edited, children: parseInt(e.target.value) || 0 })} className={INPUT_CLS} style={INPUT_STYLE} min={0} /></div>
                <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Budget Min (€/night)</label><input type="number" value={edited.budgetMin} onChange={e => setEdited({ ...edited, budgetMin: parseInt(e.target.value) || 0 })} className={INPUT_CLS} style={INPUT_STYLE} min={0} /></div>
                <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Budget Max (€/night)</label><input type="number" value={edited.budgetMax} onChange={e => setEdited({ ...edited, budgetMax: parseInt(e.target.value) || 0 })} className={INPUT_CLS} style={INPUT_STYLE} min={0} /></div>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Interests</label>
                <div className="flex flex-wrap gap-2 mb-2">{edited.interests.map((tag, i) => (<span key={i} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>{tag}<button onClick={() => setEdited({ ...edited, interests: edited.interests.filter((_, j) => j !== i) })} className="cursor-pointer" style={{ color: 'var(--color-primary)' }}><X size={12} /></button></span>))}</div>
                <div className="flex gap-2"><input value={newInterest} onChange={e => setNewInterest(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newInterest.trim()) { setEdited({ ...edited, interests: [...edited.interests, newInterest.trim()] }); setNewInterest(''); } }} className={`${INPUT_CLS} max-w-[200px]`} style={INPUT_STYLE} placeholder="Add interest..." /><button onClick={() => { if (newInterest.trim()) { setEdited({ ...edited, interests: [...edited.interests, newInterest.trim()] }); setNewInterest(''); } }} className="rounded-lg px-3 py-2 cursor-pointer transition-colors" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}><Plus size={16} /></button></div>
              </div>
              <div className="max-w-[200px]"><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Detected Language</label><select value={edited.language} onChange={e => setEdited({ ...edited, language: e.target.value })} className={INPUT_CLS} style={INPUT_STYLE}>{LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select></div>
              <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium cursor-pointer transition-all" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}><ArrowLeft size={15} /> Back</button>
                <button onClick={confirmAndSearch} className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer" style={{ background: 'var(--color-primary)', color: '#fff' }}><Search size={15} /> Confirm &amp; Search</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== STEP 3 ===== */}
      {step === 3 && (
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Search Results</h1>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>{analysis?.origin} → {analysis?.destination} · {analysis?.dates.duration} days · {analysis?.travelers.adults} adults</p>

          {/* Weather widget */}
          {weather.length > 0 && (
            <div className="glass-card px-5 py-3 mb-6 flex items-center gap-4 overflow-x-auto">
              <CloudSun size={16} className="flex-shrink-0" style={{ color: 'var(--color-amber)' }} />
              <span className="text-xs flex-shrink-0" style={{ color: 'var(--color-text-secondary)' }}>Weather:</span>
              {weather.slice(0, 5).map((w, i) => (
                <div key={i} className="flex flex-col items-center gap-0.5 flex-shrink-0 min-w-[50px]">
                  <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{new Date(w.date).toLocaleDateString('en-US', { weekday: 'short' })}</span>
                  <span className="text-base">{WEATHER_ICONS[w.condition] || '🌤️'}</span>
                  <span className="text-[10px]" style={{ color: 'var(--color-text-secondary)' }}>{w.high}°/{w.low}°</span>
                </div>
              ))}
            </div>
          )}

          {/* Tabs */}
          <div className="flex gap-1 border-b mb-6 overflow-x-auto" style={{ borderColor: 'var(--color-border)' }}>
            {([
              { key: 'flights' as const, label: 'Flights', icon: Plane, color: '#22D3EE', count: flights.length },
              { key: 'hotels' as const, label: 'Hotels', icon: Building2, color: '#F59E0B', count: hotels.length },
              { key: 'itinerary' as const, label: 'Itinerary', icon: Search, color: '#10B981', count: null },
              { key: 'places' as const, label: 'Places', icon: MapPin, color: '#A78BFA', count: places.length },
              { key: 'compare' as const, label: 'Compare', icon: BarChart3, color: '#EC4899', count: combos.length > 0 ? combos.length : null },
            ]).map(tab => {
              const agentKey = tab.key === 'itinerary' ? 'research' : tab.key === 'compare' ? '' : tab.key;
              return (
                <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                  className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer -mb-px whitespace-nowrap ${activeTab === tab.key ? 'border-current' : 'border-transparent'}`}
                  style={{ color: activeTab === tab.key ? tab.color : 'var(--color-text-muted)' }}>
                  <tab.icon size={15} />{tab.label}
                  {agentKey && agentStatuses[agentKey] === 'active' && <Loader2 size={12} className="animate-spin" />}
                  {agentKey && agentStatuses[agentKey] === 'done' && tab.count != null && <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: 'var(--color-primary-light)' }}>{tab.count}</span>}
                  {agentKey && <LiveBadge source={agentSources[agentKey]} />}
                  {agentKey && agentTimes[agentKey] != null && <span className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{fmtTime(agentTimes[agentKey])}</span>}
                </button>
              );
            })}
          </div>

          {/* FLIGHTS */}
          {activeTab === 'flights' && (<div>
            {agentStatuses.flight === 'active' && <div className="flex items-center gap-3 py-12 justify-center" style={{ color: 'var(--color-text-muted)' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> Searching flights...</div>}
            {flights.length > 0 && (<div>
              <div className="flex gap-2 mb-3"><span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Sort:</span>{(['price', 'duration', 'stops'] as const).map(s => (<button key={s} onClick={() => setFlightSort(s)} className="text-xs cursor-pointer transition-colors" style={{ color: flightSort === s ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: flightSort === s ? 500 : 400 }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>))}</div>
              <div className="glass-card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b text-left text-[11px] uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}><th className="w-10 px-4 py-2.5" /><th className="px-4 py-2.5 font-medium">Airline</th><th className="px-4 py-2.5 font-medium">Departure</th><th className="px-4 py-2.5 font-medium">Arrival</th><th className="px-4 py-2.5 font-medium">Stops</th><th className="px-4 py-2.5 font-medium">Duration</th><th className="px-4 py-2.5 font-medium text-right">Price</th></tr></thead>
              <tbody>{sortedFlights.map((f, i) => { const origIdx = flights.indexOf(f); return (
                <tr key={i} onClick={() => setSelectedFlightIdx(origIdx)} className="border-b last:border-0 cursor-pointer transition-all" style={{ borderColor: 'var(--color-border)', background: origIdx === selectedFlightIdx ? 'var(--color-primary-light)' : undefined }}>
                  <td className="px-4 py-3"><div className="flex h-5 w-5 items-center justify-center rounded-full border" style={{ borderColor: origIdx === selectedFlightIdx ? 'var(--color-primary)' : 'var(--color-border)', background: origIdx === selectedFlightIdx ? 'var(--color-primary-light)' : undefined }}>{origIdx === selectedFlightIdx && <Check size={12} style={{ color: 'var(--color-primary)' }} />}</div></td>
                  <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{f.airline}</td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{fmtClock(f.departureTime)}</td>
                  <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{fmtClock(f.arrivalTime)}</td>
                  <td className="px-4 py-3">{f.stops === 0 ? <span style={{ color: 'var(--color-green)' }}>Direct</span> : <span style={{ color: 'var(--color-text-secondary)' }}>{f.stops} stop{f.stops > 1 ? 's' : ''}</span>}</td>
                  <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{f.duration}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums" style={{ color: origIdx === selectedFlightIdx ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>{f.price}€</td>
                </tr>); })}</tbody></table></div>
            </div>)}
          </div>)}

          {/* HOTELS */}
          {activeTab === 'hotels' && (<div>
            {agentStatuses.hotel === 'active' && <div className="flex items-center gap-3 py-12 justify-center" style={{ color: 'var(--color-text-muted)' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-amber)' }} /> Searching hotels...</div>}
            {hotels.length > 0 && (<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{hotels.map((h, i) => (
              <div key={i} onClick={() => setSelectedHotelIdx(i)} className="glass-card p-4 cursor-pointer transition-all" style={{ borderColor: i === selectedHotelIdx ? 'var(--color-amber)' : 'var(--color-border)', background: i === selectedHotelIdx ? 'var(--color-amber-light)' : undefined }}>
                <div className="flex items-start justify-between"><div><div className="flex items-center gap-2">{i === selectedHotelIdx && <CheckCircle size={14} style={{ color: 'var(--color-amber)' }} />}<h4 className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{h.name}</h4></div><p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{h.area}</p></div><div className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold" style={{ background: 'var(--color-amber-light)', color: 'var(--color-amber)' }}><Star size={10} style={{ fill: 'var(--color-amber)' }} />{h.rating}</div></div>
                <div className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{h.amenities?.join(' · ')}</div>
                <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--color-border)' }}><div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}><TrainFront size={11} />{h.metroStation} ({h.metroDistance})</div><div className="text-sm font-semibold" style={{ color: 'var(--color-amber)' }}>{h.pricePerNight}€<span className="ml-0.5 text-[10px] font-normal" style={{ color: 'var(--color-text-muted)' }}>/night</span></div></div>
              </div>))}</div>)}
            {hotels.length > 0 && hotelLocs.length > 0 && (
              <div className="mt-4">
                <MapView
                  locations={hotelLocs.map(h => ({ lat: h!.lat, lng: h!.lng, label: h!.label }))}
                  selectedIndex={hotelLocs.findIndex(h => h!.idx === selectedHotelIdx)}
                  onSelect={(i) => { const loc = hotelLocs[i]; if (loc) setSelectedHotelIdx(loc.idx); }}
                  height={280}
                />
              </div>
            )}
          </div>)}

          {/* ITINERARY */}
          {activeTab === 'itinerary' && (<div>
            {agentStatuses.research === 'active' && <div className="flex items-center gap-3 py-12 justify-center" style={{ color: 'var(--color-text-muted)' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-green)' }} /> Generating itinerary...</div>}
            {research && (<div className="space-y-2">
              {parseResearchDays(research).map((d, i) => (
                <div key={i} className="glass-card overflow-hidden">
                  <button onClick={() => setExpandedDays(prev => { const n = new Set(prev); n.has(i) ? n.delete(i) : n.add(i); return n; })} className="w-full flex items-center justify-between px-5 py-3 cursor-pointer transition-colors">
                    <div className="flex items-center gap-3"><span className="rounded px-2.5 py-0.5 text-xs font-semibold" style={{ background: 'var(--color-green-light)', color: 'var(--color-green)' }}>{d.day}</span><span className="text-sm truncate max-w-[500px]" style={{ color: 'var(--color-text-secondary)' }}>{d.desc.split('.')[0]}</span></div>
                    {expandedDays.has(i) ? <ChevronUp size={16} style={{ color: 'var(--color-text-muted)' }} /> : <ChevronDown size={16} style={{ color: 'var(--color-text-muted)' }} />}
                  </button>
                  {expandedDays.has(i) && <div className="px-5 pb-4 text-sm leading-relaxed border-t pt-3" style={{ color: 'var(--color-text-secondary)', borderColor: 'var(--color-border)' }}>{d.desc}</div>}
                </div>
              ))}
              {parseResearchDays(research).length === 0 && <div className="glass-card px-5 py-4 text-sm whitespace-pre-wrap leading-relaxed" style={{ color: 'var(--color-text-secondary)' }}>{research}</div>}
            </div>)}
          </div>)}

          {/* PLACES */}
          {activeTab === 'places' && (<div>
            {agentStatuses.places === 'active' && <div className="flex items-center gap-3 py-12 justify-center" style={{ color: 'var(--color-text-muted)' }}><Loader2 size={20} className="animate-spin" style={{ color: 'var(--color-purple)' }} /> Searching places...</div>}
            {places.length > 0 && (<div className="glass-card divide-y" style={{ borderColor: 'var(--color-border)' }}>{places.map((p, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3" style={{ borderColor: 'var(--color-border)' }}>
                <input type="checkbox" checked={includedPlaces.has(p.name)} onChange={() => setIncludedPlaces(prev => { const n = new Set(prev); n.has(p.name) ? n.delete(p.name) : n.add(p.name); return n; })} className="h-4 w-4 rounded cursor-pointer" style={{ accentColor: 'var(--color-primary)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }} />
                <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{p.name}</span>{p.rating != null && <span className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--color-purple)' }}><Star size={10} className="fill-current" />{p.rating}</span>}</div><p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{p.address}</p>{p.summary && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>{p.summary}</p>}</div>
                {p.mapsUrl && <a href={p.mapsUrl} target="_blank" rel="noopener noreferrer" className="transition-colors" style={{ color: 'var(--color-text-muted)' }}><ExternalLink size={14} /></a>}
              </div>))}</div>)}
            {places.length > 0 && (
              <div className="mt-4">
                <MapView
                  locations={places.filter(p => p.lat != null && p.lng != null).map(p => ({
                    lat: p.lat!, lng: p.lng!, label: p.name, color: '#A78BFA',
                  }))}
                  height={280}
                />
              </div>
            )}
          </div>)}

          {/* COMPARE */}
          {activeTab === 'compare' && (<div>
            {combos.length === 0 && <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Waiting for flight and hotel results...</div>}
            {combos.length > 0 && (<div className="glass-card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b text-left text-[11px] uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
              <th className="px-4 py-2.5 font-medium">Flight</th><th className="px-4 py-2.5 font-medium">Hotel</th>
              <th className="px-4 py-2.5 font-medium text-right">Flights ({analysis?.travelers.adults}p)</th>
              <th className="px-4 py-2.5 font-medium text-right">Hotel ({analysis?.dates.duration}n)</th>
              <th className="px-4 py-2.5 font-medium text-right">Total</th><th className="px-4 py-2.5 font-medium">Rating</th><th className="w-20 px-4 py-2.5" />
            </tr></thead><tbody>
              {combos.slice(0, 12).map((c, i) => {
                const isSelected = c.fi === selectedFlightIdx && c.hi === selectedHotelIdx;
                const isBest = i === 0;
                const isBestRated = c.hotelRating === Math.max(...combos.map(x => x.hotelRating));
                return (
                  <tr key={i} onClick={() => { setSelectedFlightIdx(c.fi); setSelectedHotelIdx(c.hi); }}
                    className="border-b last:border-0 cursor-pointer transition-all" style={{ borderColor: 'var(--color-border)', background: isSelected ? 'var(--color-pink)' + '10' : undefined }}>
                    <td className="px-4 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>{c.airline}</td>
                    <td className="px-4 py-2.5" style={{ color: 'var(--color-text-secondary)' }}>{c.hotel}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{c.flightTotal}€</td>
                    <td className="px-4 py-2.5 text-right tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{c.hotelTotal}€</td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold" style={{ color: 'var(--color-text)' }}>{c.total}€</td>
                    <td className="px-4 py-2.5"><span className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--color-amber)' }}><Star size={9} style={{ fill: 'var(--color-amber)' }} />{c.hotelRating}</span></td>
                    <td className="px-4 py-2.5">{isBest && <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: 'var(--color-green-light)', color: 'var(--color-green)' }}>Best Value</span>}{isBestRated && !isBest && <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: 'var(--color-amber-light)', color: 'var(--color-amber)' }}>Top Rated</span>}{isSelected && <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold" style={{ background: 'var(--color-pink)' + '15', color: 'var(--color-pink)' }}>Selected</span>}</td>
                  </tr>);
              })}
            </tbody></table></div>)}
          </div>)}

          {/* Bottom actions */}
          <div className="flex items-center gap-4 mt-8 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button onClick={() => setStep(2)} className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium cursor-pointer transition-all" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}><ArrowLeft size={15} /> Back</button>
            <button onClick={startCompose} disabled={!allAgentsDone || selectedFlightIdx < 0 || selectedHotelIdx < 0} className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:pointer-events-none" style={{ background: 'var(--color-purple)', color: '#fff' }}><PenTool size={15} /> Compose Response</button>
            {!allAgentsDone && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Waiting for all agents to complete...</span>}
            {allAgentsDone && (selectedFlightIdx < 0 || selectedHotelIdx < 0) && <span className="text-xs" style={{ color: 'var(--color-amber)' }}>Select a flight and hotel before composing</span>}
          </div>
        </div>
      )}

      {/* ===== STEP 4 ===== */}
      {step === 4 && (
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>{isStreaming ? 'Composing Response...' : 'Response Ready'}</h1>
          <p className="text-sm mb-6" style={{ color: 'var(--color-text-secondary)' }}>{isStreaming ? 'AI is writing the response email' : `Completed in ${totalTime}s — manually this takes 30-45 minutes`}</p>

          <div className="flex gap-6">
            {/* LEFT: Email editor / preview */}
            <div className="flex-1 min-w-0">
              {/* Mode toggle */}
              {!isStreaming && composedEmail && (
                <div className="flex gap-1 mb-3">
                  <button onClick={() => setPreviewMode('editor')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors" style={{ background: previewMode === 'editor' ? 'var(--color-primary-light)' : 'transparent', color: previewMode === 'editor' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}><PenTool size={12} /> Editor</button>
                  <button onClick={() => setPreviewMode('html')} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium cursor-pointer transition-colors" style={{ background: previewMode === 'html' ? 'var(--color-primary-light)' : 'transparent', color: previewMode === 'html' ? 'var(--color-primary)' : 'var(--color-text-muted)' }}><Eye size={12} /> Preview</button>
                </div>
              )}

              {/* Editor view */}
              {previewMode === 'editor' && (
                <div className="glass-card overflow-hidden" style={{ borderColor: isStreaming ? 'rgba(236,72,153,0.2)' : 'rgba(16,185,129,0.2)' }}>
                  <div className="flex items-center justify-between border-b px-5 py-3" style={{ borderColor: 'var(--color-border)' }}>
                    <div className="flex items-center gap-2">{isStreaming ? <Loader2 size={14} className="animate-spin" style={{ color: 'var(--color-pink)' }} /> : <CheckCircle size={14} style={{ color: 'var(--color-green)' }} />}<span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>{isStreaming ? 'Writing...' : 'Complete'}</span></div>
                    <div className="flex gap-2">
                      {!isStreaming && composedEmail && (<>
                        <button onClick={() => setIsEditing(!isEditing)} className="text-xs cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>{isEditing ? 'Done Editing' : 'Edit'}</button>
                        <button onClick={copyEmail} className="flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs cursor-pointer transition-all" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>{copied ? <Check size={12} style={{ color: 'var(--color-green)' }} /> : <Copy size={12} />}{copied ? 'Copied!' : 'Copy'}</button>
                      </>)}
                    </div>
                  </div>
                  <div className="min-h-[350px] px-5 py-4">
                    {isEditing ? (
                      <textarea value={composedEmail} onChange={e => setComposedEmail(e.target.value)} className="w-full min-h-[350px] bg-transparent text-sm leading-relaxed outline-none resize-none" style={{ color: 'var(--color-text)' }} />
                    ) : (
                      <div className="whitespace-pre-wrap text-sm leading-relaxed" style={{ color: 'var(--color-text)' }}>{composedEmail}{isStreaming && <span className="animate-blink ml-0.5 inline-block h-4 w-[2px] translate-y-[2px]" style={{ background: 'var(--color-pink)' }} />}</div>
                    )}
                  </div>
                </div>
              )}

              {/* HTML Preview */}
              {previewMode === 'html' && (
                <div className="rounded-xl overflow-hidden border bg-white" style={{ borderColor: 'var(--color-border)' }}>
                  <iframe
                    srcDoc={emailToHtml(composedEmail, {
                      from: profile?.email || 'info@afea-travel.com',
                      to: currentSampleFrom || extractEmail(emailText),
                      subject: analysis ? `Re: Trip to ${analysis.destination}` : 'Travel Proposal',
                      agency: profile?.agencyName || 'Afea Travel',
                    })}
                    className="w-full min-h-[450px] border-0"
                    title="Email Preview"
                  />
                </div>
              )}

              {/* Action buttons */}
              {!isStreaming && (
                <div className="flex flex-wrap gap-3 mt-4">
                  <button onClick={() => { addToast('Email sent! (simulated)', 'success'); }} className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer" style={{ background: 'var(--color-primary)', color: '#fff' }}><Send size={15} /> Send</button>
                  <button onClick={() => addToast('Draft saved', 'success')} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm cursor-pointer transition-all" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}><Save size={14} /> Save Draft</button>
                  <button onClick={copyEmail} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm cursor-pointer transition-all" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}><Copy size={14} /> Copy Plain Text</button>

                  {/* Translate dropdown */}
                  <div className="relative group">
                    <button disabled={translating} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm cursor-pointer transition-all disabled:opacity-50" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
                      {translating ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />} Translate
                    </button>
                    <div className="absolute left-0 top-full mt-1 hidden group-hover:block z-10">
                      <div className="glass-card py-1 min-w-[140px] shadow-lg">
                        {LANGUAGES.map(l => (
                          <button key={l.value} onClick={() => translateTo(l.value)} className="w-full text-left px-4 py-2 text-sm cursor-pointer" style={{ color: 'var(--color-text-secondary)' }}>{l.label}</button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Follow-up */}
                  <button onClick={() => setShowFollowUpForm(!showFollowUpForm)} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm cursor-pointer transition-all" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}><CalendarPlus size={14} /> Schedule Follow-up</button>
                  <button onClick={handleReset} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2.5 text-sm cursor-pointer transition-all" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}><RotateCcw size={14} /> New Email</button>
                </div>
              )}

              {/* Follow-up form */}
              {showFollowUpForm && !isStreaming && (
                <div className="glass-card p-4 mt-4 animate-fade-in">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-medium" style={{ color: 'var(--color-text-secondary)' }}>Schedule Follow-up</h4>
                    <button onClick={() => setShowFollowUpForm(false)} className="cursor-pointer" style={{ color: 'var(--color-text-muted)' }}><X size={14} /></button>
                  </div>
                  <p className="text-xs mb-3" style={{ color: 'var(--color-text-secondary)' }}>A follow-up email will be generated in {settings?.followUpDays || 3} days if no reply is received.</p>
                  <button onClick={scheduleFollowUp} className="inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium cursor-pointer transition-colors" style={{ background: 'var(--color-amber-light)', borderColor: 'var(--color-amber)', color: 'var(--color-amber)' }}><CalendarPlus size={14} /> Confirm Follow-up</button>
                </div>
              )}
            </div>

            {/* RIGHT: Summary sidebar */}
            {!isStreaming && (
              <div className="hidden lg:block w-72 flex-shrink-0 space-y-4 animate-fade-in">
                <h3 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Selected Options</h3>
                {selectedFlight && (
                  <div className="glass-card p-3"><div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--color-primary)' }}><Plane size={12} /> Flight</div><p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{selectedFlight.airline}</p><p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{fmtClock(selectedFlight.departureTime)} → {fmtClock(selectedFlight.arrivalTime)} · {selectedFlight.price}€/person</p></div>
                )}
                {selectedHotel && (
                  <div className="glass-card p-3"><div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--color-amber)' }}><Building2 size={12} /> Hotel</div><p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{selectedHotel.name}</p><p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{selectedHotel.area} · {selectedHotel.pricePerNight}€/night · ★{selectedHotel.rating}</p></div>
                )}
                {/* Cost breakdown */}
                {analysis && selectedFlight && selectedHotel && (
                  <div className="glass-card p-3">
                    <div className="flex items-center gap-2 text-xs mb-2" style={{ color: 'var(--color-pink)' }}><BarChart3 size={12} /> Cost Estimate</div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between" style={{ color: 'var(--color-text-secondary)' }}><span>Flights ({analysis.travelers.adults}x{selectedFlight.price}€)</span><span className="tabular-nums">{selectedFlight.price * analysis.travelers.adults}€</span></div>
                      <div className="flex justify-between" style={{ color: 'var(--color-text-secondary)' }}><span>Hotel ({analysis.dates.duration}x{selectedHotel.pricePerNight}€)</span><span className="tabular-nums">{selectedHotel.pricePerNight * analysis.dates.duration}€</span></div>
                      <div className="flex justify-between" style={{ color: 'var(--color-text-secondary)' }}><span>Est. meals/activities</span><span className="tabular-nums">~{analysis.dates.duration * 50 * analysis.travelers.adults}€</span></div>
                      <div className="flex justify-between font-semibold pt-1 border-t" style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)' }}><span>Total</span><span className="tabular-nums">{selectedFlight.price * analysis.travelers.adults + selectedHotel.pricePerNight * analysis.dates.duration + analysis.dates.duration * 50 * analysis.travelers.adults}€</span></div>
                    </div>
                  </div>
                )}
                {totalTime > 0 && (
                  <div className="glass-card p-3"><div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--color-green)' }}><Clock size={12} /> Time</div><p className="text-sm font-bold tabular-nums" style={{ color: 'var(--color-green)' }}>{totalTime}s</p><p className="text-[10px]" style={{ color: 'var(--color-text-muted)' }}>vs 30-45 min manually</p></div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="mt-12 pb-4 text-center text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
        © 2026 Revival SA — AI &amp; Business Intelligence
      </div>
    </div>
  );
}
