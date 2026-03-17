'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info' | 'warning';

interface Toast {
  id: number;
  message: string;
  type: ToastType;
}

interface ToastContextValue {
  addToast: (message: string, type?: ToastType) => void;
}

const ToastContext = createContext<ToastContextValue>({ addToast: () => {} });

export function useToast() {
  return useContext(ToastContext);
}

const ICON_MAP = { success: CheckCircle, error: AlertCircle, info: Info, warning: AlertTriangle };
const COLOR_MAP = {
  success: { border: 'var(--color-green)', bg: 'var(--color-green-light)' },
  error: { border: 'var(--color-red)', bg: 'var(--color-red-light)' },
  info: { border: 'var(--color-primary)', bg: 'var(--color-primary-light)' },
  warning: { border: 'var(--color-amber)', bg: 'var(--color-amber-light)' },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed top-16 right-4 z-[100] flex flex-col gap-2" style={{ maxWidth: 380 }}>
        {toasts.map(toast => {
          const Icon = ICON_MAP[toast.type];
          const colors = COLOR_MAP[toast.type];
          return (
            <div key={toast.id}
              className="card flex items-center gap-3 px-4 py-3 text-sm animate-slide-in-right shadow-sm"
              style={{ borderLeft: `3px solid ${colors.border}` }}>
              <Icon size={16} style={{ color: colors.border, flexShrink: 0 }} />
              <span className="flex-1" style={{ color: 'var(--color-text)' }}>{toast.message}</span>
              <button onClick={() => removeToast(toast.id)} className="cursor-pointer" style={{ color: 'var(--color-text-muted)' }}>
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
