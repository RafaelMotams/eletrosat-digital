import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Wifi, Mail, Lock, Eye, EyeOff, ArrowRight } from "lucide-react";

export default function TecnicoLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [error, setError] = useState("");

  const loginMut = trpc.tecnicoAuth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("tecnico", JSON.stringify(data));
      navigate("/tecnico");
    },
    onError: (e) => setError(e.message),
  });

  function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    if (!email || !senha) { setError("Preencha email e senha"); return; }
    loginMut.mutate({ email, senha });
  }

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #0a0f1e 0%, #0d1f3c 50%, #0a0f1e 100%)" }}
    >
      {/* Glow decorativo */}
      <div
        className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "rgba(16, 185, 129, 0.07)", filter: "blur(70px)" }}
      />
      <div
        className="absolute bottom-1/4 right-1/4 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: "rgba(59, 130, 246, 0.06)", filter: "blur(60px)" }}
      />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          <div
            className="w-16 h-16 rounded-3xl flex items-center justify-center mb-4"
            style={{
              background: "linear-gradient(135deg, #059669, #10b981)",
              boxShadow: "0 12px 40px rgba(16, 185, 129, 0.35)",
            }}
          >
            <Wifi className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-white font-bold text-2xl tracking-tight">Eletrosat Digital</h1>
          <p className="text-sm mt-1" style={{ color: "rgba(148, 163, 184, 0.8)" }}>
            Área do Técnico de Campo
          </p>
        </div>

        {/* Card do formulário */}
        <div
          className="rounded-3xl p-6"
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.10)",
            backdropFilter: "blur(16px)",
          }}
        >
          <h2 className="text-white font-bold text-lg mb-1">Entrar na sua conta</h2>
          <p className="text-sm mb-6" style={{ color: "rgba(148, 163, 184, 0.7)" }}>
            Use as credenciais fornecidas pelo administrador
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(148, 163, 184, 0.9)" }}>
                E-mail
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(100,116,139,0.8)" }} />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="w-full pl-10 pr-4 py-3 rounded-xl text-white text-sm outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1.5px solid rgba(255,255,255,0.10)",
                    color: "white",
                  }}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "#10b981"; }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.10)"; }}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(148, 163, 184, 0.9)" }}>
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(100,116,139,0.8)" }} />
                <input
                  type={showSenha ? "text" : "password"}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-3 rounded-xl text-white text-sm outline-none transition-all"
                  style={{
                    background: "rgba(255,255,255,0.07)",
                    border: "1.5px solid rgba(255,255,255,0.10)",
                    color: "white",
                  }}
                  onFocus={e => { (e.target as HTMLInputElement).style.borderColor = "#10b981"; }}
                  onBlur={e => { (e.target as HTMLInputElement).style.borderColor = "rgba(255,255,255,0.10)"; }}
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: "rgba(100,116,139,0.8)" }}
                >
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div
                className="rounded-xl px-3 py-2.5 text-sm"
                style={{
                  background: "rgba(239, 68, 68, 0.12)",
                  color: "rgba(252, 165, 165, 0.9)",
                  border: "1px solid rgba(239, 68, 68, 0.25)",
                }}
              >
                {error}
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={loginMut.isPending}
              className="w-full py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all mt-2"
              style={{
                background: loginMut.isPending
                  ? "rgba(16, 185, 129, 0.4)"
                  : "linear-gradient(135deg, #059669, #10b981)",
                boxShadow: loginMut.isPending ? "none" : "0 8px 28px rgba(16, 185, 129, 0.30)",
              }}
            >
              {loginMut.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                <>Entrar <ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "rgba(100,116,139,0.6)" }}>
          Problemas de acesso? Contate o administrador.
        </p>
      </div>
    </div>
  );
}
