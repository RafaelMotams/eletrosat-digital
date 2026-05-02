import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Wifi } from "lucide-react";

// Splash screen component
function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed inset-0 flex flex-col items-center justify-center z-50"
      style={{ background: "linear-gradient(160deg, #050d1f 0%, #0a1930 50%, #050d1f 100%)" }}>
      {/* Animated rings */}
      <div className="relative flex items-center justify-center">
        <div className="absolute w-40 h-40 rounded-full border border-blue-500/10 animate-ping" style={{ animationDuration: "2s" }} />
        <div className="absolute w-28 h-28 rounded-full border border-blue-400/15 animate-ping" style={{ animationDuration: "1.5s", animationDelay: "0.3s" }} />
        <div className="relative w-24 h-24 rounded-2xl overflow-hidden shadow-2xl"
          style={{ boxShadow: "0 0 60px rgba(59,130,246,0.4), 0 0 120px rgba(59,130,246,0.15)" }}>
          <img src="/manus-storage/netvionis-logo_1c60afaf.webp" alt="Netvionis" className="w-full h-full object-cover" />
        </div>
      </div>
      <div className="mt-8 text-center">
        <h1 className="text-2xl font-black text-white tracking-tight">Netvionis</h1>
        <p className="text-sm text-blue-400/70 mt-1 font-medium">Área do Técnico</p>
      </div>
      {/* Loading bar */}
      <div className="absolute bottom-16 w-32 h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.08)" }}>
        <div className="h-full rounded-full animate-pulse" style={{ background: "linear-gradient(90deg, #3b82f6, #6366f1)", width: "100%", animation: "loadbar 2s ease-in-out forwards" }} />
      </div>
      <style>{`
        @keyframes loadbar { from { width: 0% } to { width: 100% } }
      `}</style>
    </div>
  );
}

export default function TecnicoLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [showSplash, setShowSplash] = useState(true);
  const [focusedField, setFocusedField] = useState<"email" | "senha" | null>(null);

  const loginMutation = trpc.tecnicoAuth.login.useMutation({
    onSuccess: (data) => {
      if (data?.id) {
        const isFirstLogin = !localStorage.getItem("tecnico_ever_logged");
        localStorage.setItem("tecnico_id", String(data.id));
        localStorage.setItem("tecnico_nome", data.nome);
        localStorage.setItem("tecnico_email", data.email);
        localStorage.setItem("tecnico", JSON.stringify(data));
        if (isFirstLogin) {
          localStorage.setItem("tecnico_ever_logged", "1");
          localStorage.setItem("tecnico_show_welcome", "1");
        }
        navigate("/tecnico");
      } else {
        setErro("Email ou senha inválidos");
      }
    },
    onError: (e) => setErro(e.message || "Email ou senha inválidos"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErro("");
    if (!email || !senha) { setErro("Preencha todos os campos"); return; }
    loginMutation.mutate({ email: email.trim(), senha });
  };

  if (showSplash) return <SplashScreen onDone={() => setShowSplash(false)} />;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-5 relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #050d1f 0%, #0a1930 60%, #050d1f 100%)" }}>

      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-full h-full pointer-events-none overflow-hidden">
        <div className="absolute -top-32 -right-32 w-80 h-80 rounded-full opacity-10"
          style={{ background: "radial-gradient(circle, #3b82f6, transparent)" }} />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 rounded-full opacity-8"
          style={{ background: "radial-gradient(circle, #6366f1, transparent)" }} />
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, #0ea5e9, transparent)" }} />
        {/* Grid pattern */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="1"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
        </svg>
      </div>

      <div className="w-full max-w-sm relative z-10">
        {/* Logo section */}
        <div className="flex flex-col items-center mb-10">
          <div className="relative mb-5">
            <div className="absolute inset-0 rounded-2xl blur-2xl opacity-40"
              style={{ background: "radial-gradient(circle, #3b82f6, #6366f1)" }} />
            <div className="relative w-20 h-20 rounded-2xl overflow-hidden"
              style={{ boxShadow: "0 8px 32px rgba(59,130,246,0.35), 0 0 0 1px rgba(255,255,255,0.08)" }}>
              <img src="/manus-storage/netvionis-logo_1c60afaf.webp" alt="Netvionis" className="w-full h-full object-cover" />
            </div>
          </div>
          <h1 className="text-2xl font-black text-white tracking-tight">Netvionis</h1>
          <div className="flex items-center gap-2 mt-2 px-3 py-1 rounded-full"
            style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
            <Wifi className="w-3 h-3 text-blue-400" />
            <span className="text-xs font-medium text-blue-300">Área do Técnico de Campo</span>
          </div>
        </div>

        {/* Card */}
        <div className="rounded-2xl p-6 backdrop-blur-sm"
          style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", boxShadow: "0 24px 64px rgba(0,0,0,0.4)" }}>

          <h2 className="text-lg font-bold text-white mb-1">Entrar na conta</h2>
          <p className="text-sm text-slate-400 mb-6">Acesse com suas credenciais</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Email</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Mail className="w-4 h-4" style={{ color: focusedField === "email" ? "#60a5fa" : "rgba(148,163,184,0.5)" }} />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  onFocus={() => setFocusedField("email")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  className="w-full pl-10 pr-4 py-3.5 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                  style={{
                    background: focusedField === "email" ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.05)",
                    border: focusedField === "email" ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: focusedField === "email" ? "0 0 0 3px rgba(59,130,246,0.1)" : "none",
                  }}
                />
              </div>
            </div>

            {/* Senha */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1.5 uppercase tracking-wider">Senha</label>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none">
                  <Lock className="w-4 h-4" style={{ color: focusedField === "senha" ? "#60a5fa" : "rgba(148,163,184,0.5)" }} />
                </div>
                <input
                  type={showSenha ? "text" : "password"}
                  value={senha}
                  onChange={e => setSenha(e.target.value)}
                  onFocus={() => setFocusedField("senha")}
                  onBlur={() => setFocusedField(null)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-10 pr-12 py-3.5 rounded-xl text-sm text-white placeholder-slate-500 outline-none transition-all"
                  style={{
                    background: focusedField === "senha" ? "rgba(59,130,246,0.08)" : "rgba(255,255,255,0.05)",
                    border: focusedField === "senha" ? "1px solid rgba(59,130,246,0.5)" : "1px solid rgba(255,255,255,0.08)",
                    boxShadow: focusedField === "senha" ? "0 0 0 3px rgba(59,130,246,0.1)" : "none",
                  }}
                />
                <button type="button" onClick={() => setShowSenha(!showSenha)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                  style={{ color: "rgba(148,163,184,0.6)" }}>
                  {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Error */}
            {erro && (
              <div className="flex items-center gap-2 px-3.5 py-3 rounded-xl text-sm"
                style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
                <div className="w-1.5 h-1.5 rounded-full bg-red-400 flex-shrink-0" />
                {erro}
              </div>
            )}

            {/* Submit */}
            <button type="submit" disabled={loginMutation.isPending}
              className="w-full flex items-center justify-center gap-2.5 py-3.5 rounded-xl font-bold text-sm text-white transition-all active:scale-[0.98] mt-2"
              style={{
                background: loginMutation.isPending
                  ? "rgba(59,130,246,0.4)"
                  : "linear-gradient(135deg, #2563eb 0%, #4f46e5 100%)",
                boxShadow: loginMutation.isPending ? "none" : "0 8px 24px rgba(37,99,235,0.35)",
              }}>
              {loginMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Entrando...
                </>
              ) : (
                <>
                  Entrar
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-slate-600 mt-6">
          Netvionis Tecnologia © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
