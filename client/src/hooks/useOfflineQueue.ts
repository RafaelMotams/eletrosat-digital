import { useEffect, useRef, useCallback } from "react";

export type OfflineAction = {
  id: string;
  type: "concluirEscola";
  payload: {
    escolaId: number;
    tecnicoId: number;
    qtdApInstalado: number;
    observacoes?: string;
    dataHora: string;
  };
  createdAt: number;
};

const QUEUE_KEY = "netvionis_offline_queue";
const ESCOLAS_CACHE_KEY = "netvionis_escolas_cache";

/** Lê a fila do localStorage */
export function getOfflineQueue(): OfflineAction[] {
  try {
    return JSON.parse(localStorage.getItem(QUEUE_KEY) || "[]");
  } catch {
    return [];
  }
}

/** Salva a fila no localStorage */
function saveQueue(queue: OfflineAction[]) {
  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
}

/** Adiciona uma ação à fila offline */
export function enqueueOfflineAction(action: Omit<OfflineAction, "id" | "createdAt">) {
  const queue = getOfflineQueue();
  const newAction: OfflineAction = {
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
  };
  queue.push(newAction);
  saveQueue(queue);
  return newAction;
}

/** Remove uma ação da fila pelo id */
export function removeFromQueue(id: string) {
  const queue = getOfflineQueue().filter(a => a.id !== id);
  saveQueue(queue);
}

/** Salva cache de escolas no localStorage */
export function cacheEscolas(tecnicoId: number, escolas: unknown[]) {
  try {
    localStorage.setItem(
      `${ESCOLAS_CACHE_KEY}_${tecnicoId}`,
      JSON.stringify({ data: escolas, ts: Date.now() })
    );
  } catch {}
}

/** Lê cache de escolas do localStorage */
export function getCachedEscolas(tecnicoId: number): unknown[] | null {
  try {
    const raw = localStorage.getItem(`${ESCOLAS_CACHE_KEY}_${tecnicoId}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Cache válido por 24h
    if (Date.now() - parsed.ts > 24 * 60 * 60 * 1000) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

/** Hook que monitora conexão e sincroniza fila quando voltar online */
export function useOfflineSyncQueue(
  syncFn: (action: OfflineAction) => Promise<boolean>
) {
  const syncingRef = useRef(false);

  const trySync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    syncingRef.current = true;
    for (const action of queue) {
      try {
        const ok = await syncFn(action);
        if (ok) removeFromQueue(action.id);
      } catch {
        // Mantém na fila para tentar novamente
      }
    }
    syncingRef.current = false;
  }, [syncFn]);

  useEffect(() => {
    // Tenta sincronizar ao montar (se online)
    trySync();

    // Sincroniza quando voltar online
    window.addEventListener("online", trySync);
    return () => window.removeEventListener("online", trySync);
  }, [trySync]);

  return { trySync };
}
