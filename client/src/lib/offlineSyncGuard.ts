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
