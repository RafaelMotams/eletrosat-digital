export type TenantPanelRole = "admin" | "viewer";

export type TenantCapability =
  | "operational:read"
  | "operational:mutate"
  | "financial:read"
  | "financial:export"
  | "sessions:manage";

/** Matriz única para o painel de uma empresa; o Master é control plane separado. */
export const TENANT_ROLE_CAPABILITIES: Record<TenantPanelRole, readonly TenantCapability[]> = {
  admin: ["operational:read", "operational:mutate", "financial:read", "financial:export", "sessions:manage"],
  viewer: ["operational:read"],
};

export function tenantRoleCan(role: TenantPanelRole, capability: TenantCapability): boolean {
  return TENANT_ROLE_CAPABILITIES[role].includes(capability);
}
