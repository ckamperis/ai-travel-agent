'use client';

import { useState, useEffect } from 'react';
import { CheckSquare, Inbox, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { loadHistory, type ProcessedEmail } from '@/lib/settings';

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

  useEffect(() => {
    setHistory(loadHistory());
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
                  className="transition-colors duration-150"
                  style={{ borderBottom: '1px solid color-mix(in srgb, var(--color-border) 40%, transparent)' }}
                >
                  {/* From */}
                  <td className="px-5 py-3.5">
                    <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                      {entry.from}
                    </span>
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

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          &copy; 2026 Revival SA — AI &amp; Business Intelligence
        </p>
      </div>
    </div>
  );
}
