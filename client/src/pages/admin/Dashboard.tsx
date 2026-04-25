import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { School, CheckCircle, Clock, Wifi, Trophy, TrendingUp, Activity, Zap, AlertCircle } from "lucide-react";
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
  const { data: stats, isLoading: loadingStats } = trpc.dashboard.stats.useQuery();
  const { data: produtividade, isLoading: loadingProd } = trpc.dashboard.produtividade.useQuery();

  const pct = stats?.totalEscolas
    ? Math.round((stats.concluidas / stats.totalEscolas) * 100)
    : 0;

  // APs: usa totalApsPlanejados se disponível, senão totalApsInstalados
  const totalApsExibir = (stats as any)?.totalApsPlanejados ?? stats?.totalApsInstalados ?? 0;
  const totalApsConcluidos = (stats as any)?.totalApsConcluidos ?? 0;
  const pctAps = totalApsExibir > 0 ? Math.round((totalApsConcluidos / totalApsExibir) * 100) : 0;

  return (
    <AdminLayout title="Dashboard">
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
    </AdminLayout>
  );
}
