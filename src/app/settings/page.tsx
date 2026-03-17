'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Globe,
  MessageSquare,
  ToggleLeft,
  SlidersHorizontal,
} from 'lucide-react';
import {
  loadSettings,
  saveSettings,
  LANGUAGES,
  type AppSettings,
} from '@/lib/settings';
import { useToast } from '@/components/Toast';

const TONES: { value: AppSettings['tone']; label: string }[] = [
  { value: 'formal', label: 'Formal' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'professional', label: 'Professional' },
];

export default function SettingsPage() {
  const { addToast } = useToast();
  const [settings, setSettings] = useState<AppSettings | null>(null);

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  if (!settings) return null;

  const update = <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = () => {
    if (settings) {
      saveSettings(settings);
      addToast('Settings saved successfully', 'success');
    }
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-teal/10">
            <Settings size={18} className="text-teal" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        </div>
        <p className="text-sm text-foreground/40 ml-12">
          Configure how the AI assistant generates responses
        </p>
      </div>

      <div className="space-y-8">
        {/* ── Language & Tone ───────────────────────────────────── */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Globe size={16} className="text-cyan" />
            <h2 className="text-sm font-semibold text-foreground/70">
              Language &amp; Tone
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Response Language */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground/50">
                Response Language
              </label>
              <select
                value={settings.responseLanguage}
                onChange={(e) => update('responseLanguage', e.target.value)}
                className="w-full rounded-lg border border-card-border bg-navy-deep/50 px-4 py-2.5 text-sm text-foreground/80 outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/20"
              >
                {LANGUAGES.map((lang) => (
                  <option key={lang.value} value={lang.value}>
                    {lang.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Tone */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground/50">
                Tone
              </label>
              <select
                value={settings.tone}
                onChange={(e) =>
                  update('tone', e.target.value as AppSettings['tone'])
                }
                className="w-full rounded-lg border border-card-border bg-navy-deep/50 px-4 py-2.5 text-sm text-foreground/80 outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/20"
              >
                {TONES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </section>

        {/* ── Email Content ────────────────────────────────────── */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <MessageSquare size={16} className="text-purple" />
            <h2 className="text-sm font-semibold text-foreground/70">
              Email Content
            </h2>
          </div>

          <div className="space-y-5">
            {/* Default Greeting */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground/50">
                Default Greeting
              </label>
              <input
                type="text"
                value={settings.defaultGreeting}
                onChange={(e) => update('defaultGreeting', e.target.value)}
                placeholder="e.g. Dear"
                className="w-full rounded-lg border border-card-border bg-navy-deep/50 px-4 py-2.5 text-sm text-foreground/80 outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/20"
              />
            </div>

            {/* Email Signature */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground/50">
                Email Signature
              </label>
              <textarea
                value={settings.emailSignature}
                onChange={(e) => update('emailSignature', e.target.value)}
                rows={3}
                className="w-full rounded-lg border border-card-border bg-navy-deep/50 px-4 py-2.5 text-sm text-foreground/80 outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/20 resize-none"
              />
            </div>
          </div>
        </section>

        {/* ── Response Toggles ─────────────────────────────────── */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <ToggleLeft size={16} className="text-green" />
            <h2 className="text-sm font-semibold text-foreground/70">
              Response Sections
            </h2>
          </div>

          <div className="space-y-4">
            {/* Include Price Breakdown */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/70">
                  Include Price Breakdown
                </p>
                <p className="text-xs text-foreground/30">
                  Show itemized costs for flights, hotels, and activities
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  update('includePriceBreakdown', !settings.includePriceBreakdown)
                }
                className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors ${
                  settings.includePriceBreakdown
                    ? 'bg-teal'
                    : 'bg-foreground/15'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    settings.includePriceBreakdown
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Include Itinerary */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/70">Include Itinerary</p>
                <p className="text-xs text-foreground/30">
                  Add a day-by-day travel itinerary to the response
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  update('includeItinerary', !settings.includeItinerary)
                }
                className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors ${
                  settings.includeItinerary ? 'bg-teal' : 'bg-foreground/15'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    settings.includeItinerary
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Include Weather Info */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-foreground/70">
                  Include Weather Info
                </p>
                <p className="text-xs text-foreground/30">
                  Add weather forecast for the destination and travel dates
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  update('includeWeatherInfo', !settings.includeWeatherInfo)
                }
                className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors ${
                  settings.includeWeatherInfo ? 'bg-teal' : 'bg-foreground/15'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    settings.includeWeatherInfo
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* ── Search Preferences ───────────────────────────────── */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <SlidersHorizontal size={16} className="text-amber" />
            <h2 className="text-sm font-semibold text-foreground/70">
              Search Preferences
            </h2>
          </div>

          <div className="space-y-6">
            {/* Max Budget Tolerance */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-foreground/50">
                  Max Budget Tolerance
                </label>
                <span className="rounded bg-teal/10 px-2 py-0.5 text-xs font-semibold text-teal tabular-nums">
                  {settings.maxBudgetTolerance}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                step={5}
                value={settings.maxBudgetTolerance}
                onChange={(e) =>
                  update('maxBudgetTolerance', Number(e.target.value))
                }
                className="w-full accent-teal"
              />
              <div className="mt-1 flex justify-between text-[10px] text-foreground/25">
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
              </div>
            </div>

            {/* Hotel Minimum Rating */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium text-foreground/50">
                  Hotel Minimum Rating
                </label>
                <span className="rounded bg-amber/10 px-2 py-0.5 text-xs font-semibold text-amber tabular-nums">
                  {settings.hotelMinRating.toFixed(1)}
                </span>
              </div>
              <input
                type="range"
                min={7.0}
                max={9.5}
                step={0.5}
                value={settings.hotelMinRating}
                onChange={(e) =>
                  update('hotelMinRating', Number(e.target.value))
                }
                className="w-full accent-amber"
              />
              <div className="mt-1 flex justify-between text-[10px] text-foreground/25">
                <span>7.0</span>
                <span>8.0</span>
                <span>9.0</span>
                <span>9.5</span>
              </div>
            </div>
          </div>
        </section>

        {/* ── Save ─────────────────────────────────────────────── */}
        <div className="flex justify-end pb-6">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal to-cyan px-6 py-2.5 text-sm font-semibold text-navy-deep transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer"
          >
            <Save size={16} />
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
}
