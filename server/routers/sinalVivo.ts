import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, gte, inArray, ne, sql } from "drizzle-orm";
import { router, publicProcedure, tenantAdminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import {
  escolas,
  manutencoes,
  sinalVivoIncidentes,
  sinalVivoPulsos,
  tenants,
} from "../../drizzle/schema";
import {
  DIAS_SILENCIO_ALERTA,
  JANELA_INCIDENTE_HORAS,
  decidirTriagem,
  detectarIncidenteRegional,
  escolasEmSilencio,
  montarDescricaoManutencao,
  resumoSaude,
  type PulsoStatus,
} from "../../shared/sinalVivo";
import { recordAuditEvent } from "../audit";

const pulsoStatusSchema = z.enum(["ok", "lento", "offline"]);

async function resolverTenantPorSlug(slug: string) {
  const { getTenantBySlug } = await import("../db-tenant");
  const tenant = await getTenantBySlug(slug.trim().toLowerCase());
  if (!tenant || tenant.status === "cancelado" || tenant.status === "suspenso") {
    throw new TRPCError({ code: "NOT_FOUND", message: "Empresa não encontrada" });
  }
  return tenant;
}

async function buscarEscolaDoTenant(tenantId: number, inep: string) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
  const [escola] = await db
    .select({
      id: escolas.id,
      nome: escolas.nome,
      inep: escolas.inep,
      municipio: escolas.municipio,
      status: escolas.status,
      latitude: escolas.latitude,
      longitude: escolas.longitude,
    })
    .from(escolas)
    .where(and(eq(escolas.tenantId, tenantId), eq(escolas.inep, inep.trim()), eq(escolas.ativo, true)))
    .limit(1);
  if (!escola) {
    throw new TRPCError({ code: "NOT_FOUND", message: "Escola não encontrada neste cadastro" });
  }
  return escola;
}

