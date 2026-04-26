import { useLocation } from "wouter";
import { LayoutGrid, Map, ClipboardList, User } from "lucide-react";

const tabs = [
  { path: "/tecnico",           icon: LayoutGrid,    label: "Início",    gradient: "linear-gradient(135deg, #4f46e5, #6366f1)", glow: "rgba(99,102,241,0.5)", color: "#818cf8" },
  { path: "/tecnico/mapa",      icon: Map,           label: "Mapa",      gradient: "linear-gradient(135deg, #0891b2, #06b6d4)", glow: "rgba(6,182,212,0.5)",  color: "#22d3ee" },
  { path: "/tecnico/historico", icon: ClipboardList, label: "Histórico", gradient: "linear-gradient(135deg, #059669, #10b981)", glow: "rgba(16,185,129,0.5)", color: "#34d399" },
  { path: "/tecnico/perfil",    icon: User,          label: "Perfil",    gradient: "linear-gradient(135deg, #d97706, #f59e0b)", glow: "rgba(245,158,11,0.5)", color: "#fbbf24" },
];

export default function TecnicoBottomNav() {
  const [location, navigate] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-3"
      style={{
        background: "rgba(6,11,24,0.97)",
        backdropFilter: "blur(32px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        paddingBottom: "max(env(safe-area-inset-bottom), 10px)",
        paddingTop: "10px",
        minHeight: "68px",
      }}
    >
      {tabs.map(({ path, icon: Icon, label, gradient, glow, color }) => {
        const active = location === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex flex-col items-center gap-1.5 px-3 py-2 rounded-2xl transition-all duration-200 active:scale-95"
            style={{
              minWidth: "64px",
              background: active ? `${color}18` : "transparent",
            }}
          >
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center transition-all duration-200"
              style={{
                background: active ? gradient : "transparent",
                boxShadow: active ? `0 6px 20px ${glow}` : "none",
              }}
            >
              <Icon
                className="w-5 h-5 transition-all duration-200"
                style={{
                  color: active ? "white" : "rgba(100,116,139,0.6)",
                  strokeWidth: active ? 2.5 : 1.8,
                }}
              />
            </div>
            <span
              className="text-xs font-bold transition-all duration-200"
              style={{ color: active ? color : "rgba(100,116,139,0.5)" }}
            >
              {label}
            </span>
          </button>
        );
      })}
    </nav>
  );
}
