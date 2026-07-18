/**
 * Handler do job agendado: Relatório Diário de Progresso
 * Rota: POST /api/scheduled/relatorio-diario
 * Cron: 0 0 11 * * * (08:00 BRT = 11:00 UTC)
 */
import type { Request, Response } from "express";
import { ENV } from "../_core/env";
import { getDashboardStats, getDb } from "../db";
import { getTenantById } from "../db-tenant";
import { sendEmail, gerarHtmlRelatoriodiario } from "../_core/email";
import { ordensServico } from "../../drizzle/schema";
import { and, eq, gte, lt, sql } from "drizzle-orm";

const TENANT_ID = 1;
const DESTINATARIOS = [
  "isabele.vieira@bitinternet.com.br",
  "nielsen.bezerra@bitinternet.com.br",
];

export async function relatoriodiarioHandler(req: Request, res: Response) {
  try {
    // Autenticação: Bearer token da Forge API (enviado pelo cron do Manus)
    const authHeader = req.headers.authorization ?? "";
    const token = authHeader.replace("Bearer ", "").trim();
    if (ENV.isProduction && (!token || token !== ENV.forgeApiKey)) {
      return res.status(403).json({ error: "unauthorized" });
    }

    const tenant = await getTenantById(TENANT_ID);
    const stats = await getDashboardStats(TENANT_ID);

    if (!stats) {
      return res.status(500).json({ error: "Dados indisponíveis" });
    }

    const db = await getDb();
    let concluidasOntem = 0;
    if (db) {
      const agora = new Date();
      const inicio = new Date(agora);
      inicio.setDate(agora.getDate() - 1);
      inicio.setHours(0, 0, 0, 0);
      const fim = new Date(agora);
      fim.setDate(agora.getDate() - 1);
      fim.setHours(23, 59, 59, 999);

      const [result] = await db
        .select({ count: sql<number>`count(*)` })
        .from(ordensServico)
        .where(
          and(
            eq(ordensServico.tenantId, TENANT_ID),
            eq(ordensServico.status, "concluida"),
            gte(ordensServico.dataConclusao, inicio),
            lt(ordensServico.dataConclusao, fim)
          )
        );
      concluidasOntem = Number(result?.count ?? 0);
    }

    const percentual = stats.totalEscolas > 0
      ? (stats.concluidas / stats.totalEscolas) * 100
      : 0;

    const dataFormatada = new Date().toLocaleDateString("pt-BR", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: "America/Bahia",
    });

    const html = gerarHtmlRelatoriodiario({
      tenantNome: tenant?.nome ?? "Netvius",
      totalEscolas: stats.totalEscolas,
      concluidas: stats.concluidas,
      pendentes: stats.pendentes,
      emAndamento: stats.emAndamento,
      totalApsInstalados: stats.totalApsInstalados,
      totalApsPlanejados: stats.totalApsPlanejados,
      concluidasOntem,
      percentual,
      data: dataFormatada,
    });

    const enviado = await sendEmail({
      to: DESTINATARIOS,
      subject: `📊 Relatório Diário Netvius — ${percentual.toFixed(1)}% concluído (${new Date().toLocaleDateString("pt-BR", { timeZone: "America/Bahia" })})`,
      html,
    });

    if (!enviado) {
      return res.status(500).json({ error: "Falha ao enviar email" });
    }

    console.log(`[RelatorioDiario] Email enviado para ${DESTINATARIOS.join(", ")}`);
    return res.status(200).json({
      ok: true,
      enviado: true,
      destinatarios: DESTINATARIOS,
      stats: { ...stats, concluidasOntem, percentual },
    });
  } catch (err) {
    console.error("[RelatorioDiario] Erro:", err);
    return res.status(500).json({
      error: String(err),
      timestamp: new Date().toISOString(),
    });
  }
}
