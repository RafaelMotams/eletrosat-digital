import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import {
  Wifi, BarChart3, Shield, MapPin, Smartphone, CheckCircle,
  ArrowRight, Zap, Users, FileText, Globe, Star, ChevronRight,
  Activity, TrendingUp, Clock, Lock
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

/* ── Animated counter ─────────────────────────────────────────────────────── */
function Counter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      let start = 0;
      const step = Math.ceil(to / 60);
      const timer = setInterval(() => {
        start = Math.min(start + step, to);
        setVal(start);
        if (start >= to) clearInterval(timer);
      }, 16);
    }, { threshold: 0.5 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to]);
  return <span ref={ref}>{val.toLocaleString("pt-BR")}{suffix}</span>;
}

/* ── Floating particle ────────────────────────────────────────────────────── */
function Particle({ style }: { style: React.CSSProperties }) {
  return <div className="absolute rounded-full pointer-events-none" style={style} />;
}

export default function Home() {
  const { isAuthenticated } = useAuth();
  const [, navigate] = useLocation();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const features = [
    {
      icon: BarChart3,
      title: "Dashboard em tempo real",
      desc: "KPIs, produtividade e status de todas as escolas em um único painel visual.",
      color: "#10b981",
      bg: "rgba(16,185,129,0.08)",
    },
    {
      icon: Users,
      title: "Gestão de técnicos",
      desc: "Atribuição automática por cidade ou manual por escola com controle total.",
      color: "#6366f1",
      bg: "rgba(99,102,241,0.08)",
    },
    {
      icon: MapPin,
      title: "Mapa interativo",
      desc: "Visualize todas as escolas com marcadores coloridos por status de instalação.",
      color: "#f59e0b",
      bg: "rgba(245,158,11,0.08)",
    },
    {
      icon: FileText,
      title: "Ordens de Serviço",
      desc: "Criação automática ao concluir instalação com histórico completo.",
      color: "#3b82f6",
      bg: "rgba(59,130,246,0.08)",
    },
    {
      icon: Smartphone,
      title: "App do técnico",
      desc: "WhatsApp, Google Maps e conclusão de OS diretamente no campo.",
      color: "#ec4899",
      bg: "rgba(236,72,153,0.08)",
    },
    {
      icon: TrendingUp,
      title: "Relatórios avançados",
      desc: "Filtros por técnico e período, ranking de desempenho e exportação Excel.",
      color: "#14b8a6",
      bg: "rgba(20,184,166,0.08)",
    },
  ];

  const stats = [
    { value: 5000, suffix: "+", label: "Escolas gerenciadas" },
    { value: 98, suffix: "%", label: "Uptime garantido" },
    { value: 120, suffix: "+", label: "Técnicos ativos" },
    { value: 15000, suffix: "+", label: "OS concluídas" },
  ];

  const steps = [
    { num: "01", title: "Cadastre as escolas", desc: "Importe via planilha ou adicione manualmente com todos os dados." },
    { num: "02", title: "Atribua técnicos", desc: "Atribuição automática por cidade ou manual por escola." },
    { num: "03", title: "Técnico executa no campo", desc: "App offline com sincronização automática ao reconectar." },
    { num: "04", title: "Acompanhe em tempo real", desc: "Dashboard, mapa e relatórios atualizados instantaneamente." },
  ];

  return (
    <div className="min-h-screen" style={{ background: "#060d1f", fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif" }}>

      {/* ── Particles background ── */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
        <Particle style={{ width: 400, height: 400, top: "-10%", left: "-5%", background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)" }} />
        <Particle style={{ width: 600, height: 600, top: "20%", right: "-15%", background: "radial-gradient(circle, rgba(99,102,241,0.10) 0%, transparent 70%)" }} />
        <Particle style={{ width: 300, height: 300, bottom: "10%", left: "20%", background: "radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)" }} />
        {/* Grid lines */}
        <div style={{
          position: "absolute", inset: 0,
          backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "60px 60px",
        }} />
      </div>

      {/* ── Header ── */}
      <header
        className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(6,13,31,0.92)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}
      >
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: "linear-gradient(135deg, #10b981, #059669)",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 0 20px rgba(16,185,129,0.4)",
            }}>
              <Wifi size={20} color="white" />
            </div>
            <div>
              <p style={{ color: "white", fontWeight: 800, fontSize: 18, lineHeight: 1.1, fontFamily: "'Outfit', sans-serif" }}>Netvius</p>
              <p style={{ color: "rgba(16,185,129,0.8)", fontSize: 10, fontWeight: 500 }}>Gestão inteligente</p>
            </div>
          </div>

          {/* Nav */}
          <nav className="hidden md:flex items-center gap-8">
            {["Funcionalidades", "Como funciona", "Estatísticas"].map(item => (
              <a key={item} href={`#${item.toLowerCase().replace(" ", "-")}`}
                style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, fontWeight: 500, textDecoration: "none", transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "white")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.6)")}
              >{item}</a>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/tecnico/login")}
              style={{
                padding: "8px 16px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.12)",
                background: "rgba(255,255,255,0.05)", color: "rgba(255,255,255,0.8)",
                fontSize: 13, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.color = "white"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.8)"; }}
            >
              <Smartphone size={14} />
              App Técnico
            </button>
            <button
              onClick={() => isAuthenticated ? navigate("/admin") : (window.location.href = getLoginUrl())}
              style={{
                padding: "8px 20px", borderRadius: 10,
                background: "linear-gradient(135deg, #10b981, #059669)",
                color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer",
                boxShadow: "0 4px 15px rgba(16,185,129,0.35)",
                border: "none", display: "flex", alignItems: "center", gap: 6,
                transition: "all 0.2s",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-1px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 6px 20px rgba(16,185,129,0.5)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 4px 15px rgba(16,185,129,0.35)"; }}
            >
              Painel Admin
            </button>
          </div>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className="relative z-10 min-h-screen flex flex-col items-center justify-center px-6 pt-24 pb-16 text-center">
        {/* Badge */}
        <div style={{
          display: "inline-flex", alignItems: "center", gap: 8,
          background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.25)",
          borderRadius: 100, padding: "6px 16px", marginBottom: 32,
        }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#10b981", animation: "pulse 2s infinite" }} />
          <span style={{ color: "#10b981", fontSize: 13, fontWeight: 600 }}>Sistema online · Sincronização em tempo real</span>
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: "clamp(2.5rem, 6vw, 5rem)", fontWeight: 800, lineHeight: 1.1,
          color: "white", maxWidth: 800, marginBottom: 24,
          fontFamily: "'Outfit', sans-serif",
        }}>
          Gestão completa de{" "}
          <span style={{
            background: "linear-gradient(135deg, #10b981, #34d399, #6ee7b7)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
          }}>
            instalações de rede
          </span>{" "}
          em escolas
        </h1>

        {/* Subtitle */}
        <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "clamp(1rem, 2vw, 1.2rem)", maxWidth: 600, marginBottom: 48, lineHeight: 1.7 }}>
          Controle total de técnicos, escolas e ordens de serviço. Atribuição inteligente,
          relatórios de desempenho e sincronização em tempo real entre o painel e o app do técnico.
        </p>

        {/* CTAs */}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", justifyContent: "center", marginBottom: 80 }}>
          <button
            onClick={() => isAuthenticated ? navigate("/admin") : (window.location.href = getLoginUrl())}
            style={{
              padding: "16px 36px", borderRadius: 14,
              background: "linear-gradient(135deg, #10b981, #059669)",
              color: "white", fontSize: 16, fontWeight: 700, cursor: "pointer",
              boxShadow: "0 8px 30px rgba(16,185,129,0.4)",
              border: "none", display: "flex", alignItems: "center", gap: 8,
              transition: "all 0.3s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 12px 40px rgba(16,185,129,0.55)"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; (e.currentTarget as HTMLElement).style.boxShadow = "0 8px 30px rgba(16,185,129,0.4)"; }}
          >
            Acessar Painel Admin
            <ArrowRight size={18} />
          </button>
          <button
            onClick={() => navigate("/tecnico/login")}
            style={{
              padding: "16px 36px", borderRadius: 14,
              background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.12)",
              color: "rgba(255,255,255,0.85)", fontSize: 16, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
              transition: "all 0.3s",
            }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; (e.currentTarget as HTMLElement).style.color = "white"; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.05)"; (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.85)"; }}
          >
            <Smartphone size={18} />
            App do Técnico
          </button>
        </div>

        {/* Dashboard preview mockup */}
        <div style={{
          width: "100%", maxWidth: 900,
          background: "rgba(255,255,255,0.03)",
          border: "1px solid rgba(255,255,255,0.08)",
          borderRadius: 20, padding: 3,
          boxShadow: "0 40px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.05)",
        }}>
          {/* Browser bar */}
          <div style={{
            background: "rgba(255,255,255,0.04)", borderRadius: "17px 17px 0 0",
            padding: "10px 16px", display: "flex", alignItems: "center", gap: 8,
            borderBottom: "1px solid rgba(255,255,255,0.06)",
          }}>
            <div style={{ display: "flex", gap: 6 }}>
              {["#ff5f57","#febc2e","#28c840"].map(c => (
                <div key={c} style={{ width: 10, height: 10, borderRadius: "50%", background: c }} />
              ))}
            </div>
            <div style={{
              flex: 1, background: "rgba(255,255,255,0.05)", borderRadius: 6,
              padding: "4px 12px", fontSize: 11, color: "rgba(255,255,255,0.3)",
              display: "flex", alignItems: "center", gap: 6,
            }}>
              <Lock size={9} />
              netvionis.manus.space/admin
            </div>
          </div>
          {/* Dashboard preview */}
          <div style={{ padding: "20px 20px 16px", display: "flex", gap: 12 }}>
            {/* Sidebar mini */}
            <div style={{
              width: 44, background: "rgba(6,13,31,0.8)", borderRadius: 10,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "12px 0",
            }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: "linear-gradient(135deg, #10b981, #059669)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <Wifi size={14} color="white" />
              </div>
              {[BarChart3, Users, MapPin, FileText, TrendingUp].map((Icon, i) => (
                <div key={i} style={{ width: 28, height: 28, borderRadius: 7, background: i === 0 ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.04)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Icon size={13} color={i === 0 ? "#10b981" : "rgba(255,255,255,0.3)"} />
                </div>
              ))}
            </div>
            {/* Main content */}
            <div style={{ flex: 1 }}>
              {/* KPI cards */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 12 }}>
                {[
                  { label: "Escolas", val: "1.248", color: "#10b981" },
                  { label: "Técnicos", val: "24", color: "#6366f1" },
                  { label: "OS Hoje", val: "18", color: "#f59e0b" },
                  { label: "APs", val: "3.420", color: "#3b82f6" },
                ].map(k => (
                  <div key={k.label} style={{
                    background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 12px",
                    border: "1px solid rgba(255,255,255,0.06)",
                  }}>
                    <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 9, marginBottom: 4 }}>{k.label}</p>
                    <p style={{ color: k.color, fontSize: 16, fontWeight: 800, fontFamily: "'Outfit', sans-serif" }}>{k.val}</p>
                  </div>
                ))}
              </div>
              {/* Chart placeholder */}
              <div style={{
                background: "rgba(255,255,255,0.03)", borderRadius: 8, padding: "12px 14px",
                border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "flex-end", gap: 4, height: 80,
              }}>
                {[40, 65, 45, 80, 55, 90, 70, 85, 60, 95, 75, 88].map((h, i) => (
                  <div key={i} style={{
                    flex: 1, borderRadius: "3px 3px 0 0",
                    background: i === 10 ? "linear-gradient(180deg, #10b981, #059669)" : "rgba(16,185,129,0.2)",
                    height: `${h}%`,
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats ── */}
      <section id="estatísticas" className="relative z-10 py-20 px-6">
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{
            display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 1,
            background: "rgba(255,255,255,0.06)", borderRadius: 20, overflow: "hidden",
            border: "1px solid rgba(255,255,255,0.08)",
          }}>
            {stats.map((s, i) => (
              <div key={i} style={{
                padding: "36px 24px", textAlign: "center",
                background: "rgba(6,13,31,0.95)",
              }}>
                <p style={{
                  fontSize: "clamp(2rem, 4vw, 2.8rem)", fontWeight: 800, color: "white",
                  fontFamily: "'Outfit', sans-serif", lineHeight: 1,
                  background: "linear-gradient(135deg, #10b981, #34d399)",
                  WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
                }}>
                  <Counter to={s.value} suffix={s.suffix} />
                </p>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 13, marginTop: 8, fontWeight: 500 }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section id="funcionalidades" className="relative z-10 py-20 px-6">
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <div style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: "rgba(99,102,241,0.1)", border: "1px solid rgba(99,102,241,0.2)",
              borderRadius: 100, padding: "6px 16px", marginBottom: 20,
            }}>
              <Zap size={13} color="#6366f1" />
              <span style={{ color: "#818cf8", fontSize: 13, fontWeight: 600 }}>Funcionalidades completas</span>
            </div>
            <h2 style={{
              fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 800, color: "white",
              fontFamily: "'Outfit', sans-serif", marginBottom: 16,
            }}>
              Tudo que você precisa em um só lugar
            </h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 16, maxWidth: 500, margin: "0 auto" }}>
              Do cadastro das escolas à conclusão das instalações, com relatórios e pagamentos automáticos.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20 }}>
            {features.map((f, i) => (
              <div
                key={i}
                style={{
                  background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                  borderRadius: 16, padding: "28px 28px", cursor: "default",
                  transition: "all 0.3s",
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)";
                  (e.currentTarget as HTMLElement).style.borderColor = `${f.color}30`;
                  (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 20px 40px rgba(0,0,0,0.3), 0 0 0 1px ${f.color}20`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                  (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                  (e.currentTarget as HTMLElement).style.transform = "";
                  (e.currentTarget as HTMLElement).style.boxShadow = "";
                }}
              >
                <div style={{
                  width: 48, height: 48, borderRadius: 12, background: f.bg,
                  border: `1px solid ${f.color}25`, display: "flex", alignItems: "center", justifyContent: "center",
                  marginBottom: 20,
                }}>
                  <f.icon size={22} color={f.color} />
                </div>
                <h3 style={{ color: "white", fontWeight: 700, fontSize: 16, marginBottom: 10, fontFamily: "'Outfit', sans-serif" }}>
                  {f.title}
                </h3>
                <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, lineHeight: 1.6 }}>{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── How it works ── */}
      <section id="como-funciona" className="relative z-10 py-20 px-6">
        <div style={{ maxWidth: 900, margin: "0 auto" }}>
          <div style={{ textAlign: "center", marginBottom: 64 }}>
            <h2 style={{
              fontSize: "clamp(1.8rem, 4vw, 3rem)", fontWeight: 800, color: "white",
              fontFamily: "'Outfit', sans-serif", marginBottom: 16,
            }}>
              Como funciona
            </h2>
            <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 16 }}>
              Em 4 passos simples, do cadastro à conclusão.
            </p>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 24 }}>
            {steps.map((s, i) => (
              <div key={i} style={{ position: "relative" }}>
                {i < steps.length - 1 && (
                  <div style={{
                    position: "absolute", top: 24, left: "calc(50% + 40px)",
                    width: "calc(100% - 80px)", height: 1,
                    background: "linear-gradient(90deg, rgba(16,185,129,0.4), rgba(16,185,129,0.1))",
                    display: "none",
                  }} className="hidden lg:block" />
                )}
                <div style={{ textAlign: "center" }}>
                  <div style={{
                    width: 48, height: 48, borderRadius: "50%", margin: "0 auto 16px",
                    background: "linear-gradient(135deg, rgba(16,185,129,0.2), rgba(16,185,129,0.05))",
                    border: "1px solid rgba(16,185,129,0.3)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 14, fontWeight: 800, color: "#10b981", fontFamily: "'Outfit', sans-serif",
                  }}>
                    {s.num}
                  </div>
                  <h3 style={{ color: "white", fontWeight: 700, fontSize: 15, marginBottom: 8 }}>{s.title}</h3>
                  <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, lineHeight: 1.6 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ── */}
      <section className="relative z-10 py-24 px-6">
        <div style={{ maxWidth: 700, margin: "0 auto", textAlign: "center" }}>
          <div style={{
            background: "linear-gradient(135deg, rgba(16,185,129,0.1), rgba(99,102,241,0.1))",
            border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: "56px 40px",
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", top: -60, right: -60, width: 200, height: 200,
              background: "radial-gradient(circle, rgba(16,185,129,0.15) 0%, transparent 70%)",
            }} />
            <div style={{
              position: "absolute", bottom: -60, left: -60, width: 200, height: 200,
              background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
            }} />
            <div style={{ position: "relative" }}>
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 6,
                background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)",
                borderRadius: 100, padding: "5px 14px", marginBottom: 24,
              }}>
                <Star size={12} color="#10b981" fill="#10b981" />
                <span style={{ color: "#10b981", fontSize: 12, fontWeight: 600 }}>Pronto para começar?</span>
              </div>
              <h2 style={{
                fontSize: "clamp(1.6rem, 4vw, 2.4rem)", fontWeight: 800, color: "white",
                fontFamily: "'Outfit', sans-serif", marginBottom: 16,
              }}>
                Gerencie suas instalações com total controle
              </h2>
              <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 15, marginBottom: 36, lineHeight: 1.7 }}>
                Acesse o painel administrativo ou baixe o app para técnicos e comece agora mesmo.
              </p>
              <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
                <button
                  onClick={() => isAuthenticated ? navigate("/admin") : (window.location.href = getLoginUrl())}
                  style={{
                    padding: "14px 32px", borderRadius: 12,
                    background: "linear-gradient(135deg, #10b981, #059669)",
                    color: "white", fontSize: 15, fontWeight: 700, cursor: "pointer",
                    boxShadow: "0 8px 25px rgba(16,185,129,0.4)", border: "none",
                    display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = ""; }}
                >
                  Acessar Painel Admin <ArrowRight size={16} />
                </button>
                <button
                  onClick={() => navigate("/tecnico/login")}
                  style={{
                    padding: "14px 32px", borderRadius: 12,
                    background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)",
                    color: "rgba(255,255,255,0.8)", fontSize: 15, fontWeight: 600, cursor: "pointer",
                    display: "flex", alignItems: "center", gap: 8, transition: "all 0.2s",
                  }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}
                >
                  <Smartphone size={16} /> App do Técnico
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer style={{
        borderTop: "1px solid rgba(255,255,255,0.06)", padding: "24px 24px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        flexWrap: "wrap", gap: 12, position: "relative", zIndex: 10,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <div style={{
            width: 28, height: 28, borderRadius: 8,
            background: "linear-gradient(135deg, #10b981, #059669)",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}>
            <Wifi size={14} color="white" />
          </div>
          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, fontWeight: 500 }}>
            Netvius © {new Date().getFullYear()}
          </span>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <Activity size={12} color="#10b981" />
          <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>Todos os sistemas operacionais</span>
        </div>
      </footer>

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.4; }
        }
      `}</style>
    </div>
  );
}
