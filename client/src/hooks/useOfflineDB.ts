/**
 * useOfflineDB — IndexedDB para modo offline completo do app Netvius
 *
 * Stores:
 *  - "escolas"     : cache das escolas do técnico (lista + detalhes)
 *  - "pendingOS"   : OS pendentes de sincronização (conclusão + fotos)
 *
 * Cada "pendingOS" contém:
 *  {
 *    id: string (uuid local),
 *    escolaId, tecnicoId, qtdApInstalado, observacao, dataHora,
 *    fotos: [{ categoria, imageBase64, mimeType }],
 *    status: "pending" | "syncing" | "done" | "error",
 *    errorMsg?: string,
 *    createdAt: number,
 *    syncedAt?: number,
 *  }
 */

const DB_NAME = "netvionis_offline";
const DB_VERSION = 3; // v3: store "fotoRascunho" para persistir fotos ao voltar da câmera

export type FotoOffline = {
  categoria: string;
  imageBase64: string;
  mimeType: string;
  /** ID único gerado no momento da captura para garantir idempotência no upload */
  clientId?: string;
};

export type PendingOS = {
  id: string;
  escolaId: number;
  tecnicoId: number;
  qtdApInstalado: number;
  observacao?: string;
  dataHora: string;
  fotos: FotoOffline[];
  status: "pending" | "syncing" | "done" | "error";
  /** "iniciar" = apenas iniciar a OS; "concluir" = concluir com fotos (padrão); "nao_instalada" = escola não instalada */
  tipo?: "iniciar" | "concluir" | "nao_instalada";
  /** Motivo da não instalação (somente quando tipo = "nao_instalada") */
  motivoNaoInstalada?: "escola_desativada" | "em_reforma" | "mudanca_endereco";
  /** Observação da não instalação (somente quando tipo = "nao_instalada") */
  obsNaoInstalada?: string;
  errorMsg?: string;
  createdAt: number;
  syncedAt?: number;
};

export type EscolaCache = {
  tecnicoId: number;
  data: unknown[];
  ts: number;
};

