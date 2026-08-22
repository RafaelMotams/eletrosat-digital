import { SignJWT, jwtVerify } from "jose";
import type { Request, Response } from "express";
import { getDb } from "../db";
import { tenants, tenantAdmins } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { jwtSecretKey } from "./jwtSecret";
import { getSessionCookieOptions } from "./cookies";

const TENANT_SESSION_COOKIE = "netvius_tenant_session";


export interface TenantSession {
  adminId: number;
  tenantId: number;
  email: string;
  role: string;
  isSuperAdmin: boolean;
}

export async function signTenantToken(session: TenantSession): Promise<string> {
  return new SignJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(jwtSecretKey);
}

function readCookie(req: Request, name: string): string | null {
  const raw = req.headers.cookie ?? "";
  const item = raw.split(";").map(value => value.trim()).find(value => value.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

export async function getTenantSession(req: Request): Promise<TenantSession | null> {
  const token = readCookie(req, TENANT_SESSION_COOKIE);
  return token ? verifyTenantToken(token) : null;
}

export async function setTenantSession(res: Response, req: Request, session: TenantSession) {
  const token = await signTenantToken(session);
  res.cookie(TENANT_SESSION_COOKIE, token, { ...getSessionCookieOptions(req), maxAge: 8 * 60 * 60 * 1000 });
}

export function clearTenantSession(res: Response, req: Request) {
  res.clearCookie(TENANT_SESSION_COOKIE, { ...getSessionCookieOptions(req), maxAge: -1 });
}

export { TENANT_SESSION_COOKIE };

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
    const session = payload as unknown as TenantSession;

    // Superadmin não precisa de verificação de tenant
    if (session.isSuperAdmin) return session;

    const db = await getDb();
    if (!db) return null;

    // Verificar se o admin ainda está ativo
    const [admin] = await db
      .select({ ativo: tenantAdmins.ativo })
      .from(tenantAdmins)
      .where(eq(tenantAdmins.id, session.adminId));

    if (!admin || !admin.ativo) return null;

    // Verificar status do tenant (incluindo expiração de trial)
    if (session.tenantId > 0) {
      const status = await checkAndExpireTrial(db, session.tenantId);
      if (!status || status === "expirado" || status === null) {
        return null; // Bloqueia acesso
      }
    }

    return session;
  } catch {
    return null;
  }
}

/** Verifica o status do tenant para o técnico (app) */
export async function verifyTenantActive(tenantId: number): Promise<{ ok: boolean; motivo?: string }> {
  try {
    const db = await getDb();
    if (!db) return { ok: false, motivo: "servico_indisponivel" };

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
    return { ok: false, motivo: "servico_indisponivel" };
  }
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}
