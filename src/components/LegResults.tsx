'use client';

import React, { useState, useRef } from 'react';
import {
  Plane, Building2, Search, MapPin, Loader2, CheckCircle,
  Star, TrainFront, ChevronDown, ChevronUp, ExternalLink,
  BarChart3, CloudSun, Check, Radio, Clock, Briefcase,
} from 'lucide-react';
import type { FlightResult, HotelResult, PlaceResult } from '@/agents/types';
import type { WeatherDay } from '@/lib/weather';
import MapView from '@/components/MapView';

/* ---------------------------------------------------------------- */

type AgentStatus = 'idle' | 'active' | 'done' | 'error';

function fmtTime(ms: number) { return `${(ms / 1000).toFixed(1)}s`; }
function fmtClock(iso: string) { try { return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false }); } catch { return iso; } }
function fmtDate(iso: string) { try { return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); } catch { return iso; } }

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

const WEATHER_ICONS: Record<string, string> = { 'sunny': '☀️', 'partly-cloudy': '⛅', 'cloudy': '☁️', 'rainy': '🌧️', 'stormy': '⛈️' };

function LiveBadge({ source }: { source?: 'live' | 'ai' | 'mock' }) {
  if (source === 'live') return <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ background: 'var(--color-green-light)', color: 'var(--color-green)' }}><Radio size={8} className="animate-pulse" />Live</span>;
  if (source === 'ai') return <span className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider" style={{ background: 'var(--color-purple)' + '20', color: 'var(--color-purple)' }}>AI</span>;
  return null;
}

/* ---------------------------------------------------------------- */

interface LegResultsProps {
  flights: FlightResult[];
  hotels: HotelResult[];
  research: string;
  places: PlaceResult[];
  weather: WeatherDay[];
  agentStatuses: Record<string, AgentStatus>;
  agentTimes: Record<string, number>;
  agentSources: Record<string, 'live' | 'ai' | 'mock'>;
  selectedFlightIdx: number;
  selectedHotelIdx: number;
  includedPlaces: Set<string>;
  onSelectFlight: (idx: number) => void;
  onSelectHotel: (idx: number) => void;
  onTogglePlace: (name: string) => void;
  legNights?: number;
  travelers?: { adults: number; children: number };
  isReturnFlight?: boolean;
}