// ─── Abrir / criar banco ───────────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains("escolas")) {
        db.createObjectStore("escolas", { keyPath: "tecnicoId" });
      }
      if (!db.objectStoreNames.contains("pendingOS")) {
        const store = db.createObjectStore("pendingOS", { keyPath: "id" });
        store.createIndex("status", "status", { unique: false });
        store.createIndex("escolaId", "escolaId", { unique: false });
      }
      // v3: rascunho de fotos para persistir ao voltar da câmera no Android
      if (!db.objectStoreNames.contains("fotoRascunho")) {
        db.createObjectStore("fotoRascunho", { keyPath: "escolaId" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

// ─── Helpers genéricos ────────────────────────────────────────────────────

function tx(
  db: IDBDatabase,
  store: string,
  mode: IDBTransactionMode
): IDBObjectStore {
  return db.transaction(store, mode).objectStore(store);
}

function wrap<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((res, rej) => {
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

// ─── Cache de escolas ─────────────────────────────────────────────────────

export async function dbCacheEscolas(
  tecnicoId: number,
  data: unknown[]
): Promise<void> {
  const db = await openDB();
  const entry: EscolaCache = { tecnicoId, data, ts: Date.now() };
  await wrap(tx(db, "escolas", "readwrite").put(entry));
}

export async function dbGetCachedEscolas(
  tecnicoId: number
): Promise<unknown[] | null> {
  try {
    const db = await openDB();
    const entry = await wrap<EscolaCache | undefined>(
      tx(db, "escolas", "readonly").get(tecnicoId)
    );
    if (!entry) return null;
    // Cache válido por 7 dias (técnico pode ficar sem internet por dias)
    if (Date.now() - entry.ts > 7 * 24 * 60 * 60 * 1000) return null;
    return entry.data;
  } catch {
    return null;
  }
}

// ─── Fila de OS pendentes ─────────────────────────────────────────────────

export async function dbEnqueueOS(
  payload: Omit<PendingOS, "id" | "status" | "createdAt">
): Promise<PendingOS> {
  const db = await openDB();
  const entry: PendingOS = {
    ...payload,
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    status: "pending",
    createdAt: Date.now(),
  };
  await wrap(tx(db, "pendingOS", "readwrite").put(entry));
  return entry;
}

export async function dbGetPendingOS(tecnicoId?: number): Promise<PendingOS[]> {
  try {
    const db = await openDB();
    const all = await wrap<PendingOS[]>(
      tx(db, "pendingOS", "readonly").getAll()
    );
    return all.filter((o) =>
      (o.status === "pending" || o.status === "error")
      && (tecnicoId === undefined || o.tecnicoId === tecnicoId)
    );
  } catch {
    return [];
  }
}

export async function dbGetAllPendingOS(): Promise<PendingOS[]> {
  try {
    const db = await openDB();
    return await wrap<PendingOS[]>(tx(db, "pendingOS", "readonly").getAll());
  } catch {
    return [];
  }
}

export async function dbUpdateOSStatus(
  id: string,
  status: PendingOS["status"],
  extra?: Partial<PendingOS>
): Promise<void> {
  const db = await openDB();
  const store = tx(db, "pendingOS", "readwrite");
  const current = await wrap<PendingOS | undefined>(store.get(id));
  if (!current) return;
  await wrap(
    tx(db, "pendingOS", "readwrite").put({
      ...current,
      ...extra,
      status,
      ...(status === "done" ? { syncedAt: Date.now() } : {}),
    })
  );
}

export async function dbRemoveDoneOS(tecnicoId?: number): Promise<void> {
  try {
    const db = await openDB();
    const all = await wrap<PendingOS[]>(tx(db, "pendingOS", "readonly").getAll());
    const store = tx(db, "pendingOS", "readwrite");
    for (const o of all) {
      if (o.status === "done" && (tecnicoId === undefined || o.tecnicoId === tecnicoId)) store.delete(o.id);
    }
  } catch {}
}

/** Conta quantas OS estão pendentes de sincronização */
export async function dbCountPending(tecnicoId?: number): Promise<number> {
  const list = await dbGetPendingOS(tecnicoId);
  return list.length;
}

// ─── Rascunho de fotos (persiste ao voltar da câmera no Android) ──────────────

export type FotoRascunho = {
  escolaId: number;
  fotos: Record<string, Array<{ preview: string; base64: string; mime: string }>>;
  qtdAp: string;
  observacao: string;
  ts: number;
};

export async function dbSaveFotoRascunho(rascunho: FotoRascunho): Promise<void> {
  try {
    const db = await openDB();
    await wrap(tx(db, "fotoRascunho", "readwrite").put(rascunho));
  } catch {}
}

export async function dbGetFotoRascunho(escolaId: number): Promise<FotoRascunho | null> {
  try {
    const db = await openDB();
    const entry = await wrap<FotoRascunho | undefined>(
      tx(db, "fotoRascunho", "readonly").get(escolaId)
    );
    if (!entry) return null;
    // Rascunho válido por 8 horas (jornada de trabalho)
    if (Date.now() - entry.ts > 8 * 60 * 60 * 1000) {
      await dbClearFotoRascunho(escolaId);
      return null;
    }
    return entry;
  } catch {
    return null;
  }
}

export async function dbClearFotoRascunho(escolaId: number): Promise<void> {
  try {
    const db = await openDB();
    await wrap(tx(db, "fotoRascunho", "readwrite").delete(escolaId));
  } catch {}
}

/** Remove do aparelho os dados locais de um técnico após confirmar que não há OS pendentes. */
export async function dbClearTecnicoData(tecnicoId: number): Promise<void> {
  const db = await openDB();
  const pending = await wrap<PendingOS[]>(tx(db, "pendingOS", "readonly").getAll());
  const pendentesDoTecnico = pending.filter(item => item.tecnicoId === tecnicoId && item.status !== "done");
  if (pendentesDoTecnico.length > 0) {
    throw new Error(`Existem ${pendentesDoTecnico.length} ordem(ns) pendente(s) de sincronização.`);
  }

  await wrap(tx(db, "escolas", "readwrite").delete(tecnicoId));

  const doneDoTecnico = pending.filter(item => item.tecnicoId === tecnicoId && item.status === "done");
  for (const item of doneDoTecnico) {
    await wrap(tx(db, "pendingOS", "readwrite").delete(item.id));
  }

  // Rascunhos antigos não possuem tecnicoId; são apagados no logout para evitar
  // que fotos de uma sessão anterior apareçam para outro usuário do aparelho.
  await wrap(tx(db, "fotoRascunho", "readwrite").clear());
}