export const sinalVivoRouter = router({
  /** Link público e metadados do módulo para o painel. */
  info: tenantAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const tenantId = (ctx as { tenantId: number }).tenantId;
    const [tenant] = await db
      .select({ slug: tenants.slug, nome: tenants.nome })
      .from(tenants)
      .where(eq(tenants.id, tenantId))
      .limit(1);
    if (!tenant) throw new TRPCError({ code: "NOT_FOUND", message: "Tenant não encontrado" });
    return {
      slug: tenant.slug,
      nome: tenant.nome,
      caminhoPublico: `/sinal-vivo/${tenant.slug}`,
    };
  }),

  /** Busca pública da escola pelo INEP + slug da empresa. */
  buscarEscola: publicProcedure
    .input(z.object({
      slug: z.string().min(2).max(100),
      inep: z.string().min(4).max(20),
    }))
    .query(async ({ input }) => {
      const tenant = await resolverTenantPorSlug(input.slug);
      const escola = await buscarEscolaDoTenant(tenant.id, input.inep);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [ultimo] = await db
        .select({
          status: sinalVivoPulsos.status,
          classificacao: sinalVivoPulsos.classificacao,
          createdAt: sinalVivoPulsos.createdAt,
        })
        .from(sinalVivoPulsos)
        .where(and(eq(sinalVivoPulsos.tenantId, tenant.id), eq(sinalVivoPulsos.escolaId, escola.id)))
        .orderBy(desc(sinalVivoPulsos.createdAt))
        .limit(1);

      return {
        tenantNome: tenant.nome,
        escola: {
          id: escola.id,
          nome: escola.nome,
          inep: escola.inep,
          municipio: escola.municipio,
          instalada: escola.status === "concluido",
        },
        ultimoPulso: ultimo ?? null,
      };
    }),

  /** Envia pulso público com triagem automática e detecção regional. */
  enviarPulso: publicProcedure
    .input(z.object({
      slug: z.string().min(2).max(100),
      inep: z.string().min(4).max(20),
      status: pulsoStatusSchema,
      temEnergia: z.boolean().nullable().optional(),
      ledsModemOk: z.boolean().nullable().optional(),
      vizinhosTambem: z.boolean().nullable().optional(),
      relato: z.string().max(1000).optional(),
      contatoNome: z.string().max(255).optional(),
      contatoTelefone: z.string().max(30).optional(),
      confirmarManutencao: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const tenant = await resolverTenantPorSlug(input.slug);
      const escola = await buscarEscolaDoTenant(tenant.id, input.inep);
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const triagem = decidirTriagem({
        status: input.status,
        temEnergia: input.temEnergia ?? null,
        ledsModemOk: input.ledsModemOk ?? null,
        vizinhosTambem: input.vizinhosTambem ?? null,
      });

      const desde = new Date(Date.now() - JANELA_INCIDENTE_HORAS * 60 * 60 * 1000);
      const pulsosRecentes = await db
        .select({
          status: sinalVivoPulsos.status,
          escolaId: sinalVivoPulsos.escolaId,
          municipio: escolas.municipio,
        })
        .from(sinalVivoPulsos)
        .innerJoin(escolas, eq(sinalVivoPulsos.escolaId, escolas.id))
        .where(and(
          eq(sinalVivoPulsos.tenantId, tenant.id),
          gte(sinalVivoPulsos.createdAt, desde),
          inArray(sinalVivoPulsos.status, ["offline", "lento"]),
        ));

      const regional = detectarIncidenteRegional({
        pulsosRecentes: [
          ...pulsosRecentes.map((p) => ({
            municipio: p.municipio,
            status: p.status as PulsoStatus,
            escolaId: p.escolaId,
          })),
          {
            municipio: escola.municipio,
            status: input.status,
            escolaId: escola.id,
          },
        ],
        municipio: escola.municipio ?? "",
      });

      let incidenteId: number | null = null;
      let incidenteAberto = false;

      if (regional.incidente && escola.municipio) {
        const [aberto] = await db
          .select()
          .from(sinalVivoIncidentes)
          .where(and(
            eq(sinalVivoIncidentes.tenantId, tenant.id),
            eq(sinalVivoIncidentes.municipio, escola.municipio),
            ne(sinalVivoIncidentes.status, "resolvido"),
          ))
          .orderBy(desc(sinalVivoIncidentes.createdAt))
          .limit(1);

        if (aberto) {
          await db
            .update(sinalVivoIncidentes)
            .set({
              escolasAfetadas: Math.max(aberto.escolasAfetadas, regional.escolasAfetadas),
              status: "monitorando",
              resumo: `${regional.escolasAfetadas} escolas com sinal degradado em ${escola.municipio} nas últimas ${JANELA_INCIDENTE_HORAS}h.`,
            })
            .where(and(eq(sinalVivoIncidentes.id, aberto.id), eq(sinalVivoIncidentes.tenantId, tenant.id)));
          incidenteId = aberto.id;
        } else {
          const inserted = await db.insert(sinalVivoIncidentes).values({
            tenantId: tenant.id,
            municipio: escola.municipio,
            status: "aberto",
            escolasAfetadas: regional.escolasAfetadas,
            resumo: `Incidente regional detectado: ${regional.escolasAfetadas} escolas em ${escola.municipio} reportaram falha.`,
          });
          incidenteId = Number((inserted as any)[0]?.insertId ?? 0) || null;
        }
        incidenteAberto = true;
      }

      const classificacaoFinal =
        incidenteAberto && (input.status === "offline" || input.status === "lento")
          ? "suspeita_provedor"
          : triagem.classificacao;

      let manutencaoId: number | null = null;
      const deveCriarManutencao =
        Boolean(input.confirmarManutencao) &&
        (triagem.criarManutencaoSugerida || classificacaoFinal === "chamado_local") &&
        classificacaoFinal !== "suspeita_provedor" &&
        classificacaoFinal !== "autoajuda" &&
        classificacaoFinal !== "saudavel";

      if (deveCriarManutencao) {
        const [pendente] = await db
          .select({ id: manutencoes.id })
          .from(manutencoes)
          .where(and(
            eq(manutencoes.tenantId, tenant.id),
            eq(manutencoes.escolaId, escola.id),
            inArray(manutencoes.status, ["pendente", "em_andamento"]),
          ))
          .limit(1);

        if (!pendente) {
          const descricao = montarDescricaoManutencao({
            status: input.status,
            classificacao: classificacaoFinal,
            relato: input.relato,
            contatoNome: input.contatoNome,
          });
          const created = await db.insert(manutencoes).values({
            tenantId: tenant.id,
            escolaId: escola.id,
            tecnicoId: null,
            descricaoProblema: descricao,
            quilometragem: "0",
            status: "pendente",
          });
          manutencaoId = Number((created as any)[0]?.insertId ?? 0) || null;
        } else {
          manutencaoId = pendente.id;
        }
      }

      const insertedPulso = await db.insert(sinalVivoPulsos).values({
        tenantId: tenant.id,
        escolaId: escola.id,
        status: input.status,
        temEnergia: input.temEnergia ?? null,
        ledsModemOk: input.ledsModemOk ?? null,
        vizinhosTambem: input.vizinhosTambem ?? null,
        classificacao: classificacaoFinal,
        relato: input.relato?.trim() || null,
        origem: "publico",
        contatoNome: input.contatoNome?.trim() || null,
        contatoTelefone: input.contatoTelefone?.trim() || null,
        incidenteId,
        manutencaoId,
      });

      const pulsoId = Number((insertedPulso as any)[0]?.insertId ?? 0);

      await recordAuditEvent({
        tenantId: tenant.id,
        actorType: "sistema",
        action: "sinal_vivo.pulso",
        entityType: "sinal_vivo_pulso",
        entityId: String(pulsoId || escola.id),
        success: true,
        metadata: {
          status: input.status,
          classificacao: classificacaoFinal,
          incidenteId,
          manutencaoId,
          escolaId: escola.id,
        },
        req: ctx.req,
      });

      return {
        pulsoId,
        classificacao: classificacaoFinal,
        mensagem:
          classificacaoFinal === "suspeita_provedor" && incidenteAberto
            ? `Detectamos falha em ${regional.escolasAfetadas} escolas de ${escola.municipio}. Provável incidente do provedor — mantenha o modem ligado e acompanhe.`
            : triagem.mensagem,
        guiaAutoajuda: classificacaoFinal === "suspeita_provedor" ? decidirTriagem({
          status: input.status,
          temEnergia: true,
          ledsModemOk: true,
          vizinhosTambem: true,
        }).guiaAutoajuda : triagem.guiaAutoajuda,
        criarManutencaoSugerida: triagem.criarManutencaoSugerida && classificacaoFinal === "chamado_local",
        manutencaoId,
        incidente: incidenteAberto
          ? { id: incidenteId, escolasAfetadas: regional.escolasAfetadas, municipio: escola.municipio }
          : null,
      };
    }),

  /** Painel operacional: saúde, silêncios e incidentes. */
  painel: tenantAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const tenantId = (ctx as { tenantId: number }).tenantId;
    const desde24h = new Date(Date.now() - 24 * 60 * 60 * 1000);

    const pulsos24h = await db
      .select({
        status: sinalVivoPulsos.status,
        escolaId: sinalVivoPulsos.escolaId,
        createdAt: sinalVivoPulsos.createdAt,
        classificacao: sinalVivoPulsos.classificacao,
        escolaNome: escolas.nome,
        municipio: escolas.municipio,
      })
      .from(sinalVivoPulsos)
      .innerJoin(escolas, eq(sinalVivoPulsos.escolaId, escolas.id))
      .where(and(eq(sinalVivoPulsos.tenantId, tenantId), gte(sinalVivoPulsos.createdAt, desde24h)))
      .orderBy(desc(sinalVivoPulsos.createdAt))
      .limit(500);

    const saude = resumoSaude(pulsos24h.map((p) => ({ status: p.status as PulsoStatus })));

    const instaladas = await db
      .select({
        id: escolas.id,
        nome: escolas.nome,
        status: escolas.status,
        municipio: escolas.municipio,
      })
      .from(escolas)
      .where(and(eq(escolas.tenantId, tenantId), eq(escolas.ativo, true), eq(escolas.status, "concluido")));

    const ultimosPorEscola = await db
      .select({
        escolaId: sinalVivoPulsos.escolaId,
        createdAt: sql<Date>`MAX(${sinalVivoPulsos.createdAt})`.as("createdAt"),
      })
      .from(sinalVivoPulsos)
      .where(eq(sinalVivoPulsos.tenantId, tenantId))
      .groupBy(sinalVivoPulsos.escolaId);

    const mapaUltimo = new Map(ultimosPorEscola.map((u) => [u.escolaId, new Date(u.createdAt)]));

    const silencio = escolasEmSilencio({
      escolas: instaladas.map((e) => ({
        id: e.id,
        nome: e.nome,
        status: e.status,
        municipio: e.municipio,
        ultimoPulsoEm: mapaUltimo.get(e.id) ?? null,
      })),
      agora: new Date(),
      diasSemPulso: DIAS_SILENCIO_ALERTA,
    }).slice(0, 40);

    const incidentes = await db
      .select()
      .from(sinalVivoIncidentes)
      .where(and(eq(sinalVivoIncidentes.tenantId, tenantId), ne(sinalVivoIncidentes.status, "resolvido")))
      .orderBy(desc(sinalVivoIncidentes.createdAt))
      .limit(20);

    const porMunicipio = new Map<string, { ok: number; lento: number; offline: number }>();
    for (const p of pulsos24h) {
      const key = p.municipio || "Sem município";
      const atual = porMunicipio.get(key) ?? { ok: 0, lento: 0, offline: 0 };
      if (p.status === "ok") atual.ok += 1;
      else if (p.status === "lento") atual.lento += 1;
      else atual.offline += 1;
      porMunicipio.set(key, atual);
    }

    return {
      saude,
      totalInstaladas: instaladas.length,
      emSilencio: silencio.length,
      incidentesAbertos: incidentes.length,
      pulsosRecentes: pulsos24h.slice(0, 30),
      silencio,
      incidentes,
      porMunicipio: Array.from(porMunicipio.entries())
        .map(([municipio, counts]) => ({ municipio, ...counts, total: counts.ok + counts.lento + counts.offline }))
        .sort((a, b) => b.offline - a.offline || b.total - a.total),
    };
  }),

  listarPulsos: tenantAdminProcedure
    .input(z.object({
      status: pulsoStatusSchema.optional(),
      limite: z.number().min(1).max(200).optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = (ctx as { tenantId: number }).tenantId;
      const condicoes = [eq(sinalVivoPulsos.tenantId, tenantId)];
      if (input?.status) condicoes.push(eq(sinalVivoPulsos.status, input.status));

      return db
        .select({
          id: sinalVivoPulsos.id,
          status: sinalVivoPulsos.status,
          classificacao: sinalVivoPulsos.classificacao,
          relato: sinalVivoPulsos.relato,
          contatoNome: sinalVivoPulsos.contatoNome,
          contatoTelefone: sinalVivoPulsos.contatoTelefone,
          createdAt: sinalVivoPulsos.createdAt,
          manutencaoId: sinalVivoPulsos.manutencaoId,
          incidenteId: sinalVivoPulsos.incidenteId,
          escola: {
            id: escolas.id,
            nome: escolas.nome,
            inep: escolas.inep,
            municipio: escolas.municipio,
          },
        })
        .from(sinalVivoPulsos)
        .innerJoin(escolas, eq(sinalVivoPulsos.escolaId, escolas.id))
        .where(and(...condicoes))
        .orderBy(desc(sinalVivoPulsos.createdAt))
        .limit(input?.limite ?? 50);
    }),

  listarIncidentes: tenantAdminProcedure
    .input(z.object({
      incluirResolvidos: z.boolean().optional(),
    }).optional())
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = (ctx as { tenantId: number }).tenantId;
      const condicoes = [eq(sinalVivoIncidentes.tenantId, tenantId)];
      if (!input?.incluirResolvidos) {
        condicoes.push(ne(sinalVivoIncidentes.status, "resolvido"));
      }
      return db
        .select()
        .from(sinalVivoIncidentes)
        .where(and(...condicoes))
        .orderBy(desc(sinalVivoIncidentes.createdAt))
        .limit(100);
    }),

  resolverIncidente: tenantAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = (ctx as { tenantId: number }).tenantId;
      const [incidente] = await db
        .select({ id: sinalVivoIncidentes.id })
        .from(sinalVivoIncidentes)
        .where(and(eq(sinalVivoIncidentes.id, input.id), eq(sinalVivoIncidentes.tenantId, tenantId)))
        .limit(1);
      if (!incidente) throw new TRPCError({ code: "NOT_FOUND", message: "Incidente não encontrado" });

      await db
        .update(sinalVivoIncidentes)
        .set({ status: "resolvido", resolvidoEm: new Date() })
        .where(and(eq(sinalVivoIncidentes.id, input.id), eq(sinalVivoIncidentes.tenantId, tenantId)));

      await recordAuditEvent({
        tenantId,
        actorType: "admin",
        actorId: (ctx as { tenantSession?: { adminId?: number } }).tenantSession?.adminId,
        action: "sinal_vivo.resolver_incidente",
        entityType: "sinal_vivo_incidente",
        entityId: String(input.id),
        success: true,
        req: ctx.req,
      });

      return { success: true };
    }),
});
