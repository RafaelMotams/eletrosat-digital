import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Shield, Wifi, Lock, Eye, EyeOff, Crown } from "lucide-react";

export default function SuperAdminLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState("");

  const loginMut = trpc.superadmin.login.useMutation({
    onSuccess: (data) => {
      if (data.admin.isSuperAdmin) {
        localStorage.setItem("sa_admin", JSON.stringify(data.admin));
        navigate("/superadmin/dashboard");
      } else {
        localStorage.setItem("tenant_admin_info", JSON.stringify({ ...data.admin, tenant: data.tenant }));
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
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden"
      style={{ background: "linear-gradient(160deg, #020812 0%, #060d1f 40%, #0a0f20 100%)" }}>

      {/* Glow orbs */}
      <div className="absolute pointer-events-none" style={{ width: 600, height: 600, top: "-20%", left: "-15%", background: "radial-gradient(circle, rgba(0,245,160,0.05) 0%, transparent 70%)", borderRadius: "50%" }} />
      <div className="absolute pointer-events-none" style={{ width: 500, height: 500, bottom: "-15%", right: "-10%", background: "radial-gradient(circle, rgba(102,126,234,0.06) 0%, transparent 70%)", borderRadius: "50%" }} />
      <div className="absolute pointer-events-none" style={{ width: 300, height: 300, top: "40%", left: "55%", background: "radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 70%)", borderRadius: "50%" }} />

      {/* Grid pattern */}
      <div className="absolute inset-0 pointer-events-none opacity-30"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "50px 50px",
        }} />

      <div className="relative w-full max-w-md mx-4">
        {/* Header badge */}
        <div className="flex justify-center mb-6">
          <div className="flex items-center gap-2 px-4 py-2 rounded-full"
            style={{ background: "rgba(0,245,160,0.08)", border: "1px solid rgba(0,245,160,0.2)" }}>
            <Crown size={12} style={{ color: "#00f5a0" }} />
            <span className="text-xs font-semibold" style={{ color: "#00f5a0" }}>Área Master · Acesso Restrito</span>
          </div>
        </div>

        {/* Card principal */}
        <div className="rounded-3xl overflow-hidden shadow-2xl"
          style={{
            background: "rgba(255,255,255,0.03)",
            backdropFilter: "blur(24px)",
            border: "1px solid rgba(255,255,255,0.08)",
            boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.04)",
          }}>

          {/* Top gradient bar */}
          <div className="h-1" style={{ background: "linear-gradient(90deg, #00f5a0, #667eea, #764ba2)" }} />

          <div className="p-8">
            {/* Logo */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4 relative"
                style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)", boxShadow: "0 8px 32px rgba(0,245,160,0.3)" }}>
                <Wifi size={28} className="text-black" strokeWidth={2.5} />
                <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #667eea, #764ba2)", border: "2px solid #020812" }}>
                  <Shield size={9} className="text-white" />
                </div>
              </div>
              <h1 className="text-2xl font-black text-white mb-1 tracking-tight">Netvius</h1>
              <p className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.4)" }}>
                Painel de Controle Master
              </p>
            </div>

            {/* Formulário */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                  style={{ color: "rgba(255,255,255,0.45)" }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  required
                  className="w-full px-4 py-3 rounded-xl text-white placeholder-slate-600 outline-none transition-all text-sm"
                  style={{
                    background: "rgba(255,255,255,0.05)",
                    border: "1px solid rgba(255,255,255,0.1)",
                  }}
                  onFocus={(e) => { e.target.style.borderColor = "rgba(0,245,160,0.5)"; e.target.style.background = "rgba(0,245,160,0.04)"; }}
                  onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-2 uppercase tracking-wider"
                  style={{ color: "rgba(255,255,255,0.45)" }}>
                  Senha
                </label>
                <div className="relative">
                  <input
                    type={showSenha ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full px-4 py-3 pr-11 rounded-xl text-white placeholder-slate-600 outline-none transition-all text-sm"
                    style={{
                      background: "rgba(255,255,255,0.05)",
                      border: "1px solid rgba(255,255,255,0.1)",
                    }}
                    onFocus={(e) => { e.target.style.borderColor = "rgba(0,245,160,0.5)"; e.target.style.background = "rgba(0,245,160,0.04)"; }}
                    onBlur={(e) => { e.target.style.borderColor = "rgba(255,255,255,0.1)"; e.target.style.background = "rgba(255,255,255,0.05)"; }}
                  />
                  <button type="button" onClick={() => setShowSenha(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg transition-colors"
                    style={{ color: "rgba(255,255,255,0.3)" }}>
                    {showSenha ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {erro && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
                  style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.25)", color: "#fca5a5" }}>
                  <Lock size={13} style={{ color: "#f87171", flexShrink: 0 }} />
                  {erro}
                </div>
              )}

              <button
                type="submit"
                disabled={loginMut.isPending}
                className="w-full py-3.5 rounded-xl font-bold text-sm transition-all mt-2 flex items-center justify-center gap-2"
                style={{
                  background: loginMut.isPending
                    ? "rgba(0,245,160,0.3)"
                    : "linear-gradient(135deg, #00f5a0, #00d9f5)",
                  color: loginMut.isPending ? "rgba(255,255,255,0.5)" : "#020812",
                  boxShadow: loginMut.isPending ? "none" : "0 8px 32px rgba(0,245,160,0.3)",
                  transform: loginMut.isPending ? "none" : undefined,
                }}
                onMouseEnter={e => { if (!loginMut.isPending) (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}
              >
                {loginMut.isPending ? (
                  <>
                    <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  <>
                    <Shield size={15} />
                    Acessar Painel Master
                  </>
                )}
              </button>
            </form>

            {/* Security badges */}
            <div className="flex items-center justify-center gap-4 mt-6 pt-5 border-t"
              style={{ borderColor: "rgba(255,255,255,0.06)" }}>
              {[
                { icon: Shield, text: "SSL" },
                { icon: Lock, text: "2FA Ready" },
                { icon: Wifi, text: "Criptografado" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex items-center gap-1.5">
                  <Icon size={11} style={{ color: "rgba(0,245,160,0.6)" }} />
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <p className="text-center text-xs mt-5" style={{ color: "rgba(255,255,255,0.18)" }}>
          Netvius © {new Date().getFullYear()} · Plataforma líder em gestão de equipes técnicas
        </p>
      </div>
    </div>
  );
}
