'use client';

import { useState } from 'react';
import {
  Bot,
  Plane,
  Building2,
  Search,
  MapPin,
  PenTool,
  Clock,
} from 'lucide-react';

interface AgentConfig {
  id: string;
  name: string;
  description: string;
  apiSource: string;
  icon: React.ReactNode;
  color: string;
  statusBg: string;
  statusLabel: string;
  lastUsed: string;
  enabled: boolean;
}

const INITIAL_AGENTS: AgentConfig[] = [
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
    lastUsed: '2 hours ago',
    enabled: true,
  },
  {
    id: 'hotel',
    name: 'Hotel Agent',
    description:
      'Returns curated hotel options with pricing, ratings, metro proximity, and amenities. Enhanced with AI descriptions.',
    apiSource: 'Mock Data',
    icon: <Building2 size={20} />,
    color: '#F59E0B',
    statusBg: 'var(--color-amber)',
    statusLabel: 'Mock',
    lastUsed: '2 hours ago',
    enabled: true,
  },
  {
    id: 'research',
    name: 'Research Agent',
    description:
      'Generates day-by-day itinerary suggestions, local tips, and destination expertise using AI.',
    apiSource: 'GPT-4o',
    icon: <Search size={20} />,
    color: '#10B981',
    statusBg: 'var(--color-green)',
    statusLabel: 'Connected',
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
    lastUsed: '3 hours ago',
    enabled: true,
  },
  {
    id: 'composer',
    name: 'Composer Agent',
    description:
      'Synthesizes all agent results into a complete, professional response email. Streams output in real time.',
    apiSource: 'GPT-4o',
    icon: <PenTool size={20} />,
    color: '#EC4899',
    statusBg: 'var(--color-green)',
    statusLabel: 'Connected',
    lastUsed: '2 hours ago',
    enabled: true,
  },
];

export default function AgentsPage() {
  const [agents, setAgents] = useState<AgentConfig[]>(INITIAL_AGENTS);

  const toggleAgent = (id: string) => {
    setAgents((prev) =>
      prev.map((a) => (a.id === id ? { ...a, enabled: !a.enabled } : a))
    );
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
            className="glass-card p-5 transition-all duration-200"
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
                <div className="flex items-center gap-3">
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
                  {/* Status Dot */}
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

                <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {agent.description}
                </p>

                {/* Last used */}
                <div className="mt-2 flex items-center gap-1 text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
                  <Clock size={10} />
                  Last used: {agent.lastUsed}
                </div>
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
          </div>
        ))}
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
