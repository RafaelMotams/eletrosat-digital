import { useLocation } from "wouter";
import { LayoutGrid, Map, ClipboardList, User } from "lucide-react";

const tabs = [
  { path: "/tecnico",           icon: LayoutGrid,    label: "Início"    },
  { path: "/tecnico/mapa",      icon: Map,           label: "Mapa"      },
  { path: "/tecnico/historico", icon: ClipboardList, label: "Histórico" },
  { path: "/tecnico/perfil",    icon: User,          label: "Perfil"    },
];

export default function TecnicoBottomNav() {
  const [location, navigate] = useLocation();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around px-2"
      style={{
        background: "rgba(10,15,30,0.97)",
        backdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(255,255,255,0.07)",
        paddingBottom: "max(env(safe-area-inset-bottom), 8px)",
        paddingTop: "8px",
        minHeight: "62px",
      }}
    >
      {tabs.map(({ path, icon: Icon, label }) => {
        const active = location === path;
        return (
          <button
            key={path}
            onClick={() => navigate(path)}
            className="flex flex-col items-center gap-1 px-4 py-1.5 rounded-2xl transition-all duration-200"
            style={{
              color: active ? "#10b981" : "rgba(100,116,139,0.7)",
              background: active ? "rgba(16,185,129,0.10)" : "transparent",
              minWidth: "60px",
            }}
          >
            <Icon
              className="w-5 h-5 transition-all duration-200"
              style={{
                filter: active ? "drop-shadow(0 0 6px rgba(16,185,129,0.5))" : "none",
                strokeWidth: active ? 2.5 : 1.8,
              }}
            />
            <span className="text-xs font-medium">{label}</span>
          </button>
        );
      })}
    </nav>
  );
}
