'use client';

import { type AgentStatus } from './AgentStatusBar';

interface AgentCardProps {
  icon: string;
  name: string;
  color: string;
  status: AgentStatus;
  message: string;
  delay?: number;
}

export default function AgentCard({
  icon,
  name,
  color,
  status,
  message,
  delay = 0,
}: AgentCardProps) {
  return (
    <div
      className="animate-fade-in-up glass-card flex items-center gap-4 px-5 py-4 transition-all duration-500"
      style={{
        animationDelay: `${delay}ms`,
        opacity: 0,
        borderColor:
          status === 'active'
            ? color
            : status === 'done'
              ? `${color}60`
              : undefined,
        boxShadow:
          status === 'active'
            ? `0 0 20px ${color}20, inset 0 0 20px ${color}08`
            : 'none',
      }}
    >
      {/* Icon */}
      <div
        className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl text-xl transition-all duration-300"
        style={{
          background: `${color}20`,
          boxShadow: status === 'active' ? `0 0 16px ${color}30` : 'none',
        }}
      >
        {icon}
      </div>

      {/* Name & message */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span
            className="text-sm font-bold uppercase tracking-wider"
            style={{ color }}
          >
            {name}
          </span>
        </div>
        <p className="mt-0.5 truncate text-sm text-foreground/60">{message}</p>
      </div>

      {/* Status indicator */}
      <div className="flex-shrink-0">
        {status === 'active' && (
          <div
            className="h-5 w-5 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: `${color} transparent ${color} ${color}` }}
          />
        )}
        {status === 'done' && (
          <div
            className="flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold animate-scale-in"
            style={{ background: `${color}25`, color }}
          >
            ✓
          </div>
        )}
        {status === 'error' && (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-red-500/20 text-sm text-red-400">
            ✗
          </div>
        )}
        {status === 'idle' && (
          <div className="h-3 w-3 rounded-full bg-foreground/15" />
        )}
      </div>
    </div>
  );
}
