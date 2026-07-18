import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Building2, Users, CheckCircle, PauseCircle, Plus, LogOut,
  Trash2, UserPlus, Eye, EyeOff, Shield, X, AlertCircle,
  Search, Crown, BarChart3, Edit3, ChevronRight, MoreVertical,
  ExternalLink, Phone, Mail, Calendar, Lock, Unlock,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Tenant = {
  id: number;
  nome: string;
  slug: string;
  plano: "basico" | "profissional" | "enterprise";
  status: "ativo" | "suspenso" | "cancelado";
  contato: string | null;
  email: string | null;
  telefone: string | null;
  observacoes: string | null;
  createdAt: Date;
};
type Admin = {
  id: number;
  tenantId: number;
  nome: string;
  email: string;
  role: "admin" | "viewer";
  ativo: boolean;
  ultimoLogin: Date | null;
  createdAt: Date;
};

const PLANO = {
  basico:       { label: "Básico",       color: "#94a3b8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.25)", icon: "⚡" },
  profissional: { label: "Profissional", color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.25)",  icon: "🚀" },
  enterprise:   { label: "Enterprise",   color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.25)",  icon: "👑" },
};
const STATUS = {
  ativo:     { label: "Ativo",     color: "#34d399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.25)",  dot: "#10b981" },
  suspenso:  { label: "Suspenso",  color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.25)",  dot: "#f59e0b" },
  cancelado: { label: "Cancelado", color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.25)", dot: "#ef4444" },
};

function PlanoBadge({ plano }: { plano: keyof typeof PLANO }) {
  const p = PLANO[plano];
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: p.bg, color: p.color, border: `1px solid ${p.border}` }}>
      {p.icon} {p.label}
    </span>
  );
}
function StatusBadge({ status }: { status: keyof typeof STATUS }) {
  const s = STATUS[status];
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold"
      style={{ background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: s.dot }} />
      {s.label}
    </span>
  );
}

function Toast({ msg, type, onClose }: { msg: string; type: "ok" | "err"; onClose: () => void }) {
  useEffect(() => { const t = setTimeout(onClose, 3500); return () => clearTimeout(t); }, [onClose]);
  return (
    <div className="fixed bottom-6 right-6 z-[9999] flex items-center gap-3 px-5 py-3.5 rounded-2xl shadow-2xl"
      style={{
        background: type === "ok" ? "linear-gradient(135deg, #065f46, #064e3b)" : "linear-gradient(135deg, #7f1d1d, #991b1b)",
        border: `1px solid ${type === "ok" ? "rgba(52,211,153,0.3)" : "rgba(248,113,113,0.3)"}`,
      }}>
      {type === "ok" ? <CheckCircle size={16} style={{ color: "#34d399" }} /> : <AlertCircle size={16} style={{ color: "#f87171" }} />}
      <span className="text-sm font-medium text-white">{msg}</span>
    </div>
  );
}

