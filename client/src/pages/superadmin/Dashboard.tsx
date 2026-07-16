import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import {
  Building2, Users, CheckCircle, PauseCircle, Star, Plus, LogOut,
  ExternalLink, Trash2, UserPlus, ChevronDown, ChevronUp, Eye, EyeOff,
  Wifi, Shield, Settings, X, AlertCircle,
} from "lucide-react";

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
  basico:       { label: "Básico",        color: "#94a3b8", bg: "rgba(148,163,184,0.12)", border: "rgba(148,163,184,0.25)" },
  profissional: { label: "Profissional",  color: "#60a5fa", bg: "rgba(96,165,250,0.12)",  border: "rgba(96,165,250,0.25)" },
  enterprise:   { label: "Enterprise",    color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.25)" },
};

const STATUS = {
  ativo:     { label: "Ativo",     color: "#34d399", bg: "rgba(52,211,153,0.12)",  border: "rgba(52,211,153,0.25)",  dot: "#10b981" },
  suspenso:  { label: "Suspenso",  color: "#fbbf24", bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.25)",  dot: "#f59e0b" },
  cancelado: { label: "Cancelado", color: "#f87171", bg: "rgba(248,113,113,0.12)", border: "rgba(248,113,113,0.25)", dot: "#ef4444" },
};

