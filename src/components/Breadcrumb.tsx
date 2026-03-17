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
          {i > 0 && <ChevronRight size={14} className="text-foreground/15" />}
          {item.onClick ? (
            <button
              onClick={item.onClick}
              className="text-foreground/35 hover:text-foreground/60 cursor-pointer transition-colors"
            >
              {item.label}
            </button>
          ) : (
            <span className="text-foreground/70 font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
