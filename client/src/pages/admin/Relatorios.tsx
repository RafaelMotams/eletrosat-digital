import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Trophy, BarChart3, School, Wifi, TrendingUp, Calendar } from "lucide-react";
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
  // custom
  return {
    inicio: new Date(dataInicio + "T00:00:00"),
    fim: new Date(dataFim + "T23:59:59"),
  };
}

export default function AdminRelatorios() {
  const { data: tecnicos } = trpc.tecnicos.list.useQuery();
  const { data: ranking } = trpc.relatorios.ranking.useQuery();

  const [tecnicoSel, setTecnicoSel] = useState("");
  const [periodo, setPeriodo] = useState("mes");
  const [dataInicio, setDataInicio] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [dataFim, setDataFim] = useState(() => new Date().toISOString().split("T")[0]);

  // ✅ Estabilizar as datas com useMemo para evitar novas referências a cada render
  const dates = useMemo(
    () => getDateRange(periodo, dataInicio, dataFim),
    [periodo, dataInicio, dataFim]
  );

  // ✅ Estabilizar o tecnicoId como número
  const tecnicoId = useMemo(() => (tecnicoSel ? Number(tecnicoSel) : 0), [tecnicoSel]);

  const { data: relatorio, isLoading } = trpc.relatorios.tecnico.useQuery(
    { tecnicoId, dataInicio: dates.inicio, dataFim: dates.fim },
    { enabled: tecnicoId > 0 }
  );

  return (
    <AdminLayout title="Relatórios">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Filtros */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Filtros
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium mb-1.5 block">Técnico</label>
              <Select value={tecnicoSel} onValueChange={setTecnicoSel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o técnico" />
                </SelectTrigger>
                <SelectContent>
                  {tecnicos?.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.nome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1.5 block">Período</label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="dia">Hoje</SelectItem>
                  <SelectItem value="semana">Última semana</SelectItem>
                  <SelectItem value="mes">Este mês</SelectItem>
                  <SelectItem value="custom">Personalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {periodo === "custom" && (
              <>
                <div>
                  <label className="text-sm font-medium mb-1.5 block flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Data início
                  </label>
                  <Input
                    type="date"
                    value={dataInicio}
                    onChange={e => setDataInicio(e.target.value)}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium mb-1.5 block flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5" /> Data fim
                  </label>
                  <Input
                    type="date"
                    value={dataFim}
                    onChange={e => setDataFim(e.target.value)}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Resultado do técnico */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Resultado do Técnico
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!tecnicoSel ? (
              <div className="h-40 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <BarChart3 className="w-8 h-8 opacity-30" />
                <span>Selecione um técnico para ver o relatório.</span>
              </div>
            ) : isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map(i => (
                  <div key={i} className="h-16 bg-muted rounded-xl animate-pulse" />
                ))}
              </div>
            ) : !relatorio ? (
              <div className="h-40 flex flex-col items-center justify-center text-muted-foreground text-sm gap-2">
                <School className="w-8 h-8 opacity-30" />
                <span>Sem dados para o período selecionado.</span>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-center">
                    <School className="w-6 h-6 text-primary mx-auto mb-2" />
                    <p className="text-3xl font-bold text-foreground">{relatorio.totalEscolas}</p>
                    <p className="text-xs text-muted-foreground mt-1">Escolas concluídas</p>
                  </div>
                  <div className="bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/30 rounded-xl p-4 text-center">
                    <Wifi className="w-6 h-6 text-green-600 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-foreground">{relatorio.totalAps}</p>
                    <p className="text-xs text-muted-foreground mt-1">APs instalados</p>
                  </div>
                  <div className="bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-100 dark:border-yellow-900/30 rounded-xl p-4 text-center">
                    <TrendingUp className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                    <p className="text-3xl font-bold text-foreground">{relatorio.mediaPorDia}</p>
                    <p className="text-xs text-muted-foreground mt-1">Média/dia</p>
                  </div>
                </div>

                {relatorio.totalEscolas > 0 && (
                  <div className="rounded-xl border bg-muted/30 p-3">
                    <p className="text-xs text-muted-foreground mb-2 font-medium">Progresso do período</p>
                    <div className="w-full bg-muted rounded-full h-2">
                      <div
                        className="bg-green-500 h-2 rounded-full transition-all"
                        style={{ width: `${Math.min(100, (relatorio.totalEscolas / Math.max(1, relatorio.totalEscolas)) * 100)}%` }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground mt-1.5">
                      {relatorio.totalEscolas} escola{relatorio.totalEscolas !== 1 ? "s" : ""} concluída{relatorio.totalEscolas !== 1 ? "s" : ""} · {relatorio.totalAps} AP{relatorio.totalAps !== 1 ? "s" : ""} instalado{relatorio.totalAps !== 1 ? "s" : ""}
                    </p>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

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
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(v: number, n: string) => [v, n === "totalEscolas" ? "Escolas" : "APs"]}
                  />
                  <Bar dataKey="totalEscolas" fill="#1e3a5f" name="totalEscolas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalAps" fill="#22c55e" name="totalAps" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {ranking.map((t, i) => (
                  <div key={t.tecnicoId} className="flex items-center gap-3 p-3 rounded-xl bg-muted/40 hover:bg-muted/60 transition-colors">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      i === 0
                        ? "bg-yellow-100 text-yellow-700"
                        : i === 1
                        ? "bg-gray-100 text-gray-600"
                        : i === 2
                        ? "bg-orange-100 text-orange-600"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {i + 1}
                    </div>
                    <p className="flex-1 font-medium text-sm">{t.tecnicoNome}</p>
                    <span className="text-sm text-muted-foreground">{t.totalEscolas} escola{t.totalEscolas !== 1 ? "s" : ""}</span>
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
