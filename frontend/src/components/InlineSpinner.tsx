interface InlineSpinnerProps {
  text?: string;
}

export function InlineSpinner({ text = "Chargement…" }: InlineSpinnerProps) {
  return (
    <div className="inline-spinner">
      <span className="spinner-dot" />
      <span>{text}</span>
      <style>{`
        .inline-spinner {
          display: flex; align-items: center; justify-content: center;
          gap: 8px; padding: 24px; color: var(--text-muted, #6a7a6e);
          font-size: 13px;
        }
        .spinner-dot {
          width: 14px; height: 14px;
          border: 2px solid var(--border-color, #2a3a2e);
          border-top-color: var(--brand-green, #1f5f43);
          border-radius: 50%;
          animation: spin 0.6s linear infinite;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
