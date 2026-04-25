import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import { User, Wifi, CheckCircle, Clock, Zap, LogOut, Award, TrendingUp } from "lucide-react";

export default function TecnicoPerfil() {
  const [, navigate] = useLocation();
  const tecnicoId = Number(localStorage.getItem("tecnico_id") || 0);
  const tecnicoNome = localStorage.getItem("tecnico_nome") || "Técnico";
  const tecnicoEmail = localStorage.getItem("tecnico_email") || "";

  const { data: escolas = [] } = trpc.tecnicoAuth.minhasEscolas.useQuery(
    { tecnicoId },
    { enabled: !!tecnicoId }
  );

  const stats = {
    total: escolas.length,
    concluidas: escolas.filter((e: { status: string }) => e.status === "concluido").length,
    pendentes: escolas.filter((e: { status: string }) => e.status === "pendente").length,
    aps: escolas
      .filter((e: { status: string }) => e.status === "concluido")
      .reduce((acc: number, e: { qtdAp?: number | null }) => acc + (e.qtdAp || 1), 0),
  };

  const progresso = stats.total > 0 ? Math.round((stats.concluidas / stats.total) * 100) : 0;

  const handleLogout = () => {
    localStorage.removeItem("tecnico_id");
    localStorage.removeItem("tecnico_nome");
    localStorage.removeItem("tecnico_email");
    localStorage.removeItem("tecnico"); // Remove chave legada
    navigate("/tecnico/login");
  };

  const initials = tecnicoNome.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="min-h-screen pb-24" style={{ background: "#0a0f1e" }}>
      {/* Header com avatar */}
      <div className="relative pt-safe pt-8 pb-16 px-4 text-center overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0d1f3c 0%, #0a0f1e 100%)" }}>
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full opacity-20 blur-3xl"
            style={{ background: "#10b981" }} />
        </div>
        <div className="relative z-10">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-3 text-2xl font-bold text-white shadow-2xl"
            style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
            {initials}
          </div>
          <h1 className="text-white font-bold text-xl">{tecnicoNome}</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(148,163,184,0.7)" }}>{tecnicoEmail}</p>
          <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full text-xs font-semibold"
            style={{ background: "rgba(16,185,129,0.15)", color: "#10b981" }}>
            <Wifi className="w-3 h-3" />
            Técnico de Campo
          </div>
        </div>
      </div>

      {/* Stats cards */}
      <div className="px-4 -mt-8 relative z-10">
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "Escolas Atribuídas", value: stats.total, icon: Wifi, color: "#3b82f6" },
            { label: "Concluídas", value: stats.concluidas, icon: CheckCircle, color: "#10b981" },
            { label: "APs Instalados", value: stats.aps, icon: Zap, color: "#f59e0b" },
            { label: "Pendentes", value: stats.pendentes, icon: Clock, color: "#ef4444" },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="rounded-2xl p-4"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ background: `${color}20` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
              </div>
              <div className="text-2xl font-bold text-white">{value}</div>
              <div className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.6)" }}>{label}</div>
            </div>
          ))}
        </div>

        {/* Progresso */}
        <div className="rounded-2xl p-4 mb-4"
          style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-4 h-4" style={{ color: "#10b981" }} />
              <span className="text-white font-semibold text-sm">Progresso Geral</span>
            </div>
            <span className="text-lg font-bold" style={{ color: "#10b981" }}>{progresso}%</span>
          </div>
          <div className="h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progresso}%`,
                background: "linear-gradient(90deg, #059669, #10b981)",
                boxShadow: "0 0 12px rgba(16,185,129,0.4)",
              }}
            />
          </div>
          <p className="text-xs mt-2" style={{ color: "rgba(148,163,184,0.6)" }}>
            {stats.concluidas} de {stats.total} escolas concluídas
          </p>
        </div>

        {/* Badge de conquista */}
        {progresso >= 50 && (
          <div className="rounded-2xl p-4 mb-4 flex items-center gap-3"
            style={{ background: "rgba(251,191,36,0.08)", border: "1px solid rgba(251,191,36,0.20)" }}>
            <Award className="w-8 h-8 flex-shrink-0" style={{ color: "#fbbf24" }} />
            <div>
              <p className="text-white font-semibold text-sm">
                {progresso >= 100 ? "🏆 Missão Completa!" : "⭐ Mais da metade concluída!"}
              </p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.6)" }}>
                Continue assim, você está indo muito bem!
              </p>
            </div>
          </div>
        )}

        {/* Botão sair */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl font-semibold text-sm transition-all active:scale-95"
          style={{
            background: "rgba(239,68,68,0.10)",
            border: "1px solid rgba(239,68,68,0.25)",
            color: "#f87171",
          }}
        >
          <LogOut className="w-4 h-4" />
          Sair da conta
        </button>
      </div>

      <TecnicoBottomNav />
    </div>
  );
}
