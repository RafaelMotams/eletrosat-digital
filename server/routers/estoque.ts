import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { z } from "zod";
import { estoqueMovimentacoes, estoqueSaldos, materiaisEstoque, ordensServico, tecnicos } from "../../drizzle/schema";
import { recordAuditEvent } from "../audit";
import { getDb } from "../db";
import { router, tecnicoProcedure, tenantAdminProcedure } from "../_core/trpc";

const quantidadeSchema = z.number().finite().positive().max(1_000_000);
const holderSchema = z.object({
  holderType: z.enum(["almoxarifado", "tecnico"]),
  holderId: z.number().int().nonnegative(),
});

type Holder = z.infer<typeof holderSchema>;

function decimal(value: number) {
  return value.toFixed(3);
}

async function requireDb() {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco de dados indisponível" });
  return db;
}

async function requireMaterial(db: Awaited<ReturnType<typeof requireDb>>, tenantId: number, materialId: number) {
  const [material] = await db.select().from(materiaisEstoque)
    .where(and(eq(materiaisEstoque.id, materialId), eq(materiaisEstoque.tenantId, tenantId), eq(materiaisEstoque.ativo, true)))
    .limit(1);
  if (!material) throw new TRPCError({ code: "NOT_FOUND", message: "Material não encontrado para esta empresa" });
  return material;
}

async function requireTecnico(db: Awaited<ReturnType<typeof requireDb>>, tenantId: number, tecnicoId: number) {
  const [tecnico] = await db.select({ id: tecnicos.id, tenantId: tecnicos.tenantId, ativo: tecnicos.ativo, nome: tecnicos.nome })
    .from(tecnicos)
    .where(and(eq(tecnicos.id, tecnicoId), eq(tecnicos.tenantId, tenantId), eq(tecnicos.ativo, true)))
    .limit(1);
  if (!tecnico) throw new TRPCError({ code: "FORBIDDEN", message: "Técnico não pertence a esta empresa" });
  return tecnico;
}

async function incrementarSaldo(tx: any, tenantId: number, materialId: number, holder: Holder, quantidade: number) {
  await tx.insert(estoqueSaldos).values({
    tenantId,
    materialId,
    holderType: holder.holderType,
    holderId: holder.holderId,
    quantidade: decimal(quantidade),
  }).onDuplicateKeyUpdate({
    set: {
      quantidade: sql`${estoqueSaldos.quantidade} + ${decimal(quantidade)}`,
      updatedAt: new Date(),
    },
  });
}

async function debitarSaldo(tx: any, tenantId: number, materialId: number, holder: Holder, quantidade: number) {
  const result = await tx.update(estoqueSaldos)
    .set({ quantidade: sql`${estoqueSaldos.quantidade} - ${decimal(quantidade)}`, updatedAt: new Date() })
    .where(and(
      eq(estoqueSaldos.tenantId, tenantId),
      eq(estoqueSaldos.materialId, materialId),
      eq(estoqueSaldos.holderType, holder.holderType),
      eq(estoqueSaldos.holderId, holder.holderId),
      gte(estoqueSaldos.quantidade, decimal(quantidade)),
    ));
  const affected = Number((result as any)[0]?.affectedRows ?? (result as any).affectedRows ?? 0);
  if (affected < 1) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Saldo insuficiente para esta movimentação" });
  }
}

async function registrarMovimentacao(tx: any, input: {
  tenantId: number;
  materialId: number;
  tipo: "entrada" | "transferencia" | "consumo" | "devolucao" | "ajuste";
  origemType: "almoxarifado" | "tecnico" | "externo";
  origemId: number;
  destinoType: "almoxarifado" | "tecnico" | "consumo";
  destinoId: number;
  quantidade: number;
  ordemServicoId?: number;
  manutencaoId?: number;
  observacao?: string;
  clientId?: string;
  actorType: "admin" | "tecnico" | "sistema";
  actorId?: number;
}) {
  const [created] = await tx.insert(estoqueMovimentacoes).values({
    ...input,
    quantidade: decimal(input.quantidade),
    observacao: input.observacao?.trim().slice(0, 2_000) || null,
    clientId: input.clientId || null,
    actorId: input.actorId ?? null,
  });
  return Number((created as any).insertId ?? 0);
}

