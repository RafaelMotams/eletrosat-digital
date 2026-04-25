import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import { CheckCircle, Clock, Wifi, Zap, Calendar, ArrowRight } from "lucide-react";

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

export default function TecnicoHistorico() {
  const [, navigate] = useLocation();
  const tecnicoId = Number(localStorage.getItem("tecnico_id") || 0);

  const { data: escolas = [], isLoading } = trpc.tecnicoAuth.minhasEscolas.useQuery(
    { tecnicoId },
    { enabled: !!tecnicoId }
  );

  const concluidas = escolas.filter((e: Escola) => e.status === "concluido");
  const pendentes = escolas.filter((e: Escola) => e.status !== "concluido");

  const totalAps = concluidas.reduce((acc: number, e: Escola) => acc + (e.qtdAp || 1), 0);

  return (
    <div className="min-h-screen pb-24" style={{ background: "#0a0f1e" }}>
      {/* Header */}
      <div className="px-4 pt-safe pt-6 pb-4"
        style={{ background: "rgba(10,15,30,0.95)", backdropFilter: "blur(20px)" }}>
        <h1 className="text-white font-bold text-xl">Histórico</h1>
        <p className="text-sm mt-0.5" style={{ color: "rgba(148,163,184,0.6)" }}>
          Suas ordens de serviço
        </p>
      </div>

      {/* Resumo */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { label: "Concluídas", value: concluidas.length, icon: CheckCircle, color: "#10b981" },
            { label: "Pendentes", value: pendentes.length, icon: Clock, color: "#f59e0b" },
            { label: "APs Instalados", value: totalAps, icon: Zap, color: "#3b82f6" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl p-3 text-center"
              style={{ background: `${color}12`, border: `1px solid ${color}25` }}>
              <Icon className="w-5 h-5 mx-auto mb-1" style={{ color }} />
              <div className="text-white font-bold text-lg leading-none">{value}</div>
              <div className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.6)" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Concluídas */}
        {concluidas.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle className="w-4 h-4" style={{ color: "#10b981" }} />
              <h2 className="text-white font-semibold text-sm">Concluídas ({concluidas.length})</h2>
            </div>
            <div className="space-y-2">
              {concluidas.map((escola: Escola) => (
                <button
                  key={escola.id}
                  onClick={() => navigate(`/tecnico/os/${escola.id}`)}
                  className="w-full text-left rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-98"
                  style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(16,185,129,0.15)" }}>
                    <Wifi className="w-5 h-5" style={{ color: "#10b981" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{escola.nome}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.6)" }}>
                      INEP: {escola.inep} · {escola.qtdAp || 1} AP(s)
                    </p>
                    {escola.dataConclusao && (
                      <div className="flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3" style={{ color: "rgba(148,163,184,0.5)" }} />
                        <span className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>
                          {new Date(escola.dataConclusao).toLocaleDateString("pt-BR")}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs px-2 py-1 rounded-full font-semibold"
                      style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
                      ✓ OK
                    </span>
                    <ArrowRight className="w-4 h-4" style={{ color: "rgba(148,163,184,0.3)" }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Pendentes */}
        {pendentes.length > 0 && (
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Clock className="w-4 h-4" style={{ color: "#f59e0b" }} />
              <h2 className="text-white font-semibold text-sm">Pendentes ({pendentes.length})</h2>
            </div>
            <div className="space-y-2">
              {pendentes.map((escola: Escola) => (
                <button
                  key={escola.id}
                  onClick={() => navigate(`/tecnico/os/${escola.id}`)}
                  className="w-full text-left rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-98"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(245,158,11,0.12)" }}>
                    <Wifi className="w-5 h-5" style={{ color: "#f59e0b" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-semibold text-sm truncate">{escola.nome}</p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.6)" }}>
                      INEP: {escola.inep} · {escola.qtdAp || 1} AP(s)
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.4)" }}>
                      {escola.municipio}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs px-2 py-1 rounded-full font-semibold"
                      style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
                      Pendente
                    </span>
                    <ArrowRight className="w-4 h-4" style={{ color: "rgba(148,163,184,0.3)" }} />
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!isLoading && escolas.length === 0 && (
          <div className="text-center py-12">
            <Wifi className="w-12 h-12 mx-auto mb-3 opacity-20 text-white" />
            <p className="text-white font-medium">Nenhuma escola atribuída</p>
            <p className="text-sm mt-1" style={{ color: "rgba(148,163,184,0.5)" }}>
              Aguarde a atribuição pelo administrador
            </p>
          </div>
        )}
      </div>

      <TecnicoBottomNav />
    </div>
  );
}
