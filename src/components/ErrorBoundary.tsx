import React, { Component, ErrorInfo, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
}

class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="bg-white p-8 rounded-[32px] shadow-xl border border-gray-100 max-w-md text-center">
            <h2 className="text-2xl font-black text-gray-900 mb-4">Ops! Algo deu errado.</h2>
            <p className="text-gray-500 mb-6 font-medium">O portal encontrou um problema técnico. Tente recarregar a página.</p>
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

    return this.props.children;
  }
}

export default ErrorBoundary;
