/**
 * useSyncOfflineOS — sincroniza automaticamente as OS pendentes
 * quando o dispositivo recupera a conexão com a internet.
 *
 * Fluxo:
 *  1. Ao montar (ou ao voltar online), busca todas as OS com status "pending"/"error"
 *  2. Para cada OS: MARCA como "syncing" ANTES de enviar (evita reenvio duplo)
 *  3. Chama concluirEscola → obtém osId → faz upload das fotos
 *  4. Marca como "done" e remove do IndexedDB
 *
 * ANTI-DUPLICAÇÃO & ESTABILIDADE:
 *  - syncingRef global: impede duas execuções simultâneas de runSync
 *  - syncingItemsRef: Set de IDs já em processamento (evita processar a mesma OS duas vezes)
 *  - Status "syncing" persistido no IndexedDB: se o app reiniciar durante sync,
 *    a OS fica como "syncing" e é resetada para "error" na próxima execução
 *  - Backend: concluirEscola é idempotente (verifica OS existente antes de criar)
 *  - Backend: uploadOsFoto verifica duplicata por clientId antes de inserir
 *  - Retry com backoff exponencial: 3 tentativas com delay crescente (1s, 2s, 4s)
 *  - Timeout de 60s por upload de foto para não travar o app
 */

import { useEffect, useRef, useCallback, useState } from "react";
import { useOnlineStatus } from "./useOnlineStatus";
import {
  dbGetPendingOS,
  dbUpdateOSStatus,
  dbRemoveDoneOS,
  PendingOS,
} from "./useOfflineDB";
import { trpcClient, trpcUploadClient } from "@/lib/trpc";

export type SyncState = {
  isSyncing: boolean;
  pendingCount: number;
  lastSyncAt: number | null;
  lastError: string | null;
};

/** Aguarda um número de milissegundos */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/** Executa uma função com timeout */
async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(`Timeout após ${ms / 1000}s: ${label}`));
    }, ms);
  });
  try {
    const result = await Promise.race([promise, timeoutPromise]);
    clearTimeout(timeoutId!);
    return result;
  } catch (err) {
    clearTimeout(timeoutId!);
    throw err;
  }
}

/** Executa uma função com retry e backoff exponencial */
async function withRetry<T>(
  fn: () => Promise<T>,
  maxAttempts: number = 3,
  label: string = "operação"
): Promise<T> {
  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxAttempts) {
        const delay = Math.pow(2, attempt - 1) * 1000; // 1s, 2s, 4s
        console.warn(`[SyncOffline] ${label} falhou (tentativa ${attempt}/${maxAttempts}), aguardando ${delay}ms...`);
        await sleep(delay);
      }
    }
  }
  throw lastError!;
}

