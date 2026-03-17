'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  CalendarClock,
  CheckCircle,
  XCircle,
  Inbox,
  MapPin,
  Mail,
  Calendar,
  Clock,
} from 'lucide-react';
import {
  loadFollowUps,
  updateFollowUp,
  type FollowUp,
} from '@/lib/settings';
import { useToast } from '@/components/Toast';

/* ================================================================
   Helpers
   ================================================================ */

type FilterTab = 'all' | 'pending' | 'sent' | 'cancelled';

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

function relativeCreated(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const days = Math.floor((now - then) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  return fmtDate(iso);
}

const STATUS_STYLES: Record<FollowUp['status'], { bg: string; text: string; label: string }> = {
  pending: { bg: 'bg-amber/10', text: 'text-amber', label: 'Pending' },
  sent: { bg: 'bg-green/10', text: 'text-green', label: 'Sent' },
  cancelled: { bg: 'bg-foreground/[0.06]', text: 'text-foreground/40', label: 'Cancelled' },
};

/* ================================================================
   Follow-ups Page
   ================================================================ */

export default function FollowUpsPage() {
  const { addToast } = useToast();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const reload = useCallback(() => {
    setFollowUps(loadFollowUps());
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /* ── Actions ─────────────────────────────────────────────── */

  const markSent = (id: string) => {
    updateFollowUp(id, { status: 'sent' });
    addToast('Follow-up marked as sent', 'success');
    reload();
  };

  const cancel = (id: string) => {
    updateFollowUp(id, { status: 'cancelled' });
    addToast('Follow-up cancelled', 'info');
    reload();
  };

  /* ── Filtering ───────────────────────────────────────────── */

  const filtered =
    activeTab === 'all'
      ? followUps
      : followUps.filter((f) => f.status === activeTab);

  const pendingCount = followUps.filter((f) => f.status === 'pending').length;

  /* ── Tabs config ─────────────────────────────────────────── */

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'sent', label: 'Sent' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber/10">
            <CalendarClock size={18} className="text-amber" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Follow-ups</h1>
        </div>
        <p className="text-sm text-foreground/40 ml-12">
          {pendingCount} pending follow-up{pendingCount !== 1 ? 's' : ''} scheduled
        </p>
      </div>

      {/* ── Filter Tabs ────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === tab.key
                ? 'bg-teal/10 text-teal'
                : 'text-foreground/35 hover:text-foreground/55 hover:bg-white/[0.03]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Empty State ────────────────────────────────────── */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-foreground/[0.03] mb-4">
            <Inbox size={32} className="text-foreground/15" />
          </div>
          <p className="text-sm font-medium text-foreground/30">
            No follow-ups {activeTab !== 'all' ? `with status "${activeTab}"` : 'scheduled'}
          </p>
          <p className="mt-1 text-xs text-foreground/20">
            Follow-ups are created automatically after processing emails
          </p>
        </div>
      )}

      {/* ── List ───────────────────────────────────────────── */}
      {filtered.length > 0 && (
        <div className="space-y-3">
          {filtered.map((fu, i) => {
            const style = STATUS_STYLES[fu.status];
            return (
              <div
                key={fu.id}
                className={`glass-card p-5 animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  {/* Left — Info */}
                  <div className="flex-1 min-w-0">
                    {/* Name + email */}
                    <p className="text-sm font-semibold text-foreground/80">
                      {fu.customerName}
                    </p>
                    <p className="flex items-center gap-1.5 mt-0.5 text-xs text-foreground/35">
                      <Mail size={11} />
                      {fu.customerEmail}
                    </p>

                    {/* Destination + scheduled date */}
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs text-foreground/45">
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} className="text-foreground/25" />
                        {fu.destination}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} className="text-foreground/25" />
                        Scheduled: {fmtDate(fu.scheduledDate)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} className="text-foreground/25" />
                        Created {relativeCreated(fu.createdAt)}
                      </span>
                    </div>

                    {/* Original response excerpt */}
                    {fu.originalResponse && (
                      <p className="mt-2 text-xs text-foreground/25 line-clamp-1">
                        {fu.originalResponse.slice(0, 100)}
                        {fu.originalResponse.length > 100 ? '...' : ''}
                      </p>
                    )}
                  </div>

                  {/* Right — Badge + Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Status badge */}
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${style.bg} ${style.text}`}
                    >
                      {style.label}
                    </span>

                    {/* Action buttons */}
                    {fu.status === 'pending' && (
                      <>
                        <button
                          onClick={() => markSent(fu.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-green/10 px-3 py-1.5 text-xs font-medium text-green transition-colors hover:bg-green/20 cursor-pointer"
                        >
                          <CheckCircle size={13} />
                          Mark Sent
                        </button>
                        <button
                          onClick={() => cancel(fu.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-foreground/[0.05] px-3 py-1.5 text-xs font-medium text-foreground/40 transition-colors hover:bg-foreground/[0.08] hover:text-foreground/55 cursor-pointer"
                        >
                          <XCircle size={13} />
                          Cancel
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Footer count */}
      {filtered.length > 0 && (
        <p className="mt-4 text-center text-xs text-foreground/20">
          Showing {filtered.length} follow-up{filtered.length !== 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
