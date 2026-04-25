import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Wifi, LogOut, MapPin, ChevronRight, CheckCircle, Clock, AlertCircle, Search, Zap } from "lucide-react";

type TecnicoData = { id: number; nome: string; email: string };

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; badgeBg: string; badgeText: string; dot: string }> = {
  pendente:     { label: "Pendente",     icon: AlertCircle,  badgeBg: "oklch(0.95 0.05 75 / 0.15)",  badgeText: "oklch(0.55 0.16 75)",  dot: "oklch(0.65 0.18 75)"  },
  em_andamento: { label: "Em andamento", icon: Clock,        badgeBg: "oklch(0.94 0.06 240 / 0.15)", badgeText: "oklch(0.50 0.18 240)", dot: "oklch(0.55 0.20 240)" },
  concluido:    { label: "Concluído",    icon: CheckCircle,  badgeBg: "oklch(0.93 0.07 162 / 0.15)", badgeText: "oklch(0.45 0.18 162)", dot: "oklch(0.52 0.20 162)" },
};

export default function TecnicoHome() {
  const [, navigate] = useLocation();
  const [tecnico, setTecnico] = useState<TecnicoData | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem("tecnico");
    if (!stored) { navigate("/tecnico/login"); return; }
    try { setTecnico(JSON.parse(stored)); } catch { navigate("/tecnico/login"); }
  }, [navigate]);

  const { data: escolas, isLoading, refetch } = trpc.tecnicoAuth.minhasEscolas.useQuery(
    { tecnicoId: tecnico?.id ?? 0 },
    { enabled: !!tecnico?.id, refetchInterval: 30000 }
  );

  function handleLogout() {
    localStorage.removeItem("tecnico");
    navigate("/tecnico/login");
  }

  const filtered = escolas?.filter(e =>
    !search || e.nome.toLowerCase().includes(search.toLowerCase()) || e.inep.includes(search)
  ) ?? [];

  const total = escolas?.length ?? 0;
  const concluidas = escolas?.filter(e => e.status === "concluido").length ?? 0;
  const pendentes = escolas?.filter(e => e.status === "pendente").length ?? 0;

  const getInitials = (nome: string) =>
    nome.split(' ').filter(Boolean).slice(0, 2).map(n => n[0]).join('').toUpperCase();

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, oklch(0.10 0.04 240) 0%, oklch(0.13 0.06 240) 100%)" }}>
      {/* Header */}
      <header className="px-4 pt-4 pb-4 sticky top-0 z-10"
        style={{ background: "oklch(0.10 0.04 240 / 0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, oklch(0.40 0.18 162), oklch(0.52 0.20 162))" }}>
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-xs" style={{ color: "oklch(0.50 0.06 240)" }}>Bem-vindo,</p>
              <p className="text-white font-bold text-sm leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                {tecnico?.nome ?? "Técnico"}
              </p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: "oklch(1 0 0 / 0.06)", color: "oklch(0.55 0.06 240)" }}>
            <LogOut className="w-4 h-4" />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Total",      value: total,     color: "oklch(0.65 0.08 240)" },
            { label: "Pendentes",  value: pendentes,  color: "oklch(0.65 0.18 75)"  },
            { label: "Concluídas", value: concluidas, color: "oklch(0.52 0.20 162)" },
          ].map((s, i) => (
            <div key={i} className="rounded-xl p-2.5 text-center" style={{ background: "oklch(1 0 0 / 0.06)" }}>
              <p className="text-xl font-bold" style={{ color: s.color, fontFamily: "var(--font-display)" }}>{s.value}</p>
              <p className="text-xs" style={{ color: "oklch(0.45 0.04 240)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "oklch(0.45 0.05 240)" }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar escola ou INEP..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none text-white"
            style={{ background: "oklch(1 0 0 / 0.08)", border: "1.5px solid oklch(1 0 0 / 0.10)" }}
            onFocus={e => { e.target.style.borderColor = "oklch(0.50 0.18 162)"; }}
            onBlur={e => { e.target.style.borderColor = "oklch(1 0 0 / 0.10)"; }}
          />
        </div>
      </header>

      {/* Lista */}
      <div className="flex-1 px-4 py-4 space-y-3 pb-8">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "oklch(1 0 0 / 0.06)" }} />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "oklch(1 0 0 / 0.06)" }}>
              <Wifi className="w-8 h-8 opacity-30 text-white" />
            </div>
            <p className="text-white font-semibold">
              {search ? "Nenhuma escola encontrada" : "Nenhuma escola atribuída"}
            </p>
            <p className="text-sm" style={{ color: "oklch(0.45 0.04 240)" }}>
              {search ? "Tente outro termo de busca" : "Aguarde o administrador atribuir escolas"}
            </p>
            {!search && (
              <button onClick={() => refetch()} className="mt-2 text-sm font-semibold" style={{ color: "oklch(0.50 0.18 162)" }}>
                Atualizar lista
              </button>
            )}
          </div>
        ) : (
          filtered.map((escola, idx) => {
            const sc = statusConfig[escola.status] ?? statusConfig.pendente;
            const StatusIcon = sc.icon;
            return (
              <button
                key={escola.id}
                onClick={() => navigate(`/tecnico/os/${escola.id}`)}
                className="w-full rounded-2xl p-4 text-left transition-all active:scale-98"
                style={{
                  background: "oklch(1 0 0 / 0.06)",
                  border: "1px solid oklch(1 0 0 / 0.08)",
                  animationDelay: `${idx * 0.04}s`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                    style={{ background: escola.status === "concluido"
                      ? "linear-gradient(135deg, oklch(0.38 0.18 162), oklch(0.50 0.20 162))"
                      : "linear-gradient(135deg, oklch(0.28 0.10 240), oklch(0.38 0.14 240))" }}>
                    {getInitials(escola.nome)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm leading-tight truncate" style={{ fontFamily: "var(--font-display)" }}>
                      {escola.nome}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {escola.municipio && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" style={{ color: "oklch(0.45 0.05 240)" }} />
                          <span className="text-xs" style={{ color: "oklch(0.45 0.05 240)" }}>{escola.municipio}</span>
                        </div>
                      )}
                      {escola.velocidadeOfertada && (
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" style={{ color: "oklch(0.55 0.10 240)" }} />
                          <span className="text-xs" style={{ color: "oklch(0.50 0.06 240)" }}>{escola.velocidadeOfertada}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                    <div className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
                      style={{ background: sc.badgeBg, color: sc.badgeText }}>
                      <StatusIcon className="w-3 h-3" />
                      <span>{sc.label}</span>
                    </div>
                    <ChevronRight className="w-4 h-4" style={{ color: "oklch(0.35 0.04 240)" }} />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
