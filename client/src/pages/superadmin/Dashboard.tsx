import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

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

const PLANO_LABELS = {
  basico: { label: "Básico", color: "#6b7280", bg: "rgba(107,114,128,0.15)" },
  profissional: { label: "Profissional", color: "#3b82f6", bg: "rgba(59,130,246,0.15)" },
  enterprise: { label: "Enterprise", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
};

const STATUS_LABELS = {
  ativo: { label: "Ativo", color: "#22c55e", bg: "rgba(34,197,94,0.15)" },
  suspenso: { label: "Suspenso", color: "#f59e0b", bg: "rgba(245,158,11,0.15)" },
  cancelado: { label: "Cancelado", color: "#ef4444", bg: "rgba(239,68,68,0.15)" },
};

export default function SuperAdminDashboard() {
  const [, navigate] = useLocation();
  const [token, setToken] = useState<string | null>(null);
  const [adminInfo, setAdminInfo] = useState<{ nome: string; email: string } | null>(null);
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [showCreateTenant, setShowCreateTenant] = useState(false);
  const [showAdmins, setShowAdmins] = useState<number | null>(null);
  const [showCreateAdmin, setShowCreateAdmin] = useState<number | null>(null);

  // Form states
  const [form, setForm] = useState({
    nome: "", slug: "", plano: "basico" as "basico" | "profissional" | "enterprise",
    contato: "", email: "", telefone: "", observacoes: "",
    adminNome: "", adminEmail: "", adminSenha: "",
  });
  const [adminForm, setAdminForm] = useState({ nome: "", email: "", senha: "", role: "admin" as "admin" | "viewer" });
  const [editStatus, setEditStatus] = useState<{ id: number; status: "ativo" | "suspenso" | "cancelado" } | null>(null);
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({ nome: "", slug: "", plano: "basico" as "basico" | "profissional" | "enterprise", contato: "", email: "", telefone: "", observacoes: "" });
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    const t = localStorage.getItem("sa_token");
    const a = localStorage.getItem("sa_admin");
    if (!t) { navigate("/superadmin/login"); return; }
    setToken(t);
    if (a) setAdminInfo(JSON.parse(a));
  }, [navigate]);

  const tenantsQuery = trpc.superadmin.listTenants.useQuery(
    { token: token! },
    { enabled: !!token }
  );

  const adminsQuery = trpc.superadmin.listAdmins.useQuery(
    { token: token!, tenantId: showAdmins! },
    { enabled: !!token && showAdmins !== null }
  );

  const createTenantMut = trpc.superadmin.createTenant.useMutation({
    onSuccess: () => {
      setSucesso("Cliente criado com sucesso!");
      setShowCreateTenant(false);
      setForm({ nome: "", slug: "", plano: "basico", contato: "", email: "", telefone: "", observacoes: "", adminNome: "", adminEmail: "", adminSenha: "" });
      tenantsQuery.refetch();
      setTimeout(() => setSucesso(""), 3000);
    },
    onError: (e) => setErro(e.message),
  });

  const updateTenantMut = trpc.superadmin.updateTenant.useMutation({
    onSuccess: () => {
      setSucesso("Status atualizado!");
      setEditStatus(null);
      tenantsQuery.refetch();
      setTimeout(() => setSucesso(""), 3000);
    },
    onError: (e) => setErro(e.message),
  });

  const deleteTenantMut = trpc.superadmin.deleteTenant.useMutation({
    onSuccess: () => {
      setSucesso("Cliente removido!");
      tenantsQuery.refetch();
      setTimeout(() => setSucesso(""), 3000);
    },
    onError: (e) => setErro(e.message),
  });

  const createAdminMut = trpc.superadmin.createAdmin.useMutation({
    onSuccess: () => {
      setSucesso("Usuário criado com sucesso!");
      setShowCreateAdmin(null);
      setAdminForm({ nome: "", email: "", senha: "", role: "admin" });
      adminsQuery.refetch();
      setTimeout(() => setSucesso(""), 3000);
    },
    onError: (e) => setErro(e.message),
  });

  const deleteAdminMut = trpc.superadmin.deleteAdmin.useMutation({
    onSuccess: () => {
      setSucesso("Usuário removido!");
      adminsQuery.refetch();
      setTimeout(() => setSucesso(""), 3000);
    },
    onError: (e) => setErro(e.message),
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

  return (
    <div className="min-h-screen" style={{ background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)" }}>
      {/* Header */}
      <header className="sticky top-0 z-50 px-6 py-4 flex items-center justify-between" style={{
        background: "rgba(15,12,41,0.8)",
        backdropFilter: "blur(20px)",
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          }}>
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h1 className="text-white font-bold text-lg leading-none">Netvionis</h1>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Painel de Revenda</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>{adminInfo?.nome}</span>
          <button onClick={logout} className="px-4 py-2 rounded-xl text-sm font-medium transition-all" style={{
            background: "rgba(239,68,68,0.15)",
            border: "1px solid rgba(239,68,68,0.3)",
            color: "#fca5a5",
          }}>
            Sair
          </button>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Notificações */}
        {sucesso && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{
            background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)", color: "#86efac",
          }}>{sucesso}</div>
        )}
        {erro && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm" style={{
            background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", color: "#fca5a5",
          }}>{erro} <button onClick={() => setErro("")} className="ml-2 underline">fechar</button></div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {[
            { label: "Total Clientes", value: stats.total, icon: "🏢", color: "#667eea" },
            { label: "Ativos", value: stats.ativos, icon: "✅", color: "#22c55e" },
            { label: "Suspensos", value: stats.suspensos, icon: "⏸️", color: "#f59e0b" },
            { label: "Enterprise", value: stats.enterprise, icon: "⭐", color: "#f59e0b" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl p-5" style={{
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}>
              <div className="text-2xl mb-2">{s.icon}</div>
              <div className="text-3xl font-bold text-white">{s.value}</div>
              <div className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Título + botão criar */}
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-white">Clientes Cadastrados</h2>
          <button
            onClick={() => setShowCreateTenant(true)}
            className="px-5 py-2.5 rounded-xl font-semibold text-white transition-all"
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              boxShadow: "0 4px 15px rgba(102,126,234,0.4)",
            }}
          >
            + Novo Cliente
          </button>
        </div>

        {/* Lista de tenants */}
        {tenantsQuery.isLoading ? (
          <div className="text-center py-12" style={{ color: "rgba(255,255,255,0.4)" }}>Carregando...</div>
        ) : tenants.length === 0 ? (
          <div className="text-center py-12 rounded-2xl" style={{
            background: "rgba(255,255,255,0.03)", border: "1px dashed rgba(255,255,255,0.1)",
          }}>
            <div className="text-4xl mb-3">🏢</div>
            <p className="text-white font-medium">Nenhum cliente cadastrado</p>
            <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>Clique em "Novo Cliente" para começar</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tenants.map((tenant) => (
              <div key={tenant.id} className="rounded-2xl p-5" style={{
                background: "rgba(255,255,255,0.05)",
                border: "1px solid rgba(255,255,255,0.08)",
              }}>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 flex-wrap">
                      <h3 className="text-white font-bold text-lg">{tenant.nome}</h3>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                        background: STATUS_LABELS[tenant.status].bg,
                        color: STATUS_LABELS[tenant.status].color,
                      }}>{STATUS_LABELS[tenant.status].label}</span>
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium" style={{
                        background: PLANO_LABELS[tenant.plano].bg,
                        color: PLANO_LABELS[tenant.plano].color,
                      }}>{PLANO_LABELS[tenant.plano].label}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-2 flex-wrap">
                      <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                        🔗 /{tenant.slug}
                      </span>
                      {tenant.contato && (
                        <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                          👤 {tenant.contato}
                        </span>
                      )}
                      {tenant.email && (
                        <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                          ✉️ {tenant.email}
                        </span>
                      )}
                      {tenant.telefone && (
                        <span className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
                          📞 {tenant.telefone}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Ações */}
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button
                      onClick={() => setShowAdmins(showAdmins === tenant.id ? null : tenant.id)}
                      className="px-3 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: showAdmins === tenant.id ? "rgba(102,126,234,0.3)" : "rgba(102,126,234,0.15)",
                        border: "1px solid rgba(102,126,234,0.3)",
                        color: "#a5b4fc",
                      }}
                    >
                      👥 Usuários
                    </button>
                    <select
                      value={tenant.status}
                      onChange={(e) => {
                        const newStatus = e.target.value as "ativo" | "suspenso" | "cancelado";
                        updateTenantMut.mutate({ token: token!, id: tenant.id, status: newStatus });
                      }}
                      className="px-3 py-2 rounded-xl text-sm font-medium outline-none"
                      style={{
                        background: "rgba(255,255,255,0.08)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        color: "white",
                      }}
                    >
                      <option value="ativo">Ativo</option>
                      <option value="suspenso">Suspenso</option>
                      <option value="cancelado">Cancelado</option>
                    </select>
                    <button
                      onClick={() => {
                        setEditTenant(tenant);
                        setEditForm({
                          nome: tenant.nome,
                          slug: tenant.slug,
                          plano: tenant.plano,
                          contato: tenant.contato || "",
                          email: tenant.email || "",
                          telefone: tenant.telefone || "",
                          observacoes: tenant.observacoes || "",
                        });
                      }}
                      className="px-3 py-2 rounded-xl text-sm font-medium transition-all"
                      style={{
                        background: "rgba(59,130,246,0.15)",
                        border: "1px solid rgba(59,130,246,0.3)",
                        color: "#93c5fd",
                      }}
                    >
                      ✏️ Editar
                    </button>
                    <button
                      onClick={() => {
                        if (confirm(`Remover cliente "${tenant.nome}"? Esta ação não pode ser desfeita.`)) {
                          deleteTenantMut.mutate({ token: token!, id: tenant.id });
                        }
                      }}
                      className="px-3 py-2 rounded-xl text-sm transition-all"
                      style={{
                        background: "rgba(239,68,68,0.15)",
                        border: "1px solid rgba(239,68,68,0.3)",
                        color: "#fca5a5",
                      }}
                    >
                      🗑️
                    </button>
                  </div>
                </div>

                {/* Painel de usuários do tenant */}
                {showAdmins === tenant.id && (
                  <div className="mt-4 pt-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-semibold" style={{ color: "rgba(255,255,255,0.7)" }}>
                        Usuários do Painel Admin
                      </h4>
                      <button
                        onClick={() => setShowCreateAdmin(showCreateAdmin === tenant.id ? null : tenant.id)}
                        className="px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{
                          background: "rgba(34,197,94,0.15)",
                          border: "1px solid rgba(34,197,94,0.3)",
                          color: "#86efac",
                        }}
                      >
                        + Novo Usuário
                      </button>
                    </div>

                    {/* Form criar admin */}
                    {showCreateAdmin === tenant.id && (
                      <div className="mb-4 p-4 rounded-xl" style={{
                        background: "rgba(255,255,255,0.04)",
                        border: "1px solid rgba(255,255,255,0.1)",
                      }}>
                        <h5 className="text-sm font-medium text-white mb-3">Criar Usuário Admin</h5>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                          <input
                            placeholder="Nome completo"
                            value={adminForm.nome}
                            onChange={(e) => setAdminForm(f => ({ ...f, nome: e.target.value }))}
                            className="px-3 py-2 rounded-lg text-white text-sm outline-none"
                            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                          />
                          <input
                            placeholder="Email"
                            type="email"
                            value={adminForm.email}
                            onChange={(e) => setAdminForm(f => ({ ...f, email: e.target.value }))}
                            className="px-3 py-2 rounded-lg text-white text-sm outline-none"
                            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                          />
                          <input
                            placeholder="Senha (mín. 6 caracteres)"
                            type="password"
                            value={adminForm.senha}
                            onChange={(e) => setAdminForm(f => ({ ...f, senha: e.target.value }))}
                            className="px-3 py-2 rounded-lg text-white text-sm outline-none"
                            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                          />
                          <select
                            value={adminForm.role}
                            onChange={(e) => setAdminForm(f => ({ ...f, role: e.target.value as "admin" | "viewer" }))}
                            className="px-3 py-2 rounded-lg text-white text-sm outline-none"
                            style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                          >
                            <option value="admin">Admin (acesso total)</option>
                            <option value="viewer">Viewer (somente leitura)</option>
                          </select>
                        </div>
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => createAdminMut.mutate({
                              token: token!,
                              tenantId: tenant.id,
                              ...adminForm,
                            })}
                            disabled={createAdminMut.isPending}
                            className="px-4 py-2 rounded-lg text-sm font-medium text-white"
                            style={{ background: "linear-gradient(135deg, #22c55e, #16a34a)" }}
                          >
                            {createAdminMut.isPending ? "Criando..." : "Criar Usuário"}
                          </button>
                          <button
                            onClick={() => setShowCreateAdmin(null)}
                            className="px-4 py-2 rounded-lg text-sm font-medium"
                            style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
                          >
                            Cancelar
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Lista de admins */}
                    {adminsQuery.isLoading ? (
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Carregando...</p>
                    ) : admins.length === 0 ? (
                      <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Nenhum usuário cadastrado</p>
                    ) : (
                      <div className="space-y-2">
                        {admins.map((admin) => (
                          <div key={admin.id} className="flex items-center justify-between px-4 py-3 rounded-xl" style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.06)",
                          }}>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="text-white text-sm font-medium">{admin.nome}</span>
                                <span className="px-2 py-0.5 rounded-full text-xs" style={{
                                  background: admin.role === "admin" ? "rgba(102,126,234,0.2)" : "rgba(107,114,128,0.2)",
                                  color: admin.role === "admin" ? "#a5b4fc" : "#9ca3af",
                                }}>{admin.role}</span>
                                {!admin.ativo && (
                                  <span className="px-2 py-0.5 rounded-full text-xs" style={{
                                    background: "rgba(239,68,68,0.15)", color: "#fca5a5",
                                  }}>Inativo</span>
                                )}
                              </div>
                              <div className="text-xs mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
                                {admin.email}
                                {admin.ultimoLogin && ` · Último login: ${new Date(admin.ultimoLogin).toLocaleDateString("pt-BR")}`}
                              </div>
                            </div>
                            <button
                              onClick={() => {
                                if (confirm(`Remover usuário "${admin.nome}"?`)) {
                                  deleteAdminMut.mutate({ token: token!, id: admin.id });
                                }
                              }}
                              className="text-xs px-3 py-1.5 rounded-lg transition-all"
                              style={{
                                background: "rgba(239,68,68,0.15)",
                                border: "1px solid rgba(239,68,68,0.2)",
                                color: "#fca5a5",
                              }}
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

      {/* Modal criar tenant - MELHORADO */}
      {showCreateTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{
          background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
        }}>
          <div className="w-full max-w-2xl rounded-3xl p-8 max-h-[90vh] overflow-y-auto" style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}>
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                }}>
                  <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m0 0h6m-6-6H6" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Novo Cliente</h3>
                  <p className="text-sm mt-0.5" style={{ color: "rgba(255,255,255,0.5)" }}>Crie um cliente e seu usuário admin em um único fluxo</p>
                </div>
              </div>
            </div>

            {/* Seção 1: Dados da Empresa */}
            <div className="mb-8 pb-8" style={{ borderBottom: "1px solid rgba(255,255,255,0.1)" }}>
              <h4 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "rgba(255,255,255,0.8)" }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(102,126,234,0.3)", color: "#a5b4fc" }}>1</span>
                Dados da Empresa
              </h4>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                    Nome da Empresa *
                  </label>
                  <input
                    placeholder="Ex: Eletrosat Digital"
                    value={form.nome}
                    onChange={(e) => {
                      const nome = e.target.value;
                      const slug = nome.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
                      setForm(f => ({ ...f, nome, slug }));
                    }}
                    className="w-full px-4 py-3 rounded-xl text-white outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                    onFocus={(e) => e.target.style.borderColor = "rgba(102,126,234,0.5)"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                    Slug (identificador único) *
                  </label>
                  <input
                    placeholder="eletrosat-digital"
                    value={form.slug}
                    onChange={(e) => setForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                    className="w-full px-4 py-3 rounded-xl text-white outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                    onFocus={(e) => e.target.style.borderColor = "rgba(102,126,234,0.5)"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
                  />
                  <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>💡 Apenas letras minúsculas, números e hífens</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                      Plano *
                    </label>
                    <select
                      value={form.plano}
                      onChange={(e) => setForm(f => ({ ...f, plano: e.target.value as "basico" | "profissional" | "enterprise" }))}
                      className="w-full px-4 py-3 rounded-xl text-white outline-none transition-all"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                      onFocus={(e) => e.target.style.borderColor = "rgba(102,126,234,0.5)"}
                      onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
                    >
                      <option value="basico">📦 Básico</option>
                      <option value="profissional">⭐ Profissional</option>
                      <option value="enterprise">🏆 Enterprise</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                      Responsável
                    </label>
                    <input
                      placeholder="Nome do responsável"
                      value={form.contato}
                      onChange={(e) => setForm(f => ({ ...f, contato: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl text-white outline-none transition-all"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                      onFocus={(e) => e.target.style.borderColor = "rgba(102,126,234,0.5)"}
                      onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                      Telefone
                    </label>
                    <input
                      placeholder="(75) 99999-9999"
                      value={form.telefone}
                      onChange={(e) => setForm(f => ({ ...f, telefone: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl text-white outline-none transition-all"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                      onFocus={(e) => e.target.style.borderColor = "rgba(102,126,234,0.5)"}
                      onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                      Email de contato
                    </label>
                    <input
                      placeholder="contato@empresa.com"
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                      className="w-full px-4 py-3 rounded-xl text-white outline-none transition-all"
                      style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                      onFocus={(e) => e.target.style.borderColor = "rgba(102,126,234,0.5)"}
                      onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Seção 2: Usuário Admin */}
            <div className="mb-8">
              <h4 className="text-sm font-bold mb-4 flex items-center gap-2" style={{ color: "rgba(255,255,255,0.8)" }}>
                <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(34,197,94,0.3)", color: "#86efac" }}>2</span>
                Usuário Admin do Painel
              </h4>
              <p className="text-xs mb-4" style={{ color: "rgba(255,255,255,0.4)" }}>🔑 Credenciais de acesso ao painel administrativo deste cliente</p>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                    Nome do Admin *
                  </label>
                  <input
                    placeholder="Ex: João Silva"
                    value={form.adminNome}
                    onChange={(e) => setForm(f => ({ ...f, adminNome: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-white outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                    onFocus={(e) => e.target.style.borderColor = "rgba(34,197,94,0.5)"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                    Email do Admin *
                  </label>
                  <input
                    placeholder="admin@empresa.com"
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => setForm(f => ({ ...f, adminEmail: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-white outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                    onFocus={(e) => e.target.style.borderColor = "rgba(34,197,94,0.5)"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                    Senha do Admin *
                  </label>
                  <input
                    placeholder="Mínimo 6 caracteres (recomendado: 12+)"
                    type="password"
                    value={form.adminSenha}
                    onChange={(e) => setForm(f => ({ ...f, adminSenha: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-white outline-none transition-all"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                    onFocus={(e) => e.target.style.borderColor = "rgba(34,197,94,0.5)"}
                    onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
                  />
                  <p className="text-xs mt-1.5" style={{ color: "rgba(255,255,255,0.3)" }}>🔒 Senha forte recomendada para segurança</p>
                </div>
              </div>
            </div>

            {/* Validação */}
            {(!form.nome || !form.slug || !form.adminNome || !form.adminEmail || !form.adminSenha) && (
              <div className="mb-6 px-4 py-3 rounded-xl text-sm" style={{
                background: "rgba(245,158,11,0.15)",
                border: "1px solid rgba(245,158,11,0.3)",
                color: "#fcd34d",
              }}>
                ⚠️ Preencha todos os campos obrigatórios (*) para criar o cliente
              </div>
            )}

            {/* Botões */}
            <div className="flex gap-3 mt-8">
              <button
                onClick={() => createTenantMut.mutate({ token: token!, ...form })}
                disabled={createTenantMut.isPending || !form.nome || !form.slug || !form.adminNome || !form.adminEmail || !form.adminSenha}
                className="flex-1 py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2"
                style={{
                  background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                  opacity: (!form.nome || !form.slug || !form.adminNome || !form.adminEmail || !form.adminSenha) ? 0.5 : 1,
                  cursor: (!form.nome || !form.slug || !form.adminNome || !form.adminEmail || !form.adminSenha) ? "not-allowed" : "pointer",
                }}
              >
                {createTenantMut.isPending ? (
                  <>
                    <span className="animate-spin">⏳</span>
                    Criando...
                  </>
                ) : (
                  <>
                    <span>✨</span>
                    Criar Cliente
                  </>
                )}
              </button>
              <button
                onClick={() => setShowCreateTenant(false)}
                className="px-6 py-3 rounded-xl font-medium transition-all"
                style={{ background: "rgba(255,255,255,0.08)", color: "rgba(255,255,255,0.6)" }}
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Editar Tenant */}
      {editTenant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="rounded-2xl p-8 max-w-2xl w-full" style={{
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            boxShadow: "0 20px 60px rgba(0,0,0,0.5)",
          }}>
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-white">Editar Cliente</h3>
              <p className="text-sm mt-1" style={{ color: "rgba(255,255,255,0.5)" }}>Atualize os dados do cliente</p>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>Nome da Empresa</label>
                <input
                  value={editForm.nome}
                  onChange={(e) => setEditForm(f => ({ ...f, nome: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>Slug</label>
                <input
                  value={editForm.slug}
                  onChange={(e) => setEditForm(f => ({ ...f, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "") }))}
                  className="w-full px-4 py-3 rounded-xl text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>Plano</label>
                  <select
                    value={editForm.plano}
                    onChange={(e) => setEditForm(f => ({ ...f, plano: e.target.value as "basico" | "profissional" | "enterprise" }))}
                    className="w-full px-4 py-3 rounded-xl text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                  >
                    <option value="basico">Básico</option>
                    <option value="profissional">Profissional</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>Responsável</label>
                  <input
                    value={editForm.contato}
                    onChange={(e) => setEditForm(f => ({ ...f, contato: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>Email</label>
                  <input
                    value={editForm.email}
                    onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>Telefone</label>
                  <input
                    value={editForm.telefone}
                    onChange={(e) => setEditForm(f => ({ ...f, telefone: e.target.value }))}
                    className="w-full px-4 py-3 rounded-xl text-white outline-none"
                    style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>Observações</label>
                <textarea
                  value={editForm.observacoes}
                  onChange={(e) => setEditForm(f => ({ ...f, observacoes: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl text-white outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)" }}
                  rows={3}
                />
              </div>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setEditTenant(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium"
                style={{ background: "rgba(255,255,255,0.08)", border: "1px solid rgba(255,255,255,0.15)", color: "rgba(255,255,255,0.7)" }}
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  if (editTenant) {
                    updateTenantMut.mutate({
                      token: token!,
                      id: editTenant.id,
                      nome: editForm.nome,
                      slug: editForm.slug,
                      plano: editForm.plano,
                      contato: editForm.contato,
                      email: editForm.email,
                      telefone: editForm.telefone,
                      observacoes: editForm.observacoes,
                    });
                    setEditTenant(null);
                  }
                }}
                className="px-4 py-2 rounded-xl text-sm font-medium text-white"
                style={{ background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)" }}
              >
                Salvar Alterações
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
