import { trpc } from "@/lib/trpc";

/** A identidade técnica é sempre derivada do cookie HttpOnly validado no servidor. */
export function useTecnicoSession(enabled = true) {
  const query = trpc.tecnicoAuth.me.useQuery(undefined, {
    enabled,
    retry: false,
    refetchOnWindowFocus: false,
  });

  return {
    ...query,
    tecnicoId: query.data?.id ?? 0,
    tenantId: query.data?.tenantId ?? 0,
    tecnico: query.data ?? null,
  };
}
