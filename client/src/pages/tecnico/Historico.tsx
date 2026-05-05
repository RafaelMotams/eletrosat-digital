import { useState, useMemo } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import {
  CheckCircle, Clock, Wifi, Zap, Calendar, XCircle, Play,
  Filter, ChevronDown, TrendingUp, Award, Search, X
} from "lucide-react";

type Escola = {
  id: number; nome: string; inep: string;
  endereco: string | null; status: string;
  qtdAp: number | null; dataConclusao: Date | null;
  municipio: string | null; [key: string]: unknown;
};

const statusMap: Record<string, { label: string; color: string; bg: string; border: string; icon: typeof CheckCircle }> = {
  concluido:     { label: "Concluído",     color: "#34d399", bg: "rgba(16,185,129,0.10)",  border: "rgba(16,185,129,0.2)",  icon: CheckCircle },
  em_andamento:  { label: "Em andamento",  color: "#818cf8", bg: "rgba(99,102,241,0.10)",  border: "rgba(99,102,241,0.2)",  icon: Play        },
  nao_instalada: { label: "Não instalada", color: "#f87171", bg: "rgba(239,68,68,0.10)",   border: "rgba(239,68,68,0.2)",   icon: XCircle     },
  pendente:      { label: "Pendente",      color: "#fbbf24", bg: "rgba(245,158,11,0.10)",  border: "rgba(245,158,11,0.2)",  icon: Clock       },
};

const PERIODOS = [
  { value: "todos", label: "Todos os registros" },
  { value: "hoje", label: "Hoje" },
  { value: "semana", label: "Esta semana" },
  { value: "mes", label: "Este mês" },
  { value: "custom", label: "Período personalizado" },
] as const;
type Periodo = typeof PERIODOS[number]["value"];

function startOfDay(d: Date) { const r = new Date(d); r.setHours(0,0,0,0); return r; }
function startOfWeek(d: Date) { const r = startOfDay(d); r.setDate(r.getDate() - r.getDay()); return r; }
function startOfMonth(d: Date) { return new Date(d.getFullYear(), d.getMonth(), 1); }

function formatDate(d: Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("pt-BR", { day: "2-digit", month: "short", year: "numeric" });
}

