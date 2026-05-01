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

// Procedure que aceita tanto OAuth (admin do sistema) quanto JWT de tenant admin
// Retorna o tenantId para filtrar dados
export const tenantAdminProcedure = t.procedure.use(
  t.middleware(async opts => {
    const { ctx, next } = opts;

    // Caso 1: Admin OAuth do sistema (acesso total, vê todos os tenants)
    if (ctx.user && ctx.user.role === 'admin') {
      return next({
        ctx: {
          ...ctx,
          tenantId: undefined, // Admin OAuth vê todos os tenants
          isSuperAdmin: true,
        },
      });
    }

    // Caso 2: Tenant admin via JWT
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
