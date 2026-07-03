import ExcelJS from "exceljs";
import { Request, Response } from "express";
import multer from "multer";

export const uploadMiddleware = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });
import { verifyTenantToken, extractBearerToken } from "./_core/tenantAuth";
import mysql from "mysql2/promise";

// ─── Tabela de valores por AP (empresa → Netvionis) ──────────────────────────
export const TABELA_VALORES_EMPRESA: Record<number, number> = {
  1:  1260.00,
  2:  1460.00,
  3:  1660.00,
  4:  1892.00,
  5:  2240.00,
  6:  2472.00,
  7:  2820.00,
  8:  3052.00,
  9:  3400.00,
  10: 3632.00,
  11: 3980.00,
  12: 4328.00,
  13: 4676.00,
  14: 5024.00,
  15: 5372.00,
  16: 5572.00,
  17: 5772.00,
  18: 5972.00,
  19: 6172.00,
  20: 6272.00,
  21: 6472.00,
  22: 6672.00,
  23: 6872.00,
  24: 7072.00,
  25: 7272.00,
  26: 7472.00,
  27: 7672.00,
  28: 7872.00,
  29: 8072.00,
  30: 8272.00,
  31: 8472.00,
};

export function getValorEmpresaPorAp(qtd: number): number {
  if (!qtd || qtd <= 0) return 0;
  if (TABELA_VALORES_EMPRESA[qtd]) return TABELA_VALORES_EMPRESA[qtd];
  const keys = Object.keys(TABELA_VALORES_EMPRESA).map(Number).sort((a, b) => a - b);
  const maior = keys.find(k => k >= qtd);
  if (maior) return TABELA_VALORES_EMPRESA[maior];
  return TABELA_VALORES_EMPRESA[keys[keys.length - 1]];
}

// ─── Paleta de cores ──────────────────────────────────────────────────────────
const C = {
  azulEscuro:  "FF0D2137",
  azulMedio:   "FF1A3A5C",
  verdeEscuro: "FF166534",
  verdeClaro:  "FFD1FAE5",
  verdeMedio:  "FF15803D",
  cinzaClaro:  "FFF3F4F6",
  cinzaBorda:  "FFD1D5DB",
  branco:      "FFFFFFFF",
  cinzaEscuro: "FF374151",
  vermelho:    "FFDC2626",
  vermelhoClaro: "FFFEE2E2",
  amareloClaro: "FFFEF3C7",
};

function aplicarCelula(
  cell: ExcelJS.Cell,
  opts: {
    bg?: string;
    fg?: string;
    bold?: boolean;
    size?: number;
    hAlign?: ExcelJS.Alignment["horizontal"];
    wrap?: boolean;
    numFmt?: string;
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
    vertical: "middle",
    wrapText: opts.wrap ?? false,
  };
  if (opts.numFmt) cell.numFmt = opts.numFmt;
  const s: Partial<ExcelJS.Border> = { style: "thin", color: { argb: C.cinzaBorda } };
  cell.border = { top: s, left: s, bottom: s, right: s };
}

