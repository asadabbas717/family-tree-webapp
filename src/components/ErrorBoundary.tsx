import { Component, type ErrorInfo, type ReactNode } from 'react';

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Family Tree UI error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <main className="recovery-shell">
          <section className="recovery-card">
            <span className="eyebrow">Display error</span>
            <h1>The family tree interface hit an unexpected error.</h1>
            <p>
              Your saved family data was not intentionally deleted. Reload the page first; if the
              problem continues, export browser storage before resetting anything.
            </p>
            <button
              className="primary-button"
              type="button"
              onClick={() => window.location.reload()}
            >
              Reload app
            </button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
