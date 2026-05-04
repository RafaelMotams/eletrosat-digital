import { createTRPCReact } from "@trpc/react-query";
import { createTRPCClient, httpBatchLink, httpLink } from "@trpc/client";
import superjson from "superjson";
import type { AppRouter } from "../../../server/routers";
export const trpc = createTRPCReact<AppRouter>();
/** Cliente vanilla tRPC para uso fora de componentes React (ex: hooks de sync offline) */
export const trpcClient = createTRPCClient<AppRouter>({
  links: [
    httpBatchLink({
      url: "/api/trpc",
      transformer: superjson,
      async headers() {
        const tenantToken = localStorage.getItem("tenant_admin_token");
        if (tenantToken) return { Authorization: `Bearer ${tenantToken}` };
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
      },
    }),
  ],
});

/**
 * Cliente tRPC SEM batching — usado para upload de fotos.
 * O httpBatchLink agrupa múltiplas chamadas em um único request, o que pode
 * causar falha silenciosa quando o payload total (várias fotos base64) fica
 * muito grande. Com httpLink cada foto é enviada em um request separado.
 */
export const trpcUploadClient = createTRPCClient<AppRouter>({
  links: [
    httpLink({
      url: "/api/trpc",
      transformer: superjson,
      async headers() {
        const tenantToken = localStorage.getItem("tenant_admin_token");
        if (tenantToken) return { Authorization: `Bearer ${tenantToken}` };
        return {};
      },
      fetch(input, init) {
        return globalThis.fetch(input, { ...(init ?? {}), credentials: "include" });
      },
    }),
  ],
});;
