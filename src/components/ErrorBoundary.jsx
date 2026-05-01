import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // In production you'd send this to an error tracking service
    console.error("ErrorBoundary caught:", error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;

    return (
      <div className="min-h-screen bg-surface flex items-center justify-center p-6">
        <div className="card max-w-md w-full p-8 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto">
            <AlertTriangle size={28} className="text-red-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-100 mb-2">Something went wrong</h1>
            <p className="text-sm text-slate-400">
              An unexpected error occurred. Try refreshing the page.
            </p>
            {this.state.error?.message && (
              <p className="text-xs text-slate-600 mt-3 font-mono bg-surface-hover rounded-lg px-3 py-2">
                {this.state.error.message}
              </p>
            )}
          </div>
          <button
            onClick={() => window.location.reload()}
            className="btn btn-primary w-full"
          >
            <RefreshCw size={15} /> Reload Page
          </button>
        </div>
      </div>
    );
  }
}
