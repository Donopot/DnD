import { useCallback, useEffect, useState } from "react";

type ToastItem = {
  id: number;
  message: string;
  type: "info" | "error";
};

let nextId = 0;

/**
 * Simple toast notification system with auto-dismiss.
 * Replaces the old MessageDock pattern.
 */
export function useToast(defaultDuration = 4000) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const show = useCallback(
    (message: string, type: "info" | "error" = "info", duration?: number) => {
      const id = nextId++;
      setToasts((prev) => [...prev, { id, message, type }]);

      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration ?? defaultDuration);
    },
    [defaultDuration],
  );

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      setToasts([]);
    };
  }, []);

  return { toasts, show, dismiss };
}
