import { jwtVerify } from "jose";
import { getDb } from "../db";
import { tenants, tenantAdmins } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { jwtSecretKey } from "./jwtSecret";

export interface TenantSession {
  adminId: number;
  tenantId: number;
  email: string;
  role: string;
  isSuperAdmin: boolean;
}

/** Verifica e atualiza automaticamente o status do trial se expirado */
async function checkAndExpireTrial(db: Awaited<ReturnType<typeof getDb>>, tenantId: number) {
  if (!db) return null;

  const [tenant] = await db
    .select({
      id: tenants.id,
      status: tenants.status,
      trialFim: tenants.trialFim,
    })
    .from(tenants)
    .where(eq(tenants.id, tenantId));

  if (!tenant) return null;

  // Se já está em status final, retorna direto
  if (tenant.status === "suspenso" || tenant.status === "cancelado") return null;
  if (tenant.status === "expirado") return "expirado";

  // Verificar se o trial expirou
  if (tenant.status === "trial" && tenant.trialFim) {
    const agora = new Date();
    const fim = new Date(tenant.trialFim);
    if (agora > fim) {
      // Atualizar status para expirado automaticamente
      await db
        .update(tenants)
        .set({ status: "expirado", updatedAt: new Date() })
        .where(eq(tenants.id, tenantId));
      return "expirado";
    }
  }

  return tenant.status; // "ativo" ou "trial" (ainda válido)
}

export async function verifyTenantToken(token: string): Promise<TenantSession | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecretKey);
    const session = payload as unknown as Partial<TenantSession>;
    if (
      typeof session.adminId !== "number" ||
      typeof session.tenantId !== "number" ||
      typeof session.role !== "string" ||
      typeof session.isSuperAdmin !== "boolean"
    ) {
      return null;
    }
    const sessionData: Omit<TenantSession, "email"> = {
      adminId: session.adminId,
      tenantId: session.tenantId,
      role: session.role,
      isSuperAdmin: session.isSuperAdmin,
    };

    const db = await getDb();
    // Sem banco não é possível confirmar se o vínculo admin/tenant ainda é válido.
    if (!db) return null;

    // O token só vale se o administrador continuar ativo e ligado ao mesmo tenant.
    const [admin] = await db
      .select({
        ativo: tenantAdmins.ativo,
        tenantId: tenantAdmins.tenantId,
        role: tenantAdmins.role,
        email: tenantAdmins.email,
      })
      .from(tenantAdmins)
      .where(eq(tenantAdmins.id, sessionData.adminId));

    if (!admin || !admin.ativo || admin.tenantId !== sessionData.tenantId || admin.role !== sessionData.role) {
      return null;
    }

    if (sessionData.isSuperAdmin) {
      if (sessionData.tenantId !== 0 || admin.tenantId !== 0) return null;
      return { ...sessionData, email: admin.email };
    }

    if (sessionData.tenantId <= 0) return null;

    // Verificar status do tenant (incluindo expiração de trial)
    const status = await checkAndExpireTrial(db, sessionData.tenantId);
    if (!status || status === "expirado") {
      return null;
    }

    return { ...sessionData, email: admin.email };
  } catch {
    return null;
  }
}

/** Verifica o status do tenant para o técnico (app) */
export async function verifyTenantActive(tenantId: number): Promise<{ ok: boolean; motivo?: string }> {
  try {
    const db = await getDb();
    if (!db) return { ok: false, motivo: "indisponivel" };

    const status = await checkAndExpireTrial(db, tenantId);

    const statusStr = status as string;
    if (!statusStr || statusStr === "expirado") {
      return { ok: false, motivo: "trial_expirado" };
    }
    if (statusStr === "suspenso") {
      return { ok: false, motivo: "suspenso" };
    }
    if (statusStr === "cancelado") {
      return { ok: false, motivo: "cancelado" };
    }
    return { ok: true };
  } catch {
    return { ok: false, motivo: "indisponivel" };
  }
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}
