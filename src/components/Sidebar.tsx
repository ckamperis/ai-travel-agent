'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Inbox,
  CheckSquare,
  Settings,
  Bot,
  FileText,
  User,
  Bell,
  Menu,
  X,
  Zap,
} from 'lucide-react';

const NAV_ITEMS = [
  { href: '/', label: 'Inbox', icon: Inbox },
  { href: '/processed', label: 'Processed', icon: CheckSquare },
  { href: '/settings', label: 'Settings', icon: Settings },
  { href: '/agents', label: 'Agents', icon: Bot },
  { href: '/templates', label: 'Templates', icon: FileText },
  { href: '/profile', label: 'Profile', icon: User },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-navy-light/80 backdrop-blur-sm border border-card-border text-foreground/60 lg:hidden cursor-pointer"
      >
        {mobileOpen ? <X size={18} /> : <Menu size={18} />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed top-0 left-0 z-40 flex h-screen w-60 flex-shrink-0 flex-col border-r border-card-border bg-navy-deep transition-transform duration-300 lg:static lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b border-card-border px-5 py-4">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-teal/20 to-cyan/20 border border-teal/20">
            <Zap size={16} className="text-teal" />
          </div>
          <span className="text-sm font-bold tracking-tight text-foreground">
            TravelAgent AI
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          {NAV_ITEMS.map((item) => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                  active
                    ? 'bg-teal/10 text-teal'
                    : 'text-foreground/45 hover:bg-white/[0.03] hover:text-foreground/70'
                }`}
              >
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom */}
        <div className="border-t border-card-border px-4 py-3">
          <div className="flex items-center justify-between px-2">
            <button className="relative text-foreground/35 hover:text-foreground/55 cursor-pointer transition-colors">
              <Bell size={18} />
              <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-teal text-[9px] font-bold text-navy-deep">
                3
              </span>
            </button>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-teal/30 to-cyan/30 text-xs font-bold text-teal">
              AT
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
