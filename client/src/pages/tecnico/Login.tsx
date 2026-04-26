import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Zap } from "lucide-react";

export default function TecnicoLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [error, setError] = useState("");
  const [focusEmail, setFocusEmail] = useState(false);
  const [focusSenha, setFocusSenha] = useState(false);

  const loginMut = trpc.tecnicoAuth.login.useMutation({
    onSuccess: (data) => {
      localStorage.setItem("tecnico", JSON.stringify(data));
      localStorage.setItem("tecnico_id", String(data.id));
      localStorage.setItem("tecnico_nome", data.nome);
      localStorage.setItem("tecnico_email", data.email);
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
    <div className="min-h-screen flex flex-col items-center justify-center px-5 py-10 relative overflow-hidden"
      style={{ background: "linear-gradient(145deg, #060b18 0%, #0d1a35 40%, #091428 70%, #060b18 100%)" }}>

      {/* Orbs decorativos */}
      <div className="absolute top-0 left-0 w-72 h-72 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)", transform: "translate(-30%, -30%)" }} />
      <div className="absolute top-1/4 right-0 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)", transform: "translateX(40%)" }} />
      <div className="absolute bottom-0 left-1/3 w-80 h-80 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)", transform: "translateY(40%)" }} />
      <div className="absolute bottom-1/3 right-1/4 w-48 h-48 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)" }} />

      {/* Grid pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]"
        style={{ backgroundImage: "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)", backgroundSize: "40px 40px" }} />

      <div className="w-full max-w-sm relative z-10">
        {/* Logo */}
        <div className="flex flex-col items-center mb-10">
          {/* Ícone com múltiplos anéis */}
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-3xl opacity-30 blur-xl"
              style={{ background: "linear-gradient(135deg, #6366f1, #10b981)", transform: "scale(1.4)" }} />
            <div className="relative w-20 h-20 rounded-3xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #4f46e5 0%, #10b981 100%)", boxShadow: "0 20px 60px rgba(99,102,241,0.4), 0 0 0 1px rgba(255,255,255,0.1)" }}>
              <Zap className="w-9 h-9 text-white" style={{ filter: "drop-shadow(0 0 8px rgba(255,255,255,0.6))" }} />
            </div>
          </div>
          <h1 className="text-white font-black text-3xl tracking-tight mb-1"
            style={{ fontFamily: "var(--font-display)", textShadow: "0 0 40px rgba(99,102,241,0.5)" }}>
            Netvionis
          </h1>
          <div className="flex items-center gap-2 px-3 py-1 rounded-full"
            style={{ background: "rgba(99,102,241,0.15)", border: "1px solid rgba(99,102,241,0.3)" }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: "#6366f1" }} />
            <span className="text-xs font-medium" style={{ color: "rgba(165,180,252,0.9)" }}>Área do Técnico de Campo</span>
          </div>
        </div>

        {/* Card do formulário */}
        <div className="rounded-3xl p-7 relative overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.10)",
            backdropFilter: "blur(24px)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.08)",
          }}>
          {/* Gradiente interno sutil */}
          <div className="absolute top-0 left-0 right-0 h-px"
            style={{ background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.5), rgba(16,185,129,0.5), transparent)" }} />

          <h2 className="text-white font-bold text-xl mb-1">Bem-vindo de volta</h2>
          <p className="text-sm mb-7" style={{ color: "rgba(148,163,184,0.6)" }}>
            Entre com suas credenciais para continuar
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            {/* Email */}
            <div>
              <label className="text-xs font-bold mb-2 block uppercase tracking-wider"
                style={{ color: focusEmail ? "rgba(165,180,252,0.9)" : "rgba(148,163,184,0.6)" }}>
                E-mail
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: focusEmail ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.06)" }}>
                  <Mail className="w-4 h-4" style={{ color: focusEmail ? "#818cf8" : "rgba(100,116,139,0.7)" }} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusEmail(true)}
                  onBlur={() => setFocusEmail(false)}
                  placeholder="seu@email.com"
                  className="w-full pl-14 pr-4 py-4 rounded-2xl text-white text-sm outline-none transition-all duration-200"
                  style={{
                    background: focusEmail ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.05)",
                    border: `1.5px solid ${focusEmail ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)"}`,
                    boxShadow: focusEmail ? "0 0 0 3px rgba(99,102,241,0.1)" : "none",
                  }}
                  autoComplete="email"
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="text-xs font-bold mb-2 block uppercase tracking-wider"
                style={{ color: focusSenha ? "rgba(165,180,252,0.9)" : "rgba(148,163,184,0.6)" }}>
                Senha
              </label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: focusSenha ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.06)" }}>
                  <Lock className="w-4 h-4" style={{ color: focusSenha ? "#818cf8" : "rgba(100,116,139,0.7)" }} />
                </div>
                <input
                  type={showSenha ? "text" : "password"}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  onFocus={() => setFocusSenha(true)}
                  onBlur={() => setFocusSenha(false)}
                  placeholder="••••••••"
                  className="w-full pl-14 pr-12 py-4 rounded-2xl text-white text-sm outline-none transition-all duration-200"
                  style={{
                    background: focusSenha ? "rgba(99,102,241,0.08)" : "rgba(255,255,255,0.05)",
                    border: `1.5px solid ${focusSenha ? "rgba(99,102,241,0.5)" : "rgba(255,255,255,0.08)"}`,
                    boxShadow: focusSenha ? "0 0 0 3px rgba(99,102,241,0.1)" : "none",
                  }}
                  autoComplete="current-password"
                />
                <button type="button" onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(100,116,139,0.7)" }}>
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Erro */}
            {error && (
              <div className="rounded-2xl px-4 py-3 text-sm flex items-start gap-2"
                style={{ background: "rgba(239,68,68,0.10)", color: "rgba(252,165,165,0.95)", border: "1px solid rgba(239,68,68,0.20)" }}>
                <span className="mt-0.5">⚠</span>
                <span>{error}</span>
              </div>
            )}

            {/* Botão */}
            <button
              type="submit"
              disabled={loginMut.isPending}
              className="w-full py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2.5 transition-all duration-200 mt-2 relative overflow-hidden"
              style={{
                background: loginMut.isPending
                  ? "rgba(99,102,241,0.4)"
                  : "linear-gradient(135deg, #4f46e5 0%, #6366f1 50%, #10b981 100%)",
                boxShadow: loginMut.isPending ? "none" : "0 8px 32px rgba(99,102,241,0.4), 0 2px 8px rgba(0,0,0,0.3)",
                transform: loginMut.isPending ? "scale(0.98)" : "scale(1)",
              }}>
              {loginMut.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Entrando...</span>
                </>
              ) : (
                <>
                  <span>Entrar na conta</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        <p className="text-center text-xs mt-6" style={{ color: "rgba(100,116,139,0.5)" }}>
          Problemas de acesso? Contate o administrador.
        </p>
      </div>
    </div>
  );
}
