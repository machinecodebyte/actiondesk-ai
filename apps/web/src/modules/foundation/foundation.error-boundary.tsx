"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { Button, Card, CardBody } from "@actiondesk/ui";

type ErrorBoundaryState = {
  hasError: boolean;
};

export class FoundationErrorBoundary extends Component<
  Readonly<{ children: ReactNode }>,
  ErrorBoundaryState
> {
  state: ErrorBoundaryState = {
    hasError: false
  };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error("Unhandled UI error", { error, componentStack: info.componentStack });
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main className="flex min-h-screen items-center justify-center bg-mist p-6">
        <Card className="max-w-lg">
          <CardBody className="space-y-4">
            <h1 className="text-xl font-semibold text-ink">Something went wrong</h1>
            <p className="text-sm leading-6 text-slate-600">
              The foundation shell caught a rendering error. Reloading will reset this client state.
            </p>
            <Button onClick={() => window.location.reload()}>Reload</Button>
          </CardBody>
        </Card>
      </main>
    );
  }
}
