import { useState, useEffect, createContext, useContext, useCallback } from 'react';
import { CheckCircle, XCircle, SpinnerGap, Info } from '@phosphor-icons/react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'loading' | 'info';

interface Toast {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastContextType {
  toast: (type: ToastType, message: string, duration?: number) => string;
  dismiss: (id: string) => void;
  update: (id: string, type: ToastType, message: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((type: ToastType, message: string, duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, type, message }]);
    if (type !== 'loading' && duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const update = useCallback((id: string, type: ToastType, message: string, duration = 4000) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, type, message } : t));
    if (type !== 'loading' && duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss, update }}>
      {children}
      <div className="fixed bottom-6 right-6 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={18} weight="fill" className="text-emerald-400 shrink-0" />,
    error: <XCircle size={18} weight="fill" className="text-red-400 shrink-0" />,
    loading: <SpinnerGap size={18} className="text-accent shrink-0 animate-spin" />,
    info: <Info size={18} weight="fill" className="text-blue-400 shrink-0" />,
  };

  return (
    <div
      onClick={onDismiss}
      className={cn(
        'flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lg shadow-black/20 cursor-pointer',
        'transition-all duration-300 ease-[var(--ease-out)]',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      )}
    >
      {icons[toast.type]}
      <span className="text-sm text-foreground">{toast.message}</span>
    </div>
  );
}
