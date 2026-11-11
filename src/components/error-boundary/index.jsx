import React from "react";

/**
 * Small reusable error boundary.
 *
 * Catches errors thrown while rendering (or in effects of) its children and
 * shows a friendly message with a "Try again" button instead of blanking the
 * whole application.
 *
 * Usage:
 *   <ErrorBoundary label="Heatmap"> <HeatMap ... /> </ErrorBoundary>
 *   export default withErrorBoundary(MyChart, { label: "My chart" });
 *
 * Props:
 *   label      - short name of the wrapped view, used in the message
 *   resetKeys  - array; when any entry changes the boundary resets itself
 *                (e.g. pass the result object so a new calculation retries)
 *   fallback   - optional render prop ({ error, reset }) => node
 *   onError    - optional (error, info) => void
 */
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, attempt: 0 };
    this.reset = this.reset.bind(this);
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error(
      `[ErrorBoundary${this.props.label ? `: ${this.props.label}` : ""}]`,
      error,
      info?.componentStack
    );
    if (typeof this.props.onError === "function") {
      try {
        this.props.onError(error, info);
      } catch (e) {
        // ignore errors raised by the error handler itself
      }
    }
  }

  componentDidUpdate(prevProps) {
    if (!this.state.error) return;
    const prev = prevProps.resetKeys || [];
    const next = this.props.resetKeys || [];
    if (prev.length !== next.length || prev.some((value, idx) => !Object.is(value, next[idx]))) {
      this.reset();
    }
  }

  reset() {
    this.setState((state) => ({ error: null, attempt: state.attempt + 1 }));
  }

  render() {
    const { error, attempt } = this.state;
    const { children, label, fallback } = this.props;

    if (!error) {
      // The key forces a clean remount of the subtree after "Try again".
      return <React.Fragment key={attempt}>{children}</React.Fragment>;
    }

    if (typeof fallback === "function") {
      return fallback({ error, reset: this.reset });
    }

    return (
      <div
        role="alert"
        style={{
          margin: "12px 0",
          padding: "14px 16px",
          border: "1px solid #f5c2c7",
          borderLeft: "4px solid #dc3545",
          borderRadius: 6,
          background: "#fff5f5",
          color: "#842029",
          fontSize: 14,
          lineHeight: 1.5,
        }}
      >
        <div style={{ fontWeight: 600, marginBottom: 4 }}>
          {label ? `${label} could not be displayed` : "This view could not be displayed"}
        </div>
        <div style={{ marginBottom: 10, color: "#6c757d" }}>
          Something went wrong while drawing this part of the page. The rest of the
          application is still usable.
          {error?.message ? (
            <span style={{ display: "block", marginTop: 4, fontFamily: "monospace", fontSize: 12 }}>
              {String(error.message).slice(0, 300)}
            </span>
          ) : null}
        </div>
        <button
          type="button"
          onClick={this.reset}
          style={{
            padding: "6px 14px",
            border: "1px solid #dc3545",
            borderRadius: 4,
            background: "#ffffff",
            color: "#dc3545",
            cursor: "pointer",
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          Try again
        </button>
      </div>
    );
  }
}

/**
 * HOC variant. `options.resetKeys` may be a function (props) => array.
 */
const withErrorBoundary = (Component, options = {}) => {
  const { label, resetKeys, fallback, onError } = options;
  const Wrapped = (props) => (
    <ErrorBoundary
      label={label}
      fallback={fallback}
      onError={onError}
      resetKeys={typeof resetKeys === "function" ? resetKeys(props) : resetKeys}
    >
      <Component {...props} />
    </ErrorBoundary>
  );
  Wrapped.displayName = `withErrorBoundary(${
    Component.displayName || Component.name || label || "Component"
  })`;
  return Wrapped;
};

export { ErrorBoundary, withErrorBoundary };
export default ErrorBoundary;
