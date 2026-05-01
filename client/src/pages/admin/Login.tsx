import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");

  const loginMutation = trpc.superadmin.login.useMutation({
    onSuccess: (data) => {
      if (data.admin.isSuperAdmin) {
        // Superadmin vai para o painel de revenda
        localStorage.setItem("superadmin_token", data.token);
        localStorage.setItem("superadmin_info", JSON.stringify(data.admin));
        navigate("/superadmin/dashboard");
      } else {
        // Admin de tenant vai para o painel admin
        localStorage.setItem("tenant_admin_token", data.token);
        localStorage.setItem("tenant_admin_info", JSON.stringify({ ...data.admin, tenant: data.tenant }));
        const currentPath = window.location.pathname;
        if (currentPath.includes("/cliente")) {
          navigate("/cliente/dashboard");
        } else {
          navigate("/admin/dashboard");
        }
      }
    },
    onError: (err) => {
      toast.error(err.message || "Email ou senha inválidos");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !senha) return toast.error("Preencha todos os campos");
    loginMutation.mutate({ email, senha });
  };

  // Verificar se já está autenticado
  useEffect(() => {
    const token = localStorage.getItem("tenant_admin_token");
    const superadminToken = localStorage.getItem("superadmin_token");
    const currentPath = window.location.pathname;
    
    // Se está em /admin/login ou /cliente/login, NÃO redireciona (mostra página de login)
    if (currentPath.includes("/admin/login") || currentPath.includes("/cliente/login")) {
      return; // Mostra a página de login
    }
    
    // Se tem token de tenant admin, redireciona para dashboard
    if (token && !superadminToken) {
      if (currentPath.includes("/cliente")) {
        navigate("/cliente/dashboard");
      } else if (currentPath.includes("/admin")) {
        navigate("/admin/dashboard");
      }
    }
    // Se tem token de superadmin, redireciona para superadmin
    else if (superadminToken) {
      navigate("/superadmin/dashboard");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)"
    }}>
      <div className="w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4" style={{
            background: "linear-gradient(135deg, #6366f1, #8b5cf6)"
          }}>
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white">Netvionis</h1>
          <p className="text-purple-300 mt-1">Painel Administrativo do Cliente</p>
        </div>

        {/* Card de login */}
        <div className="rounded-2xl p-8" style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
          boxShadow: "0 25px 50px rgba(0,0,0,0.5)"
        }}>
          <h2 className="text-xl font-semibold text-white mb-6">Entrar no painel</h2>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-purple-400 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)"
                }}
                autoComplete="email"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">Senha</label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                className="w-full px-4 py-3 rounded-xl text-white placeholder-purple-400 outline-none focus:ring-2 focus:ring-purple-500 transition-all"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)"
                }}
                autoComplete="current-password"
              />
            </div>

            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all disabled:opacity-50"
              style={{
                background: loginMutation.isPending
                  ? "rgba(99,102,241,0.5)"
                  : "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow: "0 4px 15px rgba(99,102,241,0.4)"
              }}
            >
              {loginMutation.isPending ? "Entrando..." : "Entrar"}
            </button>
          </form>
        </div>

        <p className="text-center text-purple-400 text-sm mt-6">
          Netvionis © 2026 — Gestão inteligente para equipes externas
        </p>
      </div>
    </div>
  );
}
