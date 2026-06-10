import type { ButtonHTMLAttributes, ReactNode } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

export type IconButtonVariant = "default" | "primary" | "danger";
export type IconButtonSize = "sm" | "md" | "lg";

export type IconButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Lucide icon element */
  icon: ReactNode;
  /** Accessible label (required for icon-only buttons) */
  label: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  /** Shows active/pressed state */
  active?: boolean;
};

// ── Component ───────────────────────────────────────────────────────────────

export function IconButton({
  icon,
  label,
  variant = "default",
  size = "md",
  active = false,
  className = "",
  ...buttonProps
}: IconButtonProps) {
  const cls = [
    "icon-btn",
    `icon-btn--${variant}`,
    `icon-btn--${size}`,
    active ? "icon-btn--active" : "",
    className,
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <button type="button" className={cls} aria-label={label} {...buttonProps}>
      {icon}
    </button>
  );
}
