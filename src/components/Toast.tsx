'use client';

import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'error' | 'info';

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

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, type: ToastType = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const removeToast = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
        {toasts.map((toast) => {
          const Icon =
            toast.type === 'success'
              ? CheckCircle
              : toast.type === 'error'
                ? AlertCircle
                : Info;
          const borderColor =
            toast.type === 'success'
              ? 'rgba(16,185,129,0.25)'
              : toast.type === 'error'
                ? 'rgba(239,68,68,0.25)'
                : 'rgba(8,145,178,0.25)';
          const iconColor =
            toast.type === 'success'
              ? 'text-green'
              : toast.type === 'error'
                ? 'text-red-400'
                : 'text-teal';
          return (
            <div
              key={toast.id}
              className="glass-card flex items-center gap-3 px-4 py-3 text-sm animate-fade-in-up min-w-[300px] max-w-[420px] shadow-lg"
              style={{ borderColor }}
            >
              <Icon size={16} className={iconColor} />
              <span className="flex-1 text-foreground/70">{toast.message}</span>
              <button
                onClick={() => removeToast(toast.id)}
                className="text-foreground/30 hover:text-foreground/50 cursor-pointer"
              >
                <X size={14} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}
