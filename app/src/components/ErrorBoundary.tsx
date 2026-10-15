import { Component, type ErrorInfo, type ReactNode } from "react";

type ErrorBoundaryProps = {
  children: ReactNode;
  onReset?: () => void;
  fallbackTitle?: string;
};

type ErrorBoundaryState = {
  error: Error | null;
};

/**
 * Isolates unexpected rendering or canvas assertion failures inside the
 * converter workspace so a runtime throw in Glide Data Grid or CodeMirror
 * renders a recoverable fallback instead of unmounting the React 19 root tree
 * into a blank white page.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Converter workspace error boundary caught:", error, info);
  }

  private handleReset = () => {
    this.setState({ error: null });
    this.props.onReset?.();
  };

  render() {
    if (this.state.error) {
      return (
        <div
          data-testid="error-boundary-fallback"
          role="alert"
          className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center"
        >
          <p className="text-sm font-medium text-foreground">
            {this.props.fallbackTitle ??
              "Something went wrong while rendering this view."}
          </p>
          <p className="max-w-md font-mono text-xs text-muted-foreground">
            {this.state.error.message}
          </p>
          <button
            type="button"
            data-testid="error-boundary-reset"
            onClick={this.handleReset}
            className="rounded border border-border bg-secondary px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring"
          >
            Reset view
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
