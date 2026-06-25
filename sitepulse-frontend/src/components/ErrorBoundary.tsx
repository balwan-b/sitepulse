import React from "react";

type Props = { children: React.ReactNode };

export class ErrorBoundary extends React.Component<
  Props,
  { hasError: boolean }
> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    // Intentionally minimal; could forward to sentry via fetch or SDK in future
    // eslint-disable-next-line no-console
    console.error("Unhandled error in UI:", error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4">
          Something went wrong. Try refreshing the page.
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
