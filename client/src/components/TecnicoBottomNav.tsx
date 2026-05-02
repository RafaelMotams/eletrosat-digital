import { useLocation } from "wouter";
import { Home, Map, ClipboardCheck, User } from "lucide-react";

const tabs = [
  { path: "/tecnico",           icon: Home,           label: "Início",    color: "#3b82f6", activeGlow: "rgba(59,130,246,0.3)" },
  { path: "/tecnico/mapa",      icon: Map,            label: "Mapa",      color: "#06b6d4", activeGlow: "rgba(6,182,212,0.3)" },
  { path: "/tecnico/historico", icon: ClipboardCheck, label: "Histórico", color: "#10b981", activeGlow: "rgba(16,185,129,0.3)" },
  { path: "/tecnico/perfil",    icon: User,           label: "Perfil",    color: "#f59e0b", activeGlow: "rgba(245,158,11,0.3)" },
];

export default function TecnicoBottomNav() {
  const [location, navigate] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50"
      style={{
        background: "rgba(5,13,31,0.96)",
        backdropFilter: "blur(40px)",
        borderTop: "1px solid rgba(255,255,255,0.06)",
        paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
      }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-1">
        {tabs.map(({ path, icon: Icon, label, color, activeGlow }) => {
          const active = location === path || (path !== "/tecnico" && location.startsWith(path));
          return (
            <button
              key={path}
              onClick={() => navigate(path)}
              className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-all duration-200 active:scale-95 relative"
              style={{ minWidth: "60px" }}
            >
              {active && (
                <div className="absolute -top-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full"
                  style={{ background: color }} />
              )}
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center transition-all duration-200"
                style={{
                  background: active ? `${color}18` : "transparent",
                  boxShadow: active ? `0 4px 16px ${activeGlow}` : "none",
                }}
              >
                <Icon
                  className="w-5 h-5 transition-all duration-200"
                  style={{
                    color: active ? color : "rgba(71,85,105,0.7)",
                    strokeWidth: active ? 2.5 : 1.8,
                  }}
                />
              </div>
              <span
                className="text-[10px] font-semibold transition-all duration-200"
                style={{ color: active ? color : "rgba(71,85,105,0.6)" }}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
