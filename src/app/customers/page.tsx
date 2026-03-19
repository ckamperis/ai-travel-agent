'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Users,
  Inbox,
  Trash2,
  Plus,
  ChevronDown,
  ChevronUp,
  Globe,
  Tag,
  X,
} from 'lucide-react';
import {
  loadCustomers,
  saveCustomers,
  LANGUAGES,
  type KnownCustomer,
} from '@/lib/settings';
import * as db from '@/lib/db';
import { useToast } from '@/components/Toast';

/* ================================================================
   Constants
   ================================================================ */

const AVAILABLE_TAGS = [
  'VIP',
  'Group travel',
  'Budget',
  'Luxury',
  'Business',
  'Repeat customer',
] as const;

const TAG_COLORS: Record<string, { bg: string; text: string }> = {
  VIP: { bg: 'var(--color-primary-light)', text: 'var(--color-primary)' },
  'Group travel': { bg: 'var(--color-purple-light)', text: 'var(--color-purple)' },
  Budget: { bg: 'var(--color-amber-light)', text: 'var(--color-amber)' },
  Luxury: { bg: 'color-mix(in srgb, var(--color-pink) 10%, transparent)', text: 'var(--color-pink)' },
  Business: { bg: 'var(--color-primary-light)', text: 'var(--color-primary)' },
  'Repeat customer': { bg: 'var(--color-green-light)', text: 'var(--color-green)' },
};

/* ================================================================
   Helpers
   ================================================================ */

function relativeDate(iso: string): string {
  const now = Date.now();
  const then = new Date(iso).getTime();
  const days = Math.floor((now - then) / 86_400_000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

function fmtTripDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  } catch {
    return iso;
  }
}

function langLabel(code: string): string {
  const found = LANGUAGES.find((l) => l.value === code);
  return found ? found.label : code;
}

/* ================================================================
   Customer Card Sub-component
   ================================================================ */

