import { Component, type ReactNode } from "react";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  render() {
    if (this.state.hasError) {
      return (
        this.props.fallback || (
          <div className="error-boundary">
            <p>⚠️ Une erreur est survenue</p>
            <button
              className="btn btn-primary"
              onClick={() => this.setState({ hasError: false })}
            >
              Réessayer
            </button>
            <style>{`
              .error-boundary {
                padding: 16px; text-align: center;
                color: var(--text-muted); font-size: 13px;
                background: var(--bg-card);
                border: 1px solid var(--danger-dim);
                border-radius: 8px; margin: 8px;
              }
              .error-boundary p { margin: 0 0 8px; }
            `}</style>
          </div>
        )
      );
    }
    return this.props.children;
  }
}
