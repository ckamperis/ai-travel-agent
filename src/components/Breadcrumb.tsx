'use client';

import { ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

export default function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav className="flex items-center gap-1.5 text-sm mb-6">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={14} style={{ color: 'var(--color-text-muted)' }} />}
          {item.onClick ? (
            <button onClick={item.onClick} className="cursor-pointer transition-colors"
              style={{ color: 'var(--color-text-muted)' }}>
              {item.label}
            </button>
          ) : (
            <span className="font-medium" style={{ color: 'var(--color-text-secondary)' }}>
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
