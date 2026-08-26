import ExcelJS from "exceljs";
import { Request, Response } from "express";
import { getOsDetalhadas, getOsNaoInstaladas, getValoresApAllTecnicos } from "./db";
import { verifyTenantToken } from "./_core/tenantAuth";
import { extractTenantSessionCookie } from "./_core/context";

// ─── Paleta de cores ──────────────────────────────────────────────────────────
const C = {
  azulEscuro:   "FF0D2137",
  azulMedio:    "FF1A3A5C",
  azulClaro:    "FF2563A8",
  azulSuave:    "FFD6E4F7",
  verdeEscuro:  "FF0A4D2E",
  verdeMedio:   "FF166534",
  verdeClaro:   "FFD1FAE5",
  cinzaEscuro:  "FF374151",
  cinzaMedio:   "FF6B7280",
  cinzaClaro:   "FFF3F4F6",
  cinzaBorda:   "FFD1D5DB",
  branco:       "FFFFFFFF",
  amarelo:      "FFFEF3C7",
  amareloEscuro:"FFD97706",
};

function borda(cor = C.cinzaBorda, estilo: ExcelJS.BorderStyle = "thin"): Partial<ExcelJS.Borders> {
  const s: Partial<ExcelJS.Border> = { style: estilo, color: { argb: cor } };
  return { top: s, left: s, bottom: s, right: s };
}

function bordaMedia(): Partial<ExcelJS.Borders> {
  return borda(C.azulClaro, "medium");
}

function aplicarEstiloCelula(
  cell: ExcelJS.Cell,
  opts: {
    bg?: string;
    fg?: string;
    bold?: boolean;
    size?: number;
    hAlign?: ExcelJS.Alignment["horizontal"];
    vAlign?: ExcelJS.Alignment["vertical"];
    wrap?: boolean;
    numFmt?: string;
    border?: Partial<ExcelJS.Borders>;
    italic?: boolean;
  }
) {
  if (opts.bg) cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: opts.bg } };
  cell.font = {
    name: "Calibri",
    bold: opts.bold ?? false,
    italic: opts.italic ?? false,
    size: opts.size ?? 10,
    color: { argb: opts.fg ?? C.cinzaEscuro },
  };
  cell.alignment = {
    horizontal: opts.hAlign ?? "left",
    vertical: opts.vAlign ?? "middle",
    wrapText: opts.wrap ?? false,
  };
  if (opts.numFmt) cell.numFmt = opts.numFmt;
  if (opts.border !== undefined) cell.border = opts.border;
}

