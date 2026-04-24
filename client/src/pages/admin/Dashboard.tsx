import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { School, CheckCircle, Clock, Wifi, Trophy, TrendingUp } from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function AdminDashboard() {
  const { data: stats, isLoading: loadingStats } = trpc.dashboard.stats.useQuery();
  const { data: produtividade, isLoading: loadingProd } = trpc.dashboard.produtividade.useQuery();

  const kpis = [
    {
      title: "Total de Escolas",
      value: stats?.totalEscolas ?? 0,
      icon: School,
      color: "text-blue-600",
      bg: "bg-blue-50",
      border: "border-blue-100",
    },
    {
      title: "Concluídas",
      value: stats?.concluidas ?? 0,
      icon: CheckCircle,
      color: "text-green-600",
      bg: "bg-green-50",
      border: "border-green-100",
    },
    {
      title: "Pendentes",
      value: stats?.pendentes ?? 0,
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      border: "border-yellow-100",
    },
    {
      title: "APs Instalados",
      value: stats?.totalApsInstalados ?? 0,
      icon: Wifi,
      color: "text-purple-600",
      bg: "bg-purple-50",
      border: "border-purple-100",
    },
  ];

  const pct = stats?.totalEscolas
    ? Math.round((stats.concluidas / stats.totalEscolas) * 100)
    : 0;

  return (
    <AdminLayout title="Dashboard">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {kpis.map((kpi) => (
          <Card key={kpi.title} className={`border ${kpi.border}`}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-medium text-muted-foreground">{kpi.title}</p>
                <div className={`w-9 h-9 ${kpi.bg} rounded-lg flex items-center justify-center`}>
                  <kpi.icon className={`w-5 h-5 ${kpi.color}`} />
                </div>
              </div>
              {loadingStats ? (
                <div className="h-8 bg-muted rounded animate-pulse" />
              ) : (
                <p className="text-3xl font-bold text-foreground">{kpi.value}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Progresso geral */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-green-500" />
              Progresso Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingStats ? (
              <div className="space-y-3">
                <div className="h-4 bg-muted rounded animate-pulse" />
                <div className="h-8 bg-muted rounded animate-pulse" />
              </div>
            ) : (
              <>
                <div className="flex items-end justify-between mb-2">
                  <span className="text-4xl font-bold text-foreground">{pct}%</span>
                  <span className="text-sm text-muted-foreground">concluído</span>
                </div>
                <div className="w-full bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className="bg-green-500 h-3 rounded-full transition-all duration-500"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                  <div className="bg-green-50 border border-green-100 rounded-lg p-2 text-center">
                    <p className="font-bold text-green-700">{stats?.concluidas ?? 0}</p>
                    <p className="text-green-600 text-xs">Concluídas</p>
                  </div>
                  <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-2 text-center">
                    <p className="font-bold text-yellow-700">{stats?.pendentes ?? 0}</p>
                    <p className="text-yellow-600 text-xs">Pendentes</p>
                  </div>
                </div>
                {(stats?.emAndamento ?? 0) > 0 && (
                  <div className="mt-2 bg-blue-50 border border-blue-100 rounded-lg p-2 text-center">
                    <p className="font-bold text-blue-700">{stats?.emAndamento}</p>
                    <p className="text-blue-600 text-xs">Em andamento</p>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>

        {/* Produtividade por técnico */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Produtividade por Técnico
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loadingProd ? (
              <div className="h-48 bg-muted rounded animate-pulse" />
            ) : !produtividade || produtividade.length === 0 ? (
              <div className="h-48 flex items-center justify-center text-muted-foreground text-sm">
                Nenhum dado de produtividade disponível ainda.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={produtividade} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis
                    dataKey="tecnicoNome"
                    tick={{ fontSize: 11 }}
                    tickFormatter={(v) => v.split(" ")[0]}
                  />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value, name) => [
                      value,
                      name === "totalEscolas" ? "Escolas" : "APs",
                    ]}
                  />
                  <Bar dataKey="totalEscolas" fill="#1e3a5f" name="totalEscolas" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="totalAps" fill="#22c55e" name="totalAps" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Ranking */}
      {produtividade && produtividade.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-500" />
              Ranking de Técnicos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {produtividade.map((t, i) => (
                <div key={t.tecnicoId} className="flex items-center gap-4 p-3 rounded-lg bg-muted/40">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm flex-shrink-0 ${
                    i === 0 ? "bg-yellow-100 text-yellow-700" :
                    i === 1 ? "bg-gray-100 text-gray-600" :
                    i === 2 ? "bg-orange-100 text-orange-600" :
                    "bg-muted text-muted-foreground"
                  }`}>
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{t.tecnicoNome}</p>
                  </div>
                  <div className="flex gap-4 text-sm flex-shrink-0">
                    <span className="text-muted-foreground">{t.totalEscolas} escolas</span>
                    <span className="text-green-600 font-medium">{t.totalAps} APs</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </AdminLayout>
  );
}
