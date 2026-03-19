'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mail, Clock, CheckCircle, CalendarClock, Send,
  Activity, LayoutDashboard, TrendingUp, TrendingDown, Minus,
  Percent, Timer, Inbox,
} from 'lucide-react';
import {
  loadHistory, loadFollowUps,
  type ProcessedEmail, type FollowUp,
} from '@/lib/settings';
import * as db from '@/lib/db';

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  const hrs = Math.floor(mins / 60);
  const days = Math.floor(hrs / 24);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  if (hrs < 24) return `${hrs}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isThisWeek(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);
  return d >= startOfWeek;
}

function isLastWeek(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  const startOfThisWeek = new Date(now);
  startOfThisWeek.setDate(now.getDate() - now.getDay());
  startOfThisWeek.setHours(0, 0, 0, 0);
  const startOfLastWeek = new Date(startOfThisWeek);
  startOfLastWeek.setDate(startOfLastWeek.getDate() - 7);
  return d >= startOfLastWeek && d < startOfThisWeek;
}

export default function DashboardPage() {
  const [history, setHistory] = useState<ProcessedEmail[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  useEffect(() => {
    (async () => {
      // Try Supabase for history, fallback to localStorage
      const sbTrips = await db.getProcessedTrips();
      if (sbTrips && sbTrips.length > 0) {
        setHistory(sbTrips.map(t => ({
          id: t.id,
          from: t.customers?.name || t.customers?.email || 'Unknown',
          subject: `Trip to ${(t.destinations || [])[0] || 'Unknown'}`,
          destination: (t.destinations || [])[0] || '',
          processedAt: t.created_at,
          totalTime: 0,
          status: t.status === 'cancelled' ? 'failed' as const : 'completed' as const,
        })));
      } else {
        setHistory(loadHistory());
      }

      // Try Supabase for follow-ups, fallback to localStorage
      const sbFollowUps = await db.getFollowUps('pending');
      if (sbFollowUps && sbFollowUps.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        setFollowUps(sbFollowUps.map((f: any) => ({
          id: f.id, customerEmail: f.customers?.email || '', customerName: f.customers?.name || '',
          destination: '', originalResponse: '', scheduledDate: f.scheduled_date,
          status: f.status, processedEmailId: '', createdAt: f.created_at,
        })));
      } else {
        setFollowUps(loadFollowUps());
      }
    })();
  }, []);

  const total = history.length;
  const completed = history.filter(e => e.status === 'completed').length;
  const responseRate = total > 0 ? Math.round((completed / total) * 100) : null;
  const avgTime = total > 0
    ? (history.reduce((s, e) => s + e.totalTime, 0) / total).toFixed(1)
    : null;
  const pendingFollowUps = followUps.filter(f => f.status === 'pending').length;
  const thisWeekCount = history.filter(e => isThisWeek(e.processedAt)).length;
  const lastWeekCount = history.filter(e => isLastWeek(e.processedAt)).length;
  const weekTrend = thisWeekCount - lastWeekCount;

  const stats = [
    {
      label: 'Response Rate',
      value: responseRate !== null ? `${responseRate}%` : '\u2014',
      sub: total > 0 ? `${completed} of ${total} emails` : 'No data yet',
      icon: Percent,
      iconBg: 'var(--color-primary-light)',
      iconColor: 'var(--color-primary)',
    },
    {
      label: 'Avg. Handling Time',
      value: avgTime !== null ? `${avgTime}s` : '\u2014',
      sub: total > 0 ? 'per email' : 'No data yet',
      icon: Timer,
      iconBg: 'var(--color-green-light)',
      iconColor: 'var(--color-green)',
    },
    {
      label: 'Open Inquiries',
      value: pendingFollowUps > 0 ? String(pendingFollowUps) : '\u2014',
      sub: pendingFollowUps > 0 ? 'awaiting follow-up' : 'All caught up',
      icon: Inbox,
      iconBg: 'var(--color-amber-light)',
      iconColor: 'var(--color-amber)',
    },
    {
      label: 'This Week',
      value: thisWeekCount > 0 ? String(thisWeekCount) : '\u2014',
      sub: weekTrend > 0 ? `+${weekTrend} vs last week` : weekTrend < 0 ? `${weekTrend} vs last week` : lastWeekCount > 0 ? 'Same as last week' : 'No prior week data',
      icon: Activity,
      iconBg: 'var(--color-purple-light)',
      iconColor: 'var(--color-purple)',
      trend: weekTrend,
    },
  ];

  const recentActivity = history.slice(0, 8);

  return (
    <div className="mx-auto max-w-5xl px-6 py-8 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: 'var(--color-primary-light)' }}>
            <LayoutDashboard size={18} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>Dashboard</h1>
        </div>
        <p className="text-sm ml-12" style={{ color: 'var(--color-text-muted)' }}>
          Voyager AI — Smart Lead Response for Travel Agencies
        </p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {stats.map((stat, i) => (
          <div key={stat.label}
            className={`card p-5 shadow-sm animate-fade-in-up stagger-${i + 1}`}>
            <div className="flex items-center justify-between mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ background: stat.iconBg }}>
                <stat.icon size={20} style={{ color: stat.iconColor }} />
              </div>
              {'trend' in stat && stat.trend !== 0 && (
                <span className="flex items-center gap-0.5 text-xs font-medium"
                  style={{ color: (stat.trend ?? 0) > 0 ? 'var(--color-green)' : 'var(--color-red)' }}>
                  {(stat.trend ?? 0) > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                  {Math.abs(stat.trend ?? 0)}
                </span>
              )}
            </div>
            <p className="text-2xl font-bold tabular-nums" style={{ color: 'var(--color-text)' }}>
              {stat.value}
            </p>
            <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {stat.sub}
            </p>
          </div>
        ))}
      </div>

      {/* Recent Activity */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} style={{ color: 'var(--color-primary)' }} />
          <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            Recent Activity
          </h2>
        </div>

        {recentActivity.length === 0 ? (
          <div className="card flex flex-col items-center justify-center py-16 text-center shadow-sm">
            <Mail size={28} style={{ color: 'var(--color-text-muted)' }} className="mb-3" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>No activity yet</p>
            <p className="text-xs mt-1" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
              Process your first email to see it here
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden shadow-sm">
            {recentActivity.map((entry, i) => (
              <div key={entry.id}
                className="flex items-center gap-4 px-5 py-3.5 transition-colors duration-150"
                style={{
                  borderBottom: i < recentActivity.length - 1 ? '1px solid var(--color-border)' : 'none',
                  background: i % 2 === 1 ? 'var(--color-bg-secondary)' : 'transparent',
                }}>
                <span className="h-2 w-2 flex-shrink-0 rounded-full"
                  style={{ background: entry.status === 'completed' ? 'var(--color-green)' : 'var(--color-red)' }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate" style={{ color: 'var(--color-text-secondary)' }}>
                    <span className="font-medium" style={{ color: 'var(--color-text)' }}>
                      {entry.from}
                    </span>
                    {entry.destination && (
                      <> <span style={{ color: 'var(--color-text-muted)' }}>&mdash;</span> {entry.destination}</>
                    )}
                  </p>
                </div>
                <span className="flex-shrink-0 text-xs tabular-nums" style={{ color: 'var(--color-text-muted)' }}>
                  {relativeTime(entry.processedAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Quick Actions */}
      <section>
        <h2 className="text-sm font-semibold mb-4" style={{ color: 'var(--color-text-secondary)' }}>
          Quick Actions
        </h2>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Link href="/inbox"
            className="card group flex items-center gap-4 p-5 shadow-sm transition-all duration-150 hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: 'var(--color-primary)', color: '#fff' }}>
              <Send size={22} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>Process New Email</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>Handle incoming travel inquiries with AI</p>
            </div>
          </Link>
          <Link href="/follow-ups"
            className="card group flex items-center gap-4 p-5 shadow-sm transition-all duration-150 hover:shadow-md">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl"
              style={{ background: 'var(--color-amber-light)' }}>
              <CalendarClock size={22} style={{ color: 'var(--color-amber)' }} />
            </div>
            <div>
              <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>View Follow-ups</p>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                {pendingFollowUps > 0 ? `${pendingFollowUps} pending` : 'All caught up'}
              </p>
            </div>
          </Link>
        </div>
      </section>

      <div className="mt-12 text-center">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          &copy; 2026 Revival SA &mdash; Voyager AI
        </p>
      </div>
    </div>
  );
}
