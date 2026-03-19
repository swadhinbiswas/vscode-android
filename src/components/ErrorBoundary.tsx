import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  public handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-vscode-bg p-4">
          <div className="max-w-md w-full bg-vscode-sidebar border border-vscode-border rounded-lg p-6 text-center">
            <div className="flex items-center justify-center mb-4">
              <AlertTriangle className="w-12 h-12 text-sync-error" />
            </div>
            
            <h1 className="text-xl font-semibold text-vscode-foreground mb-2">
              Something went wrong
            </h1>
            
            <p className="text-sm text-vscode-gutter-foreground mb-4">
              An unexpected error occurred. You can try to reload the application.
            </p>

            {this.state.error && (
              <div className="mb-4 p-3 bg-vscode-bg rounded border border-vscode-border text-left">
                <p className="text-xs text-sync-error font-mono break-words">
                  {this.state.error.toString()}
                </p>
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="flex items-center justify-center gap-2 w-full px-4 py-2 bg-vscode-blue text-white rounded hover:bg-vscode-blue/80 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload Application</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// Error boundary component for catching React errors
