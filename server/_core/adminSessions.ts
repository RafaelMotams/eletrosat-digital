import { and, desc, eq, gt, isNull } from "drizzle-orm";
import { adminSessions } from "../../drizzle/schema";
import { getDb } from "../db";

export type NewAdminSession = {
  adminId: number;
  tenantId: number;
  role: string;
  isSuperAdmin: boolean;
  expiresAt: Date;
};

export async function createAdminSession(input: NewAdminSession): Promise<string> {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível para criar sessão administrativa");
  const id = crypto.randomUUID();
  await db.insert(adminSessions).values({ ...input, id });
  return id;
}

export async function hasActiveAdminSession(input: { id: string; adminId: number; tenantId: number; role: string; isSuperAdmin: boolean }): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  const [session] = await db.select({ id: adminSessions.id })
    .from(adminSessions)
    .where(and(
      eq(adminSessions.id, input.id),
      eq(adminSessions.adminId, input.adminId),
      eq(adminSessions.tenantId, input.tenantId),
      eq(adminSessions.role, input.role),
      eq(adminSessions.isSuperAdmin, input.isSuperAdmin),
      isNull(adminSessions.revokedAt),
      gt(adminSessions.expiresAt, new Date()),
    ));
  return Boolean(session);
}

export async function revokeAdminSession(sessionId: string | undefined): Promise<void> {
  if (!sessionId) return;
  const db = await getDb();
  if (!db) return;
  await db.update(adminSessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(adminSessions.id, sessionId), isNull(adminSessions.revokedAt)));
}

export async function listTenantAdminSessions(tenantId: number) {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível para listar sessões");
  return db.select({
    id: adminSessions.id,
    adminId: adminSessions.adminId,
    role: adminSessions.role,
    expiresAt: adminSessions.expiresAt,
    createdAt: adminSessions.createdAt,
    lastSeenAt: adminSessions.lastSeenAt,
  })
    .from(adminSessions)
    .where(and(
      eq(adminSessions.tenantId, tenantId),
      isNull(adminSessions.revokedAt),
      gt(adminSessions.expiresAt, new Date()),
    ))
    .orderBy(desc(adminSessions.lastSeenAt));
}

export async function revokeTenantAdminSession(sessionId: string, tenantId: number): Promise<boolean> {
  const db = await getDb();
  if (!db) throw new Error("Banco indisponível para revogar sessão");
  const result = await db.update(adminSessions)
    .set({ revokedAt: new Date() })
    .where(and(
      eq(adminSessions.id, sessionId),
      eq(adminSessions.tenantId, tenantId),
      isNull(adminSessions.revokedAt),
    ));
  return Number((result as any).rowsAffected ?? 0) > 0;
}
