"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";

export type ToastMessage = {
  id: string;
  title: string;
  tone?: "info" | "success" | "warning" | "error";
};

type ToastContextValue = {
  messages: ToastMessage[];
  push: (message: Omit<ToastMessage, "id">) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: Readonly<{ children: ReactNode }>) {
  const [messages, setMessages] = useState<ToastMessage[]>([]);

  const push = useCallback((message: Omit<ToastMessage, "id">) => {
    setMessages((current) => [...current, { ...message, id: crypto.randomUUID() }]);
  }, []);

  const dismiss = useCallback((id: string) => {
    setMessages((current) => current.filter((message) => message.id !== id));
  }, []);

  const value = useMemo(() => ({ messages, push, dismiss }), [dismiss, messages, push]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 space-y-2">
        {messages.map((message) => (
          <button
            key={message.id}
            className="block rounded-md border border-slate-200 bg-white px-4 py-3 text-left text-sm shadow-sm"
            onClick={() => dismiss(message.id)}
            type="button"
          >
            {message.title}
          </button>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToasts(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToasts must be used inside ToastProvider.");
  }

  return context;
}
