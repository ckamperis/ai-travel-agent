'use client';

export type AgentStatus = 'idle' | 'active' | 'done' | 'error';

export interface AgentInfo {
  id: string;
  name: string;
  icon: string;
  color: string;
  status: AgentStatus;
}

const DEFAULT_AGENTS: Omit<AgentInfo, 'status'>[] = [
  { id: 'email', name: 'Email', icon: '📧', color: '#0891B2' },
  { id: 'flight', name: 'Πτήσεις', icon: '✈️', color: '#22D3EE' },
  { id: 'hotel', name: 'Ξενοδοχεία', icon: '🏨', color: '#F59E0B' },
  { id: 'research', name: 'Έρευνα', icon: '🔍', color: '#10B981' },
  { id: 'places', name: 'Τοποθεσίες', icon: '📍', color: '#A78BFA' },
  { id: 'composer', name: 'Σύνθεση', icon: '✍️', color: '#EC4899' },
];

interface AgentStatusBarProps {
  statuses: Record<string, AgentStatus>;
  visible: boolean;
}

export default function AgentStatusBar({ statuses, visible }: AgentStatusBarProps) {
  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-50 animate-fade-in-down">
      <div className="mx-auto max-w-6xl px-6 py-3">
        <div className="glass-card flex items-center justify-center gap-3 px-6 py-3">
          {DEFAULT_AGENTS.map((agent) => {
            const status = statuses[agent.id] || 'idle';
            return (
              <div
                key={agent.id}
                className="flex items-center gap-2 rounded-full px-4 py-2 transition-all duration-500"
                style={{
                  background:
                    status === 'active'
                      ? `${agent.color}30`
                      : status === 'done'
                        ? `${agent.color}20`
                        : 'rgba(255,255,255,0.05)',
                  border: `1px solid ${
                    status === 'active'
                      ? agent.color
                      : status === 'done'
                        ? `${agent.color}80`
                        : 'rgba(255,255,255,0.1)'
                  }`,
                  boxShadow:
                    status === 'active'
                      ? `0 0 12px ${agent.color}40`
                      : 'none',
                }}
              >
                <span className="text-sm">{agent.icon}</span>
                <span
                  className="text-xs font-medium transition-colors duration-300"
                  style={{
                    color:
                      status === 'idle'
                        ? 'rgba(255,255,255,0.4)'
                        : agent.color,
                  }}
                >
                  {agent.name}
                </span>
                {status === 'active' && (
                  <span
                    className="inline-block h-2 w-2 rounded-full animate-pulse-glow"
                    style={{ background: agent.color }}
                  />
                )}
                {status === 'done' && (
                  <span className="text-xs" style={{ color: agent.color }}>
                    ✓
                  </span>
                )}
                {status === 'error' && (
                  <span className="text-xs text-red-400">✗</span>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