export default function TecnicoHistorico() {
  const [, navigate] = useLocation();
  const tecnicoId = Number(localStorage.getItem("tecnico_id") || 0);
  const [periodo, setPeriodo] = useState<Periodo>("todos");
  const [showPeriodo, setShowPeriodo] = useState(false);
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [search, setSearch] = useState("");
  const [searchFocus, setSearchFocus] = useState(false);

  const { data: escolas = [], isLoading } = trpc.tecnicoAuth.minhasEscolas.useQuery(
    { tecnicoId },
    {
      enabled: !!tecnicoId,
      staleTime: 2 * 60 * 1000,
      refetchOnWindowFocus: false,
      placeholderData: (prev) => prev,
      retry: 1,
    }
  );

  const escolasFiltradas = useMemo(() => {
    let list = escolas as Escola[];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(e =>
        e.nome.toLowerCase().includes(q) || e.inep.includes(q) || (e.municipio ?? "").toLowerCase().includes(q)
      );
    }
    if (periodo === "todos") return list;
    const now = new Date();
    let from: Date | null = null, to: Date | null = null;
    if (periodo === "hoje")   { from = startOfDay(now);  to = now; }
    if (periodo === "semana") { from = startOfWeek(now); to = now; }
    if (periodo === "mes")    { from = startOfMonth(now); to = now; }
    if (periodo === "custom" && dataInicio) {
      from = startOfDay(new Date(dataInicio + "T00:00:00"));
      to = dataFim ? new Date(dataFim + "T23:59:59") : now;
    }
    if (!from) return list;
    return list.filter(e => {
      const d = e.dataConclusao ? new Date(e.dataConclusao) : null;
      return d && d >= from! && d <= to!;
    });
  }, [escolas, periodo, dataInicio, dataFim, search]);

  const concluidas    = escolasFiltradas.filter(e => e.status === "concluido");
  const emAndamento   = escolasFiltradas.filter(e => e.status === "em_andamento");
  const naoInstaladas = escolasFiltradas.filter(e => e.status === "nao_instalada");
  const pendentes     = escolasFiltradas.filter(e => e.status === "pendente");
  const totalAps      = concluidas.reduce((acc, e) => acc + (e.qtdAp || 1), 0);

  const periodoLabel = PERIODOS.find(p => p.value === periodo)?.label ?? "Todos";

  return (
    <div className="min-h-screen pb-28 overflow-x-hidden"
      style={{ background: "linear-gradient(160deg, #020817 0%, #050d1f 50%, #020817 100%)" }}>

      {/* Header */}
      <div className="relative overflow-hidden px-4 pt-12 pb-6"
        style={{ background: "linear-gradient(160deg, #0d1f3c 0%, #050d1f 100%)" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-64 h-64 rounded-full opacity-15"
            style={{ background: "radial-gradient(circle, #10b981 0%, transparent 70%)", filter: "blur(40px)", transform: "translate(30%, -30%)" }} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center justify-between mb-1">
            <div>
              <p className="text-xs font-medium mb-1" style={{ color: "rgba(148,163,184,0.5)" }}>HISTÓRICO</p>
              <h1 className="text-2xl font-black text-white" style={{ letterSpacing: "-0.02em" }}>Registros</h1>
            </div>
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <TrendingUp className="w-5 h-5" style={{ color: "#10b981" }} />
            </div>
          </div>
        </div>
      </div>

      <div className="px-4 pt-4">
        {/* Summary stats */}
        <div className="grid grid-cols-4 gap-2 mb-5">
          {[
            { label: "Concluídas", value: concluidas.length, color: "#34d399" },
            { label: "Andamento", value: emAndamento.length, color: "#818cf8" },
            { label: "Não inst.", value: naoInstaladas.length, color: "#f87171" },
            { label: "APs", value: totalAps, color: "#fbbf24" },
          ].map(s => (
            <div key={s.label} className="rounded-2xl p-3 text-center"
              style={{ background: `${s.color}08`, border: `1px solid ${s.color}20` }}>
              <p className="text-lg font-black" style={{ color: s.color }}>{s.value}</p>
              <p className="text-[9px] font-semibold mt-0.5 uppercase tracking-wide" style={{ color: "rgba(148,163,184,0.5)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* APs destaque */}
        {totalAps > 0 && (
          <div className="rounded-2xl p-4 mb-4 flex items-center gap-3"
            style={{ background: "linear-gradient(135deg, rgba(245,158,11,0.08), rgba(251,191,36,0.05))", border: "1px solid rgba(245,158,11,0.15)" }}>
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "rgba(245,158,11,0.15)" }}>
              <Zap className="w-5 h-5" style={{ color: "#f59e0b" }} />
            </div>
            <div>
              <p className="text-xs text-slate-400 font-medium">APs instalados no período</p>
              <p className="text-xl font-black text-white">{totalAps} <span className="text-sm font-medium text-slate-400">access points</span></p>
            </div>
            <Award className="w-6 h-6 ml-auto flex-shrink-0" style={{ color: "#fbbf24" }} />
          </div>
        )}

        {/* Search */}
        <div className="relative mb-3">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 pointer-events-none"
            style={{ color: searchFocus ? "#10b981" : "rgba(100,116,139,0.4)" }} />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)}
            onFocus={() => setSearchFocus(true)} onBlur={() => setSearchFocus(false)}
            placeholder="Buscar escola, INEP ou município..."
            className="w-full pl-10 pr-10 py-3 rounded-xl text-sm text-white placeholder-slate-600 outline-none transition-all"
            style={{
              background: searchFocus ? "rgba(16,185,129,0.06)" : "rgba(255,255,255,0.04)",
              border: searchFocus ? "1px solid rgba(16,185,129,0.35)" : "1px solid rgba(255,255,255,0.07)",
            }} />
          {search && (
            <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg"
              style={{ color: "rgba(100,116,139,0.5)" }}>
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Period filter */}
        <div className="mb-4">
          <button onClick={() => setShowPeriodo(!showPeriodo)}
            className="flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all active:scale-95 w-full"
            style={{
              background: showPeriodo ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.04)",
              border: showPeriodo ? "1px solid rgba(16,185,129,0.25)" : "1px solid rgba(255,255,255,0.07)",
              color: showPeriodo ? "#10b981" : "rgba(148,163,184,0.7)",
            }}>
            <Filter className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left">{periodoLabel}</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showPeriodo ? "rotate-180" : ""}`} />
          </button>

          {showPeriodo && (
            <div className="mt-2 rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              {PERIODOS.map((p, i, arr) => (
                <div key={p.value}>
                  <button onClick={() => { setPeriodo(p.value); if (p.value !== "custom") setShowPeriodo(false); }}
                    className="w-full text-left px-4 py-3 text-sm transition-all active:bg-white/5 flex items-center justify-between"
                    style={{ color: periodo === p.value ? "#10b981" : "rgba(148,163,184,0.7)" }}>
                    {p.label}
                    {periodo === p.value && <CheckCircle className="w-4 h-4" style={{ color: "#10b981" }} />}
                  </button>
                  {i < arr.length - 1 && <div className="mx-4 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />}
                </div>
              ))}
              {periodo === "custom" && (
                <div className="px-4 pb-4 pt-2 grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">De</label>
                    <input type="date" value={dataInicio} onChange={e => setDataInicio(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
                  </div>
                  <div>
                    <label className="text-xs text-slate-500 mb-1 block">Até</label>
                    <input type="date" value={dataFim} onChange={e => setDataFim(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl text-sm text-white outline-none"
                      style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }} />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Count */}
        <div className="flex items-center justify-between mb-3">
          <p className="text-xs font-semibold text-slate-500">
            {escolasFiltradas.length} {escolasFiltradas.length === 1 ? "registro" : "registros"}
          </p>
          <p className="text-xs" style={{ color: "rgba(100,116,139,0.5)" }}>{periodoLabel}</p>
        </div>

        {/* List */}
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl h-24 mb-3 animate-pulse"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }} />
          ))
        ) : escolasFiltradas.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <Wifi className="w-7 h-7" style={{ color: "rgba(100,116,139,0.4)" }} />
            </div>
            <p className="text-sm font-semibold text-slate-400">Nenhum registro encontrado</p>
            <p className="text-xs text-slate-600 mt-1">Tente outro período ou termo de busca</p>
          </div>
        ) : (
          <div className="space-y-3">
            {escolasFiltradas.map((escola) => {
              const sc = statusMap[escola.status] ?? statusMap.pendente;
              const Icon = sc.icon;
              return (
                <button key={escola.id} onClick={() => navigate(`/tecnico/os/${escola.id}`)}
                  className="w-full text-left rounded-2xl overflow-hidden transition-all active:scale-[0.98]"
                  style={{ background: "rgba(255,255,255,0.03)", border: `1px solid ${sc.border}` }}>

                  {/* Status bar at top */}
                  <div className="h-0.5 w-full" style={{ background: `linear-gradient(90deg, ${sc.color}60, transparent)` }} />

                  <div className="p-4">
                    <div className="flex items-start gap-3">
                      {/* Status icon */}
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{ background: sc.bg, border: `1px solid ${sc.border}` }}>
                        <Icon className="w-5 h-5" style={{ color: sc.color }} />
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <h3 className="text-sm font-bold text-white leading-tight line-clamp-2">{escola.nome}</h3>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0"
                            style={{ background: sc.bg, color: sc.color, border: `1px solid ${sc.border}` }}>
                            {sc.label}
                          </span>
                        </div>

                        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
                          {escola.inep && (
                            <span className="text-[10px] font-mono font-bold" style={{ color: "rgba(148,163,184,0.35)" }}>
                              #{escola.inep}
                            </span>
                          )}
                          {escola.municipio && (
                            <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.5)" }}>{escola.municipio}</span>
                          )}
                          {escola.qtdAp != null && escola.qtdAp > 0 && (
                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                              style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8", border: "1px solid rgba(99,102,241,0.2)" }}>
                              {escola.qtdAp} AP{escola.qtdAp > 1 ? "s" : ""}
                            </span>
                          )}
                        </div>

                        {escola.dataConclusao && (
                          <div className="flex items-center gap-1.5 mt-2">
                            <Calendar className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(148,163,184,0.35)" }} />
                            <span className="text-[10px]" style={{ color: "rgba(148,163,184,0.45)" }}>
                              {formatDate(escola.dataConclusao)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      <TecnicoBottomNav />
    </div>
  );
}
