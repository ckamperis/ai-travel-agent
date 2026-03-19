'use client';

import { useState, useEffect } from 'react';
import { CheckSquare, Inbox, CheckCircle, AlertCircle, Clock, X, Mail, MapPin, Timer, ArrowDownLeft, ArrowUpRight, MessageSquare } from 'lucide-react';
import { loadHistory, type ProcessedEmail } from '@/lib/settings';
import * as db from '@/lib/db';

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

const TRIP_STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  new: { label: 'New', color: 'var(--color-text-muted)', bg: 'var(--color-bg-secondary)' },
  analyzing: { label: 'Analyzing', color: 'var(--color-primary)', bg: 'var(--color-primary-light)' },
  quoted: { label: 'Quoted', color: 'var(--color-green)', bg: 'var(--color-green-light)' },
  negotiating: { label: 'Negotiating', color: 'var(--color-amber)', bg: 'var(--color-amber-light)' },
  confirmed: { label: 'Confirmed', color: 'var(--color-green)', bg: 'var(--color-green-light)' },
  booked: { label: 'Booked', color: '#8B5CF6', bg: '#8B5CF620' },
  completed: { label: 'Completed', color: 'var(--color-green)', bg: 'var(--color-green-light)' },
  cancelled: { label: 'Cancelled', color: 'var(--color-red)', bg: 'var(--color-red-light)' },
};

interface ConversationMessage {
  direction: 'inbound' | 'outbound';
  from: string;
  subject: string;
  body: string;
  timestamp: string;
}

