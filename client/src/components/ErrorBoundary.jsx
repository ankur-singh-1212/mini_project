import { Component } from "react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    console.error("Page crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="page">
          <div className="card card--padded">
            <h2 className="section-title">Something went wrong</h2>
            <p className="muted mt-2">
              This page couldn&apos;t be displayed. Please try reloading.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-ink-500 mt-2">{this.state.error.message}</p>
            )}
            <button
              type="button"
              className="btn btn-primary mt-4"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
