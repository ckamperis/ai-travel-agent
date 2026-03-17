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

function languageBadgeColor(code: string): string {
  const map: Record<string, string> = {
    en: 'bg-cyan/10 text-cyan',
    de: 'bg-amber/10 text-amber',
    el: 'bg-teal/10 text-teal',
    fr: 'bg-purple/10 text-purple',
    it: 'bg-green/10 text-green',
    es: 'bg-pink/10 text-pink',
  };
  return map[code] ?? 'bg-foreground/10 text-foreground/50';
}

interface FormState {
  name: string;
  language: string;
  content: string;
}

const EMPTY_FORM: FormState = { name: '', language: 'en', content: '' };

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
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-pink/10">
              <FileText size={18} className="text-pink" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Templates</h1>
          </div>
          <p className="text-sm text-foreground/40 ml-12">
            Manage email response templates with variable placeholders
          </p>
        </div>

        {!showForm && (
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal to-cyan px-4 py-2 text-sm font-semibold text-navy-deep transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer"
          >
            <Plus size={16} />
            Create Template
          </button>
        )}
      </div>

      {/* ── Inline Form ──────────────────────────────────────── */}
      {showForm && (
        <div className="glass-card mb-8 p-6 animate-fade-in-up">
          <div className="mb-5 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground/70">
              {editingId ? 'Edit Template' : 'New Template'}
            </h2>
            <button
              onClick={cancelForm}
              className="text-foreground/30 hover:text-foreground/60 cursor-pointer"
            >
              <X size={18} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              {/* Name */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground/50">
                  Template Name
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g. Welcome Response"
                  className="w-full rounded-lg border border-card-border bg-navy-deep/50 px-4 py-2.5 text-sm text-foreground/80 outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/20"
                />
              </div>

              {/* Language */}
              <div>
                <label className="mb-1.5 block text-xs font-medium text-foreground/50">
                  Language
                </label>
                <select
                  value={form.language}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, language: e.target.value }))
                  }
                  className="w-full rounded-lg border border-card-border bg-navy-deep/50 px-4 py-2.5 text-sm text-foreground/80 outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/20"
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
              <label className="mb-1.5 block text-xs font-medium text-foreground/50">
                Content
              </label>
              <textarea
                value={form.content}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, content: e.target.value }))
                }
                rows={8}
                placeholder="Write your template here using variables like {{guest_name}} ..."
                className="w-full rounded-lg border border-card-border bg-navy-deep/50 px-4 py-2.5 text-sm text-foreground/80 outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/20 resize-none font-mono"
              />
            </div>

            {/* Variables hint */}
            <div className="flex items-start gap-2 rounded-lg bg-navy-deep/40 px-4 py-3">
              <Code size={14} className="mt-0.5 flex-shrink-0 text-teal/60" />
              <div>
                <p className="text-[11px] font-medium text-foreground/40 mb-1.5">
                  Available Variables
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {VARIABLES.map((v) => (
                    <code
                      key={v}
                      className="rounded bg-teal/8 px-1.5 py-0.5 text-[11px] text-teal/70 font-mono"
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
                className="rounded-lg border border-card-border px-4 py-2 text-sm font-medium text-foreground/50 transition-colors hover:text-foreground/70 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal to-cyan px-5 py-2 text-sm font-semibold text-navy-deep transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer"
              >
                <Save size={14} />
                {editingId ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Template List ────────────────────────────────────── */}
      <div className="space-y-3">
        {templates.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText size={40} className="text-foreground/10 mb-3" />
            <p className="text-sm text-foreground/30">
              No templates yet. Create your first one.
            </p>
          </div>
        )}

        {templates.map((tpl) => (
          <div
            key={tpl.id}
            className="glass-card overflow-hidden transition-all duration-200 hover:border-card-border/40"
          >
            {/* Row */}
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2.5">
                  <h3 className="text-sm font-medium text-foreground/80 truncate">
                    {tpl.name}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${languageBadgeColor(
                      tpl.language
                    )}`}
                  >
                    {languageLabel(tpl.language)}
                  </span>
                  {tpl.isDefault && (
                    <span className="rounded-full bg-foreground/5 px-2 py-0.5 text-[10px] font-medium text-foreground/30">
                      Default
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-foreground/30 truncate">
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
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/30 hover:bg-white/[0.04] hover:text-foreground/50 cursor-pointer transition-colors"
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
                  className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground/30 hover:bg-white/[0.04] hover:text-foreground/50 cursor-pointer transition-colors"
                >
                  <Pencil size={14} />
                </button>
                {/* Delete */}
                <button
                  onClick={() => handleDelete(tpl.id)}
                  disabled={tpl.isDefault}
                  className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                    tpl.isDefault
                      ? 'text-foreground/10 cursor-not-allowed'
                      : 'text-foreground/30 hover:bg-red-500/10 hover:text-red-400 cursor-pointer'
                  }`}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Expanded content */}
            {expandedId === tpl.id && (
              <div className="border-t border-card-border/30 bg-navy-deep/20 px-5 py-4 animate-fade-in">
                <pre className="whitespace-pre-wrap text-xs leading-relaxed text-foreground/45 font-mono">
                  {tpl.content}
                </pre>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
