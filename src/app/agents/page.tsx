'use client';

import { useState, useEffect, useCallback, type ReactNode } from 'react';
import {
  Bot,
  Plane,
  Building2,
  Search,
  MapPin,
  PenTool,
  Clock,
  Settings2,
  ChevronDown,
  ChevronUp,
  Plus,
  Info,
} from 'lucide-react';
import { useToast } from '@/components/Toast';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface AgentDef {
  id: string;
  name: string;
  description: string;
  apiSource: string;
  icon: ReactNode;
  color: string;
  statusBg: string;
  statusLabel: string;
  avgResponseTime: string;
  lastUsed: string;
  enabled: boolean;
}

interface FlightConfig {
  maxStops: string;
  cabinClass: string;
}

interface HotelConfig {
  minRating: number;
  preferredAreas: string;
}

interface ResearchConfig {
  style: string;
  includeRestaurants: boolean;
}

interface PlacesConfig {
  categories: Record<string, boolean>;
}

interface ComposerConfig {
  tone: string;
  includeWeather: boolean;
  includeCostBreakdown: boolean;
}

interface AllAgentConfigs {
  flight: FlightConfig;
  hotel: HotelConfig;
  research: ResearchConfig;
  places: PlacesConfig;
  composer: ComposerConfig;
}

const STORAGE_KEY = 'ta-agent-config';

const DEFAULT_CONFIGS: AllAgentConfigs = {
  flight: { maxStops: 'any', cabinClass: 'economy' },
  hotel: { minRating: 8.0, preferredAreas: '' },
  research: { style: 'detailed', includeRestaurants: true },
  places: {
    categories: {
      restaurants: true,
      historical: true,
      nightlife: false,
      shopping: false,
      neighborhoods: true,
    },
  },
  composer: { tone: 'professional', includeWeather: true, includeCostBreakdown: true },
};

// ---------------------------------------------------------------------------
// Agent definitions
// ---------------------------------------------------------------------------

const INITIAL_AGENTS: AgentDef[] = [
  {
    id: 'flight',
    name: 'Flight Agent',
    description:
      'Searches for available flights using the Duffel API. Returns pricing, schedules, airlines, and stop information.',
    apiSource: 'Duffel API',
    icon: <Plane size={20} />,
    color: '#22D3EE',
    statusBg: 'var(--color-green)',
    statusLabel: 'Connected',
    avgResponseTime: '3.2s',
    lastUsed: '2 hours ago',
    enabled: true,
  },
  {
    id: 'hotel',
    name: 'Hotel Agent',
    description:
      'Returns curated hotel options with pricing, ratings, metro proximity, and amenities. Enhanced with AI descriptions.',
    apiSource: 'Curated Selection',
    icon: <Building2 size={20} />,
    color: '#F59E0B',
    statusBg: 'var(--color-green)',
    statusLabel: 'Active',
    avgResponseTime: '2.1s',
    lastUsed: '2 hours ago',
    enabled: true,
  },
  {
    id: 'research',
    name: 'Research Agent',
    description:
      'Generates day-by-day itinerary suggestions, local tips, and destination expertise using AI.',
    apiSource: 'Claude API',
    icon: <Search size={20} />,
    color: '#10B981',
    statusBg: 'var(--color-green)',
    statusLabel: 'Connected',
    avgResponseTime: '5.8s',
    lastUsed: '2 hours ago',
    enabled: true,
  },
  {
    id: 'places',
    name: 'Places Agent',
    description:
      'Discovers restaurants, attractions, and neighborhoods via Google Places. Returns ratings and addresses.',
    apiSource: 'Google Places API',
    icon: <MapPin size={20} />,
    color: '#A78BFA',
    statusBg: 'var(--color-green)',
    statusLabel: 'Connected',
    avgResponseTime: '2.9s',
    lastUsed: '3 hours ago',
    enabled: true,
  },
  {
    id: 'composer',
    name: 'Composer Agent',
    description:
      'Synthesizes all agent results into a complete, professional response email. Streams output in real time.',
    apiSource: 'Claude API',
    icon: <PenTool size={20} />,
    color: '#EC4899',
    statusBg: 'var(--color-green)',
    statusLabel: 'Connected',
    avgResponseTime: '8.4s',
    lastUsed: '2 hours ago',
    enabled: true,
  },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function loadConfigs(): AllAgentConfigs {
  if (typeof window === 'undefined') return DEFAULT_CONFIGS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as AllAgentConfigs;
      return { ...DEFAULT_CONFIGS, ...parsed };
    }
  } catch {
    // ignore
  }
  return DEFAULT_CONFIGS;
}

