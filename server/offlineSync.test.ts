import { describe, expect, it } from "vitest";
import { ensurePhotoUploadsSucceeded, isRetryableOfflineStatus } from "../client/src/lib/offlineSyncGuard";

describe("integridade da sincronização offline de fotos", () => {
  it("permite remover da fila apenas quando todas as fotos foram enviadas", () => {
    expect(() => ensurePhotoUploadsSucceeded(0)).not.toThrow();
  });

  it("mantém a operação pendente quando qualquer foto falha", () => {
    expect(() => ensurePhotoUploadsSucceeded(1)).toThrow(/não foram enviadas/);
  });

  it("recupera uma operação interrompida em sincronização", () => {
    expect(isRetryableOfflineStatus("syncing")).toBe(true);
    expect(isRetryableOfflineStatus("done")).toBe(false);
  });
});
