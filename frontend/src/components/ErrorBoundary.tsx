"use client";

import { Component, type ReactNode } from "react";
import { clientLogger } from "@/lib/logger";

type Props = {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
};

type State = {
  error: Error | null;
};

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: { componentStack?: string | null }): void {
    clientLogger.error("react error boundary caught", {
      err: String(error),
      stack: error.stack,
      componentStack: info.componentStack,
    });
  }

  reset = (): void => {
    this.setState({ error: null });
  };

  render(): ReactNode {
    const { error } = this.state;
    if (!error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(error, this.reset);
    }

    return (
      <div
        role="alert"
        className="m-6 max-w-2xl rounded-lg border border-red-200 bg-red-50 p-4 text-sm"
      >
        <p className="font-semibold text-red-800">Something went wrong</p>
        <p className="mt-1 text-red-700">{error.message}</p>
        <button
          type="button"
          onClick={this.reset}
          className="mt-3 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    );
  }
}
