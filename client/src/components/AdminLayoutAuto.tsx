/**
 * AdminLayoutAuto — detecta automaticamente o tipo de autenticação:
 * - Se há token de tenant_admin no localStorage → usa AdminLayoutTenant (email/senha)
 * - Caso contrário → usa AdminLayout (Manus OAuth)
 */
import AdminLayout from "./AdminLayout";
import AdminLayoutTenant from "./AdminLayoutTenant";
import { useTenantAuth } from "@/hooks/useTenantAuth";

interface AdminLayoutAutoProps {
  children: React.ReactNode;
  title: string;
}

export default function AdminLayoutAuto({ children, title }: AdminLayoutAutoProps) {
  const { isAuthenticated } = useTenantAuth();

  if (isAuthenticated) {
    return <AdminLayoutTenant title={title}>{children}</AdminLayoutTenant>;
  }

  return <AdminLayout title={title}>{children}</AdminLayout>;
}