// ─── Endpoint: Exportar Nota Fiscal ──────────────────────────────────────────
export async function exportarNotaFiscal(req: Request, res: Response) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) return res.status(401).json({ error: "Não autenticado" });
    const session = await verifyTenantToken(token);
    if (!session) return res.status(401).json({ error: "Token inválido" });

    const tenantId = session.tenantId;
    const dataInicio = req.query.dataInicio as string | undefined;
    const dataFim = req.query.dataFim as string | undefined;

    const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
    let query = `
      SELECT 
        e.nome as escola,
        e.inep,
        e.municipio,
        os.qtdApInstalado as aps,
        os.dataConclusao
      FROM ordens_servico os
      JOIN escolas e ON os.escolaId = e.id
      WHERE os.status = 'concluida' AND os.tenantId = ?
    `;
    const params: any[] = [tenantId];

    if (dataInicio) { query += ` AND os.dataConclusao >= ?`; params.push(new Date(dataInicio + "T00:00:00")); }
    if (dataFim)    { query += ` AND os.dataConclusao <= ?`; params.push(new Date(dataFim + "T23:59:59")); }
    query += ` ORDER BY os.dataConclusao DESC`;

    const [rows] = await conn.execute(query, params) as any[];
    await conn.end();

    const concluidas = rows as Array<{ escola: string; inep: string; municipio: string; aps: number | null; dataConclusao: Date | null }>;

    const wb = new ExcelJS.Workbook();
    wb.creator = "Netvionis";
    wb.created = new Date();

    const ws = wb.addWorksheet("Nota Fiscal", { properties: { tabColor: { argb: C.verdeMedio } } });

    ws.columns = [
      { key: "seq",       width: 5  },
      { key: "escola",    width: 44 },
      { key: "inep",      width: 14 },
      { key: "municipio", width: 22 },
      { key: "aps",       width: 10 },
      { key: "valor",     width: 20 },
      { key: "data",      width: 18 },
    ];

    const NCOLS = 7;
    const periodoStr = dataInicio && dataFim
      ? `Período: ${new Date(dataInicio + "T12:00:00").toLocaleDateString("pt-BR")} a ${new Date(dataFim + "T12:00:00").toLocaleDateString("pt-BR")}`
      : "Todos os períodos";
    const dataGer = new Date().toLocaleString("pt-BR");

    ws.mergeCells(1, 1, 1, NCOLS);
    aplicarCelula(ws.getCell("A1"), { bg: C.azulEscuro, fg: C.branco, bold: true, size: 16, hAlign: "center" });
    ws.getCell("A1").value = "NETVIONIS TECNOLOGIA";
    ws.getRow(1).height = 40;

    ws.mergeCells(2, 1, 2, NCOLS);
    aplicarCelula(ws.getCell("A2"), { bg: C.verdeMedio, fg: C.branco, bold: true, size: 13, hAlign: "center" });
    ws.getCell("A2").value = "RELATÓRIO DE FATURAMENTO — NOTA FISCAL";
    ws.getRow(2).height = 28;

    ws.mergeCells(3, 1, 3, NCOLS);
    aplicarCelula(ws.getCell("A3"), { bg: C.verdeClaro, fg: C.verdeEscuro, italic: true, size: 9, hAlign: "center" });
    ws.getCell("A3").value = `${periodoStr}   ·   Emitido em: ${dataGer}   ·   Total: ${concluidas.length} escolas`;
    ws.getRow(3).height = 18;

    ws.getRow(4).height = 6;

    const headers = ["#", "Nome da Escola", "INEP", "Município", "APs", "Valor (R$)", "Data de Conclusão"];
    headers.forEach((h, i) => {
      const cell = ws.getCell(5, i + 1);
      cell.value = h;
      aplicarCelula(cell, { bg: C.azulMedio, fg: C.branco, bold: true, size: 10, hAlign: i === 0 || i >= 4 ? "center" : "left" });
    });
    ws.getRow(5).height = 26;

    let totalAps = 0;
    let totalValor = 0;

    concluidas.forEach((row, idx) => {
      const aps = Number(row.aps) || 0;
      const valor = getValorEmpresaPorAp(aps);
      totalAps += aps;
      totalValor += valor;
      const dt = row.dataConclusao ? new Date(row.dataConclusao).toLocaleDateString("pt-BR") : "";
      const rowIdx = idx + 6;
      const bg = idx % 2 === 0 ? C.branco : C.cinzaClaro;
      [idx + 1, row.escola, row.inep, row.municipio || "", aps, valor, dt].forEach((v, i) => {
        const cell = ws.getCell(rowIdx, i + 1);
        cell.value = v;
        aplicarCelula(cell, { bg, hAlign: i === 0 || i >= 4 ? "center" : "left", numFmt: i === 5 ? '"R$" #,##0.00' : undefined, wrap: i === 1 });
      });
      ws.getRow(rowIdx).height = 18;
    });

    const trIdx = concluidas.length + 7;
    ws.mergeCells(trIdx, 1, trIdx, 4);
    ws.getCell(trIdx, 1).value = `TOTAL GERAL — ${concluidas.length} escola(s)`;
    aplicarCelula(ws.getCell(trIdx, 1), { bg: C.azulEscuro, fg: C.branco, bold: true, size: 11, hAlign: "right" });
    ws.getCell(trIdx, 5).value = totalAps;
    aplicarCelula(ws.getCell(trIdx, 5), { bg: C.azulEscuro, fg: C.branco, bold: true, size: 11, hAlign: "center" });
    ws.getCell(trIdx, 6).value = totalValor;
    aplicarCelula(ws.getCell(trIdx, 6), { bg: C.verdeMedio, fg: C.branco, bold: true, size: 13, hAlign: "center", numFmt: '"R$" #,##0.00' });
    ws.getCell(trIdx, 7).value = "";
    aplicarCelula(ws.getCell(trIdx, 7), { bg: C.azulEscuro, fg: C.branco, bold: true });
    ws.getRow(trIdx).height = 30;

    // Aba 2 — Tabela de referência de valores
    const ws2 = wb.addWorksheet("Tabela de Valores", { properties: { tabColor: { argb: C.verdeEscuro } } });
    ws2.columns = [{ key: "ap", width: 12 }, { key: "valor", width: 20 }];
    ws2.mergeCells("A1:B1");
    ws2.getCell("A1").value = "TABELA DE VALORES POR AP";
    aplicarCelula(ws2.getCell("A1"), { bg: C.azulEscuro, fg: C.branco, bold: true, size: 13, hAlign: "center" });
    ws2.getRow(1).height = 30;
    ws2.getCell("A2").value = "Quantidade de APs";
    ws2.getCell("B2").value = "Valor a Receber";
    aplicarCelula(ws2.getCell("A2"), { bg: C.azulMedio, fg: C.branco, bold: true, hAlign: "center" });
    aplicarCelula(ws2.getCell("B2"), { bg: C.azulMedio, fg: C.branco, bold: true, hAlign: "center" });
    ws2.getRow(2).height = 22;
    Object.entries(TABELA_VALORES_EMPRESA).sort((a, b) => Number(a[0]) - Number(b[0])).forEach(([ap, val], i) => {
      const r = i + 3;
      ws2.getCell(r, 1).value = `${ap} AP`;
      ws2.getCell(r, 2).value = val;
      const bg = i % 2 === 0 ? C.branco : C.cinzaClaro;
      aplicarCelula(ws2.getCell(r, 1), { bg, hAlign: "center", bold: true });
      aplicarCelula(ws2.getCell(r, 2), { bg, hAlign: "center", numFmt: '"R$" #,##0.00' });
      ws2.getRow(r).height = 18;
    });

    const periodo = dataInicio && dataFim ? `${dataInicio}_${dataFim}` : "completo";
    const nomeArquivo = `nota-fiscal-${periodo}.xlsx`;
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename="${nomeArquivo}"`);
    await wb.xlsx.write(res);
    res.end();
  } catch (err) {
    console.error("[exportarNotaFiscal]", err);
    res.status(500).json({ error: "Erro ao gerar nota fiscal" });
  }
}

// ─── Endpoint: Validar planilha da empresa ───────────────────────────────────
export async function validarPlanilhaEmpresa(req: Request, res: Response) {
  try {
    const token = extractBearerToken(req.headers.authorization);
    if (!token) return res.status(401).json({ error: "Não autenticado" });
    const session = await verifyTenantToken(token);
    if (!session) return res.status(401).json({ error: "Token inválido" });

    const tenantId = session.tenantId;

    const multerReq = req as Request & { file?: Express.Multer.File };
    if (!multerReq.file) return res.status(400).json({ error: "Nenhum arquivo enviado" });

    // Ler planilha da empresa
    const wb = new ExcelJS.Workbook();
    const fileBuffer = Buffer.from(multerReq.file.buffer);
    await wb.xlsx.load(fileBuffer as any);
    const ws = wb.worksheets[0];

    // Extrair dados da planilha da empresa (espera colunas: INEP, APs, Valor)
    const dadosEmpresa: Array<{ inep: string; aps: number; valor: number }> = [];
    let headerRow = -1;

    ws.eachRow((row, rowNum) => {
      const vals = row.values as any[];
      // Detectar linha de cabeçalho
      const rowStr = vals.map(v => String(v || "").toLowerCase()).join("|");
      if (headerRow === -1 && (rowStr.includes("inep") || rowStr.includes("escola"))) {
        headerRow = rowNum;
        return;
      }
      if (headerRow > 0 && rowNum > headerRow) {
        // Tentar extrair INEP (7 ou 8 dígitos numéricos)
        let inep = "";
        let aps = 0;
        let valor = 0;
        vals.forEach(v => {
          const s = String(v || "").trim();
          if (/^\d{7,8}$/.test(s)) inep = s;
          if (!isNaN(Number(s)) && Number(s) > 0 && Number(s) <= 50 && aps === 0) aps = Number(s);
          if (!isNaN(Number(s)) && Number(s) > 1000) valor = Number(s);
        });
        if (inep) dadosEmpresa.push({ inep, aps, valor });
      }
    });

    if (dadosEmpresa.length === 0) {
      return res.json({ ok: false, erro: "Não foi possível extrair dados da planilha. Verifique se ela contém colunas com INEP, APs e Valor.", divergencias: [], resumo: null });
    }

    // Buscar dados do sistema
    const conn = await mysql.createConnection(process.env.DATABASE_URL as string);
    const [rows] = await conn.execute(`
      SELECT e.inep, e.nome as escola, os.qtdApInstalado as aps
      FROM ordens_servico os
      JOIN escolas e ON os.escolaId = e.id
      WHERE os.status = 'concluida' AND os.tenantId = ?
    `, [tenantId]) as any[];
    await conn.end();

    const sistemaMap: Record<string, { escola: string; aps: number; valor: number }> = {};
    (rows as any[]).forEach(r => {
      const aps = Number(r.aps) || 0;
      sistemaMap[String(r.inep).trim()] = { escola: r.escola, aps, valor: getValorEmpresaPorAp(aps) };
    });

    // Comparar
    const divergencias: Array<{
      inep: string;
      escola: string;
      aps_sistema: number;
      aps_empresa: number;
      valor_sistema: number;
      valor_empresa: number;
      status: "ok" | "divergencia_ap" | "divergencia_valor" | "nao_encontrada";
    }> = [];

    let totalOk = 0;
    let totalDivergencia = 0;
    let totalNaoEncontrada = 0;

    dadosEmpresa.forEach(emp => {
      const sis = sistemaMap[emp.inep];
      if (!sis) {
        divergencias.push({ inep: emp.inep, escola: "Não encontrada no sistema", aps_sistema: 0, aps_empresa: emp.aps, valor_sistema: 0, valor_empresa: emp.valor, status: "nao_encontrada" });
        totalNaoEncontrada++;
        return;
      }
      const apOk = sis.aps === emp.aps;
      const valorOk = Math.abs(sis.valor - emp.valor) < 1;
      if (apOk && valorOk) {
        divergencias.push({ inep: emp.inep, escola: sis.escola, aps_sistema: sis.aps, aps_empresa: emp.aps, valor_sistema: sis.valor, valor_empresa: emp.valor, status: "ok" });
        totalOk++;
      } else {
        divergencias.push({ inep: emp.inep, escola: sis.escola, aps_sistema: sis.aps, aps_empresa: emp.aps, valor_sistema: sis.valor, valor_empresa: emp.valor, status: apOk ? "divergencia_valor" : "divergencia_ap" });
        totalDivergencia++;
      }
    });

    const totalValorSistema = divergencias.reduce((s, d) => s + d.valor_sistema, 0);
    const totalValorEmpresa = dadosEmpresa.reduce((s, d) => s + d.valor, 0);

    return res.json({
      ok: totalDivergencia === 0 && totalNaoEncontrada === 0,
      divergencias,
      resumo: {
        total: dadosEmpresa.length,
        ok: totalOk,
        divergencias: totalDivergencia,
        nao_encontradas: totalNaoEncontrada,
        total_valor_sistema: totalValorSistema,
        total_valor_empresa: totalValorEmpresa,
        diferenca: totalValorSistema - totalValorEmpresa,
      },
    });
  } catch (err) {
    console.error("[validarPlanilhaEmpresa]", err);
    res.status(500).json({ error: "Erro ao validar planilha" });
  }
}
