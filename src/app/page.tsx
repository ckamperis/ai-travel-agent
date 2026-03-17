'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  Plane,
  Building2,
  Search,
  MapPin,
  Loader2,
  CheckCircle,
  AlertCircle,
  Copy,
  Check,
  Clock,
  Zap,
  ArrowRight,
  RotateCcw,
  Radio,
  Star,
  TrainFront,
  Send,
  PenTool,
  Mail,
} from 'lucide-react';
import type {
  EmailAnalysis,
  FlightResult,
  HotelResult,
  PlaceResult,
} from '@/agents/types';

/* ================================================================
   Constants
   ================================================================ */

const DEMO_EMAIL = `Guten Tag,

We are Klaus and Anna Mueller from Hamburg, Germany. We are planning a trip to Greece for next week (7 days) and we are looking for:

- Flights from Hamburg to Athens (arriving Monday morning if possible)
- A nice hotel in central Athens, close to metro, mid-range budget (~120-150\u20AC/night)
- A complete travel plan: what to see, where to eat, day trips from Athens
- We love history, local food, and walking around neighborhoods
- We would also like to visit one island for 2 days if possible

Could you please help us organize everything?

Best regards,
Klaus & Anna Mueller`;

type Phase = 'input' | 'processing' | 'review' | 'composing' | 'done';
type Status = 'idle' | 'active' | 'done' | 'error';

/* ================================================================
   Helpers
   ================================================================ */

function fmtTime(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

function fmtDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return d;
  }
}

function fmtClock(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return iso;
  }
}

function parseResearchDays(text: string): { day: string; desc: string }[] {
  const lines = text.split('\n').filter((l) => l.trim());
  const days: { day: string; desc: string }[] = [];
  let cur = '';
  let desc = '';
  for (const line of lines) {
    const m = line.match(/\*?\*?(?:Day|Ημέρα|Tag)\s*(\d+)/i);
    if (m) {
      if (cur) days.push({ day: cur, desc: desc.trim() });
      cur = `Day ${m[1]}`;
      desc = line.replace(/^[\s*]*(?:Day|Ημέρα|Tag)\s*\d+[^a-zA-Z]*/i, '');
    } else if (cur) {
      desc += ' ' + line;
    }
  }
  if (cur) days.push({ day: cur, desc: desc.trim() });
  return days;
}

/* ================================================================
   LiveBadge
   ================================================================ */

function LiveBadge({ source }: { source?: 'live' | 'mock' }) {
  if (source !== 'live') return null;
  return (
    <span className="inline-flex items-center gap-1 rounded bg-green/15 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-green">
      <Radio size={8} className="animate-pulse" />
      Live
    </span>
  );
}

/* ================================================================
   AgentColumn — one of the 4 parallel-agent columns
   ================================================================ */

function AgentColumn({
  name,
  icon,
  color,
  status,
  message,
  time,
  source,
  children,
}: {
  name: string;
  icon: React.ReactNode;
  color: string;
  status: Status;
  message?: string;
  time?: number;
  source?: 'live' | 'mock';
  children?: React.ReactNode;
}) {
  return (
    <div
      className="glass-card flex flex-col p-4 transition-all duration-500"
      style={{
        borderColor:
          status === 'active'
            ? `${color}40`
            : status === 'done'
              ? `${color}20`
              : undefined,
      }}
    >
      {/* Header */}
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            style={{
              color: status === 'idle' ? `${color}60` : color,
            }}
          >
            {icon}
          </span>
          <span
            className="text-xs font-semibold uppercase tracking-wider"
            style={{
              color: status === 'idle' ? `${color}80` : color,
            }}
          >
            {name}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {status === 'done' && <LiveBadge source={source} />}
          {status === 'active' && (
            <Loader2 size={14} className="animate-spin" style={{ color }} />
          )}
          {status === 'done' && (
            <CheckCircle
              size={14}
              className="animate-scale-in"
              style={{ color }}
            />
          )}
          {status === 'error' && <AlertCircle size={14} className="text-red-400" />}
        </div>
      </div>

      {/* API info */}
      {message && status !== 'idle' && (
        <p className="mb-2 truncate text-[11px] text-foreground/30">{message}</p>
      )}

      {/* Time */}
      {time != null && status === 'done' && (
        <div className="mb-3 flex items-center gap-1 text-[10px] text-foreground/25">
          <Clock size={10} />
          {fmtTime(time)}
        </div>
      )}

      {/* Results or skeleton */}
      <div className="mt-auto">
        {status === 'done' && children}
        {status === 'active' && (
          <div className="space-y-2">
            <div className="h-3 w-3/4 rounded bg-foreground/[0.04] animate-pulse" />
            <div className="h-3 w-1/2 rounded bg-foreground/[0.04] animate-pulse" />
            <div className="h-3 w-2/3 rounded bg-foreground/[0.04] animate-pulse" />
          </div>
        )}
      </div>
    </div>
  );
}