export default function ProcessedPage() {
  const [history, setHistory] = useState<ProcessedEmail[]>([]);
  const [selected, setSelected] = useState<ProcessedEmail | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);

  useEffect(() => {
    (async () => {
      // Try Supabase first, fallback to localStorage
      const sbTrips = await db.getProcessedTrips();
      if (sbTrips && sbTrips.length > 0) {
        setHistory(sbTrips.map(t => {
          const v = t.trip_versions?.[t.trip_versions.length - 1];
          return {
            id: t.id,
            from: t.customers?.name || t.customers?.email || 'Unknown',
            subject: `Trip to ${(t.destinations || [])[0] || 'Unknown'}`,
            destination: (t.destinations || [])[0] || '',
            processedAt: t.created_at,
            totalTime: 0,
            status: t.status === 'cancelled' ? 'failed' as const : 'completed' as const,
            composedResponse: v?.composed_email || '',
            customerEmail: t.customers?.email,
            customerName: t.customers?.name,
            tripStatus: t.status,
          };
        }));
      } else {
        setHistory(loadHistory());
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: 'var(--color-green-light)' }}
          >
            <CheckSquare size={18} style={{ color: 'var(--color-green)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Processed Emails
          </h1>
        </div>
        <p className="text-sm ml-12" style={{ color: 'var(--color-text-muted)' }}>
          History of all emails handled by the AI assistant
        </p>
      </div>

      {/* -- Empty State ----------------------------------------- */}
      {history.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
            style={{ background: 'var(--color-bg-secondary)' }}
          >
            <Inbox size={32} style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            No processed emails yet
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
            Process your first email from the Inbox to see it here
          </p>
        </div>
      )}

      {/* -- Table ----------------------------------------------- */}
      {history.length > 0 && (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr
                className="text-left text-[11px] uppercase tracking-wider"
                style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text-muted)' }}
              >
                <th className="px-5 py-3 font-medium">From</th>
                <th className="px-5 py-3 font-medium">Destination</th>
                <th className="px-5 py-3 font-medium">Processed At</th>
                <th className="px-5 py-3 font-medium">Time</th>
                <th className="px-5 py-3 font-medium text-right">Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr
                  key={entry.id}
                  onClick={async () => {
                    setSelected(entry);
                    // Try loading conversation messages from Supabase
                    setMessages([]);
                    try {
                      const convs = await db.getConversations();
                      const conv = convs?.find(c => c.subject?.includes(entry.destination));
                      if (conv) {
                        const msgs = await db.getMessages(conv.id);
                        if (msgs) {
                          setMessages(msgs.map(m => ({
                            direction: m.direction as 'inbound' | 'outbound',
                            from: m.from_email,
                            subject: m.subject,
                            body: m.body_text,
                            timestamp: m.created_at,
                          })));
                        }
                      }
                    } catch { /* fallback: no messages */ }
                  }}
                  className="transition-colors duration-150 cursor-pointer"
                  style={{ borderBottom: '1px solid color-mix(in srgb, var(--color-border) 40%, transparent)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {/* From */}
                  <td className="px-5 py-3.5">
                    <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                      {entry.customerName || entry.from}
                    </span>
                    {entry.customerEmail && entry.customerEmail !== entry.from && (
                      <p className="mt-0.5 text-xs truncate max-w-[220px]" style={{ color: 'var(--color-text-muted)' }}>
                        {entry.customerEmail}
                      </p>
                    )}
                    {entry.subject && (
                      <p className="mt-0.5 text-xs truncate max-w-[220px]" style={{ color: 'var(--color-text-muted)' }}>
                        {entry.subject}
                      </p>
                    )}
                  </td>

                  {/* Destination */}
                  <td className="px-5 py-3.5" style={{ color: 'var(--color-text-secondary)' }}>
                    {entry.destination}
                  </td>

                  {/* Processed At */}
                  <td className="px-5 py-3.5 tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                    {fmtDate(entry.processedAt)}
                  </td>

                  {/* Time */}
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1" style={{ color: 'var(--color-text-muted)' }}>
                      <Clock size={12} style={{ color: 'var(--color-text-muted)' }} />
                      <span className="tabular-nums">
                        {entry.totalTime}s
                      </span>
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {entry.tripStatus && TRIP_STATUS_LABELS[entry.tripStatus] && (
                        <span className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                          style={{ background: TRIP_STATUS_LABELS[entry.tripStatus].bg, color: TRIP_STATUS_LABELS[entry.tripStatus].color }}>
                          {TRIP_STATUS_LABELS[entry.tripStatus].label}
                        </span>
                      )}
                      {entry.status === 'completed' ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{ background: 'var(--color-green-light)', color: 'var(--color-green)' }}>
                          <CheckCircle size={12} /> Completed
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                          style={{ background: 'var(--color-red-light)', color: 'var(--color-red)' }}>
                          <AlertCircle size={12} /> Failed
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Footer count */}
      {history.length > 0 && (
        <p className="mt-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Showing {history.length} processed email{history.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* -- Detail Modal ---------------------------------------- */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setSelected(null)}>
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative w-full max-w-2xl max-h-[85vh] overflow-y-auto rounded-2xl shadow-2xl animate-scale-in"
            style={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)' }}
            onClick={e => e.stopPropagation()}
          >
            {/* Modal header */}
            <div className="sticky top-0 flex items-center justify-between px-6 py-4 border-b z-10"
              style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
              <div className="flex items-center gap-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg"
                  style={{ background: 'var(--color-green-light)' }}>
                  <CheckSquare size={16} style={{ color: 'var(--color-green)' }} />
                </div>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    {selected.customerName || selected.from}
                  </h3>
                  <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{selected.subject}</p>
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                className="flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer transition-colors"
                style={{ color: 'var(--color-text-muted)' }}>
                <X size={18} />
              </button>
            </div>

            {/* Modal body */}
            <div className="px-6 py-5 space-y-5">
              {/* Meta chips */}
              <div className="flex flex-wrap gap-3">
                {selected.destination && (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}>
                    <MapPin size={12} /> {selected.destination}
                  </span>
                )}
                {selected.tripStatus && TRIP_STATUS_LABELS[selected.tripStatus] && (
                  <span className="rounded-full px-3 py-1 text-xs font-medium"
                    style={{ background: TRIP_STATUS_LABELS[selected.tripStatus].bg, color: TRIP_STATUS_LABELS[selected.tripStatus].color }}>
                    {TRIP_STATUS_LABELS[selected.tripStatus].label}
                  </span>
                )}
                {selected.totalTime > 0 && (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                    style={{ background: 'var(--color-green-light)', color: 'var(--color-green)' }}>
                    <Timer size={12} /> {selected.totalTime}s
                  </span>
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                  style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}>
                  {fmtDate(selected.processedAt)}
                </span>
                {selected.customerEmail && (
                  <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs"
                    style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}>
                    <Mail size={12} /> {selected.customerEmail}
                  </span>
                )}
              </div>

              {/* Conversation Timeline */}
              <div>
                <div className="flex items-center gap-2 mb-3">
                  <MessageSquare size={14} style={{ color: 'var(--color-primary)' }} />
                  <h4 className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>
                    Conversation
                  </h4>
                </div>

                {messages.length > 0 ? (
                  <div className="space-y-3">
                    {messages.map((msg, i) => (
                      <div key={i} className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                        <div className="flex items-center gap-2 px-4 py-2" style={{ background: msg.direction === 'inbound' ? 'var(--color-bg-secondary)' : 'var(--color-primary-light)' }}>
                          {msg.direction === 'inbound' ? <ArrowDownLeft size={12} style={{ color: 'var(--color-text-muted)' }} /> : <ArrowUpRight size={12} style={{ color: 'var(--color-primary)' }} />}
                          <span className="text-xs font-medium" style={{ color: msg.direction === 'inbound' ? 'var(--color-text-secondary)' : 'var(--color-primary)' }}>
                            {msg.direction === 'inbound' ? 'Customer' : 'Agent'}: {msg.from}
                          </span>
                          <span className="ml-auto text-[10px]" style={{ color: 'var(--color-text-muted)' }}>{fmtDate(msg.timestamp)}</span>
                        </div>
                        <div className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto" style={{ color: 'var(--color-text-secondary)' }}>
                          {msg.body.slice(0, 1000)}{msg.body.length > 1000 ? '...' : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : selected.composedResponse ? (
                  /* Fallback: show inbound (if available) + outbound from localStorage */
                  <div className="space-y-3">
                    {selected.originalEmail && (
                      <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                        <div className="flex items-center gap-2 px-4 py-2" style={{ background: 'var(--color-bg-secondary)' }}>
                          <ArrowDownLeft size={12} style={{ color: 'var(--color-text-muted)' }} />
                          <span className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>Customer: {selected.customerEmail || selected.from}</span>
                        </div>
                        <div className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap max-h-[200px] overflow-y-auto" style={{ color: 'var(--color-text-secondary)' }}>
                          {selected.originalEmail.slice(0, 1000)}
                        </div>
                      </div>
                    )}
                    <div className="rounded-lg overflow-hidden" style={{ border: '1px solid var(--color-border)' }}>
                      <div className="flex items-center gap-2 px-4 py-2" style={{ background: 'var(--color-primary-light)' }}>
                        <ArrowUpRight size={12} style={{ color: 'var(--color-primary)' }} />
                        <span className="text-xs font-medium" style={{ color: 'var(--color-primary)' }}>Agent Response</span>
                      </div>
                      <div className="px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap max-h-[300px] overflow-y-auto" style={{ color: 'var(--color-text-secondary)' }}>
                        {selected.composedResponse}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="rounded-lg px-5 py-8 text-center" style={{ background: 'var(--color-bg-secondary)' }}>
                    <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No conversation data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          &copy; 2026 Revival SA — Voyager AI
        </p>
      </div>
    </div>
  );
}
