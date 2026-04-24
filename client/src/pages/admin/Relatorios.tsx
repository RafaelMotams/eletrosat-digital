import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";
import { Trophy, BarChart3, School, Wifi, TrendingUp } from "lucide-react";
import { useState } from "react";

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

  function calcDates() {
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
    return { inicio: new Date(dataInicio + "T00:00:00"), fim: new Date(dataFim + "T23:59:59") };
  }

  const dates = calcDates();
  const { data: relatorio, isLoading } = trpc.relatorios.tecnico.useQuery(
    { tecnicoId: Number(tecnicoSel), dataInicio: dates.inicio, dataFim: dates.fim },
    { enabled: !!tecnicoSel }
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
          <CardContent className="space-y-3">
            <div>
              <label className="text-sm font-medium mb-1 block">Técnico</label>
              <Select value={tecnicoSel} onValueChange={setTecnicoSel}>
                <SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
                <SelectContent>
                  {tecnicos?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Período</label>
              <Select value={periodo} onValueChange={setPeriodo}>
                <SelectTrigger><SelectValue /></SelectTrigger>
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
                <div><label className="text-sm font-medium mb-1 block">Data início</label><Input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)} /></div>
                <div><label className="text-sm font-medium mb-1 block">Data fim</label><Input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)} /></div>
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
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">
                Selecione um técnico para ver o relatório.
              </div>
            ) : isLoading ? (
              <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted rounded animate-pulse" />)}</div>
            ) : !relatorio ? (
              <div className="h-32 flex items-center justify-center text-muted-foreground text-sm">Sem dados para o período.</div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-primary/5 border border-primary/10 rounded-xl p-4 text-center">
                  <School className="w-6 h-6 text-primary mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">{relatorio.totalEscolas}</p>
                  <p className="text-xs text-muted-foreground">Escolas concluídas</p>
                </div>
                <div className="bg-green-50 border border-green-100 rounded-xl p-4 text-center">
                  <Wifi className="w-6 h-6 text-green-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">{relatorio.totalAps}</p>
                  <p className="text-xs text-muted-foreground">APs instalados</p>
                </div>
                <div className="bg-yellow-50 border border-yellow-100 rounded-xl p-4 text-center">
                  <TrendingUp className="w-6 h-6 text-yellow-600 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-foreground">{relatorio.mediaPorDia}</p>
                  <p className="text-xs text-muted-foreground">Média/dia</p>
                </div>
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
            <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
              Nenhum dado disponível ainda. Conclua algumas OS para ver o ranking.
            </div>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={ranking} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="tecnicoNome" tick={{ fontSize: 11 }} tickFormatter={(v) => v.split(" ")[0]} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(v, n) => [v, n === "totalEscolas" ? "Escolas" : "APs"]} />
                  <Bar dataKey="totalEscolas" fill="#1e3a5f" name="totalEscolas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalAps" fill="#22c55e" name="totalAps" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
              <div className="mt-4 space-y-2">
                {ranking.map((t, i) => (
                  <div key={t.tecnicoId} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                      i === 0 ? "bg-yellow-100 text-yellow-700" : i === 1 ? "bg-gray-100 text-gray-600" : i === 2 ? "bg-orange-100 text-orange-600" : "bg-muted text-muted-foreground"
                    }`}>{i + 1}</div>
                    <p className="flex-1 font-medium text-sm">{t.tecnicoNome}</p>
                    <span className="text-sm text-muted-foreground">{t.totalEscolas} escolas</span>
                    <span className="text-sm text-green-600 font-medium">{t.totalAps} APs</span>
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
