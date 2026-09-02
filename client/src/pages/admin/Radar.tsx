import AdminLayoutAuto from "@/components/AdminLayoutAuto";
import { OperationState } from "@/components/OperationState";
import { trpc } from "@/lib/trpc";
import { Link } from "wouter";
import { useMemo, useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  Boxes,
  CheckCircle2,
  ClipboardList,
  MapPin,
  PhoneOff,
  Radar,
  RefreshCw,
  ShieldAlert,
  UserX,
  Wrench,
  WifiOff,
  Users,
} from "lucide-react";
import type { SeveridadeImpedimento, TipoImpedimento } from "@shared/radarImpedimentos";

type FiltroSeveridade = "todas" | SeveridadeImpedimento;
type FiltroTipo = "todos" | TipoImpedimento;

const SEVERIDADE_STYLE: Record<SeveridadeImpedimento, { badge: string; bar: string; label: string }> = {
  critico: { badge: "bg-red-600/15 text-red-700 border-red-600/30", bar: "bg-red-600", label: "Crítico" },
  alto: { badge: "bg-amber-500/15 text-amber-800 border-amber-500/30", bar: "bg-amber-500", label: "Alto" },
  medio: { badge: "bg-sky-500/15 text-sky-800 border-sky-500/30", bar: "bg-sky-500", label: "Médio" },
  baixo: { badge: "bg-slate-500/15 text-slate-700 border-slate-500/30", bar: "bg-slate-500", label: "Baixo" },
};

const TIPO_META: Record<TipoImpedimento, { label: string; icon: typeof Radar }> = {
  escola_sem_coordenadas: { label: "Sem GPS", icon: MapPin },
  escola_sem_contato: { label: "Sem contato", icon: PhoneOff },
  escola_sem_tecnico: { label: "Sem técnico", icon: UserX },
  os_parada: { label: "OS parada", icon: ClipboardList },
  deficit_ap: { label: "Déficit de AP", icon: WifiOff },
  evidencia_ausente: { label: "Sem evidência", icon: ShieldAlert },
  manutencao_parada: { label: "Manutenção", icon: Wrench },
  estoque_critico: { label: "Estoque", icon: Boxes },
  reposicao_aberta: { label: "Reposição", icon: Boxes },
  tecnico_sobrecarga: { label: "Sobrecarga", icon: Users },
};

function HealthRing({ score }: { score: number }) {
  const color = score >= 80 ? "#059669" : score >= 55 ? "#d97706" : "#dc2626";
  const r = 42;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, score)) / 100) * c;

  return (
    <div className="relative grid h-28 w-28 place-items-center">
      <svg width="112" height="112" viewBox="0 0 112 112" className="absolute inset-0 -rotate-90" aria-hidden>
        <circle cx="56" cy="56" r={r} fill="none" stroke="currentColor" strokeWidth="10" className="text-muted/40" />
        <circle
          cx="56"
          cy="56"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 600ms ease" }}
        />
      </svg>
      <div className="text-center">
        <p className="text-3xl font-bold tabular-nums text-foreground" style={{ fontFamily: "var(--font-display)" }}>{score}</p>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">saúde</p>
      </div>
    </div>
  );
}

