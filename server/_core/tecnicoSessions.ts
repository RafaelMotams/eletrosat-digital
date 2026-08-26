import { and, eq, gt, isNull } from "drizzle-orm";
import { tecnicoSessions } from "../../drizzle/schema";
import { getDb } from "../db";

export async function createTecnicoSession(input: { tecnicoId: number; tenantId: number; expiresAt: Date }): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível para criar sessão técnica");
  const id = crypto.randomUUID();
  await db.insert(tecnicoSessions).values({ ...input, id });
  return id;
}

export async function hasActiveTecnicoSession(input: { id: string; tecnicoId: number; tenantId: number }): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [session] = await db.select({ id: tecnicoSessions.id })
    .from(tecnicoSessions)
    .where(and(
      eq(tecnicoSessions.id, input.id),
      eq(tecnicoSessions.tecnicoId, input.tecnicoId),
      eq(tecnicoSessions.tenantId, input.tenantId),
      isNull(tecnicoSessions.revokedAt),
      gt(tecnicoSessions.expiresAt, new Date()),
    ));
  return Boolean(session);
}

export async function revokeTecnicoSession(sessionId: string | undefined): Promise<void> {
  if (!sessionId) return;
  const db = await getDb();
  if (!db) return;
  await db.update(tecnicoSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(tecnicoSessions.id, sessionId), isNull(tecnicoSessions.revokedAt)));
}