// ─── TenantCard ───────────────────────────────────────────────────────────────
function TenantCard({ tenant, onVerAdmins, onEditar, onExcluir, onImpersonate, onSuspender }: {
  tenant: Tenant;
  onVerAdmins: () => void;
  onEditar: () => void;
  onExcluir: () => void;
  onImpersonate: () => void;
  onSuspender: (status: "ativo" | "suspenso") => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div className="rounded-2xl overflow-hidden transition-all hover:scale-[1.01]"
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
      <div className="p-4 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-base flex-shrink-0"
              style={{
                background: tenant.status === "ativo"
                  ? "linear-gradient(135deg, rgba(102,126,234,0.3), rgba(118,75,162,0.3))"
                  : "rgba(255,255,255,0.06)",
                color: tenant.status === "ativo" ? "#a78bfa" : "rgba(255,255,255,0.3)",
              }}>
              {tenant.nome.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="font-bold text-white text-sm truncate">{tenant.nome}</p>
              <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>/{tenant.slug}</p>
            </div>
          </div>
          <div className="relative">
            <button onClick={() => setMenuOpen(m => !m)}
              className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: menuOpen ? "rgba(255,255,255,0.1)" : "transparent" }}>
              <MoreVertical size={14} style={{ color: "rgba(255,255,255,0.5)" }} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-8 w-44 rounded-xl overflow-hidden z-10 shadow-2xl"
                style={{ background: "#1a2035", border: "1px solid rgba(255,255,255,0.1)" }}
                onMouseLeave={() => setMenuOpen(false)}>
                {[
                  { icon: ExternalLink, label: "Acessar painel", action: onImpersonate, color: "#a78bfa" },
                  { icon: Users, label: "Ver admins", action: onVerAdmins, color: "rgba(255,255,255,0.7)" },
                  { icon: Edit3, label: "Editar", action: onEditar, color: "rgba(255,255,255,0.7)" },
                  {
                    icon: tenant.status === "ativo" ? Lock : Unlock,
                    label: tenant.status === "ativo" ? "Suspender" : "Ativar",
                    action: () => onSuspender(tenant.status === "ativo" ? "suspenso" : "ativo"),
                    color: tenant.status === "ativo" ? "#fbbf24" : "#34d399",
                  },
                  { icon: Trash2, label: "Excluir", action: onExcluir, color: "#f87171" },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <button key={i} onClick={() => { item.action(); setMenuOpen(false); }}
                      className="w-full flex items-center gap-2.5 px-4 py-2.5 text-xs font-medium hover:bg-white/5 text-left"
                      style={{ color: item.color, borderBottom: i < 4 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                      <Icon size={13} />
                      {item.label}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
      <div className="px-4 py-3 flex items-center gap-2 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <PlanoBadge plano={tenant.plano} />
        <StatusBadge status={tenant.status} />
      </div>
      <div className="p-4 flex flex-col gap-2">
        {tenant.email && (
          <div className="flex items-center gap-2">
            <Mail size={11} style={{ color: "rgba(255,255,255,0.3)" }} />
            <span className="text-xs truncate" style={{ color: "rgba(255,255,255,0.5)" }}>{tenant.email}</span>
          </div>
        )}
        {tenant.telefone && (
          <div className="flex items-center gap-2">
            <Phone size={11} style={{ color: "rgba(255,255,255,0.3)" }} />
            <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{tenant.telefone}</span>
          </div>
        )}
        <div className="flex items-center gap-2">
          <Calendar size={11} style={{ color: "rgba(255,255,255,0.3)" }} />
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>
            Desde {new Date(tenant.createdAt).toLocaleDateString("pt-BR")}
          </span>
        </div>
      </div>
      <div className="px-4 pb-4 flex gap-2">
        <button onClick={onImpersonate}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold"
          style={{ background: "linear-gradient(135deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2))", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}>
          <ExternalLink size={12} /> Acessar
        </button>
        <button onClick={onVerAdmins}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold"
          style={{ background: "rgba(255,255,255,0.06)", color: "rgba(255,255,255,0.6)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <Users size={12} /> Admins
        </button>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function SuperAdminDashboard() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [adminInfo, setAdminInfo] = useState<{ nome: string; email: string } | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);
  const showToast = (msg: string, type: "ok" | "err" = "ok") => setToast({ msg, type });

  const [view, setView] = useState<"dashboard" | "clientes" | "criar">("dashboard");
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ativo" | "suspenso" | "cancelado">("todos");
  const [filtroPlano, setFiltroPlano] = useState<"todos" | "basico" | "profissional" | "enterprise">("todos");

  const [modalAdmins, setModalAdmins] = useState<Tenant | null>(null);
  const [modalEditarTenant, setModalEditarTenant] = useState<Tenant | null>(null);
  const [modalCriarAdmin, setModalCriarAdmin] = useState<Tenant | null>(null);
  const [modalExcluir, setModalExcluir] = useState<{ tipo: "tenant" | "admin"; id: number; nome: string } | null>(null);
  const [showSenha, setShowSenha] = useState(false);
  const [showAdminSenha, setShowAdminSenha] = useState(false);

  const [form, setForm] = useState({
    nome: "", slug: "", plano: "basico" as keyof typeof PLANO,
    contato: "", email: "", telefone: "", observacoes: "",
    adminNome: "", adminEmail: "", adminSenha: "",
  });
  const [editForm, setEditForm] = useState<Partial<Tenant & { contato: string; email: string; telefone: string; observacoes: string }>>({});
  const [adminForm, setAdminForm] = useState({ nome: "", email: "", senha: "", role: "admin" as "admin" | "viewer" });

  useEffect(() => {
    // Suporta ambos os formatos de chave de token
    const t = localStorage.getItem("sa_token") || localStorage.getItem("superadmin_token");
    const a = localStorage.getItem("sa_admin") || localStorage.getItem("superadmin_info");
    if (!t) { navigate("/superadmin/login"); return; }
    setToken(t);
    if (a) { try { setAdminInfo(JSON.parse(a)); } catch {} }
  }, [navigate]);

  const tenantsQ = trpc.superadmin.listTenants.useQuery(
    { token: token! }, { enabled: !!token, refetchInterval: 60000 }
  );
  const adminsQ = trpc.superadmin.listAdmins.useQuery(
    { token: token!, tenantId: modalAdmins?.id ?? 0 },
    { enabled: !!token && !!modalAdmins }
  );

  const createTenantMut = trpc.superadmin.createTenant.useMutation({
    onSuccess: () => {
      showToast("Cliente criado com sucesso!");
      setView("clientes");
      setForm({ nome: "", slug: "", plano: "basico", contato: "", email: "", telefone: "", observacoes: "", adminNome: "", adminEmail: "", adminSenha: "" });
      tenantsQ.refetch();
    },
    onError: (e) => showToast(e.message, "err"),
  });
  const updateTenantMut = trpc.superadmin.updateTenant.useMutation({
    onSuccess: () => { showToast("Cliente atualizado!"); tenantsQ.refetch(); setModalEditarTenant(null); },
    onError: (e) => showToast(e.message, "err"),
  });
  const deleteTenantMut = trpc.superadmin.deleteTenant.useMutation({
    onSuccess: () => { showToast("Cliente excluído"); tenantsQ.refetch(); setModalExcluir(null); },
    onError: (e) => showToast(e.message, "err"),
  });
  const createAdminMut = trpc.superadmin.createAdmin.useMutation({
    onSuccess: () => { showToast("Admin criado!"); adminsQ.refetch(); setModalCriarAdmin(null); setAdminForm({ nome: "", email: "", senha: "", role: "admin" }); },
    onError: (e) => showToast(e.message, "err"),
  });
  const updateAdminMut = trpc.superadmin.updateAdmin.useMutation({
    onSuccess: () => { showToast("Admin atualizado!"); adminsQ.refetch(); },
    onError: (e) => showToast(e.message, "err"),
  });
  const deleteAdminMut = trpc.superadmin.deleteAdmin.useMutation({
    onSuccess: () => { showToast("Admin excluído"); adminsQ.refetch(); setModalExcluir(null); },
    onError: (e) => showToast(e.message, "err"),
  });
  const impersonateMut = trpc.superadmin.impersonateTenant.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("tenant_admin_token", data.token);
      localStorage.setItem("tenant_admin_info", JSON.stringify({ ...data.admin, tenant: data.tenant }));
      window.open("/admin", "_blank");
      showToast("Acessando painel do cliente...");
    },
    onError: (e) => showToast(e.message, "err"),
  });

  const tenantsFiltrados = useMemo(() => {
    if (!tenantsQ.data) return [];
    return (tenantsQ.data as Tenant[]).filter(t => {
      const matchBusca = !busca || t.nome.toLowerCase().includes(busca.toLowerCase()) ||
        t.slug.includes(busca.toLowerCase()) || (t.email ?? "").toLowerCase().includes(busca.toLowerCase());
      const matchStatus = filtroStatus === "todos" || t.status === filtroStatus;
      const matchPlano = filtroPlano === "todos" || t.plano === filtroPlano;
      return matchBusca && matchStatus && matchPlano;
    });
  }, [tenantsQ.data, busca, filtroStatus, filtroPlano]);

  const globalStats = useMemo(() => {
    const data = (tenantsQ.data ?? []) as Tenant[];
    return {
      total: data.length,
      ativos: data.filter(t => t.status === "ativo").length,
      suspensos: data.filter(t => t.status === "suspenso").length,
      cancelados: data.filter(t => t.status === "cancelado").length,
    };
  }, [tenantsQ.data]);

  function gerarSlug(nome: string) {
    return nome.toLowerCase()
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-").replace(/-+/g, "-").trim();
  }

  function handleLogout() {
    ["sa_token","sa_admin","superadmin_token","superadmin_info"].forEach(k => localStorage.removeItem(k));
    navigate("/superadmin/login");
  }

  if (!token) return null;

  const inputCls = "w-full px-4 py-3 rounded-xl text-sm outline-none transition-all";
  const inputStyle = { background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white" };

  return (
    <div className="min-h-screen flex" style={{ background: "linear-gradient(135deg, #0a0f1e 0%, #0d1529 50%, #0a1020 100%)" }}>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}

      {/* ── Sidebar ── */}
      <aside className="fixed left-0 top-0 bottom-0 w-60 flex flex-col z-40"
        style={{ background: "rgba(255,255,255,0.03)", borderRight: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
              <Crown size={16} className="text-white" />
            </div>
            <div>
              <p className="text-sm font-black text-white">Netvius</p>
              <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>Painel Master</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 p-3 flex flex-col gap-1">
          {[
            { id: "dashboard", icon: BarChart3, label: "Dashboard" },
            { id: "clientes", icon: Building2, label: "Clientes" },
            { id: "criar", icon: Plus, label: "Novo Cliente" },
          ].map(item => {
            const Icon = item.icon;
            const active = view === item.id;
            return (
              <button key={item.id} onClick={() => setView(item.id as any)}
                className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all text-left"
                style={{
                  background: active ? "linear-gradient(135deg, rgba(102,126,234,0.2), rgba(118,75,162,0.2))" : "transparent",
                  color: active ? "#a78bfa" : "rgba(255,255,255,0.5)",
                  border: active ? "1px solid rgba(167,139,250,0.2)" : "1px solid transparent",
                }}>
                <Icon size={15} />
                {item.label}
              </button>
            );
          })}
        </nav>
        <div className="p-4 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
              style={{ background: "linear-gradient(135deg, #667eea, #764ba2)" }}>
              <Shield size={12} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">{adminInfo?.nome ?? "Superadmin"}</p>
              <p className="text-xs truncate" style={{ color: "rgba(255,255,255,0.35)" }}>{adminInfo?.email}</p>
            </div>
          </div>
          <button onClick={handleLogout}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium"
            style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.2)" }}>
            <LogOut size={12} /> Sair
          </button>
        </div>
      </aside>

      {/* ── Content ── */}
      <main className="ml-60 flex-1 min-h-screen">

        {/* DASHBOARD */}
        {view === "dashboard" && (
          <div className="p-8">
            <div className="mb-8">
              <h1 className="text-2xl font-black text-white mb-1">Dashboard</h1>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Visão geral do sistema de revenda Netvius</p>
            </div>
            <div className="grid grid-cols-4 gap-4 mb-8">
              {[
                { label: "Total Clientes", value: globalStats.total, color: "#a78bfa", icon: Building2 },
                { label: "Ativos", value: globalStats.ativos, color: "#34d399", icon: CheckCircle },
                { label: "Suspensos", value: globalStats.suspensos, color: "#fbbf24", icon: PauseCircle },
                { label: "Cancelados", value: globalStats.cancelados, color: "#f87171", icon: AlertCircle },
              ].map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={i} className="rounded-2xl p-5"
                    style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center mb-3"
                      style={{ background: s.color + "20" }}>
                      <Icon size={16} style={{ color: s.color }} />
                    </div>
                    <p className="text-3xl font-black text-white mb-1">{s.value}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{s.label}</p>
                  </div>
                );
              })}
            </div>
            <div className="rounded-2xl overflow-hidden"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
                <h2 className="text-sm font-bold text-white">Clientes Recentes</h2>
                <button onClick={() => setView("clientes")}
                  className="text-xs font-medium flex items-center gap-1" style={{ color: "#a78bfa" }}>
                  Ver todos <ChevronRight size={12} />
                </button>
              </div>
              {tenantsQ.isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="w-6 h-6 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : ((tenantsQ.data ?? []) as Tenant[]).slice(0, 5).map((t, idx) => (
                <div key={t.id}
                  className="flex items-center justify-between px-5 py-4 hover:bg-white/5 transition-colors"
                  style={{ borderBottom: idx < 4 ? "1px solid rgba(255,255,255,0.04)" : "none" }}>
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm"
                      style={{ background: "rgba(102,126,234,0.2)", color: "#a78bfa" }}>
                      {t.nome.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{t.nome}</p>
                      <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>/{t.slug}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PlanoBadge plano={t.plano} />
                    <StatusBadge status={t.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* CLIENTES */}
        {view === "clientes" && (
          <div className="p-8">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-2xl font-black text-white mb-1">Clientes</h1>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                  {tenantsFiltrados.length} de {tenantsQ.data?.length ?? 0} clientes
                </p>
              </div>
              <button onClick={() => setView("criar")}
                className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white", boxShadow: "0 4px 16px rgba(102,126,234,0.3)" }}>
                <Plus size={15} /> Novo Cliente
              </button>
            </div>
            <div className="flex gap-3 mb-5">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
                <input className={`${inputCls} pl-9`} style={inputStyle}
                  placeholder="Buscar por nome, slug ou email..."
                  value={busca} onChange={e => setBusca(e.target.value)} />
              </div>
              <select value={filtroStatus} onChange={e => setFiltroStatus(e.target.value as any)}
                className="px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}>
                <option value="todos" style={{ background: "#1a1a2e" }}>Todos os status</option>
                <option value="ativo" style={{ background: "#1a1a2e" }}>Ativos</option>
                <option value="suspenso" style={{ background: "#1a1a2e" }}>Suspensos</option>
                <option value="cancelado" style={{ background: "#1a1a2e" }}>Cancelados</option>
              </select>
              <select value={filtroPlano} onChange={e => setFiltroPlano(e.target.value as any)}
                className="px-3 py-2.5 rounded-xl text-sm outline-none"
                style={inputStyle}>
                <option value="todos" style={{ background: "#1a1a2e" }}>Todos os planos</option>
                <option value="basico" style={{ background: "#1a1a2e" }}>Básico</option>
                <option value="profissional" style={{ background: "#1a1a2e" }}>Profissional</option>
                <option value="enterprise" style={{ background: "#1a1a2e" }}>Enterprise</option>
              </select>
            </div>
            {tenantsQ.isLoading ? (
              <div className="flex items-center justify-center py-20">
                <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
              </div>
            ) : tenantsFiltrados.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 gap-4">
                <Building2 size={40} style={{ color: "rgba(255,255,255,0.15)" }} />
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Nenhum cliente encontrado</p>
                <button onClick={() => setView("criar")}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold"
                  style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white" }}>
                  <Plus size={14} /> Criar primeiro cliente
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4">
                {tenantsFiltrados.map(t => (
                  <TenantCard key={t.id} tenant={t}
                    onVerAdmins={() => setModalAdmins(t)}
                    onEditar={() => { setModalEditarTenant(t); setEditForm({ nome: t.nome, slug: t.slug, plano: t.plano, status: t.status, contato: t.contato ?? "", email: t.email ?? "", telefone: t.telefone ?? "", observacoes: t.observacoes ?? "" }); }}
                    onExcluir={() => setModalExcluir({ tipo: "tenant", id: t.id, nome: t.nome })}
                    onImpersonate={() => impersonateMut.mutate({ token: token!, tenantId: t.id })}
                    onSuspender={(status) => updateTenantMut.mutate({ token: token!, id: t.id, status })}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* CRIAR */}
        {view === "criar" && (
          <div className="p-8 max-w-2xl">
            <div className="flex items-center gap-3 mb-8">
              <button onClick={() => setView("clientes")}
                className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <X size={16} className="text-white" />
              </button>
              <div>
                <h1 className="text-2xl font-black text-white">Novo Cliente</h1>
                <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Criar um novo revendedor no sistema</p>
              </div>
            </div>
            <div className="rounded-2xl p-6 flex flex-col gap-5"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>Dados da Empresa</p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-white/70 mb-1.5 block">Nome da Empresa *</label>
                    <input className={inputCls} style={inputStyle} placeholder="Ex: Telecom Bahia"
                      value={form.nome}
                      onChange={e => { const nome = e.target.value; setForm(f => ({ ...f, nome, slug: gerarSlug(nome) })); }} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-white/70 mb-1.5 block">Slug (URL) *</label>
                    <input className={inputCls} style={inputStyle} placeholder="telecom-bahia"
                      value={form.slug}
                      onChange={e => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))} />
                    <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.3)" }}>netvius.org/{form.slug || "..."}</p>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-white/70 mb-1.5 block">Plano</label>
                    <select className={inputCls} style={inputStyle} value={form.plano}
                      onChange={e => setForm(f => ({ ...f, plano: e.target.value as any }))}>
                      <option value="basico" style={{ background: "#1a1a2e" }}>⚡ Básico</option>
                      <option value="profissional" style={{ background: "#1a1a2e" }}>🚀 Profissional</option>
                      <option value="enterprise" style={{ background: "#1a1a2e" }}>👑 Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-white/70 mb-1.5 block">Email</label>
                    <input className={inputCls} style={inputStyle} placeholder="empresa@email.com"
                      value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-white/70 mb-1.5 block">Telefone</label>
                    <input className={inputCls} style={inputStyle} placeholder="(00) 00000-0000"
                      value={form.telefone} onChange={e => setForm(f => ({ ...f, telefone: e.target.value }))} />
                  </div>
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-white/70 mb-1.5 block">Responsável</label>
                    <input className={inputCls} style={inputStyle} placeholder="Nome do responsável"
                      value={form.contato} onChange={e => setForm(f => ({ ...f, contato: e.target.value }))} />
                  </div>
                </div>
              </div>
              <div style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }} />
              <div>
                <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>
                  Acesso do Cliente (Painel Admin)
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="text-xs font-semibold text-white/70 mb-1.5 block">Nome do Admin *</label>
                    <input className={inputCls} style={inputStyle} placeholder="Nome completo"
                      value={form.adminNome} onChange={e => setForm(f => ({ ...f, adminNome: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-white/70 mb-1.5 block">Email de Login *</label>
                    <input type="email" className={inputCls} style={inputStyle} placeholder="admin@empresa.com"
                      value={form.adminEmail} onChange={e => setForm(f => ({ ...f, adminEmail: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-white/70 mb-1.5 block">Senha *</label>
                    <div className="relative">
                      <input type={showSenha ? "text" : "password"} className={`${inputCls} pr-10`} style={inputStyle}
                        placeholder="Mínimo 6 caracteres"
                        value={form.adminSenha} onChange={e => setForm(f => ({ ...f, adminSenha: e.target.value }))} />
                      <button type="button" onClick={() => setShowSenha(s => !s)}
                        className="absolute right-3 top-1/2 -translate-y-1/2"
                        style={{ color: "rgba(255,255,255,0.4)" }}>
                        {showSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              <button
                onClick={() => {
                  if (!form.nome || !form.slug || !form.adminNome || !form.adminEmail || !form.adminSenha) {
                    showToast("Preencha todos os campos obrigatórios", "err"); return;
                  }
                  if (form.adminSenha.length < 6) { showToast("Senha deve ter pelo menos 6 caracteres", "err"); return; }
                  createTenantMut.mutate({ token: token!, ...form });
                }}
                disabled={createTenantMut.isPending}
                className="w-full py-4 rounded-xl text-sm font-bold"
                style={{
                  background: createTenantMut.isPending ? "rgba(255,255,255,0.1)" : "linear-gradient(135deg, #667eea, #764ba2)",
                  color: "white",
                  boxShadow: createTenantMut.isPending ? "none" : "0 8px 24px rgba(102,126,234,0.3)",
                }}>
                {createTenantMut.isPending ? "Criando cliente..." : "✓ Criar Cliente"}
              </button>
            </div>
          </div>
        )}
      </main>

      {/* MODAL: ADMINS */}
      {modalAdmins && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-lg rounded-2xl overflow-hidden"
            style={{ background: "#0d1529", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              <div>
                <h3 className="font-bold text-white">Admins — {modalAdmins.nome}</h3>
                <p className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Usuários com acesso ao painel</p>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => setModalCriarAdmin(modalAdmins)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold"
                  style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white" }}>
                  <UserPlus size={12} /> Adicionar
                </button>
                <button onClick={() => setModalAdmins(null)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  <X size={14} className="text-white" />
                </button>
              </div>
            </div>
            <div className="p-4 max-h-96 overflow-y-auto">
              {adminsQ.isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                </div>
              ) : !adminsQ.data || adminsQ.data.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-8 gap-2">
                  <Users size={28} style={{ color: "rgba(255,255,255,0.15)" }} />
                  <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Nenhum admin cadastrado</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {(adminsQ.data as Admin[]).map(a => (
                    <div key={a.id} className="flex items-center justify-between p-3 rounded-xl"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs"
                          style={{ background: "rgba(102,126,234,0.2)", color: "#a78bfa" }}>
                          {a.nome.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{a.nome}</p>
                          <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{a.email}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs px-2 py-0.5 rounded-full"
                          style={{ background: a.ativo ? "rgba(52,211,153,0.15)" : "rgba(239,68,68,0.15)", color: a.ativo ? "#34d399" : "#f87171" }}>
                          {a.ativo ? "Ativo" : "Inativo"}
                        </span>
                        <button onClick={() => updateAdminMut.mutate({ token: token!, id: a.id, ativo: !a.ativo })}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: "rgba(255,255,255,0.06)" }}
                          title={a.ativo ? "Desativar" : "Ativar"}>
                          {a.ativo ? <Lock size={12} style={{ color: "#fbbf24" }} /> : <Unlock size={12} style={{ color: "#34d399" }} />}
                        </button>
                        <button onClick={() => setModalExcluir({ tipo: "admin", id: a.id, nome: a.nome })}
                          className="w-7 h-7 rounded-lg flex items-center justify-center"
                          style={{ background: "rgba(239,68,68,0.1)" }}>
                          <Trash2 size={12} style={{ color: "#f87171" }} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CRIAR ADMIN */}
      {modalCriarAdmin && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "#0d1529", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white">Novo Admin — {modalCriarAdmin.nome}</h3>
              <button onClick={() => setModalCriarAdmin(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.06)" }}>
                <X size={13} className="text-white" />
              </button>
            </div>
            <div className="flex flex-col gap-3">
              {[{ label: "Nome", key: "nome", type: "text", ph: "Nome completo" }, { label: "Email", key: "email", type: "email", ph: "admin@empresa.com" }].map(f => (
                <div key={f.key}>
                  <label className="text-xs font-semibold text-white/70 mb-1.5 block">{f.label}</label>
                  <input type={f.type} className={inputCls} style={inputStyle} placeholder={f.ph}
                    value={(adminForm as any)[f.key]}
                    onChange={e => setAdminForm(a => ({ ...a, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-white/70 mb-1.5 block">Senha</label>
                <div className="relative">
                  <input type={showAdminSenha ? "text" : "password"} className={`${inputCls} pr-9`} style={inputStyle}
                    placeholder="Mínimo 6 caracteres"
                    value={adminForm.senha} onChange={e => setAdminForm(a => ({ ...a, senha: e.target.value }))} />
                  <button type="button" onClick={() => setShowAdminSenha(s => !s)}
                    className="absolute right-3 top-1/2 -translate-y-1/2" style={{ color: "rgba(255,255,255,0.4)" }}>
                    {showAdminSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/70 mb-1.5 block">Função</label>
                <select className={inputCls} style={inputStyle} value={adminForm.role}
                  onChange={e => setAdminForm(a => ({ ...a, role: e.target.value as any }))}>
                  <option value="admin" style={{ background: "#1a1a2e" }}>Admin (acesso total)</option>
                  <option value="viewer" style={{ background: "#1a1a2e" }}>Viewer (somente leitura)</option>
                </select>
              </div>
              <button
                onClick={() => {
                  if (!adminForm.nome || !adminForm.email || !adminForm.senha) { showToast("Preencha todos os campos", "err"); return; }
                  createAdminMut.mutate({ token: token!, tenantId: modalCriarAdmin.id, ...adminForm });
                }}
                disabled={createAdminMut.isPending}
                className="w-full py-3 rounded-xl text-sm font-bold mt-1"
                style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white" }}>
                {createAdminMut.isPending ? "Criando..." : "Criar Admin"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: EDITAR TENANT */}
      {modalEditarTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-md rounded-2xl p-6"
            style={{ background: "#0d1529", border: "1px solid rgba(255,255,255,0.1)" }}>
            <div className="flex items-center justify-between mb-5">
              <h3 className="font-bold text-white">Editar — {modalEditarTenant.nome}</h3>
              <button onClick={() => setModalEditarTenant(null)}
                className="w-7 h-7 rounded-lg flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.06)" }}>
                <X size={13} className="text-white" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                { label: "Nome", key: "nome", col: 2 },
                { label: "Responsável", key: "contato", col: 1 },
                { label: "Email", key: "email", col: 1 },
                { label: "Telefone", key: "telefone", col: 1 },
              ].map(f => (
                <div key={f.key} style={{ gridColumn: `span ${f.col}` }}>
                  <label className="text-xs font-semibold text-white/70 mb-1.5 block">{f.label}</label>
                  <input className={inputCls} style={inputStyle}
                    value={(editForm as any)[f.key] ?? ""}
                    onChange={e => setEditForm(ef => ({ ...ef, [f.key]: e.target.value }))} />
                </div>
              ))}
              <div>
                <label className="text-xs font-semibold text-white/70 mb-1.5 block">Plano</label>
                <select className={inputCls} style={inputStyle} value={editForm.plano ?? "basico"}
                  onChange={e => setEditForm(ef => ({ ...ef, plano: e.target.value as any }))}>
                  <option value="basico" style={{ background: "#1a1a2e" }}>Básico</option>
                  <option value="profissional" style={{ background: "#1a1a2e" }}>Profissional</option>
                  <option value="enterprise" style={{ background: "#1a1a2e" }}>Enterprise</option>
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-white/70 mb-1.5 block">Status</label>
                <select className={inputCls} style={inputStyle} value={editForm.status ?? "ativo"}
                  onChange={e => setEditForm(ef => ({ ...ef, status: e.target.value as any }))}>
                  <option value="ativo" style={{ background: "#1a1a2e" }}>Ativo</option>
                  <option value="suspenso" style={{ background: "#1a1a2e" }}>Suspenso</option>
                  <option value="cancelado" style={{ background: "#1a1a2e" }}>Cancelado</option>
                </select>
              </div>
            </div>
            <button
              onClick={() => updateTenantMut.mutate({ token: token!, id: modalEditarTenant.id, ...editForm })}
              disabled={updateTenantMut.isPending}
              className="w-full py-3 rounded-xl text-sm font-bold mt-4"
              style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", color: "white" }}>
              {updateTenantMut.isPending ? "Salvando..." : "Salvar Alterações"}
            </button>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRMAR EXCLUSÃO */}
      {modalExcluir && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.8)", backdropFilter: "blur(8px)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6"
            style={{ background: "#0d1529", border: "1px solid rgba(239,68,68,0.3)" }}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(239,68,68,0.15)" }}>
                <AlertCircle size={18} style={{ color: "#f87171" }} />
              </div>
              <div>
                <h3 className="font-bold text-white">Confirmar Exclusão</h3>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Esta ação é irreversível</p>
              </div>
            </div>
            <p className="text-sm mb-5" style={{ color: "rgba(255,255,255,0.6)" }}>
              Excluir <strong className="text-white">{modalExcluir.nome}</strong>?
              {modalExcluir.tipo === "tenant" && " Todos os dados do cliente serão removidos."}
            </p>
            <div className="flex gap-3">
              <button onClick={() => setModalExcluir(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                style={{ background: "rgba(255,255,255,0.06)", color: "white" }}>
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (modalExcluir.tipo === "tenant") deleteTenantMut.mutate({ token: token!, id: modalExcluir.id });
                  else deleteAdminMut.mutate({ token: token!, id: modalExcluir.id });
                }}
                disabled={deleteTenantMut.isPending || deleteAdminMut.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold"
                style={{ background: "linear-gradient(135deg, #dc2626, #b91c1c)", color: "white" }}>
                {deleteTenantMut.isPending || deleteAdminMut.isPending ? "Excluindo..." : "Excluir"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
