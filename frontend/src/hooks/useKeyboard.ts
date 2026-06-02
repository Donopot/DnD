import { useEffect } from "react";

/**
 * Ferme le composant quand l'utilisateur appuie sur Escape.
 * Usage: useEscapeKey(() => setOpen(false))
 */
export function useEscapeKey(onEscape: () => void) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onEscape();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onEscape]);
}

/**
 * Piège le focus dans un conteneur (pour les modales/panneaux flottants).
 * Usage: const ref = useFocusTrap<HTMLDivElement>(isOpen)
 */
export function useFocusTrap<T extends HTMLElement>(active: boolean) {
  const ref = { current: null as T | null };

  useEffect(() => {
    if (!active || !ref.current) return;

    const container = ref.current;
    const focusable =
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;

      const elements = container.querySelectorAll<HTMLElement>(focusable);
      if (elements.length === 0) return;

      const first = elements[0];
      const last = elements[elements.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    // Focus premier élément
    const first = container.querySelector<HTMLElement>(focusable);
    first?.focus();

    container.addEventListener("keydown", handleKeyDown);
    return () => container.removeEventListener("keydown", handleKeyDown);
  }, [active]);

  return ref;
}