export default function SuperAdminDashboard() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [adminInfo, setAdminInfo] = useState<{ nome: string; email: string } | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [expandedTenant, setExpandedTenant] = useState<number | null>(null);
  const [showCreateAdmin, setShowCreateAdmin] = useState<number | null>(null);
  const [showAdminSenha, setShowAdminSenha] = useState(false);
  const [showFormSenha, setShowFormSenha] = useState(false);
  const [impersonating, setImpersonating] = useState<number | null>(null);
  const [toast, setToast] = useState<{ msg: string; type: "ok" | "err" } | null>(null);

  const [form, setForm] = useState({
    nome: "", slug: "", plano: "basico" as "basico" | "profissional" | "enterprise",
    contato: "", email: "", telefone: "", observacoes: "",
    adminNome: "", adminEmail: "", adminSenha: "",
  });
  const [adminForm, setAdminForm] = useState({ nome: "", email: "", senha: "", role: "admin" as "admin" | "viewer" });

  const showToast = (msg: string, type: "ok" | "err" = "ok") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const t = localStorage.getItem("sa_token");
    const a = localStorage.getItem("sa_admin");
    if (!t) { navigate("/superadmin/login"); return; }
    setToken(t);
    if (a) setAdminInfo(JSON.parse(a));
  }, [navigate]);

  const tenantsQuery = trpc.superadmin.listTenants.useQuery(
    { token: token! }, { enabled: !!token }
  );
  const adminsQuery = trpc.superadmin.listAdmins.useQuery(
    { token: token!, tenantId: expandedTenant! },
    { enabled: !!token && expandedTenant !== null }
  );

  const createTenantMut = trpc.superadmin.createTenant.useMutation({
    onSuccess: () => {
      showToast("Cliente criado com sucesso!");
      setShowCreate(false);
      setForm({ nome: "", slug: "", plano: "basico", contato: "", email: "", telefone: "", observacoes: "", adminNome: "", adminEmail: "", adminSenha: "" });
      tenantsQuery.refetch();
    },
    onError: (e) => showToast(e.message, "err"),
  });

  const updateTenantMut = trpc.superadmin.updateTenant.useMutation({
    onSuccess: () => { showToast("Status atualizado!"); tenantsQuery.refetch(); },
    onError: (e) => showToast(e.message, "err"),
  });

  const deleteTenantMut = trpc.superadmin.deleteTenant.useMutation({
    onSuccess: () => { showToast("Cliente removido!"); tenantsQuery.refetch(); },
    onError: (e) => showToast(e.message, "err"),
  });

  const createAdminMut = trpc.superadmin.createAdmin.useMutation({
    onSuccess: () => {
      showToast("Usuário criado com sucesso!");
      setShowCreateAdmin(null);
      setAdminForm({ nome: "", email: "", senha: "", role: "admin" });
      adminsQuery.refetch();
    },
    onError: (e) => showToast(e.message, "err"),
  });

  const deleteAdminMut = trpc.superadmin.deleteAdmin.useMutation({
    onSuccess: () => { showToast("Usuário removido!"); adminsQuery.refetch(); },
    onError: (e) => showToast(e.message, "err"),
  });

  const impersonateMut = trpc.superadmin.impersonateTenant.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("tenant_admin_token", data.token);
      localStorage.setItem("tenant_admin_info", JSON.stringify({ ...data.admin, tenant: data.tenant }));
      setImpersonating(null);
      navigate("/admin");
    },
    onError: (e) => { setImpersonating(null); showToast(e.message, "err"); },
  });

  const logout = () => {
    localStorage.removeItem("sa_token");
    localStorage.removeItem("sa_admin");
    navigate("/superadmin/login");
  };

  const tenants = (tenantsQuery.data ?? []) as Tenant[];
  const admins = (adminsQuery.data ?? []) as Admin[];

  const stats = {
    total: tenants.length,
    ativos: tenants.filter(t => t.status === "ativo").length,
    suspensos: tenants.filter(t => t.status === "suspenso").length,
    enterprise: tenants.filter(t => t.plano === "enterprise").length,
  };

  if (!token) return null;

  const inputStyle = {
    width: "100%", padding: "11px 14px", borderRadius: 10,
    background: "rgba(255,255,255,0.06)", border: "1.5px solid rgba(255,255,255,0.12)",
    color: "white", fontSize: 14, outline: "none",
  };

  return (
    <div style={{ minHeight: "100vh", background: "#060d1f", fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>
      {/* Ambient */}
      <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0 }}>
        <div style={{ position: "absolute", top: "-10%", left: "-5%", width: 500, height: 500, background: "radial-gradient(circle, rgba(102,126,234,0.08) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", bottom: "-10%", right: "-5%", width: 400, height: 400, background: "radial-gradient(circle, rgba(118,75,162,0.08) 0%, transparent 70%)", borderRadius: "50%" }} />
      </div>

      {/* Toast */}
      {toast && (
        <div style={{
          position: "fixed", top: 20, right: 20, zIndex: 9999,
          padding: "12px 20px", borderRadius: 12,
          background: toast.type === "ok" ? "rgba(16,185,129,0.15)" : "rgba(239,68,68,0.15)",
          border: `1px solid ${toast.type === "ok" ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)"}`,
          color: toast.type === "ok" ? "#34d399" : "#f87171",
          fontSize: 14, fontWeight: 500,
          display: "flex", alignItems: "center", gap: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
        }}>
          {toast.type === "ok" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
          {toast.msg}
        </div>
      )}

      {/* Header */}
      <header style={{
        position: "sticky", top: 0, zIndex: 50,
        display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "0 32px", height: 64,
        background: "rgba(6,13,31,0.85)", backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.07)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 38, height: 38, borderRadius: 10,
            background: "linear-gradient(135deg, #667eea, #764ba2)",
            display: "flex", alignItems: "center", justifyContent: "center",
            boxShadow: "0 0 20px rgba(102,126,234,0.4)",
          }}>
            <Shield size={18} color="white" />
          </div>
          <div>
            <p style={{ color: "white", fontWeight: 800, fontSize: 16, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>Netvius</p>
            <p style={{ color: "rgba(102,126,234,0.8)", fontSize: 11, marginTop: 2 }}>Painel de Revenda</p>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ width: 28, height: 28, borderRadius: "50%", background: "linear-gradient(135deg, #667eea, #764ba2)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 700, color: "white" }}>
              {adminInfo?.nome?.charAt(0).toUpperCase() ?? "S"}
            </div>
            <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 13 }}>{adminInfo?.nome}</span>
          </div>
          <button
            onClick={logout}
            style={{
              display: "flex", alignItems: "center", gap: 6,
              padding: "7px 14px", borderRadius: 8,
              background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)",
              color: "#f87171", fontSize: 13, fontWeight: 500, cursor: "pointer",
            }}
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>

      {/* Content */}
      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 24px", position: "relative", zIndex: 1 }}>

        {/* Page title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ color: "white", fontWeight: 800, fontSize: 26, fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>
            Gestão de Clientes
          </h1>
          <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14, marginTop: 6 }}>
            Crie e gerencie os painéis dos seus clientes
          </p>
        </div>

        {/* Stats */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
          {[
            { label: "Total de Clientes", value: stats.total, icon: Building2, color: "#667eea", glow: "rgba(102,126,234,0.2)" },
            { label: "Clientes Ativos", value: stats.ativos, icon: CheckCircle, color: "#10b981", glow: "rgba(16,185,129,0.2)" },
            { label: "Suspensos", value: stats.suspensos, icon: PauseCircle, color: "#f59e0b", glow: "rgba(245,158,11,0.2)" },
            { label: "Enterprise", value: stats.enterprise, icon: Star, color: "#fbbf24", glow: "rgba(251,191,36,0.2)" },
          ].map((s) => (
            <div key={s.label} style={{
              background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: 16, padding: "20px 20px 16px",
            }}>
              <div style={{
                width: 36, height: 36, borderRadius: 10, marginBottom: 14,
                background: s.glow, display: "flex", alignItems: "center", justifyContent: "center",
              }}>
                <s.icon size={18} color={s.color} />
              </div>
              <p style={{ color: "white", fontWeight: 800, fontSize: 28, fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>{s.value}</p>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, marginTop: 6 }}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Header da lista */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
          <h2 style={{ color: "white", fontWeight: 700, fontSize: 18, fontFamily: "'Outfit', sans-serif" }}>
            Clientes Cadastrados
            {tenants.length > 0 && (
              <span style={{ marginLeft: 8, fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.35)" }}>
                ({tenants.length})
              </span>
            )}
          </h2>
          <button
            onClick={() => setShowCreate(true)}
            style={{
              display: "flex", alignItems: "center", gap: 8,
              padding: "10px 20px", borderRadius: 10,
              background: "linear-gradient(135deg, #667eea, #764ba2)",
              color: "white", fontWeight: 600, fontSize: 14,
              border: "none", cursor: "pointer",
              boxShadow: "0 4px 16px rgba(102,126,234,0.4)",
            }}
          >
            <Plus size={16} /> Novo Cliente
          </button>
        </div>

        {/* Lista de clientes */}
        {tenantsQuery.isLoading ? (
          <div style={{ textAlign: "center", padding: "60px 0", color: "rgba(255,255,255,0.3)" }}>Carregando clientes...</div>
        ) : tenants.length === 0 ? (
          <div style={{
            textAlign: "center", padding: "60px 0",
            background: "rgba(255,255,255,0.02)", border: "1px dashed rgba(255,255,255,0.1)", borderRadius: 16,
          }}>
            <Building2 size={40} color="rgba(255,255,255,0.15)" style={{ margin: "0 auto 12px" }} />
            <p style={{ color: "rgba(255,255,255,0.5)", fontWeight: 600 }}>Nenhum cliente cadastrado</p>
            <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 13, marginTop: 4 }}>Clique em "Novo Cliente" para começar</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {tenants.map((tenant) => (
              <div key={tenant.id} style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: 16, overflow: "hidden",
                transition: "border-color 0.15s",
              }}>
                {/* Card principal */}
                <div style={{ padding: "18px 20px", display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: "linear-gradient(135deg, #667eea, #764ba2)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontWeight: 800, fontSize: 16, color: "white", fontFamily: "'Outfit', sans-serif",
                  }}>
                    {tenant.nome.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                      <span style={{ color: "white", fontWeight: 700, fontSize: 16 }}>{tenant.nome}</span>
                      <span style={{
                        padding: "2px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600,
                        background: STATUS[tenant.status].bg, color: STATUS[tenant.status].color,
                        border: `1px solid ${STATUS[tenant.status].border}`,
                        display: "flex", alignItems: "center", gap: 5,
                      }}>
                        <span style={{ width: 5, height: 5, borderRadius: "50%", background: STATUS[tenant.status].dot, display: "inline-block" }} />
                        {STATUS[tenant.status].label}
                      </span>
                      <span style={{
                        padding: "2px 10px", borderRadius: 100, fontSize: 11, fontWeight: 600,
                        background: PLANO[tenant.plano].bg, color: PLANO[tenant.plano].color,
                        border: `1px solid ${PLANO[tenant.plano].border}`,
                      }}>
                        {PLANO[tenant.plano].label}
                      </span>
                    </div>
                    <div style={{ display: "flex", gap: 16, marginTop: 5, flexWrap: "wrap" }}>
                      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>/{tenant.slug}</span>
                      {tenant.contato && <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{tenant.contato}</span>}
                      {tenant.email && <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{tenant.email}</span>}
                      {tenant.telefone && <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 12 }}>{tenant.telefone}</span>}
                    </div>
                  </div>

                  {/* Ações */}
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0, flexWrap: "wrap" }}>
                    {/* Acessar painel do cliente */}
                    <button
                      onClick={() => {
                        setImpersonating(tenant.id);
                        impersonateMut.mutate({ token: token!, tenantId: tenant.id });
                      }}
                      disabled={impersonating === tenant.id || tenant.status !== "ativo"}
                      title={tenant.status !== "ativo" ? "Cliente suspenso ou cancelado" : "Entrar no painel do cliente"}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "8px 14px", borderRadius: 8,
                        background: tenant.status === "ativo" ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
                        border: `1px solid ${tenant.status === "ativo" ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.1)"}`,
                        color: tenant.status === "ativo" ? "#34d399" : "rgba(255,255,255,0.25)",
                        fontSize: 13, fontWeight: 600, cursor: tenant.status === "ativo" ? "pointer" : "not-allowed",
                      }}
                    >
                      {impersonating === tenant.id ? (
                        <div style={{ width: 14, height: 14, border: "2px solid rgba(52,211,153,0.3)", borderTopColor: "#34d399", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                      ) : (
                        <ExternalLink size={14} />
                      )}
                      Acessar Painel
                    </button>

                    {/* Usuários */}
                    <button
                      onClick={() => setExpandedTenant(expandedTenant === tenant.id ? null : tenant.id)}
                      style={{
                        display: "flex", alignItems: "center", gap: 6,
                        padding: "8px 14px", borderRadius: 8,
                        background: expandedTenant === tenant.id ? "rgba(102,126,234,0.2)" : "rgba(102,126,234,0.1)",
                        border: "1px solid rgba(102,126,234,0.25)",
                        color: "#a5b4fc", fontSize: 13, fontWeight: 600, cursor: "pointer",
                      }}
                    >
                      <Users size={14} />
                      Usuários
                      {expandedTenant === tenant.id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                    </button>

                    {/* Status */}
                    <select
                      value={tenant.status}
                      onChange={(e) => updateTenantMut.mutate({ token: token!, id: tenant.id, status: e.target.value as "ativo" | "suspenso" | "cancelado" })}
                      style={{
                        padding: "8px 12px", borderRadius: 8,
                        background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                        color: "white", fontSize: 13, outline: "none", cursor: "pointer",
                      }}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="suspenso">Suspenso</option>
                      <option value="cancelado">Cancelado</option>
                    </select>

                    {/* Deletar */}
                    <button
                      onClick={() => {
                        if (confirm(`Remover cliente "${tenant.nome}"? Esta ação não pode ser desfeita.`)) {
                          deleteTenantMut.mutate({ token: token!, id: tenant.id });
                        }
                      }}
                      style={{
                        padding: "8px 10px", borderRadius: 8,
                        background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)",
                        color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center",
                      }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                {/* Painel de usuários expandido */}
                {expandedTenant === tenant.id && (
                  <div style={{ padding: "16px 20px 20px", borderTop: "1px solid rgba(255,255,255,0.07)", background: "rgba(0,0,0,0.2)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14 }}>
                      <p style={{ color: "rgba(255,255,255,0.6)", fontWeight: 600, fontSize: 13 }}>
                        Usuários do Painel Admin
                      </p>
                      <button
                        onClick={() => setShowCreateAdmin(showCreateAdmin === tenant.id ? null : tenant.id)}
                        style={{
                          display: "flex", alignItems: "center", gap: 6,
                          padding: "6px 12px", borderRadius: 8,
                          background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.25)",
                          color: "#34d399", fontSize: 12, fontWeight: 600, cursor: "pointer",
                        }}
                      >
                        <UserPlus size={13} /> Novo Usuário
                      </button>
                    </div>

                    {/* Form criar usuário */}
                    {showCreateAdmin === tenant.id && (
                      <div style={{
                        marginBottom: 16, padding: "16px", borderRadius: 12,
                        background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
                      }}>
                        <p style={{ color: "white", fontWeight: 600, fontSize: 13, marginBottom: 12 }}>Criar Usuário Admin</p>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                          <input placeholder="Nome completo" value={adminForm.nome}
                            onChange={(e) => setAdminForm(f => ({ ...f, nome: e.target.value }))}
                            style={inputStyle} />
                          <input placeholder="Email" type="email" value={adminForm.email}
                            onChange={(e) => setAdminForm(f => ({ ...f, email: e.target.value }))}
                            style={inputStyle} />
                          <div style={{ position: "relative" }}>
                            <input placeholder="Senha (mín. 6 caracteres)"
                              type={showAdminSenha ? "text" : "password"}
                              value={adminForm.senha}
                              onChange={(e) => setAdminForm(f => ({ ...f, senha: e.target.value }))}
                              style={{ ...inputStyle, paddingRight: 40 }} />
                            <button type="button" onClick={() => setShowAdminSenha(v => !v)}
                              style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}>
                              {showAdminSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                          </div>
                          <select value={adminForm.role}
                            onChange={(e) => setAdminForm(f => ({ ...f, role: e.target.value as "admin" | "viewer" }))}
                            style={{ ...inputStyle, cursor: "pointer" }}>
                            <option value="admin">Admin (acesso total)</option>
                            <option value="viewer">Viewer (somente leitura)</option>
                          </select>
                        </div>
                        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                          <button
                            onClick={() => createAdminMut.mutate({ token: token!, tenantId: tenant.id, ...adminForm })}
                            disabled={createAdminMut.isPending}
                            style={{
                              padding: "8px 18px", borderRadius: 8,
                              background: "linear-gradient(135deg, #10b981, #059669)",
                              color: "white", fontWeight: 600, fontSize: 13, border: "none", cursor: "pointer",
                            }}
                          >
                            {createAdminMut.isPending ? "Criando..." : "Criar Usuário"}
                          </button>
                          <button onClick={() => setShowCreateAdmin(null)}
                            style={{ padding: "8px 14px", borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontSize: 13, cursor: "pointer" }}>
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Lista de usuários */}
                    {adminsQuery.isLoading ? (
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Carregando...</p>
                    ) : admins.length === 0 ? (
                      <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>Nenhum usuário cadastrado</p>
                    ) : (
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        {admins.map((admin) => (
                          <div key={admin.id} style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "10px 14px", borderRadius: 10,
                            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                          }}>
                            <div>
                              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                                <span style={{ color: "white", fontWeight: 600, fontSize: 13 }}>{admin.nome}</span>
                                <span style={{
                                  padding: "1px 8px", borderRadius: 100, fontSize: 11,
                                  background: admin.role === "admin" ? "rgba(102,126,234,0.15)" : "rgba(107,114,128,0.15)",
                                  color: admin.role === "admin" ? "#a5b4fc" : "#9ca3af",
                                }}>{admin.role}</span>
                                {!admin.ativo && (
                                  <span style={{ padding: "1px 8px", borderRadius: 100, fontSize: 11, background: "rgba(239,68,68,0.12)", color: "#f87171" }}>Inativo</span>
                                )}
                              </div>
                              <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 2 }}>
                                {admin.email}
                                {admin.ultimoLogin && ` · Último login: ${new Date(admin.ultimoLogin).toLocaleDateString("pt-BR")}`}
                              </p>
                            </div>
                            <button
                              onClick={() => { if (confirm(`Remover usuário "${admin.nome}"?`)) deleteAdminMut.mutate({ token: token!, id: admin.id }); }}
                              style={{ padding: "6px 12px", borderRadius: 8, background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171", fontSize: 12, cursor: "pointer" }}
                            >
                              Remover
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal criar cliente */}
      {showCreate && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 16,
          background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)",
        }}>
          <div style={{
            width: "100%", maxWidth: 520, borderRadius: 20, padding: "28px 28px 24px",
            maxHeight: "90vh", overflowY: "auto",
            background: "linear-gradient(160deg, #0f172a 0%, #1e1b4b 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 32px 64px rgba(0,0,0,0.5)",
          }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
              <div>
                <h3 style={{ color: "white", fontWeight: 800, fontSize: 20, fontFamily: "'Outfit', sans-serif" }}>Novo Cliente</h3>
                <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, marginTop: 2 }}>Preencha os dados do cliente e as credenciais do painel</p>
              </div>
              <button onClick={() => setShowCreate(false)}
                style={{ padding: 8, borderRadius: 8, background: "rgba(255,255,255,0.06)", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.5)" }}>
                <X size={16} />
              </button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Empresa */}
              <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>Dados da Empresa</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Nome da Empresa *</label>
                    <input placeholder="Ex: Telecom Bahia" value={form.nome}
                      onChange={(e) => {
                        const nome = e.target.value;
                        const slug = nome.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                        setForm(f => ({ ...f, nome, slug }));
                      }}
                      style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Slug (identificador único) *</label>
                    <input placeholder="telecom-bahia" value={form.slug}
                      onChange={(e) => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                      style={inputStyle} />
                    <p style={{ color: "rgba(255,255,255,0.25)", fontSize: 11, marginTop: 4 }}>Apenas letras minúsculas, números e hífens</p>
                  </div>
                  <div>
                    <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Plano *</label>
                    <select value={form.plano} onChange={(e) => setForm(f => ({ ...f, plano: e.target.value as "basico" | "profissional" | "enterprise" }))}
                      style={{ ...inputStyle, cursor: "pointer" }}>
                      <option value="basico">Básico</option>
                      <option value="profissional">Profissional</option>
                      <option value="enterprise">Enterprise</option>
                    </select>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                    <div>
                      <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Responsável</label>
                      <input placeholder="Nome do responsável" value={form.contato}
                        onChange={(e) => setForm(f => ({ ...f, contato: e.target.value }))} style={inputStyle} />
                    </div>
                    <div>
                      <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Telefone</label>
                      <input placeholder="(75) 99999-9999" value={form.telefone}
                        onChange={(e) => setForm(f => ({ ...f, telefone: e.target.value }))} style={inputStyle} />
                    </div>
                  </div>
                  <div>
                    <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Email de contato</label>
                    <input placeholder="contato@empresa.com" type="email" value={form.email}
                      onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} />
                  </div>
                </div>
              </div>

              {/* Admin do painel */}
              <div style={{ padding: "14px 16px", borderRadius: 12, background: "rgba(102,126,234,0.05)", border: "1px solid rgba(102,126,234,0.15)" }}>
                <p style={{ color: "rgba(165,180,252,0.7)", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 12 }}>
                  Credenciais do Painel Admin
                </p>
                <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginBottom: 12 }}>
                  O cliente usará essas credenciais para acessar o painel em /admin/login
                </p>
                <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                  <div>
                    <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Nome do Admin *</label>
                    <input placeholder="Nome completo" value={form.adminNome}
                      onChange={(e) => setForm(f => ({ ...f, adminNome: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Email do Admin *</label>
                    <input placeholder="admin@empresa.com" type="email" value={form.adminEmail}
                      onChange={(e) => setForm(f => ({ ...f, adminEmail: e.target.value }))} style={inputStyle} />
                  </div>
                  <div>
                    <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 12, fontWeight: 600, display: "block", marginBottom: 6 }}>Senha do Admin *</label>
                    <div style={{ position: "relative" }}>
                      <input placeholder="Mínimo 6 caracteres"
                        type={showFormSenha ? "text" : "password"}
                        value={form.adminSenha}
                        onChange={(e) => setForm(f => ({ ...f, adminSenha: e.target.value }))}
                        style={{ ...inputStyle, paddingRight: 40 }} />
                      <button type="button" onClick={() => setShowFormSenha(v => !v)}
                        style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "rgba(255,255,255,0.4)" }}>
                        {showFormSenha ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
              <button
                onClick={() => createTenantMut.mutate({ token: token!, ...form })}
                disabled={createTenantMut.isPending || !form.nome || !form.slug || !form.adminNome || !form.adminEmail || !form.adminSenha}
                style={{
                  flex: 1, padding: "12px", borderRadius: 10,
                  background: (!form.nome || !form.slug || !form.adminNome || !form.adminEmail || !form.adminSenha)
                    ? "rgba(102,126,234,0.3)" : "linear-gradient(135deg, #667eea, #764ba2)",
                  color: "white", fontWeight: 700, fontSize: 14, border: "none",
                  cursor: (!form.nome || !form.slug || !form.adminNome || !form.adminEmail || !form.adminSenha) ? "not-allowed" : "pointer",
                  boxShadow: "0 4px 16px rgba(102,126,234,0.3)",
                }}
              >
                {createTenantMut.isPending ? "Criando..." : "Criar Cliente"}
              </button>
              <button onClick={() => setShowCreate(false)}
                style={{ padding: "12px 20px", borderRadius: 10, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.5)", fontWeight: 600, fontSize: 14, cursor: "pointer" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        select option { background: #1e1b4b; color: white; }
      `}</style>
    </div>
  );
}
