/* ================================================================
   Settings, Profile, Templates, History — all localStorage-backed
   ================================================================ */

// ── App Settings ──────────────────────────────────────────────────

export interface AppSettings {
  responseLanguage: string;
  tone: 'formal' | 'friendly' | 'professional';
  emailSignature: string;
  defaultGreeting: string;
  includePriceBreakdown: boolean;
  includeItinerary: boolean;
  includeWeatherInfo: boolean;
  maxBudgetTolerance: number;
  preferredAirlines: string[];
  hotelMinRating: number;
}

export const DEFAULT_SETTINGS: AppSettings = {
  responseLanguage: 'en',
  tone: 'professional',
  emailSignature: 'Best regards,\nAfea Travel Team',
  defaultGreeting: 'Dear',
  includePriceBreakdown: true,
  includeItinerary: true,
  includeWeatherInfo: false,
  maxBudgetTolerance: 20,
  preferredAirlines: [],
  hotelMinRating: 7.5,
};

export function loadSettings(): AppSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS;
  try {
    const s = localStorage.getItem('ta-settings');
    if (s) return { ...DEFAULT_SETTINGS, ...JSON.parse(s) };
  } catch { /* ignore */ }
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: AppSettings): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ta-settings', JSON.stringify(settings));
}

// ── Profile ───────────────────────────────────────────────────────

export interface Profile {
  agencyName: string;
  agentName: string;
  email: string;
}

export const DEFAULT_PROFILE: Profile = {
  agencyName: 'Afea Travel',
  agentName: 'Maria',
  email: 'info@afea-travel.com',
};

export function loadProfile(): Profile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE;
  try {
    const s = localStorage.getItem('ta-profile');
    if (s) return { ...DEFAULT_PROFILE, ...JSON.parse(s) };
  } catch { /* ignore */ }
  return { ...DEFAULT_PROFILE };
}

export function saveProfile(profile: Profile): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ta-profile', JSON.stringify(profile));
}

// ── Email Templates ───────────────────────────────────────────────

export interface EmailTemplate {
  id: string;
  name: string;
  language: string;
  content: string;
  isDefault: boolean;
}

export const DEFAULT_TEMPLATES: EmailTemplate[] = [
  {
    id: 'default-en',
    name: 'Standard Response (English)',
    language: 'en',
    content: `{{greeting}} {{guest_name}},

Thank you for your inquiry! We're excited to help you plan your trip.

{{flight_details}}

{{hotel_details}}

{{itinerary}}

{{places}}

Please let us know if you'd like to proceed with these arrangements or if you have any changes in mind.

{{signature}}`,
    isDefault: true,
  },
  {
    id: 'default-de',
    name: 'Standardantwort (Deutsch)',
    language: 'de',
    content: `{{greeting}} {{guest_name}},

vielen Dank fuer Ihre Anfrage! Wir freuen uns, Ihnen bei der Planung Ihrer Reise helfen zu koennen.

{{flight_details}}

{{hotel_details}}

{{itinerary}}

{{places}}

Bitte lassen Sie uns wissen, ob Sie mit diesen Arrangements fortfahren moechten.

{{signature}}`,
    isDefault: false,
  },
];

export function loadTemplates(): EmailTemplate[] {
  if (typeof window === 'undefined') return DEFAULT_TEMPLATES;
  try {
    const s = localStorage.getItem('ta-templates');
    if (s) return JSON.parse(s);
  } catch { /* ignore */ }
  return [...DEFAULT_TEMPLATES];
}

export function saveTemplates(templates: EmailTemplate[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ta-templates', JSON.stringify(templates));
}

// ── Processed Emails History ──────────────────────────────────────

export interface ProcessedEmail {
  id: string;
  from: string;
  subject: string;
  destination: string;
  processedAt: string;
  totalTime: number;
  status: 'completed' | 'failed';
}

export function loadHistory(): ProcessedEmail[] {
  if (typeof window === 'undefined') return [];
  try {
    const s = localStorage.getItem('ta-history');
    if (s) return JSON.parse(s);
  } catch { /* ignore */ }
  return [];
}

export function addToHistory(entry: ProcessedEmail): void {
  const history = loadHistory();
  history.unshift(entry);
  if (history.length > 50) history.pop();
  localStorage.setItem('ta-history', JSON.stringify(history));
}

// ── Language Labels ───────────────────────────────────────────────

export const LANGUAGES: { value: string; label: string }[] = [
  { value: 'en', label: 'English' },
  { value: 'de', label: 'German' },
  { value: 'el', label: 'Greek' },
  { value: 'fr', label: 'French' },
  { value: 'it', label: 'Italian' },
  { value: 'es', label: 'Spanish' },
];
