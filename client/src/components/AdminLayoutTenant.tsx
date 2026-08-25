import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Users, School, GitBranch,
  ClipboardList, BarChart3, Map, Wifi, LogOut,
  Menu, X, TableProperties, ChevronRight,
  Bell, Search, Zap, Shield, Settings, Wrench,
} from "lucide-react";
import { useTenantAuth } from "@/hooks/useTenantAuth";
import { trpc } from "@/lib/trpc";
import TrialExpirado from "@/pages/admin/TrialExpirado";

const navGroups = [
  {
    label: "Visão Geral",
    items: [
      { path: "/admin",             label: "Dashboard",         icon: LayoutDashboard, color: "#22d3ee", desc: "Métricas e KPIs" },
    ],
  },
  {
    label: "Gestão",
    items: [
      { path: "/admin/tecnicos",    label: "Técnicos",          icon: Users,           color: "#a78bfa", desc: "Equipe de campo" },
      { path: "/admin/escolas",     label: "Escolas",           icon: School,          color: "#34d399", desc: "Unidades escolares" },
      { path: "/admin/atribuicoes", label: "Atribuições",       icon: GitBranch,       color: "#fbbf24", desc: "Alocação de equipes" },
      { path: "/admin/ordens",      label: "Ordens de Serviço", icon: ClipboardList,   color: "#f472b6", desc: "OS e execução" },
      { path: "/admin/manutencao",   label: "Manutenção",         icon: Wrench,          color: "#fb923c", desc: "Ordens de manutenção" },
    ],
  },
  {
    label: "Análise",
    items: [
      { path: "/admin/relatorios",  label: "Relatórios",        icon: BarChart3,       color: "#fb923c", desc: "Desempenho e metas" },
      { path: "/admin/mapa",        label: "Mapa Interativo",   icon: Map,             color: "#38bdf8", desc: "Visualização geográfica" },
      { path: "/admin/planilha",    label: "Importação",        icon: TableProperties, color: "#818cf8", desc: "Upload de planilhas" },
    ],
  },
  {
    label: "Sistema",
    items: [
      { path: "/admin/configuracoes", label: "Configurações", icon: Settings, color: "#94a3b8", desc: "Conta e preferências" },
    ],
  },
];

