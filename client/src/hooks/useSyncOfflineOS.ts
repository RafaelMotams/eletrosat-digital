/**
 * useSyncOfflineOS — sincroniza automaticamente as OS pendentes
 * quando o dispositivo recupera a conexão com a internet.
 *
 * Fluxo:
 *  1. Ao montar (ou ao voltar online), busca todas as OS com status "pending"/"error"
 *  2. Para cada OS: chama concluirEscola → obtém osId → faz upload das fotos
 *  3. Atualiza o status no IndexedDB
 *  4. Notifica o React Query para invalidar as queries relevantes
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useOnlineStatus } from "./useOnlineStatus";
import {
  dbGetPendingOS,
  dbUpdateOSStatus,
  dbRemoveDoneOS,
  PendingOS,
} from "./useOfflineDB";
import { trpcClient } from "@/lib/trpc";

export type SyncState = {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: number | null;
  lastError: string | null;
};

export function useSyncOfflineOS(onSyncDone?: () => void) {
  const isOnline = useOnlineStatus();
  const syncingRef = useRef(false);
  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    lastError: null,
  });

  const refreshPendingCount = useCallback(async () => {
    const pending = await dbGetPendingOS();
    setSyncState((s) => ({ ...s, pendingCount: pending.length }));
  }, []);

  const syncOne = useCallback(async (os: PendingOS): Promise<boolean> => {
    try {
      await dbUpdateOSStatus(os.id, "syncing");

      if (os.tipo === "iniciar") {
        // Apenas iniciar a OS no servidor
        await trpcClient.tecnicoAuth.iniciarOS.mutate({
          tecnicoId: os.tecnicoId,
          escolaId: os.escolaId,
        });
        await dbUpdateOSStatus(os.id, "done");
        return true;
      }

      // Passo 1: Concluir a OS no servidor
      const resultado = await trpcClient.tecnicoAuth.concluirEscola.mutate({
        tecnicoId: os.tecnicoId,
        escolaId: os.escolaId,
        qtdApInstalado: os.qtdApInstalado,
        observacao: os.observacao,
      });

      const osIdFinal: number = (resultado as { osId?: number })?.osId ?? 0;

      // Passo 2: Upload das fotos (se houver osId válido)
      if (osIdFinal > 0 && os.fotos.length > 0) {
        for (const foto of os.fotos) {
          try {
            await trpcClient.tecnicoAuth.uploadOsFoto.mutate({
              osId: osIdFinal,
              escolaId: os.escolaId,
              tecnicoId: os.tecnicoId,
              categoria: foto.categoria as
                | "mapa_calor"
                | "fotos_ap"
                | "etiqueta_controladora"
                | "etiqueta_nobreak"
                | "etiqueta_switch",
              imageBase64: foto.imageBase64,
              mimeType: foto.mimeType,
            });
          } catch {
            // Continua mesmo se uma foto falhar
          }
        }
      }

      await dbUpdateOSStatus(os.id, "done");
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      await dbUpdateOSStatus(os.id, "error", { errorMsg: msg });
      return false;
    }
  }, []);

  const runSync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;

    const pending = await dbGetPendingOS();
    if (pending.length === 0) return;

    syncingRef.current = true;
    setSyncState((s) => ({ ...s, isSyncing: true, lastError: null }));

    let anyError = false;
    for (const os of pending) {
      const ok = await syncOne(os);
      if (!ok) anyError = true;
    }

    // Remove as OS já sincronizadas do IndexedDB
    await dbRemoveDoneOS();

    const remaining = await dbGetPendingOS();
    syncingRef.current = false;
    setSyncState({
      isSyncing: false,
      pendingCount: remaining.length,
      lastSyncAt: Date.now(),
      lastError: anyError ? "Algumas OS falharam. Tentando novamente..." : null,
    });

    if (!anyError) onSyncDone?.();
  }, [syncOne, onSyncDone]);

  // Sincroniza ao montar (se online)
  useEffect(() => {
    refreshPendingCount();
    if (isOnline) {
      runSync();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sincroniza ao voltar online
  useEffect(() => {
    if (isOnline) {
      runSync();
    }
  }, [isOnline, runSync]);

  // Tenta novamente a cada 2 minutos se houver pendentes
  useEffect(() => {
    const interval = setInterval(() => {
      if (isOnline && syncState.pendingCount > 0) {
        runSync();
      }
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isOnline, syncState.pendingCount, runSync]);

  return { syncState, runSync, refreshPendingCount };
}
