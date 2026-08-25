/**
 * Não permite que uma operação offline saia da fila quando parte das fotos
 * obrigatórias não alcançou o servidor.
 */
export function ensurePhotoUploadsSucceeded(failures: number): void {
  if (failures > 0) {
    throw new Error(`${failures} foto(s) não foram enviadas. A sincronização será repetida.`);
  }
}

/** Operações interrompidas em "syncing" devem voltar à fila na próxima abertura do app. */
export function isRetryableOfflineStatus(status: "pending" | "syncing" | "done" | "error"): boolean {
  return status === "pending" || status === "syncing" || status === "error";
}

export type OfflineBannerMode = "hidden" | "offline" | "syncing" | "success" | "error";

export function getOfflineBannerMode(input: {
  isOnline: boolean;
  isSyncing: boolean;
  pendingCount: number;
  hasSyncError: boolean;
  previousMode: OfflineBannerMode;
}): OfflineBannerMode {
  if (input.isSyncing) return "syncing";
  if (!input.isOnline) return "offline";
  if (input.hasSyncError && input.pendingCount > 0) return "error";
  if (input.pendingCount > 0) return "syncing";
  return input.previousMode === "success" ? "success" : "hidden";
}
