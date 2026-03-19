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
import * as db from '@/lib/db';

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
  pending: { bg: 'var(--color-amber-light)', text: 'var(--color-amber)', label: 'Pending' },
  sent: { bg: 'var(--color-green-light)', text: 'var(--color-green)', label: 'Sent' },
  cancelled: { bg: 'var(--color-bg-secondary)', text: 'var(--color-text-muted)', label: 'Cancelled' },
};

/* ================================================================
   Follow-ups Page
   ================================================================ */

export default function FollowUpsPage() {
  const { addToast } = useToast();
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);
  const [activeTab, setActiveTab] = useState<FilterTab>('all');

  const reload = useCallback(async () => {
    // Try Supabase first, fallback to localStorage
    const sbFollowUps = await db.getFollowUps();
    if (sbFollowUps && sbFollowUps.length > 0) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      setFollowUps(sbFollowUps.map((f: any) => ({
        id: f.id, customerEmail: f.customers?.email || '', customerName: f.customers?.name || '',
        destination: f.reminder_text?.replace('Follow up on trip to ', '') || '',
        originalResponse: '', scheduledDate: f.scheduled_date, status: f.status,
        processedEmailId: f.trip_id || '', createdAt: f.created_at,
      })));
    } else {
      setFollowUps(loadFollowUps());
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /* -- Actions ------------------------------------------------ */

  const markSent = async (id: string) => {
    updateFollowUp(id, { status: 'sent' });
    await db.updateFollowUpStatus(id, 'sent', new Date().toISOString());
    addToast('Follow-up marked as sent', 'success');
    reload();
  };

  const cancel = async (id: string) => {
    updateFollowUp(id, { status: 'cancelled' });
    await db.updateFollowUpStatus(id, 'cancelled');
    addToast('Follow-up cancelled', 'info');
    reload();
  };

  /* -- Filtering ---------------------------------------------- */

  const filtered =
    activeTab === 'all'
      ? followUps
      : followUps.filter((f) => f.status === activeTab);

  const pendingCount = followUps.filter((f) => f.status === 'pending').length;

  /* -- Tabs config -------------------------------------------- */

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'pending', label: 'Pending' },
    { key: 'sent', label: 'Sent' },
    { key: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 animate-fade-in">
      {/* -- Header --------------------------------------------- */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: 'var(--color-amber-light)' }}
          >
            <CalendarClock size={18} style={{ color: 'var(--color-amber)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Follow-up Reminders
          </h1>
        </div>
        <p className="text-sm ml-12" style={{ color: 'var(--color-text-muted)' }}>
          Customers who haven&apos;t responded to your proposals &mdash; {pendingCount} pending
        </p>
      </div>

      {/* -- Filter Tabs ---------------------------------------- */}
      <div className="flex items-center gap-1.5 mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className="rounded-lg px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
            style={
              activeTab === tab.key
                ? { background: 'var(--color-primary-light)', color: 'var(--color-primary)' }
                : { color: 'var(--color-text-muted)' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* -- Empty State ---------------------------------------- */}
      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
            style={{ background: 'var(--color-bg-secondary)' }}
          >
            <Inbox size={32} style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            No follow-ups {activeTab !== 'all' ? `with status "${activeTab}"` : 'scheduled'}
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
            Follow-ups are created automatically after processing emails
          </p>
        </div>
      )}

      {/* -- List ----------------------------------------------- */}
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
                  {/* Left -- Info */}
                  <div className="flex-1 min-w-0">
                    {/* Name + email */}
                    <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                      {fu.customerName}
                    </p>
                    <p className="flex items-center gap-1.5 mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
                      <Mail size={11} />
                      {fu.customerEmail}
                    </p>

                    {/* Destination + scheduled date */}
                    <div className="mt-3 flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                      <span className="inline-flex items-center gap-1">
                        <MapPin size={12} style={{ color: 'var(--color-text-muted)' }} />
                        {fu.destination}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} style={{ color: 'var(--color-text-muted)' }} />
                        Proposal sent {relativeCreated(fu.createdAt)}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Clock size={12} style={{ color: 'var(--color-text-muted)' }} />
                        Follow-up due: {fmtDate(fu.scheduledDate)}
                      </span>
                    </div>

                    {/* Original response excerpt */}
                    {fu.originalResponse && (
                      <p className="mt-2 text-xs line-clamp-1" style={{ color: 'var(--color-text-muted)' }}>
                        {fu.originalResponse.slice(0, 100)}
                        {fu.originalResponse.length > 100 ? '...' : ''}
                      </p>
                    )}
                  </div>

                  {/* Right -- Badge + Actions */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {/* Status badge */}
                    <span
                      className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
                      style={{ background: style.bg, color: style.text }}
                    >
                      {style.label}
                    </span>

                    {/* Action buttons */}
                    {fu.status === 'pending' && (
                      <>
                        <button
                          onClick={() => markSent(fu.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                          style={{ background: 'var(--color-green-light)', color: 'var(--color-green)' }}
                        >
                          <CheckCircle size={13} />
                          Send Follow-up Reminder
                        </button>
                        <button
                          onClick={() => cancel(fu.id)}
                          className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                          style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}
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
        <p className="mt-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Showing {filtered.length} follow-up{filtered.length !== 1 ? 's' : ''}
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
