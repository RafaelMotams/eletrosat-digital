import { useLocation } from "wouter";
import { Home, Map, ClipboardCheck, User, Route } from "lucide-react";

const tabs = [
  { path: "/tecnico",           icon: Home,           label: "Início",    color: "#3b82f6", glow: "rgba(59,130,246,0.35)",  grad: "linear-gradient(135deg,#1d4ed8,#3b82f6)" },
  { path: "/tecnico/mapa",      icon: Map,            label: "Mapa",      color: "#06b6d4", glow: "rgba(6,182,212,0.35)",   grad: "linear-gradient(135deg,#0e7490,#06b6d4)" },
  { path: "/tecnico/rota",      icon: Route,          label: "Rota",      color: "#8b5cf6", glow: "rgba(139,92,246,0.35)",  grad: "linear-gradient(135deg,#6d28d9,#8b5cf6)" },
  { path: "/tecnico/historico", icon: ClipboardCheck, label: "Histórico", color: "#10b981", glow: "rgba(16,185,129,0.35)",  grad: "linear-gradient(135deg,#047857,#10b981)" },
  { path: "/tecnico/perfil",    icon: User,           label: "Perfil",    color: "#f59e0b", glow: "rgba(245,158,11,0.35)",  grad: "linear-gradient(135deg,#b45309,#f59e0b)" },
];

export default function TecnicoBottomNav() {
  const [location, navigate] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(4,10,22,0.97)",
        backdropFilter: "blur(48px) saturate(180%)",
        borderTop: "1px solid rgba(255,255,255,0.05)",
        paddingBottom: "max(env(safe-area-inset-bottom), 6px)",
        boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
      }}>
      {/* Top separator line with gradient */}
      <div className="absolute top-0 left-0 right-0 h-px"
        style={{ background: "linear-gradient(90deg, transparent 0%, rgba(59,130,246,0.2) 30%, rgba(99,102,241,0.2) 70%, transparent 100%)" }} />

      <div className="flex items-center justify-around px-1 pt-2 pb-1">
        {tabs.map(({ path, icon: Icon, label, color, glow, grad }) => {
          const active = location === path || (path !== "/tecnico" && location.startsWith(path));
          return (
            <button key={path} onClick={() => navigate(path)}
              className="flex flex-col items-center gap-0.5 px-3 py-1 rounded-2xl transition-all duration-250 active:scale-90 relative"
              style={{ minWidth: "64px" }}>

              {/* Active indicator dot at top */}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 transition-all duration-300"
                style={{
                  width: active ? "24px" : "4px",
                  height: "2px",
                  borderRadius: "2px",
                  background: active ? grad : "transparent",
                  boxShadow: active ? `0 0 8px ${glow}` : "none",
                }} />

              {/* Icon container */}
              <div className="w-12 h-10 rounded-2xl flex items-center justify-center transition-all duration-250 relative overflow-hidden"
                style={{
                  background: active ? `${color}15` : "transparent",
                  boxShadow: active ? `0 4px 20px ${glow}, inset 0 1px 0 rgba(255,255,255,0.06)` : "none",
                }}>
                {/* Inner glow for active */}
                {active && (
                  <div className="absolute inset-0 rounded-2xl pointer-events-none"
                    style={{ background: `radial-gradient(circle at 50% 50%, ${color}20 0%, transparent 70%)` }} />
                )}
                <Icon className="w-5 h-5 relative z-10 transition-all duration-250"
                  style={{
                    color: active ? color : "rgba(71,85,105,0.55)",
                    strokeWidth: active ? 2.5 : 1.8,
                    filter: active ? `drop-shadow(0 0 6px ${glow})` : "none",
                  }} />
              </div>

              {/* Label */}
              <span className="text-[9px] font-bold tracking-wide transition-all duration-250"
                style={{
                  color: active ? color : "rgba(71,85,105,0.5)",
                  textShadow: active ? `0 0 12px ${glow}` : "none",
                  letterSpacing: "0.04em",
                }}>
                {label.toUpperCase()}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
