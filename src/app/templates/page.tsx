'use client';

import { useState, useEffect } from 'react';
import {
  FileText,
  Plus,
  Pencil,
  Trash2,
  X,
  Save,
  Code,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  loadTemplates,
  saveTemplates,
  LANGUAGES,
  type EmailTemplate,
} from '@/lib/settings';
import { useToast } from '@/components/Toast';

const VARIABLES = [
  '{{guest_name}}',
  '{{flight_details}}',
  '{{hotel_name}}',
  '{{itinerary}}',
  '{{places}}',
  '{{signature}}',
  '{{greeting}}',
  '{{hotel_details}}',
];

function languageLabel(code: string): string {
  return LANGUAGES.find((l) => l.value === code)?.label ?? code;
}

function languageBadgeStyle(code: string): React.CSSProperties {
  const map: Record<string, { bg: string; text: string }> = {
    en: { bg: 'var(--color-primary-light)', text: 'var(--color-primary)' },
    de: { bg: 'var(--color-amber-light)', text: 'var(--color-amber)' },
    el: { bg: 'var(--color-primary-light)', text: 'var(--color-primary)' },
    fr: { bg: 'var(--color-purple-light)', text: 'var(--color-purple)' },
    it: { bg: 'var(--color-green-light)', text: 'var(--color-green)' },
    es: { bg: 'color-mix(in srgb, var(--color-pink) 10%, transparent)', text: 'var(--color-pink)' },
  };
  const colors = map[code] ?? { bg: 'var(--color-bg-secondary)', text: 'var(--color-text-secondary)' };
  return { background: colors.bg, color: colors.text };
}

interface FormState {
  name: string;
  language: string;
  content: string;
}

const EMPTY_FORM: FormState = { name: '', language: 'en', content: '' };

/* Shared input styles */
const inputClass = 'w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors';

const inputStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text)',
};

