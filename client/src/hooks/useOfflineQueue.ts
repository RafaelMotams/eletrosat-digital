import { useEffect, useRef, useCallback } from "react";
import { chavesOfflineTecnico, criarEscopoTecnicoLocal, type EscopoTecnicoLocal } from "@shared/tecnicoLocalState";

export type OfflineAction = {
  id: string;
  type: "concluirEscola";
  payload: {
    tenantId: number;
    escolaId: number;
    tecnicoId: number;
    qtdApInstalado: number;
    observacoes?: string;
    dataHora: string;
  };
  createdAt: number;
};

function obterEscopo(tenantId: number, tecnicoId: number): EscopoTecnicoLocal | null {
  return criarEscopoTecnicoLocal(tenantId, tecnicoId);
}

/** Lê somente a fila pertencente ao tenant e técnico informados. */
export function getOfflineQueue(tenantId: number, tecnicoId: number): OfflineAction[] {
  const escopo = obterEscopo(tenantId, tecnicoId);
  if (!escopo) return [];
  try {
    return JSON.parse(localStorage.getItem(chavesOfflineTecnico(escopo).fila) || "[]");
  } catch {
    return [];
  }
}

function saveQueue(escopo: EscopoTecnicoLocal, queue: OfflineAction[]) {
  localStorage.setItem(chavesOfflineTecnico(escopo).fila, JSON.stringify(queue));
}

/** Adiciona uma ação apenas na fila do próprio tenant e técnico. */
export function enqueueOfflineAction(action: Omit<OfflineAction, "id" | "createdAt">) {
  const escopo = obterEscopo(action.payload.tenantId, action.payload.tecnicoId);
  if (!escopo) throw new Error("Sessão técnica inválida para persistir ação offline");

  const queue = getOfflineQueue(escopo.tenantId, escopo.tecnicoId);
  const newAction: OfflineAction = {
    ...action,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    createdAt: Date.now(),
  };
  queue.push(newAction);
  saveQueue(escopo, queue);
  return newAction;
}

/** Remove uma ação somente da fila do escopo informado. */
export function removeFromQueue(tenantId: number, tecnicoId: number, id: string) {
  const escopo = obterEscopo(tenantId, tecnicoId);
  if (!escopo) return;
  const queue = getOfflineQueue(tenantId, tecnicoId).filter(action => action.id !== id);
  saveQueue(escopo, queue);
}

/** Salva cache de escolas no namespace do tenant e técnico. */
export function cacheEscolas(tenantId: number, tecnicoId: number, escolas: unknown[]) {
  const escopo = obterEscopo(tenantId, tecnicoId);
  if (!escopo) return;
  try {
    localStorage.setItem(
      chavesOfflineTecnico(escopo).escolasCache,
      JSON.stringify({ data: escolas, ts: Date.now() }),
    );
  } catch {}
}

/** Lê cache de escolas do próprio tenant e técnico, válido por 24 horas. */
export function getCachedEscolas(tenantId: number, tecnicoId: number): unknown[] | null {
  const escopo = obterEscopo(tenantId, tecnicoId);
  if (!escopo) return null;
  try {
    const raw = localStorage.getItem(chavesOfflineTecnico(escopo).escolasCache);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (Date.now() - parsed.ts > 24 * 60 * 60 * 1000) return null;
    return parsed.data;
  } catch {
    return null;
  }
}

/** Monitora conexão e sincroniza exclusivamente a fila do escopo informado. */
export function useOfflineSyncQueue(
  tenantId: number,
  tecnicoId: number,
  syncFn: (action: OfflineAction) => Promise<boolean>,
) {
  const syncingRef = useRef(false);

  const trySync = useCallback(async () => {
    if (syncingRef.current || !navigator.onLine) return;
    const queue = getOfflineQueue(tenantId, tecnicoId);
    if (queue.length === 0) return;

    syncingRef.current = true;
    for (const action of queue) {
      try {
        const ok = await syncFn(action);
        if (ok) removeFromQueue(tenantId, tecnicoId, action.id);
      } catch {
        // Mantém a ação dentro da fila do próprio escopo para uma nova tentativa.
      }
    }
    syncingRef.current = false;
  }, [syncFn, tecnicoId, tenantId]);

  useEffect(() => {
    trySync();
    window.addEventListener("online", trySync);
    return () => window.removeEventListener("online", trySync);
  }, [trySync]);

  return { trySync };
}
