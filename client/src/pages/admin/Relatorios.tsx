import AdminLayoutAuto from "@/components/AdminLayoutAuto";
import { trpc } from "@/lib/trpc";
import { useTenantAuth } from "@/hooks/useTenantAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  Trophy, BarChart3, TrendingUp, Calendar, Download,
  Users, CheckCircle, X, ChevronDown, FileSpreadsheet, ClipboardList, AlertTriangle, EyeOff,
} from "lucide-react";
import { useState, useMemo, useRef, useEffect } from "react";
import * as XLSX from "xlsx";

/* ─── helpers ──────────────────────────────────────────────────────────────── */
function getDateRange(periodo: string, dataInicio: string, dataFim: string) {
  const now = new Date();
  if (periodo === "dia") {
    const d = now.toISOString().split("T")[0];
    return { inicio: new Date(d + "T00:00:00"), fim: new Date(d + "T23:59:59") };
  }
  if (periodo === "semana") {
    const start = new Date(now); start.setDate(now.getDate() - 7);
    return { inicio: start, fim: now };
  }
  if (periodo === "mes") {
    return { inicio: new Date(now.getFullYear(), now.getMonth(), 1), fim: now };
  }
  return { inicio: new Date(dataInicio + "T00:00:00"), fim: new Date(dataFim + "T23:59:59") };
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  try {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch { return "—"; }
}

const SELECT_CLASS =
  "w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

/* ─── Multi-select de técnicos ─────────────────────────────────────────────── */
function MultiSelectTecnicos({
  tecnicos,
  selected,
  onChange,
}: {
  tecnicos: { id: number; nome: string }[];
  selected: number[];
  onChange: (ids: number[]) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const toggle = (id: number) =>
    onChange(selected.includes(id) ? selected.filter(x => x !== id) : [...selected, id]);

  const label =
    selected.length === 0 ? "Todos os técnicos" :
    selected.length === 1 ? (tecnicos.find(t => t.id === selected[0])?.nome ?? "1 técnico") :
    `${selected.length} técnicos selecionados`;

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 flex items-center justify-between gap-2"
      >
        <span className="truncate text-left">{label}</span>
        <ChevronDown className="w-4 h-4 shrink-0 opacity-50" />
      </button>

      {open && (
        <div
          className="absolute z-50 mt-1 w-full rounded-md border border-border bg-popover text-popover-foreground shadow-lg"
          style={{ maxHeight: "240px", overflowY: "auto" }}
        >
          <button
            type="button"
            onClick={() => onChange([])}
            className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-2"
          >
            <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected.length === 0 ? "bg-primary border-primary" : "border-muted-foreground"}`}>
              {selected.length === 0 && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
            </span>
            Todos os técnicos
          </button>
          <div className="border-t border-border" />
          {tecnicos.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggle(t.id)}
              className="w-full px-3 py-2 text-sm text-left hover:bg-accent flex items-center gap-2"
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${selected.includes(t.id) ? "bg-primary border-primary" : "border-muted-foreground"}`}>
                {selected.includes(t.id) && <CheckCircle className="w-3 h-3 text-primary-foreground" />}
              </span>
              {t.nome}
            </button>
          ))}
        </div>
      )}

      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-1.5">
          {selected.map(id => {
            const t = tecnicos.find(x => x.id === id);
            if (!t) return null;
            return (
              <span key={id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                {t.nome}
                <button type="button" onClick={() => toggle(id)} className="hover:opacity-70">
                  <X className="w-3 h-3" />
                </button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
/* ─── Exportação Excel profissional ──────────────────────────────────── */
function exportarExcel(
  osDetalhadas: any[],
  tecnicosSelecionados: { id: number; nome: string }[],
  periodo: string,
  dataInicio: string,
  dataFim: string,
  osNaoInstaladas?: any[],
) {
  if (!osDetalhadas || osDetalhadas.length === 0) return;
  const wb = XLSX.utils.book_new();

  const periodoLabel =
    periodo === "geral" ? "Todo o período" :
    periodo === "dia"   ? "Hoje" :
    periodo === "semana"? "Última semana" :
    periodo === "mes"   ? "Este mês" :
    `${dataInicio} a ${dataFim}`;
  const tecLabel =
    tecnicosSelecionados.length === 0 ? "Todos os técnicos" :
    tecnicosSelecionados.map(t => t.nome).join(", ");

  /* ════════════════════════════════════════════════════════════════
     ABA 1 — OS CONCLUÍDAS
     Colunas: Nº | Escola | INEP | Município | UF | Técnico | Data | APs planejados | instalados | saldo | Valor por AP
  ════════════════════════════════════════════════════════════════ */
  const rows1: any[][] = [
    ["RELATÓRIO DE ORDENS DE SERVIÇO CONCLUÍDAS", "", "", "", "", "", "", "", "", "", ""],
    [`Período: ${periodoLabel}`, "", "", "", "", "", "", "", "", "", ""],
    [`Técnico(s): ${tecLabel}`, "", "", "", "", "", "", "", "", "", ""],
    [`Gerado em: ${new Date().toLocaleString("pt-BR")}`, "", "", "", "", "", "", "", "", "", ""],
    ["", "", "", "", "", "", "", "", "", "", ""],
    ["Nº", "Nome da Escola", "INEP", "Município", "UF", "Técnico", "Data Conclusão", "APs Planejados", "APs Instalados", "Saldo (Inst. − Plan.)", "Valor por AP (R$)"],
  ];

  osDetalhadas.forEach((os: any, i: number) => {
    rows1.push([
      i + 1,
      os.escolaNome ?? "",
      os.inep ?? "",
      os.municipio ?? "",
      os.uf ?? "",
      os.tecnicoNome ?? "",
      formatDate(os.dataConclusao),
      os.qtdApPlanejado ?? 0,
      os.qtdApInstalado ?? 0,
      (os.qtdApInstalado ?? 0) - (os.qtdApPlanejado ?? 0),
      os.valorCalculado != null ? Number(os.valorCalculado) : "",
    ]);
  });

  const totalApsPlanejados1 = osDetalhadas.reduce((acc: number, os: any) => acc + (os.qtdApPlanejado ?? 0), 0);
  const totalAps1   = osDetalhadas.reduce((acc: number, os: any) => acc + (os.qtdApInstalado ?? 0), 0);
  const totalValor1 = osDetalhadas.reduce((acc: number, os: any) => acc + (os.valorCalculado != null ? Number(os.valorCalculado) : 0), 0);

  rows1.push(["", `TOTAL — ${osDetalhadas.length} escola(s)`, "", "", "", "", "", totalApsPlanejados1, totalAps1, totalAps1 - totalApsPlanejados1, totalValor1 > 0 ? totalValor1 : ""]);

  const ws1 = XLSX.utils.aoa_to_sheet(rows1);

  ws1["!cols"] = [
    { wch: 5 }, { wch: 44 }, { wch: 12 }, { wch: 24 }, { wch: 4 },
    { wch: 26 }, { wch: 16 }, { wch: 15 }, { wch: 15 }, { wch: 19 }, { wch: 20 },
  ];

  const headerR1 = 5; // 0-indexed
  const firstD1  = 6;
  const lastD1   = firstD1 + osDetalhadas.length - 1;
  const totalR1  = lastD1 + 1;

  ws1["!rows"] = [
    { hpt: 28 }, { hpt: 16 }, { hpt: 16 }, { hpt: 16 }, { hpt: 8 }, { hpt: 22 },
    ...osDetalhadas.map(() => ({ hpt: 18 })),
    { hpt: 22 },
  ];

  ws1["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 10 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 10 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: 10 } },
    { s: { r: totalR1, c: 1 }, e: { r: totalR1, c: 6 } },
  ];

  // Estilos
  const sTitulo   = { font: { bold: true, sz: 14, color: { rgb: "1E3A5F" } }, fill: { fgColor: { rgb: "EBF0F8" } }, alignment: { horizontal: "center", vertical: "center" } };
  const sInfo     = { font: { italic: true, sz: 10, color: { rgb: "555555" } }, fill: { fgColor: { rgb: "EBF0F8" } } };
  const sHeader   = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1E3A5F" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true } };
  const sData     = { font: { sz: 10 }, alignment: { vertical: "center" } };
  const sDataAlt  = { font: { sz: 10 }, fill: { fgColor: { rgb: "F4F7FB" } }, alignment: { vertical: "center" } };
  const FMT_CONT  = '_-R$ * #,##0.00_-;-R$ * #,##0.00_-;_-R$ * "-"??_-;_-@_-';
  const sValor    = { font: { bold: true, sz: 10, color: { rgb: "1A6B3A" } }, fill: { fgColor: { rgb: "E8F5EE" } }, alignment: { horizontal: "right", vertical: "center" }, numFmt: FMT_CONT };
  const sTotal    = { font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1A6B3A" } }, alignment: { horizontal: "center", vertical: "center" } };
  const sTotalVal = { font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "1A6B3A" } }, alignment: { horizontal: "right", vertical: "center" }, numFmt: FMT_CONT };
  const cols1 = ["A","B","C","D","E","F","G","H","I","J","K"];
  const hdrs1 = ["Nº","Nome da Escola","INEP","Município","UF","Técnico","Data Conclusão","APs Planejados","APs Instalados","Saldo (Inst. − Plan.)","Valor por AP (R$)"];

  // Título e info
  ["A1","A2","A3","A4"].forEach((a, i) => {
    if (!ws1[a]) ws1[a] = { t: "s", v: "" };
    ws1[a].s = i === 0 ? sTitulo : sInfo;
  });

  // Cabeçalho
  cols1.forEach((col, ci) => {
    const addr = `${col}${headerR1 + 1}`;
    if (!ws1[addr]) ws1[addr] = { t: "s", v: hdrs1[ci] };
    ws1[addr].s = sHeader;
  });

  // Dados
  for (let ri = firstD1; ri <= lastD1; ri++) {
    const isAlt = (ri - firstD1) % 2 === 1;
    cols1.forEach((col, ci) => {
      const addr = `${col}${ri + 1}`;
      if (!ws1[addr]) ws1[addr] = { t: "s", v: "" };
      if (ci === 10 && ws1[addr].v !== "") {
        ws1[addr].s = sValor;
        ws1[addr].t = "n";
      } else {
        ws1[addr].s = isAlt ? sDataAlt : sData;
      }
    });
  }

  // Total
  cols1.forEach((col, ci) => {
    const addr = `${col}${totalR1 + 1}`;
    if (!ws1[addr]) ws1[addr] = { t: "s", v: "" };
    ws1[addr].s = ci === 10 ? sTotalVal : sTotal;
    if (ci >= 7 && ci <= 9) ws1[addr].t = "n";
    if (ci === 10 && totalValor1 > 0) ws1[addr].t = "n";
  });

  XLSX.utils.book_append_sheet(wb, ws1, "OS Concluídas");

  /* ════════════════════════════════════════════════════════════════
     ABA 2 — RESUMO DE PAGAMENTO POR TÉCNICO
     Colunas: Técnico | Escolas | APs | Total a Pagar
  ════════════════════════════════════════════════════════════════ */
  const porTecnico: Record<string, { nome: string; escolas: number; aps: number; totalValor: number; temValor: boolean }> = {};
  for (const os of osDetalhadas) {
    const key = String(os.tecnicoId ?? os.tecnicoNome);
    if (!porTecnico[key]) porTecnico[key] = { nome: os.tecnicoNome, escolas: 0, aps: 0, totalValor: 0, temValor: false };
    porTecnico[key].escolas++;
    porTecnico[key].aps += os.qtdApInstalado ?? 0;
    if (os.valorCalculado != null) {
      porTecnico[key].totalValor += Number(os.valorCalculado);
      porTecnico[key].temValor = true;
    }
  }
  const resumoTecs = Object.values(porTecnico);
  const totalGeralValor = resumoTecs.reduce((acc, t) => acc + t.totalValor, 0);
  const totalGeralAps   = resumoTecs.reduce((acc, t) => acc + t.aps, 0);
  const totalGeralEsc   = resumoTecs.reduce((acc, t) => acc + t.escolas, 0);

  const rows2: any[][] = [
    ["RESUMO DE PAGAMENTO POR TÉCNICO", "", "", ""],
    [`Período: ${periodoLabel}`, "", "", ""],
    [`Gerado em: ${new Date().toLocaleString("pt-BR")}`, "", "", ""],
    ["", "", "", ""],
    ["Técnico", "Escolas Concluídas", "APs Instalados", "Total a Pagar (R$)"],
    ...resumoTecs.map(t => [t.nome, t.escolas, t.aps, t.temValor ? t.totalValor : ""]),
    ["TOTAL GERAL", totalGeralEsc, totalGeralAps, totalGeralValor > 0 ? totalGeralValor : ""],
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(rows2);
  ws2["!cols"] = [{ wch: 32 }, { wch: 20 }, { wch: 18 }, { wch: 22 }];

  const headerR2 = 4;
  const firstD2  = 5;
  const lastD2   = firstD2 + resumoTecs.length - 1;
  const totalR2  = lastD2 + 1;

  ws2["!rows"] = [
    { hpt: 28 }, { hpt: 16 }, { hpt: 16 }, { hpt: 8 }, { hpt: 22 },
    ...resumoTecs.map(() => ({ hpt: 20 })),
    { hpt: 24 },
  ];

  ws2["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 3 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 3 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 3 } },
  ];

  const cols2 = ["A","B","C","D"];
  const hdrs2 = ["Técnico","Escolas Concluídas","APs Instalados","Total a Pagar (R$)"];

  ["A1","A2","A3"].forEach((a, i) => {
    if (!ws2[a]) ws2[a] = { t: "s", v: "" };
    ws2[a].s = i === 0 ? sTitulo : sInfo;
  });

  cols2.forEach((col, ci) => {
    const addr = `${col}${headerR2 + 1}`;
    if (!ws2[addr]) ws2[addr] = { t: "s", v: hdrs2[ci] };
    ws2[addr].s = sHeader;
  });

  for (let ri = firstD2; ri <= lastD2; ri++) {
    const isAlt = (ri - firstD2) % 2 === 1;
    cols2.forEach((col, ci) => {
      const addr = `${col}${ri + 1}`;
      if (!ws2[addr]) ws2[addr] = { t: "s", v: "" };
      if (ci === 3 && ws2[addr].v !== "") {
        ws2[addr].s = sValor;
        ws2[addr].t = "n";
      } else {
        ws2[addr].s = isAlt ? sDataAlt : sData;
        if (ci === 1 || ci === 2) ws2[addr].t = "n";
      }
    });
  }

  cols2.forEach((col, ci) => {
    const addr = `${col}${totalR2 + 1}`;
    if (!ws2[addr]) ws2[addr] = { t: "s", v: "" };
    ws2[addr].s = ci === 3 ? sTotalVal : sTotal;
    if (ci === 1 || ci === 2) ws2[addr].t = "n";
    if (ci === 3 && totalGeralValor > 0) ws2[addr].t = "n";
  });

  XLSX.utils.book_append_sheet(wb, ws2, "Resumo por Técnico");

  /* ════════════════════════════════════════════════════════════════
     ABA 3 — NÃO INSTALADAS
     Colunas: Nº | Escola | INEP | Município | UF | Técnico | Motivo | Data
  ════════════════════════════════════════════════════════════════ */
  if (osNaoInstaladas && osNaoInstaladas.length > 0) {
    const MOTIVO_MAP: Record<string, string> = {
      escola_desativada: "Escola desativada",
      em_reforma: "Em reforma",
      mudanca_endereco: "Mudança de endereço",
    };

    const rows3: any[][] = [
      ["ESCOLAS NÃO INSTALADAS", "", "", "", "", "", "", ""],
      [`Período: ${periodoLabel}`, "", "", "", "", "", "", ""],
      [`Técnico(s): ${tecLabel}`, "", "", "", "", "", "", ""],
      [`Gerado em: ${new Date().toLocaleString("pt-BR")}`, "", "", "", "", "", "", ""],
      ["", "", "", "", "", "", "", ""],
      ["Nº", "Nome da Escola", "INEP", "Município", "UF", "Técnico", "Motivo", "Data"],
    ];

    osNaoInstaladas.forEach((os: any, i: number) => {
      rows3.push([
        i + 1,
        os.escolaNome ?? "",
        os.inep ?? "",
        os.municipio ?? "",
        os.uf ?? "",
        os.tecnicoNome ?? "",
        MOTIVO_MAP[os.motivo] ?? os.motivoLabel ?? "Não informado",
        formatDate(os.dataConclusao),
      ]);
    });

    rows3.push(["", `TOTAL — ${osNaoInstaladas.length} escola(s) não instalada(s)`, "", "", "", "", "", ""]);

    const ws3 = XLSX.utils.aoa_to_sheet(rows3);
    ws3["!cols"] = [
      { wch: 5 }, { wch: 44 }, { wch: 12 }, { wch: 24 }, { wch: 4 },
      { wch: 26 }, { wch: 24 }, { wch: 14 },
    ];

    const headerR3 = 5;
    const firstD3  = 6;
    const lastD3   = firstD3 + osNaoInstaladas.length - 1;
    const totalR3  = lastD3 + 1;

    ws3["!merges"] = [
      { s: { r: 0, c: 0 }, e: { r: 0, c: 7 } },
      { s: { r: 1, c: 0 }, e: { r: 1, c: 7 } },
      { s: { r: 2, c: 0 }, e: { r: 2, c: 7 } },
      { s: { r: 3, c: 0 }, e: { r: 3, c: 7 } },
      { s: { r: totalR3, c: 1 }, e: { r: totalR3, c: 7 } },
    ];

    const sTituloR = { font: { bold: true, sz: 14, color: { rgb: "7F1D1D" } }, fill: { fgColor: { rgb: "FEE2E2" } }, alignment: { horizontal: "center", vertical: "center" } };
    const sInfoR   = { font: { italic: true, sz: 10, color: { rgb: "555555" } }, fill: { fgColor: { rgb: "FEE2E2" } } };
    const sHeaderR = { font: { bold: true, sz: 10, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "DC2626" } }, alignment: { horizontal: "center", vertical: "center", wrapText: true } };
    const sTotalR  = { font: { bold: true, sz: 11, color: { rgb: "FFFFFF" } }, fill: { fgColor: { rgb: "DC2626" } }, alignment: { horizontal: "center", vertical: "center" } };
    const cols3 = ["A","B","C","D","E","F","G","H"];
    const hdrs3 = ["Nº","Nome da Escola","INEP","Município","UF","Técnico","Motivo","Data"];

    ["A1","A2","A3","A4"].forEach((a, i) => {
      if (!ws3[a]) ws3[a] = { t: "s", v: "" };
      ws3[a].s = i === 0 ? sTituloR : sInfoR;
    });

    cols3.forEach((col, ci) => {
      const addr = `${col}${headerR3 + 1}`;
      if (!ws3[addr]) ws3[addr] = { t: "s", v: hdrs3[ci] };
      ws3[addr].s = sHeaderR;
    });

    for (let ri = firstD3; ri <= lastD3; ri++) {
      const isAlt = (ri - firstD3) % 2 === 1;
      cols3.forEach((col) => {
        const addr = `${col}${ri + 1}`;
        if (!ws3[addr]) ws3[addr] = { t: "s", v: "" };
        ws3[addr].s = isAlt ? sDataAlt : sData;
      });
    }

    cols3.forEach((col) => {
      const addr = `${col}${totalR3 + 1}`;
      if (!ws3[addr]) ws3[addr] = { t: "s", v: "" };
      ws3[addr].s = sTotalR;
    });

    XLSX.utils.book_append_sheet(wb, ws3, "Não Instaladas");
  }

  // Nome do arquivo
  const tecSlug =
    tecnicosSelecionados.length === 0 ? "todos" :
    tecnicosSelecionados.length === 1 ? tecnicosSelecionados[0].nome.replace(/\s+/g, "-").toLowerCase() :
    `${tecnicosSelecionados.length}-tecnicos`;
  XLSX.writeFile(wb, `relatorio-os-${tecSlug}-${new Date().toISOString().split("T")[0]}.xlsx`);
}

/* ─── Componente principal ─────────────────────────────────────────────────── */
export default function AdminRelatorios() {
  const { admin } = useTenantAuth();
  const isViewer = admin?.role === 'viewer';
  const { data: tecnicos } = trpc.tecnicos.list.useQuery();
  const { data: ranking }  = trpc.relatorios.ranking.useQuery();

  const [tecnicosSel, setTecnicosSel] = useState<number[]>([]);
  const [periodo, setPeriodo]         = useState("geral");
  const [dataInicio, setDataInicio]   = useState(() => {
    const d = new Date(); d.setDate(1); return d.toISOString().split("T")[0];
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split("T")[0]);

  const dates = useMemo(() => {
    if (periodo === "geral") return { inicio: null as string | null, fim: null as string | null };
    const range = getDateRange(periodo, dataInicio, dataFim);
    return {
      inicio: range.inicio ? range.inicio.toISOString() : null,
      fim:    range.fim    ? range.fim.toISOString()    : null,
    };
  }, [periodo, dataInicio, dataFim]);

  // Resumo individual (só 1 técnico)
  const tecnicoIdUnico = useMemo(() => (tecnicosSel.length === 1 ? tecnicosSel[0] : 0), [tecnicosSel]);

  const { data: relatorio, isLoading: loadingRelatorio } = trpc.relatorios.tecnico.useQuery(
    { tecnicoId: tecnicoIdUnico, dataInicio: dates.inicio, dataFim: dates.fim },
    { enabled: tecnicoIdUnico > 0 }
  );

  // OS não instaladas
  const { data: osNaoInstaladas, isLoading: loadingNaoInstaladas } = trpc.relatorios.osNaoInstaladas.useQuery({
    tecnicoIds: tecnicosSel.length > 0 ? tecnicosSel : undefined,
    dataInicio: dates.inicio,
    dataFim:    dates.fim,
  });

  // OS detalhadas — múltiplos técnicos
  const { data: osDetalhadas, isLoading: loadingOs } = trpc.relatorios.osDetalhadas.useQuery({
    tecnicoIds: tecnicosSel.length > 0 ? tecnicosSel : undefined,
    dataInicio: dates.inicio,
    dataFim:    dates.fim,
  });

  const totalNaoInstaladas = osNaoInstaladas?.length ?? 0;

  const totalOsTabela  = osDetalhadas?.length ?? 0;
  const totalApsTabela = useMemo(
    () => (osDetalhadas ?? []).reduce((acc, os) => acc + (os.qtdApInstalado ?? 0), 0),
    [osDetalhadas]
  );
  const totalApsPlanejadosTabela = useMemo(
    () => (osDetalhadas ?? []).reduce((acc, os) => acc + (os.qtdApPlanejado ?? 0), 0),
    [osDetalhadas]
  );
  const saldoApsTabela = totalApsTabela - totalApsPlanejadosTabela;

  const pagamentoPorTecnico = useMemo(() => {
    const agrupado = new Map<string, { nome: string; ordens: number; aps: number; total: number }>();
    for (const os of osDetalhadas ?? []) {
      const nome = os.tecnicoNome || "Não atribuído";
      const atual = agrupado.get(nome) ?? { nome, ordens: 0, aps: 0, total: 0 };
      atual.ordens += 1;
      atual.aps += Number(os.qtdApInstalado ?? 0);
      atual.total += os.valorCalculado == null ? 0 : Number(os.valorCalculado);
      agrupado.set(nome, atual);
    }
    return Array.from(agrupado.values()).sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));
  }, [osDetalhadas]);

  const totalPagamentoSelecionado = useMemo(
    () => pagamentoPorTecnico.reduce((acc, tecnico) => acc + tecnico.total, 0),
    [pagamentoPorTecnico]
  );

  const tecnicosSelecionados = useMemo(
    () => (tecnicos ?? []).filter(t => tecnicosSel.includes(t.id)),
    [tecnicos, tecnicosSel]
  );

  return (
    <AdminLayoutAuto title="Relatórios">

      {/* ── Filtros ─────────────────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2">
              <label className="text-sm font-medium mb-1.5 flex items-center gap-1 block">
                <Users className="w-3.5 h-3.5" /> Técnico(s)
              </label>
              <MultiSelectTecnicos
                tecnicos={tecnicos ?? []}
                selected={tecnicosSel}
                onChange={setTecnicosSel}
              />
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Período</label>
              <select value={periodo} onChange={e => setPeriodo(e.target.value)} className={SELECT_CLASS}>
                <option value="geral">Geral (todo período)</option>
                <option value="dia">Hoje</option>
                <option value="semana">Última semana</option>
                <option value="mes">Este mês</option>
                <option value="custom">Personalizado</option>
              </select>
            </div>
            {periodo === "custom" && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1 block">
                    <Calendar className="w-3.5 h-3.5" /> Data início
                  </label>
                  <Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 flex items-center gap-1 block">
                    <Calendar className="w-3.5 h-3.5" /> Data fim
                  </label>
                  <Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} />
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Resumo individual (só 1 técnico) ────────────────────────────────── */}
      {tecnicoIdUnico > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Resultado — {tecnicos?.find(t => t.id === tecnicoIdUnico)?.nome}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingRelatorio ? (
              <div className="grid grid-cols-3 gap-3">
                {[1, 2, 3].map(i => <div key={i} className="h-24 bg-muted rounded-xl animate-pulse" />)}
              </div>
            ) : !relatorio ? (
              <p className="text-sm text-muted-foreground">Sem dados para o período.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Escolas concluídas", value: relatorio.totalEscolas, color: "text-blue-600" },
                  { label: "APs instalados",     value: relatorio.totalAps,     color: "text-green-600" },
                  { label: "Média/dia",           value: relatorio.mediaPorDia,  color: "text-purple-600" },
                ].map(card => (
                  <div key={card.label} className="rounded-xl border p-4 text-center">
                    <p className={`text-3xl font-bold ${card.color}`}>{card.value}</p>
                    <p className="text-sm text-muted-foreground mt-1">{card.label}</p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Resumo de pagamento por técnico ─────────────────────────────────── */}
      {!isViewer && pagamentoPorTecnico.length > 0 && (
        <Card className="mb-6 overflow-hidden border-0 shadow-sm">
          <CardHeader className="pb-3 bg-gradient-to-r from-emerald-50 to-sky-50 dark:from-emerald-950/20 dark:to-sky-950/20">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-emerald-600" />
                  Pagamento por técnico
                </CardTitle>
                <p className="mt-1 text-xs text-muted-foreground">Valores calculados a partir das OS concluídas e do valor cadastrado por AP.</p>
              </div>
              <div className="rounded-xl bg-white/80 dark:bg-background/70 px-4 py-2 text-right shadow-sm">
                <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Total do filtro</p>
                <p className="text-lg font-bold text-emerald-700 dark:text-emerald-400">
                  {totalPagamentoSelecionado.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/30">
                    {["Técnico", "OS concluídas", "APs instalados", "Total a receber"].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pagamentoPorTecnico.map(tecnico => (
                    <tr key={tecnico.nome} className="border-b last:border-0 hover:bg-muted/20">
                      <td className="px-4 py-3 font-semibold">{tecnico.nome}</td>
                      <td className="px-4 py-3 text-muted-foreground">{tecnico.ordens}</td>
                      <td className="px-4 py-3 text-muted-foreground">{tecnico.aps}</td>
                      <td className="px-4 py-3 font-bold text-emerald-700 dark:text-emerald-400">
                        {tecnico.total > 0 ? tecnico.total.toLocaleString("pt-BR", { style: "currency", currency: "BRL" }) : "—"}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {/* ── Tabela Escolas Não Instaladas ─────────────────────────────────── */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-500" />
              Escolas Não Instaladas
              {totalNaoInstaladas > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-semibold">
                  {totalNaoInstaladas}
                </span>
              )}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingNaoInstaladas ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map(i => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
            </div>
          ) : !osNaoInstaladas || osNaoInstaladas.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
              <AlertTriangle className="w-8 h-8 opacity-20" />
              <span>Nenhuma escola não instalada para os filtros selecionados.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-red-50/60 dark:bg-red-950/20">
                    {["#","Escola","INEP","Município","Técnico","Motivo","Data"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-red-700 dark:text-red-400 text-xs uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {osNaoInstaladas.map((os: any, i: number) => (
                    <tr key={os.osId} className="border-b last:border-0 hover:bg-red-50/40 dark:hover:bg-red-950/10 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-medium max-w-[200px]">
                        <span className="block truncate" title={os.escolaNome}>{os.escolaNome}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{os.inep}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{os.municipio}</td>
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {os.tecnicoNome}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 text-xs font-medium">
                          <AlertTriangle className="w-3 h-3" />
                          {({escola_desativada:"Escola desativada",em_reforma:"Em reforma",mudanca_endereco:"Mudança de endereço"} as Record<string,string>)[os.motivo] ?? os.motivoLabel ?? "Não informado"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(os.dataConclusao)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-red-50/40 dark:bg-red-950/10">
                    <td colSpan={7} className="px-4 py-3 text-sm font-semibold text-red-700 dark:text-red-400">
                      Total: {totalNaoInstaladas} escola{totalNaoInstaladas !== 1 ? "s" : ""} não instalada{totalNaoInstaladas !== 1 ? "s" : ""}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Tabela OS Concluídas + Exportar Excel ───────────────────────────── */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              OS Concluídas
              {totalOsTabela > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold">
                  {totalOsTabela} · {totalApsTabela}/{totalApsPlanejadosTabela} APs
                </span>
              )}
            </CardTitle>

            <button
              onClick={() => exportarExcel(osDetalhadas ?? [], tecnicosSelecionados, periodo, dataInicio, dataFim, osNaoInstaladas ?? [])}
              disabled={!osDetalhadas || osDetalhadas.length === 0}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #16a34a, #22c55e)",
                color: "white",
                boxShadow: "0 2px 8px rgba(34,197,94,0.35)",
              }}
            >
              <FileSpreadsheet className="w-4 h-4" />
              Exportar Excel
            </button>
          </div>

          {/* Dica sobre o campo de valor */}
          {totalOsTabela > 0 && (
            <p className="text-xs text-muted-foreground mt-2 flex items-center gap-1">
              <Download className="w-3 h-3" />
              A planilha separa as OS por técnico e inclui <strong className="mx-1">planejado, instalado e saldo de APs</strong>, além do total a pagar conforme os valores cadastrados.
            </p>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {loadingOs ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
            </div>
          ) : !osDetalhadas || osDetalhadas.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
              <ClipboardList className="w-10 h-10 opacity-20" />
              <span>Nenhuma OS concluída para os filtros selecionados.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    {["#","Escola","INEP","Município","APs Inst.","APs Plan.","Saldo",...(isViewer ? [] : ["Valor (R$)"]),"Técnico","Data","Observação"].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold text-muted-foreground text-xs uppercase tracking-wide whitespace-nowrap">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {osDetalhadas.map((os, i) => (
                    <tr key={os.osId} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-4 py-3 text-muted-foreground text-xs">{i + 1}</td>
                      <td className="px-4 py-3 font-medium max-w-[200px]">
                        <span className="block truncate" title={os.escolaNome}>{os.escolaNome}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{os.inep}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">{os.municipio}</td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 font-bold text-sm">
                          {os.qtdApInstalado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{os.qtdApPlanejado}</td>
                      <td className="px-4 py-3 text-center"><span className={`inline-flex min-w-8 items-center justify-center rounded-full px-2 py-1 text-xs font-bold ${(os.qtdApInstalado ?? 0) === (os.qtdApPlanejado ?? 0) ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300"}`}>{(os.qtdApInstalado ?? 0) - (os.qtdApPlanejado ?? 0)}</span></td>
                      {!isViewer && (
                      <td className="px-4 py-3 text-center">
                        {os.valorCalculado != null ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                            {Number(os.valorCalculado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
                      )}
                      <td className="px-4 py-3">
                        <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
                          {os.tecnicoNome}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs whitespace-nowrap">
                        {formatDate(os.dataConclusao)}
                      </td>
                      <td className="px-4 py-3 text-muted-foreground text-xs max-w-[180px]">
                        <span className="block truncate" title={os.observacao}>{os.observacao || "—"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t bg-muted/20">
                    <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-right text-muted-foreground">
                      Total ({totalOsTabela} escola{totalOsTabela !== 1 ? "s" : ""})
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300 font-bold text-sm">
                        {totalApsTabela}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center text-muted-foreground font-bold">{totalApsPlanejadosTabela}</td>
                    <td className="px-4 py-3 text-center"><span className={`font-bold ${saldoApsTabela === 0 ? "text-emerald-700 dark:text-emerald-300" : "text-amber-700 dark:text-amber-300"}`}>{saldoApsTabela}</span></td>
                    {!isViewer && (
                    <td className="px-4 py-3 text-center">
                      {(() => {
                        const totalValor = (osDetalhadas ?? []).reduce((acc: number, os: any) => acc + (os.valorCalculado != null ? Number(os.valorCalculado) : 0), 0);
                        return totalValor > 0 ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-200 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300 font-bold text-sm">
                            {totalValor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                        ) : <span className="text-muted-foreground text-xs">—</span>;
                      })()}
                    </td>
                    )}
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ── Ranking geral ────────────────────────────────────────────────────── */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-500" />
            Ranking Geral de Técnicos
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!ranking || ranking.length === 0 ? (
            <div className="h-48 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
              <Trophy className="w-8 h-8 opacity-30" />
              <span>Nenhum dado disponível ainda.</span>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ranking} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis dataKey="tecnicoNome" tick={{ fontSize: 11 }} tickFormatter={(v: string) => v.split(" ")[0]} />
                  <YAxis tick={{ fontSize: 11 }} label={{ value: "Escolas", angle: -90, position: "insideLeft", offset: 20, style: { fontSize: 10 } }} />
                  <Tooltip formatter={(v: number, n: string) => [v, n === "totalEscolas" ? "Escolas concluídas" : "APs instalados"]} />
                  <Bar dataKey="totalEscolas" fill="#1e3a5f" name="totalEscolas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalAps"     fill="#22c55e" name="totalAps"     radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {ranking.map((t: any, i: number) => (
                  <div key={t.tecnicoId} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      i === 0 ? "bg-yellow-100 text-yellow-700" :
                      i === 1 ? "bg-gray-100 text-gray-600" :
                      i === 2 ? "bg-orange-100 text-orange-600" :
                      "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </div>
                    <p className="flex-1 font-medium text-sm">{t.tecnicoNome}</p>
                    <span className="text-sm text-muted-foreground">
                      {t.totalEscolas} escola{t.totalEscolas !== 1 ? "s" : ""}
                    </span>
                    <span className="text-sm text-green-600 font-semibold">{t.totalAps} APs</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AdminLayoutAuto>
  );
}