/* ================================================================
   Main Component
   ================================================================ */

export default function Home() {
  /* ---- State ---- */
  const [phase, setPhase] = useState<Phase>('input');
  const [emailText, setEmailText] = useState(DEMO_EMAIL);

  // Analysis
  const [analysis, setAnalysis] = useState<EmailAnalysis | null>(null);
  const [analysisStatus, setAnalysisStatus] = useState<Status>('idle');
  const [analysisTime, setAnalysisTime] = useState(0);
  const [analysisSource, setAnalysisSource] = useState<'live' | 'mock'>('mock');

  // Parallel agents
  const [agentStatuses, setAgentStatuses] = useState<Record<string, Status>>({
    flight: 'idle',
    hotel: 'idle',
    research: 'idle',
    places: 'idle',
  });
  const [agentMessages, setAgentMessages] = useState<Record<string, string>>({});
  const [agentTimes, setAgentTimes] = useState<Record<string, number>>({});
  const [agentSources, setAgentSources] = useState<Record<string, 'live' | 'mock'>>({});

  // Results
  const [flights, setFlights] = useState<FlightResult[]>([]);
  const [hotels, setHotels] = useState<HotelResult[]>([]);
  const [research, setResearch] = useState('');
  const [places, setPlaces] = useState<PlaceResult[]>([]);

  // Selection
  const [selectedFlightIdx, setSelectedFlightIdx] = useState(0);
  const [selectedHotelIdx, setSelectedHotelIdx] = useState(0);

  // Compose
  const [composedEmail, setComposedEmail] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Meta
  const [totalTime, setTotalTime] = useState(0);
  const [copied, setCopied] = useState(false);

  // Refs
  const startTimeRef = useRef(0);
  const agentStartRef = useRef<Record<string, number>>({});
  const pipelineRef = useRef<HTMLDivElement>(null);
  const reviewRef = useRef<HTMLDivElement>(null);
  const composeRef = useRef<HTMLDivElement>(null);
  const completedRef = useRef(0);

  /* ---- Auto-scroll on phase change ---- */
  useEffect(() => {
    const scroll = (ref: React.RefObject<HTMLDivElement | null>) =>
      setTimeout(
        () => ref.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }),
        120
      );
    if (phase === 'review') scroll(reviewRef);
    if (phase === 'composing' || phase === 'done') scroll(composeRef);
  }, [phase]);

  /* ---- Process email (orchestrate SSE) ---- */
  const processEmail = useCallback(async () => {
    setPhase('processing');
    startTimeRef.current = Date.now();
    completedRef.current = 0;
    setAnalysis(null);
    setAnalysisStatus('active');
    setAnalysisTime(0);
    setAnalysisSource('mock');
    setAgentStatuses({ flight: 'idle', hotel: 'idle', research: 'idle', places: 'idle' });
    setAgentMessages({});
    setAgentTimes({});
    setAgentSources({});
    setFlights([]);
    setHotels([]);
    setResearch('');
    setPlaces([]);
    setSelectedFlightIdx(0);
    setSelectedHotelIdx(0);
    setComposedEmail('');
    setCopied(false);

    try {
      const res = await fetch('/api/orchestrate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailText }),
      });
      if (!res.ok || !res.body) throw new Error('SSE connection failed');

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let done = false;

      while (!done) {
        const { done: streamDone, value } = await reader.read();
        if (streamDone) { done = true; break; }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') { done = true; break; }

          try {
            const ev = JSON.parse(payload);
            const { agent, status, message, data, source } = ev;

            if (agent === 'email') {
              if (status === 'started') {
                agentStartRef.current.email = Date.now();
                setAnalysisStatus('active');
              } else if (status === 'done') {
                setAnalysisStatus('done');
                setAnalysis(data as EmailAnalysis);
                setAnalysisTime(Date.now() - (agentStartRef.current.email || Date.now()));
                if (source) setAnalysisSource(source);
              } else if (status === 'error') {
                setAnalysisStatus('error');
              }
            } else if (['flight', 'hotel', 'research', 'places'].includes(agent)) {
              if (status === 'started') {
                agentStartRef.current[agent] = Date.now();
                setAgentStatuses((p) => ({ ...p, [agent]: 'active' }));
                setAgentMessages((p) => ({ ...p, [agent]: message }));
              } else if (status === 'done') {
                const elapsed = Date.now() - (agentStartRef.current[agent] || Date.now());
                setAgentStatuses((p) => ({ ...p, [agent]: 'done' }));
                setAgentMessages((p) => ({ ...p, [agent]: message }));
                setAgentTimes((p) => ({ ...p, [agent]: elapsed }));
                if (source) setAgentSources((p) => ({ ...p, [agent]: source }));

                if (agent === 'flight') setFlights((data as FlightResult[]) || []);
                if (agent === 'hotel') setHotels((data as HotelResult[]) || []);
                if (agent === 'research') setResearch((data as string) || '');
                if (agent === 'places') setPlaces((data as PlaceResult[]) || []);

                completedRef.current++;
                if (completedRef.current === 4) {
                  setTimeout(() => setPhase('review'), 400);
                }
              } else if (status === 'error') {
                setAgentStatuses((p) => ({ ...p, [agent]: 'error' }));
                setAgentMessages((p) => ({ ...p, [agent]: message }));
                completedRef.current++;
                if (completedRef.current === 4) {
                  setTimeout(() => setPhase('review'), 400);
                }
              }
            }
          } catch {
            /* skip unparseable */
          }
        }
      }

      // Safety: transition to review if stream ended early
      if (completedRef.current > 0 && completedRef.current < 4) {
        setPhase('review');
      }
    } catch (err) {
      console.error('Orchestrate failed:', err);
      setAnalysisStatus('error');
    }
  }, [emailText]);

  /* ---- Compose response (separate SSE) ---- */
  const startCompose = useCallback(async () => {
    setPhase('composing');
    setIsStreaming(true);
    setComposedEmail('');
    setCopied(false);

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
          flights,
          hotels,
          research,
          places,
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
            if (chunk) {
              text += chunk;
              setComposedEmail(text);
            }
          } catch {
            /* skip */
          }
        }
      }
    } catch (err) {
      console.error('Compose failed:', err);
      if (!text) {
        text =
          'We apologize, but we encountered an issue composing your travel plan. Our team will follow up shortly.\n\nBest regards,\nAfea Travel';
        setComposedEmail(text);
      }
    } finally {
      setIsStreaming(false);
      setTotalTime(Math.round((Date.now() - startTimeRef.current) / 1000));
      setPhase('done');
    }
  }, [emailText, analysis, flights, hotels, research, places, selectedFlightIdx, selectedHotelIdx]);

  /* ---- Reset ---- */
  const reset = useCallback(() => {
    setPhase('input');
    setEmailText(DEMO_EMAIL);
    setAnalysis(null);
    setAnalysisStatus('idle');
    setAnalysisTime(0);
    setAnalysisSource('mock');
    setAgentStatuses({ flight: 'idle', hotel: 'idle', research: 'idle', places: 'idle' });
    setAgentMessages({});
    setAgentTimes({});
    setAgentSources({});
    setFlights([]);
    setHotels([]);
    setResearch('');
    setPlaces([]);
    setSelectedFlightIdx(0);
    setSelectedHotelIdx(0);
    setComposedEmail('');
    setIsStreaming(false);
    setTotalTime(0);
    setCopied(false);
    completedRef.current = 0;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  /* ---- Copy ---- */
  const copyEmail = useCallback(async () => {
    await navigator.clipboard.writeText(composedEmail);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [composedEmail]);

  /* ---- Derived ---- */
  const showAgentGrid = analysisStatus === 'done';
  const agentsDone = phase === 'review' || phase === 'composing' || phase === 'done';

  /* ================================================================
     Render
     ================================================================ */

  return (
    <div className="min-h-screen">
      {/* Background grid */}
      <div
        className="pointer-events-none fixed inset-0 z-0 opacity-[0.02]"
        style={{
          backgroundImage:
            'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.3) 1px, transparent 0)',
          backgroundSize: '48px 48px',
        }}
      />

      {/* ===== SECTION 1 — HEADER + INPUT ===== */}
      <section
        className={`relative z-10 mx-auto max-w-4xl px-6 transition-all duration-700 ${
          phase === 'input'
            ? 'flex min-h-screen flex-col items-center justify-center'
            : 'pt-10 pb-6'
        }`}
      >
        {/* Title */}
        <div className={`text-center ${phase === 'input' ? 'mb-8' : 'mb-5'}`}>
          <div className="mb-3 flex items-center justify-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-teal/20 to-cyan/20 border border-teal/20">
              <Zap size={22} className="text-teal" />
            </div>
          </div>
          <h1
            className={`font-bold tracking-tight text-foreground transition-all duration-500 ${
              phase === 'input' ? 'text-5xl' : 'text-2xl'
            }`}
          >
            AI Travel Assistant
          </h1>
          {phase === 'input' && (
            <p className="mt-2 text-lg text-foreground/40">
              Paste any customer email. Watch AI handle it in seconds.
            </p>
          )}
        </div>

        {/* Textarea */}
        <div className="w-full max-w-3xl mx-auto">
          <textarea
            value={emailText}
            onChange={(e) => setEmailText(e.target.value)}
            readOnly={phase !== 'input'}
            className={`w-full rounded-xl border bg-navy-deep/50 px-6 py-5 text-base leading-relaxed text-foreground/80 outline-none transition-all duration-500 resize-none font-sans ${
              phase !== 'input'
                ? 'border-card-border/20 opacity-40 cursor-not-allowed max-h-28 overflow-hidden text-sm'
                : 'border-card-border hover:border-teal/30 focus:border-teal/50 focus:ring-1 focus:ring-teal/20 min-h-[280px]'
            }`}
            placeholder="Paste a customer email here..."
          />

          {phase === 'input' && (
            <div className="mt-6 flex flex-col items-center gap-4 animate-fade-in-up stagger-2">
              <button
                onClick={processEmail}
                disabled={!emailText.trim()}
                className="inline-flex items-center justify-center gap-2.5 rounded-lg bg-gradient-to-r from-teal to-cyan px-8 py-3.5 text-base font-semibold tracking-wide text-navy-deep transition-all duration-200 hover:brightness-110 active:scale-[0.97] cursor-pointer disabled:opacity-40 disabled:pointer-events-none"
              >
                <Send size={18} />
                Process Email
              </button>
              <p className="text-sm text-foreground/25">
                Try it with your own email — change the destination, dates, or
                language
              </p>
            </div>
          )}
        </div>
      </section>

      {/* ===== SECTION 2 — AGENT PIPELINE ===== */}
      {phase !== 'input' && (
        <section
          ref={pipelineRef}
          className="relative z-10 mx-auto max-w-5xl px-6 pb-10 animate-fade-in-up"
        >
          <h2 className="mb-8 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/20">
            Agent Pipeline
          </h2>

          {/* -- Email Analysis -- */}
          <div className="mx-auto mb-8 max-w-3xl">
            <div className="glass-card p-5">
              <div className="flex items-center gap-4">
                <div
                  className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full transition-colors duration-300 ${
                    analysisStatus === 'done'
                      ? 'bg-teal/15'
                      : analysisStatus === 'active'
                        ? 'bg-teal/10'
                        : 'bg-foreground/5'
                  }`}
                >
                  {analysisStatus === 'active' && (
                    <Loader2 size={20} className="animate-spin text-teal" />
                  )}
                  {analysisStatus === 'done' && (
                    <CheckCircle size={20} className="text-teal" />
                  )}
                  {analysisStatus === 'error' && (
                    <AlertCircle size={20} className="text-red-400" />
                  )}
                  {analysisStatus === 'idle' && (
                    <Mail size={20} className="text-foreground/30" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3">
                    <h3 className="text-sm font-semibold text-foreground/80">
                      Email Analysis
                    </h3>
                    {analysisStatus === 'active' && (
                      <span className="text-xs text-foreground/35">
                        Reading and understanding the request...
                      </span>
                    )}
                    {analysisStatus === 'done' && (
                      <>
                        <LiveBadge source={analysisSource} />
                        <span className="flex items-center gap-1 text-[11px] text-foreground/30">
                          <Clock size={10} />
                          {fmtTime(analysisTime)}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Extracted data */}
              {analysis && (
                <div className="mt-4 space-y-2.5 pl-14 text-sm animate-fade-in">
                  <div className="flex items-center gap-2 text-foreground/60">
                    <span className="text-foreground/30">Route:</span>
                    <span className="font-medium text-foreground/80">
                      {analysis.origin}
                    </span>
                    <span className="text-[11px] text-foreground/25">
                      ({analysis.originIATA})
                    </span>
                    <ArrowRight size={14} className="text-teal/50" />
                    <span className="font-medium text-foreground/80">
                      {analysis.destination}
                    </span>
                    <span className="text-[11px] text-foreground/25">
                      ({analysis.destinationIATA})
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 text-foreground/50">
                    <span>
                      <span className="text-foreground/30">Dates:</span>{' '}
                      {fmtDate(analysis.dates.start)} &ndash;{' '}
                      {fmtDate(analysis.dates.end)}
                      <span className="ml-1 text-foreground/25">
                        ({analysis.dates.duration} days)
                      </span>
                    </span>
                    <span>
                      <span className="text-foreground/30">Travelers:</span>{' '}
                      {analysis.travelers.adults} adult
                      {analysis.travelers.adults !== 1 && 's'}
                      {analysis.travelers.children > 0 &&
                        `, ${analysis.travelers.children} child${analysis.travelers.children !== 1 ? 'ren' : ''}`}
                    </span>
                    <span>
                      <span className="text-foreground/30">Budget:</span>{' '}
                      {analysis.budget.min > 0
                        ? `\u20AC${analysis.budget.min}\u2013${analysis.budget.max}/night`
                        : 'Flexible'}
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {analysis.interests.map((interest, i) => (
                      <span
                        key={i}
                        className="rounded-full bg-teal/10 px-2.5 py-0.5 text-xs text-teal/80"
                      >
                        {interest}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* -- 4-Column Agent Grid -- */}
          {showAgentGrid && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 animate-fade-in-up">
              {/* Flight */}
              <AgentColumn
                name="Flights"
                icon={<Plane size={18} />}
                color="#22D3EE"
                status={agentStatuses.flight as Status}
                message={agentMessages.flight}
                time={agentTimes.flight}
                source={agentSources.flight}
              >
                {flights.length > 0 && (
                  <div className="space-y-1.5 text-xs">
                    {flights.slice(0, 4).map((f, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-foreground/50"
                      >
                        <span className="truncate max-w-[110px]">
                          {f.airline}
                        </span>
                        <span className="font-medium tabular-nums text-foreground/70">
                          {f.price}\u20AC
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </AgentColumn>

              {/* Hotel */}
              <AgentColumn
                name="Hotels"
                icon={<Building2 size={18} />}
                color="#F59E0B"
                status={agentStatuses.hotel as Status}
                message={agentMessages.hotel}
                time={agentTimes.hotel}
                source={agentSources.hotel}
              >
                {hotels.length > 0 && (
                  <div className="space-y-1.5 text-xs">
                    {hotels.slice(0, 4).map((h, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-foreground/50"
                      >
                        <span className="truncate max-w-[110px]">{h.name}</span>
                        <span className="font-medium tabular-nums text-foreground/70">
                          {h.pricePerNight}\u20AC
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </AgentColumn>

              {/* Research */}
              <AgentColumn
                name="Research"
                icon={<Search size={18} />}
                color="#10B981"
                status={agentStatuses.research as Status}
                message={agentMessages.research}
                time={agentTimes.research}
                source={agentSources.research}
              >
                {research && (
                  <div className="space-y-1 text-[11px] text-foreground/45">
                    {parseResearchDays(research)
                      .slice(0, 4)
                      .map((d, i) => (
                        <div key={i} className="truncate">
                          <span className="font-medium text-foreground/55">
                            {d.day}:
                          </span>{' '}
                          {d.desc}
                        </div>
                      ))}
                    {parseResearchDays(research).length > 4 && (
                      <div className="text-foreground/25">
                        +{parseResearchDays(research).length - 4} more days
                      </div>
                    )}
                  </div>
                )}
              </AgentColumn>

              {/* Places */}
              <AgentColumn
                name="Places"
                icon={<MapPin size={18} />}
                color="#A78BFA"
                status={agentStatuses.places as Status}
                message={agentMessages.places}
                time={agentTimes.places}
                source={agentSources.places}
              >
                {places.length > 0 && (
                  <div className="space-y-1.5 text-xs">
                    {places.slice(0, 5).map((p, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between text-foreground/50"
                      >
                        <span className="truncate max-w-[110px]">{p.name}</span>
                        {p.rating != null && (
                          <span className="flex items-center gap-0.5 text-foreground/35">
                            <Star size={9} className="fill-current" />
                            {p.rating}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </AgentColumn>
            </div>
          )}
        </section>
      )}

      {/* ===== SECTION 3 — REVIEW & SELECT ===== */}
      {agentsDone && (
        <section
          ref={reviewRef}
          className="relative z-10 mx-auto max-w-5xl px-6 pb-10 animate-fade-in-up"
        >
          <h2 className="mb-8 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/20">
            Review &amp; Select
          </h2>

          {/* Flight selection */}
          {flights.length > 0 && (
            <div className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <Plane size={16} className="text-cyan" />
                <h3 className="text-sm font-semibold text-foreground/60">
                  Select Flight
                  {analysis && (
                    <span className="ml-2 text-xs font-normal text-foreground/25">
                      {analysis.originIATA} &rarr; {analysis.destinationIATA}
                    </span>
                  )}
                </h3>
                <LiveBadge source={agentSources.flight} />
              </div>
              <div className="glass-card overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-card-border text-left text-[11px] uppercase tracking-wider text-foreground/30">
                      <th className="w-8 px-4 py-2.5" />
                      <th className="px-4 py-2.5 font-medium">Airline</th>
                      <th className="px-4 py-2.5 font-medium">Departure</th>
                      <th className="px-4 py-2.5 font-medium">Arrival</th>
                      <th className="px-4 py-2.5 font-medium">Stops</th>
                      <th className="px-4 py-2.5 font-medium">Duration</th>
                      <th className="px-4 py-2.5 font-medium text-right">
                        Price
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {flights.map((f, i) => (
                      <tr
                        key={i}
                        onClick={() =>
                          phase === 'review' && setSelectedFlightIdx(i)
                        }
                        className={`border-b border-card-border/20 last:border-0 transition-all duration-150 ${
                          phase === 'review'
                            ? 'cursor-pointer hover:bg-white/[0.02]'
                            : ''
                        } ${
                          i === selectedFlightIdx
                            ? 'bg-cyan/[0.06]'
                            : ''
                        }`}
                      >
                        <td className="px-4 py-3">
                          <div
                            className={`flex h-5 w-5 items-center justify-center rounded-full border transition-colors ${
                              i === selectedFlightIdx
                                ? 'border-cyan bg-cyan/20'
                                : 'border-foreground/15'
                            }`}
                          >
                            {i === selectedFlightIdx && (
                              <Check size={12} className="text-cyan" />
                            )}
                          </div>
                        </td>
                        <td className="px-4 py-3 font-medium text-foreground/80">
                          {f.airline}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-foreground/60">
                          {fmtClock(f.departureTime)}
                        </td>
                        <td className="px-4 py-3 tabular-nums text-foreground/60">
                          {fmtClock(f.arrivalTime)}
                        </td>
                        <td className="px-4 py-3 text-foreground/50">
                          {f.stops === 0 ? (
                            <span className="text-green/80">Direct</span>
                          ) : (
                            `${f.stops} stop${f.stops > 1 ? 's' : ''}`
                          )}
                        </td>
                        <td className="px-4 py-3 text-foreground/40">
                          {f.duration}
                        </td>
                        <td
                          className={`px-4 py-3 text-right font-semibold tabular-nums ${
                            i === selectedFlightIdx
                              ? 'text-cyan'
                              : 'text-foreground/60'
                          }`}
                        >
                          {f.price}\u20AC
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Hotel selection */}
          {hotels.length > 0 && (
            <div className="mb-8">
              <div className="mb-3 flex items-center gap-2">
                <Building2 size={16} className="text-amber" />
                <h3 className="text-sm font-semibold text-foreground/60">
                  Select Hotel
                </h3>
                <LiveBadge source={agentSources.hotel} />
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {hotels.map((h, i) => (
                  <div
                    key={i}
                    onClick={() =>
                      phase === 'review' && setSelectedHotelIdx(i)
                    }
                    className={`glass-card p-4 transition-all duration-200 ${
                      phase === 'review'
                        ? 'cursor-pointer hover:border-amber/30'
                        : ''
                    } ${
                      i === selectedHotelIdx
                        ? 'border-amber/40 bg-amber/[0.04]'
                        : ''
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          {i === selectedHotelIdx && (
                            <CheckCircle size={14} className="text-amber" />
                          )}
                          <h4 className="text-sm font-medium text-foreground/90">
                            {h.name}
                          </h4>
                        </div>
                        <p className="mt-0.5 text-xs text-foreground/40">
                          {h.area}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 rounded bg-amber/10 px-1.5 py-0.5 text-xs font-semibold text-amber">
                        <Star size={10} className="fill-amber" />
                        {h.rating}
                      </div>
                    </div>
                    <div className="mt-3 flex items-center justify-between border-t border-card-border/30 pt-3">
                      <div className="flex items-center gap-1 text-[11px] text-foreground/40">
                        <TrainFront size={11} />
                        {h.metroStation} ({h.metroDistance})
                      </div>
                      <div className="text-sm font-semibold text-amber">
                        {h.pricePerNight}\u20AC
                        <span className="ml-0.5 text-[10px] font-normal text-foreground/30">
                          /night
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Compose button */}
          {phase === 'review' && (
            <div className="flex justify-center pt-2 animate-fade-in-up">
              <button
                onClick={startCompose}
                className="inline-flex items-center justify-center gap-2.5 rounded-lg bg-gradient-to-r from-pink/90 to-purple/90 px-8 py-3.5 text-base font-semibold tracking-wide text-white transition-all duration-200 hover:from-pink hover:to-purple active:scale-[0.97] cursor-pointer"
              >
                <PenTool size={18} />
                Compose Response
              </button>
            </div>
          )}
        </section>
      )}

      {/* ===== SECTION 4 — COMPOSE ===== */}
      {(phase === 'composing' || phase === 'done') && (
        <section
          ref={composeRef}
          className="relative z-10 mx-auto max-w-4xl px-6 pb-24 animate-fade-in-up"
        >
          <h2 className="mb-6 text-center text-[11px] font-semibold uppercase tracking-[0.2em] text-foreground/20">
            {isStreaming ? 'Composing response...' : 'Response Ready'}
          </h2>

          <div
            className="glass-card overflow-hidden transition-colors duration-500"
            style={{
              borderColor: isStreaming
                ? 'rgba(236, 72, 153, 0.2)'
                : 'rgba(16, 185, 129, 0.2)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-card-border px-6 py-3.5">
              <div className="flex items-center gap-3">
                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors duration-300 ${
                    isStreaming
                      ? 'bg-pink/10 text-pink'
                      : 'bg-green/10 text-green'
                  }`}
                >
                  {isStreaming ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <CheckCircle size={16} />
                  )}
                </div>
                <span className="text-sm font-medium text-foreground/60">
                  {isStreaming ? 'Writing...' : 'Complete'}
                </span>
              </div>

              {!isStreaming && composedEmail && (
                <button
                  onClick={copyEmail}
                  className="flex items-center gap-2 rounded-lg bg-card border border-card-border px-4 py-2 text-xs font-medium text-foreground/60 transition-all hover:border-foreground/20 hover:text-foreground cursor-pointer"
                >
                  {copied ? (
                    <Check size={14} className="text-green" />
                  ) : (
                    <Copy size={14} />
                  )}
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              )}
            </div>

            {/* Body */}
            <div className="min-h-[200px] px-6 py-5">
              <div className="whitespace-pre-wrap font-sans text-base leading-relaxed text-foreground/80">
                {composedEmail}
                {isStreaming && (
                  <span className="animate-blink ml-0.5 inline-block h-5 w-[2px] translate-y-[3px] bg-pink/70" />
                )}
              </div>
            </div>
          </div>

          {/* Done footer */}
          {phase === 'done' && (
            <div className="mt-8 flex flex-col items-center gap-6 animate-fade-in">
              {totalTime > 0 && (
                <div className="text-center">
                  <p className="flex items-center justify-center gap-2 text-lg">
                    <Clock size={18} className="text-teal" />
                    <span className="text-foreground/50">Processed in</span>
                    <span className="font-bold text-teal tabular-nums">
                      {totalTime}s
                    </span>
                  </p>
                  <p className="mt-1 text-sm text-foreground/25">
                    Manually, this takes 30&ndash;45 minutes
                  </p>
                </div>
              )}

              <button
                onClick={reset}
                className="inline-flex items-center justify-center gap-2.5 rounded-lg bg-card border border-card-border px-6 py-2.5 text-sm font-semibold text-foreground/70 transition-all hover:border-foreground/20 hover:text-foreground active:scale-[0.97] cursor-pointer"
              >
                <RotateCcw size={15} />
                New Email
              </button>
            </div>
          )}
        </section>
      )}

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
