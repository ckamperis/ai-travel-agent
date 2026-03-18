'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Plane, Building2, Search, Loader2, CheckCircle,
  Copy, Check, Clock, ArrowRight, ArrowLeft, Radio,
  Send, PenTool, Mail, RotateCcw, ChevronDown, X, Plus,
  BarChart3, Eye, Languages, CalendarPlus,
  Save, RefreshCw, Trash2,
} from 'lucide-react';
import type { EmailAnalysis, FlightResult, HotelResult, PlaceResult, LegAnalysis } from '@/agents/types';
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
import LegResults from '@/components/LegResults';

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
  {
    id: 'greece-multi', from: 'hans.schneider@gmail.com',
    subject: 'Greece island hopping — Athens + Santorini + Crete (10 days)',
    preview: 'We are Hans and Maria Schneider from Berlin, planning a multi-destination Greece trip...',
    date: '1 hour ago',
    body: `Guten Tag,\n\nWe are Hans and Maria Schneider from Berlin. We are planning a 10-day island hopping trip to Greece:\n\n- First 4 nights in Athens (we love history, food, and the Acropolis)\n- Then 3 nights in Santorini (beaches, sunset views, romantic dinners)\n- Finally 3 nights in Crete (nature, Samaria Gorge, local cuisine)\n\nWe need:\n- All flights between destinations (Berlin → Athens → Santorini → Crete → Berlin)\n- Hotels at each destination, mid-range budget (120-180€/night)\n- Activities and restaurant recommendations for each stop\n\n2 adults, no children.\n\nCould you organize everything for us?\n\nVielen Dank!\nHans & Maria Schneider`,
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

interface EditableLeg {
  destination: string;
  destinationIATA: string;
  nights: number;
  budgetMin: number;
  budgetMax: number;
  currency: string;
  interests: string[];
}

interface LegState {
  flights: FlightResult[];
  hotels: HotelResult[];
  research: string;
  places: PlaceResult[];
  weather: WeatherDay[];
  selectedFlightIdx: number;
  selectedHotelIdx: number;
  includedPlaces: Set<string>;
  agentStatuses: Record<string, AgentStatus>;
  agentTimes: Record<string, number>;
  agentSources: Record<string, 'live' | 'ai' | 'mock'>;
  agentMessages: Record<string, string>;
}

function createEmptyLegState(): LegState {
  return {
    flights: [], hotels: [], research: '', places: [], weather: [],
    selectedFlightIdx: -1, selectedHotelIdx: -1, includedPlaces: new Set(),
    agentStatuses: { flight: 'idle', hotel: 'idle', research: 'idle', places: 'idle' },
    agentTimes: {}, agentSources: {}, agentMessages: {},
  };
}

function toEditable(a: EmailAnalysis): EditableAnalysis {
  return { origin: a.origin, originIATA: a.originIATA, destination: a.destination, destinationIATA: a.destinationIATA, startDate: a.dates.start, endDate: a.dates.end, duration: a.dates.duration, adults: a.travelers.adults, children: a.travelers.children, budgetMin: a.budget.min, budgetMax: a.budget.max, currency: a.budget.currency, interests: [...a.interests], language: a.language, specialRequests: [...a.specialRequests], customerName: a.customerName };
}
function toAnalysis(e: EditableAnalysis): EmailAnalysis {
  return { origin: e.origin, originIATA: e.originIATA, destination: e.destination, destinationIATA: e.destinationIATA, dates: { start: e.startDate, end: e.endDate, duration: e.duration }, travelers: { adults: e.adults, children: e.children, names: [] }, budget: { min: e.budgetMin, max: e.budgetMax, currency: e.currency }, interests: e.interests, language: e.language, specialRequests: e.specialRequests, customerName: e.customerName };
}

function toEditableLegs(legs: LegAnalysis[]): EditableLeg[] {
  return legs.map(l => ({
    destination: l.destination, destinationIATA: l.destinationIATA, nights: l.nights,
    budgetMin: l.budget.min, budgetMax: l.budget.max, currency: l.budget.currency,
    interests: [...l.interests],
  }));
}

function legsToAnalysis(legs: EditableLeg[]): LegAnalysis[] {
  return legs.map(l => ({
    destination: l.destination, destinationIATA: l.destinationIATA, nights: l.nights,
    budget: { min: l.budgetMin, max: l.budgetMax, currency: l.currency },
    interests: l.interests,
  }));
}

function fmtTime(ms: number) { return `${(ms / 1000).toFixed(1)}s`; }
function fmtClock(iso: string) { try { return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }); } catch { return iso; } }
function extractEmail(text: string): string {
  const m = text.match(/[\w.+-]+@[\w.-]+\.\w+/);
  return m ? m[0] : '';
}
const INPUT_CLS = 'w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors';
const INPUT_STYLE: React.CSSProperties = { background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text)' };

