import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Wifi, MapPin, ChevronRight, CheckCircle, Clock, AlertCircle, Search, Zap, RefreshCw } from "lucide-react";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle; badgeBg: string; badgeText: string; dot: string; cardBorder: string }> = {
  pendente:     { label: "Pendente",     icon: AlertCircle,  badgeBg: "rgba(245,158,11,0.12)",  badgeText: "#f59e0b", dot: "#f59e0b", cardBorder: "rgba(245,158,11,0.15)" },
  em_andamento: { label: "Em andamento", icon: Clock,        badgeBg: "rgba(59,130,246,0.12)",  badgeText: "#3b82f6", dot: "#3b82f6", cardBorder: "rgba(59,130,246,0.15)" },
  concluido:    { label: "Concluído",    icon: CheckCircle,  badgeBg: "rgba(16,185,129,0.12)",  badgeText: "#10b981", dot: "#10b981", cardBorder: "rgba(16,185,129,0.15)" },
};

export default function TecnicoHome() {
  const [, navigate] = useLocation();
  const [tecnicoId, setTecnicoId] = useState(0);
  const [tecnicoNome, setTecnicoNome] = useState("Técnico");
  const [search, setSearch] = useState("");

  useEffect(() => {
    const id = localStorage.getItem("tecnico_id");
    const nome = localStorage.getItem("tecnico_nome");
    // Suporte ao formato antigo
    if (!id) {
      const stored = localStorage.getItem("tecnico");
      if (!stored) { navigate("/tecnico/login"); return; }
      try {
        const t = JSON.parse(stored);
        localStorage.setItem("tecnico_id", String(t.id));
        localStorage.setItem("tecnico_nome", t.nome);
        localStorage.setItem("tecnico_email", t.email);
        setTecnicoId(t.id);
        setTecnicoNome(t.nome);
      } catch { navigate("/tecnico/login"); }
    } else {
      setTecnicoId(Number(id));
      setTecnicoNome(nome || "Técnico");
    }
  }, [navigate]);

  const { data: escolas, isLoading, refetch } = trpc.tecnicoAuth.minhasEscolas.useQuery(
    { tecnicoId },
    { enabled: !!tecnicoId, refetchInterval: 30000 }
  );

  const filtered = escolas?.filter(e =>
    !search || e.nome.toLowerCase().includes(search.toLowerCase()) || e.inep.includes(search)
  ) ?? [];

  const total = escolas?.length ?? 0;
  const concluidas = escolas?.filter(e => e.status === "concluido").length ?? 0;
  const pendentes = escolas?.filter(e => e.status === "pendente").length ?? 0;

  const getInitials = (nome: string) =>
    nome.split(" ").filter(Boolean).slice(0, 2).map(n => n[0]).join("").toUpperCase();

  const progresso = total > 0 ? Math.round((concluidas / total) * 100) : 0;

  return (
    <div className="min-h-screen flex flex-col pb-24" style={{ background: "#0a0f1e" }}>
      {/* Header */}
      <header className="px-4 pt-safe pt-5 pb-4 sticky top-0 z-10"
        style={{ background: "rgba(10,15,30,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>

        {/* Saudação */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center font-bold text-sm text-white"
              style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
              {getInitials(tecnicoNome)}
            </div>
            <div>
              <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Bem-vindo,</p>
              <p className="text-white font-bold text-sm leading-tight">{tecnicoNome}</p>
            </div>
          </div>
          <button onClick={() => refetch()}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
            style={{ background: "rgba(255,255,255,0.06)" }}>
            <RefreshCw className="w-4 h-4" style={{ color: "rgba(148,163,184,0.6)" }} />
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Total",      value: total,     color: "#3b82f6" },
            { label: "Pendentes",  value: pendentes,  color: "#f59e0b" },
            { label: "Concluídas", value: concluidas, color: "#10b981" },
          ].map((s) => (
            <div key={s.label} className="rounded-xl p-2.5 text-center"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
              <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Barra de progresso */}
        {total > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Progresso</span>
              <span className="text-xs font-bold" style={{ color: "#10b981" }}>{progresso}%</span>
            </div>
            <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progresso}%`, background: "linear-gradient(90deg, #059669, #10b981)" }} />
            </div>
          </div>
        )}

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(100,116,139,0.6)" }} />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar escola ou INEP..."
            className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm outline-none text-white"
            style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.09)" }}
            onFocus={e => { e.currentTarget.style.borderColor = "#10b981"; }}
            onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
          />
        </div>
      </header>

      {/* Lista */}
      <div className="flex-1 px-4 py-4 space-y-2.5">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ background: "rgba(255,255,255,0.05)" }} />
          ))
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.05)" }}>
              <Wifi className="w-8 h-8 opacity-30 text-white" />
            </div>
            <p className="text-white font-semibold">
              {search ? "Nenhuma escola encontrada" : "Nenhuma escola atribuída"}
            </p>
            <p className="text-sm" style={{ color: "rgba(148,163,184,0.5)" }}>
              {search ? "Tente outro termo de busca" : "Aguarde o administrador atribuir escolas"}
            </p>
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
                  background: "rgba(255,255,255,0.04)",
                  border: `1px solid ${sc.cardBorder}`,
                  animationDelay: `${idx * 0.04}s`,
                }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 text-white font-bold text-sm"
                    style={{
                      background: escola.status === "concluido"
                        ? "linear-gradient(135deg, #059669, #10b981)"
                        : "linear-gradient(135deg, #1e3a5f, #1d4ed8)"
                    }}>
                    {getInitials(escola.nome)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm leading-tight truncate">
                      {escola.nome}
                    </p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      {escola.municipio && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" style={{ color: "rgba(148,163,184,0.4)" }} />
                          <span className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>{escola.municipio}</span>
                        </div>
                      )}
                      {escola.velocidadeOfertada && (
                        <div className="flex items-center gap-1">
                          <Zap className="w-3 h-3" style={{ color: "rgba(148,163,184,0.4)" }} />
                          <span className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>{escola.velocidadeOfertada}</span>
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
                    <ChevronRight className="w-4 h-4" style={{ color: "rgba(148,163,184,0.25)" }} />
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <TecnicoBottomNav />
    </div>
  );
}