function CustomerCard({
  customer,
  onUpdate,
  onDelete,
}: {
  customer: KnownCustomer;
  onUpdate: (email: string, patch: Partial<KnownCustomer>) => void;
  onDelete: (email: string) => void;
}) {
  const { addToast } = useToast();
  const [expanded, setExpanded] = useState(false);
  const [showTagDropdown, setShowTagDropdown] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [notes, setNotes] = useState(customer.notes);
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  /* close tag dropdown on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowTagDropdown(false);
      }
    }
    if (showTagDropdown) {
      document.addEventListener('mousedown', handleClick);
      return () => document.removeEventListener('mousedown', handleClick);
    }
  }, [showTagDropdown]);

  const addTag = (tag: string) => {
    if (!customer.tags.includes(tag)) {
      onUpdate(customer.email, { tags: [...customer.tags, tag] });
      addToast(`Tag "${tag}" added`, 'success');
    }
    setShowTagDropdown(false);
  };

  const removeTag = (tag: string) => {
    onUpdate(customer.email, { tags: customer.tags.filter((t) => t !== tag) });
    addToast(`Tag "${tag}" removed`, 'info');
  };

  const saveNotes = () => {
    if (notes !== customer.notes) {
      onUpdate(customer.email, { notes });
      addToast('Notes saved', 'success');
    }
  };

  const handleDelete = () => {
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    onDelete(customer.email);
    addToast(`Customer "${customer.name}" deleted`, 'info');
  };

  /* Trip summary */
  const tripCount = customer.trips.length;
  const lastTrip = customer.trips[customer.trips.length - 1];
  const tripSummary =
    tripCount > 0 && lastTrip
      ? `${tripCount} trip${tripCount !== 1 ? 's' : ''} — last: ${lastTrip.destination} (${fmtTripDate(lastTrip.date)})`
      : 'No trips yet';

  const availableTags = AVAILABLE_TAGS.filter((t) => !customer.tags.includes(t));

  const inputStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text)',
  };

  return (
    <div className="glass-card p-5 transition-colors duration-150">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        {/* Left -- Info */}
        <div className="flex-1 min-w-0">
          {/* Name + email */}
          <p className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
            {customer.name}
          </p>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            {customer.email}
          </p>

          {/* Tags */}
          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            {customer.tags.map((tag) => {
              const colors = TAG_COLORS[tag] || { bg: 'var(--color-bg-secondary)', text: 'var(--color-text-secondary)' };
              return (
                <span
                  key={tag}
                  className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                  style={{ background: colors.bg, color: colors.text }}
                >
                  {tag}
                  <button
                    onClick={() => removeTag(tag)}
                    className="ml-0.5 hover:opacity-70 cursor-pointer"
                  >
                    <X size={10} />
                  </button>
                </span>
              );
            })}

            {/* Add tag */}
            {availableTags.length > 0 && (
              <div className="relative" ref={dropdownRef}>
                <button
                  onClick={() => setShowTagDropdown(!showTagDropdown)}
                  className="inline-flex items-center gap-1 rounded-full border border-dashed px-2 py-0.5 text-[11px] transition-colors cursor-pointer"
                  style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-muted)' }}
                >
                  <Plus size={10} />
                  Tag
                </button>

                {showTagDropdown && (
                  <div
                    className="absolute left-0 top-full mt-1 z-20 min-w-[160px] rounded-lg shadow-xl animate-fade-in"
                    style={{ background: 'var(--color-card)', border: '1px solid var(--color-border)' }}
                  >
                    {availableTags.map((tag) => {
                      const colors = TAG_COLORS[tag] || { bg: '', text: 'var(--color-text-secondary)' };
                      return (
                        <button
                          key={tag}
                          onClick={() => addTag(tag)}
                          className="flex w-full items-center gap-2 px-3 py-2 text-xs transition-colors cursor-pointer first:rounded-t-lg last:rounded-b-lg"
                          style={{ color: colors.text }}
                        >
                          <Tag size={11} />
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Meta row */}
          <div className="mt-3 flex flex-wrap items-center gap-4 text-xs" style={{ color: 'var(--color-text-muted)' }}>
            <span>{tripSummary}</span>
            <span className="inline-flex items-center gap-1">
              <Globe size={11} style={{ color: 'var(--color-text-muted)' }} />
              {langLabel(customer.preferredLanguage)}
            </span>
            <span>Last contact: {relativeDate(customer.lastContact)}</span>
          </div>
        </div>

        {/* Right -- Actions */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={() => setExpanded(!expanded)}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs transition-colors cursor-pointer"
            style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}
          >
            {expanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            Notes
          </button>

          <button
            onClick={handleDelete}
            onBlur={() => setConfirmDelete(false)}
            className="inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
            style={
              confirmDelete
                ? { background: 'var(--color-red-light)', color: 'var(--color-red)' }
                : { background: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }
            }
          >
            <Trash2 size={13} />
            {confirmDelete ? 'Confirm?' : 'Delete'}
          </button>
        </div>
      </div>

      {/* Expanded: Notes */}
      {expanded && (
        <div className="mt-4 animate-fade-in">
          <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-muted)' }}>
            Notes
          </label>
          <textarea
            ref={notesRef}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={saveNotes}
            rows={3}
            placeholder="Add notes about this customer..."
            className="w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors resize-none"
            style={inputStyle}
          />
        </div>
      )}
    </div>
  );
}

/* ================================================================
   Customers Page
   ================================================================ */

export default function CustomersPage() {
  const { addToast } = useToast();
  const [customers, setCustomers] = useState<KnownCustomer[]>([]);

  const reload = useCallback(async () => {
    // Try Supabase first, fallback to localStorage
    const sbCustomers = await db.getCustomers();
    if (sbCustomers && sbCustomers.length > 0) {
      // Map Supabase rows to KnownCustomer shape for UI compatibility
      setCustomers(sbCustomers.map(c => ({
        email: c.email, name: c.name, tags: c.tags || [],
        notes: c.notes || '', trips: [], preferredLanguage: c.language || 'en',
        preferredTone: c.preferred_tone || 'professional', lastContact: c.updated_at,
      })));
    } else {
      setCustomers(loadCustomers());
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  /* -- Mutators ----------------------------------------------- */

  const handleUpdate = (email: string, patch: Partial<KnownCustomer>) => {
    const updated = customers.map((c) =>
      c.email === email ? { ...c, ...patch } : c,
    );
    saveCustomers(updated);
    setCustomers(updated);
  };

  const handleDelete = (email: string) => {
    const updated = customers.filter((c) => c.email !== email);
    saveCustomers(updated);
    setCustomers(updated);
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 animate-fade-in">
      {/* -- Header --------------------------------------------- */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: 'var(--color-purple-light)' }}
          >
            <Users size={18} style={{ color: 'var(--color-purple)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Customers
          </h1>
        </div>
        <p className="text-sm ml-12" style={{ color: 'var(--color-text-muted)' }}>
          {customers.length} customer{customers.length !== 1 ? 's' : ''} in your database
        </p>
      </div>

      {/* -- Empty State ---------------------------------------- */}
      {customers.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl mb-4"
            style={{ background: 'var(--color-bg-secondary)' }}
          >
            <Inbox size={32} style={{ color: 'var(--color-text-muted)' }} />
          </div>
          <p className="text-sm font-medium" style={{ color: 'var(--color-text-muted)' }}>
            No customers yet
          </p>
          <p className="mt-1 text-xs max-w-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.7 }}>
            Process your first email to start building your customer database.
          </p>
        </div>
      )}

      {/* -- Customer List -------------------------------------- */}
      {customers.length > 0 && (
        <div className="space-y-3">
          {customers.map((customer, i) => (
            <div
              key={customer.email}
              className={`animate-fade-in-up stagger-${Math.min(i + 1, 6)}`}
            >
              <CustomerCard
                customer={customer}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            </div>
          ))}
        </div>
      )}

      {/* Footer count */}
      {customers.length > 0 && (
        <p className="mt-4 text-center text-xs" style={{ color: 'var(--color-text-muted)' }}>
          Showing {customers.length} customer{customers.length !== 1 ? 's' : ''}
        </p>
      )}

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          &copy; 2026 Revival SA — Voyager AI
        </p>
      </div>
    </div>
  );
}
