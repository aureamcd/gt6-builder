"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from "lucide-react";

export type ToastType = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastItem[];
  showToast: (message: string, type?: ToastType, title?: string, duration?: number) => void;
  removeToast: (id: string) => void;
  toast: {
    success: (message: string, title?: string, duration?: number) => void;
    error: (message: string, title?: string, duration?: number) => void;
    warning: (message: string, title?: string, duration?: number) => void;
    info: (message: string, title?: string, duration?: number) => void;
  };
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

// Global handler so non-React files can also trigger toast if needed
let globalToastEmitter: ((item: Omit<ToastItem, "id">) => void) | null = null;

export const globalToast = {
  success: (message: string, title?: string) => globalToastEmitter?.({ type: "success", message, title }),
  error: (message: string, title?: string) => globalToastEmitter?.({ type: "error", message, title }),
  warning: (message: string, title?: string) => globalToastEmitter?.({ type: "warning", message, title }),
  info: (message: string, title?: string) => globalToastEmitter?.({ type: "info", message, title }),
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = "info", title?: string, duration: number = 4000) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastItem = { id, type, title, message, duration };

      setToasts((prev) => [...prev, newToast]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  React.useEffect(() => {
    globalToastEmitter = ({ message, type, title, duration }) => {
      showToast(message, type, title, duration);
    };
    return () => {
      globalToastEmitter = null;
    };
  }, [showToast]);

  const toastHelpers = React.useMemo(
    () => ({
      success: (msg: string, title?: string, duration?: number) => showToast(msg, "success", title || "Sucesso", duration),
      error: (msg: string, title?: string, duration?: number) => showToast(msg, "error", title || "Atenção", duration),
      warning: (msg: string, title?: string, duration?: number) => showToast(msg, "warning", title || "Importante", duration),
      info: (msg: string, title?: string, duration?: number) => showToast(msg, "info", title || "Informação", duration),
    }),
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, showToast, removeToast, toast: toastHelpers }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser usado dentro de um ToastProvider");
  }
  return context;
}

function ToastContainer({ toasts, onRemove }: { toasts: ToastItem[]; onRemove: (id: string) => void }) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-5 right-5 z-[99999] flex flex-col gap-3 max-w-sm sm:max-w-md w-full pointer-events-none px-4 sm:px-0">
      {toasts.map((item) => (
        <ToastCard key={item.id} item={item} onRemove={() => onRemove(item.id)} />
      ))}
    </div>
  );
}

function ToastCard({ item, onRemove }: { item: ToastItem; onRemove: () => void }) {
  const config = {
    success: {
      bg: "bg-white/95 border-emerald-200 shadow-emerald-500/10",
      iconBg: "bg-emerald-100 text-emerald-600",
      textColor: "text-emerald-950",
      descColor: "text-emerald-800/80",
      accentBar: "bg-emerald-500",
      icon: CheckCircle2,
      defaultTitle: "Sucesso",
    },
    error: {
      bg: "bg-white/95 border-red-200 shadow-red-500/10",
      iconBg: "bg-red-100 text-red-600",
      textColor: "text-red-950",
      descColor: "text-red-800/80",
      accentBar: "bg-red-500",
      icon: AlertCircle,
      defaultTitle: "Erro ao processar",
    },
    warning: {
      bg: "bg-white/95 border-amber-200 shadow-amber-500/10",
      iconBg: "bg-amber-100 text-amber-600",
      textColor: "text-amber-950",
      descColor: "text-amber-800/80",
      accentBar: "bg-amber-500",
      icon: AlertTriangle,
      defaultTitle: "Atenção",
    },
    info: {
      bg: "bg-white/95 border-indigo-200 shadow-indigo-500/10",
      iconBg: "bg-indigo-100 text-indigo-600",
      textColor: "text-indigo-950",
      descColor: "text-indigo-800/80",
      accentBar: "bg-indigo-600",
      icon: Info,
      defaultTitle: "Informação",
    },
  }[item.type];

  const Icon = config.icon;

  return (
    <div
      className={`pointer-events-auto relative overflow-hidden backdrop-blur-md rounded-2xl border p-4 shadow-xl transition-all duration-300 animate-in fade-in slide-in-from-top-4 ${config.bg}`}
      role="alert"
    >
      {/* Top accent line */}
      <div className={`absolute top-0 left-0 right-0 h-1 ${config.accentBar}`} />

      <div className="flex items-start space-x-3.5 pt-0.5">
        <div className={`p-2 rounded-xl shrink-0 shadow-sm ${config.iconBg}`}>
          <Icon size={20} strokeWidth={2.4} />
        </div>

        <div className="flex-1 min-w-0 pr-2">
          <h4 className={`text-sm font-bold tracking-tight ${config.textColor}`}>
            {item.title || config.defaultTitle}
          </h4>
          <p className={`text-xs sm:text-sm font-medium mt-0.5 leading-relaxed break-words ${config.descColor}`}>
            {item.message}
          </p>
        </div>

        <button
          onClick={onRemove}
          className="shrink-0 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100/80 rounded-lg transition-colors cursor-pointer"
          title="Fechar"
        >
          <X size={16} />
        </button>
      </div>
    </div>
  );
}