export default function AdminRadar() {
  const [filtroSeveridade, setFiltroSeveridade] = useState<FiltroSeveridade>("todas");
  const [filtroTipo, setFiltroTipo] = useState<FiltroTipo>("todos");

  const scan = trpc.radar.scan.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const impedimentos = useMemo(() => {
    const lista = scan.data?.impedimentos ?? [];
    return lista.filter((item) => {
      if (filtroSeveridade !== "todas" && item.severidade !== filtroSeveridade) return false;
      if (filtroTipo !== "todos" && item.tipo !== filtroTipo) return false;
      return true;
    });
  }, [scan.data?.impedimentos, filtroSeveridade, filtroTipo]);

  const resumo = scan.data?.resumo;
  const geradoEm = resumo?.geradoEm
    ? new Date(resumo.geradoEm).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
    : null;

  if (scan.isLoading) {
    return (
      <AdminLayoutAuto title="Radar de Impedimentos">
        <OperationState kind="loading" title="Varrendo operação" description="Cruzando escolas, OS, manutenção e estoque desta empresa." />
      </AdminLayoutAuto>
    );
  }

  if (scan.error) {
    return (
      <AdminLayoutAuto title="Radar de Impedimentos">
        <OperationState
          kind="error"
          title="Não foi possível gerar o Radar"
          description={scan.error.message || "Confira a sessão e tente novamente."}
          actionLabel="Tentar novamente"
          onAction={() => scan.refetch()}
        />
      </AdminLayoutAuto>
    );
  }

  return (
    <AdminLayoutAuto title="Radar de Impedimentos">
      <div className="mb-6 overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-col gap-6 p-5 md:flex-row md:items-center md:justify-between">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-red-600/10 text-red-700">
              <Radar className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground" style={{ fontFamily: "var(--font-display)" }}>
                O que impede a operação agora
              </h2>
              <p className="mt-1 max-w-xl text-sm leading-relaxed text-muted-foreground">
                O Radar cruza dados reais desta empresa e ranqueia bloqueios: GPS, contato, atribuição, OS parada, déficit de AP, evidência, manutenção e estoque.
              </p>
              {geradoEm && <p className="mt-2 text-xs text-muted-foreground">Atualizado em {geradoEm} · refresh automático a cada 60s</p>}
            </div>
          </div>
          <div className="flex items-center gap-5">
            <HealthRing score={resumo?.scoreSaude ?? 100} />
            <button
              type="button"
              onClick={() => scan.refetch()}
              className="inline-flex items-center gap-2 rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold text-foreground transition hover:bg-muted"
            >
              <RefreshCw className={`h-4 w-4 ${scan.isFetching ? "animate-spin" : ""}`} />
              Atualizar
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-px border-t border-border bg-border sm:grid-cols-4">
          {[
            { label: "Críticos", value: resumo?.criticos ?? 0, tone: "text-red-700" },
            { label: "Altos", value: resumo?.altos ?? 0, tone: "text-amber-700" },
            { label: "Médios", value: resumo?.medios ?? 0, tone: "text-sky-700" },
            { label: "Total", value: resumo?.total ?? 0, tone: "text-foreground" },
          ].map((kpi) => (
            <div key={kpi.label} className="bg-card px-4 py-3">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{kpi.label}</p>
              <p className={`mt-1 text-2xl font-bold tabular-nums ${kpi.tone}`} style={{ fontFamily: "var(--font-display)" }}>{kpi.value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {(["todas", "critico", "alto", "medio", "baixo"] as const).map((sev) => (
            <button
              key={sev}
              type="button"
              onClick={() => setFiltroSeveridade(sev)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                filtroSeveridade === sev
                  ? "border-foreground/20 bg-foreground text-background"
                  : "border-border bg-card text-muted-foreground hover:bg-muted"
              }`}
            >
              {sev === "todas" ? "Todas severidades" : SEVERIDADE_STYLE[sev].label}
            </button>
          ))}
        </div>
        <select
          value={filtroTipo}
          onChange={(e) => setFiltroTipo(e.target.value as FiltroTipo)}
          className="rounded-xl border border-border bg-card px-3 py-2 text-sm text-foreground"
          aria-label="Filtrar por tipo de impedimento"
        >
          <option value="todos">Todos os tipos</option>
          {(Object.keys(TIPO_META) as TipoImpedimento[]).map((tipo) => (
            <option key={tipo} value={tipo}>{TIPO_META[tipo].label}</option>
          ))}
        </select>
      </div>

      {(resumo?.total ?? 0) === 0 ? (
        <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/5">
          <OperationState
            kind="empty"
            title="Nenhum impedimento detectado"
            description="Cadastro, execução, evidências e estoque estão coerentes neste momento. Continue monitorando a fila de campo."
          />
          <div className="flex justify-center pb-8">
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          </div>
        </div>
      ) : impedimentos.length === 0 ? (
        <OperationState
          kind="empty"
          title="Nenhum item neste filtro"
          description="Ajuste a severidade ou o tipo para ver outros bloqueios detectados."
          actionLabel="Limpar filtros"
          onAction={() => { setFiltroSeveridade("todas"); setFiltroTipo("todos"); }}
        />
      ) : (
        <ol className="space-y-3" aria-label="Fila de impedimentos ranqueada">
          {impedimentos.map((item, index) => {
            const Icon = TIPO_META[item.tipo]?.icon ?? AlertTriangle;
            const sev = SEVERIDADE_STYLE[item.severidade];
            return (
              <li key={item.id} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm transition hover:border-foreground/15">
                <div className={`h-1 w-full ${sev.bar}`} />
                <div className="flex flex-col gap-4 p-4 md:flex-row md:items-start md:justify-between">
                  <div className="flex min-w-0 flex-1 gap-3">
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-muted text-foreground">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-xs font-bold tabular-nums text-muted-foreground">#{index + 1}</span>
                        <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${sev.badge}`}>{sev.label}</span>
                        <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                          {TIPO_META[item.tipo]?.label ?? item.tipo}
                        </span>
                        <span className="text-[11px] font-semibold tabular-nums text-muted-foreground">score {item.score}</span>
                      </div>
                      <h3 className="text-base font-bold text-foreground">{item.titulo}</h3>
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.descricao}</p>
                      <p className="mt-2 text-sm font-medium text-foreground">
                        <span className="text-muted-foreground">Ação: </span>
                        {item.acaoSugerida}
                      </p>
                      {(item.escolaNome || item.tecnicoNome || item.diasAberto != null) && (
                        <p className="mt-2 text-xs text-muted-foreground">
                          {[item.escolaNome, item.tecnicoNome, item.diasAberto != null ? `${item.diasAberto}d aberto` : null]
                            .filter(Boolean)
                            .join(" · ")}
                        </p>
                      )}
                    </div>
                  </div>
                  <Link
                    href={item.href}
                    className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-xl bg-foreground px-4 py-2 text-sm font-semibold text-background transition hover:opacity-90"
                  >
                    Resolver
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </AdminLayoutAuto>
  );
}