function saveConfigs(configs: AllAgentConfigs) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(configs));
  } catch {
    // ignore
  }
}

// Shared input styles
const inputClassName =
  'w-full rounded-lg border px-4 py-2.5 text-sm outline-none transition-colors';
const inputStyle = {
  background: 'var(--color-surface)',
  borderColor: 'var(--color-border)',
  color: 'var(--color-text)',
};

// ---------------------------------------------------------------------------
// Config panels per agent
// ---------------------------------------------------------------------------

function FlightConfigPanel({
  config,
  onChange,
}: {
  config: FlightConfig;
  onChange: (c: FlightConfig) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Max Stops
        </label>
        <select
          className={inputClassName}
          style={inputStyle}
          value={config.maxStops}
          onChange={(e) => onChange({ ...config, maxStops: e.target.value })}
        >
          <option value="any">Any</option>
          <option value="0">0 (Non-stop)</option>
          <option value="1">1</option>
          <option value="2">2</option>
        </select>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Cabin Class
        </label>
        <select
          className={inputClassName}
          style={inputStyle}
          value={config.cabinClass}
          onChange={(e) => onChange({ ...config, cabinClass: e.target.value })}
        >
          <option value="economy">Economy</option>
          <option value="business">Business</option>
          <option value="first">First</option>
        </select>
      </div>
    </div>
  );
}

function HotelConfigPanel({
  config,
  onChange,
}: {
  config: HotelConfig;
  onChange: (c: HotelConfig) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Min Rating: {config.minRating.toFixed(1)}
        </label>
        <input
          type="range"
          min={6.0}
          max={9.5}
          step={0.1}
          value={config.minRating}
          onChange={(e) => onChange({ ...config, minRating: parseFloat(e.target.value) })}
          className="w-full"
        />
        <div className="mt-1 flex justify-between text-[10px]" style={{ color: 'var(--color-text-muted)' }}>
          <span>6.0</span>
          <span>9.5</span>
        </div>
      </div>
      <div>
        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Preferred Areas
        </label>
        <input
          type="text"
          className={inputClassName}
          style={inputStyle}
          placeholder="e.g. Plaka, Syntagma, Monastiraki"
          value={config.preferredAreas}
          onChange={(e) => onChange({ ...config, preferredAreas: e.target.value })}
        />
      </div>
    </div>
  );
}

