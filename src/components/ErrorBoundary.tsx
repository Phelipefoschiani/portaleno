import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    fetch('/api/log', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: error.message, stack: error.stack, info: errorInfo })
    }).catch(console.error);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-gray-100 max-w-md text-center">
            <h2 className="text-2xl font-black text-gray-900 mb-4">Ops! Algo deu errado.</h2>
            <p className="text-gray-500 mb-6 font-medium">O portal encontrou um problema técnico. Tente recarregar a página.</p>
            {this.state.error && (
              <div className="bg-red-50 text-red-600 p-4 rounded-xl mb-6 text-sm text-left overflow-auto">
                {this.state.error.message}
              </div>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-8 py-4 bg-primary text-white rounded-2xl font-black tracking-tight hover:bg-secondary transition-all w-full"
            >
              Recarregar Portal
            </button>
          </div>
        </div>
      );
    }

    return (this as any).props.children;
  }
}

export default ErrorBoundary;
