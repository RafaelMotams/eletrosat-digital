import type { CreateExpressContextOptions } from "@trpc/server/adapters/express";
import type { User } from "../../drizzle/schema";
import { sdk } from "./sdk";
import { getTenantSession, verifyTenantToken, extractBearerToken, type TenantSession } from "./tenantAuth";
import { getTecnicoSession, type TecnicoSession } from "./tecnicoAuth";

export type TrpcContext = {
  req: CreateExpressContextOptions["req"];
  res: CreateExpressContextOptions["res"];
  user: User | null;
  tenantSession: TenantSession | null;
  tecnicoSession: TecnicoSession | null;
};

export async function createContext(
  opts: CreateExpressContextOptions
): Promise<TrpcContext> {
  let user: User | null = null;
  let tenantSession: TenantSession | null = null;
  let tecnicoSession: TecnicoSession | null = null;

  // Tentar autenticar via Manus OAuth (cookie)
  try {
    user = await sdk.authenticateRequest(opts.req);
  } catch {
    user = null;
  }

  // Preferir sessão HttpOnly do tenant. O header é apenas compatibilidade temporária
  // para clientes legados e nunca substitui uma sessão inválida.
  tenantSession = await getTenantSession(opts.req);
  if (!tenantSession) {
    const token = extractBearerToken(opts.req.headers.authorization);
    if (token) tenantSession = await verifyTenantToken(token);
  }

  tecnicoSession = await getTecnicoSession(opts.req);

  return {
    req: opts.req,
    res: opts.res,
    user,
    tenantSession,
    tecnicoSession,
  };
}
