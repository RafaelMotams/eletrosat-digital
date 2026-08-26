export type OfflineQueueScope = { tenantId: number; tecnicoId: number };

export function pertenceAoEscopoOffline(
  item: { tenantId?: number; tecnicoId: number },
  scope: OfflineQueueScope,
): boolean {
  return item.tenantId === scope.tenantId && item.tecnicoId === scope.tecnicoId;
}
