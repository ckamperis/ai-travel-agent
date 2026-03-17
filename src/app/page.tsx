'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  Mail,
  Clock,
  CheckCircle,
  CalendarClock,
  Send,
  Activity,
  LayoutDashboard,
} from 'lucide-react';
import {
  loadHistory,
  loadFollowUps,
  type ProcessedEmail,
  type FollowUp,
} from '@/lib/settings';

/* ================================================================
   Helpers
   ================================================================ */

function relativeTime(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const diff = now - then;
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/* ================================================================
   Dashboard Page
   ================================================================ */

export default function DashboardPage() {
  const [history, setHistory] = useState<ProcessedEmail[]>([]);
  const [followUps, setFollowUps] = useState<FollowUp[]>([]);

  useEffect(() => {
    setHistory(loadHistory());
    setFollowUps(loadFollowUps());
  }, []);

  /* ── Computed stats ──────────────────────────────────────────── */

  const totalProcessed = history.length;

  const avgResponseTime =
    history.length > 0
      ? (history.reduce((sum, e) => sum + e.totalTime, 0) / history.length).toFixed(1)
      : '0.0';

  const completedToday = history.filter(
    (e) => e.status === 'completed' && isToday(e.processedAt),
  ).length;

  const pendingFollowUps = followUps.filter((f) => f.status === 'pending').length;

  const recentActivity = history.slice(0, 8);

  /* ── Stat cards config ───────────────────────────────────────── */

  const stats = [
    {
      label: 'Emails Processed',
      value: totalProcessed,
      icon: Mail,
      iconBg: 'bg-teal/10',
      iconColor: 'text-teal',
    },
    {
      label: 'Avg Response Time',
      value: `${avgResponseTime}s`,
      icon: Clock,
      iconBg: 'bg-teal/10',
      iconColor: 'text-teal',
    },
    {
      label: 'Completed Today',
      value: completedToday,
      icon: CheckCircle,
      iconBg: 'bg-green/10',
      iconColor: 'text-green',
    },
    {
      label: 'Pending Follow-ups',
      value: pendingFollowUps,
      icon: CalendarClock,
      iconBg: 'bg-amber/10',
      iconColor: 'text-amber',
    },
  ];

  return (
    <div className="mx-auto max-w-5xl px-6 py-10 animate-fade-in">
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal/10">
            <LayoutDashboard size={18} className="text-teal" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        </div>
        <p className="text-sm text-foreground/40 ml-12">
          Welcome back — here&apos;s your activity overview
        </p>
      </div>

      {/* ── Stat Cards ─────────────────────────────────────────── */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-10">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`glass-card p-5 animate-fade-in-up stagger-${i + 1}`}
          >
            <div className="flex items-start justify-between mb-3">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-xl ${stat.iconBg}`}
              >
                <stat.icon size={20} className={stat.iconColor} />
              </div>
            </div>
            <p className="text-2xl font-bold text-foreground tabular-nums">
              {stat.value}
            </p>
            <p className="mt-0.5 text-xs text-foreground/35">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* ── Recent Activity ────────────────────────────────────── */}
      <section className="mb-10">
        <div className="flex items-center gap-2 mb-4">
          <Activity size={16} className="text-cyan" />
          <h2 className="text-sm font-semibold text-foreground/70">Recent Activity</h2>
        </div>

        {recentActivity.length === 0 ? (
          <div className="glass-card flex flex-col items-center justify-center py-16 text-center">
            <Mail size={28} className="text-foreground/15 mb-3" />
            <p className="text-sm text-foreground/30">No activity yet</p>
            <p className="text-xs text-foreground/20 mt-1">
              Process your first email to see it here
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentActivity.map((entry, i) => (
              <div
                key={entry.id}
                className={`glass-card flex items-center gap-4 px-5 py-3.5 transition-colors duration-150 hover:bg-white/[0.02] animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}
              >
                {/* Status dot */}
                <span
                  className={`h-2.5 w-2.5 flex-shrink-0 rounded-full ${
                    entry.status === 'completed' ? 'bg-green' : 'bg-red-400'
                  }`}
                />

                {/* Main text */}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground/70 truncate">
                    <span className="font-medium text-foreground/80">
                      Responded to {entry.from}
                    </span>
                    {entry.destination && (
                      <>
                        {' '}
                        <span className="text-foreground/30">—</span>{' '}
                        <span className="text-foreground/50">{entry.destination}</span>
                      </>
                    )}
                  </p>
                </div>

                {/* Time */}
                <span className="flex-shrink-0 text-xs text-foreground/30 tabular-nums">
                  {relativeTime(entry.processedAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Quick Actions ──────────────────────────────────────── */}
      <section>
        <h2 className="text-sm font-semibold text-foreground/70 mb-4">Quick Actions</h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {/* Process New Email */}
          <Link
            href="/inbox"
            className="glass-card group flex items-center gap-4 p-5 transition-all duration-200 hover:bg-white/[0.02] hover:border-teal/20"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-teal/20 to-cyan/20">
              <Send size={22} className="text-teal" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors">
                Process New Email
              </p>
              <p className="text-xs text-foreground/30">
                Handle incoming travel inquiries with AI
              </p>
            </div>
          </Link>

          {/* View Follow-ups */}
          <Link
            href="/follow-ups"
            className="glass-card group flex items-center gap-4 p-5 transition-all duration-200 hover:bg-white/[0.02] hover:border-amber/20"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-amber/10 border border-amber/15">
              <CalendarClock size={22} className="text-amber" />
            </div>
            <div>
              <p className="text-sm font-semibold text-foreground/80 group-hover:text-foreground transition-colors">
                View Follow-ups
              </p>
              <p className="text-xs text-foreground/30">
                {pendingFollowUps} pending follow-up{pendingFollowUps !== 1 ? 's' : ''} to review
              </p>
            </div>
          </Link>
        </div>
      </section>
    </div>
  );
}
