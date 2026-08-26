import { z } from "zod";
import { router, publicProcedure, masterProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import {
  listTenants,
  getTenantById,
  createTenant,
  updateTenant,
  deleteTenant,
  listTenantAdmins,
  createTenantAdmin,
  updateTenantAdmin,
  deleteTenantAdmin,
  getTenantAdminById,
  verifyTenantAdminPassword,
} from "../db-tenant";
import { SignJWT } from "jose";
import { verifyTenantToken } from "../_core/tenantAuth";
import { jwtSecretKey } from "../_core/jwtSecret";
import { recordAuditEvent } from "../audit";
import { TENANT_SESSION_COOKIE } from "../_core/context";

const TENANT_SESSION_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

function writeTenantSessionCookie(res: { cookie: Function }, token: string) {
  res.cookie(TENANT_SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: TENANT_SESSION_MAX_AGE_MS,
  });
}

// Criar token JWT
async function signToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(jwtSecretKey);
}

export const superadminRouter = router({
  // ============================================================
  // AUTH
  // ============================================================

  // Login para superadmin e admins de tenant
  login: publicProcedure
    .input(
      z.object({
        email: z.string().email(),
        senha: z.string().min(1),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const { admin, tenant } = await verifyTenantAdminPassword(
        input.email,
        input.senha
      );

      if (!admin) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Email ou senha inválidos",
        });
      }

      const isSuperAdmin = admin.tenantId === 0;

      const token = await signToken({
          adminId: admin.id,
          tenantId: admin.tenantId,
          role: admin.role,
        isSuperAdmin,
      });

      // O painel administrativo passa a receber sessão HttpOnly. Mantemos o
      // token no retorno apenas para os fluxos legados do superadmin enquanto
      // eles são migrados; o painel de tenant não o persiste mais no navegador.
      writeTenantSessionCookie(ctx.res, token);

      return {
        token,
        admin: {
          id: admin.id,
          nome: admin.nome,
          email: admin.email,
          role: admin.role,
          tenantId: admin.tenantId,
          isSuperAdmin,
        },
        tenant: tenant
          ? {
              id: tenant.id,
              nome: tenant.nome,
              slug: tenant.slug,
              plano: tenant.plano,
              status: tenant.status,
            }
          : null,
      };
    }),

  logout: publicProcedure.mutation(({ ctx }) => {
    ctx.res.clearCookie(TENANT_SESSION_COOKIE, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
    });
    return { success: true };
  }),

  // Verificar sessão atual
  me: masterProcedure.query(async ({ ctx }) => {
      const session = ctx.masterSession;
      return {
        adminId: session.adminId,
        tenantId: session.tenantId,
        role: session.role,
        isSuperAdmin: session.isSuperAdmin,
        tenant: null,
      };
    }),

  // ============================================================
  // TENANTS (apenas superadmin)
  // ============================================================

  listTenants: masterProcedure.query(async () => {
      return listTenants();
    }),

  createTenant: masterProcedure
    .input(
      z.object({
        nome: z.string().min(2),
        slug: z.string().min(2).regex(/^[a-z0-9-]+$/, "Slug deve conter apenas letras minúsculas, números e hífens"),
        plano: z.enum(["basico", "profissional", "enterprise"]),
        contato: z.string().optional(),
        email: z.string().email().optional(),
        telefone: z.string().optional(),
        observacoes: z.string().optional(),
        // Criar admin junto com o tenant
        adminNome: z.string().min(2),
        adminEmail: z.string().email(),
        adminSenha: z.string().min(6),
        diasTrial: z.number().min(1).max(365).default(5),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const session = ctx.masterSession;
      const { adminNome, adminEmail, adminSenha, ...tenantData } = input;

      await createTenant(tenantData);

      // Buscar o tenant recém-criado pelo slug
      const { getTenantBySlug } = await import("../db-tenant");
      const tenant = await getTenantBySlug(tenantData.slug);
      if (!tenant) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Criar admin do tenant
      await createTenantAdmin({
        tenantId: tenant.id,
        nome: adminNome,
        email: adminEmail,
        senha: adminSenha,
        role: "admin",
      });

      await recordAuditEvent({
        tenantId: tenant.id,
        actorType: "superadmin",
        actorId: session.adminId,
        action: "tenant.create",
        entityType: "tenant",
        entityId: tenant.id,
        metadata: { plano: tenantData.plano, diasTrial: tenantData.diasTrial },
        req: ctx.req,
      });

      return { success: true, tenantId: tenant.id };
    }),

  updateTenant: masterProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().min(2).optional(),
        slug: z.string().min(2).optional(),
        plano: z.enum(["basico", "profissional", "enterprise"]).optional(),
        status: z.enum(["ativo", "trial", "expirado", "suspenso", "cancelado"]).optional(),
        diasTrial: z.number().min(1).max(365).optional(),
        contato: z.string().optional(),
        email: z.string().email().optional(),
        telefone: z.string().optional(),
        observacoes: z.string().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const session = ctx.masterSession;
      const { id, ...data } = input;
      await updateTenant(id, data);
      await recordAuditEvent({
        tenantId: id,
        actorType: "superadmin",
        actorId: session.adminId,
        action: "tenant.update",
        entityType: "tenant",
        entityId: id,
        metadata: { fields: Object.keys(data) },
        req: ctx.req,
      });
      return { success: true };
    }),

  deleteTenant: masterProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = ctx.masterSession;
      await deleteTenant(input.id);
      await recordAuditEvent({ tenantId: input.id, actorType: "superadmin", actorId: session.adminId, action: "tenant.delete", entityType: "tenant", entityId: input.id, req: ctx.req });
      return { success: true };
    }),

  // ============================================================
  // ADMINS DE TENANT
  // ============================================================

  listAdmins: masterProcedure
    .input(z.object({ tenantId: z.number() }))
    .query(async ({ input }) => {
      return listTenantAdmins(input.tenantId);
    }),

  createAdmin: masterProcedure
    .input(
      z.object({
        tenantId: z.number(),
        nome: z.string().min(2),
        email: z.string().email(),
        senha: z.string().min(6),
        role: z.enum(["admin", "viewer"]).default("admin"),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const session = ctx.masterSession;
      await createTenantAdmin(input);
      await recordAuditEvent({
        tenantId: input.tenantId,
        actorType: "superadmin",
        actorId: session.adminId,
        action: "tenant_admin.create",
        entityType: "tenant_admin",
        metadata: { role: input.role },
        req: ctx.req,
      });
      return { success: true };
    }),

  updateAdmin: masterProcedure
    .input(
      z.object({
        id: z.number(),
        nome: z.string().min(2).optional(),
        email: z.string().email().optional(),
        senha: z.string().min(6).optional(),
        role: z.enum(["admin", "viewer"]).optional(),
        ativo: z.boolean().optional(),
      })
    )
    .mutation(async ({ input, ctx }) => {
      const session = ctx.masterSession;
      const alvo = await getTenantAdminById(input.id);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Administrador não encontrado" });
      const { id, ...data } = input;
      await updateTenantAdmin(id, data);
      await recordAuditEvent({
        tenantId: alvo.tenantId,
        actorType: "superadmin",
        actorId: session.adminId,
        action: "tenant_admin.update",
        entityType: "tenant_admin",
        entityId: id,
        metadata: { fields: Object.keys(data).filter(field => field !== "senha") },
        req: ctx.req,
      });
      return { success: true };
    }),

  deleteAdmin: masterProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const session = ctx.masterSession;
      const alvo = await getTenantAdminById(input.id);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Administrador não encontrado" });
      await deleteTenantAdmin(input.id);
      await recordAuditEvent({ tenantId: alvo.tenantId, actorType: "superadmin", actorId: session.adminId, action: "tenant_admin.delete", entityType: "tenant_admin", entityId: input.id, req: ctx.req });
      return { success: true };
    }),

});
