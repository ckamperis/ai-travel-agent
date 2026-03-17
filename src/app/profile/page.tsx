'use client';

import { useState, useEffect } from 'react';
import { User, Save, Building, Mail, Upload } from 'lucide-react';
import { loadProfile, saveProfile, type Profile } from '@/lib/settings';
import { useToast } from '@/components/Toast';

/* Shared input styles */
const inputClass = 'w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors';

const inputStyle: React.CSSProperties = {
  background: 'var(--color-surface)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text)',
};

export default function ProfilePage() {
  const { addToast } = useToast();
  const [profile, setProfile] = useState<Profile | null>(null);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  if (!profile) return null;

  const update = <K extends keyof Profile>(key: K, value: Profile[K]) => {
    setProfile((prev) => (prev ? { ...prev, [key]: value } : prev));
  };

  const handleSave = () => {
    if (profile) {
      saveProfile(profile);
      addToast('Profile saved successfully', 'success');
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: 'var(--color-primary-light)' }}
          >
            <User size={18} style={{ color: 'var(--color-primary)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Profile
          </h1>
        </div>
        <p className="text-sm ml-12" style={{ color: 'var(--color-text-muted)' }}>
          Your agency and agent details used in email responses
        </p>
      </div>

      <div className="space-y-6">
        {/* -- Agency Info ---------------------------------------- */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Building size={16} style={{ color: 'var(--color-primary)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Agency Information
            </h2>
          </div>

          <div className="space-y-4">
            {/* Agency Name */}
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Agency Name
              </label>
              <input
                type="text"
                value={profile.agencyName}
                onChange={(e) => update('agencyName', e.target.value)}
                placeholder="e.g. Afea Travel"
                className={inputClass}
                style={inputStyle}
              />
            </div>

            {/* Agent Name */}
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Agent Name
              </label>
              <input
                type="text"
                value={profile.agentName}
                onChange={(e) => update('agentName', e.target.value)}
                placeholder="e.g. Maria"
                className={inputClass}
                style={inputStyle}
              />
              <p className="mt-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                This name will be used in the email signature
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2"
                  style={{ color: 'var(--color-text-muted)' }}
                />
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="info@afea-travel.com"
                  className="w-full rounded-lg border pl-10 pr-4 py-2.5 text-sm outline-none transition-colors"
                  style={inputStyle}
                />
              </div>
            </div>
          </div>
        </section>

        {/* -- Logo Upload --------------------------------------- */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Upload size={16} style={{ color: 'var(--color-purple)' }} />
            <h2 className="text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
              Agency Logo
            </h2>
          </div>

          <div
            className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-10 text-center"
            style={{ borderColor: 'var(--color-border)', background: 'var(--color-bg-secondary)' }}
          >
            <div
              className="flex h-12 w-12 items-center justify-center rounded-full mb-3"
              style={{ background: 'var(--color-bg-secondary)' }}
            >
              <Upload size={20} style={{ color: 'var(--color-text-muted)' }} />
            </div>
            <p className="text-sm" style={{ color: 'var(--color-text-muted)' }}>
              Logo upload coming soon
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)', opacity: 0.6 }}>
              PNG, JPG or SVG, max 2MB
            </p>
          </div>
        </section>

        {/* -- Preview ------------------------------------------- */}
        <section className="glass-card p-6">
          <h2 className="mb-4 text-sm font-semibold" style={{ color: 'var(--color-text-secondary)' }}>
            Preview
          </h2>
          <div
            className="rounded-lg px-5 py-4"
            style={{ background: 'var(--color-bg-secondary)' }}
          >
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              <span className="font-semibold" style={{ color: 'var(--color-text)' }}>
                {profile.agentName || 'Agent'}
              </span>{' '}
              from{' '}
              <span className="font-semibold" style={{ color: 'var(--color-primary)' }}>
                {profile.agencyName || 'Agency'}
              </span>
            </p>
            <p className="mt-1 text-xs" style={{ color: 'var(--color-text-muted)' }}>
              {profile.email || 'email@example.com'}
            </p>
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
            Save Profile
          </button>
        </div>
      </div>

      {/* Footer */}
      <div className="mt-4 text-center pb-4">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          &copy; 2026 Revival SA — AI &amp; Business Intelligence
        </p>
      </div>
    </div>
  );
}