async function movimentoExistente(db: Awaited<ReturnType<typeof requireDb>>, tenantId: number, clientId?: string) {
  if (!clientId) return null;
  const [movimento] = await db.select().from(estoqueMovimentacoes)
    .where(and(eq(estoqueMovimentacoes.tenantId, tenantId), eq(estoqueMovimentacoes.clientId, clientId)))
    .limit(1);
  return movimento ?? null;
}

export const estoqueRouter = router({
  materiais: router({
    list: tenantAdminProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select().from(materiaisEstoque)
        .where(eq(materiaisEstoque.tenantId, ctx.tenantId))
        .orderBy(materiaisEstoque.nome);
    }),

    create: tenantAdminProcedure.input(z.object({
      codigo: z.string().trim().min(1).max(80),
      nome: z.string().trim().min(2).max(255),
      categoria: z.string().trim().max(100).optional(),
      unidade: z.string().trim().min(1).max(20).default("un"),
      estoqueMinimo: z.number().finite().min(0).max(1_000_000).default(0),
    })).mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      try {
        const [created] = await db.insert(materiaisEstoque).values({
          tenantId: ctx.tenantId,
          codigo: input.codigo.toUpperCase(),
          nome: input.nome,
          categoria: input.categoria || null,
          unidade: input.unidade,
          estoqueMinimo: decimal(input.estoqueMinimo),
        });
        const materialId = Number((created as any).insertId ?? 0);
        await recordAuditEvent({ tenantId: ctx.tenantId, actorType: "admin", actorId: ctx.tenantSession?.adminId, action: "estoque.material.criar", entityType: "material", entityId: materialId, metadata: { codigo: input.codigo.toUpperCase() }, req: ctx.req });
        return { id: materialId };
      } catch (error: any) {
        if (error?.code === "ER_DUP_ENTRY") throw new TRPCError({ code: "CONFLICT", message: "Já existe um material com este código" });
        throw error;
      }
    }),

    update: tenantAdminProcedure.input(z.object({
      id: z.number().int().positive(),
      nome: z.string().trim().min(2).max(255).optional(),
      categoria: z.string().trim().max(100).nullable().optional(),
      unidade: z.string().trim().min(1).max(20).optional(),
      estoqueMinimo: z.number().finite().min(0).max(1_000_000).optional(),
      ativo: z.boolean().optional(),
    })).mutation(async ({ input, ctx }) => {
      const db = await requireDb();
      await requireMaterial(db, ctx.tenantId, input.id);
      const { id, estoqueMinimo, ...changes } = input;
      await db.update(materiaisEstoque).set({ ...changes, ...(estoqueMinimo === undefined ? {} : { estoqueMinimo: decimal(estoqueMinimo) }) })
        .where(and(eq(materiaisEstoque.id, id), eq(materiaisEstoque.tenantId, ctx.tenantId)));
      await recordAuditEvent({ tenantId: ctx.tenantId, actorType: "admin", actorId: ctx.tenantSession?.adminId, action: "estoque.material.atualizar", entityType: "material", entityId: id, req: ctx.req });
      return { success: true };
    }),
  }),

  saldos: router({
    list: tenantAdminProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select({
        saldoId: estoqueSaldos.id,
        materialId: materiaisEstoque.id,
        codigo: materiaisEstoque.codigo,
        nome: materiaisEstoque.nome,
        categoria: materiaisEstoque.categoria,
        unidade: materiaisEstoque.unidade,
        estoqueMinimo: materiaisEstoque.estoqueMinimo,
        holderType: estoqueSaldos.holderType,
        holderId: estoqueSaldos.holderId,
        quantidade: estoqueSaldos.quantidade,
        tecnicoNome: tecnicos.nome,
      }).from(estoqueSaldos)
        .innerJoin(materiaisEstoque, and(eq(materiaisEstoque.id, estoqueSaldos.materialId), eq(materiaisEstoque.tenantId, ctx.tenantId)))
        .leftJoin(tecnicos, and(eq(tecnicos.id, estoqueSaldos.holderId), eq(tecnicos.tenantId, ctx.tenantId)))
        .where(eq(estoqueSaldos.tenantId, ctx.tenantId))
        .orderBy(materiaisEstoque.nome);
    }),

    meu: tecnicoProcedure.query(async ({ ctx }) => {
      const db = await requireDb();
      return db.select({
        materialId: materiaisEstoque.id,
        codigo: materiaisEstoque.codigo,
        nome: materiaisEstoque.nome,
        categoria: materiaisEstoque.categoria,
        unidade: materiaisEstoque.unidade,
        estoqueMinimo: materiaisEstoque.estoqueMinimo,
        quantidade: estoqueSaldos.quantidade,
      }).from(estoqueSaldos)
        .innerJoin(materiaisEstoque, and(eq(materiaisEstoque.id, estoqueSaldos.materialId), eq(materiaisEstoque.tenantId, ctx.tecnicoSession.tenantId), eq(materiaisEstoque.ativo, true)))
        .where(and(eq(estoqueSaldos.tenantId, ctx.tecnicoSession.tenantId), eq(estoqueSaldos.holderType, "tecnico"), eq(estoqueSaldos.holderId, ctx.tecnicoSession.tecnicoId)))
        .orderBy(materiaisEstoque.nome);
    }),
  }),

  movimentacoes: router({
    list: tenantAdminProcedure.input(z.object({ materialId: z.number().int().positive().optional(), limit: z.number().int().min(1).max(200).default(100) }).optional())
      .query(async ({ ctx, input }) => {
        const db = await requireDb();
        const filters = [eq(estoqueMovimentacoes.tenantId, ctx.tenantId)];
        if (input?.materialId) filters.push(eq(estoqueMovimentacoes.materialId, input.materialId));
        return db.select({
          id: estoqueMovimentacoes.id,
          tipo: estoqueMovimentacoes.tipo,
          quantidade: estoqueMovimentacoes.quantidade,
          origemType: estoqueMovimentacoes.origemType,
          origemId: estoqueMovimentacoes.origemId,
          destinoType: estoqueMovimentacoes.destinoType,
          destinoId: estoqueMovimentacoes.destinoId,
          ordemServicoId: estoqueMovimentacoes.ordemServicoId,
          manutencaoId: estoqueMovimentacoes.manutencaoId,
          observacao: estoqueMovimentacoes.observacao,
          createdAt: estoqueMovimentacoes.createdAt,
          materialNome: materiaisEstoque.nome,
          materialCodigo: materiaisEstoque.codigo,
        }).from(estoqueMovimentacoes)
          .innerJoin(materiaisEstoque, and(eq(materiaisEstoque.id, estoqueMovimentacoes.materialId), eq(materiaisEstoque.tenantId, ctx.tenantId)))
          .where(and(...filters)).orderBy(desc(estoqueMovimentacoes.createdAt)).limit(input?.limit ?? 100);
      }),

    entrada: tenantAdminProcedure.input(z.object({ materialId: z.number().int().positive(), quantidade: quantidadeSchema, observacao: z.string().trim().max(2_000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        await requireMaterial(db, ctx.tenantId, input.materialId);
        const id = await db.transaction(async (tx: any) => {
          await incrementarSaldo(tx, ctx.tenantId, input.materialId, { holderType: "almoxarifado", holderId: 0 }, input.quantidade);
          return registrarMovimentacao(tx, { tenantId: ctx.tenantId, materialId: input.materialId, tipo: "entrada", origemType: "externo", origemId: 0, destinoType: "almoxarifado", destinoId: 0, quantidade: input.quantidade, observacao: input.observacao, actorType: "admin", actorId: ctx.tenantSession?.adminId });
        });
        await recordAuditEvent({ tenantId: ctx.tenantId, actorType: "admin", actorId: ctx.tenantSession?.adminId, action: "estoque.entrada", entityType: "estoque_movimentacao", entityId: id, metadata: { materialId: input.materialId, quantidade: input.quantidade }, req: ctx.req });
        return { id };
      }),

    transferir: tenantAdminProcedure.input(z.object({ materialId: z.number().int().positive(), tecnicoId: z.number().int().positive(), quantidade: quantidadeSchema, observacao: z.string().trim().max(2_000).optional() }))
      .mutation(async ({ ctx, input }) => {
        const db = await requireDb();
        await Promise.all([requireMaterial(db, ctx.tenantId, input.materialId), requireTecnico(db, ctx.tenantId, input.tecnicoId)]);
        const id = await db.transaction(async (tx: any) => {
          await debitarSaldo(tx, ctx.tenantId, input.materialId, { holderType: "almoxarifado", holderId: 0 }, input.quantidade);
          await incrementarSaldo(tx, ctx.tenantId, input.materialId, { holderType: "tecnico", holderId: input.tecnicoId }, input.quantidade);
          return registrarMovimentacao(tx, { tenantId: ctx.tenantId, materialId: input.materialId, tipo: "transferencia", origemType: "almoxarifado", origemId: 0, destinoType: "tecnico", destinoId: input.tecnicoId, quantidade: input.quantidade, observacao: input.observacao, actorType: "admin", actorId: ctx.tenantSession?.adminId });
        });
        await recordAuditEvent({ tenantId: ctx.tenantId, actorType: "admin", actorId: ctx.tenantSession?.adminId, action: "estoque.transferir", entityType: "estoque_movimentacao", entityId: id, metadata: { materialId: input.materialId, tecnicoId: input.tecnicoId, quantidade: input.quantidade }, req: ctx.req });
        return { id };
      }),

    consumir: tecnicoProcedure.input(z.object({
      materialId: z.number().int().positive(),
      quantidade: quantidadeSchema,
      ordemServicoId: z.number().int().positive().optional(),
      observacao: z.string().trim().max(2_000).optional(),
      clientId: z.string().uuid().optional(),
    })).mutation(async ({ ctx, input }) => {
      const tenantId = ctx.tecnicoSession.tenantId;
      const tecnicoId = ctx.tecnicoSession.tecnicoId;
      const db = await requireDb();
      await Promise.all([requireMaterial(db, tenantId, input.materialId), requireTecnico(db, tenantId, tecnicoId)]);
      if (input.ordemServicoId) {
        const [ordem] = await db.select({ id: ordensServico.id }).from(ordensServico)
          .where(and(eq(ordensServico.id, input.ordemServicoId), eq(ordensServico.tenantId, tenantId), eq(ordensServico.tecnicoId, tecnicoId)))
          .limit(1);
        if (!ordem) throw new TRPCError({ code: "FORBIDDEN", message: "Ordem de serviço não pertence ao técnico autenticado" });
      }
      const existente = await movimentoExistente(db, tenantId, input.clientId);
      if (existente) return { id: existente.id, idempotent: true };
      const id = await db.transaction(async (tx: any) => {
        await debitarSaldo(tx, tenantId, input.materialId, { holderType: "tecnico", holderId: tecnicoId }, input.quantidade);
        return registrarMovimentacao(tx, { tenantId, materialId: input.materialId, tipo: "consumo", origemType: "tecnico", origemId: tecnicoId, destinoType: "consumo", destinoId: 0, quantidade: input.quantidade, ordemServicoId: input.ordemServicoId, observacao: input.observacao, clientId: input.clientId, actorType: "tecnico", actorId: tecnicoId });
      });
      await recordAuditEvent({ tenantId, actorType: "tecnico", actorId: tecnicoId, action: "estoque.consumir", entityType: "estoque_movimentacao", entityId: id, metadata: { materialId: input.materialId, quantidade: input.quantidade, ordemServicoId: input.ordemServicoId }, req: ctx.req });
      return { id, idempotent: false };
    }),
  }),
});
