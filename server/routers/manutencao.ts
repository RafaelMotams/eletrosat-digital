import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, or, like } from "drizzle-orm";
import { router, tenantAdminProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { manutencoes, manutencaoFotos, escolas, tecnicos } from "../../drizzle/schema";
import { storagePut } from "../storage";

// ─── helpers ─────────────────────────────────────────────────────────────────

async function getManutencaoComDados(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      m: manutencoes,
      escola: { id: escolas.id, nome: escolas.nome, inep: escolas.inep, municipio: escolas.municipio, endereco: escolas.endereco, telefone: escolas.telefone },
      tecnico: { id: tecnicos.id, nome: tecnicos.nome, email: tecnicos.email, telefone: tecnicos.telefone },
    })
    .from(manutencoes)
    .leftJoin(escolas, eq(manutencoes.escolaId, escolas.id))
    .leftJoin(tecnicos, eq(manutencoes.tecnicoId, tecnicos.id))
    .where(eq(manutencoes.id, id));
  if (!rows[0]) return null;
  const fotos = await db.select().from(manutencaoFotos).where(eq(manutencaoFotos.manutencaoId, id));
  return { ...rows[0].m, escola: rows[0].escola, tecnico: rows[0].tecnico, fotos };
}

// ─── router ──────────────────────────────────────────────────────────────────

