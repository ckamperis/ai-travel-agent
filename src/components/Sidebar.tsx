'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Inbox, CheckSquare, CalendarClock, Users,
  Settings, Bot, FileText, User, Menu, X, Zap, PanelLeftClose, PanelLeft,
} from 'lucide-react';
import { loadFollowUps, getProcessedSampleIds } from '@/lib/settings';

const NAV_ITEMS = [
  { href: '/', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/inbox', label: 'Inbox', icon: Inbox, badge: 'inbox' as const },
  { href: '/processed', label: 'Processed', icon: CheckSquare },
  { href: '/follow-ups', label: 'Follow-ups', icon: CalendarClock, badge: 'followups' as const },
  { href: '/customers', label: 'Customers', icon: Users },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});

  useEffect(() => {
    const pending = loadFollowUps().filter(f => f.status === 'pending').length;
    const unprocessedInbox = Math.max(0, 3 - getProcessedSampleIds().size);
    setBadges({ inbox: unprocessedInbox, followups: pending });
  }, [pathname]);

  const sidebarW = collapsed ? 'w-16' : 'w-60';

  return (
    <>
      {/* Mobile toggle */}
      <button onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-3.5 left-3 z-50 flex h-9 w-9 items-center justify-center rounded-lg border cursor-pointer lg:hidden"
        style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}>
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {mobileOpen && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setMobileOpen(false)} />}

      <aside className={`fixed top-0 left-0 z-40 flex h-screen ${sidebarW} flex-shrink-0 flex-col border-r transition-all duration-200 lg:static lg:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}
        style={{ background: 'var(--color-sidebar)', borderColor: 'var(--color-border)' }}>

        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b px-4 py-3.5" style={{ borderColor: 'var(--color-border)' }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg flex-shrink-0" style={{ background: 'var(--color-primary-light)' }}>
            <Zap size={16} style={{ color: 'var(--color-primary)' }} />
          </div>
          {!collapsed && <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>TravelAgent AI</span>}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(item => {
            const active = pathname === item.href;
            const badge = item.badge ? badges[item.badge] : 0;
            return (
              <Link key={item.href} href={item.href} onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-150 ${collapsed ? 'justify-center' : ''}`}
                style={{
                  background: active ? 'var(--color-sidebar-active)' : 'transparent',
                  color: active ? 'var(--color-primary)' : 'var(--color-sidebar-text)',
                }}
                onMouseEnter={e => { if (!active) e.currentTarget.style.background = 'var(--color-surface-hover)'; }}
                onMouseLeave={e => { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                <item.icon size={18} />
                {!collapsed && <span className="flex-1">{item.label}</span>}
                {!collapsed && badge > 0 && (
                  <span className="flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold text-white"
                    style={{ background: item.badge === 'inbox' ? 'var(--color-primary)' : 'var(--color-amber)' }}>
                    {badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t px-2 py-2" style={{ borderColor: 'var(--color-border)' }}>
          <button onClick={() => setCollapsed(!collapsed)}
            className="hidden lg:flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs transition-colors cursor-pointer"
            style={{ color: 'var(--color-text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
            {collapsed ? <PanelLeft size={16} /> : <><PanelLeftClose size={16} /><span>Collapse</span></>}
          </button>
          {!collapsed && (
            <p className="mt-2 px-3 text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
              &copy; 2026 Revival SA
            </p>
          )}
        </div>
      </aside>
    </>
  );
}
