/**
 * AdminLayoutAuto — detecta automaticamente o tipo de autenticação:
 * - O cookie HttpOnly mantém a sessão do tenant; o resumo local apenas informa
 *   que a interface pode montar enquanto as chamadas autenticadas verificam a sessão.
 * - Sem resumo → redireciona ao login, sem exibir dados de outro tenant.
 */
import AdminLayoutTenant from "./AdminLayoutTenant";
import { useEffect } from "react";
import { useLocation } from "wouter";

interface AdminLayoutAutoProps {
  children: React.ReactNode;
  title: string;
}

export default function AdminLayoutAuto({ children, title }: AdminLayoutAutoProps) {
  const hasTenantSession = !!localStorage.getItem("tenant_admin_info");
  const [, navigate] = useLocation();

  useEffect(() => {
    if (!hasTenantSession) navigate("/admin/login");
  }, [hasTenantSession, navigate]);

  if (hasTenantSession) {
    return <AdminLayoutTenant title={title}>{children}</AdminLayoutTenant>;
  }

  return (
    <div className="min-h-screen grid place-items-center bg-slate-950 text-slate-300 text-sm">
      Redirecionando para o login seguro...
    </div>
  );
}