function ResearchConfigPanel({
  config,
  onChange,
}: {
  config: ResearchConfig;
  onChange: (c: ResearchConfig) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Style
        </label>
        <select
          className={inputClassName}
          style={inputStyle}
          value={config.style}
          onChange={(e) => onChange({ ...config, style: e.target.value })}
        >
          <option value="detailed">Detailed</option>
          <option value="compact">Compact</option>
        </select>
      </div>
      <div className="flex items-center gap-3 pt-5">
        <button
          type="button"
          onClick={() => onChange({ ...config, includeRestaurants: !config.includeRestaurants })}
          className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors"
          style={{
            background: config.includeRestaurants ? 'var(--color-primary)' : 'var(--color-border)',
          }}
        >
          <span
            className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
              config.includeRestaurants ? 'translate-x-6' : 'translate-x-1'
            }`}
          />
        </button>
        <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
          Include restaurants
        </span>
      </div>
    </div>
  );
}

function PlacesConfigPanel({
  config,
  onChange,
}: {
  config: PlacesConfig;
  onChange: (c: PlacesConfig) => void;
}) {
  const labels: Record<string, string> = {
    restaurants: 'Restaurants',
    historical: 'Historical sites',
    nightlife: 'Nightlife',
    shopping: 'Shopping',
    neighborhoods: 'Neighborhoods',
  };

  const toggle = (key: string) => {
    onChange({
      ...config,
      categories: { ...config.categories, [key]: !config.categories[key] },
    });
  };

  return (
    <div>
      <label className="mb-2 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
        Categories
      </label>
      <div className="flex flex-wrap gap-3">
        {Object.entries(labels).map(([key, label]) => (
          <label key={key} className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!config.categories[key]}
              onChange={() => toggle(key)}
              className="h-4 w-4 rounded"
            />
            <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
              {label}
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}

function ComposerConfigPanel({
  config,
  onChange,
}: {
  config: ComposerConfig;
  onChange: (c: ComposerConfig) => void;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-xs font-medium" style={{ color: 'var(--color-text-secondary)' }}>
          Tone
        </label>
        <select
          className={inputClassName}
          style={inputStyle}
          value={config.tone}
          onChange={(e) => onChange({ ...config, tone: e.target.value })}
        >
          <option value="professional">Professional</option>
          <option value="friendly">Friendly</option>
          <option value="formal">Formal</option>
        </select>
      </div>
      <div className="flex flex-col gap-3 pt-1">
        {/* Include weather */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...config, includeWeather: !config.includeWeather })}
            className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors"
            style={{
              background: config.includeWeather ? 'var(--color-primary)' : 'var(--color-border)',
            }}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                config.includeWeather ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Include weather
          </span>
        </div>
        {/* Include cost breakdown */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => onChange({ ...config, includeCostBreakdown: !config.includeCostBreakdown })}
            className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors"
            style={{
              background: config.includeCostBreakdown ? 'var(--color-primary)' : 'var(--color-border)',
            }}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                config.includeCostBreakdown ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-xs" style={{ color: 'var(--color-text-secondary)' }}>
            Include cost breakdown
          </span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main page component
// ---------------------------------------------------------------------------

export default function AgentsPage() {
  const { addToast } = useToast();
  const [agents, setAgents] = useState<AgentDef[]>(INITIAL_AGENTS);
  const [configs, setConfigs] = useState<AllAgentConfigs>(DEFAULT_CONFIGS);
  const [expandedAgent, setExpandedAgent] = useState<string | null>(null);
  const [showCustomInfo, setShowCustomInfo] = useState(false);

  // Load configs from localStorage on mount
  useEffect(() => {
    setConfigs(loadConfigs());
  }, []);

  const updateConfig = useCallback(
    <K extends keyof AllAgentConfigs>(agentId: K, value: AllAgentConfigs[K]) => {
      setConfigs((prev) => {
        const next = { ...prev, [agentId]: value };
        saveConfigs(next);
        return next;
      });
      addToast('Configuration saved', 'success');
    },
    [addToast],
  );

  const toggleAgent = (id: string) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a)),
    );
    const agent = agents.find((a) => a.id === id);
    if (agent) {
      addToast(`${agent.name} ${agent.enabled ? 'disabled' : 'enabled'}`, 'info');
    }
  };

  const toggleConfigure = (id: string) => {
    setExpandedAgent((prev) => (prev === id ? null : id));
  };

  // Render the config panel for a given agent
  const renderConfigPanel = (agentId: string) => {
    switch (agentId) {
      case 'flight':
        return (
          <FlightConfigPanel
            config={configs.flight}
            onChange={(c) => updateConfig('flight', c)}
          />
        );
      case 'hotel':
        return (
          <HotelConfigPanel
            config={configs.hotel}
            onChange={(c) => updateConfig('hotel', c)}
          />
        );
      case 'research':
        return (
          <ResearchConfigPanel
            config={configs.research}
            onChange={(c) => updateConfig('research', c)}
          />
        );
      case 'places':
        return (
          <PlacesConfigPanel
            config={configs.places}
            onChange={(c) => updateConfig('places', c)}
          />
        );
      case 'composer':
        return (
          <ComposerConfigPanel
            config={configs.composer}
            onChange={(c) => updateConfig('composer', c)}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-6 py-10 animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-lg"
            style={{ background: 'var(--color-purple-light)' }}
          >
            <Bot size={18} style={{ color: 'var(--color-purple)' }} />
          </div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--color-text)' }}>
            Agents
          </h1>
        </div>
        <p className="text-sm ml-12" style={{ color: 'var(--color-text-muted)' }}>
          Manage the AI agents that power your travel assistant
        </p>
      </div>

      {/* Agent Cards */}
      <div className="space-y-4">
        {agents.map((agent) => (
          <div
            key={agent.id}
            className="card p-5 transition-all duration-200"
            style={{
              opacity: agent.enabled ? 1 : 0.5,
            }}
          >
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div
                className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: `${agent.color}15`,
                  color: agent.color,
                }}
              >
                {agent.icon}
              </div>

              {/* Content */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-3 flex-wrap">
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--color-text)' }}>
                    {agent.name}
                  </h3>
                  {/* API Badge */}
                  <span
                    className="rounded-full px-2.5 py-0.5 text-[11px] font-medium"
                    style={{
                      backgroundColor: `${agent.color}12`,
                      color: agent.color,
                    }}
                  >
                    {agent.apiSource}
                  </span>
                  {/* Status Dot + Label */}
                  <span className="flex items-center gap-1.5">
                    <span
                      className="h-2 w-2 rounded-full"
                      style={{ background: agent.statusBg }}
                    />
                    <span className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                      {agent.statusLabel}
                    </span>
                  </span>
                </div>

                <p
                  className="mt-1 text-xs leading-relaxed"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  {agent.description}
                </p>

                {/* Meta row: avg response time, last used */}
                <div
                  className="mt-2 flex items-center gap-4 text-[11px]"
                  style={{ color: 'var(--color-text-muted)' }}
                >
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    Avg: {agent.avgResponseTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock size={10} />
                    Last used: {agent.lastUsed}
                  </span>
                </div>

                {/* Configure button */}
                <button
                  type="button"
                  onClick={() => toggleConfigure(agent.id)}
                  className="mt-3 flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors cursor-pointer"
                  style={{
                    color: agent.color,
                    background: `${agent.color}10`,
                  }}
                >
                  <Settings2 size={13} />
                  Configure
                  {expandedAgent === agent.id ? (
                    <ChevronUp size={13} />
                  ) : (
                    <ChevronDown size={13} />
                  )}
                </button>
              </div>

              {/* Toggle */}
              <button
                type="button"
                onClick={() => toggleAgent(agent.id)}
                className="relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer items-center rounded-full transition-colors"
                style={{
                  background: agent.enabled
                    ? 'var(--color-primary)'
                    : 'var(--color-border)',
                }}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform ${
                    agent.enabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Inline config panel (expanded) */}
            {expandedAgent === agent.id && (
              <div
                className="mt-4 rounded-lg p-4"
                style={{
                  background: 'var(--color-bg-secondary)',
                  border: '1px solid var(--color-border)',
                }}
              >
                {renderConfigPanel(agent.id)}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Add Custom Agent button */}
      <div className="mt-6">
        <button
          type="button"
          onClick={() => setShowCustomInfo((prev) => !prev)}
          className="flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors cursor-pointer"
          style={{
            color: 'var(--color-primary)',
            background: 'var(--color-primary-light)',
            border: '1px dashed var(--color-primary)',
          }}
        >
          <Plus size={16} />
          Add Custom Agent
        </button>

        {showCustomInfo && (
          <div
            className="card mt-3 flex items-center gap-3 p-4"
          >
            <Info size={16} style={{ color: 'var(--color-primary)', flexShrink: 0 }} />
            <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
              Custom agents coming in a future update. You will be able to define your own
              agents with custom API integrations and processing logic.
            </p>
          </div>
        )}
      </div>

      {/* Info */}
      <div
        className="mt-6 rounded-lg px-5 py-4"
        style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border)' }}
      >
        <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
          Disabling an agent will skip it during email processing. The Composer
          agent requires at least one data agent to be active. All agents
          include built-in fallback data to ensure the demo never breaks.
        </p>
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <p className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          &copy; 2026 Revival SA — AI &amp; Business Intelligence
        </p>
      </div>
    </div>
  );
}
