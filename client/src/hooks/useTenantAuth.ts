import { useState, useEffect } from "react";

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
  const [admin, setAdmin] = useState<TenantAdminInfo | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("tenant_admin_token");
    const info = localStorage.getItem("tenant_admin_info");
    if (token && info) {
      try {
        setAdmin(JSON.parse(info));
      } catch {
        localStorage.removeItem("tenant_admin_token");
        localStorage.removeItem("tenant_admin_info");
      }
    }
    setLoading(false);
  }, []);

  const logout = () => {
    localStorage.removeItem("tenant_admin_token");
    localStorage.removeItem("tenant_admin_info");
    setAdmin(null);
    window.location.href = "/admin/login";
  };

  const token = localStorage.getItem("tenant_admin_token") ?? "";

  return { admin, loading, logout, token, isAuthenticated: !!admin };
}