export function useSyncOfflineOS(onSyncDone?: () => void) {
  const isOnline = useOnlineStatus();
  const isOnlineRef = useRef(isOnline);
  const syncingRef = useRef(false);
  // Set de IDs de OS que já estão sendo processadas nesta execução
  const syncingItemsRef = useRef<Set<string>>(new Set());

  const [syncState, setSyncState] = useState<SyncState>({
    isSyncing: false,
    pendingCount: 0,
    lastSyncAt: null,
    lastError: null,
  });

  // Mantém a ref atualizada com o valor mais recente de isOnline
  useEffect(() => {
    isOnlineRef.current = isOnline;
  }, [isOnline]);

  const refreshPendingCount = useCallback(async () => {
    const pending = await dbGetPendingOS();
    setSyncState((s) => ({ ...s, pendingCount: pending.length }));
  }, []);

  const syncOne = useCallback(async (os: PendingOS): Promise<boolean> => {
    // ── ANTI-DUPLICAÇÃO: se esta OS já está sendo processada, pula ──
    if (syncingItemsRef.current.has(os.id)) {
      console.warn("[SyncOffline] OS já em processamento, pulando:", os.id);
      return true;
    }
    syncingItemsRef.current.add(os.id);

    try {
      // Marca como "syncing" NO BANCO antes de qualquer chamada de rede.
      // Se o app fechar/reiniciar agora, a OS fica "syncing" e não é reenviada.
      await dbUpdateOSStatus(os.id, "syncing");

      if (os.tipo === "iniciar") {
        await withRetry(
          () => withTimeout(
            trpcClient.tecnicoAuth.iniciarOS.mutate({
              tecnicoId: os.tecnicoId,
              escolaId: os.escolaId,
            }),
            30000,
            "iniciarOS"
          ),
          3,
          "iniciarOS"
        );
        await dbUpdateOSStatus(os.id, "done");
        syncingItemsRef.current.delete(os.id);
        return true;
      }

      // ── Tipo: Não Instalada ──────────────────────────────────────────────
      if (os.tipo === "nao_instalada") {
        if (!os.motivoNaoInstalada) {
          // Sem motivo definido, descarta a entrada inválida
          await dbUpdateOSStatus(os.id, "done");
          syncingItemsRef.current.delete(os.id);
          return true;
        }
        await withRetry(
          () => withTimeout(
            trpcClient.tecnicoAuth.naoInstalada.mutate({
              tecnicoId: os.tecnicoId,
              escolaId: os.escolaId,
              motivo: os.motivoNaoInstalada!,
              observacao: os.obsNaoInstalada,
            }),
            30000,
            "naoInstalada"
          ),
          3,
          "naoInstalada"
        );
        await dbUpdateOSStatus(os.id, "done");
        syncingItemsRef.current.delete(os.id);
        return true;
      }

      // Passo 1: Concluir a OS no servidor (idempotente no backend)
      // Retry com backoff exponencial: 3 tentativas (1s, 2s, 4s)
      const resultado = await withRetry(
        () => withTimeout(
          trpcClient.tecnicoAuth.concluirEscola.mutate({
            tecnicoId: os.tecnicoId,
            escolaId: os.escolaId,
            qtdApInstalado: os.qtdApInstalado,
            observacao: os.observacao,
          }),
          30000,
          "concluirEscola"
        ),
        3,
        "concluirEscola"
      );

      const osIdFinal: number = (resultado as { osId?: number })?.osId ?? 0;

      // Passo 2: Upload das fotos (se houver osId válido)
      // Usa trpcUploadClient (sem batching) para garantir que cada foto
      // é enviada em um request HTTP separado, evitando falhas por payload grande
      if (osIdFinal > 0 && os.fotos && os.fotos.length > 0) {
        let fotosFalhas = 0;
        for (const foto of os.fotos) {
          try {
            // Valida categoria antes de enviar
            const categoriasValidas = ["mapa_calor", "fotos_ap", "etiqueta_controladora", "etiqueta_nobreak", "etiqueta_switch"] as const;
            const catValida = categoriasValidas.includes(foto.categoria as typeof categoriasValidas[number]);
            if (!catValida) {
              console.warn("[SyncOffline] Categoria inválida, pulando:", foto.categoria);
              continue;
            }

            // Upload com retry (3 tentativas) e timeout de 60s
            await withRetry(
              () => withTimeout(
                trpcUploadClient.tecnicoAuth.uploadOsFoto.mutate({
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
                  // clientId garante idempotência: mesmo que o upload seja chamado
                  // duas vezes (ex: reconexão durante upload), o backend não duplica
                  clientId: foto.clientId,
                }),
                60000,
                `uploadFoto-${foto.categoria}`
              ),
              3,
              `uploadFoto-${foto.categoria}`
            );
          } catch (fotoErr) {
            fotosFalhas++;
            // Log detalhado do erro da foto mas continua com as outras
            const errMsg = fotoErr instanceof Error ? fotoErr.message : String(fotoErr);
            console.error(`[SyncOffline] Erro ao enviar foto (${foto.categoria}) após 3 tentativas:`, errMsg);
          }
        }
        if (fotosFalhas > 0) {
          console.warn(`[SyncOffline] ${fotosFalhas} foto(s) falharam no upload para OS ${osIdFinal}`);
        }
      }

      await dbUpdateOSStatus(os.id, "done");
      syncingItemsRef.current.delete(os.id);
      return true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[SyncOffline] Erro ao sincronizar OS após todas as tentativas:", msg);
      // Marca como erro para tentar novamente depois
      await dbUpdateOSStatus(os.id, "error", { errorMsg: msg });
      syncingItemsRef.current.delete(os.id);
      return false;
    }
  }, []);

  const runSync = useCallback(async () => {
    // ── ANTI-DUPLICAÇÃO: impede duas execuções simultâneas de runSync ──
    if (syncingRef.current || !isOnlineRef.current) return;

    const pending = await dbGetPendingOS();
    if (pending.length === 0) return;

    syncingRef.current = true;
    setSyncState((s) => ({ ...s, isSyncing: true, lastError: null }));

    let anyError = false;

    // Processa sequencialmente (não em paralelo) para evitar race conditions
    for (const os of pending) {
      // Pula OS que já estão sendo processadas (status "syncing" no banco)
      // Isso pode acontecer se o app reiniciou durante uma sincronização anterior
      if (os.status === "syncing") {
        console.warn("[SyncOffline] OS encontrada com status syncing (possível crash anterior), reenviando:", os.id);
        // Reseta para "error" para reprocessar com segurança
        await dbUpdateOSStatus(os.id, "error", { errorMsg: "Reiniciado durante sincronização" });
      }
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
      lastError: anyError ? "Algumas OS falharam. Tentando novamente em breve..." : null,
    });

    if (!anyError) onSyncDone?.();
  }, [syncOne, onSyncDone]);

  // Sincroniza ao montar (se online)
  useEffect(() => {
    refreshPendingCount();
    if (isOnlineRef.current) {
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
      if (isOnlineRef.current && syncState.pendingCount > 0) {
        runSync();
      }
    }, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [syncState.pendingCount, runSync]);

  return { syncState, runSync, refreshPendingCount };
}
