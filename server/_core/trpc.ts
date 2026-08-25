import { NOT_ADMIN_ERR_MSG, UNAUTHED_ERR_MSG } from '@shared/const';
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import type { TrpcContext } from "./context";
import { getTecnicoSession } from "./tecnicoAuth";

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

export const tecnicoProcedure = t.procedure.use(
  t.middleware(async ({ ctx, next }) => {
    const tecnicoSession = await getTecnicoSession(ctx.req);
    if (!tecnicoSession) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
    }
    return next({ ctx: { ...ctx, tecnicoSession } });
  }),
);

export const tenantOrTecnicoProcedure = t.procedure.use(
  t.middleware(async ({ ctx, next }) => {
    if (ctx.tenantSession && !ctx.tenantSession.isSuperAdmin && ctx.tenantSession.tenantId > 0) {
      return next({
        ctx: {
          ...ctx,
          accessSession: {
            kind: "tenantAdmin" as "tenantAdmin" | "tecnico",
            tenantId: ctx.tenantSession.tenantId,
            adminId: ctx.tenantSession.adminId as number | null,
            tecnicoId: null as number | null,
          },
        },
      });
    }
    const tecnicoSession = await getTecnicoSession(ctx.req);
    if (tecnicoSession) {
      return next({
        ctx: {
          ...ctx,
          accessSession: {
            kind: "tecnico" as "tenantAdmin" | "tecnico",
            tenantId: tecnicoSession.tenantId,
            adminId: null as number | null,
            tecnicoId: tecnicoSession.tecnicoId as number | null,
          },
        },
      });
    }
    throw new TRPCError({ code: "UNAUTHORIZED", message: UNAUTHED_ERR_MSG });
  }),
);

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
      if (ctx.tenantSession.role === "viewer" && opts.type === "mutation") {
        throw new TRPCError({ code: "FORBIDDEN", message: "Perfil visualizador não pode alterar dados" });
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
