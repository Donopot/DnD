import React from "react";

type SectionHeadingProps = {
  title: string;
  icon?: React.ReactNode;
};

export function SectionHeading({ title, icon }: SectionHeadingProps) {
  return (
    <div className="section-heading">
      <h3>{title}</h3>
      {icon}
    </div>
  );
}

type MessageDockProps = {
  message: string;
};

export function MessageDock({ message }: MessageDockProps) {
  if (!message) {
    return null;
  }

  return <p className="message docked">{message}</p>;
}

type EmptyStateProps = {
  icon?: React.ReactNode;
  children: React.ReactNode;
  compact?: boolean;
};

export function EmptyState({ icon, children, compact = false }: EmptyStateProps) {
  return (
    <div className={`empty-state ${compact ? "compact-empty" : ""}`}>
      {icon}
      <p>{children}</p>
    </div>
  );
}
