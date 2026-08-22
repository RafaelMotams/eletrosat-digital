import AdminLayoutAuto from "@/components/AdminLayoutAuto";
import { trpc } from "@/lib/trpc";
import { useState, useEffect } from "react";
import { useTenantAuth } from "@/hooks/useTenantAuth";
import { School, CheckCircle, Clock, Wifi, Trophy, TrendingUp, Activity, Zap, AlertCircle, RefreshCw, Wifi as WifiIcon, WifiOff, Eye, MapPin, Users, ClipboardList, FileText, Wrench } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell
} from "recharts";

const COLORS_BAR = [
  "oklch(0.40 0.18 162)", "oklch(0.30 0.10 240)", "oklch(0.60 0.16 75)",
  "oklch(0.50 0.20 290)", "oklch(0.42 0.16 200)"
];

function StatCard({ title, value, icon: Icon, variant, loading, subtitle }: {
  title: string; value: number | string; icon: React.ElementType;
  variant: "blue" | "green" | "gold" | "purple" | "teal";
  loading?: boolean; subtitle?: string;
}) {
  return (
    <div className={`stat-card stat-${variant} animate-fade-in-up`}>
      <div className="relative z-10 flex items-start justify-between mb-4">
        <div>
          <p className="text-white/70 text-sm font-medium mb-1">{title}</p>
          {loading ? (
            <div className="h-9 w-20 bg-white/20 rounded-lg animate-pulse" />
          ) : (
            <p className="text-4xl font-bold text-white" style={{ fontFamily: "var(--font-display)" }}>{value}</p>
          )}
          {subtitle && <p className="text-white/60 text-xs mt-1">{subtitle}</p>}
        </div>
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "oklch(1 0 0 / 0.15)" }}>
          <Icon className="w-6 h-6 text-white" />
        </div>
      </div>
    </div>
  );
}

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-card border border-border rounded-xl p-3 shadow-xl text-sm">
        <p className="font-semibold text-foreground mb-2">{label}</p>
        {payload.map((p: any, i: number) => (
          <div key={i} className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ background: p.fill }} />
            <span className="text-muted-foreground">{p.name === "totalEscolas" ? "Escolas" : "APs"}:</span>
            <span className="font-bold text-foreground">{p.value}</span>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AdminDashboard() {
  const { admin } = useTenantAuth();
  const isViewer = admin?.role === 'viewer';
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  const { data: stats, isLoading: loadingStats, refetch: refetchStats, dataUpdatedAt } = trpc.dashboard.stats.useQuery(
    undefined,
    {
      refetchInterval: isOnline ? 30000 : false,
      refetchIntervalInBackground: false,
    }
  );

  useEffect(() => {
    if (dataUpdatedAt) setLastUpdate(new Date(dataUpdatedAt));
  }, [dataUpdatedAt]);
  const { data: produtividade, isLoading: loadingProd, refetch: refetchProd } = trpc.dashboard.produtividade.useQuery(
    undefined,
    {
      refetchInterval: isOnline ? 30000 : false,
      refetchIntervalInBackground: false,
    }
  );

  const handleRefresh = () => {
    refetchStats();
    refetchProd();
  };

  const pct = stats?.totalEscolas
    ? Math.round((stats.concluidas / stats.totalEscolas) * 100)
    : 0;

  // APs: usa totalApsPlanejados se disponível, senão totalApsInstalados
  const totalApsExibir = (stats as any)?.totalApsPlanejados ?? stats?.totalApsInstalados ?? 0;
  const totalApsConcluidos = (stats as any)?.totalApsConcluidos ?? 0;
  const pctAps = totalApsExibir > 0 ? Math.round((totalApsConcluidos / totalApsExibir) * 100) : 0;

  return (
    <AdminLayoutAuto title="Dashboard">
      {/* ── Banner Executivo para Viewer ── */}
      {isViewer && (
        <div className="mb-6 rounded-2xl overflow-hidden" style={{ background: "linear-gradient(135deg, oklch(0.12 0.08 280), oklch(0.16 0.06 240))", border: "1px solid oklch(0.28 0.10 280)" }}>
          <div className="p-5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, oklch(0.40 0.20 280), oklch(0.50 0.22 280))", boxShadow: "0 0 24px oklch(0.50 0.20 280 / 0.4)" }}>
              <Eye className="w-6 h-6 text-white" />
            </div>
            <div className="flex-1">
              <p className="text-white font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>Painel Executivo — Visualização em Tempo Real</p>
              <p className="text-sm mt-0.5" style={{ color: "oklch(0.65 0.06 280)" }}>Bem-vindo, <span className="font-semibold text-white">{admin?.nome}</span>. Você está acompanhando todas as instalações ao vivo.</p>
            </div>
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "oklch(0.50 0.20 162 / 0.2)", border: "1px solid oklch(0.50 0.18 162 / 0.4)" }}>
              <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "oklch(0.55 0.20 162)" }} />
              <span className="text-xs font-semibold" style={{ color: "oklch(0.55 0.20 162)" }}>AO VIVO</span>
            </div>
          </div>
          <div className="grid grid-cols-3 divide-x divide-white/10" style={{ borderTop: "1px solid oklch(0.22 0.08 280)" }}>
            <div className="p-4 text-center">
              <p className="text-2xl font-black text-white">{stats?.totalEscolas ?? 0}</p>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.06 280)" }}>Total de Unidades</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-2xl font-black" style={{ color: "oklch(0.55 0.20 162)" }}>{stats?.concluidas ?? 0}</p>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.06 280)" }}>Concluídas</p>
            </div>
            <div className="p-4 text-center">
              <p className="text-2xl font-black" style={{ color: "oklch(0.60 0.16 75)" }}>{pct}%</p>
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.06 280)" }}>Progresso Geral</p>
            </div>
          </div>
        </div>
      )}
      {/* ── Barra de status sync ── */}
      <div className="flex items-center justify-between mb-4 px-1">
        <div className="flex items-center gap-2">
          {isOnline ? (
            <><WifiIcon className="w-4 h-4 text-emerald-500" /><span className="text-xs text-emerald-600 font-medium">Online — sincronizando a cada 30s</span></>
          ) : (
            <><WifiOff className="w-4 h-4 text-amber-500" /><span className="text-xs text-amber-600 font-medium">Offline — dados em cache</span></>
          )}
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-xs text-muted-foreground">
              Atualizado: {lastUpdate.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
            </span>
          )}
          <button
            onClick={handleRefresh}
            disabled={!isOnline || loadingStats}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all"
            style={{
              background: isOnline ? "oklch(0.93 0.07 162)" : "oklch(0.94 0.015 240)",
              color: isOnline ? "oklch(0.40 0.18 162)" : "oklch(0.50 0.05 240)",
              opacity: (!isOnline || loadingStats) ? 0.5 : 1,
            }}
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loadingStats ? "animate-spin" : ""}`} />
            Atualizar
          </button>
        </div>
      </div>

      {!isViewer && (
        <section className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">Centro de atenção</p>
              <h2 className="mt-1 text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Prioridades da operação</h2>
              <p className="mt-1 text-sm text-muted-foreground">Resumo calculado somente a partir dos dados do seu painel.</p>
            </div>
            <a href="/admin/ordens" className="inline-flex items-center justify-center rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white transition hover:bg-emerald-700">Abrir ordens</a>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: "Pendências para acompanhar", value: stats?.pendentes ?? 0, detail: "Aguardam início ou definição", tone: "amber" },
              { label: "Atividades em campo", value: stats?.emAndamento ?? 0, detail: "Em execução pela equipe", tone: "blue" },
              { label: "Conclusão do plano", value: `${pct}%`, detail: `${stats?.concluidas ?? 0} unidades concluídas`, tone: "emerald" },
            ].map((item) => (
              <div key={item.label} className={`rounded-xl border p-4 ${item.tone === "amber" ? "border-amber-200 bg-amber-50" : item.tone === "blue" ? "border-blue-200 bg-blue-50" : "border-emerald-200 bg-emerald-50"}`}>
                <p className="text-xs font-semibold text-muted-foreground">{item.label}</p>
                <p className="mt-2 text-2xl font-black text-foreground">{item.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {!isViewer && (
        <section className="mb-6 rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="mb-4">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-600">Atalhos operacionais</p>
            <h2 className="mt-1 text-lg font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Trabalhe por prioridade</h2>
            <p className="mt-1 text-sm text-muted-foreground">Acesse as rotinas mais usadas da operação sem procurar no menu.</p>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { href: "/admin/ordens", icon: ClipboardList, title: "Ordens de serviço", detail: `${(stats?.pendentes ?? 0) + (stats?.emAndamento ?? 0)} atividade(s) aberta(s)`, tone: "text-blue-700 bg-blue-50 border-blue-200" },
              { href: "/admin/manutencao", icon: Wrench, title: "Manutenção", detail: "Atribuir, acompanhar e concluir", tone: "text-amber-700 bg-amber-50 border-amber-200" },
              { href: "/admin/relatorios", icon: FileText, title: "Relatórios", detail: "Planejado, instalado e exportações", tone: "text-emerald-700 bg-emerald-50 border-emerald-200" },
            ].map((action) => {
              const Icon = action.icon;
              return <a key={action.href} href={action.href} className={`group rounded-xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm ${action.tone}`}>
                <Icon className="h-5 w-5" />
                <p className="mt-3 text-sm font-bold">{action.title}</p>
                <p className="mt-1 text-xs opacity-80">{action.detail}</p>
              </a>;
            })}
          </div>
        </section>
      )}

      {/* ── KPI Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          title="Total de Escolas"
          value={stats?.totalEscolas ?? 0}
          icon={School}
          variant="blue"
          loading={loadingStats}
          subtitle="Cadastradas no sistema"
        />
        <StatCard
          title="Concluídas"
          value={stats?.concluidas ?? 0}
          icon={CheckCircle}
          variant="green"
          loading={loadingStats}
          subtitle={`${pct}% do total`}
        />
        <StatCard
          title="Pendentes"
          value={(stats?.pendentes ?? 0) + (stats?.emAndamento ?? 0)}
          icon={Clock}
          variant="gold"
          loading={loadingStats}
          subtitle={`${stats?.emAndamento ?? 0} em andamento`}
        />
        <StatCard
          title="APs Planejados"
          value={totalApsExibir}
          icon={Wifi}
          variant="purple"
          loading={loadingStats}
          subtitle={`${totalApsConcluidos} já instalados (${pctAps}%)`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* ── Progresso Geral ── */}
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm animate-fade-in-up delay-100">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.93 0.07 162)" }}>
              <TrendingUp className="w-4 h-4" style={{ color: "oklch(0.40 0.18 162)" }} />
            </div>
            <h3 className="font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Progresso Geral</h3>
          </div>

          {loadingStats ? (
            <div className="space-y-3">
              <div className="h-16 bg-muted rounded-xl animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse" />
              <div className="h-4 bg-muted rounded animate-pulse w-3/4" />
            </div>
          ) : (
            <>
              <div className="flex items-end justify-between mb-3">
                <div>
                  <span className="text-5xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>{pct}</span>
                  <span className="text-2xl font-bold text-muted-foreground">%</span>
                </div>
                <span className="text-sm text-muted-foreground pb-1">escolas concluídas</span>
              </div>

              <div className="w-full rounded-full h-3 overflow-hidden mb-4" style={{ background: "oklch(0.92 0.015 240)" }}>
                <div
                  className="h-3 rounded-full transition-all duration-700 ease-out"
                  style={{
                    width: `${pct}%`,
                    background: "linear-gradient(90deg, oklch(0.40 0.18 162), oklch(0.55 0.20 162))"
                  }}
                />
              </div>

              {/* Mini stats escolas */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                {[
                  { label: "Concluídas", value: stats?.concluidas ?? 0, color: "oklch(0.40 0.18 162)", bg: "oklch(0.94 0.06 162)" },
                  { label: "Andamento", value: stats?.emAndamento ?? 0, color: "oklch(0.30 0.10 240)", bg: "oklch(0.94 0.04 240)" },
                  { label: "Pendentes", value: stats?.pendentes ?? 0, color: "oklch(0.55 0.16 75)", bg: "oklch(0.96 0.05 75)" },
                ].map(s => (
                  <div key={s.label} className="rounded-xl p-2.5 text-center" style={{ background: s.bg }}>
                    <p className="text-lg font-bold" style={{ color: s.color, fontFamily: "var(--font-display)" }}>{s.value}</p>
                    <p className="text-xs font-medium mt-0.5" style={{ color: s.color, opacity: 0.8 }}>{s.label}</p>
                  </div>
                ))}
              </div>

              {/* Progresso APs */}
              {totalApsExibir > 0 && (
                <div className="rounded-xl p-3" style={{ background: "oklch(0.94 0.04 240)" }}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1.5">
                      <Wifi className="w-3.5 h-3.5" style={{ color: "oklch(0.30 0.10 240)" }} />
                      <span className="text-xs font-semibold" style={{ color: "oklch(0.30 0.10 240)" }}>APs Instalados</span>
                    </div>
                    <span className="text-xs font-bold" style={{ color: "oklch(0.30 0.10 240)" }}>
                      {totalApsConcluidos} / {totalApsExibir}
                    </span>
                  </div>
                  <div className="w-full rounded-full h-2 overflow-hidden" style={{ background: "oklch(0.88 0.04 240)" }}>
                    <div
                      className="h-2 rounded-full transition-all duration-700"
                      style={{
                        width: `${pctAps}%`,
                        background: "linear-gradient(90deg, oklch(0.30 0.10 240), oklch(0.50 0.18 162))"
                      }}
                    />
                  </div>
                  <p className="text-xs mt-1.5" style={{ color: "oklch(0.45 0.06 240)", opacity: 0.8 }}>
                    {pctAps}% dos APs planejados instalados
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* ── Produtividade por Técnico ── */}
        <div className="lg:col-span-2 bg-card rounded-2xl border border-border p-6 shadow-sm animate-fade-in-up delay-200">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.94 0.04 240)" }}>
              <Activity className="w-4 h-4" style={{ color: "oklch(0.30 0.10 240)" }} />
            </div>
            <h3 className="font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Produtividade por Técnico</h3>
          </div>

          {loadingProd ? (
            <div className="h-52 bg-muted rounded-xl animate-pulse" />
          ) : !produtividade || produtividade.length === 0 ? (
            <div className="h-52 flex flex-col items-center justify-center gap-3 text-muted-foreground">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center" style={{ background: "oklch(0.94 0.015 240)" }}>
                <Activity className="w-7 h-7 opacity-40" />
              </div>
              <p className="text-sm">Nenhum dado de produtividade ainda</p>
              <p className="text-xs opacity-60">Conclua instalações para ver o gráfico</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={210}>
              <BarChart data={produtividade} margin={{ top: 4, right: 4, left: -16, bottom: 0 }} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="oklch(0.92 0.015 240)" vertical={false} />
                <XAxis
                  dataKey="tecnicoNome"
                  tick={{ fontSize: 11, fill: "oklch(0.50 0.05 240)", fontFamily: "var(--font-sans)" }}
                  tickFormatter={(v) => v.split(" ")[0]}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "oklch(0.50 0.05 240)", fontFamily: "var(--font-sans)" }}
                  axisLine={false}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ fill: "oklch(0.96 0.01 240)" }} />
                <Bar dataKey="totalEscolas" name="totalEscolas" radius={[6, 6, 0, 0]} maxBarSize={32}>
                  {produtividade.map((_, i) => (
                    <Cell key={i} fill={COLORS_BAR[i % COLORS_BAR.length]} />
                  ))}
                </Bar>
                <Bar dataKey="totalAps" name="totalAps" fill="oklch(0.50 0.18 162)" radius={[6, 6, 0, 0]} maxBarSize={32} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* ── Ranking de Técnicos ── */}
      {produtividade && produtividade.length > 0 && (
        <div className="bg-card rounded-2xl border border-border p-6 shadow-sm animate-fade-in-up delay-300">
          <div className="flex items-center gap-2 mb-5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "oklch(0.96 0.05 75)" }}>
              <Trophy className="w-4 h-4" style={{ color: "oklch(0.55 0.16 75)" }} />
            </div>
            <h3 className="font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>Ranking de Técnicos</h3>
          </div>
          <div className="space-y-2.5">
            {produtividade.map((t, i) => {
              const medals = [
                { bg: "oklch(0.96 0.05 75)", color: "oklch(0.55 0.16 75)", label: "🥇" },
                { bg: "oklch(0.94 0.015 240)", color: "oklch(0.45 0.06 240)", label: "🥈" },
                { bg: "oklch(0.96 0.06 50)", color: "oklch(0.55 0.14 50)", label: "🥉" },
              ];
              const medal = medals[i] ?? { bg: "oklch(0.94 0.015 240)", color: "oklch(0.50 0.05 240)", label: `${i + 1}` };
              const maxEscolas = produtividade[0]?.totalEscolas ?? 1;
              const barWidth = Math.round((t.totalEscolas / maxEscolas) * 100);
              return (
                <div key={t.tecnicoId} className="flex items-center gap-4 p-3.5 rounded-xl transition-colors hover:bg-muted/40">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
                    style={{ background: medal.bg, color: medal.color }}>
                    {medal.label}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="font-semibold text-sm text-foreground truncate">{t.tecnicoNome}</p>
                      <div className="flex gap-3 text-xs flex-shrink-0 ml-2">
                        <span className="text-muted-foreground">{t.totalEscolas} escola{t.totalEscolas !== 1 ? "s" : ""}</span>
                        <span className="font-bold" style={{ color: "oklch(0.40 0.18 162)" }}>{t.totalAps} APs</span>
                      </div>
                    </div>
                    <div className="w-full rounded-full h-1.5 overflow-hidden" style={{ background: "oklch(0.92 0.015 240)" }}>
                      <div className="h-1.5 rounded-full transition-all duration-500"
                        style={{ width: `${barWidth}%`, background: "linear-gradient(90deg, oklch(0.40 0.18 162), oklch(0.55 0.20 162))" }} />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Status rápido ── */}
      <div className="mt-6 p-4 rounded-2xl border border-border flex items-center gap-3 animate-fade-in-up delay-400"
        style={{ background: "linear-gradient(135deg, oklch(0.97 0.008 240), oklch(0.98 0.004 162))" }}>
        <div className="w-2 h-2 rounded-full animate-pulse-dot flex-shrink-0" style={{ background: "oklch(0.50 0.18 162)" }} />
        <p className="text-sm text-muted-foreground">
          Sistema sincronizado em tempo real ·{" "}
          <span className="font-semibold text-foreground">{stats?.totalEscolas ?? 0} escolas</span> cadastradas ·{" "}
          <span className="font-semibold" style={{ color: "oklch(0.40 0.18 162)" }}>{totalApsExibir} APs</span> planejados ·{" "}
          <span className="font-semibold" style={{ color: "oklch(0.40 0.18 162)" }}>{totalApsConcluidos} APs</span> instalados
        </p>
        <Zap className="w-4 h-4 ml-auto flex-shrink-0" style={{ color: "oklch(0.55 0.16 75)" }} />
      </div>
    </AdminLayoutAuto>
  );
}
