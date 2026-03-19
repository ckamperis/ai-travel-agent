'use client';

import { useState, useEffect } from 'react';
import { CheckSquare, Inbox, CheckCircle, AlertCircle, Clock, X, Mail, MapPin, Timer } from 'lucide-react';
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

export default function ProcessedPage() {
  const [history, setHistory] = useState<ProcessedEmail[]>([]);
  const [selected, setSelected] = useState<ProcessedEmail | null>(null);

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
                  onClick={() => setSelected(entry)}
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
                    {entry.status === 'completed' ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{ background: 'var(--color-green-light)', color: 'var(--color-green)' }}
                      >
                        <CheckCircle size={12} />
                        Completed
                      </span>
                    ) : (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                        style={{ background: 'var(--color-red-light)', color: 'var(--color-red)' }}
                      >
                        <AlertCircle size={12} />
                        Failed
                      </span>
                    )}
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
                <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
                  style={{ background: 'var(--color-green-light)', color: 'var(--color-green)' }}>
                  <Timer size={12} /> {selected.totalTime}s
                </span>
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

              {/* Composed Response */}
              {selected.composedResponse ? (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider mb-2"
                    style={{ color: 'var(--color-text-muted)' }}>
                    Composed Response
                  </h4>
                  <div className="rounded-lg px-5 py-4 text-sm leading-relaxed whitespace-pre-wrap"
                    style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-secondary)', border: '1px solid var(--color-border)' }}>
                    {selected.composedResponse}
                  </div>
                </div>
              ) : (
                <div className="rounded-lg px-5 py-8 text-center"
                  style={{ background: 'var(--color-bg-secondary)' }}>
                  <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
                    No composed response stored for this email
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          &copy; 2026 Revival SA — AI &amp; Business Intelligence
        </p>
      </div>
    </div>
  );
}
