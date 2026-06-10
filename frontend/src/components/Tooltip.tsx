import { useRef, useState, useCallback, useEffect, cloneElement, isValidElement } from "react";
import type { ReactNode, ReactElement } from "react";

/**
 * Accessible tooltip component.
 *
 * Requirements:
 * - Appears on hover and keyboard focus
 * - Closes on Escape
 * - Short delay before opening
 * - Associated via aria-describedby on the trigger element
 * - Does not block clicks (pointer-events: none)
 *
 * Usage:
 * <Tooltip content="Recentrer la scène">
 *   <button className="btn-icon" aria-label="Recentrer la scène">
 *     <LocateFixed />
 *   </button>
 * </Tooltip>
 *
 * IMPORTANT: Buttons with visible text should only receive a tooltip if it adds
 * extra information. Repeating the visible text is noise for screen readers.
 */
export function Tooltip({
  content,
  children,
}: {
  content: string;
  children: ReactNode;
}) {
  const idRef = useRef(`tooltip-${crypto.randomUUID().slice(0, 8)}`);
  const id = idRef.current;
  const [visible, setVisible] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisible(true), 200);
  }, []);

  const hide = useCallback(() => {
    if (timer.current) clearTimeout(timer.current);
    setVisible(false);
  }, []);

  // Close on Escape
  useEffect(() => {
    if (!visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") hide();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [visible, hide]);

  // Clone child to inject aria-describedby + event handlers
  const child = isValidElement(children)
    ? cloneElement(children as ReactElement<{ onMouseEnter?: unknown; onMouseLeave?: unknown; onFocus?: unknown; onBlur?: unknown; "aria-describedby"?: string }>, {
        "aria-describedby": id,
        onMouseEnter: (e: React.MouseEvent) => {
          (children as ReactElement<{ onMouseEnter?: (e: React.MouseEvent) => void }>).props.onMouseEnter?.(e);
          show();
        },
        onMouseLeave: (e: React.MouseEvent) => {
          (children as ReactElement<{ onMouseLeave?: (e: React.MouseEvent) => void }>).props.onMouseLeave?.(e);
          hide();
        },
        onFocus: (e: React.FocusEvent) => {
          (children as ReactElement<{ onFocus?: (e: React.FocusEvent) => void }>).props.onFocus?.(e);
          show();
        },
        onBlur: (e: React.FocusEvent) => {
          (children as ReactElement<{ onBlur?: (e: React.FocusEvent) => void }>).props.onBlur?.(e);
          hide();
        },
      })
    : children;

  return (
    <span className="tooltip-anchor">
      {child}
      <span
        role="tooltip"
        id={id}
        className={`tooltip-bubble pos-top${visible ? " visible" : ""}`}
        aria-hidden={!visible}
      >
        {content}
      </span>
    </span>
  );
}