export default function LegResults({
  flights, hotels, research, places, weather,
  agentStatuses, agentTimes, agentSources,
  selectedFlightIdx, selectedHotelIdx, includedPlaces,
  onSelectFlight, onSelectHotel, onTogglePlace,
  legNights, travelers, isReturnFlight,
}: LegResultsProps) {
  const [activeTab, setActiveTab] = useState<'flights' | 'hotels' | 'itinerary' | 'places' | 'compare'>('flights');
  const [flightSort, setFlightSort] = useState<'price' | 'duration' | 'stops'>('price');
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set());
  const [hoveredHotelIdx, setHoveredHotelIdx] = useState(-1);
  const [focusedPlaceIdx, setFocusedPlaceIdx] = useState(-1);
  const [expandedFlightIdx, setExpandedFlightIdx] = useState(-1);
  const placeRefs = useRef<(HTMLDivElement | null)[]>([]);

  const pax = travelers ? travelers.adults + travelers.children : 1;
  const nights = legNights || 1;

  const sortedFlights = [...flights].sort((a, b) => {
    if (flightSort === 'price') return a.price - b.price;
    if (flightSort === 'stops') return a.stops - b.stops;
    return a.duration.localeCompare(b.duration);
  });

  const combos = flights.flatMap((f, fi) =>
    hotels.map((h, hi) => ({
      fi, hi, airline: f.airline, hotel: h.name,
      flightTotal: f.price * pax,
      hotelTotal: h.pricePerNight * nights,
      total: f.price * pax + h.pricePerNight * nights,
      hotelRating: h.rating,
    }))
  ).sort((a, b) => a.total - b.total);

  const hotelLocs = hotels
    .map((h, i) => (h.lat != null && h.lng != null ? { lat: h.lat, lng: h.lng, label: h.name, idx: i } : null))
    .filter((x): x is NonNullable<typeof x> => x !== null);

  return (
    <>
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
          ...(!isReturnFlight ? [
            { key: 'hotels' as const, label: 'Hotels', icon: Building2, color: '#F59E0B', count: hotels.length },
            { key: 'itinerary' as const, label: 'Itinerary', icon: Search, color: '#10B981', count: null as number | null },
            { key: 'places' as const, label: 'Places', icon: MapPin, color: '#A78BFA', count: places.length },
            { key: 'compare' as const, label: 'Compare', icon: BarChart3, color: '#EC4899', count: combos.length > 0 ? combos.length : null },
          ] : []),
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
        {agentStatuses.flight === 'active' && <div className="space-y-3">
          <div className="flex items-center gap-3 mb-4" style={{ color: 'var(--color-text-muted)' }}><Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-primary)' }} /> <span className="text-sm">Searching flights...</span></div>
          {[1,2,3].map(i => <div key={i} className="glass-card p-4 animate-pulse"><div className="flex items-center gap-4"><div className="h-4 w-24 rounded" style={{ background: 'var(--color-border)' }} /><div className="h-4 w-16 rounded" style={{ background: 'var(--color-border)' }} /><div className="flex-1" /><div className="h-4 w-14 rounded" style={{ background: 'var(--color-border)' }} /></div></div>)}
        </div>}
        {flights.length > 0 && (<div>
          <div className="flex gap-2 mb-3"><span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Sort:</span>{(['price', 'duration', 'stops'] as const).map(s => (<button key={s} onClick={() => setFlightSort(s)} className="text-xs cursor-pointer transition-colors" style={{ color: flightSort === s ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: flightSort === s ? 500 : 400 }}>{s.charAt(0).toUpperCase() + s.slice(1)}</button>))}</div>
          <div className="glass-card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b text-left text-[11px] uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}><th className="w-10 px-4 py-2.5" /><th className="px-4 py-2.5 font-medium">Airline</th><th className="px-4 py-2.5 font-medium">Departure</th><th className="px-4 py-2.5 font-medium">Arrival</th><th className="px-4 py-2.5 font-medium">Stops</th><th className="px-4 py-2.5 font-medium">Duration</th><th className="px-4 py-2.5 font-medium text-right">Price</th></tr></thead>
          <tbody>{sortedFlights.map((f, i) => { const origIdx = flights.indexOf(f); const isExpanded = origIdx === expandedFlightIdx && origIdx === selectedFlightIdx; return (<React.Fragment key={`flight-${i}`}>
            <tr key={`row-${i}`} onClick={() => { onSelectFlight(origIdx); setExpandedFlightIdx(origIdx === expandedFlightIdx ? -1 : origIdx); }} className="border-b last:border-0 cursor-pointer transition-all" style={{ borderColor: 'var(--color-border)', background: origIdx === selectedFlightIdx ? 'var(--color-primary-light)' : undefined }}>
              <td className="px-4 py-3"><div className="flex h-5 w-5 items-center justify-center rounded-full border" style={{ borderColor: origIdx === selectedFlightIdx ? 'var(--color-primary)' : 'var(--color-border)', background: origIdx === selectedFlightIdx ? 'var(--color-primary-light)' : undefined }}>{origIdx === selectedFlightIdx && <Check size={12} style={{ color: 'var(--color-primary)' }} />}</div></td>
              <td className="px-4 py-3 font-medium" style={{ color: 'var(--color-text)' }}>{f.airline}</td>
              <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{fmtClock(f.departureTime)}</td>
              <td className="px-4 py-3 tabular-nums" style={{ color: 'var(--color-text-secondary)' }}>{fmtClock(f.arrivalTime)}</td>
              <td className="px-4 py-3">{f.stops === 0 ? <span style={{ color: 'var(--color-green)' }}>Direct</span> : <span style={{ color: 'var(--color-text-secondary)' }}>{f.stops} stop{f.stops > 1 ? 's' : ''}</span>}</td>
              <td className="px-4 py-3" style={{ color: 'var(--color-text-secondary)' }}>{f.duration}</td>
              <td className="px-4 py-3 text-right font-semibold tabular-nums" style={{ color: origIdx === selectedFlightIdx ? 'var(--color-primary)' : 'var(--color-text-secondary)' }}>{f.price}€</td>
            </tr>
            {/* Expanded flight details panel */}
            {isExpanded && (
              <tr key={`detail-${i}`}><td colSpan={7} className="px-0 py-0">
                <div className="overflow-hidden transition-all" style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border)' }}>
                  <div className="px-6 py-4 grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}><Plane size={10} /> Route</div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{f.origin} → {f.destination}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>{fmtDate(f.departureTime)}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}><Clock size={10} /> Times</div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{fmtClock(f.departureTime)} → {fmtClock(f.arrivalTime)}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Duration: {f.duration} · {f.stops === 0 ? 'Direct' : `${f.stops} stop${f.stops > 1 ? 's' : ''}`}</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}><Briefcase size={10} /> Details</div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{f.airline}</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>Economy · Checked bag included</p>
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wider mb-1" style={{ color: 'var(--color-text-muted)' }}><BarChart3 size={10} /> Total Price</div>
                      <p className="text-sm font-medium" style={{ color: 'var(--color-primary)' }}>{f.price}€/person × {pax} = {f.price * pax}€</p>
                      <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-secondary)' }}>All taxes included</p>
                    </div>
                  </div>
                </div>
              </td></tr>
            )}
          </React.Fragment>); })}</tbody></table></div>

          {/* Per-leg pricing summary below flight table */}
          {selectedFlightIdx >= 0 && flights[selectedFlightIdx] && (
            <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              <Plane size={12} style={{ color: 'var(--color-primary)' }} />
              <span>{flights[selectedFlightIdx].airline}: <b style={{ color: 'var(--color-text)' }}>{flights[selectedFlightIdx].price}€/person × {pax} {pax === 1 ? 'traveler' : 'travelers'} = {flights[selectedFlightIdx].price * pax}€</b></span>
            </div>
          )}
        </div>)}
      </div>)}

      {/* HOTELS */}
      {activeTab === 'hotels' && (<div>
        {agentStatuses.hotel === 'active' && <div className="space-y-3">
          <div className="flex items-center gap-3 mb-4" style={{ color: 'var(--color-text-muted)' }}><Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-amber)' }} /> <span className="text-sm">Searching hotels...</span></div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <div key={i} className="glass-card p-4 animate-pulse"><div className="h-4 w-32 rounded mb-2" style={{ background: 'var(--color-border)' }} /><div className="h-3 w-20 rounded mb-3" style={{ background: 'var(--color-border)' }} /><div className="h-3 w-24 rounded" style={{ background: 'var(--color-border)' }} /></div>)}</div>
        </div>}
        {hotels.length > 0 && hotelLocs.length > 0 && (
          <div className="mb-4">
            <MapView
              locations={hotelLocs.map(h => ({ lat: h!.lat, lng: h!.lng, label: h!.label }))}
              selectedIndex={hotelLocs.findIndex(h => h!.idx === selectedHotelIdx)}
              highlightedIndex={hoveredHotelIdx >= 0 ? hotelLocs.findIndex(h => h!.idx === hoveredHotelIdx) : undefined}
              onSelect={(i) => { const loc = hotelLocs[i]; if (loc) onSelectHotel(loc.idx); }}
              height={280}
            />
          </div>
        )}
        {hotels.length > 0 && (<div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{hotels.map((h, i) => (
          <div key={i} onClick={() => onSelectHotel(i)} onMouseEnter={() => setHoveredHotelIdx(i)} onMouseLeave={() => setHoveredHotelIdx(-1)} className="glass-card p-4 cursor-pointer transition-all" style={{ borderColor: i === selectedHotelIdx ? 'var(--color-amber)' : i === hoveredHotelIdx ? 'var(--color-primary)' : 'var(--color-border)', background: i === selectedHotelIdx ? 'var(--color-amber-light)' : undefined }}>
            <div className="flex items-start justify-between"><div><div className="flex items-center gap-2">{i === selectedHotelIdx && <CheckCircle size={14} style={{ color: 'var(--color-amber)' }} />}<h4 className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{h.name}</h4></div><p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-secondary)' }}>{h.area}</p></div><div className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold" style={{ background: 'var(--color-amber-light)', color: 'var(--color-amber)' }}><Star size={10} style={{ fill: 'var(--color-amber)' }} />{h.rating}</div></div>
            <div className="mt-2 text-xs" style={{ color: 'var(--color-text-muted)' }}>{h.amenities?.join(' · ')}</div>
            <div className="mt-3 flex items-center justify-between border-t pt-3" style={{ borderColor: 'var(--color-border)' }}><div className="flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-secondary)' }}><TrainFront size={11} />{h.metroStation} ({h.metroDistance})</div><div className="text-sm font-semibold" style={{ color: 'var(--color-amber)' }}>{h.pricePerNight}€<span className="ml-0.5 text-[10px] font-normal" style={{ color: 'var(--color-text-muted)' }}>/night</span></div></div>
          </div>))}</div>)}

        {/* Per-leg pricing summary below hotel cards */}
        {selectedHotelIdx >= 0 && hotels[selectedHotelIdx] && (
          <div className="mt-3 flex items-center gap-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            <Building2 size={12} style={{ color: 'var(--color-amber)' }} />
            <span>{hotels[selectedHotelIdx].name}: <b style={{ color: 'var(--color-text)' }}>{hotels[selectedHotelIdx].pricePerNight}€/night × {nights} night{nights !== 1 ? 's' : ''} = {hotels[selectedHotelIdx].pricePerNight * nights}€</b></span>
          </div>
        )}
      </div>)}

      {/* ITINERARY */}
      {activeTab === 'itinerary' && (<div>
        {agentStatuses.research === 'active' && <div className="space-y-3">
          <div className="flex items-center gap-3 mb-4" style={{ color: 'var(--color-text-muted)' }}><Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-green)' }} /> <span className="text-sm">Generating itinerary...</span></div>
          {[1,2,3].map(i => <div key={i} className="glass-card p-4 animate-pulse"><div className="flex items-center gap-3 mb-2"><div className="h-5 w-14 rounded" style={{ background: 'var(--color-border)' }} /><div className="h-3 w-48 rounded" style={{ background: 'var(--color-border)' }} /></div></div>)}
        </div>}
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
        {agentStatuses.places === 'active' && <div className="space-y-3">
          <div className="flex items-center gap-3 mb-4" style={{ color: 'var(--color-text-muted)' }}><Loader2 size={16} className="animate-spin" style={{ color: 'var(--color-purple)' }} /> <span className="text-sm">Searching places...</span></div>
          {[1,2,3,4].map(i => <div key={i} className="glass-card px-5 py-3 animate-pulse flex items-center gap-4"><div className="h-4 w-4 rounded" style={{ background: 'var(--color-border)' }} /><div className="flex-1"><div className="h-3 w-36 rounded mb-1" style={{ background: 'var(--color-border)' }} /><div className="h-2 w-48 rounded" style={{ background: 'var(--color-border)' }} /></div></div>)}
        </div>}
        {places.length > 0 && (() => {
          const placesWithCoords = places.map((p, i) => ({ ...p, origIdx: i })).filter(p => p.lat != null && p.lng != null);
          const visiblePlaceIndices = placesWithCoords
            .filter(p => includedPlaces.has(p.name))
            .map(p => placesWithCoords.indexOf(p));
          const focusedMapIdx = focusedPlaceIdx >= 0 ? placesWithCoords.findIndex(p => p.origIdx === focusedPlaceIdx) : -1;
          return (
            <div className="mb-4">
              <MapView
                locations={placesWithCoords.map(p => ({
                  lat: p.lat!, lng: p.lng!, label: p.name, color: '#A78BFA',
                }))}
                selectedIndex={focusedMapIdx >= 0 ? focusedMapIdx : undefined}
                visibleIndices={visiblePlaceIndices}
                onSelect={(mapIdx) => {
                  const place = placesWithCoords[mapIdx];
                  if (place) {
                    setFocusedPlaceIdx(place.origIdx);
                    placeRefs.current[place.origIdx]?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                  }
                }}
                height={280}
              />
            </div>
          );
        })()}
        {places.length > 0 && (<div className="glass-card divide-y" style={{ borderColor: 'var(--color-border)' }}>{places.map((p, i) => (
          <div key={i} ref={el => { placeRefs.current[i] = el; }} className="flex items-center gap-4 px-5 py-3 transition-all" style={{ borderColor: 'var(--color-border)', background: i === focusedPlaceIdx ? 'var(--color-primary-light)' : undefined }} onClick={() => setFocusedPlaceIdx(i === focusedPlaceIdx ? -1 : i)}>
            <input type="checkbox" checked={includedPlaces.has(p.name)} onChange={(e) => { e.stopPropagation(); onTogglePlace(p.name); }} className="h-4 w-4 rounded cursor-pointer" style={{ accentColor: 'var(--color-primary)', borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }} />
            <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="text-sm font-medium cursor-pointer" style={{ color: 'var(--color-text)' }}>{p.name}</span>{p.rating != null && <span className="flex items-center gap-0.5 text-xs" style={{ color: 'var(--color-purple)' }}><Star size={10} className="fill-current" />{p.rating}</span>}</div><p className="text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>{p.address}</p>{p.summary && <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--color-text-secondary)' }}>{p.summary}</p>}</div>
            <div className="flex items-center gap-2">
              {p.lat != null && p.lng != null && <button onClick={(e) => { e.stopPropagation(); setFocusedPlaceIdx(i); }} className="p-1 rounded transition-colors cursor-pointer" style={{ color: i === focusedPlaceIdx ? 'var(--color-primary)' : 'var(--color-text-muted)' }} title="View on map"><MapPin size={14} /></button>}
              {p.mapsUrl && <a href={p.mapsUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} className="transition-colors" style={{ color: 'var(--color-text-muted)' }}><ExternalLink size={14} /></a>}
            </div>
          </div>))}</div>)}
      </div>)}

      {/* COMPARE */}
      {activeTab === 'compare' && (<div>
        {combos.length === 0 && <div className="py-12 text-center text-sm" style={{ color: 'var(--color-text-muted)' }}>Waiting for flight and hotel results...</div>}
        {combos.length > 0 && (<div className="glass-card overflow-hidden"><table className="w-full text-sm"><thead><tr className="border-b text-left text-[11px] uppercase tracking-wider" style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}>
          <th className="px-4 py-2.5 font-medium">Flight</th><th className="px-4 py-2.5 font-medium">Hotel</th>
          <th className="px-4 py-2.5 font-medium text-right">Flights ({pax}p)</th>
          <th className="px-4 py-2.5 font-medium text-right">Hotel ({nights}n)</th>
          <th className="px-4 py-2.5 font-medium text-right">Total</th><th className="px-4 py-2.5 font-medium">Rating</th><th className="w-20 px-4 py-2.5" />
        </tr></thead><tbody>
          {combos.slice(0, 12).map((c, i) => {
            const isSelected = c.fi === selectedFlightIdx && c.hi === selectedHotelIdx;
            const isBest = i === 0;
            const isBestRated = c.hotelRating === Math.max(...combos.map(x => x.hotelRating));
            return (
              <tr key={i} onClick={() => { onSelectFlight(c.fi); onSelectHotel(c.hi); }}
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
    </>
  );
}
