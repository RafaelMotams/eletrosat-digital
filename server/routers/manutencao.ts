import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { eq, and, desc, or, like } from "drizzle-orm";
import { router, tenantAdminProcedure, publicProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { manutencoes, manutencaoFotos, escolas, tecnicos } from "../../drizzle/schema";
import { storagePut } from "../storage";
import { invokeLLM } from "../_core/llm";

// ─── helpers ─────────────────────────────────────────────────────────────────

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

  // ── TÉCNICO: Assistente IA ─────────────────────────────────────────────────
  assistenteIA: publicProcedure
    .input(z.object({
      manutencaoId: z.number(),
      pergunta: z.string().min(3),
      contexto: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const m = await getManutencaoComDados(input.manutencaoId);
      const contextoEscola = m ? `Escola: ${m.escola?.nome ?? 'N/A'} | INEP: ${m.escola?.inep ?? 'N/A'} | Município: ${m.escola?.municipio ?? 'N/A'} | Velocidade ofertada: ${m.escola?.velocidadeOfertada ?? 'N/A'} | Problema: ${m.descricaoProblema}` : '';
      const systemPrompt = `Você é um assistente técnico especializado em infraestrutura de redes, telecom, instalação de equipamentos Wi-Fi, switches, controladoras, nobreaks e cabeamento estruturado. Responda de forma direta, prática e objetiva para técnicos em campo. Contexto da manutenção: ${contextoEscola}. ${input.contexto ?? ''}`;
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

      const fotoHtml = (fotos: typeof m.fotos, titulo: string, cor: string) => {
        if (fotos.length === 0) return "";
        return `
          <div class="section">
            <div class="section-title" style="color:${cor}">
              <span class="dot" style="background:${cor}"></span>
              ${titulo}
            </div>
            <div class="fotos-grid">
              ${fotos.map(f => `<div class="foto-item"><img src="${f.url}" alt="${f.tipo}" /></div>`).join("")}
            </div>
          </div>`;
      };

      const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Laudo de Manutenção #${m.id}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Inter', sans-serif; background: #fff; color: #1e293b; font-size: 13px; }
  .page { max-width: 800px; margin: 0 auto; padding: 40px 48px; }
  /* Header */
  .header { display: flex; align-items: center; justify-content: space-between; padding-bottom: 24px; border-bottom: 3px solid #0ea5e9; margin-bottom: 28px; }
  .logo-area { display: flex; align-items: center; gap: 12px; }
  .logo-icon { width: 44px; height: 44px; background: linear-gradient(135deg, #0ea5e9, #6366f1); border-radius: 12px; display: flex; align-items: center; justify-content: center; }
  .logo-icon svg { width: 26px; height: 26px; fill: white; }
  .logo-text { font-size: 22px; font-weight: 800; color: #0f172a; letter-spacing: -0.5px; }
  .logo-sub { font-size: 11px; color: #64748b; font-weight: 400; }
  .doc-info { text-align: right; }
  .doc-num { font-size: 18px; font-weight: 700; color: #0ea5e9; }
  .doc-date { font-size: 11px; color: #64748b; margin-top: 2px; }
  /* Status badge */
  .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 5px 14px; border-radius: 20px; font-size: 12px; font-weight: 600; margin-bottom: 20px; }
  .status-dot { width: 7px; height: 7px; border-radius: 50%; }
  /* Info grid */
  .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px; }
  .info-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 14px 16px; }
  .info-card.full { grid-column: 1 / -1; }
  .info-label { font-size: 10px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; color: #94a3b8; margin-bottom: 5px; }
  .info-value { font-size: 14px; font-weight: 600; color: #1e293b; }
  .info-sub { font-size: 11px; color: #64748b; margin-top: 2px; }
  /* Sections */
  .section { margin-bottom: 20px; }
  .section-title { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; display: flex; align-items: center; gap: 8px; margin-bottom: 10px; }
  .dot { width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0; }
  .text-box { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; font-size: 13px; line-height: 1.6; color: #334155; }
  .text-box.obs { background: #fefce8; border-color: #fde047; }
  .text-box.admin-obs { background: #eff6ff; border-color: #bfdbfe; }
  /* Fotos */
  .fotos-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; }
  .foto-item img { width: 100%; height: 160px; object-fit: cover; border-radius: 8px; border: 1px solid #e2e8f0; }
  /* Divider */
  .divider { border: none; border-top: 1px solid #e2e8f0; margin: 20px 0; }
  /* Footer */
  .footer { margin-top: 32px; padding-top: 16px; border-top: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; }
  .footer-left { font-size: 10px; color: #94a3b8; }
  .footer-right { font-size: 10px; color: #94a3b8; text-align: right; }
  .signature-area { margin-top: 40px; display: grid; grid-template-columns: 1fr 1fr; gap: 32px; }
  .signature-box { text-align: center; }
  .signature-line { border-top: 1px solid #94a3b8; padding-top: 8px; margin-top: 40px; }
  .signature-name { font-size: 12px; font-weight: 600; color: #1e293b; }
  .signature-role { font-size: 10px; color: #64748b; }
  @media print {
    body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
    .page { padding: 20px 24px; }
    .fotos-grid { grid-template-columns: repeat(3, 1fr); }
  }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <div class="header">
    <div class="logo-area">
      <div class="logo-icon">
        <svg viewBox="0 0 24 24"><path d="M1 6l11 6 11-6M1 12l11 6 11-6"/></svg>
      </div>
      <div>
        <div class="logo-text">Netvius</div>
        <div class="logo-sub">Sistema de Gestão de Manutenção</div>
      </div>
    </div>
    <div class="doc-info">
      <div class="doc-num">LAUDO #${String(m.id).padStart(4, "0")}</div>
      <div class="doc-date">Emitido em ${fmtDate(new Date())}</div>
    </div>
  </div>

  <!-- Status -->
  <div class="status-badge" style="background:${statusColor[m.status] ?? "#64748b"}22; color:${statusColor[m.status] ?? "#64748b"}">
    <span class="status-dot" style="background:${statusColor[m.status] ?? "#64748b"}"></span>
    ${statusLabel[m.status] ?? m.status}
  </div>

  <!-- Info Grid -->
  <div class="info-grid">
    <div class="info-card">
      <div class="info-label">Escola</div>
      <div class="info-value">${m.escola?.nome ?? "—"}</div>
      <div class="info-sub">INEP: ${m.escola?.inep ?? "—"}</div>
    </div>
    <div class="info-card">
      <div class="info-label">Município</div>
      <div class="info-value">${m.escola?.municipio ?? "—"}</div>
      ${m.escola?.endereco ? `<div class="info-sub">${m.escola.endereco}</div>` : ""}
    </div>
    <div class="info-card">
      <div class="info-label">Técnico Responsável</div>
      <div class="info-value">${m.tecnico?.nome ?? "Não atribuído"}</div>
      ${m.tecnico?.email ? `<div class="info-sub">${m.tecnico.email}</div>` : ""}
    </div>
    <div class="info-card">
      <div class="info-label">Datas</div>
      <div class="info-value" style="font-size:12px">Abertura: ${fmtDate(m.createdAt)}</div>
      ${m.dataConclusao ? `<div class="info-sub">Conclusão: ${fmtDate(m.dataConclusao)}</div>` : ""}
    </div>
    ${(m.escola as any)?.velocidadeOfertada ? `
    <div class="info-card">
      <div class="info-label">Velocidade Ofertada</div>
      <div class="info-value">${(m.escola as any).velocidadeOfertada}</div>
    </div>` : ""}
  </div>

  <hr class="divider" />

  <!-- Descrição do Problema -->
  <div class="section">
    <div class="section-title" style="color:#ef4444"><span class="dot" style="background:#ef4444"></span>Descrição do Problema</div>
    <div class="text-box">${m.descricaoProblema}</div>
  </div>

  ${m.observacaoConclusao ? `
  <div class="section">
    <div class="section-title" style="color:#10b981"><span class="dot" style="background:#10b981"></span>Observação do Técnico (Conclusão)</div>
    <div class="text-box obs">${m.observacaoConclusao}</div>
  </div>` : ""}

  ${input.observacaoAdmin ? `
  <div class="section">
    <div class="section-title" style="color:#3b82f6"><span class="dot" style="background:#3b82f6"></span>Observação do Responsável</div>
    <div class="text-box admin-obs">${input.observacaoAdmin}</div>
  </div>` : ""}

  ${fotoHtml(fotoDefeito, "Fotos do Defeito", "#ef4444")}
  ${fotoHtml(fotoConclusao, "Fotos Após Reparo", "#10b981")}

  <!-- Assinaturas -->
  <div class="signature-area">
    <div class="signature-box">
      <div class="signature-line">
        <div class="signature-name">${m.tecnico?.nome ?? "Técnico"}</div>
        <div class="signature-role">Técnico Responsável</div>
      </div>
    </div>
    <div class="signature-box">
      <div class="signature-line">
        <div class="signature-name">Responsável pela Unidade</div>
        <div class="signature-role">Escola / Cliente</div>
      </div>
    </div>
  </div>

  <!-- Footer -->
  <div class="footer">
    <div class="footer-left">Netvius — Sistema de Gestão de Manutenção<br>Documento gerado automaticamente</div>
    <div class="footer-right">Laudo #${String(m.id).padStart(4, "0")}<br>${fmtDate(new Date())}</div>
  </div>
</div>
</body>
</html>`;

      return { html };
    }),
});
