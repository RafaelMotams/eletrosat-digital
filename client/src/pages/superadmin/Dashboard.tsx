import { useState, useEffect, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import {
  LayoutDashboard, Users, Plus, LogOut, Wifi, Building2, Settings,
  MoreVertical, Search, ChevronDown, CheckCircle, AlertCircle,
  Eye, EyeOff, Trash2, Edit2, ExternalLink, Shield, TrendingUp,
  Activity, UserCheck, XCircle, RefreshCw, Copy, Check,
  ChevronRight, Menu, X, Globe, Lock, Zap, Crown, Star
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────
type Tenant = {
  id: number; nome: string; slug: string; plano: "basico" | "profissional" | "enterprise";
  status: "ativo" | "trial" | "expirado" | "suspenso" | "cancelado"; contato: string | null; email: string | null;
  telefone: string | null; observacoes: string | null;
  diasTrial: number; trialInicio: Date; trialFim: Date | null;
  createdAt: Date;
};
type Admin = {
  id: number; tenantId: number; nome: string; email: string;
  role: "admin" | "viewer"; ativo: boolean; ultimoLogin: Date | null; createdAt: Date;
};

// ─── Config ──────────────────────────────────────────────────────────────────
const PLANO_CFG = {
  basico:       { label: "Básico",        color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)", icon: Zap,   grad: "linear-gradient(135deg, #475569, #334155)" },
  profissional: { label: "Profissional",  color: "#60a5fa", bg: "rgba(96,165,250,0.1)",  border: "rgba(96,165,250,0.2)",  icon: Star,  grad: "linear-gradient(135deg, #1d4ed8, #2563eb)" },
  enterprise:   { label: "Enterprise",    color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.2)",  icon: Crown, grad: "linear-gradient(135deg, #92400e, #b45309)" },
};
const STATUS_CFG = {
  ativo:     { label: "Ativo",        color: "#34d399", bg: "rgba(52,211,153,0.1)",  border: "rgba(52,211,153,0.2)",  dot: "#10b981" },
  trial:     { label: "Trial",        color: "#a78bfa", bg: "rgba(167,139,250,0.1)", border: "rgba(167,139,250,0.2)", dot: "#8b5cf6" },
  expirado:  { label: "Expirado",     color: "#f87171", bg: "rgba(248,113,113,0.1)", border: "rgba(248,113,113,0.2)", dot: "#ef4444" },
  suspenso:  { label: "Suspenso",     color: "#fbbf24", bg: "rgba(251,191,36,0.1)",  border: "rgba(251,191,36,0.2)",  dot: "#f59e0b" },
  cancelado: { label: "Cancelado",    color: "#94a3b8", bg: "rgba(148,163,184,0.1)", border: "rgba(148,163,184,0.2)", dot: "#64748b" },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────
function PlanoBadge({ plano }: { plano: keyof typeof PLANO_CFG }) {
  const p = PLANO_CFG[plano];
  const Icon = p.icon;
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-bold"
      style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}` }}>
      <Icon size={10} /> {p.label}
    </span>
  );
}
function StatusBadge({ status }: { status: keyof typeof STATUS_CFG }) {
  const s = STATUS_CFG[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}
function Toast({ msg, type, onClose }: { msg: string; type: "ok" | "err"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl animate-in slide-in-from-bottom-4"
      style={{
        background: type === "ok" ? "linear-gradient(135deg, #064e3b, #065f46)" : "linear-gradient(135deg, #7f1d1d, #991b1b)",
        border: `1px solid ${type === "ok" ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
        backdropFilter: "blur(20px)",
      }}>
      {type === "ok" ? <CheckCircle size={16} style={{ color: "#34d399" }} /> : <AlertCircle size={16} style={{ color: "#f87171" }} />}
      <span className="text-sm font-medium text-white">{msg}</span>
    </div>
  );
}
function Input({ label, type = "text", value, onChange, placeholder, required, hint }: {
  label: string; type?: string; value: string; onChange: (v: string) => void;
  placeholder?: string; required?: boolean; hint?: string;
}) {
  const [show, setShow] = useState(false);
  const isPassword = type === "password";
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
        {label} {required && <span style={{ color: "#f87171" }}>*</span>}
      </label>
      <div className="relative">
        <input
          type={isPassword ? (show ? "text" : "password") : type}
          value={value} onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white outline-none transition-all"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            paddingRight: isPassword ? "2.5rem" : undefined,
          }}
          onFocus={e => { e.currentTarget.style.borderColor = "rgba(0,245,160,0.4)"; e.currentTarget.style.background = "rgba(255,255,255,0.07)"; }}
          onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
        />
        {isPassword && (
          <button type="button" onClick={() => setShow(s => !s)}
            className="absolute right-3 top-1/2 -translate-y-1/2"
            style={{ color: "rgba(255,255,255,0.35)" }}>
            {show ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        )}
      </div>
      {hint && <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>{hint}</p>}
    </div>
  );
}
function Select({ label, value, onChange, options, required }: {
  label: string; value: string; onChange: (v: string) => void;
  options: { value: string; label: string }[]; required?: boolean;
}) {
  return (
    <div>
      <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>
        {label} {required && <span style={{ color: "#f87171" }}>*</span>}
      </label>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white outline-none"
        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
        {options.map(o => <option key={o.value} value={o.value} style={{ background: "#1a2035" }}>{o.label}</option>)}
      </select>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SuperadminDashboard() {
  const [admin] = useState(() => {
    try { return JSON.parse(localStorage.getItem("sa_admin") || "{}"); } catch { return {}; }
  });
  const [view, setView] = useState<"dashboard" | "clientes" | "novo">("dashboard");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<"all" | "ativo" | "suspenso" | "cancelado">("all");
  const [filterPlano, setFilterPlano] = useState<"all" | "basico" | "profissional" | "enterprise">("all");

  // Modal states
  const [modalAdmins, setModalAdmins] = useState<Tenant | null>(null);
  const [modalEditar, setModalEditar] = useState<Tenant | null>(null);
  const [modalExcluir, setModalExcluir] = useState<Tenant | null>(null);
  const [modalNovoAdmin, setModalNovoAdmin] = useState<Tenant | null>(null);

  const ok = (msg: string) => setToast({ msg, type: "ok" });
  const err = (msg: string) => setToast({ msg, type: "err" });

  // ── Queries ──
  const tenantsQ = trpc.superadmin.listTenants.useQuery();
  const adminsQ = trpc.superadmin.listAdmins.useQuery(
    { tenantId: modalAdmins?.id ?? 0 },
    { enabled: !!modalAdmins }
  );

  // ── Mutations ──
  const utils = trpc.useUtils();
  const refresh = () => utils.superadmin.listTenants.invalidate();

  const createTenantM = trpc.superadmin.createTenant.useMutation({
    onSuccess: () => { ok("Cliente criado com sucesso!"); refresh(); setView("clientes"); resetForm(); },
    onError: e => err(e.message),
  });
  const updateTenantM = trpc.superadmin.updateTenant.useMutation({
    onSuccess: () => { ok("Cliente atualizado!"); refresh(); setModalEditar(null); },
    onError: e => err(e.message),
  });
  const deleteTenantM = trpc.superadmin.deleteTenant.useMutation({
    onSuccess: () => { ok("Cliente excluído."); refresh(); setModalExcluir(null); },
    onError: e => err(e.message),
  });
  const createAdminM = trpc.superadmin.createAdmin.useMutation({
    onSuccess: () => { ok("Admin criado!"); utils.superadmin.listAdmins.invalidate(); resetAdminForm(); },
    onError: e => err(e.message),
  });
  const updateAdminM = trpc.superadmin.updateAdmin.useMutation({
    onSuccess: () => { ok("Admin atualizado!"); utils.superadmin.listAdmins.invalidate(); },
    onError: e => err(e.message),
  });
  const deleteAdminM = trpc.superadmin.deleteAdmin.useMutation({
    onSuccess: () => { ok("Admin removido."); utils.superadmin.listAdmins.invalidate(); },
    onError: e => err(e.message),
  });
  const logoutM = trpc.superadmin.logout.useMutation();
  // ── Form: Novo Cliente ──
  const [form, setForm] = useState({ nome: "", slug: "", plano: "profissional", contato: "", email: "", telefone: "", observacoes: "", adminNome: "", adminEmail: "", adminSenha: "", diasTrial: "5" });
  const setF = (k: string) => (v: string) => setForm(f => ({ ...f, [k]: v }));
  const resetForm = () => setForm({ nome: "", slug: "", plano: "profissional", contato: "", email: "", telefone: "", observacoes: "", adminNome: "", adminEmail: "", adminSenha: "", diasTrial: "5" });

  // Auto-slug
  useEffect(() => {
    if (form.nome) setForm(f => ({ ...f, slug: f.nome.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") }));
  }, [form.nome]);

  // ── Form: Novo Admin ──
  const [adminForm, setAdminForm] = useState({ nome: "", email: "", senha: "", role: "admin" });
  const setAF = (k: string) => (v: string) => setAdminForm(f => ({ ...f, [k]: v }));
  const resetAdminForm = () => setAdminForm({ nome: "", email: "", senha: "", role: "admin" });

  // ── Form: Editar Tenant ──
  const [editForm, setEditForm] = useState({ nome: "", slug: "", plano: "profissional", status: "ativo", contato: "", email: "", telefone: "", observacoes: "" });
  const setEF = (k: string) => (v: string) => setEditForm(f => ({ ...f, [k]: v }));
  useEffect(() => {
    if (modalEditar) setEditForm({ nome: modalEditar.nome, slug: modalEditar.slug, plano: modalEditar.plano, status: modalEditar.status, contato: modalEditar.contato || "", email: modalEditar.email || "", telefone: modalEditar.telefone || "", observacoes: modalEditar.observacoes || "" });
  }, [modalEditar]);

  // ── Filtered tenants ──
  const tenants: Tenant[] = tenantsQ.data ?? [];
  const filtered = tenants.filter(t => {
    const matchSearch = !search || t.nome.toLowerCase().includes(search.toLowerCase()) || t.slug.includes(search.toLowerCase()) || (t.email || "").toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === "all" || t.status === filterStatus;
    const matchPlano = filterPlano === "all" || t.plano === filterPlano;
    return matchSearch && matchStatus && matchPlano;
  });

  // ── Stats ──
  const stats = {
    total: tenants.length,
    ativos: tenants.filter(t => t.status === "ativo").length,
    suspensos: tenants.filter(t => t.status === "suspenso").length,
    cancelados: tenants.filter(t => t.status === "cancelado").length,
    basico: tenants.filter(t => t.plano === "basico").length,
    profissional: tenants.filter(t => t.plano === "profissional").length,
    enterprise: tenants.filter(t => t.plano === "enterprise").length,
  };

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { id: "clientes", label: "Clientes", icon: Building2, badge: stats.total },
    { id: "novo", label: "Novo Cliente", icon: Plus },
  ];

  const handleLogout = () => {
    void logoutM.mutateAsync().catch(() => undefined);
    localStorage.removeItem("sa_admin");
    window.location.href = "/superadmin/login";
  };

  return (
    <div className="min-h-screen flex" style={{ background: "#070d1a", fontFamily: "'Inter', sans-serif" }}>

      {/* ── SIDEBAR ── */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex flex-col transition-all duration-300 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"} lg:translate-x-0`}
        style={{ width: 240, background: "rgba(10,16,30,0.98)", borderRight: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>

        {/* Logo */}
        <div className="flex items-center gap-3 px-5 h-16 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)" }}>
            <Wifi size={15} className="text-black" strokeWidth={2.5} />
          </div>
          <div>
            <p className="text-sm font-black text-white">Netvius</p>
            <p className="text-xs" style={{ color: "rgba(0,245,160,0.7)" }}>Área Master</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 flex flex-col gap-1">
          {navItems.map(item => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button key={item.id} onClick={() => { setView(item.id as any); setSidebarOpen(false); }}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all w-full text-left"
                style={{
                  background: active ? "rgba(0,245,160,0.1)" : "transparent",
                  color: active ? "#00f5a0" : "rgba(255,255,255,0.5)",
                  border: active ? "1px solid rgba(0,245,160,0.2)" : "1px solid transparent",
                }}>
                <Icon size={16} />
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && (
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                    style={{ background: active ? "rgba(0,245,160,0.2)" : "rgba(255,255,255,0.08)", color: active ? "#00f5a0" : "rgba(255,255,255,0.4)" }}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* User + Logout */}
        <div className="px-3 pb-4 border-t pt-4" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl mb-2"
            style={{ background: "rgba(255,255,255,0.03)" }}>
            <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #7c3aed, #a78bfa)", color: "white" }}>
              {admin.nome?.charAt(0)?.toUpperCase() || "S"}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">{admin.nome || "Superadmin"}</p>
              <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{admin.email || ""}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="flex items-center gap-2 w-full px-3 py-2 rounded-xl text-sm font-medium transition-all"
            style={{ color: "rgba(248,113,113,0.7)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.08)"; (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(248,113,113,0.7)"; }}>
            <LogOut size={14} /> Sair
          </button>
        </div>
      </aside>

      {/* Sidebar overlay mobile */}
      {sidebarOpen && <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* ── MAIN ── */}
      <main className="flex-1 flex flex-col min-h-screen" style={{ marginLeft: 0 }}>
        <style>{`@media (min-width: 1024px) { main { margin-left: 240px; } }`}</style>

        {/* Top bar */}
        <div className="sticky top-0 z-20 flex items-center justify-between px-6 h-16 border-b"
          style={{ background: "rgba(7,13,26,0.95)", borderColor: "rgba(255,255,255,0.06)", backdropFilter: "blur(20px)" }}>
          <div className="flex items-center gap-3">
            <button className="lg:hidden text-white" onClick={() => setSidebarOpen(true)}>
              <Menu size={20} />
            </button>
            <div>
              <h1 className="text-sm font-bold text-white">
                {view === "dashboard" ? "Dashboard" : view === "clientes" ? "Gerenciar Clientes" : "Novo Cliente"}
              </h1>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                Painel de Revenda Netvius
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => refresh()} className="p-2 rounded-xl transition-all"
              style={{ color: "rgba(255,255,255,0.4)" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; }}>
              <RefreshCw size={15} />
            </button>
            <button onClick={() => setView("novo")}
              className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
              style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)", color: "#050b18" }}>
              <Plus size={14} /> Novo Cliente
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 p-6">

          {/* ── DASHBOARD VIEW ── */}
          {view === "dashboard" && (
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Stats grid */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[
                  { label: "Total de Clientes", value: stats.total, icon: Building2, color: "#60a5fa", grad: "linear-gradient(135deg, #1d4ed8, #2563eb)" },
                  { label: "Clientes Ativos", value: stats.ativos, icon: Activity, color: "#34d399", grad: "linear-gradient(135deg, #065f46, #059669)" },
                  { label: "Suspensos", value: stats.suspensos, icon: AlertCircle, color: "#fbbf24", grad: "linear-gradient(135deg, #92400e, #b45309)" },
                  { label: "Cancelados", value: stats.cancelados, icon: XCircle, color: "#f87171", grad: "linear-gradient(135deg, #7f1d1d, #991b1b)" },
                ].map((s, i) => {
                  const Icon = s.icon;
                  return (
                    <div key={i} className="p-5 rounded-2xl"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="flex items-center justify-between mb-3">
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                          style={{ background: s.grad }}>
                          <Icon size={16} className="text-white" />
                        </div>
                      </div>
                      <p className="text-2xl font-black text-white mb-1">{s.value}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</p>
                    </div>
                  );
                })}
              </div>

              {/* Planos breakdown */}
              <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <h3 className="text-sm font-bold text-white mb-4">Distribuição por Plano</h3>
                <div className="grid grid-cols-3 gap-4">
                  {(["basico", "profissional", "enterprise"] as const).map(plano => {
                    const cfg = PLANO_CFG[plano];
                    const count = stats[plano];
                    const pct = stats.total > 0 ? Math.round((count / stats.total) * 100) : 0;
                    const Icon = cfg.icon;
                    return (
                      <div key={plano} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                        <div className="flex items-center gap-2 mb-3">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: cfg.grad }}>
                            <Icon size={13} className="text-white" />
                          </div>
                          <span className="text-xs font-bold" style={{ color: cfg.color }}>{cfg.label}</span>
                        </div>
                        <p className="text-xl font-black text-white">{count}</p>
                        <div className="mt-2 h-1.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
                          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: cfg.grad }} />
                        </div>
                        <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>{pct}% do total</p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Recent clients */}
              <div className="p-5 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-bold text-white">Clientes Recentes</h3>
                  <button onClick={() => setView("clientes")} className="text-xs font-medium flex items-center gap-1"
                    style={{ color: "#00f5a0" }}>
                    Ver todos <ChevronRight size={12} />
                  </button>
                </div>
                {tenants.length === 0 ? (
                  <div className="text-center py-8">
                    <Building2 size={32} className="mx-auto mb-3" style={{ color: "rgba(255,255,255,0.15)" }} />
                    <p className="text-sm" style={{ color: "rgba(255,255,255,0.3)" }}>Nenhum cliente ainda</p>
                    <button onClick={() => setView("novo")} className="mt-3 text-xs font-bold px-4 py-2 rounded-xl"
                      style={{ background: "rgba(0,245,160,0.1)", color: "#00f5a0", border: "1px solid rgba(0,245,160,0.2)" }}>
                      Criar primeiro cliente
                    </button>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {tenants.slice(0, 5).map(t => (
                      <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl transition-all"
                        style={{ background: "rgba(255,255,255,0.02)" }}
                        onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"}
                        onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.02)"}>
                        <div className="w-9 h-9 rounded-xl flex items-center justify-center font-black text-sm flex-shrink-0"
                          style={{ background: "linear-gradient(135deg, rgba(102,126,234,0.3), rgba(118,75,162,0.3))", color: "#a78bfa" }}>
                          {t.nome.charAt(0).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-bold text-white truncate">{t.nome}</p>
                          <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>/{t.slug}</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          <PlanoBadge plano={t.plano} />
                          <StatusBadge status={t.status} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── CLIENTES VIEW ── */}
          {view === "clientes" && (
            <div className="max-w-6xl mx-auto space-y-5">
              {/* Filters */}
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="relative flex-1">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.3)" }} />
                  <input value={search} onChange={e => setSearch(e.target.value)}
                    placeholder="Buscar por nome, slug ou email..."
                    className="w-full pl-9 pr-4 py-2.5 rounded-xl text-sm text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
                </div>
                <select value={filterStatus} onChange={e => setFilterStatus(e.target.value as any)}
                  className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <option value="all" style={{ background: "#1a2035" }}>Todos os status</option>
                  <option value="ativo" style={{ background: "#1a2035" }}>Ativos</option>
                  <option value="suspenso" style={{ background: "#1a2035" }}>Suspensos</option>
                  <option value="cancelado" style={{ background: "#1a2035" }}>Cancelados</option>
                </select>
                <select value={filterPlano} onChange={e => setFilterPlano(e.target.value as any)}
                  className="px-3 py-2.5 rounded-xl text-sm text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
                  <option value="all" style={{ background: "#1a2035" }}>Todos os planos</option>
                  <option value="basico" style={{ background: "#1a2035" }}>Básico</option>
                  <option value="profissional" style={{ background: "#1a2035" }}>Profissional</option>
                  <option value="enterprise" style={{ background: "#1a2035" }}>Enterprise</option>
                </select>
              </div>

              {/* Count */}
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>
                {filtered.length} cliente{filtered.length !== 1 ? "s" : ""} encontrado{filtered.length !== 1 ? "s" : ""}
              </p>

              {/* Cards grid */}
              {filtered.length === 0 ? (
                <div className="text-center py-20">
                  <Building2 size={40} className="mx-auto mb-4" style={{ color: "rgba(255,255,255,0.12)" }} />
                  <p className="text-base font-bold text-white mb-1">Nenhum cliente encontrado</p>
                  <p className="text-sm mb-4" style={{ color: "rgba(255,255,255,0.35)" }}>
                    {search ? "Tente outro termo de busca" : "Crie seu primeiro cliente"}
                  </p>
                  <button onClick={() => setView("novo")}
                    className="px-5 py-2.5 rounded-xl text-sm font-bold"
                    style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)", color: "#050b18" }}>
                    Criar cliente
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {filtered.map(t => (
                    <TenantCard key={t.id} tenant={t}
                      onVerAdmins={() => setModalAdmins(t)}
                      onEditar={() => setModalEditar(t)}
                      onExcluir={() => setModalExcluir(t)}
                      onSuspender={(status) => updateTenantM.mutate({ id: t.id, status })}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ── NOVO CLIENTE VIEW ── */}
          {view === "novo" && (
            <div className="max-w-2xl mx-auto">
              <div className="p-6 rounded-2xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                    style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)" }}>
                    <Plus size={18} className="text-black" />
                  </div>
                  <div>
                    <h2 className="text-base font-black text-white">Novo Cliente</h2>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Crie uma conta para seu cliente revendedor</p>
                  </div>
                </div>

                <form onSubmit={e => {
                  e.preventDefault();
                  createTenantM.mutate({ nome: form.nome, slug: form.slug, plano: form.plano as any, contato: form.contato, email: form.email, telefone: form.telefone, observacoes: form.observacoes, adminNome: form.adminNome, adminEmail: form.adminEmail, adminSenha: form.adminSenha, diasTrial: parseInt(form.diasTrial) || 5 });
                }} className="space-y-5">

                  {/* Dados da empresa */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Dados da Empresa
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Input label="Nome da empresa" value={form.nome} onChange={setF("nome")} placeholder="Ex: Telecom Bahia" required />
                      <Input label="Slug (URL)" value={form.slug} onChange={setF("slug")} placeholder="telecom-bahia" required hint="Usado na URL de acesso" />
                      <Select label="Plano" value={form.plano} onChange={setF("plano")} required options={[
                        { value: "basico", label: "⚡ Básico" },
                        { value: "profissional", label: "🚀 Profissional" },
                        { value: "enterprise", label: "👑 Enterprise" },
                      ]} />
                      <Input label="Contato / Responsável" value={form.contato} onChange={setF("contato")} placeholder="Nome do responsável" />
                      <Input label="⏱ Dias de Demonstração" type="number" value={form.diasTrial} onChange={setF("diasTrial")} placeholder="5" hint="Padrão: 5 dias. Máx: 365" required />
                      <Input label="Email da empresa" type="email" value={form.email} onChange={setF("email")} placeholder="empresa@email.com" />
                      <Input label="Telefone" value={form.telefone} onChange={setF("telefone")} placeholder="(75) 99999-9999" />
                    </div>
                    <div className="mt-3">
                      <label className="block text-xs font-semibold mb-1.5" style={{ color: "rgba(255,255,255,0.55)" }}>Observações</label>
                      <textarea value={form.observacoes} onChange={e => setF("observacoes")(e.target.value)}
                        rows={2} placeholder="Anotações internas sobre o cliente..."
                        className="w-full px-3.5 py-2.5 rounded-xl text-sm text-white outline-none resize-none"
                        style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }} />
                    </div>
                  </div>

                  {/* Acesso do admin */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.3)" }}>
                      Acesso do Painel Admin (Cliente)
                    </p>
                    <div className="p-4 rounded-xl mb-3" style={{ background: "rgba(0,245,160,0.04)", border: "1px solid rgba(0,245,160,0.15)" }}>
                      <p className="text-xs" style={{ color: "rgba(0,245,160,0.7)" }}>
                        O cliente usará este email e senha para acessar o painel administrativo em <strong>/admin/login</strong>
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <Input label="Nome do admin" value={form.adminNome} onChange={setF("adminNome")} placeholder="Nome completo" required />
                      <Input label="Email" type="email" value={form.adminEmail} onChange={setF("adminEmail")} placeholder="admin@empresa.com" required />
                      <Input label="Senha" type="password" value={form.adminSenha} onChange={setF("adminSenha")} placeholder="Mínimo 6 caracteres" required hint="Mín. 6 caracteres" />
                    </div>
                  </div>

                  <div className="flex gap-3 pt-2">
                    <button type="button" onClick={() => setView("clientes")}
                      className="flex-1 py-3 rounded-xl text-sm font-bold"
                      style={{ background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
                      Cancelar
                    </button>
                    <button type="submit" disabled={createTenantM.isPending}
                      className="flex-1 py-3 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
                      style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)", color: "#050b18", opacity: createTenantM.isPending ? 0.7 : 1 }}>
                      {createTenantM.isPending ? <RefreshCw size={14} className="animate-spin" /> : <Plus size={14} />}
                      {createTenantM.isPending ? "Criando..." : "Criar Cliente"}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ── MODAL: ADMINS ── */}
      {modalAdmins && (
        <Modal title={`Admins — ${modalAdmins.nome}`} onClose={() => { setModalAdmins(null); resetAdminForm(); }} wide>
          {/* Novo admin form */}
          <div className="p-4 rounded-xl mb-4" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: "rgba(255,255,255,0.35)" }}>Adicionar Admin</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <Input label="Nome" value={adminForm.nome} onChange={setAF("nome")} placeholder="Nome completo" />
              <Input label="Email" type="email" value={adminForm.email} onChange={setAF("email")} placeholder="email@empresa.com" />
              <Input label="Senha" type="password" value={adminForm.senha} onChange={setAF("senha")} placeholder="Mínimo 6 caracteres" />
              <Select label="Perfil" value={adminForm.role} onChange={setAF("role")} options={[
                { value: "admin", label: "Admin" },
                { value: "viewer", label: "Visualizador" },
              ]} />
            </div>
            <button onClick={() => createAdminM.mutate({ tenantId: modalAdmins.id, nome: adminForm.nome, email: adminForm.email, senha: adminForm.senha, role: adminForm.role as any })}
              disabled={createAdminM.isPending || !adminForm.nome || !adminForm.email || !adminForm.senha}
              className="w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2"
              style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)", color: "#050b18", opacity: (createAdminM.isPending || !adminForm.nome || !adminForm.email || !adminForm.senha) ? 0.6 : 1 }}>
              <Plus size={14} /> Adicionar Admin
            </button>
          </div>

          {/* Admin list */}
          {adminsQ.isLoading ? (
            <p className="text-sm text-center py-4" style={{ color: "rgba(255,255,255,0.4)" }}>Carregando...</p>
          ) : (adminsQ.data ?? []).length === 0 ? (
            <p className="text-sm text-center py-4" style={{ color: "rgba(255,255,255,0.4)" }}>Nenhum admin ainda</p>
          ) : (
            <div className="space-y-2">
              {(adminsQ.data as Admin[]).map(a => (
                <div key={a.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs flex-shrink-0"
                    style={{ background: a.ativo ? "linear-gradient(135deg, #1d4ed8, #2563eb)" : "rgba(255,255,255,0.06)", color: a.ativo ? "white" : "rgba(255,255,255,0.3)" }}>
                    {a.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-white truncate">{a.nome}</p>
                    <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{a.email}</p>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.5)" }}>{a.role}</span>
                    <button onClick={() => updateAdminM.mutate({ id: a.id, ativo: !a.ativo })}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ background: a.ativo ? "rgba(52,211,153,0.1)" : "rgba(248,113,113,0.1)", color: a.ativo ? "#34d399" : "#f87171" }}>
                      {a.ativo ? <CheckCircle size={13} /> : <XCircle size={13} />}
                    </button>
                    <button onClick={() => deleteAdminM.mutate({ id: a.id })}
                      className="p-1.5 rounded-lg transition-all"
                      style={{ color: "rgba(248,113,113,0.5)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(248,113,113,0.1)"; (e.currentTarget as HTMLElement).style.color = "#f87171"; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(248,113,113,0.5)"; }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Modal>
      )}

      {/* ── MODAL: EDITAR ── */}
      {modalEditar && (
        <Modal title={`Editar — ${modalEditar.nome}`} onClose={() => setModalEditar(null)}>
          <form onSubmit={e => { e.preventDefault(); updateTenantM.mutate({ id: modalEditar.id, nome: editForm.nome, slug: editForm.slug, plano: editForm.plano as any, status: editForm.status as any, contato: editForm.contato, email: editForm.email, telefone: editForm.telefone, observacoes: editForm.observacoes }); }} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Nome" value={editForm.nome} onChange={setEF("nome")} required />
              <Input label="Slug" value={editForm.slug} onChange={setEF("slug")} required />
              <Select label="Plano" value={editForm.plano} onChange={setEF("plano")} options={[
                { value: "basico", label: "⚡ Básico" },
                { value: "profissional", label: "🚀 Profissional" },
                { value: "enterprise", label: "👑 Enterprise" },
              ]} />
              <Select label="Status" value={editForm.status} onChange={setEF("status")} options={[
                { value: "ativo", label: "✅ Ativo" },
                { value: "suspenso", label: "⚠️ Suspenso" },
                { value: "cancelado", label: "❌ Cancelado" },
              ]} />
              <Input label="Email" type="email" value={editForm.email} onChange={setEF("email")} />
              <Input label="Telefone" value={editForm.telefone} onChange={setEF("telefone")} />
            </div>
            <button type="submit" disabled={updateTenantM.isPending}
              className="w-full py-3 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)", color: "#050b18" }}>
              {updateTenantM.isPending ? "Salvando..." : "Salvar Alterações"}
            </button>
          </form>
        </Modal>
      )}

      {/* ── MODAL: EXCLUIR ── */}
      {modalExcluir && (
        <Modal title="Excluir Cliente" onClose={() => setModalExcluir(null)}>
          <div className="text-center py-4">
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(248,113,113,0.1)", border: "1px solid rgba(248,113,113,0.2)" }}>
              <Trash2 size={24} style={{ color: "#f87171" }} />
            </div>
            <p className="text-base font-bold text-white mb-2">Excluir "{modalExcluir.nome}"?</p>
            <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.45)" }}>
              Esta ação é irreversível. Todos os dados do cliente serão perdidos.
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModalExcluir(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.1)" }}>
                Cancelar
              </button>
              <button onClick={() => deleteTenantM.mutate({ id: modalExcluir.id })}
                disabled={deleteTenantM.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "linear-gradient(135deg, #7f1d1d, #991b1b)", color: "#fca5a5", border: "1px solid rgba(248,113,113,0.3)" }}>
                {deleteTenantM.isPending ? "Excluindo..." : "Sim, excluir"}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </div>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────────────
function Modal({ title, children, onClose, wide }: { title: string; children: React.ReactNode; onClose: () => void; wide?: boolean }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
      <div className="w-full rounded-2xl overflow-hidden" style={{ maxWidth: wide ? 640 : 480, background: "#0d1526", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 25px 60px rgba(0,0,0,0.6)" }}>
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: "rgba(255,255,255,0.07)" }}>
          <h3 className="text-sm font-bold text-white">{title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg transition-all"
            style={{ color: "rgba(255,255,255,0.4)" }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.08)"; (e.currentTarget as HTMLElement).style.color = "white"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.4)"; }}>
            <X size={15} />
          </button>
        </div>
        <div className="p-5 max-h-[75vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ─── TenantCard ───────────────────────────────────────────────────────────────
function TenantCard({ tenant, onVerAdmins, onEditar, onExcluir, onSuspender }: {
  tenant: Tenant;
  onVerAdmins: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  onSuspender: (status: "ativo" | "suspenso") => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  const copySlug = () => {
    navigator.clipboard.writeText(tenant.slug);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl overflow-hidden transition-all duration-200"
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.045)"; }}
      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)"; (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)"; }}>

      {/* Header */}
      <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.05)" }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0"
              style={{
                background: tenant.status === "ativo"
                  ? "linear-gradient(135deg, rgba(102,126,234,0.4), rgba(118,75,162,0.4))"
                  : "rgba(255,255,255,0.06)",
                color: tenant.status === "ativo" ? "#a78bfa" : "rgba(255,255,255,0.3)",
              }}>
              {tenant.nome.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{tenant.nome}</p>
              <button onClick={copySlug} className="flex items-center gap-1 text-xs transition-colors"
                style={{ color: "rgba(255,255,255,0.35)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.35)")}>
                /{tenant.slug}
                {copied ? <Check size={10} style={{ color: "#34d399" }} /> : <Copy size={10} />}
              </button>
            </div>
          </div>

          {/* Menu */}
          <div className="relative flex-shrink-0">
            <button onClick={() => setMenuOpen(m => !m)}
              className="w-7 h-7 rounded-lg flex items-center justify-center transition-all"
              style={{ background: menuOpen ? "rgba(255,255,255,0.1)" : "transparent", color: "rgba(255,255,255,0.4)" }}>
              <MoreVertical size={14} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 w-48 rounded-xl overflow-hidden z-20 shadow-2xl"
                style={{ background: "#111827", border: "1px solid rgba(255,255,255,0.1)" }}
                onMouseLeave={() => setMenuOpen(false)}>
                {[
                  { icon: Users, label: "Ver admins", color: "#a78bfa", action: onVerAdmins },
                  { icon: Edit2, label: "Editar", color: "#fbbf24", action: onEditar },
                  {
                    icon: tenant.status === "ativo" ? AlertCircle : CheckCircle,
                    label: tenant.status === "ativo" ? "Suspender" : "Reativar",
                    color: tenant.status === "ativo" ? "#fbbf24" : "#34d399",
                    action: () => onSuspender(tenant.status === "ativo" ? "suspenso" : "ativo"),
                  },
                  { icon: Trash2, label: "Excluir", color: "#f87171", action: onExcluir },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button key={i} onClick={() => { item.action(); setMenuOpen(false); }}
                      className="flex items-center gap-3 w-full px-4 py-2.5 text-sm transition-all"
                      style={{ color: "rgba(255,255,255,0.65)" }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; (e.currentTarget as HTMLElement).style.color = item.color; }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "transparent"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)"; }}>
                      <Icon size={13} style={{ color: item.color }} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 mt-3">
          <PlanoBadge plano={tenant.plano} />
          <StatusBadge status={tenant.status} />
        </div>
      </div>

      {/* Info */}
      <div className="px-4 py-3 space-y-1.5">
        {tenant.email && (
          <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span style={{ color: "rgba(255,255,255,0.25)" }}>Email: </span>{tenant.email}
          </p>
        )}
        {tenant.telefone && (
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
            <span style={{ color: "rgba(255,255,255,0.25)" }}>Tel: </span>{tenant.telefone}
          </p>
        )}
        <p className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>
          Criado em {new Date(tenant.createdAt).toLocaleDateString("pt-BR")}
        </p>
        {/* Indicador de trial */}
        {(tenant.status === "trial" || tenant.status === "expirado") && tenant.trialFim && (() => {
          const fim = new Date(tenant.trialFim);
          const agora = new Date();
          const diffMs = fim.getTime() - agora.getTime();
          const diasRestantes = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
          const expirado = diasRestantes <= 0;
          return (
            <p className="text-xs font-semibold" style={{ color: expirado ? "#f87171" : diasRestantes <= 1 ? "#fbbf24" : "#a78bfa" }}>
              {expirado
                ? "⛔ Trial expirado"
                : diasRestantes === 1
                ? "⚠️ Expira hoje!"
                : `⏱ ${diasRestantes} dia${diasRestantes !== 1 ? "s" : ""} restante${diasRestantes !== 1 ? "s" : ""} de trial`}
            </p>
          );
        })()}
      </div>

      {/* Actions */}
      <div className="px-4 pb-4 flex gap-2">
        <button onClick={onVerAdmins}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all"
          style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(167,139,250,0.18)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(167,139,250,0.1)"; }}>
          <Users size={11} /> Admins
        </button>
        <button onClick={onEditar}
          className="py-2 px-3 rounded-xl text-xs font-bold transition-all"
          style={{ background: "rgba(251,191,36,0.1)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.18)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(251,191,36,0.1)"; }}>
          <Edit2 size={11} />
        </button>
      </div>
    </div>
  );
}
