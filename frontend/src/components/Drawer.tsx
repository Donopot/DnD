import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export type DrawerProps = {
  open: boolean;
  onClose: () => void;
  title?: string;
  /** Width in pixels (default: 320) */
  width?: number;
  children: ReactNode;
};

// ── Component ───────────────────────────────────────────────────────────────

export function Drawer({ open, onClose, title, width = 320, children }: DrawerProps) {
  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      {/* Backdrop */}
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true" />

      {/* Drawer panel */}
      <aside
        className="drawer"
        role="dialog"
        aria-modal="true"
        aria-label={title ?? "Panneau"}
        style={{ width }}
      >
        {/* Header */}
        {title && (
          <div className="drawer-header">
            <h2 className="drawer-title">{title}</h2>
            <button
              type="button"
              className="icon-btn icon-btn--sm"
              onClick={onClose}
              aria-label="Fermer"
            >
              <X size={16} />
            </button>
          </div>
        )}

        {/* Content */}
        <div className="drawer-content">{children}</div>
      </aside>
    </>
  );
}
