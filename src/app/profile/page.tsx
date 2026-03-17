'use client';

import { useState, useEffect } from 'react';
import { User, Save, Building, Mail, Upload } from 'lucide-react';
import { loadProfile, saveProfile, type Profile } from '@/lib/settings';
import { useToast } from '@/components/Toast';

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
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan/10">
            <User size={18} className="text-cyan" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Profile</h1>
        </div>
        <p className="text-sm text-foreground/40 ml-12">
          Your agency and agent details used in email responses
        </p>
      </div>

      <div className="space-y-6">
        {/* ── Agency Info ─────────────────────────────────────── */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Building size={16} className="text-teal" />
            <h2 className="text-sm font-semibold text-foreground/70">
              Agency Information
            </h2>
          </div>

          <div className="space-y-4">
            {/* Agency Name */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground/50">
                Agency Name
              </label>
              <input
                type="text"
                value={profile.agencyName}
                onChange={(e) => update('agencyName', e.target.value)}
                placeholder="e.g. Afea Travel"
                className="w-full rounded-lg border border-card-border bg-navy-deep/50 px-4 py-2.5 text-sm text-foreground/80 outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/20"
              />
            </div>

            {/* Agent Name */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground/50">
                Agent Name
              </label>
              <input
                type="text"
                value={profile.agentName}
                onChange={(e) => update('agentName', e.target.value)}
                placeholder="e.g. Maria"
                className="w-full rounded-lg border border-card-border bg-navy-deep/50 px-4 py-2.5 text-sm text-foreground/80 outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/20"
              />
              <p className="mt-1 text-[11px] text-foreground/25">
                This name will be used in the email signature
              </p>
            </div>

            {/* Email */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-foreground/50">
                Email Address
              </label>
              <div className="relative">
                <Mail
                  size={16}
                  className="absolute left-3.5 top-1/2 -translate-y-1/2 text-foreground/25"
                />
                <input
                  type="email"
                  value={profile.email}
                  onChange={(e) => update('email', e.target.value)}
                  placeholder="info@afea-travel.com"
                  className="w-full rounded-lg border border-card-border bg-navy-deep/50 pl-10 pr-4 py-2.5 text-sm text-foreground/80 outline-none focus:border-teal/50 focus:ring-1 focus:ring-teal/20"
                />
              </div>
            </div>
          </div>
        </section>

        {/* ── Logo Upload ────────────────────────────────────── */}
        <section className="glass-card p-6">
          <div className="flex items-center gap-2 mb-5">
            <Upload size={16} className="text-purple" />
            <h2 className="text-sm font-semibold text-foreground/70">
              Agency Logo
            </h2>
          </div>

          <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-card-border/40 bg-navy-deep/20 px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-foreground/5 mb-3">
              <Upload size={20} className="text-foreground/20" />
            </div>
            <p className="text-sm text-foreground/30">
              Logo upload coming soon
            </p>
            <p className="mt-1 text-xs text-foreground/15">
              PNG, JPG or SVG, max 2MB
            </p>
          </div>
        </section>

        {/* ── Preview ────────────────────────────────────────── */}
        <section className="glass-card p-6">
          <h2 className="mb-4 text-sm font-semibold text-foreground/70">
            Preview
          </h2>
          <div className="rounded-lg bg-navy-deep/40 px-5 py-4">
            <p className="text-sm text-foreground/60">
              <span className="font-semibold text-foreground/80">
                {profile.agentName || 'Agent'}
              </span>{' '}
              from{' '}
              <span className="font-semibold text-teal/80">
                {profile.agencyName || 'Agency'}
              </span>
            </p>
            <p className="mt-1 text-xs text-foreground/30">
              {profile.email || 'email@example.com'}
            </p>
          </div>
        </section>

        {/* ── Save ───────────────────────────────────────────── */}
        <div className="flex justify-end pb-6">
          <button
            onClick={handleSave}
            className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-teal to-cyan px-6 py-2.5 text-sm font-semibold text-navy-deep transition-all hover:brightness-110 active:scale-[0.97] cursor-pointer"
          >
            <Save size={16} />
            Save Profile
          </button>
        </div>
      </div>
    </div>
  );
}
