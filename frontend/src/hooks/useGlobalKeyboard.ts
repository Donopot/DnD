import { useEffect, useRef } from "react";

/**
 * Register a global keyboard listener with stable refs to avoid
 * unnecessary addEventListener/removeEventListener cycles.
 *
 * Multiple components can call useGlobalKeyboard — each gets its own
 * listener. For a single dispatcher pattern, use useKeyboardDispatch instead.
 */
export function useGlobalKeyboard(
  handler: (e: KeyboardEvent) => void,
  deps: unknown[] = [],
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const listener = (e: KeyboardEvent) => handlerRef.current(e);
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}
