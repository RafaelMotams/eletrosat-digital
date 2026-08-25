import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";

const t = initTRPC.context<TrpcContext>().create({
  transformer: superjson,
});

export const router = t.router;
export const publicProcedure = t.procedure;

const requireUser = t.middleware(async opts => {
  const { ctx, next } = opts;
  if (!ctx.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }
  return next({
    ctx: {
      ...ctx,
      user: ctx.user,
    },
  });
});

export const protectedProcedure = t.procedure.use(requireUser);

export const adminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;
    if (!ctx.user || ctx.user.role !== 'admin') {
      throw new TRPCError({ code: "FORBIDDEN", message: NOT_ADMIN_ERR_MSG });
    }
    return next({
      ctx: {
        ...ctx,
        user: ctx.user,
      },
    });
  }),
);

// Procedure exclusiva do painel de revenda: toda chamada deve carregar um JWT
// de tenant válido. Não há fallback para o tenant padrão.
export const tenantAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    // Caso 1: sessão explícita do painel de revenda.
    // Esta verificação vem antes do cookie OAuth: o navegador pode carregar ambos,
    // e o token da revenda deve sempre definir o tenant das chamadas do painel.
    if (ctx.tenantSession) {
      if (!ctx.tenantSession.isSuperAdmin && ctx.tenantSession.tenantId <= 0) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Tenant inválido" });
      }
      return next({
        ctx: {
          ...ctx,
          tenantId: ctx.tenantSession.tenantId,
          isSuperAdmin: ctx.tenantSession.isSuperAdmin,
        },
      });
    }

    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }),
);
