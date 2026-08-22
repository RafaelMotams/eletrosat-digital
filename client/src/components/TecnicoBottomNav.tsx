import { useLocation } from "wouter";
import { ClipboardList, Home, Map, MoreHorizontal, Navigation } from "lucide-react";

const tabs = [
  { path: "/tecnico", icon: Home, label: "Início" },
  { path: "/tecnico/historico", icon: ClipboardList, label: "Ordens" },
  { path: "/tecnico/rota", icon: Navigation, label: "Missão" },
  { path: "/tecnico/mapa", icon: Map, label: "Mapa" },
  { path: "/tecnico/perfil", icon: MoreHorizontal, label: "Mais" },
];

export default function TecnicoBottomNav() {
  const [location, navigate] = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white shadow-[0_-4px_20px_rgba(15,23,42,0.08)]" style={{ paddingBottom: "max(env(safe-area-inset-bottom), 6px)" }}>
      <div className="mx-auto grid max-w-xl grid-cols-5 gap-1 px-2 pb-1 pt-2">
        {tabs.map(({ path, icon: Icon, label }) => {
          const active = location === path || (path !== "/tecnico" && location.startsWith(path));
          return (
            <button key={path} onClick={() => navigate(path)}
              className={`flex min-h-11 flex-col items-center justify-center gap-1 rounded-xl px-1 py-1.5 transition duration-150 active:scale-[0.97] ${active ? "bg-emerald-50 text-emerald-800" : "text-slate-600 hover:bg-slate-50"}`}
              aria-label={label}>
              <div className={`flex h-6 w-8 items-center justify-center rounded-lg ${active ? "bg-emerald-100" : ""}`}>
                <Icon className="h-5 w-5" strokeWidth={active ? 2.5 : 2} />
              </div>
              <span className="text-xs font-semibold leading-none">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
