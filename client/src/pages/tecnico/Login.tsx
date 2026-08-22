import { useState, useEffect, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { Mail, Lock, Eye, EyeOff, ArrowRight, Wifi, Shield, Zap } from "lucide-react";

/* ─── Particle canvas for splash ─── */
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = ref.current; if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let raf: number;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener("resize", resize);
    const N = 60;
    const pts = Array.from({ length: N }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.4,
      vy: (Math.random() - 0.5) * 0.4,
      r: Math.random() * 1.5 + 0.5,
      a: Math.random() * 0.5 + 0.1,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      pts.forEach(p => {
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(45,212,191,${p.a})`;
        ctx.fill();
      });
      // draw lines between close particles
      for (let i = 0; i < pts.length; i++) {
        for (let j = i + 1; j < pts.length; j++) {
          const dx = pts[i].x - pts[j].x, dy = pts[i].y - pts[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 100) {
            ctx.beginPath();
            ctx.moveTo(pts[i].x, pts[i].y);
            ctx.lineTo(pts[j].x, pts[j].y);
            ctx.strokeStyle = `rgba(45,212,191,${0.08 * (1 - dist / 100)})`;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        }
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="absolute inset-0 w-full h-full" />;
}

/* ─── Animated logo rings ─── */
function LogoRings({ size = 96 }: { size?: number }) {
  return (
    <div className="relative flex items-center justify-center" style={{ width: size * 2, height: size * 2 }}>
      {[1.9, 1.5, 1.2].map((scale, i) => (
        <div key={i} className="absolute rounded-full border"
          style={{
            width: size * scale, height: size * scale,
            borderColor: `rgba(45,212,191,${0.08 + i * 0.04})`,
            animation: `ping-slow ${2 + i * 0.5}s ease-in-out infinite`,
            animationDelay: `${i * 0.3}s`,
          }} />
      ))}
      <div className="relative rounded-2xl overflow-hidden shadow-2xl"
        style={{
          width: size, height: size,
          boxShadow: "0 0 40px rgba(16,185,129,0.45), 0 0 80px rgba(6,182,212,0.18), 0 0 0 1px rgba(255,255,255,0.1)",
        }}>
        <img src="/manus-storage/netvionis-logo_1c60afaf.webp" alt="Netvius" className="w-full h-full object-cover" />
      </div>
    </div>
  );
}

/* ─── Splash Screen ─── */
function SplashScreen({ onDone }: { onDone: () => void }) {
  const [phase, setPhase] = useState(0); // 0=logo, 1=text, 2=bar, 3=fade

  useEffect(() => {
    const t1 = setTimeout(() => setPhase(1), 400);
    const t2 = setTimeout(() => setPhase(2), 900);
    const t3 = setTimeout(() => setPhase(3), 2000);
    const t4 = setTimeout(onDone, 2400);
    return () => [t1, t2, t3, t4].forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center overflow-hidden"
      style={{
        background: "linear-gradient(145deg, #020817 0%, #050d1f 40%, #0a1228 70%, #020817 100%)",
        transition: "opacity 0.4s ease",
        opacity: phase === 3 ? 0 : 1,
      }}>
      <ParticleCanvas />

      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)" }} />
      <div className="absolute bottom-1/4 left-1/4 w-64 h-64 rounded-full pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(6,182,212,0.08) 0%, transparent 70%)" }} />

      <div className="relative z-10 flex flex-col items-center">
        {/* Logo with rings */}
        <div style={{ opacity: phase >= 0 ? 1 : 0, transform: phase >= 0 ? "scale(1)" : "scale(0.5)", transition: "all 0.6s cubic-bezier(0.34,1.56,0.64,1)" }}>
          <LogoRings size={88} />
        </div>

        {/* Brand name */}
        <div className="mt-6 text-center"
          style={{ opacity: phase >= 1 ? 1 : 0, transform: phase >= 1 ? "translateY(0)" : "translateY(16px)", transition: "all 0.5s ease 0.1s" }}>
          <h1 className="text-3xl font-black text-white tracking-tight" style={{ letterSpacing: "-0.02em" }}>Netvius</h1>
          <div className="flex items-center justify-center gap-2 mt-2">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <p className="text-sm font-medium" style={{ color: "rgba(148,163,184,0.7)" }}>Central do Técnico de Campo</p>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" style={{ animationDelay: "0.5s" }} />
          </div>
        </div>

        {/* Feature pills */}
        <div className="flex gap-2 mt-5"
          style={{ opacity: phase >= 2 ? 1 : 0, transform: phase >= 2 ? "translateY(0)" : "translateY(8px)", transition: "all 0.4s ease 0.1s" }}>
          {[
            { icon: Wifi, label: "Online" },
            { icon: Shield, label: "Seguro" },
            { icon: Zap, label: "Rápido" },
          ].map(({ icon: Icon, label }) => (
            <div key={label} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
              style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <Icon className="w-3 h-3 text-emerald-400" />
              <span className="text-xs font-medium text-slate-300">{label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Loading bar */}
      <div className="absolute bottom-12 left-1/2 -translate-x-1/2 w-40"
        style={{ opacity: phase >= 2 ? 1 : 0, transition: "opacity 0.3s ease" }}>
        <div className="h-0.5 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <div className="h-full rounded-full"
            style={{
              background: "linear-gradient(90deg, #10b981, #14b8a6, #06b6d4)",
              animation: "splash-bar 1.5s ease-in-out forwards",
            }} />
        </div>
        <p className="text-center text-xs mt-2" style={{ color: "rgba(148,163,184,0.4)" }}>Carregando...</p>
      </div>

      <style>{`
        @keyframes ping-slow { 0%,100%{transform:scale(1);opacity:0.6} 50%{transform:scale(1.05);opacity:0.3} }
        @keyframes splash-bar { from{width:0%} to{width:100%} }
      `}</style>
    </div>
  );
}

/* ─── Floating label input ─── */
function FloatInput({
  id, label, type, value, onChange, icon: Icon, autoComplete, rightEl, focused, onFocus, onBlur,
}: {
  id: string; label: string; type: string; value: string;
  onChange: (v: string) => void; icon: typeof Mail;
  autoComplete?: string; rightEl?: React.ReactNode;
  focused: boolean; onFocus: () => void; onBlur: () => void;
}) {
  const active = focused || value.length > 0;
  return (
    <div className="relative">
      <div className="absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none z-10">
        <Icon className="w-4 h-4 transition-colors duration-200"
          style={{ color: focused ? "#60a5fa" : "rgba(148,163,184,0.45)" }} />
      </div>
      <label htmlFor={id}
        className="absolute left-11 pointer-events-none font-medium transition-all duration-200 z-10"
        style={{
          top: active ? "8px" : "50%",
          transform: active ? "translateY(0) scale(0.78)" : "translateY(-50%) scale(1)",
          transformOrigin: "left center",
          color: focused ? "rgba(96,165,250,0.9)" : "rgba(148,163,184,0.5)",
          fontSize: "14px",
        }}>
        {label}
      </label>
      <input
        id={id}
        type={type}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={onFocus}
        onBlur={onBlur}
        autoComplete={autoComplete}
        className="w-full pl-11 pr-12 rounded-2xl text-sm text-white outline-none transition-all duration-200"
        style={{
          paddingTop: active ? "22px" : "14px",
          paddingBottom: active ? "8px" : "14px",
          background: focused ? "rgba(59,130,246,0.07)" : "rgba(255,255,255,0.04)",
          border: focused ? "1.5px solid rgba(59,130,246,0.6)" : "1.5px solid rgba(255,255,255,0.07)",
          boxShadow: focused ? "0 0 0 4px rgba(59,130,246,0.08), inset 0 1px 0 rgba(255,255,255,0.04)" : "inset 0 1px 0 rgba(255,255,255,0.02)",
        }}
      />
      {rightEl && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2">{rightEl}</div>
      )}
    </div>
  );
}

/* ─── Main Login ─── */
export default function TecnicoLogin() {
  const [, navigate] = useLocation();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [showSenha, setShowSenha] = useState(false);
  const [erro, setErro] = useState("");
  const [showSplash, setShowSplash] = useState(true);
  const [focused, setFocused] = useState<"email" | "senha" | null>(null);
  const [loginSuccess, setLoginSuccess] = useState(false);

  const loginMutation = trpc.tecnicoAuth.login.useMutation({
    onSuccess: (data) => {
      if (data?.id) {
        setLoginSuccess(true);
        const isFirstLogin = !localStorage.getItem("tecnico_ever_logged");
        localStorage.setItem("tecnico_id", String(data.id));
        localStorage.setItem("tecnico_nome", data.nome);
        localStorage.setItem("tecnico_email", data.email);
        localStorage.setItem("tecnico", JSON.stringify(data));
        if (isFirstLogin) {
          localStorage.setItem("tecnico_ever_logged", "1");
          localStorage.setItem("tecnico_show_welcome", "1");
        }
        setTimeout(() => navigate("/tecnico"), 600);
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
    <div className="min-h-screen flex flex-col overflow-hidden"
      style={{ background: "linear-gradient(145deg, #020817 0%, #050d1f 50%, #020817 100%)" }}>
      <ParticleCanvas />

      {/* Glow blobs */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(16,185,129,0.1) 0%, transparent 70%)" }} />
        <div className="absolute top-1/2 -left-40 w-80 h-80 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 70%)" }} />
        <div className="absolute -bottom-20 right-1/3 w-72 h-72 rounded-full"
          style={{ background: "radial-gradient(circle, rgba(20,184,166,0.07) 0%, transparent 70%)" }} />
      </div>

      <div className="relative z-10 flex flex-col flex-1 items-center justify-between px-5 py-10">
        {/* Top: Logo */}
        <div className="flex flex-col items-center pt-6"
          style={{ animation: "fade-in-up 0.6s ease forwards" }}>
          <LogoRings size={72} />
          <div className="mt-5 text-center">
            <h1 className="text-2xl font-black text-white" style={{ letterSpacing: "-0.02em" }}>Netvius</h1>
            <div className="flex items-center justify-center gap-1.5 mt-1.5">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs font-medium" style={{ color: "rgba(148,163,184,0.6)" }}>Central de Operações</span>
            </div>
          </div>
        </div>

        {/* Middle: Form card */}
        <div className="w-full max-w-sm"
          style={{ animation: "fade-in-up 0.7s ease 0.15s both" }}>

          {/* Card */}
          <div className="rounded-3xl p-6 relative overflow-hidden"
            style={{
              background: "rgba(255,255,255,0.03)",
              border: "1px solid rgba(255,255,255,0.07)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.03)",
              backdropFilter: "blur(20px)",
            }}>

            {/* Card inner glow */}
            <div className="absolute top-0 left-0 right-0 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(16,185,129,0.3), transparent)" }} />

            <div className="mb-6">
              <h2 className="text-xl font-bold text-white" style={{ letterSpacing: "-0.01em" }}>Acesso ao sistema</h2>
              <p className="text-sm mt-1" style={{ color: "rgba(148,163,184,0.55)" }}>Entre com suas credenciais de técnico</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <FloatInput
                id="email" label="E-mail profissional" type="email"
                value={email} onChange={setEmail} icon={Mail}
                autoComplete="email"
                focused={focused === "email"}
                onFocus={() => setFocused("email")}
                onBlur={() => setFocused(null)}
              />
              <FloatInput
                id="senha" label="Senha" type={showSenha ? "text" : "password"}
                value={senha} onChange={setSenha} icon={Lock}
                autoComplete="current-password"
                focused={focused === "senha"}
                onFocus={() => setFocused("senha")}
                onBlur={() => setFocused(null)}
                rightEl={
                  <button type="button" onClick={() => setShowSenha(!showSenha)}
                    className="p-1 rounded-lg transition-colors"
                    style={{ color: "rgba(148,163,184,0.5)" }}>
                    {showSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                }
              />

              {erro && (
                <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#fca5a5" }}>
                  <div className="w-2 h-2 rounded-full bg-red-400 flex-shrink-0 animate-pulse" />
                  {erro}
                </div>
              )}

              <button type="submit"
                disabled={loginMutation.isPending || loginSuccess}
                className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl font-bold text-sm text-white transition-all active:scale-[0.97] mt-2 relative overflow-hidden"
                style={{
                  background: loginSuccess
                    ? "linear-gradient(135deg, #047857, #10b981)"
                  : loginMutation.isPending
                    ? "rgba(16,185,129,0.3)"
                    : "linear-gradient(135deg, #047857 0%, #10b981 52%, #06b6d4 100%)",
                  boxShadow: loginMutation.isPending || loginSuccess ? "none" : "0 8px 32px rgba(16,185,129,0.28), 0 0 0 1px rgba(255,255,255,0.05)",
                }}>
                {/* Shimmer effect */}
                {!loginMutation.isPending && !loginSuccess && (
                  <div className="absolute inset-0 pointer-events-none"
                    style={{ background: "linear-gradient(105deg, transparent 40%, rgba(255,255,255,0.08) 50%, transparent 60%)", animation: "shimmer 2.5s infinite" }} />
                )}
                {loginSuccess ? (
                  <><div className="w-4 h-4 border-2 border-white/50 border-t-white rounded-full animate-spin" /> Redirecionando...</>
                ) : loginMutation.isPending ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Verificando...</>
                ) : (
                  <>Entrar no sistema <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
            </form>

            {/* Security badge */}
            <div className="flex items-center justify-center gap-1.5 mt-4">
              <Shield className="w-3 h-3" style={{ color: "rgba(148,163,184,0.3)" }} />
              <span className="text-xs" style={{ color: "rgba(148,163,184,0.3)" }}>Conexão segura e criptografada</span>
            </div>
          </div>
        </div>

        {/* Bottom: footer */}
        <div className="text-center" style={{ animation: "fade-in-up 0.7s ease 0.3s both" }}>
          <p className="text-xs" style={{ color: "rgba(148,163,184,0.25)" }}>
            Netvius Tecnologia © {new Date().getFullYear()} · v5.0
          </p>
        </div>
      </div>

      <style>{`
        @keyframes ping-slow { 0%,100%{transform:scale(1);opacity:0.5} 50%{transform:scale(1.06);opacity:0.25} }
        @keyframes shimmer { 0%{transform:translateX(-100%)} 100%{transform:translateX(200%)} }
        @keyframes fade-in-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
    </div>
  );
}
