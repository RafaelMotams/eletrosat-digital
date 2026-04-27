import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

export default function SuperAdminLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const loginMut = trpc.superadmin.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("sa_token", data.token);
      localStorage.setItem("sa_admin", JSON.stringify(data.admin));
      if (data.admin.isSuperAdmin) {
        navigate("/superadmin/dashboard");
      } else {
        // Admin de tenant → redirecionar para painel admin do tenant
        navigate("/admin/dashboard");
      }
    },
    onError: (err) => setErro(err.message),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    loginMut.mutate({ email, senha });
  };

  return (
    <div className="min-h-screen flex items-center justify-center" style={{
      background: "linear-gradient(135deg, #0f0c29 0%, #302b63 50%, #24243e 100%)"
    }}>
      {/* Partículas decorativas */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="absolute rounded-full opacity-10" style={{
            width: `${80 + i * 40}px`,
            height: `${80 + i * 40}px`,
            background: i % 2 === 0
              ? "linear-gradient(135deg, #667eea, #764ba2)"
              : "linear-gradient(135deg, #f093fb, #f5576c)",
            top: `${10 + i * 15}%`,
            left: `${5 + i * 16}%`,
            filter: "blur(40px)",
          }} />
        ))}
      </div>

      <div className="relative w-full max-w-md mx-4">
        {/* Card principal */}
        <div className="rounded-3xl p-8 shadow-2xl" style={{
          background: "rgba(255,255,255,0.05)",
          backdropFilter: "blur(20px)",
          border: "1px solid rgba(255,255,255,0.1)",
        }}>
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl mb-4 shadow-lg" style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            }}>
              <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-white mb-1">Netvionis</h1>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>
              Painel de Controle — Revenda
            </p>
          </div>

          {/* Formulário */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
                onFocus={(e) => e.target.style.borderColor = "rgba(102,126,234,0.8)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2" style={{ color: "rgba(255,255,255,0.7)" }}>
                Senha
              </label>
              <input
                type="password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full px-4 py-3 rounded-xl text-white placeholder-gray-500 outline-none transition-all"
                style={{
                  background: "rgba(255,255,255,0.08)",
                  border: "1px solid rgba(255,255,255,0.15)",
                }}
                onFocus={(e) => e.target.style.borderColor = "rgba(102,126,234,0.8)"}
                onBlur={(e) => e.target.style.borderColor = "rgba(255,255,255,0.15)"}
              />
            </div>

            {erro && (
              <div className="px-4 py-3 rounded-xl text-sm" style={{
                background: "rgba(239,68,68,0.15)",
                border: "1px solid rgba(239,68,68,0.3)",
                color: "#fca5a5",
              }}>
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loginMut.isPending}
              className="w-full py-3 rounded-xl font-semibold text-white transition-all mt-2"
              style={{
                background: loginMut.isPending
                  ? "rgba(102,126,234,0.5)"
                  : "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
                boxShadow: loginMut.isPending ? "none" : "0 8px 25px rgba(102,126,234,0.4)",
              }}
            >
              {loginMut.isPending ? "Entrando..." : "Entrar"}
            </button>
          </form>

          <p className="text-center text-xs mt-6" style={{ color: "rgba(255,255,255,0.3)" }}>
            Netvionis © {new Date().getFullYear()} — Gestão inteligente para equipes externas
          </p>
        </div>
      </div>
    </div>
  );
}
