import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, Copy, Check, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  copied: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
    copied: false,
  };

  public static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null,
      copied: false,
    };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary a capturé une exception non gérée :', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleCopy = () => {
    const errorDetails = `=== CRASH REPORT FICHEMASTER IA ===
Date: ${new Date().toISOString()}
Message: ${this.state.error?.message || 'Erreur inconnue'}
Stack:
${this.state.error?.stack || 'Pas de stack trace'}
Component Stack:
${this.state.errorInfo?.componentStack || 'Non disponible'}`;

    navigator.clipboard.writeText(errorDetails).then(() => {
      this.setState({ copied: true });
      setTimeout(() => this.setState({ copied: false }), 3000);
    });
  };

  private handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      copied: false,
    });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#04060C] text-slate-100 flex items-center justify-center p-4">
          <div className="max-w-xl w-full bg-[#0A0E19] border border-rose-500/35 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center gap-3 text-rose-400 mb-4">
              <div className="p-3 bg-rose-500/10 rounded-xl border border-rose-500/25">
                <AlertTriangle className="w-7 h-7 text-rose-400" />
              </div>
              <div>
                <h2 className="font-display text-xl font-bold tracking-tight text-white">
                  {this.props.fallbackTitle || "Interception d'incident d'affichage"}
                </h2>
                <p className="text-sm text-slate-400">
                  Une anomalie (ex: formule LaTeX complexe ou élément mal formé) a été contenue.
                </p>
              </div>
            </div>

            <div className="bg-[#04060C] rounded-xl p-4 border border-white/[0.08] mb-5 overflow-hidden">
              <p className="text-xs font-semibold text-slate-400 mb-1">Détail de l'erreur</p>
              <pre className="text-xs font-mono text-rose-300 overflow-x-auto whitespace-pre-wrap max-h-48 leading-relaxed">
                {this.state.error?.message || 'Erreur de composant React'}
              </pre>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <button
                type="button"
                onClick={this.handleCopy}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#04060C] hover:bg-[#101625] text-slate-200 font-medium text-sm transition-colors border border-white/[0.1]"
              >
                {this.state.copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-400">Rapport copié</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 text-amber-400" />
                    <span>Copier le rapport</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={this.handleReset}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#04060C] font-bold text-sm transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Recharger la page</span>
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
