import AdminLayoutAuto from "@/components/AdminLayoutAuto";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import {
  Trophy, BarChart3, TrendingUp, Calendar, Download,
  Users, CheckCircle, X, ChevronDown, FileSpreadsheet, ClipboardList,
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

/* ─── Exportação Excel profissional ────────────────────────────────────────── */
function exportarExcel(
  osDetalhadas: any[],
  tecnicosSelecionados: { id: number; nome: string }[],
  periodo: string,
  dataInicio: string,
  dataFim: string,
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

  /* ── Aba 1: OS Concluídas ─────────────────────────────────────────────── */
  const infoRows: any[][] = [
    ["RELATÓRIO DE ORDENS DE SERVIÇO CONCLUÍDAS"],
    [`Período: ${periodoLabel}`],
    [`Técnico(s): ${tecLabel}`],
    [`Gerado em: ${new Date().toLocaleString("pt-BR")}`],
    [],
  ];

   const headerRow = [
    "Nº", "Nome da Escola", "INEP", "Município", "UF",
    "Técnico", "Data Conclusão", "APs Instalados",
    "Valor por AP (R$)",
    "Valor Total (R$)",
    "Observação",
  ];
  const dataRows = osDetalhadas.map((os: any, i: number) => [
    i + 1,
    os.escolaNome,
    os.inep,
    os.municipio,
    os.uf ?? "",
    os.tecnicoNome,
    formatDate(os.dataConclusao),
    os.qtdApInstalado ?? 0,
    os.valorCalculado != null ? Number(os.valorCalculado) : "",  // Valor por AP — já preenchido se cadastrado
    "",   // Valor Total — fórmula
    os.observacao || "",
  ]);

  const totalAps = osDetalhadas.reduce((acc, os) => acc + (os.qtdApInstalado ?? 0), 0);
  const totalRow = [
    "", `TOTAL — ${osDetalhadas.length} escola(s)`,
    "", "", "", "", "",
    totalAps, "", "", "",
  ];

  const allRows = [...infoRows, headerRow, ...dataRows, totalRow];
  const ws = XLSX.utils.aoa_to_sheet(allRows);

  // Linhas no Excel (1-indexed)
  const firstDataExcelRow = infoRows.length + 2; // header na linha 6, dados a partir da 7
  const lastDataExcelRow  = firstDataExcelRow + osDetalhadas.length - 1;
  const totalExcelRow     = lastDataExcelRow + 1;

  // Fórmulas: Valor Total = APs * Valor por AP
  for (let i = 0; i < osDetalhadas.length; i++) {
    const r = firstDataExcelRow + i;
    ws[`J${r}`] = { t: "n", f: `IF(I${r}="","",H${r}*I${r})` };
  }
  // Soma total de Valor Total
  ws[`J${totalExcelRow}`] = { t: "n", f: `SUM(J${firstDataExcelRow}:J${lastDataExcelRow})` };
  ws[`H${totalExcelRow}`] = { t: "n", v: totalAps };

  ws["!cols"] = [
    { wch: 4 }, { wch: 42 }, { wch: 12 }, { wch: 22 }, { wch: 4 },
    { wch: 24 }, { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 18 }, { wch: 38 },
  ];
  ws["!merges"] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 10 } },
    { s: { r: totalExcelRow - 1, c: 1 }, e: { r: totalExcelRow - 1, c: 6 } },
  ];

  XLSX.utils.book_append_sheet(wb, ws, "OS Concluídas");

  /* ── Aba 2: Resumo por Técnico ────────────────────────────────────────── */
  const porTecnico: Record<string, { nome: string; escolas: number; aps: number }> = {};
  for (const os of osDetalhadas) {
    const key = String(os.tecnicoId ?? os.tecnicoNome);
    if (!porTecnico[key]) porTecnico[key] = { nome: os.tecnicoNome, escolas: 0, aps: 0 };
    porTecnico[key].escolas++;
    porTecnico[key].aps += os.qtdApInstalado ?? 0;
  }
  const resumoTecs = Object.values(porTecnico);

  const resumoInfoRows: any[][] = [
    ["RESUMO POR TÉCNICO"],
    [`Período: ${periodoLabel}`],
    [],
    ["Técnico", "Escolas Concluídas", "APs Instalados", "Valor por AP (R$)", "Valor Total (R$)"],
    ...resumoTecs.map(t => [t.nome, t.escolas, t.aps, "", ""]),
  ];

  const ws2 = XLSX.utils.aoa_to_sheet(resumoInfoRows);

  // Fórmulas na aba resumo (dados a partir da linha 5)
  resumoTecs.forEach((_, i) => {
    const r = 5 + i;
    ws2[`E${r}`] = { t: "n", f: `IF(D${r}="","",C${r}*D${r})` };
  });

  ws2["!cols"] = [{ wch: 28 }, { wch: 20 }, { wch: 16 }, { wch: 18 }, { wch: 18 }];
  ws2["!merges"] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: 4 } }];

  XLSX.utils.book_append_sheet(wb, ws2, "Resumo por Técnico");

  // Nome do arquivo
  const tecSlug =
    tecnicosSelecionados.length === 0 ? "todos" :
    tecnicosSelecionados.length === 1 ? tecnicosSelecionados[0].nome.replace(/\s+/g, "-").toLowerCase() :
    `${tecnicosSelecionados.length}-tecnicos`;

  XLSX.writeFile(wb, `relatorio-os-${tecSlug}-${new Date().toISOString().split("T")[0]}.xlsx`);
}

/* ─── Componente principal ─────────────────────────────────────────────────── */
export default function AdminRelatorios() {
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

  // OS detalhadas — múltiplos técnicos
  const { data: osDetalhadas, isLoading: loadingOs } = trpc.relatorios.osDetalhadas.useQuery({
    tecnicoIds: tecnicosSel.length > 0 ? tecnicosSel : undefined,
    dataInicio: dates.inicio,
    dataFim:    dates.fim,
  });

  const totalOsTabela  = osDetalhadas?.length ?? 0;
  const totalApsTabela = useMemo(
    () => (osDetalhadas ?? []).reduce((acc, os) => acc + (os.qtdApInstalado ?? 0), 0),
    [osDetalhadas]
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

      {/* ── Tabela OS Concluídas + Exportar Excel ───────────────────────────── */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              OS Concluídas
              {totalOsTabela > 0 && (
                <span className="ml-1 px-2 py-0.5 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-semibold">
                  {totalOsTabela} · {totalApsTabela} APs
                </span>
              )}
            </CardTitle>

            <button
              onClick={() => exportarExcel(osDetalhadas ?? [], tecnicosSelecionados, periodo, dataInicio, dataFim)}
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
              A planilha exportada contém a coluna <strong className="mx-1">Valor por AP (R$)</strong> — preencha o valor e o total será calculado automaticamente.
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
                    {["#","Escola","INEP","Município","APs Inst.","APs Plan.","Valor (R$)","Técnico","Data","Observação"].map(h => (
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
                      <td className="px-4 py-3 text-center">
                        {os.valorCalculado != null ? (
                          <span className="inline-block px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                            {Number(os.valorCalculado).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                          </span>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </td>
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
