import ExcelJS from "exceljs";
import { Request, Response } from "express";
import { getOsDetalhadas } from "./db";
import { verifyTenantToken, extractBearerToken } from "./_core/tenantAuth";

// Cores da paleta
const COR_HEADER_BG = "FF1E3A5F";       // azul escuro
const COR_HEADER_FG = "FFFFFFFF";       // branco
const COR_SUBTOTAL_BG = "FF2D6A4F";     // verde escuro
const COR_SUBTOTAL_FG = "FFFFFFFF";     // branco
const COR_TOTAL_BG = "FF1B4332";        // verde muito escuro
const COR_TOTAL_FG = "FFFFFFFF";        // branco
const COR_ROW_EVEN = "FFF0F4F8";        // cinza muito claro
const COR_ROW_ODD = "FFFFFFFF";         // branco
const COR_BORDER = "FFBFD7EA";          // azul claro

function bordaFina(): Partial<ExcelJS.Borders> {
  const side: Partial<ExcelJS.Border> = { style: "thin", color: { argb: COR_BORDER } };
  return { top: side, left: side, bottom: side, right: side };
}

export async function exportarRelatorioExcel(req: Request, res: Response) {
  try {
    // Autenticação via Bearer token (tenantId)
    const token = extractBearerToken(req.headers.authorization);
    const session = token ? await verifyTenantToken(token) : null;
    const tenantId = session?.tenantId ?? undefined;

    // Parâmetros da query
    const valorPorAp = parseFloat(req.query.valorPorAp as string) || 0;
    const tecnicoId = req.query.tecnicoId ? parseInt(req.query.tecnicoId as string) : undefined;
    const dataInicio = req.query.dataInicio ? new Date(req.query.dataInicio as string) : null;
    const dataFim = req.query.dataFim ? new Date(req.query.dataFim as string) : null;

    // Buscar dados
    const rows = await getOsDetalhadas({ tecnicoId, dataInicio, dataFim, tenantId });

    const workbook = new ExcelJS.Workbook();
    workbook.creator = "Netvionis";
    workbook.created = new Date();

    // ─── Aba 1: Todas as OS ──────────────────────────────────────────────────
    const ws = workbook.addWorksheet("OS Concluídas", {
      pageSetup: { orientation: "landscape", fitToPage: true, fitToWidth: 1 },
    });

    // Larguras das colunas
    ws.columns = [
      { key: "seq",          width: 6  },
      { key: "escola",       width: 42 },
      { key: "inep",         width: 14 },
      { key: "municipio",    width: 22 },
      { key: "tecnico",      width: 24 },
      { key: "data",         width: 14 },
      { key: "apInstalado",  width: 12 },
      { key: "valorPorAp",   width: 16 },
      { key: "totalPagar",   width: 18 },
      { key: "observacao",   width: 36 },
    ];

    // Título principal
    ws.mergeCells("A1:J1");
    const titleCell = ws.getCell("A1");
    titleCell.value = "RELATÓRIO DE ORDENS DE SERVIÇO CONCLUÍDAS";
    titleCell.font = { name: "Calibri", bold: true, size: 16, color: { argb: COR_HEADER_FG } };
    titleCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_HEADER_BG } };
    titleCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(1).height = 36;

    // Subtítulo com data de geração e valor por AP
    ws.mergeCells("A2:J2");
    const subCell = ws.getCell("A2");
    const dataGeracao = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
    subCell.value = `Gerado em: ${dataGeracao}   |   Valor por AP: R$ ${valorPorAp.toFixed(2).replace(".", ",")}   |   Total de OS: ${rows.length}`;
    subCell.font = { name: "Calibri", italic: true, size: 10, color: { argb: "FF6B7280" } };
    subCell.alignment = { horizontal: "center", vertical: "middle" };
    ws.getRow(2).height = 20;

    // Linha vazia
    ws.addRow([]);

    // Cabeçalho das colunas
    const headerRow = ws.addRow([
      "#", "Nome da Escola", "INEP", "Município", "Técnico",
      "Data Conclusão", "APs Instalados", "Valor por AP (R$)", "Total a Pagar (R$)", "Observação"
    ]);
    headerRow.height = 28;
    headerRow.eachCell((cell) => {
      cell.font = { name: "Calibri", bold: true, size: 11, color: { argb: COR_HEADER_FG } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_HEADER_BG } };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = bordaFina();
    });

    // Linhas de dados
    rows.forEach((row, idx) => {
      const dataStr = row.dataConclusao
        ? new Date(row.dataConclusao).toLocaleDateString("pt-BR")
        : "—";
      const total = valorPorAp * (row.qtdApInstalado ?? 0);

      const dataRow = ws.addRow([
        idx + 1,
        row.escolaNome,
        row.inep,
        row.municipio,
        row.tecnicoNome,
        dataStr,
        row.qtdApInstalado ?? 0,
        valorPorAp,
        total,
        row.observacao || "",
      ]);

      dataRow.height = 22;
      const bgColor = idx % 2 === 0 ? COR_ROW_EVEN : COR_ROW_ODD;

      dataRow.eachCell((cell, colNum) => {
        cell.font = { name: "Calibri", size: 10 };
        cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bgColor } };
        cell.border = bordaFina();
        cell.alignment = { vertical: "middle", wrapText: colNum === 2 || colNum === 10 };

        // Alinhamentos específicos
        if (colNum === 1) cell.alignment = { ...cell.alignment, horizontal: "center" };
        if (colNum === 3) cell.alignment = { ...cell.alignment, horizontal: "center" }; // INEP
        if (colNum === 6) cell.alignment = { ...cell.alignment, horizontal: "center" }; // data
        if (colNum === 7) cell.alignment = { ...cell.alignment, horizontal: "center" }; // APs
        if (colNum === 8 || colNum === 9) {
          cell.alignment = { ...cell.alignment, horizontal: "right" };
          cell.numFmt = '"R$" #,##0.00';
        }
      });
    });

    // Linha de total geral
    const totalAps = rows.reduce((s, r) => s + (r.qtdApInstalado ?? 0), 0);
    const totalGeral = valorPorAp * totalAps;

    ws.addRow([]); // espaço

    const totalRow = ws.addRow([
      "", "TOTAL GERAL", "", "", "",
      "", totalAps, valorPorAp, totalGeral, ""
    ]);
    totalRow.height = 28;
    totalRow.eachCell((cell, colNum) => {
      cell.font = { name: "Calibri", bold: true, size: 11, color: { argb: COR_TOTAL_FG } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_TOTAL_BG } };
      cell.border = bordaFina();
      cell.alignment = { vertical: "middle" };
      if (colNum === 2) cell.alignment = { ...cell.alignment, horizontal: "left" };
      if (colNum === 7) cell.alignment = { ...cell.alignment, horizontal: "center" };
      if (colNum === 8 || colNum === 9) {
        cell.alignment = { ...cell.alignment, horizontal: "right" };
        cell.numFmt = '"R$" #,##0.00';
      }
    });

    // ─── Aba 2: Resumo por Técnico ───────────────────────────────────────────
    const ws2 = workbook.addWorksheet("Resumo por Técnico");
    ws2.columns = [
      { key: "tecnico",     width: 30 },
      { key: "qtdOs",       width: 14 },
      { key: "totalAps",    width: 16 },
      { key: "valorPorAp",  width: 18 },
      { key: "totalPagar",  width: 20 },
    ];

    // Título
    ws2.mergeCells("A1:E1");
    const t2 = ws2.getCell("A1");
    t2.value = "RESUMO DE PAGAMENTO POR TÉCNICO";
    t2.font = { name: "Calibri", bold: true, size: 14, color: { argb: COR_HEADER_FG } };
    t2.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_HEADER_BG } };
    t2.alignment = { horizontal: "center", vertical: "middle" };
    ws2.getRow(1).height = 32;

    ws2.addRow([]);

    const h2 = ws2.addRow(["Técnico", "Qtd. OS", "Total APs", "Valor por AP (R$)", "Total a Pagar (R$)"]);
    h2.height = 26;
    h2.eachCell((cell) => {
      cell.font = { name: "Calibri", bold: true, size: 11, color: { argb: COR_HEADER_FG } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_HEADER_BG } };
      cell.alignment = { horizontal: "center", vertical: "middle" };
      cell.border = bordaFina();
    });

    // Agrupar por técnico
    const porTecnico: Record<string, { qtdOs: number; totalAps: number }> = {};
    for (const r of rows) {
      const nome = r.tecnicoNome;
      if (!porTecnico[nome]) porTecnico[nome] = { qtdOs: 0, totalAps: 0 };
      porTecnico[nome].qtdOs++;
      porTecnico[nome].totalAps += r.qtdApInstalado ?? 0;
    }

    Object.entries(porTecnico)
      .sort((a, b) => b[1].totalAps - a[1].totalAps)
      .forEach(([nome, dados], idx) => {
        const total = valorPorAp * dados.totalAps;
        const dr = ws2.addRow([nome, dados.qtdOs, dados.totalAps, valorPorAp, total]);
        dr.height = 22;
        const bg = idx % 2 === 0 ? COR_ROW_EVEN : COR_ROW_ODD;
        dr.eachCell((cell, colNum) => {
          cell.font = { name: "Calibri", size: 11 };
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: bg } };
          cell.border = bordaFina();
          cell.alignment = { vertical: "middle" };
          if (colNum >= 2) cell.alignment = { ...cell.alignment, horizontal: "center" };
          if (colNum === 4 || colNum === 5) {
            cell.alignment = { ...cell.alignment, horizontal: "right" };
            cell.numFmt = '"R$" #,##0.00';
          }
        });
      });

    // Total geral da aba 2
    ws2.addRow([]);
    const t2total = ws2.addRow([
      "TOTAL GERAL",
      rows.length,
      totalAps,
      valorPorAp,
      totalGeral,
    ]);
    t2total.height = 28;
    t2total.eachCell((cell, colNum) => {
      cell.font = { name: "Calibri", bold: true, size: 12, color: { argb: COR_TOTAL_FG } };
      cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: COR_TOTAL_BG } };
      cell.border = bordaFina();
      cell.alignment = { vertical: "middle" };
      if (colNum >= 2) cell.alignment = { ...cell.alignment, horizontal: "center" };
      if (colNum === 4 || colNum === 5) {
        cell.alignment = { ...cell.alignment, horizontal: "right" };
        cell.numFmt = '"R$" #,##0.00';
      }
    });

    // Enviar arquivo
    const nomeArquivo = `relatorio-os-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("[exportarRelatorioExcel]", err);
    res.status(500).json({ error: "Erro ao gerar planilha" });
  }
}
