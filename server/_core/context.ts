import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { verifyTenantToken, type TenantSession } from "./tenantAuth";

export const TENANT_SESSION_COOKIE = "netvius_tenant_session";

export function extractTenantSessionCookie(cookieHeader: string | undefined): string | null {
  if (!cookieHeader) return null;
  const cookie = cookieHeader
    .split(";")
    .map(part => part.trim())
    .find(part => part.startsWith(`${TENANT_SESSION_COOKIE}=`));
  if (!cookie) return null;
  const rawValue = cookie.slice(TENANT_SESSION_COOKIE.length + 1);
  try {
    return decodeURIComponent(rawValue) || null;
  } catch {
    return null;
  }
}

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  tenantSession: TenantSession | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let tenantSession: TenantSession | null = null;

  // Tentar autenticar via Manus OAuth (cookie)
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  // O painel e as rotas HTTP privadas usam somente a sessão HttpOnly em cookie.
  const token = extractTenantSessionCookie(opts.req.headers.cookie);
  if (token) {
    tenantSession = await verifyTenantToken(token);
  }

  return {
    req: opts.req,
    res: opts.res,
    user,
    tenantSession,
  };
}
