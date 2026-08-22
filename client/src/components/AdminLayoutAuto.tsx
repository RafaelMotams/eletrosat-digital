/**
 * AdminLayoutAuto — protege o painel com a sessão administrativa do tenant.
 * O painel Netvius não usa OAuth da plataforma como fallback de acesso.
 */
import AdminLayoutTenant from "./AdminLayoutTenant";
import { useTenantAuth } from "@/hooks/useTenantAuth";
import { useEffect } from "react";
import { useLocation } from "wouter";

interface AdminLayoutAutoProps {
  children: React.ReactNode;
  title: string;
}

export default function AdminLayoutAuto({ children, title }: AdminLayoutAutoProps) {
  const { isAuthenticated, loading } = useTenantAuth();
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/admin/login", { replace: true });
  }, [isAuthenticated, loading, navigate]);

  if (loading) {
    return <div className="min-h-screen bg-slate-950" aria-label="Validando sessão administrativa" />;
  }

  if (isAuthenticated) {
    return <AdminLayoutTenant title={title}>{children}</AdminLayoutTenant>;
  }

  return null;
}
