'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Bell, ChevronRight, User, Settings, Key, Shield, Cookie,
  Sun, Moon, LogOut, Zap,
} from 'lucide-react';
import { useTheme } from './ThemeProvider';
import { loadProfile } from '@/lib/settings';

export default function Header() {
  const pathname = usePathname();
  const { theme, toggle } = useTheme();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const notifsRef = useRef<HTMLDivElement>(null);
  const [profile, setProfile] = useState({ agencyName: 'Afea Travel', agentName: 'Maria', email: '' });

  useEffect(() => { setProfile(loadProfile()); }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (notifsRef.current && !notifsRef.current.contains(e.target as Node)) setNotifsOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // Build breadcrumb from pathname
  const crumbs: { label: string; href?: string }[] = pathname === '/'
    ? [{ label: 'Dashboard' }]
    : pathname.split('/').filter(Boolean).map((seg, i, arr) => ({
        label: seg.charAt(0).toUpperCase() + seg.slice(1).replace(/-/g, ' '),
        href: i < arr.length - 1 ? '/' + arr.slice(0, i + 1).join('/') : undefined,
      }));

  const initials = profile.agentName
    ? profile.agentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : 'AT';

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center border-b px-4 lg:px-6"
      style={{ background: 'var(--color-surface)', borderColor: 'var(--color-border)' }}>
      {/* Logo (mobile) */}
      <div className="flex items-center gap-2 lg:hidden mr-4">
        <Zap size={18} style={{ color: 'var(--color-primary)' }} />
        <span className="text-sm font-bold" style={{ color: 'var(--color-text)' }}>TravelAgent AI</span>
      </div>

      {/* Breadcrumb */}
      <nav className="hidden lg:flex items-center gap-1.5 text-sm flex-1">
        {crumbs.map((c, i) => (
          <span key={i} className="flex items-center gap-1.5">
            {i > 0 && <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />}
            {c.href ? (
              <Link href={c.href} className="transition-colors" style={{ color: 'var(--color-text-muted)' }}>{c.label}</Link>
            ) : (
              <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>{c.label}</span>
            )}
          </span>
        ))}
      </nav>

      <div className="flex-1 lg:hidden" />

      {/* Right actions */}
      <div className="flex items-center gap-2">
        {/* Theme toggle */}
        <button onClick={toggle} className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer"
          style={{ color: 'var(--color-text-muted)' }}
          title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}>
          {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
        </button>

        {/* Notifications */}
        <div ref={notifsRef} className="relative">
          <button onClick={() => { setNotifsOpen(!notifsOpen); setProfileOpen(false); }}
            className="relative flex h-8 w-8 items-center justify-center rounded-lg transition-colors cursor-pointer"
            style={{ color: 'var(--color-text-muted)' }}>
            <Bell size={18} />
            <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-bold text-white"
              style={{ background: 'var(--color-red)' }}>3</span>
          </button>
          {notifsOpen && (
            <div className="absolute right-0 top-full mt-2 w-80 card shadow-lg animate-scale-in overflow-hidden" style={{ zIndex: 50 }}>
              <div className="px-4 py-3 font-medium text-sm" style={{ borderBottom: '1px solid var(--color-border)', color: 'var(--color-text)' }}>Notifications</div>
              {[
                { msg: 'Follow-up due: Klaus Mueller — Greece', time: '2h ago', type: 'amber' },
                { msg: 'Email processed successfully', time: '4h ago', type: 'green' },
                { msg: 'New template created', time: 'Yesterday', type: 'primary' },
              ].map((n, i) => (
                <div key={i} className="flex items-start gap-3 px-4 py-3 transition-colors cursor-pointer"
                  style={{ borderBottom: '1px solid var(--color-border-light)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <div className="mt-0.5 h-2 w-2 rounded-full flex-shrink-0"
                    style={{ background: n.type === 'amber' ? 'var(--color-amber)' : n.type === 'green' ? 'var(--color-green)' : 'var(--color-primary)' }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm" style={{ color: 'var(--color-text)' }}>{n.msg}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--color-text-muted)' }}>{n.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Profile */}
        <div ref={profileRef} className="relative">
          <button onClick={() => { setProfileOpen(!profileOpen); setNotifsOpen(false); }}
            className="flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold text-white cursor-pointer"
            style={{ background: 'var(--color-primary)' }}>
            {initials}
          </button>
          {profileOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 card shadow-lg animate-scale-in overflow-hidden" style={{ zIndex: 50 }}>
              <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--color-border)' }}>
                <p className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>{profile.agentName}</p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>{profile.email || profile.agencyName}</p>
              </div>
              {[
                { label: 'Profile & Account', icon: User, href: '/profile' },
                { label: 'Mail Settings', icon: Settings, href: '/settings' },
                { label: 'API Keys & Integrations', icon: Key, href: '/agents' },
                { label: 'Cookie Policy', icon: Cookie, href: '#' },
                { label: 'Privacy Settings', icon: Shield, href: '#' },
              ].map((item, i) => (
                <Link key={i} href={item.href} onClick={() => setProfileOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm transition-colors"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  <item.icon size={15} />{item.label}
                </Link>
              ))}
              <div style={{ borderTop: '1px solid var(--color-border)' }}>
                <button onClick={toggle}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm w-full transition-colors cursor-pointer"
                  style={{ color: 'var(--color-text-secondary)' }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--color-surface-hover)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}>
                  {theme === 'light' ? <Moon size={15} /> : <Sun size={15} />}
                  {theme === 'light' ? 'Dark Mode' : 'Light Mode'}
                </button>
                <button disabled className="flex items-center gap-3 px-4 py-2.5 text-sm w-full opacity-40 cursor-not-allowed"
                  style={{ color: 'var(--color-text-muted)' }}>
                  <LogOut size={15} />Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
