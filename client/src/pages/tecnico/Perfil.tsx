import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import { dbClearTecnicoData } from "@/hooks/useOfflineDB";
import {
  User, Wifi, CheckCircle, Clock, Zap, LogOut, Award, TrendingUp,
  Shield, Star, ChevronRight, Settings, Bell, HelpCircle, Activity, Boxes
} from "lucide-react";

/* ─── Animated circular progress ─── */
function CircleProgress({ pct, size = 80, stroke = 6, color = "#3b82f6" }: {
  pct: number; size?: number; stroke?: number; color?: string;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="rgba(255,255,255,0.06)" strokeWidth={stroke} />
      <circle cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke={color} strokeWidth={stroke}
        strokeDasharray={`${dash} ${circ}`}
        strokeLinecap="round"
        style={{ transition: "stroke-dasharray 1s ease", filter: `drop-shadow(0 0 6px ${color}80)` }} />
    </svg>
  );
}

export default function TecnicoPerfil() {
  const [, navigate] = useLocation();
  const [mounted, setMounted] = useState(false);
  const tecnicoId = Number(localStorage.getItem("tecnico_id") || 0);
  const tenantId = Number(localStorage.getItem("tecnico_tenant_id") || 0);
  const tecnicoNome = localStorage.getItem("tecnico_nome") || "Técnico";
  const tecnicoEmail = localStorage.getItem("tecnico_email") || "";
  const logoutMutation = trpc.tecnicoAuth.logout.useMutation();

  useEffect(() => { setTimeout(() => setMounted(true), 100); }, []);

  const { data: escolas = [] } = trpc.tecnicoAuth.minhasEscolas.useQuery(
    { tecnicoId }, { enabled: !!tecnicoId }
  );

  const stats = {
    total: escolas.length,
    concluidas: escolas.filter((e: { status: string }) => e.status === "concluido").length,
    pendentes: escolas.filter((e: { status: string }) => e.status === "pendente").length,
    emAndamento: escolas.filter((e: { status: string }) => e.status === "em_andamento").length,
    aps: escolas.filter((e: { status: string }) => e.status === "concluido")
      .reduce((acc: number, e: { qtdAp?: number | null }) => acc + (e.qtdAp || 1), 0),
  };

  const progresso = stats.total > 0 ? Math.round((stats.concluidas / stats.total) * 100) : 0;

  const handleLogout = async () => {
    try {
      await dbClearTecnicoData(tecnicoId, tenantId);
    } catch (error) {
      window.alert(error instanceof Error ? `${error.message} Conecte-se e sincronize antes de sair.` : "Sincronize as ordens pendentes antes de sair.");
      return;
    }

    try {
      await logoutMutation.mutateAsync();
    } finally {
      ["tecnico_id", "tecnico_tenant_id", "tecnico_nome", "tecnico_email", "tecnico", "tecnico_ever_logged", "tecnico_last_route"].forEach(k => localStorage.removeItem(k));
      sessionStorage.clear();
      navigate("/tecnico/login");
    }
  };

  const initials = tecnicoNome.split(" ").map((n: string) => n[0]).slice(0, 2).join("").toUpperCase();

  const badge = progresso >= 100 ? { icon: "🏆", label: "Missão Completa!", color: "#fbbf24", bg: "rgba(251,191,36,0.08)", border: "rgba(251,191,36,0.2)" }
    : progresso >= 75 ? { icon: "🌟", label: "Quase lá!", color: "#a78bfa", bg: "rgba(167,139,250,0.08)", border: "rgba(167,139,250,0.2)" }
    : progresso >= 50 ? { icon: "⭐", label: "Mais da metade!", color: "#10b981", bg: "rgba(16,185,129,0.08)", border: "rgba(16,185,129,0.2)" }
    : progresso >= 25 ? { icon: "🔥", label: "Bom começo!", color: "#f59e0b", bg: "rgba(245,158,11,0.08)", border: "rgba(245,158,11,0.2)" }
    : null;

  return (
    <div className="min-h-screen pb-28 overflow-x-hidden"
      style={{ background: "linear-gradient(160deg, #020817 0%, #050d1f 50%, #020817 100%)" }}>

      {/* Hero header */}
      <div className="relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, #0d1f3c 0%, #050d1f 100%)", paddingBottom: "80px" }}>

        {/* Background decorations */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-80 h-80 rounded-full opacity-20"
            style={{ background: "radial-gradient(circle, #3b82f6 0%, transparent 70%)", filter: "blur(40px)" }} />
          <div className="absolute -top-10 -right-10 w-48 h-48 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, #6366f1 0%, transparent 70%)", filter: "blur(30px)" }} />
        </div>

        {/* Top bar */}
        <div className="relative z-10 flex items-center justify-between px-4 pt-12 pb-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-medium text-slate-300">Técnico de Campo</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Bell className="w-4 h-4 text-slate-400" />
            </div>
          </div>
        </div>

        {/* Avatar + name */}
        <div className="relative z-10 flex flex-col items-center px-4 pt-2">
          <div className="relative mb-4">
            {/* Outer ring */}
            <div className="absolute inset-0 rounded-full"
              style={{ background: "conic-gradient(from 0deg, #3b82f6, #6366f1, #8b5cf6, #3b82f6)", padding: "2px", borderRadius: "50%" }}>
              <div className="w-full h-full rounded-full" style={{ background: "#050d1f" }} />
            </div>
            <div className="relative w-24 h-24 rounded-full flex items-center justify-center text-2xl font-black text-white"
              style={{
                background: "linear-gradient(135deg, #1d4ed8 0%, #4338ca 50%, #7c3aed 100%)",
                boxShadow: "0 0 0 3px #050d1f, 0 0 0 5px rgba(99,102,241,0.3), 0 16px 48px rgba(99,102,241,0.3)",
              }}>
              {initials}
            </div>
            {/* Online indicator */}
            <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full border-2 flex items-center justify-center"
              style={{ background: "#10b981", borderColor: "#050d1f", boxShadow: "0 0 8px rgba(16,185,129,0.6)" }}>
              <div className="w-2 h-2 rounded-full bg-white" />
            </div>
          </div>

          <h1 className="text-2xl font-black text-white mb-1" style={{ letterSpacing: "-0.02em" }}>{tecnicoNome}</h1>
          <p className="text-sm" style={{ color: "rgba(148,163,184,0.6)" }}>{tecnicoEmail}</p>
        </div>
      </div>

      {/* Stats cards floating over header */}
      <div className="px-4 -mt-14 relative z-10"
        style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)", transition: "all 0.5s ease" }}>

        {/* Progress circle card */}
        <div className="rounded-3xl p-5 mb-4 flex items-center gap-5"
          style={{
            background: "linear-gradient(135deg, rgba(29,78,216,0.15) 0%, rgba(99,102,241,0.1) 100%)",
            border: "1px solid rgba(59,130,246,0.15)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.05)",
          }}>
          <div className="relative flex-shrink-0">
            <CircleProgress pct={progresso} size={80} stroke={6} color="#3b82f6" />
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-lg font-black text-white">{progresso}<span className="text-xs text-slate-400">%</span></span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-slate-400 mb-1">Progresso geral</p>
            <p className="text-white font-bold text-sm leading-tight mb-2">
              {stats.concluidas} de {stats.total} escolas concluídas
            </p>
            <div className="flex items-center gap-2">
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
                style={{ background: "rgba(16,185,129,0.12)", color: "#10b981" }}>
                <CheckCircle className="w-3 h-3" />
                {stats.concluidas} ok
              </div>
              <div className="flex items-center gap-1 px-2 py-1 rounded-full text-xs font-bold"
                style={{ background: "rgba(245,158,11,0.12)", color: "#f59e0b" }}>
                <Clock className="w-3 h-3" />
                {stats.pendentes} pend.
              </div>
            </div>
          </div>
        </div>

        {/* 4 stat cards */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { label: "Atribuídas", value: stats.total, icon: Wifi, color: "#3b82f6", grad: "linear-gradient(135deg,#1d4ed8,#3b82f6)" },
            { label: "Concluídas", value: stats.concluidas, icon: CheckCircle, color: "#10b981", grad: "linear-gradient(135deg,#047857,#10b981)" },
            { label: "APs Instalados", value: stats.aps, icon: Zap, color: "#f59e0b", grad: "linear-gradient(135deg,#b45309,#f59e0b)" },
            { label: "Em andamento", value: stats.emAndamento, icon: Activity, color: "#a78bfa", grad: "linear-gradient(135deg,#6d28d9,#a78bfa)" },
          ].map(({ label, value, icon: Icon, color, grad }, i) => (
            <div key={label} className="rounded-2xl p-4 relative overflow-hidden"
              style={{
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.07)",
                opacity: mounted ? 1 : 0,
                transform: mounted ? "translateY(0)" : "translateY(16px)",
                transition: `all 0.4s ease ${0.1 + i * 0.05}s`,
              }}>
              <div className="absolute top-0 right-0 w-16 h-16 rounded-full opacity-10"
                style={{ background: `radial-gradient(circle, ${color} 0%, transparent 70%)`, transform: "translate(30%, -30%)" }} />
              <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                style={{ background: grad, boxShadow: `0 4px 16px ${color}40` }}>
                <Icon className="w-4.5 h-4.5 text-white" style={{ width: "18px", height: "18px" }} />
              </div>
              <p className="text-2xl font-black text-white mb-0.5">{value}</p>
              <p className="text-xs font-medium" style={{ color: "rgba(148,163,184,0.55)" }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Badge de conquista */}
        {badge && (
          <div className="rounded-2xl p-4 mb-4 flex items-center gap-3"
            style={{ background: badge.bg, border: `1px solid ${badge.border}` }}>
            <div className="text-3xl">{badge.icon}</div>
            <div>
              <p className="font-bold text-sm text-white">{badge.label}</p>
              <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.6)" }}>
                Continue assim, você está indo muito bem!
              </p>
            </div>
            <Star className="w-5 h-5 ml-auto flex-shrink-0" style={{ color: badge.color }} />
          </div>
        )}

        {/* Menu items */}
        <div className="rounded-2xl overflow-hidden mb-4"
          style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
          {[
            { icon: Boxes, label: "Meus materiais", sub: "Saldo e consumo de estoque", color: "#06b6d4", path: "/tecnico/estoque" },
            { icon: Shield, label: "Segurança", sub: "Senha e autenticação", color: "#3b82f6" },
            { icon: Settings, label: "Preferências", sub: "Notificações e aparência", color: "#6366f1" },
            { icon: HelpCircle, label: "Suporte", sub: "Ajuda e documentação", color: "#10b981" },
          ].map(({ icon: Icon, label, sub, color, path }, i, arr) => (
            <div key={label}>
              <button onClick={() => path && navigate(path)} className="w-full flex items-center gap-3 px-4 py-3.5 transition-all active:bg-white/5">
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: `${color}15`, border: `1px solid ${color}25` }}>
                  <Icon className="w-4 h-4" style={{ color }} />
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-semibold text-white">{label}</p>
                  <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>{sub}</p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(100,116,139,0.4)" }} />
              </button>
              {i < arr.length - 1 && (
                <div className="mx-4 h-px" style={{ background: "rgba(255,255,255,0.05)" }} />
              )}
            </div>
          ))}
        </div>

        {/* Logout */}
        <button onClick={handleLogout} disabled={logoutMutation.isPending}
          className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-sm transition-all active:scale-[0.97] relative overflow-hidden"
          style={{
            background: "rgba(239,68,68,0.07)",
            border: "1px solid rgba(239,68,68,0.2)",
            color: "#f87171",
          }}>
          <LogOut className="w-4 h-4" />
          Sair da conta
        </button>

        {/* Version */}
        <p className="text-center text-xs mt-4 pb-2" style={{ color: "rgba(100,116,139,0.3)" }}>
          Netvius Técnico v5.0 · {new Date().getFullYear()}
        </p>
      </div>

      <TecnicoBottomNav />
    </div>
  );
}
