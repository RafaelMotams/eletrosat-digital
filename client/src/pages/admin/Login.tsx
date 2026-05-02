import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import { useLocation } from "wouter";
import { Eye, EyeOff, Wifi, ArrowRight, Shield, Zap, BarChart3 } from "lucide-react";

const features = [
  { icon: BarChart3, label: "Dashboard em tempo real", desc: "KPIs e métricas atualizados automaticamente" },
  { icon: Zap, label: "Gestão de OS ágil", desc: "Atribua e acompanhe ordens de serviço com facilidade" },
  { icon: Shield, label: "Isolamento por tenant", desc: "Dados seguros e separados por empresa" },
];

export default function AdminLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

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
    <div className="min-h-screen flex" style={{ background: "oklch(0.07 0.035 240)" }}>
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-[480px] flex-shrink-0 p-12 relative overflow-hidden"
        style={{ background: "linear-gradient(160deg, oklch(0.11 0.055 240) 0%, oklch(0.09 0.04 250) 100%)", borderRight: "1px solid oklch(0.18 0.05 240)" }}>
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full opacity-10"
            style={{ background: "radial-gradient(circle, oklch(0.50 0.18 162), transparent)" }} />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 rounded-full opacity-8"
            style={{ background: "radial-gradient(circle, oklch(0.40 0.18 240), transparent)" }} />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-16">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, oklch(0.40 0.18 162), oklch(0.55 0.22 162))", boxShadow: "0 0 30px oklch(0.50 0.18 162 / 0.35)" }}>
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-white font-black text-xl tracking-tight">Netvionis</p>
              <p className="text-xs" style={{ color: "oklch(0.50 0.04 240)" }}>Plataforma de Gestão</p>
            </div>
          </div>
          <div style={{ transition: "all 0.7s", opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(16px)" }}>
            <h1 className="text-4xl font-black text-white leading-tight mb-4">
              Gerencie sua equipe com
              <span className="block" style={{ color: "oklch(0.60 0.20 162)" }}>inteligência</span>
            </h1>
            <p className="text-base leading-relaxed" style={{ color: "oklch(0.55 0.04 240)" }}>
              Controle instalações, acompanhe técnicos e visualize o progresso de cada escola em tempo real.
            </p>
          </div>
        </div>
        <div className="relative z-10 space-y-4">
          {features.map((f, i) => {
            const Icon = f.icon;
            return (
              <div key={i} className="flex items-start gap-4 p-4 rounded-2xl"
                style={{
                  background: "oklch(0.14 0.05 240 / 0.6)",
                  border: "1px solid oklch(0.20 0.05 240)",
                  transition: "all 0.7s",
                  transitionDelay: `${i * 100 + 200}ms`,
                  opacity: mounted ? 1 : 0,
                  transform: mounted ? "translateX(0)" : "translateX(-16px)",
                }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "oklch(0.50 0.18 162 / 0.15)" }}>
                  <Icon className="w-4 h-4" style={{ color: "oklch(0.60 0.20 162)" }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-white">{f.label}</p>
                  <p className="text-xs mt-0.5" style={{ color: "oklch(0.50 0.04 240)" }}>{f.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
        <p className="relative z-10 text-xs" style={{ color: "oklch(0.38 0.04 240)" }}>
          © 2026 Netvionis · Todos os direitos reservados
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-6 lg:p-12">
        <div className="w-full max-w-md" style={{ transition: "all 0.5s", opacity: mounted ? 1 : 0, transform: mounted ? "translateY(0)" : "translateY(24px)" }}>
          <div className="lg:hidden flex items-center gap-3 mb-10">
            <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, oklch(0.40 0.18 162), oklch(0.55 0.22 162))" }}>
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <p className="text-white font-black text-xl">Netvionis</p>
          </div>
          <div className="mb-8">
            <h2 className="text-3xl font-black text-white mb-2">Bem-vindo de volta</h2>
            <p className="text-sm" style={{ color: "oklch(0.55 0.04 240)" }}>
              Entre com suas credenciais para acessar o painel
            </p>
          </div>
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "oklch(0.72 0.04 240)" }}>Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                autoComplete="email"
                className="w-full px-4 py-3.5 rounded-xl text-white placeholder-gray-600 outline-none transition-all text-sm"
                style={{ background: "oklch(0.13 0.05 240)", border: "1.5px solid oklch(0.22 0.05 240)" }}
                onFocus={e => { e.target.style.borderColor = "oklch(0.50 0.18 162)"; e.target.style.boxShadow = "0 0 0 3px oklch(0.50 0.18 162 / 0.15)"; }}
                onBlur={e => { e.target.style.borderColor = "oklch(0.22 0.05 240)"; e.target.style.boxShadow = "none"; }}
              />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-2" style={{ color: "oklch(0.72 0.04 240)" }}>Senha</label>
              <div className="relative">
                <input
                  type={showPass ? "text" : "password"}
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full px-4 py-3.5 pr-12 rounded-xl text-white placeholder-gray-600 outline-none transition-all text-sm"
                  style={{ background: "oklch(0.13 0.05 240)", border: "1.5px solid oklch(0.22 0.05 240)" }}
                  onFocus={e => { e.target.style.borderColor = "oklch(0.50 0.18 162)"; e.target.style.boxShadow = "0 0 0 3px oklch(0.50 0.18 162 / 0.15)"; }}
                  onBlur={e => { e.target.style.borderColor = "oklch(0.22 0.05 240)"; e.target.style.boxShadow = "none"; }}
                />
                <button type="button" onClick={() => setShowPass(v => !v)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 p-1 rounded-lg hover:bg-white/10 transition-colors"
                  style={{ color: "oklch(0.50 0.04 240)" }}>
                  {showPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              disabled={loginMutation.isPending}
              className="w-full py-3.5 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all mt-2"
              style={{
                background: loginMutation.isPending ? "oklch(0.40 0.18 162 / 0.5)" : "linear-gradient(135deg, oklch(0.40 0.18 162), oklch(0.52 0.20 162))",
                boxShadow: loginMutation.isPending ? "none" : "0 4px 20px oklch(0.50 0.18 162 / 0.35)",
              }}>
              {loginMutation.isPending ? (
                <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Entrando...</>
              ) : (
                <>Entrar no painel<ArrowRight className="w-4 h-4" /></>
              )}
            </button>
          </form>
          <div className="mt-8 p-4 rounded-2xl" style={{ background: "oklch(0.12 0.04 240)", border: "1px solid oklch(0.18 0.05 240)" }}>
            <div className="flex items-center gap-2 mb-1">
              <Shield className="w-3.5 h-3.5" style={{ color: "oklch(0.50 0.18 162)" }} />
              <p className="text-xs font-semibold" style={{ color: "oklch(0.60 0.04 240)" }}>Acesso seguro</p>
            </div>
            <p className="text-xs" style={{ color: "oklch(0.45 0.04 240)" }}>
              Suas credenciais são protegidas com criptografia de ponta a ponta. Sessão expira automaticamente após inatividade.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