export const manutencaoRouter = router({

  // ── ADMIN: Listar todas as manutenções ──────────────────────────────────────
  listar: tenantAdminProcedure
    .input(z.object({
      status: z.enum(["pendente", "em_andamento", "concluida", "todas"]).optional(),
      tecnicoId: z.number().optional(),
      busca: z.string().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = (ctx as any).tenantId ?? 1;

      const rows = await db
        .select({
          m: manutencoes,
          escola: { id: escolas.id, nome: escolas.nome, inep: escolas.inep, municipio: escolas.municipio, endereco: escolas.endereco },
          tecnico: { id: tecnicos.id, nome: tecnicos.nome },
        })
        .from(manutencoes)
        .leftJoin(escolas, eq(manutencoes.escolaId, escolas.id))
        .leftJoin(tecnicos, eq(manutencoes.tecnicoId, tecnicos.id))
        .where(eq(manutencoes.tenantId, tenantId))
        .orderBy(desc(manutencoes.createdAt));

      let result = rows.map(r => ({ ...r.m, escola: r.escola, tecnico: r.tecnico }));

      if (input?.status && input.status !== "todas") {
        result = result.filter(r => r.status === input.status);
      }
      if (input?.tecnicoId) {
        result = result.filter(r => r.tecnicoId === input.tecnicoId);
      }
      if (input?.busca) {
        const b = input.busca.toLowerCase();
        result = result.filter(r =>
          r.escola?.nome?.toLowerCase().includes(b) ||
          r.escola?.inep?.includes(b) ||
          r.escola?.municipio?.toLowerCase().includes(b) ||
          r.escola?.endereco?.toLowerCase().includes(b)
        );
      }
      return result;
    }),

  // ── ADMIN: Criar manutenção ─────────────────────────────────────────────────
  criar: tenantAdminProcedure
    .input(z.object({
      escolaId: z.number(),
      tecnicoId: z.number().optional(),
      descricaoProblema: z.string().min(5, "Descrição obrigatória"),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = (ctx as any).tenantId ?? 1;
      const res = await db.insert(manutencoes).values({
        tenantId,
        escolaId: input.escolaId,
        tecnicoId: input.tecnicoId ?? null,
        descricaoProblema: input.descricaoProblema,
        status: "pendente",
        dataAtribuicao: input.tecnicoId ? new Date() : undefined,
      });
      return { success: true, id: Number(res[0].insertId) };
    }),

  // ── ADMIN: Atribuir técnico ─────────────────────────────────────────────────
  atribuir: tenantAdminProcedure
    .input(z.object({ id: z.number(), tecnicoId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(manutencoes)
        .set({ tecnicoId: input.tecnicoId, dataAtribuicao: new Date(), status: "pendente" })
        .where(eq(manutencoes.id, input.id));
      return { success: true };
    }),

  // ── ADMIN: Excluir manutenção ───────────────────────────────────────────────
  excluir: tenantAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.delete(manutencaoFotos).where(eq(manutencaoFotos.manutencaoId, input.id));
      await db.delete(manutencoes).where(eq(manutencoes.id, input.id));
      return { success: true };
    }),

  // ── ADMIN: Relatório Excel (retorna dados) ──────────────────────────────────
  relatorio: tenantAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const tenantId = (ctx as any).tenantId ?? 1;
    const rows = await db
      .select({
        m: manutencoes,
        escola: { nome: escolas.nome, inep: escolas.inep, municipio: escolas.municipio, endereco: escolas.endereco },
        tecnico: { nome: tecnicos.nome },
      })
      .from(manutencoes)
      .leftJoin(escolas, eq(manutencoes.escolaId, escolas.id))
      .leftJoin(tecnicos, eq(manutencoes.tecnicoId, tecnicos.id))
      .where(eq(manutencoes.tenantId, tenantId))
      .orderBy(desc(manutencoes.createdAt));
    return rows.map(r => ({
      id: r.m.id,
      status: r.m.status,
      descricaoProblema: r.m.descricaoProblema,
      observacaoConclusao: r.m.observacaoConclusao,
      escola: r.escola?.nome ?? "",
      inep: r.escola?.inep ?? "",
      municipio: r.escola?.municipio ?? "",
      endereco: r.escola?.endereco ?? "",
      tecnico: r.tecnico?.nome ?? "Não atribuído",
      dataAtribuicao: r.m.dataAtribuicao ? new Date(r.m.dataAtribuicao).toLocaleDateString("pt-BR") : "",
      dataConclusao: r.m.dataConclusao ? new Date(r.m.dataConclusao).toLocaleDateString("pt-BR") : "",
      createdAt: new Date(r.m.createdAt).toLocaleDateString("pt-BR"),
    }));
  }),

  // ── TÉCNICO: Listar manutenções atribuídas (public para funcionar no app) ───
  minhas: publicProcedure
    .input(z.object({
      tecnicoId: z.number(),
      busca: z.string().optional(),
    }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const rows = await db
        .select({
          m: manutencoes,
          escola: { id: escolas.id, nome: escolas.nome, inep: escolas.inep, municipio: escolas.municipio, endereco: escolas.endereco, telefone: escolas.telefone, latitude: escolas.latitude, longitude: escolas.longitude },
        })
        .from(manutencoes)
        .leftJoin(escolas, eq(manutencoes.escolaId, escolas.id))
        .where(
          and(
            eq(manutencoes.tecnicoId, input.tecnicoId),
            // Só mostra pendentes e em andamento (concluídas saem da lista)
            or(
              eq(manutencoes.status, "pendente"),
              eq(manutencoes.status, "em_andamento")
            )
          )
        )
        .orderBy(desc(manutencoes.createdAt));

      let result = rows.map(r => ({ ...r.m, escola: r.escola }));

      if (input.busca) {
        const b = input.busca.toLowerCase();
        result = result.filter(r =>
          r.escola?.nome?.toLowerCase().includes(b) ||
          r.escola?.inep?.includes(b) ||
          r.escola?.endereco?.toLowerCase().includes(b) ||
          r.escola?.municipio?.toLowerCase().includes(b)
        );
      }
      return result;
    }),

  // ── TÉCNICO: Buscar manutenção por ID ──────────────────────────────────────
  getById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      return getManutencaoComDados(input.id);
    }),

  // ── TÉCNICO: Iniciar manutenção ─────────────────────────────────────────────
  iniciar: publicProcedure
    .input(z.object({ id: z.number(), tecnicoId: z.number() }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(manutencoes)
        .set({ status: "em_andamento" })
        .where(and(eq(manutencoes.id, input.id), eq(manutencoes.tecnicoId, input.tecnicoId)));
      return { success: true };
    }),

  // ── TÉCNICO: Upload foto ────────────────────────────────────────────────────
  uploadFoto: publicProcedure
    .input(z.object({
      manutencaoId: z.number(),
      tipo: z.enum(["defeito", "conclusao"]),
      base64: z.string(),
      mimeType: z.string().default("image/jpeg"),
      clientId: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      // Verificar duplicata por clientId
      if (input.clientId) {
        const existing = await db.select().from(manutencaoFotos)
          .where(eq(manutencaoFotos.clientId, input.clientId));
        if (existing.length > 0) return { success: true, url: existing[0].url, key: existing[0].fileKey };
      }

      const buffer = Buffer.from(input.base64, "base64");
      const ext = input.mimeType === "image/png" ? "png" : "jpg";
      const key = `manutencao/${input.manutencaoId}/${input.tipo}/${Date.now()}.${ext}`;
      const { url } = await storagePut(key, buffer, input.mimeType);

      await db.insert(manutencaoFotos).values({
        manutencaoId: input.manutencaoId,
        tipo: input.tipo,
        url,
        fileKey: key,
        clientId: input.clientId ?? null,
      });
      return { success: true, url, key };
    }),

  // ── TÉCNICO: Concluir manutenção ────────────────────────────────────────────
  concluir: publicProcedure
    .input(z.object({
      id: z.number(),
      tecnicoId: z.number(),
      observacaoConclusao: z.string().min(5, "Observação obrigatória"),
    }))
    .mutation(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(manutencoes)
        .set({
          status: "concluida",
          observacaoConclusao: input.observacaoConclusao,
          dataConclusao: new Date(),
        })
        .where(and(eq(manutencoes.id, input.id), eq(manutencoes.tecnicoId, input.tecnicoId)));
      return { success: true };
    }),

  // ── ADMIN: Buscar fotos de uma manutenção ──────────────────────────────────
  fotos: tenantAdminProcedure
    .input(z.object({ manutencaoId: z.number() }))
    .query(async ({ input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      return db.select().from(manutencaoFotos)
        .where(eq(manutencaoFotos.manutencaoId, input.manutencaoId))
        .orderBy(manutencaoFotos.createdAt);
    }),
});
