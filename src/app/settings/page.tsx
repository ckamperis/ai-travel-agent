'use client';

import { useState, useEffect } from 'react';
import {
  Settings,
  Save,
  Globe,
  MessageSquare,
  ToggleLeft,
  SlidersHorizontal,
  Brain,
  RefreshCw,
  Users,
  Mail,
  CheckCircle,
  LogOut,
} from 'lucide-react';
import {
  loadSettings,
  saveSettings,
  LANGUAGES,
  type AppSettings,
} from '@/lib/settings';
import { useToast } from '@/components/Toast';
import { useSession, signIn, signOut } from 'next-auth/react';

const TONES: { value: AppSettings['tone']; label: string }[] = [
  { value: 'formal', label: 'Formal' },
  { value: 'friendly', label: 'Friendly' },
  { value: 'professional', label: 'Professional' },
];

/* Shared input styles */
const inputClass = 'w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors';

export default function SettingsPage() {
  const { addToast } = useToast();
  const { data: session, status: authStatus } = useSession();
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

  const inputStyle: React.CSSProperties = {
    background: 'var(--color-surface)',
    borderColor: 'var(--color-border)',
    color: 'var(--color-text)',
  };

  return (
    <div className="mx-auto max-w-3xl px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: 'var(--color-primary-light)' }}
          >
            <Settings size={18} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Settings
          </h1>
        </div>
        <p className="text-sm ml-12" style={{ color: 'var(--color-text-muted)' }}>
          Configure how the AI assistant generates responses
        </p>
      </div>

      <div className="space-y-8">
        {/* -- Email Integration --------------------------------- */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Mail size={16} style={{ color: 'var(--color-primary)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Email Integration
            </h2>
          </div>

          {authStatus === 'loading' && (
            <div className="flex items-center gap-3 py-4" style={{ color: 'var(--color-text-muted)' }}>
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
              <span className="text-sm">Checking connection...</span>
            </div>
          )}

          {authStatus === 'unauthenticated' && (
            <div className="flex items-center gap-4">
              <button
                onClick={() => signIn('google')}
                className="inline-flex items-center gap-2.5 rounded-lg px-5 py-2.5 text-sm font-medium transition-all hover:brightness-95 active:scale-[0.97] cursor-pointer"
                style={{ background: '#4285F4', color: '#fff' }}
              >
                <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#fff"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity=".7"/></svg>
                Connect Gmail
              </button>
              <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Connect your Gmail to process real customer emails
              </span>
            </div>
          )}

          {authStatus === 'authenticated' && session?.user && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1.5">
                    <span className="h-2 w-2 rounded-full" style={{ background: session.error ? 'var(--color-red)' : 'var(--color-green)' }} />
                    <span className="text-xs" style={{ color: session.error ? 'var(--color-red)' : 'var(--color-green)' }}>
                      {session.error ? 'Token expired' : 'Connected'}
                    </span>
                  </span>
                  {session.user.image && (
                    <img src={session.user.image} alt="" className="h-6 w-6 rounded-full" />
                  )}
                  <span className="text-sm font-medium" style={{ color: 'var(--color-text)' }}>
                    {session.user.email}
                  </span>
                </div>
                <button
                  onClick={() => signOut()}
                  className="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                  style={{ color: 'var(--color-red)', background: 'var(--color-red-light)' }}
                >
                  <LogOut size={12} />
                  Disconnect
                </button>
              </div>
              <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                Gmail read-only access. Your emails are processed locally — only selected emails are sent to AI for analysis.
              </p>

              {/* Filter settings */}
              <div className="mt-4 pt-4 space-y-4" style={{ borderTop: '1px solid var(--color-border)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--color-text-muted)' }}>Classification Filters</p>

                {/* Min email length */}
                <div>
                  <label className="mb-1.5 flex items-center justify-between text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                    <span>Min. email body length</span>
                    <span className="tabular-nums">{settings.gmailMinEmailLength} chars</span>
                  </label>
                  <input type="range" min={0} max={200} step={10}
                    value={settings.gmailMinEmailLength}
                    onChange={e => update('gmailMinEmailLength', parseInt(e.target.value))}
                    className="w-full" />
                  <div className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                    <span>0 (any)</span><span>200</span>
                  </div>
                </div>

                {/* Skip promotional */}
                <div className="flex items-center gap-3">
                  <button type="button"
                    onClick={() => update('gmailSkipPromotional', !settings.gmailSkipPromotional)}
                    className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors"
                    style={{ background: settings.gmailSkipPromotional ? 'var(--color-primary)' : 'var(--color-border)' }}>
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${settings.gmailSkipPromotional ? 'translate-x-6' : 'translate-x-1'}`} />
                  </button>
                  <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
                    Skip promotional &amp; automated emails
                  </span>
                </div>
              </div>
            </div>
          )}
        </section>

        {/* -- Language & Tone ----------------------------------- */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Globe size={16} style={{ color: 'var(--color-primary)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Language &amp; Tone
            </h2>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            {/* Response Language */}
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Response Language
              </label>
              <select
                value={settings.responseLanguage}
                onChange={(e) => update('responseLanguage', e.target.value)}
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

            {/* Tone */}
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Tone
              </label>
              <select
                value={settings.tone}
                onChange={(e) =>
                  update('tone', e.target.value as AppSettings['tone'])
                }
                className={inputClass}
                style={inputStyle}
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

        {/* -- Email Content ------------------------------------- */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <MessageSquare size={16} style={{ color: 'var(--color-purple)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Email Content
            </h2>
          </div>

          <div className="space-y-5">
            {/* Default Greeting */}
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Default Greeting
              </label>
              <input
                type="text"
                value={settings.defaultGreeting}
                onChange={(e) => update('defaultGreeting', e.target.value)}
                placeholder="e.g. Dear"
                className={inputClass}
                style={inputStyle}
              />
            </div>

            {/* Email Signature */}
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Email Signature
              </label>
              <textarea
                value={settings.emailSignature}
                onChange={(e) => update('emailSignature', e.target.value)}
                rows={3}
                className={`${inputClass} resize-none`}
                style={inputStyle}
              />
            </div>

            {/* Include Cost Breakdown */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Include Cost Breakdown
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Add an estimated total cost summary in the email
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  update('includeCostBreakdown', !settings.includeCostBreakdown)
                }
                className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors"
                style={{
                  background: settings.includeCostBreakdown
                    ? 'var(--color-primary)'
                    : 'var(--color-border)',
                }}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    settings.includeCostBreakdown
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* -- Response Toggles ---------------------------------- */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <ToggleLeft size={16} style={{ color: 'var(--color-green)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Response Sections
            </h2>
          </div>

          <div className="space-y-4">
            {/* Include Price Breakdown */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Include Price Breakdown
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Show itemized costs for flights, hotels, and activities
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  update('includePriceBreakdown', !settings.includePriceBreakdown)
                }
                className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors"
                style={{
                  background: settings.includePriceBreakdown
                    ? 'var(--color-primary)'
                    : 'var(--color-border)',
                }}
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
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Include Itinerary
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Add a day-by-day travel itinerary to the response
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  update('includeItinerary', !settings.includeItinerary)
                }
                className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors"
                style={{
                  background: settings.includeItinerary
                    ? 'var(--color-primary)'
                    : 'var(--color-border)',
                }}
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
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Include Weather Info
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Add weather forecast for the destination and travel dates
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  update('includeWeatherInfo', !settings.includeWeatherInfo)
                }
                className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors"
                style={{
                  background: settings.includeWeatherInfo
                    ? 'var(--color-primary)'
                    : 'var(--color-border)',
                }}
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

        {/* -- AI Behavior --------------------------------------- */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Brain size={16} style={{ color: 'var(--color-primary)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              AI Behavior
            </h2>
          </div>

          <div className="space-y-5">
            {/* AI Review Mode */}
            <div>
              <label className="mb-2 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                AI Review Mode
              </label>
              <div className="space-y-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="aiReviewMode"
                    value="manual"
                    checked={settings.aiReviewMode === 'manual'}
                    onChange={() => update('aiReviewMode', 'manual')}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Manual review (recommended)
                  </span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="radio"
                    name="aiReviewMode"
                    value="auto"
                    checked={settings.aiReviewMode === 'auto'}
                    onChange={() => update('aiReviewMode', 'auto')}
                    style={{ accentColor: 'var(--color-primary)' }}
                  />
                  <span className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                    Auto-compose
                  </span>
                </label>
                {settings.aiReviewMode === 'auto' && (
                  <p className="ml-6 text-xs" style={{ color: 'var(--color-amber)' }}>
                    AI will automatically compose responses without review
                  </p>
                )}
              </div>
            </div>

            {/* Response Length */}
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Response Length
              </label>
              <select
                value={settings.responseLength}
                onChange={(e) =>
                  update('responseLength', e.target.value as AppSettings['responseLength'])
                }
                className={inputClass}
                style={inputStyle}
              >
                <option value="concise">Concise</option>
                <option value="standard">Standard</option>
                <option value="detailed">Detailed</option>
              </select>
            </div>
          </div>
        </section>

        {/* -- Follow-up ----------------------------------------- */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <RefreshCw size={16} style={{ color: 'var(--color-green)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Follow-up
            </h2>
          </div>

          <div className="space-y-4">
            {/* Auto Follow-up */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Auto Follow-up
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Automatically schedule follow-up emails for unanswered proposals
                </p>
              </div>
              <button
                type="button"
                onClick={() => update('autoFollowUp', !settings.autoFollowUp)}
                className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors"
                style={{
                  background: settings.autoFollowUp
                    ? 'var(--color-primary)'
                    : 'var(--color-border)',
                }}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    settings.autoFollowUp
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Follow-up After (days) */}
            {settings.autoFollowUp && (
              <div>
                <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Follow-up After (days)
                </label>
                <input
                  type="number"
                  min={1}
                  max={30}
                  value={settings.followUpDays}
                  onChange={(e) => update('followUpDays', Number(e.target.value))}
                  className="w-32 rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors"
                  style={inputStyle}
                />
              </div>
            )}
          </div>
        </section>

        {/* -- Customer ------------------------------------------ */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Users size={16} style={{ color: 'var(--color-purple)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Customer
            </h2>
          </div>

          <div className="space-y-4">
            {/* Customer Recognition */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
                  Customer Recognition
                </p>
                <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
                  Automatically recognize returning customers and personalize responses
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  update('customerRecognition', !settings.customerRecognition)
                }
                className="relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors"
                style={{
                  background: settings.customerRecognition
                    ? 'var(--color-primary)'
                    : 'var(--color-border)',
                }}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    settings.customerRecognition
                      ? 'translate-x-6'
                      : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </section>

        {/* -- Search Preferences -------------------------------- */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <SlidersHorizontal size={16} style={{ color: 'var(--color-amber)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Search Preferences
            </h2>
          </div>

          <div className="space-y-6">
            {/* Max Budget Tolerance */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Max Budget Tolerance
                </label>
                <span
                  className="rounded px-2 py-0.5 text-xs font-semibold tabular-nums"
                  style={{ background: 'var(--color-primary-light)', color: 'var(--color-primary)' }}
                >
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
                className="w-full"
                style={{ accentColor: 'var(--color-primary)' }}
              />
              <div className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                <span>0%</span>
                <span>25%</span>
                <span>50%</span>
              </div>
            </div>

            {/* Hotel Minimum Rating */}
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                  Hotel Minimum Rating
                </label>
                <span
                  className="rounded px-2 py-0.5 text-xs font-semibold tabular-nums"
                  style={{ background: 'var(--color-amber-light)', color: 'var(--color-amber)' }}
                >
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
                className="w-full"
                style={{ accentColor: 'var(--color-amber)' }}
              />
              <div className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
                <span>7.0</span>
                <span>8.0</span>
                <span>9.0</span>
                <span>9.5</span>
              </div>
            </div>
          </div>
        </section>

        {/* -- Save ---------------------------------------------- */}
        <div className="flex justify-end pb-6">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg px-6 py-2.5 text-sm font-semibold transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer"
            style={{ background: 'var(--color-primary)', color: '#FFFFFF' }}
          >
            <Save size={16} />
            Save Settings
          </button>
        </div>
      </div>

      {/* -- Footer --------------------------------------------- */}
      <div className="mt-4 text-center pb-4">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          &copy; 2026 Revival SA — AI &amp; Business Intelligence
        </p>
      </div>
    </div>
  );
}
