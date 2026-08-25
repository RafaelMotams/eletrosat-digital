/**
 * AdminLayoutAuto — detecta automaticamente o tipo de autenticação:
 * - Se há token de tenant_admin no localStorage → usa AdminLayoutTenant (email/senha)
 * - Sem token → redireciona ao login, sem exibir dados de outro tenant
 */
import AdminLayoutTenant from "./AdminLayoutTenant";
import { useEffect } from "react";
import { useLocation } from "wouter";

interface AdminLayoutAutoProps {
  children: React.ReactNode;
  title: string;
}

export default function AdminLayoutAuto({ children, title }: AdminLayoutAutoProps) {
  const hasTenantToken = !!localStorage.getItem("tenant_admin_token");
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!hasTenantToken) navigate("/admin/login");
  }, [hasTenantToken, navigate]);

  if (hasTenantToken) {
    return <AdminLayoutTenant title={title}>{children}</AdminLayoutTenant>;
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-300 text-sm">
      Redirecionando para o login seguro...
    </div>
  );
}
