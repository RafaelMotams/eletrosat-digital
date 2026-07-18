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

export async function verifyTenantToken(token: string): Promise<TenantSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    const session = payload as unknown as TenantSession;

    // Superadmin não precisa de verificação de tenant
    if (session.isSuperAdmin) return session;

    // Verificar se o admin ainda está ativo e o tenant não foi suspenso/cancelado
    const db = await getDb();
    if (!db) return session; // fallback se DB indisponível

    const [admin] = await db.select({ ativo: tenantAdmins.ativo })
      .from(tenantAdmins)
      .where(eq(tenantAdmins.id, session.adminId));

    if (!admin || !admin.ativo) return null;

    if (session.tenantId > 0) {
      const [tenant] = await db.select({ status: tenants.status })
        .from(tenants)
        .where(eq(tenants.id, session.tenantId));

      if (!tenant || tenant.status === "suspenso" || tenant.status === "cancelado") {
        return null; // Bloqueia acesso se tenant suspenso/cancelado
      }
    }

    return session;
  } catch {
    return null;
  }
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}
