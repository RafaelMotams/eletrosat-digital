import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import { CheckCircle, Clock, Wifi, Zap, Calendar, ArrowRight, XCircle, Play } from "lucide-react";

type Escola = {
  id: number;
  nome: string;
  inep: string;
  endereco: string | null;
  status: string;
  qtdAp: number | null;
  dataConclusao: Date | null;
  municipio: string | null;
  [key: string]: unknown;
};

const statusMap: Record<string, { label: string; color: string; bg: string; icon: typeof CheckCircle }> = {
  concluido:     { label: "Concluído",    color: "#34d399", bg: "rgba(16,185,129,0.12)",  icon: CheckCircle },
  em_andamento:  { label: "Em andamento", color: "#818cf8", bg: "rgba(99,102,241,0.12)",  icon: Play        },
  nao_instalada: { label: "Não instalada",color: "#f87171", bg: "rgba(239,68,68,0.12)",   icon: XCircle     },
  pendente:      { label: "Pendente",     color: "#fbbf24", bg: "rgba(245,158,11,0.12)",  icon: Clock       },
};

export default function TecnicoHistorico() {
  const [, navigate] = useLocation();
  const tecnicoId = Number(localStorage.getItem("tecnico_id") || 0);

  const { data: escolas = [], isLoading } = trpc.tecnicoAuth.minhasEscolas.useQuery(
    { tecnicoId },
    { enabled: !!tecnicoId }
  );

  const concluidas    = escolas.filter((e: Escola) => e.status === "concluido");
  const emAndamento   = escolas.filter((e: Escola) => e.status === "em_andamento");
  const naoInstaladas = escolas.filter((e: Escola) => e.status === "nao_instalada");
  const pendentes     = escolas.filter((e: Escola) => e.status === "pendente");

  const totalAps = concluidas.reduce((acc: number, e: Escola) => acc + (e.qtdAp || 1), 0);

  const stats = [
    { label: "Concluídas",    value: concluidas.length,    gradient: "linear-gradient(135deg, #059669, #10b981)", glow: "rgba(16,185,129,0.35)", icon: CheckCircle },
    { label: "Pendentes",     value: pendentes.length + emAndamento.length, gradient: "linear-gradient(135deg, #d97706, #f59e0b)", glow: "rgba(245,158,11,0.35)", icon: Clock },
    { label: "APs Instalados",value: totalAps,             gradient: "linear-gradient(135deg, #2563eb, #3b82f6)", glow: "rgba(59,130,246,0.35)", icon: Zap },
  ];

  function EscolaCard({ escola }: { escola: Escola }) {
    const st = statusMap[escola.status] ?? statusMap.pendente;
    const Icon = st.icon;
    return (
      <button
        onClick={() => navigate(`/tecnico/os/${escola.id}`)}
        className="w-full text-left rounded-3xl p-4 flex items-center gap-3.5 transition-all active:scale-[0.98]"
        style={{
          background: "rgba(255,255,255,0.03)",
          border: `1px solid ${st.color}22`,
          boxShadow: `0 4px 20px ${st.color}10`,
        }}
      >
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{ background: st.bg }}>
          <Wifi className="w-5 h-5" style={{ color: st.color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">{escola.nome}</p>
          <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.55)" }}>
            INEP: {escola.inep} · {escola.qtdAp || 1} AP{(escola.qtdAp || 1) > 1 ? "s" : ""}
          </p>
          {escola.municipio && (
            <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.4)" }}>{escola.municipio}</p>
          )}
          {escola.dataConclusao && (
            <div className="flex items-center gap-1 mt-1">
              <Calendar className="w-3 h-3" style={{ color: "rgba(148,163,184,0.4)" }} />
              <span className="text-xs" style={{ color: "rgba(148,163,184,0.45)" }}>
                {new Date(escola.dataConclusao).toLocaleDateString("pt-BR")}
              </span>
            </div>
          )}
        </div>
        <div className="flex flex-col items-end gap-2 flex-shrink-0">
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-full"
            style={{ background: st.bg }}>
            <Icon className="w-3 h-3" style={{ color: st.color }} />
            <span className="text-xs font-bold" style={{ color: st.color }}>{st.label}</span>
          </div>
          <ArrowRight className="w-4 h-4" style={{ color: "rgba(148,163,184,0.25)" }} />
        </div>
      </button>
    );
  }

  return (
    <div className="min-h-screen pb-28"
      style={{ background: "linear-gradient(160deg, #060b18 0%, #0d1a35 60%, #060b18 100%)" }}>

      {/* Header */}
      <div className="px-4 pt-safe pt-6 pb-5 sticky top-0 z-10"
        style={{ background: "rgba(6,11,24,0.95)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 6px 20px rgba(16,185,129,0.4)" }}>
            <CheckCircle className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-white font-black text-xl">Histórico</h1>
            <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Suas ordens de serviço</p>
          </div>
        </div>
      </div>

      <div className="px-4 py-4 space-y-5">

        {/* Cards de resumo */}
        <div className="grid grid-cols-3 gap-3">
          {stats.map(({ label, value, gradient, glow, icon: Icon }) => (
            <div key={label} className="rounded-3xl p-4 text-center relative overflow-hidden"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center mx-auto mb-2"
                style={{ background: gradient, boxShadow: `0 6px 20px ${glow}` }}>
                <Icon className="w-5 h-5 text-white" />
              </div>
              <div className="text-white font-black text-2xl leading-none">{value}</div>
              <div className="text-xs mt-1.5 font-semibold" style={{ color: "rgba(148,163,184,0.5)" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Loading */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-16 gap-4">
            <div className="w-14 h-14 rounded-3xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 12px 40px rgba(16,185,129,0.4)" }}>
              <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            </div>
            <p className="text-white font-semibold">Carregando histórico...</p>
          </div>
        )}

        {/* Vazio */}
        {!isLoading && escolas.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Wifi className="w-8 h-8" style={{ color: "rgba(148,163,184,0.3)" }} />
            </div>
            <p className="text-white font-bold text-lg">Nenhuma escola atribuída</p>
            <p className="text-sm mt-2" style={{ color: "rgba(148,163,184,0.5)" }}>
              Aguarde a atribuição pelo administrador
            </p>
          </div>
        )}

        {/* Concluídas */}
        {concluidas.length > 0 && (
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(16,185,129,0.15)" }}>
                <CheckCircle className="w-4 h-4" style={{ color: "#34d399" }} />
              </div>
              <h2 className="text-white font-black text-sm">Concluídas</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: "rgba(16,185,129,0.12)", color: "#34d399" }}>
                {concluidas.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {concluidas.map((escola: Escola) => <EscolaCard key={escola.id} escola={escola} />)}
            </div>
          </div>
        )}

        {/* Em andamento */}
        {emAndamento.length > 0 && (
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(99,102,241,0.15)" }}>
                <Play className="w-4 h-4" style={{ color: "#818cf8" }} />
              </div>
              <h2 className="text-white font-black text-sm">Em Andamento</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: "rgba(99,102,241,0.12)", color: "#818cf8" }}>
                {emAndamento.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {emAndamento.map((escola: Escola) => <EscolaCard key={escola.id} escola={escola} />)}
            </div>
          </div>
        )}

        {/* Não instaladas */}
        {naoInstaladas.length > 0 && (
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.15)" }}>
                <XCircle className="w-4 h-4" style={{ color: "#f87171" }} />
              </div>
              <h2 className="text-white font-black text-sm">Não Instaladas</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: "rgba(239,68,68,0.12)", color: "#f87171" }}>
                {naoInstaladas.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {naoInstaladas.map((escola: Escola) => <EscolaCard key={escola.id} escola={escola} />)}
            </div>
          </div>
        )}

        {/* Pendentes */}
        {pendentes.length > 0 && (
          <div>
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(245,158,11,0.15)" }}>
                <Clock className="w-4 h-4" style={{ color: "#fbbf24" }} />
              </div>
              <h2 className="text-white font-black text-sm">Pendentes</h2>
              <span className="px-2 py-0.5 rounded-full text-xs font-bold"
                style={{ background: "rgba(245,158,11,0.12)", color: "#fbbf24" }}>
                {pendentes.length}
              </span>
            </div>
            <div className="space-y-2.5">
              {pendentes.map((escola: Escola) => <EscolaCard key={escola.id} escola={escola} />)}
            </div>
          </div>
        )}
      </div>

      <TecnicoBottomNav />
    </div>
  );
}
