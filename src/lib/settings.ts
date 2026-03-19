/* ================================================================
   Settings, Profile, Templates, History, Customers, Follow-ups
   All localStorage-backed
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
  includeCostBreakdown: boolean;
  maxBudgetTolerance: number;
  preferredAirlines: string[];
  hotelMinRating: number;
  aiReviewMode: 'manual' | 'auto';
  autoFollowUp: boolean;
  followUpDays: number;
  customerRecognition: boolean;
  responseLength: 'concise' | 'standard' | 'detailed';
  // Gmail filter settings
  gmailMinEmailLength: number;
  gmailSkipPromotional: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  responseLanguage: 'en',
  tone: 'professional',
  emailSignature: 'Best regards,\nPowered by Voyager AI\nYour Agency Name',
  defaultGreeting: 'Dear',
  includePriceBreakdown: true,
  includeItinerary: true,
  includeWeatherInfo: false,
  includeCostBreakdown: true,
  maxBudgetTolerance: 20,
  preferredAirlines: [],
  hotelMinRating: 7.5,
  aiReviewMode: 'manual',
  autoFollowUp: true,
  followUpDays: 3,
  customerRecognition: true,
  responseLength: 'standard',
  gmailMinEmailLength: 50,
  gmailSkipPromotional: true,
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
  agencyName: '',
  agentName: '',
  email: '',
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
  composedResponse?: string;
  customerEmail?: string;
  customerName?: string;
  sampleEmailId?: string;
  tripStatus?: string; // Supabase trip status: new, quoted, negotiating, confirmed, etc.
  originalEmail?: string; // The inbound customer email text
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
  if (history.length > 100) history.pop();
  localStorage.setItem('ta-history', JSON.stringify(history));
}

export function getProcessedSampleIds(): Set<string> {
  const history = loadHistory();
  const ids = new Set<string>();
  for (const h of history) {
    if (h.sampleEmailId) ids.add(h.sampleEmailId);
  }
  return ids;
}

// ── Known Customers ───────────────────────────────────────────────

export interface KnownCustomer {
  email: string;
  name: string;
  tags: string[];
  notes: string;
  trips: { destination: string; date: string; hotel?: string; budget?: string }[];
  preferredLanguage: string;
  preferredTone: string;
  lastContact: string;
}

export function loadCustomers(): KnownCustomer[] {
  if (typeof window === 'undefined') return [];
  try {
    const s = localStorage.getItem('ta-customers');
    if (s) return JSON.parse(s);
  } catch { /* ignore */ }
  return [];
}

export function saveCustomers(customers: KnownCustomer[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ta-customers', JSON.stringify(customers));
}

export function findCustomerByEmail(email: string): KnownCustomer | null {
  const customers = loadCustomers();
  const lower = email.toLowerCase();
  return customers.find(c => c.email.toLowerCase() === lower) || null;
}

export function upsertCustomer(data: {
  email: string; name: string; destination: string;
  hotel?: string; budget?: string; language?: string;
}): void {
  const customers = loadCustomers();
  const idx = customers.findIndex(c => c.email.toLowerCase() === data.email.toLowerCase());
  const now = new Date().toISOString();
  if (idx >= 0) {
    customers[idx].name = data.name || customers[idx].name;
    customers[idx].lastContact = now;
    customers[idx].trips.push({ destination: data.destination, date: now, hotel: data.hotel, budget: data.budget });
    if (data.language) customers[idx].preferredLanguage = data.language;
  } else {
    customers.push({
      email: data.email, name: data.name, tags: [], notes: '',
      trips: [{ destination: data.destination, date: now, hotel: data.hotel, budget: data.budget }],
      preferredLanguage: data.language || 'en', preferredTone: 'professional',
      lastContact: now,
    });
  }
  saveCustomers(customers);
}

// ── Follow-ups ────────────────────────────────────────────────────

export interface FollowUp {
  id: string;
  customerEmail: string;
  customerName: string;
  destination: string;
  originalResponse: string;
  scheduledDate: string;
  status: 'pending' | 'sent' | 'cancelled';
  processedEmailId: string;
  createdAt: string;
}

export function loadFollowUps(): FollowUp[] {
  if (typeof window === 'undefined') return [];
  try {
    const s = localStorage.getItem('ta-followups');
    if (s) return JSON.parse(s);
  } catch { /* ignore */ }
  return [];
}

export function saveFollowUps(followUps: FollowUp[]): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('ta-followups', JSON.stringify(followUps));
}

export function addFollowUp(entry: Omit<FollowUp, 'id' | 'createdAt'>): void {
  const list = loadFollowUps();
  list.push({ ...entry, id: Date.now().toString(), createdAt: new Date().toISOString() });
  saveFollowUps(list);
}

export function updateFollowUp(id: string, updates: Partial<FollowUp>): void {
  const list = loadFollowUps();
  const idx = list.findIndex(f => f.id === id);
  if (idx >= 0) { list[idx] = { ...list[idx], ...updates }; saveFollowUps(list); }
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
