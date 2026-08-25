import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";

export interface TenantAdminInfo {
  id: number;
  nome: string;
  email: string;
  role: string;
  tenantId: number;
  isSuperAdmin: boolean;
  tenant?: {
    id: number;
    nome: string;
    slug: string;
    plano: string;
    status: string;
  } | null;
}

export function useTenantAuth() {
  const sessionQuery = trpc.tenantSession.me.useQuery(undefined, { retry: false, staleTime: 5 * 60 * 1000 });
  const logoutMutation = trpc.tenantSession.logout.useMutation();
  const admin = (sessionQuery.data ?? null) as TenantAdminInfo | null;

  const logout = () => {
    logoutMutation.mutate(undefined, { onSettled: () => { window.location.href = "/admin/login"; } });
  };

  return { admin, loading: sessionQuery.isLoading, logout, token: "", isAuthenticated: !!admin };
}