function LiveBadge({ source }: { source?: 'live' | 'ai' | 'mock' }) {
  if (source === 'live') return <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ background: 'var(--color-green-light)', color: 'var(--color-green)' }}><Radio size={8} className="animate-pulse" />Live</span>;
  if (source === 'ai') return <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ background: 'var(--color-purple)' + '20', color: 'var(--color-purple)' }}>AI</span>;
  return null;
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
  const [editedLegs, setEditedLegs] = useState<EditableLeg[]>([]);
  const [analysisLegTab, setAnalysisLegTab] = useState(0); // 0 = overview
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisSource, setAnalysisSource] = useState<'live' | 'ai' | 'mock'>('mock');
  const [analysisTime, setAnalysisTime] = useState(0);
  const [knownCustomer, setKnownCustomer] = useState<KnownCustomer | null>(null);
  const [newInterest, setNewInterest] = useState('');

  // Step 3 — per-leg state
  const [legStates, setLegStates] = useState<LegState[]>([]);
  const [activeLegTab, setActiveLegTab] = useState(0);

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

  const isMultiLeg = legStates.length > 1;
  const hasLegs = editedLegs.length > 0;
  const currentLeg = legStates[activeLegTab] || createEmptyLegState();

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
    setEditedLegs([]);
    setAnalysisLegTab(0);
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
              if (a.legs && a.legs.length > 0) {
                setEditedLegs(toEditableLegs(a.legs));
              }
              setAnalysisSource(ev.source || 'mock');
              setAnalysisTime(Date.now() - startTimeRef.current);
              addToast(a.legs && a.legs.length > 0 ? 'Email analyzed — multi-leg trip detected' : 'Email analyzed successfully', 'success');
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
    if (editedLegs.length > 0) {
      finalAnalysis.legs = legsToAnalysis(editedLegs);
      finalAnalysis.dates.duration = editedLegs.reduce((sum, l) => sum + l.nights, 0);
    }
    setAnalysis(finalAnalysis);
    setStep(3); setShowOriginalEmail(false);
    setActiveLegTab(0);
    startTimeRef.current = Date.now();

    const isMultiLegTrip = editedLegs.length > 1;
    const totalLegSlots = isMultiLegTrip ? editedLegs.length + 1 : 1; // +1 for return flight
    const newLegStates = Array.from({ length: totalLegSlots }, () => createEmptyLegState());
    setLegStates(newLegStates);
    agentStartRef.current = {};

    // Weather
    if (isMultiLegTrip) {
      let dayOffset = 0;
      for (let i = 0; i < editedLegs.length; i++) {
        const leg = editedLegs[i];
        const legStart = new Date(edited.startDate);
        legStart.setDate(legStart.getDate() + dayOffset);
        const legStartStr = legStart.toISOString().split('T')[0];
        const idx = i;
        getWeather(leg.destination, legStartStr, Math.min(leg.nights, 7))
          .then(w => setLegStates(prev => prev.map((ls, j) => j === idx ? { ...ls, weather: w } : ls)))
          .catch(() => {});
        dayOffset += leg.nights;
      }
    } else {
      getWeather(finalAnalysis.destination, finalAnalysis.dates.start, Math.min(finalAnalysis.dates.duration, 7))
        .then(w => setLegStates(prev => prev.map((ls, j) => j === 0 ? { ...ls, weather: w } : ls)))
        .catch(() => {});
    }

    // SSE flow — works for both single-leg and multi-leg
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
            const legIndex = ev.legIndex ?? 0;
            if (agent === 'email') continue;

            // Ensure leg state slot exists
            setLegStates(prev => {
              if (legIndex >= prev.length) {
                const extended = [...prev];
                while (extended.length <= legIndex) extended.push(createEmptyLegState());
                return extended;
              }
              return prev;
            });

            if (status === 'started') {
              agentStartRef.current[`${legIndex}-${agent}`] = Date.now();
              setLegStates(prev => prev.map((ls, j) => j !== legIndex ? ls : { ...ls, agentStatuses: { ...ls.agentStatuses, [agent]: 'active' }, agentMessages: { ...ls.agentMessages, [agent]: message } }));
            } else if (status === 'done') {
              const elapsed = Date.now() - (agentStartRef.current[`${legIndex}-${agent}`] || Date.now());
              setLegStates(prev => prev.map((ls, j) => {
                if (j !== legIndex) return ls;
                const updated: Partial<LegState> = {
                  agentStatuses: { ...ls.agentStatuses, [agent]: 'done' },
                  agentMessages: { ...ls.agentMessages, [agent]: message },
                  agentTimes: { ...ls.agentTimes, [agent]: elapsed },
                  agentSources: source ? { ...ls.agentSources, [agent]: source } : ls.agentSources,
                };
                if (agent === 'flight') { updated.flights = (data as FlightResult[]) || []; }
                if (agent === 'hotel') { updated.hotels = (data as HotelResult[]) || []; }
                if (agent === 'research') { updated.research = stripMarkdown((data as string) || ''); }
                if (agent === 'places') { const p = (data as PlaceResult[]) || []; updated.places = p; updated.includedPlaces = new Set(p.map(pl => pl.name)); }
                return { ...ls, ...updated };
              }));
            } else if (status === 'error') {
              setLegStates(prev => prev.map((ls, j) => j !== legIndex ? ls : { ...ls, agentStatuses: { ...ls.agentStatuses, [agent]: 'error' } }));
            }
          } catch { /* skip */ }
        }
      }
    } catch { addToast('Agent search failed', 'error'); }
  }, [edited, editedLegs, emailText, addToast]);

  /* ---- All agents done check ---- */
  const allAgentsDone = legStates.length > 0 && legStates.every((leg, i) => {
    const isReturn = isMultiLeg && i === legStates.length - 1;
    if (isReturn) return leg.agentStatuses.flight === 'done' || leg.agentStatuses.flight === 'error';
    return ['flight', 'hotel', 'research', 'places'].every(k => leg.agentStatuses[k] === 'done' || leg.agentStatuses[k] === 'error');
  });

  const allLegsSelected = legStates.length > 0 && legStates.every((leg, i) => {
    const isReturn = isMultiLeg && i === legStates.length - 1;
    if (isReturn) return leg.selectedFlightIdx >= 0;
    return leg.selectedFlightIdx >= 0 && leg.selectedHotelIdx >= 0;
  });

  /* ---- Step 3 → 4 ---- */
  const startCompose = useCallback(async () => {
    setStep(4); setIsStreaming(true); setComposedEmail(''); setCopied(false); setIsEditing(false); setPreviewMode('editor');
    let text = '';

    try {
      const leg0 = legStates[0] || createEmptyLegState();

      // Build per-leg data for multi-leg compose
      const perLegData = isMultiLeg ? legStates.map((leg, i) => {
        const isReturn = i === legStates.length - 1;
        return {
          legName: isReturn ? 'Return Flight' : (editedLegs[i]?.destination || ''),
          selectedFlight: leg.flights[leg.selectedFlightIdx] || null,
          selectedHotel: !isReturn ? leg.hotels[leg.selectedHotelIdx] || null : null,
          flights: leg.flights,
          hotels: !isReturn ? leg.hotels : [],
          topPlaces: !isReturn ? leg.places.filter(p => leg.includedPlaces.has(p.name)) : [],
          itinerarySummary: !isReturn ? leg.research : '',
        };
      }) : undefined;

      const res = await fetch('/api/compose', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailText, emailAnalysis: analysis,
          selectedFlight: leg0.flights[leg0.selectedFlightIdx] || null,
          selectedHotel: leg0.hotels[leg0.selectedHotelIdx] || null,
          flights: leg0.flights, hotels: leg0.hotels, research: leg0.research, places: leg0.places,
          includedPlaces: [...leg0.includedPlaces],
          perLegData,
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
      saveHistoryAndCustomer(text, total);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [emailText, analysis, legStates, editedLegs, isMultiLeg, settings, knownCustomer, addToast]);

  /* ---- Save history + customer ---- */
  function saveHistoryAndCustomer(text: string, total: number) {
    const customerEmail = currentSampleFrom || extractEmail(emailText);
    const customerName = analysis?.customerName || '';
    if (analysis) {
      addToHistory({
        id: Date.now().toString(), from: customerName || customerEmail || 'Unknown',
        subject: `Trip to ${analysis.destination}`, destination: analysis.destination,
        processedAt: new Date().toISOString(), totalTime: total,
        status: text.length > 50 ? 'completed' : 'failed',
        composedResponse: text, customerEmail, customerName,
        sampleEmailId: currentSampleId || undefined,
      });
      if (currentSampleId) setProcessedSampleIds(prev => new Set([...prev, currentSampleId]));
      if (customerEmail) {
        upsertCustomer({ email: customerEmail, name: customerName, destination: analysis.destination, hotel: legStates[0]?.hotels[legStates[0]?.selectedHotelIdx]?.name, budget: `€${analysis.budget.min}-${analysis.budget.max}`, language: analysis.language });
      }
    }
  }

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
      customerEmail: currentSampleFrom || extractEmail(emailText), customerName: analysis.customerName || currentSampleFrom || extractEmail(emailText),
      destination: analysis.destination, originalResponse: composedEmail,
      scheduledDate: scheduled.toISOString(), status: 'pending',
      processedEmailId: Date.now().toString(),
    });
    addToast(`Follow-up scheduled for ${days} days from now`, 'success');
    setShowFollowUpForm(false);
  }, [analysis, emailText, composedEmail, settings, currentSampleFrom, addToast]);

  const handleReset = useCallback(() => {
    setStep(1); setEmailText(''); setShowPaste(false); setAnalysis(null); setEdited(null);
    setAnalysisLoading(false); setLegStates([]); setActiveLegTab(0);
    setEditedLegs([]); setAnalysisLegTab(0);
    setComposedEmail(''); setIsStreaming(false); setTotalTime(0); setKnownCustomer(null);
    setShowFollowUpForm(false); setCurrentSampleFrom(null);
  }, []);

  const copyEmail = useCallback(async () => {
    await navigator.clipboard.writeText(composedEmail);
    setCopied(true); addToast('Copied to clipboard', 'success');
    setTimeout(() => setCopied(false), 2000);
  }, [composedEmail, addToast]);

  /* ---- Leg tab labels for Step 3 ---- */
  const legTabLabels = isMultiLeg
    ? [...editedLegs.map(l => l.destination), 'Return Flight']
    : [];

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
                    {email.id === 'greece-multi' && <span className="rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ background: 'var(--color-purple)' + '20', color: 'var(--color-purple)' }}>Multi-leg</span>}
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
            {analysisSource !== 'mock' && <> <LiveBadge source={analysisSource} /></>}
            {analysisTime > 0 && <span className="ml-2" style={{ color: 'var(--color-text-muted)' }}><Clock size={11} className="inline" /> {fmtTime(analysisTime)}</span>}
            {hasLegs && <span className="ml-2 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ background: 'var(--color-purple)' + '20', color: 'var(--color-purple)' }}>{editedLegs.length} legs</span>}
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

              {/* ---- Leg tabs (multi-leg only) ---- */}
              {hasLegs && (
                <div className="flex gap-1 border-b overflow-x-auto" style={{ borderColor: 'var(--color-border)' }}>
                  <button onClick={() => setAnalysisLegTab(0)}
                    className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer -mb-px whitespace-nowrap ${analysisLegTab === 0 ? 'border-current' : 'border-transparent'}`}
                    style={{ color: analysisLegTab === 0 ? 'var(--color-primary)' : 'var(--color-text-muted)' }}>
                    Overview
                  </button>
                  {editedLegs.map((leg, i) => (
                    <button key={i} onClick={() => setAnalysisLegTab(i + 1)}
                      className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer -mb-px whitespace-nowrap ${analysisLegTab === i + 1 ? 'border-current' : 'border-transparent'}`}
                      style={{ color: analysisLegTab === i + 1 ? 'var(--color-purple)' : 'var(--color-text-muted)' }}>
                      Leg {i + 1}: {leg.destination || '?'} {leg.nights > 0 && `${leg.nights}n`}
                    </button>
                  ))}
                  <button onClick={() => {
                    setEditedLegs(prev => [...prev, { destination: '', destinationIATA: '', nights: 3, budgetMin: edited.budgetMin, budgetMax: edited.budgetMax, currency: edited.currency, interests: [] }]);
                    setAnalysisLegTab(editedLegs.length + 1);
                  }} className="px-3 py-2.5 text-sm cursor-pointer transition-colors" style={{ color: 'var(--color-text-muted)' }}>
                    <Plus size={14} />
                  </button>
                </div>
              )}

              {/* ---- Overview / Single-dest fields ---- */}
              {(analysisLegTab === 0 || !hasLegs) && (<>
                <div className="grid grid-cols-2 gap-4">
                  <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Origin</label><div className="flex gap-2"><input value={edited.origin} onChange={e => setEdited({ ...edited, origin: e.target.value })} className={INPUT_CLS} style={INPUT_STYLE} /><input value={edited.originIATA} onChange={e => setEdited({ ...edited, originIATA: e.target.value.toUpperCase() })} className={`${INPUT_CLS} w-20 text-center uppercase`} style={INPUT_STYLE} placeholder="IATA" /></div></div>
                  {!hasLegs && (
                    <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Destination</label><div className="flex gap-2"><input value={edited.destination} onChange={e => setEdited({ ...edited, destination: e.target.value })} className={INPUT_CLS} style={INPUT_STYLE} /><input value={edited.destinationIATA} onChange={e => setEdited({ ...edited, destinationIATA: e.target.value.toUpperCase() })} className={`${INPUT_CLS} w-20 text-center uppercase`} style={INPUT_STYLE} placeholder="IATA" /></div></div>
                  )}
                  {hasLegs && (
                    <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Destinations</label><div className="flex flex-wrap gap-1.5 py-2">{editedLegs.map((l, i) => (<span key={i} className="rounded-full px-3 py-1 text-xs" style={{ background: 'var(--color-purple)' + '15', color: 'var(--color-purple)' }}>{l.destination || `Leg ${i + 1}`}</span>))}</div></div>
                  )}
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Start Date</label><input type="date" value={edited.startDate} onChange={e => setEdited({ ...edited, startDate: e.target.value })} className={INPUT_CLS} style={INPUT_STYLE} /></div>
                  <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>End Date</label><input type="date" value={edited.endDate} onChange={e => setEdited({ ...edited, endDate: e.target.value })} className={INPUT_CLS} style={INPUT_STYLE} /></div>
                  <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Total Duration</label><input type="number" value={hasLegs ? editedLegs.reduce((s, l) => s + l.nights, 0) : edited.duration} readOnly={hasLegs} onChange={e => !hasLegs && setEdited({ ...edited, duration: parseInt(e.target.value) || 1 })} className={INPUT_CLS} style={{ ...INPUT_STYLE, ...(hasLegs ? { opacity: 0.6 } : {}) }} min={1} /></div>
                </div>
                <div className="grid grid-cols-4 gap-4">
                  <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Adults</label><input type="number" value={edited.adults} onChange={e => setEdited({ ...edited, adults: parseInt(e.target.value) || 1 })} className={INPUT_CLS} style={INPUT_STYLE} min={1} /></div>
                  <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Children</label><input type="number" value={edited.children} onChange={e => setEdited({ ...edited, children: parseInt(e.target.value) || 0 })} className={INPUT_CLS} style={INPUT_STYLE} min={0} /></div>
                  {!hasLegs && (<>
                    <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Budget Min (€/night)</label><input type="number" value={edited.budgetMin} onChange={e => setEdited({ ...edited, budgetMin: parseInt(e.target.value) || 0 })} className={INPUT_CLS} style={INPUT_STYLE} min={0} /></div>
                    <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Budget Max (€/night)</label><input type="number" value={edited.budgetMax} onChange={e => setEdited({ ...edited, budgetMax: parseInt(e.target.value) || 0 })} className={INPUT_CLS} style={INPUT_STYLE} min={0} /></div>
                  </>)}
                </div>
                {!hasLegs && (
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Interests</label>
                    <div className="flex flex-wrap gap-2 mb-2">{edited.interests.map((tag, i) => (<span key={i} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>{tag}<button onClick={() => setEdited({ ...edited, interests: edited.interests.filter((_, j) => j !== i) })} className="cursor-pointer" style={{ color: 'var(--color-primary)' }}><X size={12} /></button></span>))}</div>
                    <div className="flex gap-2"><input value={newInterest} onChange={e => setNewInterest(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newInterest.trim()) { setEdited({ ...edited, interests: [...edited.interests, newInterest.trim()] }); setNewInterest(''); } }} className={`${INPUT_CLS} max-w-[200px]`} style={INPUT_STYLE} placeholder="Add interest..." /><button onClick={() => { if (newInterest.trim()) { setEdited({ ...edited, interests: [...edited.interests, newInterest.trim()] }); setNewInterest(''); } }} className="rounded-lg px-3 py-2 cursor-pointer transition-colors" style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}><Plus size={16} /></button></div>
                  </div>
                )}
                {hasLegs && (
                  <div>
                    <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Special Requests</label>
                    <textarea value={edited.specialRequests.join('\n')} onChange={e => setEdited({ ...edited, specialRequests: e.target.value.split('\n').filter(l => l.trim()) })} className={`${INPUT_CLS} min-h-[60px] resize-none`} style={INPUT_STYLE} placeholder="Any special requests..." />
                  </div>
                )}
                <div className="max-w-[200px]"><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Detected Language</label><select value={edited.language} onChange={e => setEdited({ ...edited, language: e.target.value })} className={INPUT_CLS} style={INPUT_STYLE}>{LANGUAGES.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}</select></div>
              </>)}

              {/* ---- Per-leg edit (multi-leg only) ---- */}
              {hasLegs && analysisLegTab > 0 && (() => {
                const legIdx = analysisLegTab - 1;
                const leg = editedLegs[legIdx];
                if (!leg) return null;
                const updateLeg = (updates: Partial<EditableLeg>) => {
                  setEditedLegs(prev => prev.map((l, i) => i === legIdx ? { ...l, ...updates } : l));
                };
                return (
                  <div className="space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--color-purple)' }}>Leg {legIdx + 1}</h3>
                      {editedLegs.length > 1 && (
                        <button onClick={() => {
                          setEditedLegs(prev => prev.filter((_, i) => i !== legIdx));
                          setAnalysisLegTab(0);
                        }} className="flex items-center gap-1 text-xs cursor-pointer transition-colors" style={{ color: 'var(--color-red)' }}><Trash2 size={12} /> Remove Leg</button>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Destination</label><div className="flex gap-2"><input value={leg.destination} onChange={e => updateLeg({ destination: e.target.value })} className={INPUT_CLS} style={INPUT_STYLE} /><input value={leg.destinationIATA} onChange={e => updateLeg({ destinationIATA: e.target.value.toUpperCase() })} className={`${INPUT_CLS} w-20 text-center uppercase`} style={INPUT_STYLE} placeholder="IATA" /></div></div>
                      <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Nights</label><input type="number" value={leg.nights} onChange={e => updateLeg({ nights: parseInt(e.target.value) || 1 })} className={INPUT_CLS} style={INPUT_STYLE} min={1} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Budget Min (€/night)</label><input type="number" value={leg.budgetMin} onChange={e => updateLeg({ budgetMin: parseInt(e.target.value) || 0 })} className={INPUT_CLS} style={INPUT_STYLE} min={0} /></div>
                      <div><label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Budget Max (€/night)</label><input type="number" value={leg.budgetMax} onChange={e => updateLeg({ budgetMax: parseInt(e.target.value) || 0 })} className={INPUT_CLS} style={INPUT_STYLE} min={0} /></div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--color-text-secondary)' }}>Interests</label>
                      <div className="flex flex-wrap gap-2 mb-2">{leg.interests.map((tag, i) => (<span key={i} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs" style={{ background: 'var(--color-purple)' + '15', color: 'var(--color-purple)' }}>{tag}<button onClick={() => updateLeg({ interests: leg.interests.filter((_, j) => j !== i) })} className="cursor-pointer" style={{ color: 'var(--color-purple)' }}><X size={12} /></button></span>))}</div>
                      <div className="flex gap-2"><input value={newInterest} onChange={e => setNewInterest(e.target.value)} onKeyDown={e => { if (e.key === 'Enter' && newInterest.trim()) { updateLeg({ interests: [...leg.interests, newInterest.trim()] }); setNewInterest(''); } }} className={`${INPUT_CLS} max-w-[200px]`} style={INPUT_STYLE} placeholder="Add interest..." /><button onClick={() => { if (newInterest.trim()) { updateLeg({ interests: [...leg.interests, newInterest.trim()] }); setNewInterest(''); } }} className="rounded-lg px-3 py-2 cursor-pointer transition-colors" style={{ background: 'var(--color-purple)' + '15', color: 'var(--color-purple)' }}><Plus size={16} /></button></div>
                    </div>
                  </div>
                );
              })()}

              <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--color-border)' }}>
                <button onClick={() => setStep(1)} className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium cursor-pointer transition-all" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}><ArrowLeft size={15} /> Back</button>
                <button onClick={confirmAndSearch} className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer" style={{ background: 'var(--color-primary)', color: '#fff' }}><Search size={15} /> Confirm &amp; Search{hasLegs ? ` (${editedLegs.length} legs)` : ''}</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== STEP 3 ===== */}
      {step === 3 && (
        <div className="animate-fade-in">
          <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--color-text)' }}>Search Results</h1>
          <p className="text-sm mb-4" style={{ color: 'var(--color-text-secondary)' }}>
            {analysis?.origin} → {isMultiLeg ? editedLegs.map(l => l.destination).join(' → ') + ` → ${analysis?.origin}` : analysis?.destination}
            {' · '}{isMultiLeg ? editedLegs.reduce((s, l) => s + l.nights, 0) : analysis?.dates.duration} days · {analysis?.travelers.adults} adults
          </p>

          {/* ---- Multi-leg tabs ---- */}
          {isMultiLeg && (
            <div className="flex gap-1 border-b mb-6 overflow-x-auto" style={{ borderColor: 'var(--color-border)' }}>
              {legTabLabels.map((label, i) => {
                const isReturn = i === legTabLabels.length - 1;
                const leg = legStates[i];
                const hasSelections = leg && (isReturn
                  ? leg.selectedFlightIdx >= 0
                  : leg.selectedFlightIdx >= 0 && leg.selectedHotelIdx >= 0);
                return (
                  <button key={i} onClick={() => setActiveLegTab(i)}
                    className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors cursor-pointer -mb-px whitespace-nowrap ${activeLegTab === i ? 'border-current' : 'border-transparent'}`}
                    style={{ color: activeLegTab === i ? (isReturn ? 'var(--color-primary)' : 'var(--color-purple)') : 'var(--color-text-muted)' }}>
                    {isReturn ? <Plane size={14} /> : null}
                    {label}
                    {hasSelections && <CheckCircle size={12} style={{ color: 'var(--color-green)' }} />}
                    {!isReturn && editedLegs[i] && <span className="text-[10px] opacity-60">{editedLegs[i].nights}n</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* ---- LegResults for active tab ---- */}
          <LegResults
            key={activeLegTab}
            flights={currentLeg.flights}
            hotels={currentLeg.hotels}
            research={currentLeg.research}
            places={currentLeg.places}
            weather={currentLeg.weather}
            agentStatuses={currentLeg.agentStatuses}
            agentTimes={currentLeg.agentTimes}
            agentSources={currentLeg.agentSources}
            selectedFlightIdx={currentLeg.selectedFlightIdx}
            selectedHotelIdx={currentLeg.selectedHotelIdx}
            includedPlaces={currentLeg.includedPlaces}
            onSelectFlight={(idx) => setLegStates(prev => prev.map((ls, j) => j === activeLegTab ? { ...ls, selectedFlightIdx: idx } : ls))}
            onSelectHotel={(idx) => setLegStates(prev => prev.map((ls, j) => j === activeLegTab ? { ...ls, selectedHotelIdx: idx } : ls))}
            onTogglePlace={(name) => setLegStates(prev => prev.map((ls, j) => {
              if (j !== activeLegTab) return ls;
              const n = new Set(ls.includedPlaces); n.has(name) ? n.delete(name) : n.add(name); return { ...ls, includedPlaces: n };
            }))}
            legNights={isMultiLeg ? (editedLegs[activeLegTab]?.nights || analysis?.dates.duration || 1) : (analysis?.dates.duration || 1)}
            travelers={analysis?.travelers}
            isReturnFlight={isMultiLeg && activeLegTab === legStates.length - 1}
          />

          {/* Bottom actions */}
          <div className="flex items-center gap-4 mt-8 pt-6 border-t" style={{ borderColor: 'var(--color-border)' }}>
            <button onClick={() => setStep(2)} className="inline-flex items-center gap-2 rounded-lg border px-5 py-2.5 text-sm font-medium cursor-pointer transition-all" style={{ background: 'var(--color-card)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}><ArrowLeft size={15} /> Back</button>
            <button onClick={startCompose} disabled={!allAgentsDone || !allLegsSelected} className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold text-white transition-all active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:pointer-events-none" style={{ background: 'var(--color-purple)', color: '#fff' }}><PenTool size={15} /> Compose Response</button>
            {!allAgentsDone && <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Waiting for all agents to complete...</span>}
            {allAgentsDone && !allLegsSelected && (
              <span className="text-xs" style={{ color: 'var(--color-amber)' }}>
                {isMultiLeg ? 'Select flights and hotels for all legs before composing' : 'Select a flight and hotel before composing'}
              </span>
            )}
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

                {/* Per-leg selections */}
                {legStates.map((leg, i) => {
                  const isReturn = isMultiLeg && i === legStates.length - 1;
                  const label = isReturn ? 'Return Flight' : (editedLegs[i]?.destination || analysis?.destination || '');
                  const selectedFlight = leg.flights[leg.selectedFlightIdx];
                  const selectedHotel = !isReturn ? leg.hotels[leg.selectedHotelIdx] : null;

                  return (
                    <div key={i}>
                      {isMultiLeg && (
                        <h4 className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: isReturn ? 'var(--color-primary)' : 'var(--color-purple)' }}>
                          {isReturn ? 'Return' : `${label}`}
                          {!isReturn && editedLegs[i] && <span className="opacity-60"> · {editedLegs[i].nights}n</span>}
                        </h4>
                      )}
                      {selectedFlight && (() => {
                        const pax = analysis!.travelers.adults + analysis!.travelers.children;
                        return (
                          <div className="glass-card p-3 mb-2"><div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--color-primary)' }}><Plane size={12} /> Flight</div><p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{selectedFlight.airline}</p><p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{fmtClock(selectedFlight.departureTime)} → {fmtClock(selectedFlight.arrivalTime)}</p><p className="text-xs font-medium mt-0.5" style={{ color: 'var(--color-primary)' }}>{selectedFlight.price}€/person × {pax} = {selectedFlight.price * pax}€</p></div>
                        );
                      })()}
                      {selectedHotel && (() => {
                        const legNights = !isReturn ? (editedLegs[i]?.nights || analysis!.dates.duration) : 0;
                        return (
                          <div className="glass-card p-3 mb-2"><div className="flex items-center gap-2 text-xs mb-1" style={{ color: 'var(--color-amber)' }}><Building2 size={12} /> Hotel</div><p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{selectedHotel.name}</p><p className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>{selectedHotel.area} · ★{selectedHotel.rating}</p><p className="text-xs font-medium mt-0.5" style={{ color: 'var(--color-amber)' }}>{selectedHotel.pricePerNight}€/night × {legNights} night{legNights !== 1 ? 's' : ''} = {selectedHotel.pricePerNight * legNights}€</p></div>
                        );
                      })()}
                    </div>
                  );
                })}

                {/* Cost breakdown */}
                {analysis && allLegsSelected && (() => {
                  let totalFlights = 0, totalHotels = 0, totalMeals = 0;
                  const pax = analysis.travelers.adults + analysis.travelers.children;
                  for (let i = 0; i < legStates.length; i++) {
                    const leg = legStates[i];
                    const isReturn = isMultiLeg && i === legStates.length - 1;
                    const f = leg.flights[leg.selectedFlightIdx];
                    const h = !isReturn ? leg.hotels[leg.selectedHotelIdx] : null;
                    const nights = !isReturn ? (editedLegs[i]?.nights || analysis.dates.duration) : 0;
                    if (f) totalFlights += f.price * pax;
                    if (h) totalHotels += h.pricePerNight * nights;
                    if (!isReturn) totalMeals += nights * 50 * pax;
                  }
                  return (
                    <div className="glass-card p-3">
                      <div className="flex items-center gap-2 text-xs mb-2" style={{ color: 'var(--color-pink)' }}><BarChart3 size={12} /> Cost Estimate</div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between" style={{ color: 'var(--color-text-secondary)' }}><span>All flights ({pax}p)</span><span className="tabular-nums">{totalFlights}€</span></div>
                        <div className="flex justify-between" style={{ color: 'var(--color-text-secondary)' }}><span>All hotels</span><span className="tabular-nums">{totalHotels}€</span></div>
                        <div className="flex justify-between" style={{ color: 'var(--color-text-secondary)' }}><span>Est. meals/activities</span><span className="tabular-nums">~{totalMeals}€</span></div>
                        <div className="flex justify-between font-semibold pt-1 border-t" style={{ color: 'var(--color-text)', borderColor: 'var(--color-border)' }}><span>Total</span><span className="tabular-nums">{totalFlights + totalHotels + totalMeals}€</span></div>
                      </div>
                    </div>
                  );
                })()}

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