interface AdminLayoutTenantProps {
  children: React.ReactNode;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export default function AdminLayoutTenant({ children, title, subtitle, actions }: AdminLayoutTenantProps) {
  const { admin, loading, logout, isAuthenticated } = useTenantAuth();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  const { data: stats } = trpc.dashboard.stats.useQuery(undefined, {
    enabled: isAuthenticated,
    refetchInterval: 60000,
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) navigate("/admin/login");
  }, [loading, isAuthenticated, navigate]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setSearchOpen(v => !v); }
      if (e.key === "Escape") setSearchOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "oklch(0.10 0.04 240)" }}>
        <div className="flex flex-col items-center gap-4">
          <div className="relative w-16 h-16">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, oklch(0.40 0.18 162), oklch(0.52 0.20 162))" }}>
              <Wifi className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl animate-ping opacity-20"
              style={{ background: "oklch(0.50 0.18 162)" }} />
          </div>
          <div className="flex gap-1.5">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full animate-bounce"
                style={{ background: "oklch(0.50 0.18 162)", animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }
  if (!isAuthenticated) return null;

  // Verificar se o trial expirou ou conta está bloqueada
  const tenantStatus = (admin as any)?.tenant?.status;
  if (tenantStatus === "expirado" || tenantStatus === "suspenso" || tenantStatus === "cancelado") {
    return <TrialExpirado motivo={tenantStatus === "expirado" ? "trial_expirado" : tenantStatus} />;
  }

  const initials = admin?.nome?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? 'A';
  const tenantName = (admin as any)?.tenant?.nome ?? admin?.nome ?? "Netvius";
  const planoBadge = (admin as any)?.tenant?.plano ?? "pro";
  const isViewer = admin?.role === 'viewer';

  // Viewer não vê Nota Fiscal (contém valores financeiros)
  const visibleNavGroups = navGroups.map(g => ({
    ...g,
    items: g.items.filter(item => !(isViewer && item.path === '/admin/nota-fiscal'))
  })).filter(g => g.items.length > 0);

  const allNavItems = visibleNavGroups.flatMap(g => g.items);
  const filteredItems = searchQuery
    ? allNavItems.filter(i => i.label.toLowerCase().includes(searchQuery.toLowerCase()) || i.desc.toLowerCase().includes(searchQuery.toLowerCase()))
    : [];

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      <div className="px-4 py-4 flex items-center justify-between"
        style={{ borderBottom: "1px solid oklch(0.20 0.05 240)" }}>
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, oklch(0.40 0.18 162), oklch(0.55 0.22 162))", boxShadow: "0 0 20px oklch(0.50 0.18 162 / 0.4)" }}>
            <Wifi className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <p className="text-white font-bold text-sm leading-tight truncate">Netvius</p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <div className="w-1.5 h-1.5 rounded-full" style={{ background: "oklch(0.50 0.18 162)" }} />
                <p className="text-xs truncate" style={{ color: "oklch(0.60 0.04 240)" }}>{tenantName}</p>
              </div>
            </div>
          )}
        </div>
        {!collapsed && (
          <button onClick={() => setCollapsed(true)} className="hidden lg:flex w-7 h-7 rounded-lg items-center justify-center transition-colors hover:bg-white/10">
            <ChevronRight className="w-4 h-4 rotate-180" style={{ color: "oklch(0.55 0.04 240)" }} />
          </button>
        )}
        <button className="lg:hidden p-1 rounded-lg hover:bg-white/10" onClick={() => setSidebarOpen(false)}>
          <X className="w-4 h-4" style={{ color: "oklch(0.60 0.04 240)" }} />
        </button>
      </div>

      {!collapsed && (
        <div className="px-3 py-3">
          <button onClick={() => setSearchOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all"
            style={{ background: "oklch(0.16 0.05 240)", border: "1px solid oklch(0.22 0.05 240)", color: "oklch(0.55 0.04 240)" }}>
            <Search className="w-4 h-4 flex-shrink-0" />
            <span className="flex-1 text-left text-xs">Buscar...</span>
            <kbd className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: "oklch(0.20 0.05 240)", color: "oklch(0.50 0.04 240)" }}>⌘K</kbd>
          </button>
        </div>
      )}

      <nav className="flex-1 overflow-y-auto px-2 py-1 space-y-4">
        {visibleNavGroups.map(group => (
          <div key={group.label}>
            {!collapsed && (
              <p className="px-3 mb-1.5 text-xs font-semibold uppercase tracking-widest"
                style={{ color: "oklch(0.40 0.04 240)" }}>{group.label}</p>
            )}
            <div className="space-y-0.5">
              {group.items.map(item => {
                const Icon = item.icon;
                const isActive = location === item.path || (item.path !== "/admin" && location.startsWith(item.path));
                return (
                  <button key={item.path}
                    onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                    title={collapsed ? item.label : undefined}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group relative"
                    style={{
                      background: isActive ? `${item.color}18` : "transparent",
                      color: isActive ? item.color : "oklch(0.58 0.04 240)",
                    }}>
                    {isActive && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full"
                        style={{ background: item.color }} />
                    )}
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all"
                      style={{ background: isActive ? `${item.color}22` : "oklch(0.16 0.05 240)" }}>
                      <Icon className="w-4 h-4" style={{ color: isActive ? item.color : "oklch(0.55 0.04 240)" }} />
                    </div>
                    {!collapsed && (
                      <div className="flex-1 min-w-0 text-left">
                        <p className="text-sm font-semibold leading-tight truncate"
                          style={{ color: isActive ? item.color : "oklch(0.75 0.04 240)" }}>{item.label}</p>
                        <p className="text-xs leading-tight truncate" style={{ color: "oklch(0.45 0.04 240)" }}>{item.desc}</p>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      {!collapsed && stats && (
        <div className="mx-3 mb-3 p-3 rounded-xl" style={{ background: "oklch(0.16 0.05 240)", border: "1px solid oklch(0.20 0.05 240)" }}>
          <p className="text-xs font-semibold mb-2" style={{ color: "oklch(0.45 0.04 240)" }}>Resumo rápido</p>
          <div className="grid grid-cols-2 gap-2">
            <div className="text-center">
              <p className="text-lg font-black text-white">{(stats as any).totalEscolas ?? 0}</p>
              <p className="text-xs" style={{ color: "oklch(0.50 0.04 240)" }}>Escolas</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black" style={{ color: "oklch(0.50 0.18 162)" }}>{(stats as any).concluidas ?? 0}</p>
              <p className="text-xs" style={{ color: "oklch(0.50 0.04 240)" }}>Concluídas</p>
            </div>
          </div>
        </div>
      )}

      {!collapsed && (
        <div className="mx-3 mb-3 p-3 rounded-xl flex items-center gap-2"
          style={{ background: "linear-gradient(135deg, oklch(0.20 0.08 280), oklch(0.18 0.06 240))", border: "1px solid oklch(0.28 0.08 280)" }}>
          <Zap className="w-4 h-4 flex-shrink-0" style={{ color: "#a78bfa" }} />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold capitalize" style={{ color: "#c4b5fd" }}>Plano {planoBadge}</p>
            <p className="text-xs" style={{ color: "oklch(0.50 0.04 240)" }}>Ativo e sincronizado</p>
          </div>
          <Shield className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#7c3aed" }} />
        </div>
      )}

      <div className="px-3 pb-4 pt-2" style={{ borderTop: "1px solid oklch(0.18 0.05 240)" }}>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black text-white flex-shrink-0"
            style={{ background: "linear-gradient(135deg, oklch(0.40 0.18 162), oklch(0.52 0.20 162))" }}>
            {initials}
          </div>
          {!collapsed && (
            <>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-semibold text-white truncate">{admin?.nome ?? "Admin"}</p>
                  {isViewer && (
                    <span className="text-xs px-1.5 py-0.5 rounded-full flex-shrink-0" style={{ background: "oklch(0.30 0.12 280 / 0.5)", color: "#c4b5fd", fontSize: "10px" }}>Visualizador</span>
                  )}
                </div>
                <p className="text-xs truncate" style={{ color: "oklch(0.50 0.04 240)" }}>{admin?.email ?? ""}</p>
              </div>
              <button onClick={logout}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-all hover:bg-red-500/15 group"
                title="Sair">
                <LogOut className="w-4 h-4 group-hover:text-red-400 transition-colors" style={{ color: "oklch(0.50 0.04 240)" }} />
              </button>
            </>
          )}
          {collapsed && (
            <button onClick={logout} className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-red-500/15" title="Sair">
              <LogOut className="w-4 h-4" style={{ color: "oklch(0.50 0.04 240)" }} />
            </button>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ background: "oklch(0.965 0.004 240)" }}>
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {searchOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
          style={{ background: "rgba(0,0,0,0.6)", backdropFilter: "blur(8px)" }}
          onClick={() => setSearchOpen(false)}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
            style={{ background: "oklch(0.14 0.05 240)", border: "1px solid oklch(0.22 0.05 240)" }}
            onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 px-4 py-3.5" style={{ borderBottom: "1px solid oklch(0.20 0.05 240)" }}>
              <Search className="w-5 h-5 flex-shrink-0" style={{ color: "oklch(0.55 0.04 240)" }} />
              <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar página ou funcionalidade..."
                className="flex-1 bg-transparent text-white placeholder-gray-500 text-sm outline-none" />
              <kbd className="text-xs px-2 py-1 rounded-lg" style={{ background: "oklch(0.20 0.05 240)", color: "oklch(0.50 0.04 240)" }}>ESC</kbd>
            </div>
            <div className="py-2 max-h-80 overflow-y-auto">
              {searchQuery && filteredItems.length === 0 && (
                <p className="px-4 py-8 text-center text-sm" style={{ color: "oklch(0.50 0.04 240)" }}>Nenhum resultado para "{searchQuery}"</p>
              )}
              {(searchQuery ? filteredItems : allNavItems).map(item => {
                const Icon = item.icon;
                return (
                  <button key={item.path}
                    onClick={() => { navigate(item.path); setSearchOpen(false); setSearchQuery(""); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: `${item.color}18` }}>
                      <Icon className="w-4 h-4" style={{ color: item.color }} />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{item.label}</p>
                      <p className="text-xs" style={{ color: "oklch(0.50 0.04 240)" }}>{item.desc}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <aside
        className={`hidden lg:flex flex-col flex-shrink-0 transition-all duration-300 ease-out ${collapsed ? "w-16" : "w-64"}`}
        style={{ background: "oklch(0.11 0.045 240)", borderRight: "1px solid oklch(0.18 0.05 240)" }}>
        {collapsed && (
          <button onClick={() => setCollapsed(false)}
            className="mx-auto mt-4 w-8 h-8 rounded-lg flex items-center justify-center hover:bg-white/10 transition-colors"
            style={{ color: "oklch(0.55 0.04 240)" }}>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
        <SidebarContent />
      </aside>

      <aside
        className={`fixed lg:hidden inset-y-0 left-0 z-30 w-72 flex flex-col transition-transform duration-300 ease-out ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}
        style={{ background: "oklch(0.11 0.045 240)", borderRight: "1px solid oklch(0.18 0.05 240)" }}>
        <SidebarContent />
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="sticky top-0 z-10 flex items-center gap-4 px-4 lg:px-6 h-14 flex-shrink-0"
          style={{ background: "oklch(0.965 0.004 240 / 0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid oklch(0.89 0.018 240)" }}>
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden w-9 h-9 rounded-xl flex items-center justify-center hover:bg-black/5 transition-colors">
            <Menu className="w-5 h-5" style={{ color: "oklch(0.40 0.05 240)" }} />
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold truncate" style={{ color: "oklch(0.13 0.045 240)" }}>{title}</h1>
              {subtitle && (
                <>
                  <ChevronRight className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "oklch(0.60 0.04 240)" }} />
                  <span className="text-sm truncate" style={{ color: "oklch(0.55 0.04 240)" }}>{subtitle}</span>
                </>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {actions}
            <button onClick={() => setSearchOpen(true)}
              className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-all hover:bg-black/5"
              style={{ color: "oklch(0.55 0.04 240)", border: "1px solid oklch(0.89 0.018 240)" }}>
              <Search className="w-3.5 h-3.5" />
              <span className="text-xs">Buscar</span>
              <kbd className="text-xs px-1.5 py-0.5 rounded-md" style={{ background: "oklch(0.94 0.012 240)", color: "oklch(0.55 0.04 240)" }}>⌘K</kbd>
            </button>
            <button className="w-9 h-9 rounded-xl flex items-center justify-center hover:bg-black/5 transition-colors relative">
              <Bell className="w-4 h-4" style={{ color: "oklch(0.40 0.05 240)" }} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full" style={{ background: "oklch(0.50 0.18 162)" }} />
            </button>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black text-white"
              style={{ background: "linear-gradient(135deg, oklch(0.40 0.18 162), oklch(0.52 0.20 162))" }}>
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
