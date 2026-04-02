'use client';

import React, { Component, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null });
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen flex items-center justify-center bg-background">
          <div className="max-w-md mx-auto p-8 text-center">
            <div className="w-16 h-16 bg-destructive/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold text-foreground mb-2">
              Terjadi Kesalahan
            </h2>
            <p className="text-sm text-muted-foreground mb-2">
              Aplikasi mengalami error yang tidak terduga. Anda dapat mencoba memuat ulang halaman.
            </p>
            {this.state.error && (
              <p className="text-xs text-muted-foreground/70 font-mono bg-muted p-3 rounded-lg mb-6 break-all text-left">
                {this.state.error.message}
              </p>
            )}
            <div className="flex gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-muted hover:bg-accent rounded-lg transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Coba Lagi
              </button>
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-primary-foreground bg-primary hover:bg-primary/90 rounded-lg transition-colors"
              >
                Muat Ulang
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
