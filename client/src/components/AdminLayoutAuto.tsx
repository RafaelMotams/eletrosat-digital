/**
 * AdminLayoutAuto — detecta automaticamente o tipo de autenticação:
 * - Se há token de tenant_admin no localStorage → usa AdminLayoutTenant (email/senha)
 * - Caso contrário → usa AdminLayout (Manus OAuth)
 */
import AdminLayout from "./AdminLayout";
import AdminLayoutTenant from "./AdminLayoutTenant";

interface AdminLayoutAutoProps {
  children: React.ReactNode;
  title: string;
}

export default function AdminLayoutAuto({ children, title }: AdminLayoutAutoProps) {
  const hasTenantToken = !!localStorage.getItem("tenant_admin_token");

  if (hasTenantToken) {
    return <AdminLayoutTenant title={title}>{children}</AdminLayoutTenant>;
  }

  return <AdminLayout title={title}>{children}</AdminLayout>;
}
