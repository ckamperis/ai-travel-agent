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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-green/10">
            <CheckSquare size={18} className="text-green" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">
            Processed Emails
          </h1>
        </div>
        <p className="text-sm text-foreground/40 ml-12">
          History of all emails handled by the AI assistant
        </p>
      </div>

      {/* ── Empty State ──────────────────────────────────────── */}
      {history.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/[0.03] mb-4">
            <Inbox size={32} className="text-foreground/15" />
          </div>
          <p className="text-sm font-medium text-foreground/30">
            No processed emails yet
          </p>
          <p className="mt-1 text-xs text-foreground/20">
            Process your first email from the Inbox to see it here
          </p>
        </div>
      )}

      {/* ── Table ────────────────────────────────────────────── */}
      {history.length > 0 && (
        <div className="glass-card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-card-border text-left text-[11px] uppercase tracking-wider text-foreground/30">
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
                  className="border-b border-card-border/20 last:border-0 transition-colors duration-150 hover:bg-white/[0.02]"
                >
                  {/* From */}
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-foreground/75">
                      {entry.from}
                    </span>
                    {entry.subject && (
                      <p className="mt-0.5 text-xs text-foreground/30 truncate max-w-[220px]">
                        {entry.subject}
                      </p>
                    )}
                  </td>

                  {/* Destination */}
                  <td className="px-5 py-3.5 text-foreground/55">
                    {entry.destination}
                  </td>

                  {/* Processed At */}
                  <td className="px-5 py-3.5 text-foreground/40 tabular-nums">
                    {fmtDate(entry.processedAt)}
                  </td>

                  {/* Time */}
                  <td className="px-5 py-3.5">
                    <span className="inline-flex items-center gap-1 text-foreground/40">
                      <Clock size={12} className="text-foreground/25" />
                      <span className="tabular-nums">
                        {entry.totalTime}s
                      </span>
                    </span>
                  </td>

                  {/* Status */}
                  <td className="px-5 py-3.5 text-right">
                    {entry.status === 'completed' ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-green/10 px-2.5 py-1 text-xs font-medium text-green">
                        <CheckCircle size={12} />
                        Completed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-red-500/10 px-2.5 py-1 text-xs font-medium text-red-400">
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
        <p className="mt-4 text-center text-xs text-foreground/20">
          Showing {history.length} processed email{history.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
