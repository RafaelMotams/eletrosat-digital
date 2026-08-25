import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
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
import { getDashboardStats, listTecnicos, listOrdensServico } from "../db";
import { SignJWT } from "jose";
import { verifyTenantToken } from "../_core/tenantAuth";

const JWT_SECRET = process.env.JWT_SECRET || "superadmin-secret";
const secretKey = new TextEncoder().encode(JWT_SECRET);

// Criar token JWT
async function signToken(payload: Record<string, unknown>): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secretKey);
}

// Verificar token JWT
async function verifyToken(token: string): Promise<{
  adminId: number;
  tenantId: number;
  email: string;
  role: string;
  isSuperAdmin: boolean;
} | null> {
  return verifyTenantToken(token);
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
    .mutation(async ({ input }) => {
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

  // Verificar sessão atual
  me: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const session = await verifyToken(input.token);
      if (!session) {
        throw new TRPCError({ code: "UNAUTHORIZED", message: "Sessão inválida" });
      }

      let tenant = null;
      if (session.tenantId > 0) {
        tenant = await getTenantById(session.tenantId);
      }

      return {
        adminId: session.adminId,
        tenantId: session.tenantId,
        role: session.role,
        isSuperAdmin: session.isSuperAdmin,
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

  // ============================================================
  // TENANTS (apenas superadmin)
  // ============================================================

  listTenants: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const session = await verifyToken(input.token);
      if (!session?.isSuperAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      return listTenants();
    }),

  createTenant: publicProcedure
    .input(
      z.object({
        token: z.string(),
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
    .mutation(async ({ input }) => {
      const session = await verifyToken(input.token);
      if (!session?.isSuperAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }

      const { token: _t, adminNome, adminEmail, adminSenha, ...tenantData } = input;

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

      return { success: true, tenantId: tenant.id };
    }),

  updateTenant: publicProcedure
    .input(
      z.object({
        token: z.string(),
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
    .mutation(async ({ input }) => {
      const session = await verifyToken(input.token);
      if (!session?.isSuperAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      const { token: _t, id, ...data } = input;
      await updateTenant(id, data);
      return { success: true };
    }),

  deleteTenant: publicProcedure
    .input(z.object({ token: z.string(), id: z.number() }))
    .mutation(async ({ input }) => {
      const session = await verifyToken(input.token);
      if (!session?.isSuperAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      await deleteTenant(input.id);
      return { success: true };
    }),

  // ============================================================
  // ADMINS DE TENANT
  // ============================================================

  listAdmins: publicProcedure
    .input(z.object({ token: z.string(), tenantId: z.number() }))
    .query(async ({ input }) => {
      const session = await verifyToken(input.token);
      if (!session?.isSuperAdmin && session?.tenantId !== input.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      return listTenantAdmins(input.tenantId);
    }),

  createAdmin: publicProcedure
    .input(
      z.object({
        token: z.string(),
        tenantId: z.number(),
        nome: z.string().min(2),
        email: z.string().email(),
        senha: z.string().min(6),
        role: z.enum(["admin", "viewer"]).default("admin"),
      })
    )
    .mutation(async ({ input }) => {
      const session = await verifyToken(input.token);
      if (!session?.isSuperAdmin && session?.tenantId !== input.tenantId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      const { token: _t, ...data } = input;
      await createTenantAdmin(data);
      return { success: true };
    }),

  updateAdmin: publicProcedure
    .input(
      z.object({
        token: z.string(),
        id: z.number(),
        nome: z.string().min(2).optional(),
        email: z.string().email().optional(),
        senha: z.string().min(6).optional(),
        role: z.enum(["admin", "viewer"]).optional(),
        ativo: z.boolean().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const session = await verifyToken(input.token);
      if (!session) throw new TRPCError({ code: "UNAUTHORIZED" });
      const alvo = await getTenantAdminById(input.id);
      if (!alvo) throw new TRPCError({ code: "NOT_FOUND", message: "Administrador não encontrado" });
      if (!session.isSuperAdmin && (session.role !== "admin" || alvo.tenantId !== session.tenantId)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      const { token: _t, id, ...data } = input;
      await updateTenantAdmin(id, data);
      return { success: true };
    }),

  deleteAdmin: publicProcedure
    .input(z.object({ token: z.string(), id: z.number() }))
    .mutation(async ({ input }) => {
      const session = await verifyToken(input.token);
      if (!session?.isSuperAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      await deleteTenantAdmin(input.id);
      return { success: true };
    }),

  // ============================================================
  // STATS POR TENANT (para o painel superadmin)
  // ============================================================

  getTenantStats: publicProcedure
    .input(z.object({ token: z.string(), tenantId: z.number() }))
    .query(async ({ input }) => {
      const session = await verifyToken(input.token);
      if (!session?.isSuperAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      const [stats, tecnicos, os] = await Promise.all([
        getDashboardStats(input.tenantId),
        listTecnicos(input.tenantId),
        listOrdensServico({ tenantId: input.tenantId, status: "concluida" }),
      ]);
      return {
        totalEscolas: stats?.totalEscolas ?? 0,
        concluidas: stats?.concluidas ?? 0,
        pendentes: stats?.pendentes ?? 0,
        totalTecnicos: tecnicos.length,
        totalOsConcluidas: os.length,
      };
    }),

  // Gerar token de impersonação para acessar painel do cliente
  impersonateTenant: publicProcedure
    .input(z.object({ token: z.string(), tenantId: z.number() }))
    .mutation(async ({ input }) => {
      const session = await verifyToken(input.token);
      if (!session?.isSuperAdmin) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      const tenant = await getTenantById(input.tenantId);
      if (!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "Cliente não encontrado" });

      // Buscar o primeiro admin do tenant
      const admins = await listTenantAdmins(input.tenantId);
      if (!admins.length) throw new TRPCError({ code: "NOT_FOUND", message: "Nenhum admin encontrado para este cliente" });
      const admin = admins[0];

      const impersonToken = await signToken({
        adminId: admin.id,
        tenantId: input.tenantId,
        role: admin.role,
        isSuperAdmin: false,
      });

      return {
        token: impersonToken,
        admin: {
          id: admin.id,
          nome: admin.nome,
          email: admin.email,
          role: admin.role,
          tenantId: input.tenantId,
          isSuperAdmin: false,
        },
        tenant: {
          id: tenant.id,
          nome: tenant.nome,
          slug: tenant.slug,
          plano: tenant.plano,
          status: tenant.status,
        },
      };
    }),
});
