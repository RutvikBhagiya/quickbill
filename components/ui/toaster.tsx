"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
} from "react";
import { CheckCircle, XCircle, AlertTriangle, Info, X } from "lucide-react";

type ToastType = "success" | "error" | "warning" | "info";

interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
}

interface ToastContextValue {
  toasts: Toast[];
  addToast: (type: ToastType, title: string, message?: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    (type: ToastType, title: string, message?: string) => {
      const id = Math.random().toString(36).slice(2);
      setToasts((prev) => [...prev.slice(-4), { id, type, title, message }]);
      setTimeout(() => removeToast(id), 4000);
    },
    [removeToast]
  );

  return (
    <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
      {children}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");

  return {
    success: (title: string, message?: string) =>
      ctx.addToast("success", title, message),
    error: (title: string, message?: string) =>
      ctx.addToast("error", title, message),
    warning: (title: string, message?: string) =>
      ctx.addToast("warning", title, message),
    info: (title: string, message?: string) =>
      ctx.addToast("info", title, message),
  };
}

const ICONS = {
  success: CheckCircle,
  error: XCircle,
  warning: AlertTriangle,
  info: Info,
};

const STYLES = {
  success: {
    border: "border-emerald-500/40",
    icon: "text-emerald-400",
    bar: "bg-emerald-500",
  },
  error: {
    border: "border-red-500/40",
    icon: "text-red-400",
    bar: "bg-red-500",
  },
  warning: {
    border: "border-amber-500/40",
    icon: "text-amber-400",
    bar: "bg-amber-500",
  },
  info: {
    border: "border-blue-500/40",
    icon: "text-blue-400",
    bar: "bg-blue-500",
  },
};

function ToastItem({
  toast,
  onRemove,
}: {
  toast: Toast;
  onRemove: () => void;
}) {
  const [visible, setVisible] = useState(false);
  const Icon = ICONS[toast.type];
  const style = STYLES[toast.type];

  useEffect(() => {
    const t = setTimeout(() => setVisible(true), 10);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      className={`relative overflow-hidden flex items-start gap-3 w-80 bg-gray-900 border ${style.border} rounded-2xl p-4 shadow-2xl transition-all duration-300 ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8"
      }`}
    >
      <Icon size={18} className={`${style.icon} shrink-0 mt-0.5`} />
      <div className="flex-1 min-w-0">
        <p className="text-white text-sm font-semibold leading-snug">
          {toast.title}
        </p>
        {toast.message && (
          <p className="text-gray-400 text-xs mt-0.5">{toast.message}</p>
        )}
      </div>
      <button
        onClick={onRemove}
        className="text-gray-500 hover:text-white transition-colors shrink-0"
      >
        <X size={14} />
      </button>
      {/* Progress bar */}
      <div
        className={`absolute bottom-0 left-0 h-0.5 ${style.bar} animate-toast-bar`}
      />
    </div>
  );
}

export function Toaster() {
  const ctx = useContext(ToastContext);
  if (!ctx) return null;

  return (
    <div className="fixed top-4 right-4 z-[100] flex flex-col gap-3 pointer-events-none">
      {ctx.toasts.map((t) => (
        <div key={t.id} className="pointer-events-auto">
          <ToastItem toast={t} onRemove={() => ctx.removeToast(t.id)} />
        </div>
      ))}
    </div>
  );
}
