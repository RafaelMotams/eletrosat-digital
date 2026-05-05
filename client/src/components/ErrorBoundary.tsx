import { AlertTriangle, RotateCcw, Home } from "lucide-react";
import { Component, ReactNode } from "react";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: string | null;
}

class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: { componentStack: string }) {
    // Log para debugging sem expor ao usuário
    console.error("[ErrorBoundary] Erro capturado:", error.message);
    this.setState({ errorInfo: info.componentStack });
  }

  render() {
    if (this.state.hasError) {
      const isNetworkError =
        this.state.error?.message?.toLowerCase().includes("network") ||
        this.state.error?.message?.toLowerCase().includes("fetch") ||
        this.state.error?.message?.toLowerCase().includes("trpc") ||
        this.state.error?.message?.toLowerCase().includes("failed to fetch");

      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "100vh",
            padding: "2rem",
            background: "#0f172a",
            fontFamily: "'Plus Jakarta Sans', sans-serif",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              width: "100%",
              maxWidth: "480px",
              padding: "2.5rem",
              background: "rgba(30,41,59,0.95)",
              borderRadius: "1.5rem",
              border: "1px solid rgba(239,68,68,0.3)",
              boxShadow: "0 25px 50px rgba(0,0,0,0.5)",
              textAlign: "center",
            }}
          >
            <div
              style={{
                width: "72px",
                height: "72px",
                borderRadius: "50%",
                background: "rgba(239,68,68,0.15)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                marginBottom: "1.5rem",
                border: "2px solid rgba(239,68,68,0.4)",
              }}
            >
              <AlertTriangle size={36} style={{ color: "#ef4444" }} />
            </div>

            <h2
              style={{
                fontSize: "1.25rem",
                fontWeight: 700,
                color: "#f1f5f9",
                marginBottom: "0.75rem",
              }}
            >
              Algo deu errado
            </h2>

            <p
              style={{
                fontSize: "0.875rem",
                color: "#94a3b8",
                marginBottom: "1.25rem",
                lineHeight: 1.6,
              }}
            >
              {isNetworkError
                ? "Erro de conexão com o servidor. Verifique sua internet e tente novamente."
                : "Ocorreu um erro inesperado no aplicativo. Recarregue a página para continuar."}
            </p>

            {this.state.error?.message && (
              <p
                style={{
                  fontSize: "0.75rem",
                  color: "#64748b",
                  marginBottom: "1.5rem",
                  fontFamily: "monospace",
                  background: "rgba(0,0,0,0.3)",
                  padding: "0.5rem 0.75rem",
                  borderRadius: "0.5rem",
                  maxWidth: "100%",
                  wordBreak: "break-word",
                  textAlign: "left",
                }}
              >
                {this.state.error.message.slice(0, 150)}
              </p>
            )}

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                flexWrap: "wrap",
                justifyContent: "center",
              }}
            >
              <button
                onClick={() => window.location.reload()}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.75rem",
                  background: "linear-gradient(135deg, #3b82f6, #1d4ed8)",
                  color: "white",
                  fontWeight: 700,
                  fontSize: "0.875rem",
                  border: "none",
                  cursor: "pointer",
                  boxShadow: "0 4px 12px rgba(59,130,246,0.3)",
                }}
              >
                <RotateCcw size={16} />
                Recarregar Página
              </button>

              <button
                onClick={() => {
                  window.location.href = "/";
                }}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  padding: "0.75rem 1.5rem",
                  borderRadius: "0.75rem",
                  background: "rgba(255,255,255,0.05)",
                  color: "#94a3b8",
                  fontWeight: 600,
                  fontSize: "0.875rem",
                  border: "1px solid rgba(255,255,255,0.1)",
                  cursor: "pointer",
                }}
              >
                <Home size={16} />
                Ir para Início
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