export default function TemplatesPage() {
  const { addToast } = useToast();
  const [templates, setTemplates] = useState<EmailTemplate[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    setTemplates(loadTemplates());
  }, []);

  const persist = (updated: EmailTemplate[]) => {
    setTemplates(updated);
    saveTemplates(updated);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (tpl: EmailTemplate) => {
    setEditingId(tpl.id);
    setForm({ name: tpl.name, language: tpl.language, content: tpl.content });
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSave = () => {
    if (!form.name.trim() || !form.content.trim()) {
      addToast('Name and content are required', 'error');
      return;
    }

    if (editingId) {
      const updated = templates.map((t) =>
        t.id === editingId
          ? { ...t, name: form.name, language: form.language, content: form.content }
          : t
      );
      persist(updated);
      addToast('Template updated', 'success');
    } else {
      const newTemplate: EmailTemplate = {
        id: `tpl-${Date.now()}`,
        name: form.name,
        language: form.language,
        content: form.content,
        isDefault: false,
      };
      persist([...templates, newTemplate]);
      addToast('Template created', 'success');
    }

    cancelForm();
  };

  const handleDelete = (id: string) => {
    const tpl = templates.find((t) => t.id === id);
    if (tpl?.isDefault) {
      addToast('Default templates cannot be deleted', 'error');
      return;
    }
    persist(templates.filter((t) => t.id !== id));
    addToast('Template deleted', 'success');
    if (editingId === id) cancelForm();
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div
              className="flex h-9 w-9 items-center justify-center rounded-lg"
              style={{ background: 'color-mix(in srgb, var(--color-pink) 10%, transparent)' }}
            >
              <FileText size={18} style={{ color: 'var(--color-pink)' }} />
            </div>
            <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
              Templates
            </h1>
          </div>
          <p className="text-sm ml-12" style={{ color: 'var(--color-text-muted)' }}>
            Manage email response templates with variable placeholders
          </p>
        </div>

        {!showForm && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer"
            style={{ background: 'var(--color-primary)', color: '#FFFFFF' }}
          >
            <Plus size={16} />
            Create Template
          </button>
        )}
      </div>

      {/* -- Inline Form ----------------------------------------- */}
      {showForm && (
        <div className="glass-card mb-8 p-6 animate-fade-in-up">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              {editingId ? 'Edit Template' : 'New Template'}
            </h2>
            <button
              onClick={cancelForm}
              className="cursor-pointer transition-colors"
              style={{ color: 'var(--color-text-muted)' }}
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Template Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Welcome Response"
                  className={inputClass}
                  style={inputStyle}
                />
              </div>

              {/* Language */}
              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Language
                </label>
                <select
                  value={form.language}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, language: e.target.value }))
                  }
                  className={inputClass}
                  style={inputStyle}
                >
                  {LANGUAGES.map((lang) => (
                    <option key={lang.value} value={lang.value}>
                      {lang.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Content */}
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Content
              </label>
              <textarea
                value={form.content}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, content: e.target.value }))
                }
                rows={8}
                placeholder="Write your template here using variables like {{guest_name}} ..."
                className={`${inputClass} resize-none font-mono`}
                style={inputStyle}
              />
            </div>

            {/* Variables hint */}
            <div
              className="flex items-start gap-2 rounded-lg px-4 py-3"
              style={{ background: 'var(--color-bg-secondary)' }}
            >
              <Code size={14} className="mt-0.5 flex-shrink-0" style={{ color: 'var(--color-primary)', opacity: 0.6 }} />
              <div>
                <p className="text-[11px] font-medium mb-1.5" style={{ color: 'var(--color-text-muted)' }}>
                  Available Variables
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <code
                      key={v}
                      className="rounded px-1.5 py-0.5 text-[11px] font-mono"
                      style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
                    >
                      {v}
                    </code>
                  ))}
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={cancelForm}
                className="rounded-lg border px-4 py-2 text-sm font-medium transition-colors cursor-pointer"
                style={{ borderColor: 'var(--color-border)', color: 'var(--color-text-secondary)' }}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-lg px-5 py-2 text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer"
                style={{ background: 'var(--color-primary)', color: '#FFFFFF' }}
              >
                <Save size={14} />
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* -- Template List --------------------------------------- */}
      <div className="space-y-3">
        {templates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={40} style={{ color: 'var(--color-text-muted)', opacity: 0.3 }} className="mb-3" />
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              No templates yet. Create your first one.
            </p>
          </div>
        )}

        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="glass-card overflow-hidden transition-all duration-200"
          >
            {/* Row */}
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-medium truncate" style={{ color: 'var(--color-text)' }}>
                    {tpl.name}
                  </h3>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider"
                    style={languageBadgeStyle(tpl.language)}
                  >
                    {languageLabel(tpl.language)}
                  </span>
                  {tpl.isDefault && (
                    <span
                      className="rounded-full px-2 py-0.5 text-[10px] font-medium"
                      style={{ background: 'var(--color-bg-secondary)', color: 'var(--color-text-muted)' }}
                    >
                      Default
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs truncate" style={{ color: 'var(--color-text-muted)' }}>
                  {tpl.content.slice(0, 100)}
                  {tpl.content.length > 100 ? '...' : ''}
                </p>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                {/* Expand/Collapse */}
                <button
                  onClick={() =>
                    setExpandedId(expandedId === tpl.id ? null : tpl.id)
                  }
                  className="flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {expandedId === tpl.id ? (
                    <ChevronUp size={16} />
                  ) : (
                    <ChevronDown size={16} />
                  )}
                </button>
                {/* Edit */}
                <button
                  onClick={() => openEdit(tpl)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg cursor-pointer transition-colors"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <Pencil size={14} />
                </button>
                {/* Delete */}
                <button
                  onClick={() => handleDelete(tpl.id)}
                  disabled={tpl.isDefault}
                  className="flex h-8 w-8 items-center justify-center rounded-lg transition-colors"
                  style={{
                    color: tpl.isDefault ? 'var(--color-text-muted)' : 'var(--color-text-muted)',
                    opacity: tpl.isDefault ? 0.3 : 1,
                    cursor: tpl.isDefault ? 'not-allowed' : 'pointer',
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Expanded content */}
            {expandedId === tpl.id && (
              <div
                className="px-5 py-4 animate-fade-in"
                style={{ borderTop: '1px solid var(--color-border)', background: 'var(--color-bg-secondary)' }}
              >
                <pre className="whitespace-pre-wrap text-xs leading-relaxed font-mono" style={{ color: 'var(--color-text-secondary)' }}>
                  {tpl.content}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          &copy; 2026 Revival SA — Voyager AI
        </p>
      </div>
    </div>
  );
}
