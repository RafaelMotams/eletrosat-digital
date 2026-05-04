import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { useEffect, useState } from "react";
import {
  LayoutDashboard, Users, School, GitBranch,
  ClipboardList, BarChart3, Map, Wifi, LogOut,
  Menu, X, TableProperties, ChevronRight,
  Activity, Settings,
} from "lucide-react";
import { Button } from "./ui/button";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const navItems = [
  { path: "/admin",               label: "Dashboard",         icon: LayoutDashboard, accent: "#3b82f6" },
  { path: "/admin/tecnicos",      label: "Técnicos",          icon: Users,           accent: "#a855f7" },
  { path: "/admin/escolas",       label: "Escolas",           icon: School,          accent: "#10b981" },
  { path: "/admin/atribuicoes",   label: "Atribuições",       icon: GitBranch,       accent: "#f59e0b" },
  { path: "/admin/ordens",        label: "Ordens de Serviço", icon: ClipboardList,   accent: "#06b6d4" },
  { path: "/admin/relatorios",    label: "Relatórios",        icon: BarChart3,       accent: "#ec4899" },
  { path: "/admin/mapa",          label: "Mapa",              icon: Map,             accent: "#14b8a6" },
  { path: "/admin/planilha",      label: "Planilha",          icon: TableProperties, accent: "#6366f1" },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

export default function AdminLayout({ children, title }: AdminLayoutProps) {
  const { user, isAuthenticated, loading } = useAuth();
  const [location, navigate] = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const logout = trpc.auth.logout.useMutation({
    onSuccess: () => { toast.success("Sessão encerrada com sucesso"); navigate("/"); },
  });

  useEffect(() => {
    if (!loading && !isAuthenticated) window.location.href = getLoginUrl();
  }, [loading, isAuthenticated]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#060d1f" }}>
        <div className="flex flex-col items-center gap-5">
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #10b981, #059669)", boxShadow: "0 0 40px rgba(16,185,129,0.5)" }}>
              <Wifi className="w-8 h-8 text-white" />
            </div>
            <div className="absolute inset-0 rounded-2xl animate-ping opacity-20"
              style={{ background: "#10b981" }} />
          </div>
          <div className="flex flex-col items-center gap-2">
            <p className="text-white font-semibold text-lg" style={{ fontFamily: "var(--font-display)" }}>Netvionis</p>
            <div className="flex gap-1.5">
              {[0, 1, 2].map(i => (
                <div key={i} className="w-1.5 h-1.5 rounded-full animate-pulse-dot"
                  style={{ background: "#10b981", animationDelay: `${i * 0.2}s` }} />
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) return null;

  if (user?.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-5 text-center max-w-sm p-10 bg-card rounded-2xl shadow-xl border border-border">
          <div className="w-16 h-16 rounded-full flex items-center justify-center" style={{ background: "oklch(0.96 0.04 25)" }}>
            <Wifi className="w-8 h-8" style={{ color: "oklch(0.56 0.22 25)" }} />
          </div>
          <div>
            <h2 className="text-xl font-bold text-foreground mb-2" style={{ fontFamily: "var(--font-display)" }}>Acesso Restrito</h2>
            <p className="text-muted-foreground text-sm leading-relaxed">Sua conta não tem permissão de administrador.</p>
          </div>
          <div className="px-4 py-2 rounded-full text-xs font-mono bg-muted text-muted-foreground">{user?.email}</div>
          <Button variant="outline" size="sm" onClick={() => logout.mutate()} className="gap-2">
            <LogOut className="w-4 h-4" /> Sair e entrar com outra conta
          </Button>
        </div>
      </div>
    );
  }

  const initials = user?.name?.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase() ?? 'A';
  const activeItem = navItems.find(item =>
    item.path === '/admin' ? location === '/admin' : location.startsWith(item.path)
  );

  return (
    <div className="min-h-screen flex bg-background">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-20 lg:hidden"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-30 flex flex-col transition-transform duration-300 ease-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        }`}
        style={{
          width: 256,
          background: "linear-gradient(180deg, #0a1628 0%, #0d1f3c 50%, #0a1628 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Ambient glow top */}
        <div style={{
          position: "absolute", top: 0, left: 0, right: 0, height: 200,
          background: "radial-gradient(ellipse at 50% -20%, rgba(16,185,129,0.12) 0%, transparent 70%)",
          pointerEvents: "none",
        }} />

        {/* Logo */}
        <div style={{
          display: "flex", alignItems: "center", gap: 12,
          padding: "20px 20px 18px",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          position: "relative", zIndex: 1,
        }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12, flexShrink: 0,
            background: "linear-gradient(135deg, #10b981, #059669)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(16,185,129,0.45), 0 4px 12px rgba(0,0,0,0.3)",
          }}>
            <Wifi size={18} color="white" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ color: "white", fontWeight: 800, fontSize: 16, lineHeight: 1.1, fontFamily: "var(--font-display)" }}>Netvionis</p>
            <p style={{ color: "rgba(16,185,129,0.6)", fontSize: 10, fontWeight: 500, marginTop: 2 }}>Gestão inteligente</p>
          </div>
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(false)}
            style={{ padding: 6, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)" }}
          >
            <X size={14} />
          </button>
        </div>

        {/* Nav label */}
        <div style={{ padding: "18px 20px 8px", position: "relative", zIndex: 1 }}>
          <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.1em" }}>
            Menu Principal
          </p>
        </div>

        {/* Nav items */}
        <nav style={{ flex: 1, padding: "0 10px 16px", overflowY: "auto", position: "relative", zIndex: 1 }}>
          {navItems.map((item) => {
            const isActive = item.path === '/admin' ? location === '/admin' : location.startsWith(item.path);
            return (
              <button
                key={item.path}
                onClick={() => { navigate(item.path); setSidebarOpen(false); }}
                style={{
                  width: "100%", display: "flex", alignItems: "center", gap: 10,
                  padding: "9px 12px", borderRadius: 10, marginBottom: 2,
                  background: isActive ? `${item.accent}18` : "transparent",
                  border: isActive ? `1px solid ${item.accent}30` : "1px solid transparent",
                  cursor: "pointer", textAlign: "left", transition: "all 0.15s",
                }}
                onMouseEnter={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { if (!isActive) (e.currentTarget as HTMLElement).style.background = "transparent"; }}
              >
                <div style={{
                  width: 32, height: 32, borderRadius: 8, flexShrink: 0,
                  background: isActive ? `${item.accent}20` : "rgba(255,255,255,0.05)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  transition: "all 0.15s",
                }}>
                  <item.icon size={15} color={isActive ? item.accent : "rgba(255,255,255,0.4)"} />
                </div>
                <span style={{
                  flex: 1, fontSize: 13, fontWeight: isActive ? 600 : 500,
                  color: isActive ? "white" : "rgba(255,255,255,0.5)",
                  transition: "color 0.15s",
                }}>
                  {item.label}
                </span>
                {isActive && (
                  <ChevronRight size={12} color={item.accent} style={{ opacity: 0.7 }} />
                )}
              </button>
            );
          })}
        </nav>

        {/* User profile */}
        <div style={{
          padding: "12px 10px 16px",
          borderTop: "1px solid rgba(255,255,255,0.06)",
          position: "relative", zIndex: 1,
        }}>
          <div style={{
            display: "flex", alignItems: "center", gap: 10,
            padding: "10px 12px", borderRadius: 12,
            background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: "50%", flexShrink: 0,
              background: "linear-gradient(135deg, #10b981, #3b82f6)",
              display: "flex", alignItems: "center", justifyContent: "center",
              fontWeight: 700, fontSize: 13, color: "white",
              boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
            }}>
              {initials}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ color: "white", fontSize: 13, fontWeight: 600, lineHeight: 1.2, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {user?.name ?? "Admin"}
              </p>
              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginTop: 1 }}>
                {user?.email ?? ""}
              </p>
            </div>
            <button
              onClick={() => logout.mutate()}
              title="Sair"
              style={{
                padding: 6, borderRadius: 8, background: "none", border: "none",
                cursor: "pointer", color: "rgba(239,68,68,0.6)", display: "flex",
                transition: "all 0.15s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(239,68,68,0.1)"; (e.currentTarget as HTMLElement).style.color = "rgba(239,68,68,1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "none"; (e.currentTarget as HTMLElement).style.color = "rgba(239,68,68,0.6)"; }}
            >
              <LogOut size={14} />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar */}
        <header
          className="flex items-center px-4 gap-4 flex-shrink-0 sticky top-0 z-10"
          style={{
            height: 56,
            background: "rgba(255,255,255,0.98)",
            borderBottom: "1px solid oklch(0.89 0.018 240)",
            boxShadow: "0 1px 8px rgba(0,0,0,0.06)",
            backdropFilter: "blur(12px)",
          }}
        >
          <button
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
            style={{ padding: 8, borderRadius: 8, background: "none", border: "none", cursor: "pointer", color: "oklch(0.50 0.05 240)" }}
          >
            <Menu size={20} />
          </button>

          <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
            {activeItem && (
              <div style={{
                width: 28, height: 28, borderRadius: 8,
                background: `${activeItem.accent}15`,
                display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <activeItem.icon size={14} color={activeItem.accent} />
              </div>
            )}
            <h1 style={{ fontWeight: 700, color: "oklch(0.13 0.045 240)", fontSize: 15, fontFamily: "var(--font-display)" }}>
              {title}
            </h1>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div className="hidden sm:flex" style={{
              alignItems: "center", gap: 6, padding: "5px 12px",
              background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)",
              borderRadius: 100,
            }}>
              <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
              <span style={{ color: "#059669", fontSize: 12, fontWeight: 600 }}>Sistema Online</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto" style={{ padding: "24px" }}>
          {children}
        </main>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
      `}</style>
    </div>
  );
}
