import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Trophy, BarChart3, School, Wifi, TrendingUp, Calendar, ClipboardList, Download } from "lucide-react";
import { useState, useMemo } from "react";

function getDateRange(periodo: string, dataInicio: string, dataFim: string) {
  const now = new Date();
  if (periodo === "dia") {
    const d = now.toISOString().split("T")[0];
    return { inicio: new Date(d + "T00:00:00"), fim: new Date(d + "T23:59:59") };
  }
  if (periodo === "semana") {
    const start = new Date(now);
    start.setDate(now.getDate() - 7);
    return { inicio: start, fim: now };
  }
  if (periodo === "mes") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { inicio: start, fim: now };
  }
  return {
    inicio: new Date(dataInicio + "T00:00:00"),
    fim: new Date(dataFim + "T23:59:59"),
  };
}

function formatDate(d: Date | string | null | undefined) {
  if (!d) return "—";
  try {
    const date = d instanceof Date ? d : new Date(d);
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" });
  } catch {
    return "—";
  }
}

const SELECT_CLASS =
  "w-full h-10 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2";

export default function AdminRelatorios() {
  const { data: tecnicos } = trpc.tecnicos.list.useQuery();
  const { data: ranking } = trpc.relatorios.ranking.useQuery();

  const [tecnicoSel, setTecnicoSel] = useState("");
  const [periodo, setPeriodo] = useState("geral");
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split("T")[0]);

  // Estabilizar datas como strings ISO ou null
  const dates = useMemo(() => {
    if (periodo === "geral") return { inicio: null as string | null, fim: null as string | null };
    const range = getDateRange(periodo, dataInicio, dataFim);
    return {
      inicio: range.inicio ? range.inicio.toISOString() : null,
      fim: range.fim ? range.fim.toISOString() : null,
    };
  }, [periodo, dataInicio, dataFim]);

  const tecnicoId = useMemo(() => (tecnicoSel ? Number(tecnicoSel) : 0), [tecnicoSel]);

  // Resumo do técnico (cards de totais)
  const { data: relatorio, isLoading: loadingRelatorio } = trpc.relatorios.tecnico.useQuery(
    { tecnicoId, dataInicio: dates.inicio, dataFim: dates.fim },
    { enabled: tecnicoId > 0 }
  );

  // Tabela detalhada de OS concluídas
  const { data: osDetalhadas, isLoading: loadingOs } = trpc.relatorios.osDetalhadas.useQuery({
    tecnicoId: tecnicoId > 0 ? tecnicoId : undefined,
    dataInicio: dates.inicio,
    dataFim: dates.fim,
  });

  // Totalizadores da tabela
  const totalOsTabela = osDetalhadas?.length ?? 0;
  const totalApsTabela = useMemo(
    () => (osDetalhadas ?? []).reduce((acc, os) => acc + (os.qtdApInstalado ?? 0), 0),
    [osDetalhadas]
  );

  // Exportar CSV
  function exportarCSV() {
    if (!osDetalhadas || osDetalhadas.length === 0) return;
    const header = ["Escola", "INEP", "APs Instalados", "Município", "Técnico", "Data Conclusão", "Observação"];
    const rows = osDetalhadas.map((os) => [
      `"${os.escolaNome}"`,
      os.inep,
      os.qtdApInstalado,
      `"${os.municipio}"`,
      `"${os.tecnicoNome}"`,
      formatDate(os.dataConclusao),
      `"${os.observacao}"`,
    ]);
    const csv = [header.join(","), ...rows.map(r => r.join(","))].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    const tecnicoNome = tecnicos?.find(t => t.id === tecnicoId)?.nome ?? "todos";
    a.download = `relatorio-os-${tecnicoNome}-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminLayout title="Relatórios">
      {/* Filtros */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-primary" />
            Filtros
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Técnico</label>
              <select value={tecnicoSel} onChange={e => setTecnicoSel(e.target.value)} className={SELECT_CLASS}>
                <option value="">Todos os técnicos</option>
                {tecnicos?.map(t => (
                  <option key={t.id} value={String(t.id)}>{t.nome}</option>
                ))}
              </select>
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

      {/* Cards de resumo (só aparece quando técnico selecionado) */}
      {tecnicoId > 0 && (
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Resultado — {tecnicos?.find(t => t.id === tecnicoId)?.nome}
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
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-center">
                  <School className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-3xl font-bold">{relatorio.totalEscolas}</p>
                  <p className="text-xs text-muted-foreground mt-1">Escolas concluídas</p>
                </div>
                <div className="bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-xl p-4 text-center">
                  <Wifi className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold">{relatorio.totalAps}</p>
                  <p className="text-xs text-muted-foreground mt-1">APs instalados</p>
                </div>
                <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-900/30 rounded-xl p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                  <p className="text-3xl font-bold">{relatorio.mediaPorDia}</p>
                  <p className="text-xs text-muted-foreground mt-1">Média/dia</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tabela detalhada de OS concluídas */}
      <Card className="mb-6">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle className="text-base flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-primary" />
              OS Concluídas
              {totalOsTabela > 0 && (
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {totalOsTabela} registro{totalOsTabela !== 1 ? "s" : ""} · {totalApsTabela} APs
                </span>
              )}
            </CardTitle>
            {totalOsTabela > 0 && (
              <button
                onClick={exportarCSV}
                className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors font-medium"
              >
                <Download className="w-3.5 h-3.5" />
                Exportar CSV
              </button>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {loadingOs ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map(i => <div key={i} className="h-10 bg-muted rounded animate-pulse" />)}
            </div>
          ) : !osDetalhadas || osDetalhadas.length === 0 ? (
            <div className="py-16 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
              <ClipboardList className="w-10 h-10 opacity-20" />
              <span>Nenhuma OS concluída encontrada para os filtros selecionados.</span>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">#</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Escola</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">INEP</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Município/UF</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">APs Inst.</th>
                    <th className="text-center px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">APs Plan.</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Técnico</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Data</th>
                    <th className="text-left px-4 py-3 font-semibold text-muted-foreground text-xs uppercase tracking-wide">Observação</th>
                  </tr>
                </thead>
                <tbody>
                  {osDetalhadas.map((os, i) => (
                    <tr
                      key={os.osId}
                      className="border-b last:border-0 hover:bg-muted/30 transition-colors"
                    >
                      <td className="px-4 py-3 text-muted-foreground">{i + 1}</td>
                      <td className="px-4 py-3 font-medium max-w-[200px]">
                        <span className="block truncate" title={os.escolaNome}>{os.escolaNome}</span>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{os.inep}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs">
                        {os.municipio}{os.uf ? `/${os.uf}` : ""}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 dark:bg-green-950/30 text-green-700 dark:text-green-400 font-bold text-sm">
                          {os.qtdApInstalado}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{os.qtdApPlanejado}</td>
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
                      Total ({totalOsTabela} escolas)
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-200 dark:bg-green-900/40 text-green-800 dark:text-green-300 font-bold text-sm">
                        {totalApsTabela}
                      </span>
                    </td>
                    <td colSpan={4} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Ranking geral */}
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
              <span>Nenhum dado disponível ainda. Conclua algumas OS para ver o ranking.</span>
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ranking} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" />
                  <XAxis
                    dataKey="tecnicoNome"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v: string) => v.split(" ")[0]}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    label={{ value: "Escolas", angle: -90, position: "insideLeft", offset: 20, style: { fontSize: 10 } }}
                  />
                  <Tooltip
                    formatter={(v: number, n: string) => [v, n === "totalEscolas" ? "Escolas concluídas" : "APs instalados"]}
                  />
                  <Bar dataKey="totalEscolas" fill="#1e3a5f" name="totalEscolas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalAps" fill="#22c55e" name="totalAps" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {ranking.map((t, i) => (
                  <div
                    key={t.tecnicoId}
                    className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors"
                  >
                    <div
                      className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                        i === 0
                          ? "bg-yellow-100 text-yellow-700"
                          : i === 1
                          ? "bg-gray-100 text-gray-600"
                          : i === 2
                          ? "bg-orange-100 text-orange-600"
                          : "bg-muted text-muted-foreground"
                      }`}
                    >
                      {i + 1}
                    </div>
                    <p className="flex-1 font-medium text-sm">{t.tecnicoNome}</p>
                    <span className="text-sm text-muted-foreground">
                      {t.totalEscolas} escola{t.totalEscolas !== 1 ? "s" : ""} concluída{t.totalEscolas !== 1 ? "s" : ""}
                    </span>
                    <span className="text-sm text-green-600 font-semibold">{t.totalAps} APs</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