export async function exportarRelatorioExcel(req: Request, res: Response) {
  try {
    // Auth
    const token = extractTenantSessionCookie(req.headers.cookie);
    const session = token ? await verifyTenantToken(token) : null;
    if (!session || session.isSuperAdmin || session.tenantId <= 0) {
      res.status(401).json({ error: "Sessão de tenant válida é obrigatória para exportar relatórios" });
      return;
    }
    if (session.role === "viewer") {
      res.status(403).json({ error: "Perfil visualizador não pode exportar valores financeiros" });
      return;
    }
    const tenantId = session.tenantId;

    const tecnicoIdParam = req.query.tecnicoId ? parseInt(req.query.tecnicoId as string) : undefined;
    const dataInicioParam = req.query.dataInicio ? new Date(req.query.dataInicio as string) : null;
    const dataFimParam = req.query.dataFim ? new Date(req.query.dataFim as string) : null;

    // Dados
    const concluidas = await getOsDetalhadas({ tenantId, tecnicoId: tecnicoIdParam, dataInicio: dataInicioParam, dataFim: dataFimParam });
    const naoInstaladas = await getOsNaoInstaladas({ tenantId, tecnicoId: tecnicoIdParam, dataInicio: dataInicioParam, dataFim: dataFimParam });

    // Buscar valores por AP por técnico (tabela de preços cadastrada)
    const valoresApMap = await getValoresApAllTecnicos(tenantId);

    // Valores financeiros pertencem à tabela protegida do tenant; a requisição
    // nunca pode informar um valor de fallback.
    const getValorOs = (os: typeof concluidas[0]): number => {
      const tecValores = valoresApMap[os.tecnicoId ?? 0] ?? {};
      const qtd = os.qtdApInstalado ?? 0;
      return tecValores[qtd] ?? 0;
    };

    // Agrupar por técnico (ordenado por nome)
    const porTecnico: Record<string, typeof concluidas> = {};
    for (const r of concluidas) {
      if (!porTecnico[r.tecnicoNome]) porTecnico[r.tecnicoNome] = [];
      porTecnico[r.tecnicoNome].push(r);
    }
    const tecnicosOrdenados = Object.keys(porTecnico).sort();

    const wb = new ExcelJS.Workbook();
    wb.creator = "Netvius";
    wb.created = new Date();

    const wsMenu = wb.addWorksheet("Menu", { properties: { tabColor: { argb: C.verdeMedio } } });
    wsMenu.columns = [{ width: 5 }, { width: 42 }, { width: 56 }];
    wsMenu.mergeCells("B2:C2");
    const menuTitle = wsMenu.getCell("B2");
    menuTitle.value = "NETVIUS — RELATÓRIO EXECUTIVO";
    aplicarEstiloCelula(menuTitle, { bg: C.azulEscuro, fg: C.branco, bold: true, size: 18, hAlign: "center", border: bordaMedia() });
    wsMenu.getRow(2).height = 34;
    wsMenu.mergeCells("B3:C3");
    const menuSubtitle = wsMenu.getCell("B3");
    menuSubtitle.value = `Gerado em ${new Date().toLocaleString("pt-BR")} · Dados filtrados pelo tenant autenticado`;
    aplicarEstiloCelula(menuSubtitle, { bg: C.azulSuave, fg: C.azulMedio, italic: true, size: 10, hAlign: "center", border: borda(C.azulSuave) });
    wsMenu.getRow(3).height = 22;
    const menuItems = [
      ["Relatório Detalhado", "Ordens concluídas, APs, valores protegidos e evidências no sistema."],
      ["Pagamento por Técnico", "Consolidação financeira por técnico, calculada no servidor."],
      ["Não Instaladas", "Exceções operacionais e motivos registrados."],
    ];
    menuItems.forEach(([aba, descricao], index) => {
      const row = 6 + index * 2;
      const menuLink = wsMenu.getCell(row, 2);
      menuLink.value = { text: aba, hyperlink: `#'${aba}'!A1` };
      menuLink.font = { name: "Calibri", bold: true, size: 12, color: { argb: C.azulClaro }, underline: true };
      menuLink.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.cinzaClaro } };
      menuLink.border = borda();
      const menuDescription = wsMenu.getCell(row, 3);
      menuDescription.value = descricao;
      aplicarEstiloCelula(menuDescription, { bg: C.cinzaClaro, fg: C.cinzaEscuro, size: 10, wrap: true, border: borda() });
      wsMenu.getRow(row).height = 30;
    });
    wsMenu.getCell("B14").value = "Use os links acima para navegar entre as abas. Evidências fotográficas permanecem disponíveis somente dentro do sistema autenticado.";
    aplicarEstiloCelula(wsMenu.getCell("B14"), { fg: C.cinzaMedio, size: 9, italic: true, wrap: true });
    wsMenu.mergeCells("B14:C14");
    wsMenu.getRow(14).height = 30;

    // ═══════════════════════════════════════════════════════════════════════════
    // ABA 1 — RELATÓRIO DETALHADO
    // ═══════════════════════════════════════════════════════════════════════════
    const ws = wb.addWorksheet("Relatório Detalhado", {
      pageSetup: {
        orientation: "landscape",
        fitToPage: true,
        fitToWidth: 1,
        margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
      },
      properties: { tabColor: { argb: C.azulClaro } },
    });

    // Larguras
    ws.columns = [
      { key: "seq",        width: 5  },
      { key: "escola",     width: 38 },
      { key: "inep",       width: 13 },
      { key: "municipio",  width: 20 },
      { key: "data",       width: 13 },
      { key: "aps",        width: 10 },
      { key: "valorAp",    width: 16 },
      { key: "total",      width: 18 },
      { key: "observacao", width: 35 },
      { key: "foto",       width: 14 },
    ];

    const NCOLS = 10;

    // ── Cabeçalho principal ──────────────────────────────────────────────────
    ws.mergeCells(1, 1, 1, NCOLS);
    const h1 = ws.getCell("A1");
    h1.value = "NETVIUS";
    aplicarEstiloCelula(h1, { bg: C.azulEscuro, fg: C.branco, bold: true, size: 16, hAlign: "center" });
    ws.getRow(1).height = 38;

    ws.mergeCells(2, 1, 2, NCOLS);
    const h2 = ws.getCell("A2");
    h2.value = "RELATÓRIO DE ORDENS DE SERVIÇO CONCLUÍDAS";
    aplicarEstiloCelula(h2, { bg: C.azulMedio, fg: C.branco, bold: true, size: 12, hAlign: "center" });
    ws.getRow(2).height = 26;

    ws.mergeCells(3, 1, 3, NCOLS);
    const h3 = ws.getCell("A3");
    const dataGer = new Date().toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });
    h3.value = `Emitido em: ${dataGer}   ·   Valores por AP: conforme tabela de cada técnico   ·   Total de OS: ${concluidas.length}`;
    aplicarEstiloCelula(h3, { bg: C.azulSuave, fg: C.azulMedio, italic: true, size: 9, hAlign: "center" });
    ws.getRow(3).height = 18;

    ws.addRow([]); // linha vazia
    ws.getRow(4).height = 6;

    let rowIdx = 5;

    // ── Iterar por técnico ───────────────────────────────────────────────────
    for (const tecnico of tecnicosOrdenados) {
      const osDoTecnico = porTecnico[tecnico];

      // Cabeçalho do técnico
      ws.mergeCells(rowIdx, 1, rowIdx, NCOLS);
      const tHeader = ws.getCell(rowIdx, 1);
      tHeader.value = `  👷  TÉCNICO: ${tecnico.toUpperCase()}`;
      aplicarEstiloCelula(tHeader, {
        bg: C.azulClaro, fg: C.branco, bold: true, size: 11,
        border: bordaMedia(),
      });
      ws.getRow(rowIdx).height = 24;
      rowIdx++;

      // Cabeçalho das colunas
      const colHeaders = ["#", "Nome da Escola", "INEP", "Município", "Data Conclusão", "APs", "Valor/AP (R$)", "Total (R$)", "Observação", "📷 Ver Foto"];
      const colRow = ws.getRow(rowIdx);
      colRow.height = 22;
      colHeaders.forEach((v, i) => {
        const cell = ws.getCell(rowIdx, i + 1);
        cell.value = v;
        aplicarEstiloCelula(cell, {
          bg: C.cinzaEscuro, fg: C.branco, bold: true, size: 9,
          hAlign: i === 0 ? "center" : i >= 4 ? "center" : "left",
          border: borda(C.cinzaEscuro),
        });
      });
      rowIdx++;

      // Linhas de dados
      osDoTecnico.forEach((os, idx) => {
        const bg = idx % 2 === 0 ? C.branco : C.cinzaClaro;
        const dataStr = os.dataConclusao
          ? new Date(os.dataConclusao).toLocaleDateString("pt-BR")
          : "—";
        const valorOsUnit = getValorOs(os);
        const total = valorOsUnit;

        const vals = [
          idx + 1,
          os.escolaNome,
          os.inep,
          os.municipio,
          dataStr,
          os.qtdApInstalado ?? 0,
          valorOsUnit,
          total,
          os.observacao ?? "",
        ];

        const dataRow = ws.getRow(rowIdx);
        dataRow.height = 20;
        vals.forEach((v, i) => {
          const cell = ws.getCell(rowIdx, i + 1);
          if (false) {
            // placeholder removido
          } else {
            cell.value = v;
            const hAlign: ExcelJS.Alignment["horizontal"] =
              i === 0 ? "center" :
              i === 2 ? "center" :
              i === 4 ? "center" :
              i === 8 ? "left" :
              i >= 5 ? "right" : "left";
            aplicarEstiloCelula(cell, {
              bg, fg: C.cinzaEscuro, size: 9,
              hAlign,
              wrap: i === 1 || i === 8,
              numFmt: i === 6 || i === 7 ? '"R$" #,##0.00' : undefined,
              border: borda(),
            });
          }
        });

        // Coluna 10: evidências devem ser abertas pelo sistema autenticado, nunca
        // por URL pública persistida dentro da planilha.
        const fotoCell = ws.getCell(rowIdx, 10);
        const fotoUrl = (os as any).fotoMapaCalorUrl as string | null;
        if (fotoUrl) {
          fotoCell.value = "No sistema";
          aplicarEstiloCelula(fotoCell, { bg, fg: C.azulClaro, size: 9, hAlign: "center", border: borda() });
          fotoCell.font = { name: "Calibri", size: 9, color: { argb: "FF0563C1" }, bold: true };
        } else {
          fotoCell.value = "Sem foto";
          aplicarEstiloCelula(fotoCell, { bg, fg: C.cinzaMedio, size: 9, hAlign: "center", border: borda() });
        }

        rowIdx++;
      });

      // Subtotal do técnico
      const totalAps = osDoTecnico.reduce((s, r) => s + (r.qtdApInstalado ?? 0), 0);
      const totalTecnico = osDoTecnico.reduce((s, r) => s + getValorOs(r), 0);

      const subRow = ws.getRow(rowIdx);
      subRow.height = 22;
      const subLabels: (string | number)[] = [
        "", `Subtotal — ${osDoTecnico.length} OS`, "", "",
        "", totalAps, "", totalTecnico, "", "",
      ];
      subLabels.forEach((v, i) => {
        const cell = ws.getCell(rowIdx, i + 1);
        cell.value = v;
        aplicarEstiloCelula(cell, {
          bg: C.verdeClaro, fg: C.verdeMedio, bold: true, size: 9,
          hAlign: i === 1 ? "left" : i >= 5 ? "right" : "center",
          numFmt: i === 6 || i === 7 ? '"R$" #,##0.00' : undefined,
          border: borda(C.verdeMedio, "thin"),
        });
      });
      rowIdx++;

      // Espaço entre técnicos
      ws.getRow(rowIdx).height = 8;
      rowIdx++;
    }

    // ── Total Geral ──────────────────────────────────────────────────────────
    const totalApsGeral = concluidas.reduce((s, r) => s + (r.qtdApInstalado ?? 0), 0);
    const totalGeralVal = concluidas.reduce((s, r) => s + getValorOs(r), 0);

    ws.mergeCells(rowIdx, 1, rowIdx, 6);
    const tgLabel = ws.getCell(rowIdx, 1);
    tgLabel.value = `TOTAL GERAL — ${concluidas.length} OS Concluídas`;
    aplicarEstiloCelula(tgLabel, {
      bg: C.azulEscuro, fg: C.branco, bold: true, size: 11,
      hAlign: "right", border: bordaMedia(),
    });

    const tgAps = ws.getCell(rowIdx, 7);
    tgAps.value = totalApsGeral;
    aplicarEstiloCelula(tgAps, {
      bg: C.azulEscuro, fg: C.branco, bold: true, size: 11,
      hAlign: "right", border: bordaMedia(),
    });

    const tgValAp = ws.getCell(rowIdx, 8);
    tgValAp.value = "";
    aplicarEstiloCelula(tgValAp, {
      bg: C.azulEscuro, fg: C.branco, bold: true, size: 11,
      hAlign: "right", border: bordaMedia(),
    });

    const tgTotal = ws.getCell(rowIdx, 9);
    tgTotal.value = totalGeralVal;
    aplicarEstiloCelula(tgTotal, {
      bg: C.azulEscuro, fg: C.branco, bold: true, size: 13,
      hAlign: "right", numFmt: '"R$" #,##0.00', border: bordaMedia(),
    });

    // Coluna 10 do total geral (foto) — vazia
    const tgFoto = ws.getCell(rowIdx, 10);
    tgFoto.value = "";
    aplicarEstiloCelula(tgFoto, { bg: C.azulEscuro, fg: C.branco, bold: true, size: 9, border: bordaMedia() });

    ws.getRow(rowIdx).height = 28;

    // ═══════════════════════════════════════════════════════════════════════════
    // ABA 2 — RESUMO DE PAGAMENTO POR TÉCNICO
    // ═══════════════════════════════════════════════════════════════════════════
    const ws2 = wb.addWorksheet("Pagamento por Técnico", {
      properties: { tabColor: { argb: C.verdeMedio } },
    });

    ws2.columns = [
      { key: "tecnico",    width: 32 },
      { key: "qtdOs",      width: 12 },
      { key: "totalAps",   width: 14 },
      { key: "valorAp",    width: 18 },
      { key: "totalPagar", width: 22 },
    ];

    // Título
    ws2.mergeCells("A1:E1");
    const t1 = ws2.getCell("A1");
    t1.value = "NETVIUS";
    aplicarEstiloCelula(t1, { bg: C.azulEscuro, fg: C.branco, bold: true, size: 15, hAlign: "center" });
    ws2.getRow(1).height = 36;

    ws2.mergeCells("A2:E2");
    const t2 = ws2.getCell("A2");
    t2.value = "RESUMO DE PAGAMENTO POR TÉCNICO";
    aplicarEstiloCelula(t2, { bg: C.verdeMedio, fg: C.branco, bold: true, size: 12, hAlign: "center" });
    ws2.getRow(2).height = 26;

    ws2.mergeCells("A3:E3");
    const t3 = ws2.getCell("A3");
    t3.value = `Emitido em: ${dataGer}   ·   Valores conforme tabela protegida de cada técnico`;
    aplicarEstiloCelula(t3, { bg: C.verdeClaro, fg: C.verdeMedio, italic: true, size: 9, hAlign: "center" });
    ws2.getRow(3).height = 18;

    ws2.addRow([]);
    ws2.getRow(4).height = 6;

    // Cabeçalho
    const ch2 = ws2.getRow(5);
    ch2.height = 24;
    ["Técnico", "Qtd. OS", "Total APs", "Valor por AP (R$)", "Total a Receber (R$)"].forEach((v, i) => {
      const cell = ws2.getCell(5, i + 1);
      cell.value = v;
      aplicarEstiloCelula(cell, {
        bg: C.cinzaEscuro, fg: C.branco, bold: true, size: 10,
        hAlign: i === 0 ? "left" : "center",
        border: borda(C.cinzaEscuro),
      });
    });

    // Dados por técnico
    tecnicosOrdenados.forEach((tecnico, idx) => {
      const os = porTecnico[tecnico];
      const totalAps = os.reduce((s, r) => s + (r.qtdApInstalado ?? 0), 0);
      const total = os.reduce((s, r) => s + getValorOs(r), 0);
      const bg = idx % 2 === 0 ? C.branco : C.cinzaClaro;

      const row = ws2.getRow(6 + idx);
      row.height = 24;

      [tecnico, os.length, totalAps, "", total].forEach((v, i) => {
        const cell = ws2.getCell(6 + idx, i + 1);
        cell.value = v;
        aplicarEstiloCelula(cell, {
          bg, fg: C.cinzaEscuro, size: 11,
          bold: i === 4,
          hAlign: i === 0 ? "left" : i === 4 ? "right" : "center",
          numFmt: i === 3 || i === 4 ? '"R$" #,##0.00' : undefined,
          border: borda(),
        });
        // Destaque no total a receber
        if (i === 4) {
          cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: C.verdeClaro } };
          cell.font = { ...cell.font, color: { argb: C.verdeMedio }, bold: true, size: 12 };
        }
      });
    });

    // Total geral aba 2
    const rowTG = tecnicosOrdenados.length + 7;
    ws2.addRow([]);
    ws2.getRow(rowTG - 1).height = 8;

    const tgRow = ws2.getRow(rowTG);
    tgRow.height = 30;
    [
      "TOTAL GERAL",
      concluidas.length,
      totalApsGeral,
      "",
      totalGeralVal,
    ].forEach((v, i) => {
      const cell = ws2.getCell(rowTG, i + 1);
      cell.value = v;
      aplicarEstiloCelula(cell, {
        bg: C.azulEscuro, fg: C.branco, bold: true, size: 12,
        hAlign: i === 0 ? "left" : i === 4 ? "right" : "center",
        numFmt: i === 3 || i === 4 ? '"R$" #,##0.00' : undefined,
        border: bordaMedia(),
      });
    });

    // ═══════════════════════════════════════════════════════════════════════════
    // ABA 3 — NÃO INSTALADAS
    // ═══════════════════════════════════════════════════════════════════════════
    const vermelho     = "FFDC2626";
    const vermelhoEsc  = "FF7F1D1D";
    const vermelhoClar = "FFFEE2E2";
    const laranja      = "FFEA580C";
    const laranjaClar  = "FFFFF7ED";

    const ws3 = wb.addWorksheet("Não Instaladas", {
      properties: { tabColor: { argb: vermelho } },
    });

    const NCOLS3 = 8;
    ws3.columns = [
      { key: "seq",        width: 5  },
      { key: "escola",     width: 40 },
      { key: "inep",       width: 13 },
      { key: "municipio",  width: 20 },
      { key: "tecnico",    width: 24 },
      { key: "motivo",     width: 24 },
      { key: "data",       width: 14 },
      { key: "observacao", width: 35 },
    ];

    // Título
    ws3.mergeCells(1, 1, 1, NCOLS3);
    const ni1 = ws3.getCell("A1");
    ni1.value = "NETVIUS";
    aplicarEstiloCelula(ni1, { bg: C.azulEscuro, fg: C.branco, bold: true, size: 16, hAlign: "center" });
    ws3.getRow(1).height = 38;

    ws3.mergeCells(2, 1, 2, NCOLS3);
    const ni2 = ws3.getCell("A2");
    ni2.value = "RELATÓRIO DE ESCOLAS NÃO INSTALADAS";
    aplicarEstiloCelula(ni2, { bg: vermelho, fg: C.branco, bold: true, size: 12, hAlign: "center" });
    ws3.getRow(2).height = 26;

    ws3.mergeCells(3, 1, 3, NCOLS3);
    const ni3 = ws3.getCell("A3");
    ni3.value = `Emitido em: ${dataGer}   ·   Total de escolas não instaladas: ${naoInstaladas.length}`;
    aplicarEstiloCelula(ni3, { bg: vermelhoClar, fg: vermelho, italic: true, size: 9, hAlign: "center" });
    ws3.getRow(3).height = 18;

    ws3.addRow([]);
    ws3.getRow(4).height = 6;

    // Cabeçalho das colunas
    const niColHeaders = ["#", "Nome da Escola", "INEP", "Município", "Técnico", "Motivo", "Data", "Observação"];
    const niHeaderRow = ws3.getRow(5);
    niHeaderRow.height = 22;
    niColHeaders.forEach((v, i) => {
      const cell = ws3.getCell(5, i + 1);
      cell.value = v;
      aplicarEstiloCelula(cell, {
        bg: vermelhoEsc, fg: C.branco, bold: true, size: 9,
        hAlign: i === 0 ? "center" : i >= 5 ? "center" : "left",
        border: borda(vermelhoEsc),
      });
    });

    // Linhas de dados
    if (naoInstaladas.length === 0) {
      ws3.mergeCells(6, 1, 6, NCOLS3);
      const emptyCell = ws3.getCell(6, 1);
      emptyCell.value = "Nenhuma escola não instalada no período.";
      aplicarEstiloCelula(emptyCell, { bg: vermelhoClar, fg: vermelho, italic: true, size: 10, hAlign: "center" });
      ws3.getRow(6).height = 28;
    } else {
      naoInstaladas.forEach((ni, idx) => {
        const bg = idx % 2 === 0 ? C.branco : vermelhoClar;
        const dataStr = ni.dataConclusao
          ? new Date(ni.dataConclusao).toLocaleDateString("pt-BR")
          : "—";

        const vals = [
          idx + 1,
          ni.escolaNome,
          ni.inep,
          ni.municipio,
          ni.tecnicoNome,
          ni.motivoLabel,
          dataStr,
          ni.observacao ?? "",
        ];

        const niRow = ws3.getRow(6 + idx);
        niRow.height = 20;
        vals.forEach((v, i) => {
          const cell = ws3.getCell(6 + idx, i + 1);
          cell.value = v;
          const hAlign: ExcelJS.Alignment["horizontal"] =
            i === 0 ? "center" :
            i === 2 ? "center" :
            i === 5 ? "center" :
            i === 6 ? "center" : "left";
          aplicarEstiloCelula(cell, {
            bg, fg: C.cinzaEscuro, size: 9,
            hAlign,
            wrap: i === 1 || i === 7,
            border: borda(),
          });
          // Destaque na coluna de motivo
          if (i === 5 && v) {
            cell.font = { name: "Calibri", size: 9, bold: true, color: { argb: vermelho } };
          }
        });
      });

      // Total
      const totalRow3 = 6 + naoInstaladas.length + 1;
      ws3.addRow([]);
      ws3.getRow(totalRow3 - 1).height = 8;
      ws3.mergeCells(totalRow3, 1, totalRow3, NCOLS3);
      const totalCell3 = ws3.getCell(totalRow3, 1);
      totalCell3.value = `TOTAL: ${naoInstaladas.length} escola(s) não instalada(s)`;
      aplicarEstiloCelula(totalCell3, {
        bg: vermelho, fg: C.branco, bold: true, size: 11,
        hAlign: "center", border: borda(vermelho, "medium"),
      });
      ws3.getRow(totalRow3).height = 28;
    }

    // ── Enviar arquivo ─────────────────────────────────────────────────────────────────────────────
    const nomeArquivo = `relatorio-os-${new Date().toISOString().slice(0, 10)}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("[exportarRelatorioExcel]", err);
    res.status(500).json({ error: "Erro ao gerar planilha" });
  }
}
