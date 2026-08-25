import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, or, like } from "drizzle-orm";
import { router, tecnicoProcedure, tenantAdminProcedure, tenantOrTecnicoProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { manutencoes, manutencaoFotos, escolas, tecnicos } from "../../drizzle/schema";
import { storagePut } from "../storage";
import { invokeLLM } from "../_core/llm";
import { recordAuditEvent } from "../audit";

// ─── helpers ─────────────────────────────────────────────────────────────────

export const VALOR_BASE_MANUTENCAO = 200;
export const VALOR_POR_KM_MANUTENCAO = 2.5;

export function calcularRemuneracaoManutencao(quilometragem: number | string | null | undefined) {
  const kmConvertido = typeof quilometragem === "number" ? quilometragem : Number.parseFloat(String(quilometragem ?? 0));
  const km = Number.isFinite(kmConvertido) && kmConvertido >= 0 ? kmConvertido : 0;
  const valorKm = Math.round(km * VALOR_POR_KM_MANUTENCAO * 100) / 100;
  return {
    quilometragem: km,
    valorBase: VALOR_BASE_MANUTENCAO,
    valorKm,
    valorTotal: Math.round((VALOR_BASE_MANUTENCAO + valorKm) * 100) / 100,
  };
}

function escolaDaManutencao(manutencao: typeof manutencoes.$inferSelect, escola: any): any {
  return escola ?? {
    id: null,
    nome: manutencao.escolaNaoCadastradaNome ?? "Escola não cadastrada",
    inep: manutencao.escolaNaoCadastradaInep ?? null,
    municipio: manutencao.escolaNaoCadastradaMunicipio ?? null,
    endereco: manutencao.escolaNaoCadastradaEndereco ?? null,
    telefone: manutencao.escolaNaoCadastradaWhatsapp ?? null,
    telefoneWhatsApp: manutencao.escolaNaoCadastradaWhatsapp ?? null,
    latitude: manutencao.escolaNaoCadastradaLatitude ?? null,
    longitude: manutencao.escolaNaoCadastradaLongitude ?? null,
    velocidadeOfertada: null,
  };
}

async function getManutencaoComDados(id: number) {
  const db = await getDb();
  if (!db) return null;
  const rows = await db
    .select({
      m: manutencoes,
      escola: { id: escolas.id, nome: escolas.nome, inep: escolas.inep, municipio: escolas.municipio, endereco: escolas.endereco, telefone: escolas.telefone, telefoneWhatsApp: escolas.telefoneWhatsApp, latitude: escolas.latitude, longitude: escolas.longitude, velocidadeOfertada: escolas.velocidadeOfertada },
      tecnico: { id: tecnicos.id, nome: tecnicos.nome, email: tecnicos.email, telefone: tecnicos.telefone },
    })
    .from(manutencoes)
    .leftJoin(escolas, eq(manutencoes.escolaId, escolas.id))
    .leftJoin(tecnicos, eq(manutencoes.tecnicoId, tecnicos.id))
    .where(eq(manutencoes.id, id));
  if (!rows[0]) return null;
  const fotos = await db.select().from(manutencaoFotos).where(eq(manutencaoFotos.manutencaoId, id));
  return {
    ...rows[0].m,
    ...calcularRemuneracaoManutencao(rows[0].m.quilometragem),
    escola: escolaDaManutencao(rows[0].m, rows[0].escola),
    tecnico: rows[0].tecnico,
    fotos,
  };
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
      const tenantId = (ctx as any).tenantId;

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

      let result = rows.map(r => ({
        ...r.m,
        ...calcularRemuneracaoManutencao(r.m.quilometragem),
        escola: escolaDaManutencao(r.m, r.escola),
        tecnico: r.tecnico,
      }));

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
      quilometragem: z.number().min(0).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = (ctx as any).tenantId;
      const [escolaDoTenant] = await db
        .select({ id: escolas.id })
        .from(escolas)
        .where(and(eq(escolas.id, input.escolaId), eq(escolas.tenantId, tenantId)))
        .limit(1);
      if (!escolaDoTenant) throw new TRPCError({ code: "FORBIDDEN", message: "Escola não pertence a este tenant" });
      if (input.tecnicoId) {
        const [tecnicoDoTenant] = await db
          .select({ id: tecnicos.id })
          .from(tecnicos)
          .where(and(eq(tecnicos.id, input.tecnicoId), eq(tecnicos.tenantId, tenantId)))
          .limit(1);
        if (!tecnicoDoTenant) throw new TRPCError({ code: "FORBIDDEN", message: "Técnico não pertence a este tenant" });
      }
      const res = await db.insert(manutencoes).values({
        tenantId,
        escolaId: input.escolaId,
        tecnicoId: input.tecnicoId ?? null,
        descricaoProblema: input.descricaoProblema,
        quilometragem: input.quilometragem ? String(input.quilometragem) : "0",
        status: "pendente",
        dataAtribuicao: input.tecnicoId ? new Date() : undefined,
      });
      return { success: true, id: Number(res[0].insertId) };
    }),

  // ── ADMIN: Atribuir técnico ─────────────────────────────────────────────────
  atribuir: tenantAdminProcedure
    .input(z.object({ id: z.number(), tecnicoId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = (ctx as any).tenantId;
      const [tecnicoDoTenant] = await db
        .select({ id: tecnicos.id })
        .from(tecnicos)
        .where(and(eq(tecnicos.id, input.tecnicoId), eq(tecnicos.tenantId, tenantId)))
        .limit(1);
      if (!tecnicoDoTenant) throw new TRPCError({ code: "FORBIDDEN", message: "Técnico não pertence a este tenant" });
      await db.update(manutencoes)
        .set({ tecnicoId: input.tecnicoId, dataAtribuicao: new Date(), status: "pendente" })
        .where(and(eq(manutencoes.id, input.id), eq(manutencoes.tenantId, tenantId)));
      return { success: true };
    }),

  // ── ADMIN: Excluir manutenção ───────────────────────────────────────────────
  excluir: tenantAdminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = (ctx as any).tenantId;
      const [registro] = await db
        .select({ id: manutencoes.id })
        .from(manutencoes)
        .where(and(eq(manutencoes.id, input.id), eq(manutencoes.tenantId, tenantId)))
        .limit(1);
      if (!registro) throw new TRPCError({ code: "NOT_FOUND", message: "Manutenção não encontrada" });
      await db.delete(manutencaoFotos).where(eq(manutencaoFotos.manutencaoId, input.id));
      await db.delete(manutencoes).where(and(eq(manutencoes.id, input.id), eq(manutencoes.tenantId, tenantId)));
      return { success: true };
    }),

  // ── ADMIN: Relatório Excel (retorna dados) ──────────────────────────────────
  relatorio: tenantAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const tenantId = (ctx as any).tenantId;
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
    return rows.map(r => {
      const remuneracao = calcularRemuneracaoManutencao(r.m.quilometragem);
      return {
        id: r.m.id,
        status: r.m.status,
        descricaoProblema: r.m.descricaoProblema,
        observacaoConclusao: r.m.observacaoConclusao,
        escola: r.escola?.nome ?? (r.m as any).escolaNaoCadastradaNome ?? "",
        inep: r.escola?.inep ?? (r.m as any).escolaNaoCadastradaInep ?? "",
        municipio: r.escola?.municipio ?? (r.m as any).escolaNaoCadastradaMunicipio ?? "",
        endereco: r.escola?.endereco ?? (r.m as any).escolaNaoCadastradaEndereco ?? "",
        tecnico: r.tecnico?.nome ?? "Não atribuído",
        dataAtribuicao: r.m.dataAtribuicao ? new Date(r.m.dataAtribuicao).toLocaleDateString("pt-BR") : "",
        dataConclusao: r.m.dataConclusao ? new Date(r.m.dataConclusao).toLocaleDateString("pt-BR") : "",
        createdAt: new Date(r.m.createdAt).toLocaleDateString("pt-BR"),
        ...remuneracao,
      };
    });
  }),

  // ── TÉCNICO: Listar manutenções atribuídas (public para funcionar no app) ───
  minhas: tecnicoProcedure
    .input(z.object({
      tecnicoId: z.number(),
      busca: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      if (input.tecnicoId !== ctx.tecnicoSession.tecnicoId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
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
            eq(manutencoes.tecnicoId, ctx.tecnicoSession.tecnicoId),
            eq(manutencoes.tenantId, ctx.tecnicoSession.tenantId),
            // Só mostra pendentes e em andamento (concluídas saem da lista)
            or(
              eq(manutencoes.status, "pendente"),
              eq(manutencoes.status, "em_andamento")
            )
          )
        )
        .orderBy(desc(manutencoes.createdAt));

      let result = rows.map(r => ({
        ...r.m,
        ...calcularRemuneracaoManutencao(r.m.quilometragem),
        escola: escolaDaManutencao(r.m, r.escola),
      }));

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
  getById: tenantOrTecnicoProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const restrictions = [
        eq(manutencoes.id, input.id),
        eq(manutencoes.tenantId, ctx.accessSession.tenantId),
      ];
      if (ctx.accessSession.kind === "tecnico" && ctx.accessSession.tecnicoId !== null) {
        restrictions.push(eq(manutencoes.tecnicoId, ctx.accessSession.tecnicoId));
      }
      const [registro] = await db.select({ id: manutencoes.id }).from(manutencoes).where(and(...restrictions)).limit(1);
      if (!registro) throw new TRPCError({ code: "NOT_FOUND", message: "Manutenção não encontrada" });
      return getManutencaoComDados(input.id);
    }),

  // ── TÉCNICO: Iniciar manutenção ─────────────────────────────────────────────
  iniciar: tecnicoProcedure
    .input(z.object({ id: z.number(), tecnicoId: z.number() }))
    .mutation(async ({ input, ctx }) => {
      if (input.tecnicoId !== ctx.tecnicoSession.tecnicoId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(manutencoes)
        .set({ status: "em_andamento" })
        .where(and(
          eq(manutencoes.id, input.id),
          eq(manutencoes.tecnicoId, ctx.tecnicoSession.tecnicoId),
          eq(manutencoes.tenantId, ctx.tecnicoSession.tenantId),
        ));
      return { success: true };
    }),

  // ── TÉCNICO: Upload foto ────────────────────────────────────────────────────
  uploadFoto: tecnicoProcedure
    .input(z.object({
      manutencaoId: z.number(),
      tipo: z.enum(["defeito", "conclusao"]),
      base64: z.string(),
      mimeType: z.string().default("image/jpeg"),
      clientId: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });

      const [registro] = await db.select({ id: manutencoes.id }).from(manutencoes).where(and(
        eq(manutencoes.id, input.manutencaoId),
        eq(manutencoes.tecnicoId, ctx.tecnicoSession.tecnicoId),
        eq(manutencoes.tenantId, ctx.tecnicoSession.tenantId),
      )).limit(1);
      if (!registro) throw new TRPCError({ code: "FORBIDDEN", message: "Manutenção não pertence ao técnico autenticado" });

      // Verificar duplicata por clientId
      if (input.clientId) {
        const existing = await db.select().from(manutencaoFotos)
          .where(eq(manutencaoFotos.clientId, input.clientId));
        if (existing.length > 0) return { success: true, url: existing[0].url, key: existing[0].fileKey };
      }

      const buffer = Buffer.from(input.base64, "base64");
      const ext = input.mimeType === "image/png" ? "png" : "jpg";
      const key = `tenants/${ctx.tecnicoSession.tenantId}/manutencao/${input.manutencaoId}/${input.tipo}/${Date.now()}.${ext}`;
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
  concluir: tecnicoProcedure
    .input(z.object({
      id: z.number(),
      tecnicoId: z.number(),
      observacaoConclusao: z.string().min(5, "Observação obrigatória"),
      quilometragem: z.number().finite().min(0, "Informe uma quilometragem válida"),
    }))
    .mutation(async ({ input, ctx }) => {
      if (input.tecnicoId !== ctx.tecnicoSession.tecnicoId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Acesso negado" });
      }
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(manutencoes)
        .set({
          status: "concluida",
          observacaoConclusao: input.observacaoConclusao,
          quilometragem: String(input.quilometragem),
          dataConclusao: new Date(),
        })
        .where(and(
          eq(manutencoes.id, input.id),
          eq(manutencoes.tecnicoId, ctx.tecnicoSession.tecnicoId),
          eq(manutencoes.tenantId, ctx.tecnicoSession.tenantId),
        ));
      return { success: true };
    }),

  // ── TÉCNICO: Assistente IA ─────────────────────────────────────────────────
  assistenteIA: tenantOrTecnicoProcedure
    .input(z.object({
      manutencaoId: z.number(),
      pergunta: z.string().min(3),
      contexto: z.string().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const restrictions = [
        eq(manutencoes.id, input.manutencaoId),
        eq(manutencoes.tenantId, ctx.accessSession.tenantId),
      ];
      if (ctx.accessSession.kind === "tecnico" && ctx.accessSession.tecnicoId !== null) {
        restrictions.push(eq(manutencoes.tecnicoId, ctx.accessSession.tecnicoId));
      }
      const [registro] = await db.select({ id: manutencoes.id }).from(manutencoes).where(and(...restrictions)).limit(1);
      if (!registro) throw new TRPCError({ code: "FORBIDDEN", message: "Manutenção não pertence à sessão autenticada" });
      const m = await getManutencaoComDados(input.manutencaoId);
      const contextoEscola = m ? `Escola: ${m.escola?.nome ?? 'N/A'} | INEP: ${m.escola?.inep ?? 'N/A'} | Município: ${m.escola?.municipio ?? 'N/A'} | Velocidade ofertada: ${m.escola?.velocidadeOfertada ?? 'N/A'} | Problema: ${m.descricaoProblema}` : '';
      const systemPrompt = `Você é o PROFESSOR MARCOS — um engenheiro de telecomunicações com 20 anos de experiência em campo, especialista absoluto em:

• INFRAESTRUTURA DE REDE: Cabeamento estruturado (Cat5e/Cat6/Cat6A), fibra óptica (FTTH, FTTx), patch panels, racks 19", organizadores, DIO, caixas de emenda
• EQUIPAMENTOS: Controladoras Intelbras (WiseFi), TP-Link Omada, Ubiquiti UniFi, Huawei, MikroTik. APs indoor/outdoor, switches gerenciáveis L2/L3, roteadores, OLTs, ONUs
• CONFIGURAÇÃO: VLANs, DHCP, DNS, QoS, balanceamento de carga, failover, PPPoE, CGNAT, NAT, firewall, ACLs, SNMP, Zabbix, Grafana
• INSTALAÇÃO FÍSICA: Montagem de rack (padrão EIA/TIA-568), passagem de cabos, certificação, teste de enlace, fusão de fibra, OTDR, power meter
• MARCAS: Intelbras (linha corporativa e GPON), TP-Link (Omada SDN), Ubiquiti (UniFi/EdgeMAX), Furukawa, Datacom, Parks, Cianet, Huawei, ZTE
• PROJETOS ESCOLARES: Programa Escolas Conectadas, PBLE, Wi-Fi Brasil — regras de cobertura, quantidade de APs por m², posicionamento ideal

Seu estilo:
- Responde como um PROFESSOR paciente mas direto ao ponto
- Dá PASSO A PASSO numérico quando é procedimento
- Indica MODELO EXATO do equipamento quando relevante
- Alerta sobre ERROS COMUNS que técnicos iniciantes cometem
- Usa linguagem técnica mas acessível
- Quando não sabe algo específico, indica onde buscar (manual, suporte fabricante)

Contexto da manutenção atual: ${contextoEscola}. ${input.contexto ?? ''}`;
      const response = await invokeLLM({
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: input.pergunta },
        ],
      });
      const raw = response.choices?.[0]?.message?.content;
      const content = typeof raw === 'string' ? raw : (Array.isArray(raw) ? raw.map((c: any) => c.text ?? '').join('') : 'Não foi possível obter resposta.');
      return { resposta: content };
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

  // ── ADMIN: Gerar laudo HTML (para impressão/PDF no browser) ───────────────
  gerarLaudo: tenantAdminProcedure
    .input(z.object({
      id: z.number(),
      observacaoAdmin: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const m = await getManutencaoComDados(input.id);
      if (!m) throw new TRPCError({ code: "NOT_FOUND", message: "Manutenção não encontrada" });

      const fotoDefeito = m.fotos.filter(f => f.tipo === "defeito");
      const fotoConclusao = m.fotos.filter(f => f.tipo === "conclusao");

      const fmtDate = (d: Date | string | null | undefined) => {
        if (!d) return "—";
        return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
      };

      const statusLabel: Record<string, string> = {
        pendente: "Pendente",
        em_andamento: "Em Andamento",
        concluida: "Concluída",
      };
      const statusColor: Record<string, string> = {
        pendente: "#f59e0b",
        em_andamento: "#3b82f6",
        concluida: "#10b981",
      };

      // Limitar fotos para caber na página: máx 3 defeito + 3 conclusao
      const fotoDefeitoLtd = fotoDefeito.slice(0, 3);
      const fotoConclusaoLtd = fotoConclusao.slice(0, 3);
      const totalFotos = fotoDefeitoLtd.length + fotoConclusaoLtd.length;

      const fotoHtml = (fotos: typeof m.fotos, titulo: string, cor: string) => {
        if (fotos.length === 0) return "";
        // Altura das fotos varia com quantidade total para caber na página
        const h = totalFotos <= 3 ? 110 : totalFotos <= 4 ? 95 : 80;
        return `
          <div class="foto-section">
            <div class="foto-label" style="color:${cor}"><span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${cor};margin-right:5px;vertical-align:middle"></span>${titulo}</div>
            <div class="fotos-grid">
              ${fotos.map(f => `<div class="foto-item"><img src="${f.url}" alt="${f.tipo}" style="height:${h}px" /></div>`).join("")}
            </div>
          </div>`;
      };

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<title>Laudo #${String(m.id).padStart(4,"0")}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:210mm;height:297mm;overflow:hidden}
  body{font-family:'Inter',sans-serif;background:#fff;color:#1e293b;font-size:10.5px;-webkit-print-color-adjust:exact;print-color-adjust:exact}
  .page{width:210mm;height:297mm;padding:14mm 16mm 10mm 16mm;display:flex;flex-direction:column;gap:0}
  /* ── HEADER ── */
  .hdr{display:flex;align-items:center;justify-content:space-between;padding-bottom:8px;border-bottom:2.5px solid #0ea5e9;margin-bottom:8px}
  .logo{display:flex;align-items:center;gap:8px}
  .logo-box{width:32px;height:32px;background:linear-gradient(135deg,#0ea5e9,#6366f1);border-radius:8px;display:flex;align-items:center;justify-content:center}
  .logo-box svg{width:18px;height:18px;stroke:white;fill:none;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
  .logo-name{font-size:16px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;line-height:1}
  .logo-sub{font-size:9px;color:#64748b}
  .doc-right{text-align:right}
  .doc-num{font-size:14px;font-weight:700;color:#0ea5e9}
  .doc-date{font-size:9px;color:#64748b;margin-top:1px}
  /* ── STATUS ── */
  .status-row{display:flex;align-items:center;gap:8px;margin-bottom:7px}
  .sbadge{display:inline-flex;align-items:center;gap:5px;padding:3px 10px;border-radius:20px;font-size:9.5px;font-weight:600}
  .sdot{width:6px;height:6px;border-radius:50%}
  /* ── INFO ROW ── */
  .info-row{display:grid;grid-template-columns:repeat(4,1fr);gap:6px;margin-bottom:7px}
  .ic{background:#f8fafc;border:1px solid #e2e8f0;border-radius:7px;padding:7px 9px}
  .il{font-size:8.5px;font-weight:600;text-transform:uppercase;letter-spacing:0.4px;color:#94a3b8;margin-bottom:3px}
  .iv{font-size:11px;font-weight:700;color:#1e293b;line-height:1.2}
  .is{font-size:8.5px;color:#64748b;margin-top:1px}
  /* ── DIVIDER ── */
  .div{border:none;border-top:1px solid #e2e8f0;margin:5px 0}
  /* ── TEXT SECTIONS ── */
  .txt-row{display:grid;grid-template-columns:1fr${m.observacaoConclusao || input.observacaoAdmin ? " 1fr" : ""};gap:6px;margin-bottom:7px}
  .txt-block{}
  .txt-lbl{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;display:flex;align-items:center;gap:5px;margin-bottom:4px}
  .txt-lbl-dot{width:6px;height:6px;border-radius:50%;flex-shrink:0}
  .txt-box{border-radius:6px;padding:7px 9px;font-size:10px;line-height:1.5;color:#334155;border:1px solid #e2e8f0;background:#f8fafc;min-height:36px}
  .txt-box.obs{background:#fefce8;border-color:#fde047}
  .txt-box.adm{background:#eff6ff;border-color:#bfdbfe}
  /* ── FOTOS ── */
  .fotos-wrap{display:grid;grid-template-columns:${fotoDefeitoLtd.length>0 && fotoConclusaoLtd.length>0 ? "1fr 1fr" : "1fr"};gap:8px;margin-bottom:7px}
  .foto-section{}
  .foto-label{font-size:8.5px;font-weight:700;text-transform:uppercase;letter-spacing:0.4px;margin-bottom:4px}
  .fotos-grid{display:grid;grid-template-columns:repeat(${Math.min(Math.max(fotoDefeitoLtd.length,fotoConclusaoLtd.length,1),3)},1fr);gap:5px}
  .foto-item img{width:100%;object-fit:cover;border-radius:6px;border:1px solid #e2e8f0;display:block}
  /* ── ASSINATURAS ── */
  .sig{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:auto;padding-top:6px}
  .sig-box{text-align:center}
  .sig-line{border-top:1px solid #94a3b8;padding-top:5px;margin-top:28px}
  .sig-name{font-size:9.5px;font-weight:600;color:#1e293b}
  .sig-role{font-size:8.5px;color:#64748b}
  /* ── FOOTER ── */
  .ftr{display:flex;justify-content:space-between;padding-top:5px;border-top:1px solid #e2e8f0;margin-top:5px}
  .ftr-t{font-size:8px;color:#94a3b8}
  @media print{
    html,body{width:210mm;height:297mm}
    .page{page-break-after:avoid;page-break-inside:avoid}
  }
</style>
</head>
<body>
<div class="page">

  <!-- HEADER -->
  <div class="hdr">
    <div class="logo">
      <div class="logo-box"><svg viewBox="0 0 24 24"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
      <div><div class="logo-name">Netvius</div><div class="logo-sub">Sistema de Gestão de Manutenção</div></div>
    </div>
    <div class="doc-right">
      <div class="doc-num">LAUDO #${String(m.id).padStart(4,"0")}</div>
      <div class="doc-date">Emitido em ${fmtDate(new Date())}</div>
    </div>
  </div>

  <!-- STATUS -->
  <div class="status-row">
    <span class="sbadge" style="background:${statusColor[m.status]??"#64748b"}22;color:${statusColor[m.status]??"#64748b"}">
      <span class="sdot" style="background:${statusColor[m.status]??"#64748b"}"></span>
      ${statusLabel[m.status]??m.status}
    </span>
  </div>

  <!-- INFO GRID -->
  <div class="info-row">
    <div class="ic">
      <div class="il">Escola</div>
      <div class="iv">${m.escola?.nome??"—"}</div>
      <div class="is">INEP: ${m.escola?.inep??"—"}</div>
    </div>
    <div class="ic">
      <div class="il">Município</div>
      <div class="iv">${m.escola?.municipio??"—"}</div>
      ${m.escola?.endereco?`<div class="is">${m.escola.endereco}</div>`:""}
    </div>
    <div class="ic">
      <div class="il">Técnico</div>
      <div class="iv">${m.tecnico?.nome??"Não atribuído"}</div>
      ${m.tecnico?.email?`<div class="is">${m.tecnico.email}</div>`:""}
    </div>
    <div class="ic">
      <div class="il">Datas</div>
      <div class="iv" style="font-size:9.5px">Abertura: ${fmtDate(m.createdAt)}</div>
      ${m.dataConclusao?`<div class="is">Conclusão: ${fmtDate(m.dataConclusao)}</div>`:""}
      ${(m.escola as any)?.velocidadeOfertada?`<div class="is">Vel.: ${(m.escola as any).velocidadeOfertada}</div>`:""}
    </div>
  </div>

  <hr class="div" />

  <!-- TEXTOS -->
  <div class="txt-row">
    <div class="txt-block">
      <div class="txt-lbl" style="color:#ef4444"><span class="txt-lbl-dot" style="background:#ef4444"></span>Descrição do Problema</div>
      <div class="txt-box">${m.descricaoProblema}</div>
    </div>
    ${m.observacaoConclusao?`
    <div class="txt-block">
      <div class="txt-lbl" style="color:#10b981"><span class="txt-lbl-dot" style="background:#10b981"></span>Observação do Técnico</div>
      <div class="txt-box obs">${m.observacaoConclusao}</div>
    </div>`:""}
    ${!m.observacaoConclusao && input.observacaoAdmin?`
    <div class="txt-block">
      <div class="txt-lbl" style="color:#3b82f6"><span class="txt-lbl-dot" style="background:#3b82f6"></span>Observação do Responsável</div>
      <div class="txt-box adm">${input.observacaoAdmin}</div>
    </div>`:""}
  </div>
  ${m.observacaoConclusao && input.observacaoAdmin?`
  <div class="txt-row" style="grid-template-columns:1fr;margin-bottom:7px">
    <div class="txt-block">
      <div class="txt-lbl" style="color:#3b82f6"><span class="txt-lbl-dot" style="background:#3b82f6"></span>Observação do Responsável</div>
      <div class="txt-box adm">${input.observacaoAdmin}</div>
    </div>
  </div>`:""}

  <!-- FOTOS -->
  ${(fotoDefeitoLtd.length>0||fotoConclusaoLtd.length>0)?`
  <div class="fotos-wrap">
    ${fotoHtml(fotoDefeitoLtd,"Fotos do Defeito","#ef4444")}
    ${fotoHtml(fotoConclusaoLtd,"Fotos Após Reparo","#10b981")}
  </div>`:""}

  <!-- ASSINATURAS -->
  <div class="sig">
    <div class="sig-box"><div class="sig-line"><div class="sig-name">${m.tecnico?.nome??"Técnico"}</div><div class="sig-role">Técnico Responsável</div></div></div>
    <div class="sig-box"><div class="sig-line"><div class="sig-name">Responsável pela Unidade</div><div class="sig-role">Escola / Cliente</div></div></div>
  </div>

  <!-- FOOTER -->
  <div class="ftr">
    <span class="ftr-t">Netvius — Sistema de Gestão de Manutenção — Documento gerado automaticamente</span>
    <span class="ftr-t">Laudo #${String(m.id).padStart(4,"0")} — ${fmtDate(new Date())}</span>
  </div>

</div>
</body>
</html>`;

      return { html };
    }),

  // ── ADMIN: Criar manutenção com escola não cadastrada ──────────────────────
  criarComEscolaNaoCadastrada: tenantAdminProcedure
    .input(z.object({
      escolaNome: z.string().min(3, "Nome da escola obrigatório"),
      escolaInep: z.string().min(8, "INEP obrigatório"),
      escolaMunicipio: z.string().min(3, "Município obrigatório"),
      escolaEndereco: z.string().optional(),
      escolaLatitude: z.number().optional(),
      escolaLongitude: z.number().optional(),
      escolaWhatsapp: z.string().optional(),
      tecnicoId: z.number().optional(),
      descricaoProblema: z.string().min(5, "Descrição obrigatória"),
      quilometragem: z.number().min(0, "Quilometragem deve ser >= 0").optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = (ctx as any).tenantId;
      if (input.tecnicoId) {
        const [tecnicoDoTenant] = await db
          .select({ id: tecnicos.id })
          .from(tecnicos)
          .where(and(eq(tecnicos.id, input.tecnicoId), eq(tecnicos.tenantId, tenantId)))
          .limit(1);
        if (!tecnicoDoTenant) throw new TRPCError({ code: "FORBIDDEN", message: "Técnico não pertence a este tenant" });
      }
      const res = await db.insert(manutencoes).values({
        tenantId,
        escolaId: null,
        escolaNaoCadastradaNome: input.escolaNome,
        escolaNaoCadastradaInep: input.escolaInep,
        escolaNaoCadastradaMunicipio: input.escolaMunicipio,
        escolaNaoCadastradaEndereco: input.escolaEndereco ?? null,
        escolaNaoCadastradaLatitude: input.escolaLatitude ? String(input.escolaLatitude) : null,
        escolaNaoCadastradaLongitude: input.escolaLongitude ? String(input.escolaLongitude) : null,
        escolaNaoCadastradaWhatsapp: input.escolaWhatsapp ?? null,
        tecnicoId: input.tecnicoId ?? null,
        descricaoProblema: input.descricaoProblema,
        quilometragem: input.quilometragem ? String(input.quilometragem) : "0",
        status: "pendente",
        dataAtribuicao: input.tecnicoId ? new Date() : undefined,
      });
      return { success: true, id: Number(res[0].insertId) };
    }),
});
