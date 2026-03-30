'use client';

import { useEffect, useState } from 'react';
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

export type ToastVariant = 'success' | 'error' | 'info' | 'warning';

export interface ToastMessage {
  id: string;
  message: string;
  variant?: ToastVariant;
  duration?: number;
}

interface ToastProps {
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}

const icons = {
  success: CheckCircle,
  error: AlertCircle,
  info: Info,
  warning: AlertTriangle,
};

const styles = {
  success: 'bg-white border-l-4 border-l-green-DEFAULT text-gray-800',
  error: 'bg-white border-l-4 border-l-red text-gray-800',
  info: 'bg-white border-l-4 border-l-blue text-gray-800',
  warning: 'bg-white border-l-4 border-l-orange text-gray-800',
};

const iconStyles = {
  success: 'text-green-DEFAULT',
  error: 'text-red',
  info: 'text-blue',
  warning: 'text-orange',
};

function Toast({ toast, onDismiss }: ToastProps) {
  const variant = toast.variant ?? 'info';
  const Icon = icons[variant];

  useEffect(() => {
    const timer = setTimeout(() => {
      onDismiss(toast.id);
    }, toast.duration ?? 4000);
    return () => clearTimeout(timer);
  }, [toast.id, toast.duration, onDismiss]);

  return (
    <div
      className={cn(
        'flex items-start gap-3 px-4 py-3 rounded-[10px] shadow-lg min-w-[280px] max-w-sm',
        styles[variant]
      )}
    >
      <Icon size={18} className={cn('mt-0.5 flex-shrink-0', iconStyles[variant])} />
      <p className="text-sm flex-1 leading-snug">{toast.message}</p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2">
      {toasts.map((t) => (
        <Toast key={t.id} toast={t} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

export function useToast() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = (message: string, variant: ToastVariant = 'info', duration = 4000) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => [...prev, { id, message, variant, duration }]);
  };

  const dismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  return { toasts, addToast, dismiss };
}
