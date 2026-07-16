import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import {
  Eye, EyeOff, Wifi, ArrowRight, Shield, Zap, BarChart3,
  Users, MapPin, FileText, CheckCircle, Lock,
} from "lucide-react";

const stats = [
  { value: "5.000+", label: "Escolas" },
  { value: "120+", label: "Técnicos" },
  { value: "98%", label: "Uptime" },
  { value: "15k+", label: "OS Concluídas" },
];

const features = [
  { icon: BarChart3, label: "Dashboard em tempo real", desc: "KPIs e métricas atualizados a cada 30 segundos" },
  { icon: Users, label: "Gestão de técnicos", desc: "Atribuição automática por cidade ou manual" },
  { icon: MapPin, label: "Mapa interativo", desc: "Visualize todas as escolas com status em tempo real" },
  { icon: FileText, label: "Relatórios com Excel", desc: "Exportação profissional com valores calculados" },
];

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [focusEmail, setFocusEmail] = useState(false);
  const [focusSenha, setFocusSenha] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 50);
    return () => clearTimeout(t);
  }, []);

  const loginMutation = trpc.superadmin.login.useMutation({
    onSuccess: (data) => {
      if (data.admin.isSuperAdmin) {
        localStorage.setItem("superadmin_token", data.token);
        localStorage.setItem("superadmin_info", JSON.stringify(data.admin));
        navigate("/superadmin/dashboard");
      } else {
        localStorage.setItem("tenant_admin_token", data.token);
        localStorage.setItem("tenant_admin_info", JSON.stringify({ ...data.admin, tenant: data.tenant }));
        navigate("/admin");
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

  return (
    <div
      className="min-h-screen flex"
      style={{
        background: "#060d1f",
        fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
      }}
    >
      {/* ── Ambient particles ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <div style={{ position: "absolute", width: 500, height: 500, top: "-10%", left: "-10%", background: "radial-gradient(circle, rgba(16,185,129,0.10) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", width: 600, height: 600, bottom: "-15%", right: "-15%", background: "radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div style={{ position: "absolute", inset: 0, backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)", backgroundSize: "60px 60px" }} />
      </div>

      {/* ── Left branding panel ── */}
      <div
        className="hidden lg:flex flex-col justify-between relative overflow-hidden z-10"
        style={{
          width: 520,
          flexShrink: 0,
          padding: "48px 52px",
          background: "linear-gradient(160deg, rgba(16,185,129,0.06) 0%, rgba(6,13,31,0.95) 40%, rgba(99,102,241,0.06) 100%)",
          borderRight: "1px solid rgba(255,255,255,0.06)",
        }}
      >
        {/* Glow orbs */}
        <div style={{ position: "absolute", top: 60, left: -80, width: 300, height: 300, background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />
        <div style={{ position: "absolute", bottom: 80, right: -60, width: 250, height: 250, background: "radial-gradient(circle, rgba(99,102,241,0.12) 0%, transparent 70%)", borderRadius: "50%", pointerEvents: "none" }} />

        {/* Logo */}
        <div className="relative z-10">
          <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 64 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: "linear-gradient(135deg, #10b981, #059669)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 30px rgba(16,185,129,0.45)",
            }}>
              <Wifi size={22} color="white" />
            </div>
            <div>
              <p style={{ color: "white", fontWeight: 800, fontSize: 22, lineHeight: 1, fontFamily: "'Outfit', sans-serif" }}>Netvius</p>
              <p style={{ color: "rgba(16,185,129,0.7)", fontSize: 11, fontWeight: 500, marginTop: 3 }}>Plataforma de Gestão</p>
            </div>
          </div>

          {/* Headline */}
          <div style={{ opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(20px)", transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)" }}>
            <h1 style={{ color: "white", fontSize: 38, fontWeight: 800, lineHeight: 1.15, marginBottom: 16, fontFamily: "'Outfit', sans-serif" }}>
              Gerencie sua equipe com{" "}
              <span style={{ background: "linear-gradient(135deg, #10b981, #34d399)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                inteligência
              </span>
            </h1>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 15, lineHeight: 1.7, marginBottom: 40 }}>
              Controle instalações, acompanhe técnicos e visualize o progresso de cada escola em tempo real.
            </p>
          </div>

          {/* Stats row */}
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12, marginBottom: 40,
            opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)",
            transition: "all 0.7s cubic-bezier(0.16,1,0.3,1)", transitionDelay: "0.1s",
          }}>
            {stats.map((s, i) => (
              <div key={i} style={{
                background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)",
                borderRadius: 12, padding: "14px 10px", textAlign: "center",
              }}>
                <p style={{ color: "#10b981", fontWeight: 800, fontSize: 18, fontFamily: "'Outfit', sans-serif", lineHeight: 1 }}>{s.value}</p>
                <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, marginTop: 4 }}>{s.label}</p>
              </div>
            ))}
          </div>

          {/* Features */}
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {features.map((f, i) => (
              <div key={i} style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                padding: "14px 16px", borderRadius: 14,
                background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)",
                opacity: mounted ? 1 : 0, transform: mounted ? "translateX(0)" : "translateX(-16px)",
                transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)", transitionDelay: `${i * 80 + 200}ms`,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>
                  <f.icon size={16} color="#10b981" />
                </div>
                <div>
                  <p style={{ color: "white", fontWeight: 600, fontSize: 13 }}>{f.label}</p>
                  <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 12, marginTop: 2 }}>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p style={{ color: "rgba(255,255,255,0.2)", fontSize: 12, position: "relative", zIndex: 10 }}>
          © {new Date().getFullYear()} Netvius · Todos os direitos reservados
        </p>
      </div>

      {/* ── Right form panel ── */}
      <div className="flex-1 flex items-center justify-center relative z-10" style={{ padding: "32px 24px" }}>
        <div style={{
          width: "100%", maxWidth: 420,
          opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(28px)",
          transition: "all 0.6s cubic-bezier(0.16,1,0.3,1)", transitionDelay: "0.15s",
        }}>
          {/* Mobile logo */}
          <div className="lg:hidden" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 40 }}>
            <div style={{
              width: 42, height: 42, borderRadius: 12,
              background: "linear-gradient(135deg, #10b981, #059669)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 20px rgba(16,185,129,0.4)",
            }}>
              <Wifi size={20} color="white" />
            </div>
            <p style={{ color: "white", fontWeight: 800, fontSize: 20, fontFamily: "'Outfit', sans-serif" }}>Netvius</p>
          </div>

          {/* Form card */}
          <div style={{
            background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)",
            borderRadius: 24, padding: "40px 36px",
            boxShadow: "0 32px 64px rgba(0,0,0,0.4)",
          }}>
            {/* Header */}
            <div style={{ marginBottom: 32 }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: 100, padding: "5px 14px", marginBottom: 20,
              }}>
                <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
                <span style={{ color: "#10b981", fontSize: 12, fontWeight: 600 }}>Sistema online</span>
              </div>
              <h2 style={{ color: "white", fontWeight: 800, fontSize: 28, fontFamily: "'Outfit', sans-serif", lineHeight: 1.2, marginBottom: 8 }}>
                Bem-vindo de volta
              </h2>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
                Entre com suas credenciais para acessar o painel
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 20 }}>
              {/* Email */}
              <div>
                <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setFocusEmail(true)}
                  onBlur={() => setFocusEmail(false)}
                  placeholder="seu@email.com"
                  autoComplete="email"
                  style={{
                    width: "100%", padding: "13px 16px", borderRadius: 12,
                    background: "rgba(255,255,255,0.05)",
                    border: focusEmail ? "1.5px solid #10b981" : "1.5px solid rgba(255,255,255,0.1)",
                    boxShadow: focusEmail ? "0 0 0 3px rgba(16,185,129,0.15)" : "none",
                    color: "white", fontSize: 14, outline: "none",
                    transition: "all 0.2s",
                  }}
                />
              </div>

              {/* Senha */}
              <div>
                <label style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 600, display: "block", marginBottom: 8 }}>
                  Senha
                </label>
                <div style={{ position: "relative" }}>
                  <input
                    type={showPass ? "text" : "password"}
                    value={senha}
                    onChange={(e) => setSenha(e.target.value)}
                    onFocus={() => setFocusSenha(true)}
                    onBlur={() => setFocusSenha(false)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                    style={{
                      width: "100%", padding: "13px 48px 13px 16px", borderRadius: 12,
                      background: "rgba(255,255,255,0.05)",
                      border: focusSenha ? "1.5px solid #10b981" : "1.5px solid rgba(255,255,255,0.1)",
                      boxShadow: focusSenha ? "0 0 0 3px rgba(16,185,129,0.15)" : "none",
                      color: "white", fontSize: 14, outline: "none",
                      transition: "all 0.2s",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(v => !v)}
                    style={{
                      position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)",
                      background: "none", border: "none", cursor: "pointer", padding: 4,
                      color: "rgba(255,255,255,0.35)", display: "flex", alignItems: "center",
                    }}
                  >
                    {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={loginMutation.isPending}
                style={{
                  width: "100%", padding: "14px 24px", borderRadius: 12,
                  background: loginMutation.isPending
                    ? "rgba(16,185,129,0.4)"
                    : "linear-gradient(135deg, #10b981, #059669)",
                  color: "white", fontWeight: 700, fontSize: 15,
                  border: "none", cursor: loginMutation.isPending ? "not-allowed" : "pointer",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
                  boxShadow: loginMutation.isPending ? "none" : "0 8px 24px rgba(16,185,129,0.4)",
                  transition: "all 0.2s", marginTop: 4,
                }}
                onMouseEnter={e => { if (!loginMutation.isPending) (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
              >
                {loginMutation.isPending ? (
                  <>
                    <div style={{ width: 16, height: 16, border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "white", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
                    Entrando...
                  </>
                ) : (
                  <>Entrar no painel <ArrowRight size={16} /></>
                )}
              </button>
            </form>

            {/* Security note */}
            <div style={{
              marginTop: 24, padding: "14px 16px", borderRadius: 12,
              background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.06)",
              display: "flex", alignItems: "flex-start", gap: 10,
            }}>
              <Lock size={14} color="rgba(16,185,129,0.7)" style={{ flexShrink: 0, marginTop: 1 }} />
              <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, lineHeight: 1.5 }}>
                Suas credenciais são protegidas com criptografia. Sessão expira automaticamente após inatividade.
              </p>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
}
