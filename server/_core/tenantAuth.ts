import { jwtVerify } from "jose";
import { getDb } from "../db";
import { tenants, tenantAdmins } from "../../drizzle/schema";
import { eq } from "drizzle-orm";

const JWT_SECRET = process.env.JWT_SECRET || "superadmin-secret";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface TenantSession {
  adminId: number;
  tenantId: number;
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
    const { payload } = await jwtVerify(token, secretKey);
    const session = payload as unknown as TenantSession;

    // Superadmin não precisa de verificação de tenant
    if (session.isSuperAdmin) return session;

    const db = await getDb();
    if (!db) return session; // fallback se DB indisponível

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
  } catch (err) {
    // Tokens inválidos/expirados (erros do jose) são esperados e não são logados.
    // Qualquer outro erro (ex.: falha no banco durante as verificações) é logado
    // para não ser silenciosamente engolido.
    const code = (err as { code?: unknown } | null)?.code;
    const isJwtError = typeof code === "string" && code.startsWith("ERR_J");
    if (!isJwtError) {
      console.error("[tenantAuth] Erro inesperado ao verificar token do tenant:", err);
    }
    return null;
  }
}

/** Verifica o status do tenant para o técnico (app) */
export async function verifyTenantActive(tenantId: number): Promise<{ ok: boolean; motivo?: string }> {
  try {
    const db = await getDb();
    if (!db) return { ok: true }; // fallback

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
  } catch (err) {
    // Fail-open para não bloquear técnicos por instabilidade transitória,
    // mas registra o erro para que a falha não passe despercebida.
    console.error("[tenantAuth] Erro ao verificar status do tenant:", err);
    return { ok: true };
  }
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}
