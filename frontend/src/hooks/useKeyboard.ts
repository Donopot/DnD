import { useEffect, useRef } from "react";

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

/**
 * Déplace le token sélectionné avec les touches fléchées ou WASD.
 * Le mouvement est throttlé à ~10 moves/sec pour éviter de spammer l'API.
 *
 * Usage:
 *   useNudgeSelectedToken(selectedToken, (dx, dy) => handleMoveToken(t, dx, dy))
 */
export function useNudgeSelectedToken(
  hasSelection: boolean,
  onNudge: (dx: number, dy: number) => void,
  options?: { step?: number; enabled?: boolean },
) {
  const step = options?.step ?? 1;
  const enabled = options?.enabled ?? true;
  const cooldownRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    const handler = (e: KeyboardEvent) => {
      // Ne pas intercepter quand un input/textarea est focus
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      // Seulement si un token est sélectionné
      if (!hasSelection) return;

      // Throttle ~100ms (10 moves/sec)
      const now = Date.now();
      if (now - cooldownRef.current < 100) return;

      let dx = 0;
      let dy = 0;

      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          dy = -step;
          break;
        case "ArrowDown":
        case "s":
        case "S":
          dy = step;
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          dx = -step;
          break;
        case "ArrowRight":
        case "d":
        case "D":
          dx = step;
          break;
        default:
          return;
      }

      e.preventDefault();
      cooldownRef.current = now;
      onNudge(dx, dy);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [hasSelection, onNudge, step, enabled]);
}
