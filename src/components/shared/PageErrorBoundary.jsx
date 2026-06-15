import React from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/**
 * PageErrorBoundary — catches render errors in any child component
 * and shows a friendly error UI with a retry button instead of a blank page.
 */
export default class PageErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  handleRetry = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center px-6">
          <div className="text-center max-w-sm">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-5"
              style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertTriangle className="w-8 h-8 text-red-400" />
            </div>
            <h2 className="font-heading font-black text-xl text-white mb-2">Something went wrong</h2>
            <p className="text-white/40 text-sm leading-relaxed mb-6">
              This page couldn't load correctly. This might be a temporary issue.
            </p>
            <button
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl font-black text-sm tracking-wider transition-all hover:brightness-110 active:scale-95"
              style={{ background: "linear-gradient(135deg,rgba(0,160,220,0.8),rgb(0,160,220))", color: "#fff" }}>
              <RefreshCw className="w-4 h-4" /> Try Again
            </button>
            {this.props.showRetry && (
              <button
                onClick={() => window.location.reload()}
                className="mt-3 block mx-auto text-sm text-white/30 hover:text-white/60 transition-colors">
                Reload page
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}