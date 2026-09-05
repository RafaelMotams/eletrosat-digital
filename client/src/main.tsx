import { trpc } from "@/lib/trpc";
import { UNAUTHED_ERR_MSG } from '@shared/const';
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { httpBatchLink, TRPCClientError } from "@trpc/client";
import { createRoot } from "react-dom/client";
import superjson from "superjson";
import App from "./App";
import "./index.css";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Evita refetch desnecessário ao focar a janela (causa reinicialização no mobile)
      refetchOnWindowFocus: false,
      // Dados ficam frescos por 5 minutos antes de refetch automático
      staleTime: 5 * 60 * 1000,
      // Não fazer retry automático em erros de autenticação
      retry: (failureCount, error) => {
        if (error instanceof TRPCClientError && error.message === UNAUTHED_ERR_MSG) return false;
        return failureCount < 2;
      },
    },
  },
});

const redirectToLoginIfUnauthorized = (error: unknown) => {
  if (!(error instanceof TRPCClientError)) return;
  if (typeof window === "undefined") return;
  const trpcCode = (error.data as { code?: string } | undefined)?.code;
  const isUnauthorized = error.message === UNAUTHED_ERR_MSG || trpcCode === "UNAUTHORIZED";
  if (!isUnauthorized) return;
  const path = window.location.pathname;

  // Sessão de tenant inválida não pode deixar a tela administrativa aberta com
  // consultas vazias; remove somente o resumo local e solicita novo login.
  if (path.startsWith("/admin") && !path.startsWith("/admin/login") && !path.startsWith("/admin/cadastro")) {
    localStorage.removeItem("tenant_admin_info");
    window.location.href = "/admin/login";
    return;
  }

  if (path.startsWith("/superadmin") && !path.startsWith("/superadmin/login")) {
    localStorage.removeItem("sa_admin");
    window.location.href = "/superadmin/login";
    return;
  }

  // O técnico mantém a fila offline no dispositivo, mas precisa renovar a sessão
  // para voltar a consultar ou sincronizar dados no servidor.
  if (path.startsWith("/tecnico") && !path.startsWith("/tecnico/login")) {
    window.location.href = "/tecnico/login?reason=session-expired";
  }
};

queryClient.getQueryCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.query.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Query Error]", error);
  }
});

queryClient.getMutationCache().subscribe(event => {
  if (event.type === "updated" && event.action.type === "error") {
    const error = event.mutation.state.error;
    redirectToLoginIfUnauthorized(error);
    console.error("[API Mutation Error]", error);
  }
});

const trpcClient = trpc.createClient({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async headers() {
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, {
          ...(init ?? {}),
          credentials: "include",
        });
      },
    }),
  ],
});

const analyticsEndpoint = import.meta.env.VITE_ANALYTICS_ENDPOINT as string | undefined;
const analyticsWebsiteId = import.meta.env.VITE_ANALYTICS_WEBSITE_ID as string | undefined;
if (analyticsEndpoint && analyticsWebsiteId) {
  const analytics = document.createElement("script");
  analytics.defer = true;
  analytics.src = `${analyticsEndpoint.replace(/\/$/, "")}/umami`;
  analytics.dataset.websiteId = analyticsWebsiteId;
  document.head.appendChild(analytics);
}

// Registrar Service Worker para suporte offline
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch(() => {});
  });
}

createRoot(document.getElementById("root")!).render(
  <trpc.Provider client={trpcClient} queryClient={queryClient}>
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  </trpc.Provider>
);
