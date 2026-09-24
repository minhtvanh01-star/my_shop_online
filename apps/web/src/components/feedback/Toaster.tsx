'use client';

import { X } from 'lucide-react';
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';

/** Auto-hide window: 5–10s required; 7s sits in the 6–8s target. */
export const TOAST_DURATION_MS = 7000;

type ToastItem = {
  id: string;
  title: string;
  messages: string[];
};

type ToastContextValue = {
  error: (title: string, messages: string[]) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const t = useTranslations('Common');
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef(new Map<string, number>());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer !== undefined) {
      window.clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  useEffect(() => {
    const active = timers.current;
    return () => {
      active.forEach((timer) => window.clearTimeout(timer));
      active.clear();
    };
  }, []);

  const error = useCallback((title: string, messages: string[]) => {
    const unique = [...new Set(messages.map((message) => message.trim()).filter(Boolean))];
    if (unique.length === 0) return;
    const id =
      typeof crypto !== 'undefined' && 'randomUUID' in crypto
        ? crypto.randomUUID()
        : String(Date.now());
    setToasts((prev) => [...prev, { id, title, messages: unique }]);
    const timer = window.setTimeout(() => {
      timers.current.delete(id);
      setToasts((prev) => prev.filter((item) => item.id !== id));
    }, TOAST_DURATION_MS);
    timers.current.set(id, timer);
  }, []);

  const value = useMemo(() => ({ error }), [error]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed right-4 top-4 z-[70] flex w-[min(100%-2rem,24rem)] flex-col gap-2"
        aria-live="assertive"
        aria-relevant="additions"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            role="alert"
            className="pointer-events-auto border border-[#DC2626] bg-white p-4 text-[#DC2626] shadow-md motion-safe:animate-[toast-in_200ms_ease-out] motion-reduce:animate-none"
          >
            <div className="flex items-start gap-2">
              <div className="min-w-0 flex-1">
                <p className="font-heading text-sm font-semibold">{toast.title}</p>
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-sm">
                  {toast.messages.map((message) => (
                    <li key={message}>{message}</li>
                  ))}
                </ul>
              </div>
              <button
                type="button"
                className="flex h-11 w-11 shrink-0 cursor-pointer items-center justify-center outline-none focus-visible:ring-2 focus-visible:ring-[#059669]"
                onClick={() => dismiss(toast.id)}
                aria-label={t('close')}
              >
                <X size={16} aria-hidden="true" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}
