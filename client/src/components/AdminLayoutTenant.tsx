import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Users, School, GitBranch,
  ClipboardList, BarChart3, Map, Wifi, LogOut,
  Menu, X, TableProperties, ChevronRight,
} from "lucide-react";
import { useTenantAuth } from "@/hooks/useTenantAuth";

const navItems = [
  { path: "/admin",               label: "Dashboard",         icon: LayoutDashboard, color: "text-blue-400" },
  { path: "/admin/tecnicos",      label: "Técnicos",          icon: Users,           color: "text-purple-400" },
  { path: "/admin/escolas",       label: "Escolas",           icon: School,          color: "text-emerald-400" },
  { path: "/admin/atribuicoes",   label: "Atribuições",       icon: GitBranch,       color: "text-amber-400" },
  { path: "/admin/ordens",        label: "Ordens de Serviço", icon: ClipboardList,   color: "text-cyan-400" },
  { path: "/admin/relatorios",    label: "Relatórios",        icon: BarChart3,       color: "text-pink-400" },
  { path: "/admin/mapa",          label: "Mapa",              icon: Map,             color: "text-teal-400" },
  { path: "/admin/planilha",      label: "Planilha",          icon: TableProperties, color: "text-indigo-400" },
];

interface AdminLayoutTenantProps {
  children: React.ReactNode;
  title: string;
}

export default function AdminLayoutTenant({ children, title }: AdminLayoutTenantProps) {
  const { admin, loading, logout, isAuthenticated } = useTenantAuth();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/admin/login");
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "linear-gradient(135deg, oklch(0.10 0.04 240), oklch(0.16 0.07 240))" }}>
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, oklch(0.40 0.18 162), oklch(0.52 0.20 162))" }}>
              <Wifi className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl animate-ping opacity-20" style={{ background: "oklch(0.50 0.18 162)" }} />
          </div>
          <p className="text-white font-semibold text-lg">Netvionis</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  const initials = admin?.nome?.split(' ').map((n: string) => n[0]).slice(0, 2).join('').toUpperCase() ?? 'A';

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/60 z-20 lg:hidden backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 w-64 flex flex-col transition-transform duration-300 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{ background: "linear-gradient(180deg, oklch(0.11 0.05 240) 0%, oklch(0.14 0.055 240) 100%)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 px-5 py-5" style={{ borderBottom: "1px solid oklch(0.22 0.055 240)" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 relative"
            style={{ background: "linear-gradient(135deg, oklch(0.40 0.18 162), oklch(0.52 0.20 162))" }}>
            <Wifi className="w-5 h-5 text-white" />
            <div className="absolute inset-0 rounded-xl opacity-30" style={{ boxShadow: "0 0 20px oklch(0.50 0.18 162)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-white font-bold text-sm leading-tight">Netvionis</p>
            {admin?.tenant && (
              <p className="text-xs mt-0.5 truncate" style={{ color: "oklch(0.65 0.14 162)" }}>{admin.tenant.nome}</p>
            )}
            {!admin?.tenant && (
              <p className="text-xs mt-0.5" style={{ color: "oklch(0.55 0.06 240)" }}>Painel Administrativo</p>
            )}
          </div>
          <button className="lg:hidden p-1 rounded-lg hover:bg-white/10 transition-colors" onClick={() => setSidebarOpen(false)}>
            <X className="w-4 h-4" style={{ color: "oklch(0.60 0.04 240)" }} />
          </button>
        </div>

        {/* Nav label */}
        <div className="px-5 pt-5 pb-2">
          <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: "oklch(0.40 0.06 240)" }}>Menu Principal</p>
        </div>

        {/* Nav items */}
        <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto">
          {navItems.map((item) => {
            const isActive = location === item.path || (item.path !== '/admin' && location.startsWith(item.path));
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-150 group ${
                  isActive ? 'sidebar-item-active' : ''
                }`}
                style={isActive ? {} : { color: "oklch(0.62 0.04 240)" }}
                onMouseEnter={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = "oklch(0.20 0.06 240)"; (e.currentTarget as HTMLElement).style.color = "oklch(0.90 0.01 240)"; } }}
                onMouseLeave={e => { if (!isActive) { (e.currentTarget as HTMLElement).style.background = ""; (e.currentTarget as HTMLElement).style.color = "oklch(0.62 0.04 240)"; } }}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 transition-all ${isActive ? 'bg-emerald-500/20' : 'bg-white/5 group-hover:bg-white/10'}`}>
                  <item.icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : item.color} opacity-80 group-hover:opacity-100`} />
                </div>
                <span className="flex-1 text-left">{item.label}</span>
                {isActive && <ChevronRight className="w-3.5 h-3.5 text-emerald-400 opacity-70" />}
              </button>
            );
          })}
        </nav>

        {/* User profile */}
        <div className="px-3 pb-4" style={{ borderTop: "1px solid oklch(0.22 0.055 240)" }}>
          <div className="mt-4 p-3 rounded-xl flex items-center gap-3" style={{ background: "oklch(0.18 0.06 240)" }}>
            <div className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 font-bold text-sm text-white"
              style={{ background: "linear-gradient(135deg, oklch(0.40 0.18 162), oklch(0.30 0.10 240))" }}>
              {initials}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white truncate leading-tight">{admin?.nome ?? "Admin"}</p>
              <p className="text-xs truncate mt-0.5" style={{ color: "oklch(0.50 0.05 240)" }}>{admin?.email ?? ""}</p>
            </div>
            <button
              onClick={logout}
              className="p-1.5 rounded-lg transition-colors hover:bg-red-500/20 group"
              title="Sair"
            >
              <LogOut className="w-3.5 h-3.5 text-red-400 opacity-60 group-hover:opacity-100" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header className="h-14 bg-card border-b border-border flex items-center px-4 gap-4 flex-shrink-0 sticky top-0 z-10"
          style={{ boxShadow: "0 1px 3px oklch(0 0 0 / 0.06)" }}>
          <button className="lg:hidden p-2 rounded-lg hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            onClick={() => setSidebarOpen(true)}>
            <Menu className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-1.5 h-5 rounded-full" style={{ background: "linear-gradient(180deg, oklch(0.40 0.18 162), oklch(0.30 0.10 240))" }} />
            <h1 className="font-bold text-foreground text-base">{title}</h1>
          </div>
          <div className="flex items-center gap-2">
            {admin?.tenant && (
              <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                style={{ background: "oklch(0.93 0.07 162)", color: "oklch(0.34 0.16 162)" }}>
                <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "oklch(0.50 0.18 162)" }} />
                {admin.tenant.plano.charAt(0).toUpperCase() + admin.tenant.plano.slice(1)}
              </div>
            )}
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
