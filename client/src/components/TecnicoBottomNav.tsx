import { useState } from "react";
import { useLocation } from "wouter";
import { Bot, Box, Calculator, ClipboardCheck, Cloud, Home, Map, Menu, Radar, Route, User, Wrench, X } from "lucide-react";

const tabs = [
  { path: "/tecnico", icon: Home, label: "Início", color: "#60a5fa" },
  { path: "/tecnico/mapa", icon: Map, label: "Mapa", color: "#22d3ee" },
  { path: "/tecnico/rota", icon: Route, label: "Rota", color: "#a78bfa" },
  { path: "/tecnico/historico", icon: ClipboardCheck, label: "Histórico", color: "#34d399" },
];

const secondaryTabs = [
  { path: "/tecnico/prontidao", icon: Radar, label: "Conferência de saída", description: "O que impede a visita hoje", color: "#f87171" },
  { path: "/tecnico/manutencao", icon: Wrench, label: "Manutenções", description: "Atendimentos atribuídos", color: "#fb923c" },
  { path: "/tecnico/estoque", icon: Box, label: "Materiais", description: "Saldo e consumo", color: "#22d3ee" },
  { path: "/tecnico/ferramentas", icon: Calculator, label: "Ferramentas", description: "Cálculos de rede e PoE", color: "#34d399" },
  { path: "/tecnico/assistente", icon: Bot, label: "Assistente", description: "Dúvidas técnicas com fontes", color: "#a5b4fc" },
  { path: "/tecnico/sincronizacao", icon: Cloud, label: "Sincronização", description: "Pendências e novas tentativas", color: "#67e8f9" },
  { path: "/tecnico/perfil", icon: User, label: "Perfil", description: "Conta e preferências", color: "#fbbf24" },
];

export default function TecnicoBottomNav() {
  const [location, navigate] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);
  const moreActive = secondaryTabs.some(tab => location === tab.path || location.startsWith(`${tab.path}/`));

  function goTo(path: string) {
    setMoreOpen(false);
    navigate(path);
  }

  return (
    <>
      {moreOpen && <button type="button" aria-label="Fechar menu" onClick={() => setMoreOpen(false)} className="fixed inset-0 z-40" style={{ background: "rgba(2,6,23,0.58)", backdropFilter: "blur(3px)" }} />}

      <nav className="fixed bottom-0 left-0 right-0 z-50" aria-label="Navegação principal do técnico"
        style={{ background: "rgba(5,11,25,0.96)", backdropFilter: "blur(28px) saturate(160%)", borderTop: "1px solid rgba(148,163,184,0.14)", paddingBottom: "max(env(safe-area-inset-bottom), 8px)", boxShadow: "0 -12px 36px rgba(2,6,23,0.46)" }}>
        {moreOpen && (
          <section className="absolute bottom-[76px] left-3 right-3 overflow-hidden rounded-3xl p-3" aria-label="Mais opções"
            style={{ background: "linear-gradient(160deg,rgba(15,23,42,0.99),rgba(10,18,36,0.98))", border: "1px solid rgba(148,163,184,0.17)", boxShadow: "0 24px 64px rgba(0,0,0,0.5)" }}>
            <div className="flex items-center justify-between px-2 pb-2">
              <div><p className="text-sm font-bold text-white">Mais ferramentas</p><p className="mt-0.5 text-[11px] text-slate-400">Acesse funções de campo e sua conta</p></div>
              <button type="button" onClick={() => setMoreOpen(false)} className="grid h-8 w-8 place-items-center rounded-xl" style={{ color: "#cbd5e1", background: "rgba(148,163,184,0.1)" }}><X className="h-4 w-4" /></button>
            </div>
            <div className="grid gap-1">
              {secondaryTabs.map(({ path, icon: Icon, label, description, color }) => (
                <button key={path} type="button" onClick={() => goTo(path)} className="flex items-center gap-3 rounded-2xl px-3 py-3 text-left transition-transform active:scale-[0.98]" style={{ background: "rgba(255,255,255,0.035)" }}>
                  <span className="grid h-10 w-10 place-items-center rounded-xl" style={{ background: `${color}18`, color }}><Icon className="h-5 w-5" /></span>
                  <span className="min-w-0 flex-1"><span className="block text-sm font-semibold text-slate-100">{label}</span><span className="mt-0.5 block text-[11px] text-slate-400">{description}</span></span>
                  <span className="text-xs font-bold" style={{ color }}>Abrir</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <div className="grid grid-cols-5 items-center px-2 pt-2">
          {tabs.map(({ path, icon: Icon, label, color }) => {
            const active = location === path || (path !== "/tecnico" && location.startsWith(`${path}/`));
            return <button key={path} type="button" onClick={() => goTo(path)} aria-current={active ? "page" : undefined} className="flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 transition-transform active:scale-95">
              <span className="grid h-9 w-11 place-items-center rounded-xl" style={{ color: active ? color : "#94a3b8", background: active ? `${color}18` : "transparent", boxShadow: active ? `inset 0 0 0 1px ${color}26` : "none" }}><Icon className="h-[19px] w-[19px]" strokeWidth={active ? 2.4 : 1.8} /></span>
              <span className="max-w-full truncate text-[10px] font-semibold" style={{ color: active ? "#e2e8f0" : "#94a3b8" }}>{label}</span>
            </button>;
          })}
          <button type="button" onClick={() => setMoreOpen(value => !value)} aria-expanded={moreOpen} className="flex min-w-0 flex-col items-center gap-1 rounded-2xl px-1 py-1.5 transition-transform active:scale-95">
            <span className="grid h-9 w-11 place-items-center rounded-xl" style={{ color: moreActive || moreOpen ? "#f8fafc" : "#94a3b8", background: moreActive || moreOpen ? "rgba(148,163,184,0.14)" : "transparent" }}><Menu className="h-[19px] w-[19px]" strokeWidth={2} /></span>
            <span className="max-w-full truncate text-[10px] font-semibold" style={{ color: moreActive || moreOpen ? "#e2e8f0" : "#94a3b8" }}>Mais</span>
          </button>
        </div>
      </nav>
    </>
  );
}
