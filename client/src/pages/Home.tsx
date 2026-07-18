import { useEffect, useRef, useState } from "react";
import {
  Wifi, BarChart3, MapPin, Smartphone, CheckCircle, ArrowRight,
  Zap, Users, FileText, Shield, Star, MessageCircle, Download,
  ChevronDown, TrendingUp, Globe, Lock, Menu, X
} from "lucide-react";

/* ── Animated counter ─────────────────────────────────────────────────────── */
function Counter({ to, suffix = "", prefix = "" }: { to: number; suffix?: string; prefix?: string }) {
  const [val, setVal] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const started = useRef(false);
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting || started.current) return;
      started.current = true;
      observer.disconnect();
      let start = 0;
      const duration = 1800;
      const step = to / (duration / 16);
      const timer = setInterval(() => {
        start = Math.min(start + step, to);
        setVal(Math.floor(start));
        if (start >= to) clearInterval(timer);
      }, 16);
    }, { threshold: 0.3 });
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, [to]);
  return <span ref={ref}>{prefix}{val.toLocaleString("pt-BR")}{suffix}</span>;
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const whatsappLink = "https://wa.me/5575999142134?text=Ol%C3%A1!%20Tenho%20interesse%20no%20sistema%20Netvius.";

  const features = [
    {
      icon: BarChart3,
      title: "Dashboard em tempo real",
      desc: "KPIs, produtividade e status de todas as escolas em um único painel visual.",
      gradient: "linear-gradient(135deg, #00f5a0, #00d9f5)",
    },
    {
      icon: Smartphone,
      title: "App nativo para técnicos",
      desc: "App Android com modo offline, GPS, fotos, WhatsApp integrado e sincronização automática.",
      gradient: "linear-gradient(135deg, #a78bfa, #7c3aed)",
    },
    {
      icon: MapPin,
      title: "Mapa interativo",
      desc: "Visualize todas as escolas no mapa com status colorido e roteirização automática por GPS.",
      gradient: "linear-gradient(135deg, #f59e0b, #ef4444)",
    },
    {
      icon: FileText,
      title: "Ordens de Serviço",
      desc: "Criação automática, fotos obrigatórias, upload para Google Drive e relatório em Excel.",
      gradient: "linear-gradient(135deg, #60a5fa, #3b82f6)",
    },
    {
      icon: Users,
      title: "Gestão de técnicos",
      desc: "Atribuição automática por cidade ou manual por escola. Tabela de valores por AP instalado.",
      gradient: "linear-gradient(135deg, #34d399, #10b981)",
    },
    {
      icon: Shield,
      title: "Multi-empresa seguro",
      desc: "Cada revendedor tem sua base de dados 100% isolada. Sem interferência entre clientes.",
      gradient: "linear-gradient(135deg, #f472b6, #ec4899)",
    },
  ];

  const steps = [
    { num: "01", title: "Você adquire a licença", desc: "Acesso imediato ao painel de revenda com sua marca." },
    { num: "02", title: "Cria o cliente em segundos", desc: "Defina email e senha — o painel do cliente está pronto." },
    { num: "03", title: "Cliente gerencia sua equipe", desc: "Técnicos baixam o app e começam a trabalhar no dia." },
    { num: "04", title: "Você escala sem limites", desc: "100 clientes, 100 bases separadas, zero conflito." },
  ];

  const testimonials = [
    { name: "Marcos Oliveira", role: "Gestor de TI — Bahia", text: "Antes levávamos semanas para saber quantas escolas estavam concluídas. Com a Netvius, vejo em tempo real.", stars: 5 },
    { name: "Ana Paula Costa", role: "Coordenadora de Projetos", text: "O app do técnico é incrível. Funciona offline, tira foto, manda pro Drive. Nossos técnicos adoraram.", stars: 5 },
    { name: "Roberto Mendes", role: "Revendedor Netvius", text: "Vendo o sistema para 12 empresas diferentes. Cada uma com seus dados isolados. Nunca tive problema.", stars: 5 },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#050b18", fontFamily: "'Inter', sans-serif" }}>

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(5,11,24,0.96)" : "transparent",
          backdropFilter: scrolled ? "blur(20px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)" }}>
              <Wifi size={16} className="text-black" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-black text-white tracking-tight">Netvius</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {[["Funcionalidades","#funcionalidades"],["Como funciona","#como-funciona"],["Planos","#planos"],["Contato","#contato"]].map(([label, href]) => (
              <a key={label} href={href}
                className="text-sm font-medium transition-colors"
                style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "white")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>
                {label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href="/admin/login"
              className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}>
              Painel Admin
            </a>
            <a href={whatsappLink} target="_blank" rel="noreferrer"
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
              style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)", color: "#050b18", textDecoration: "none" }}>
              <MessageCircle size={14} /> WhatsApp
            </a>
          </div>

          <button className="md:hidden text-white" onClick={() => setMobileMenu(m => !m)}>
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden px-6 py-4 flex flex-col gap-3 border-t"
            style={{ background: "rgba(5,11,24,0.98)", borderColor: "rgba(255,255,255,0.08)" }}>
            {[["Funcionalidades","#funcionalidades"],["Como funciona","#como-funciona"],["Planos","#planos"],["Contato","#contato"]].map(([label, href]) => (
              <a key={label} href={href} className="text-sm font-medium py-2" style={{ color: "rgba(255,255,255,0.7)", textDecoration: "none" }}
                onClick={() => setMobileMenu(false)}>{label}</a>
            ))}
            <a href="/admin/login" className="text-sm font-semibold py-2 text-white" style={{ textDecoration: "none" }}>Painel Admin</a>
            <a href={whatsappLink} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold text-center justify-center"
              style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)", color: "#050b18", textDecoration: "none" }}>
              <MessageCircle size={14} /> Falar no WhatsApp
            </a>
          </div>
        )}
      </nav>

      {/* ── HERO ── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background */}
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
        <div className="absolute pointer-events-none" style={{ width: 700, height: 700, top: "-15%", left: "-20%", background: "radial-gradient(circle, rgba(0,245,160,0.07) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div className="absolute pointer-events-none" style={{ width: 600, height: 600, bottom: "-15%", right: "-15%", background: "radial-gradient(circle, rgba(0,217,245,0.06) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div className="absolute pointer-events-none" style={{ width: 400, height: 400, top: "35%", left: "55%", background: "radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)", borderRadius: "50%" }} />

        <div className="relative z-10 max-w-5xl mx-auto px-6 text-center pt-28 pb-20">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
            style={{ background: "rgba(0,245,160,0.08)", border: "1px solid rgba(0,245,160,0.2)" }}>
            <span className="w-2 h-2 rounded-full" style={{ background: "#00f5a0", animation: "pulse 2s infinite" }} />
            <span className="text-xs font-semibold" style={{ color: "#00f5a0" }}>
              Sistema online · Sincronização em tempo real
            </span>
          </div>

          {/* Headline */}
          <h1 className="text-5xl md:text-7xl font-black text-white leading-tight mb-6 tracking-tight">
            Gerencie instalações<br />
            <span style={{
              background: "linear-gradient(135deg, #00f5a0 0%, #00d9f5 50%, #a78bfa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              de rede escolar
            </span><br />
            com precisão total
          </h1>

          {/* Subheadline — copy de vendas */}
          <p className="text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed"
            style={{ color: "rgba(255,255,255,0.5)" }}>
            A plataforma que transforma o caos das instalações em{" "}
            <strong style={{ color: "rgba(255,255,255,0.85)", fontWeight: 700 }}>controle absoluto</strong>.
            {" "}Painel web + app Android + relatórios automáticos.
            Seus técnicos trabalham mais rápido, você enxerga tudo em tempo real.
          </p>

          {/* CTA buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-8">
            <a href={whatsappLink} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-base font-bold transition-all"
              style={{
                background: "linear-gradient(135deg, #00f5a0, #00d9f5)",
                color: "#050b18",
                boxShadow: "0 0 40px rgba(0,245,160,0.25)",
                textDecoration: "none",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 60px rgba(0,245,160,0.4)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(0,245,160,0.25)"; }}>
              <MessageCircle size={20} />
              Quero uma demonstração
            </a>
            <a href="/admin/login"
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-base font-bold transition-all"
              style={{
                background: "rgba(255,255,255,0.06)",
                color: "white",
                border: "1px solid rgba(255,255,255,0.12)",
                textDecoration: "none",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}>
              <Lock size={18} />
              Acessar Painel Admin
            </a>
          </div>

          {/* App download */}
          <div className="flex justify-center mb-16">
            <a href="/netvius-tecnico.apk" download
              className="flex items-center gap-3 px-6 py-3 rounded-xl text-sm font-semibold transition-all"
              style={{
                background: "rgba(167,139,250,0.1)",
                color: "#a78bfa",
                border: "1px solid rgba(167,139,250,0.25)",
                textDecoration: "none",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(167,139,250,0.18)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(167,139,250,0.1)"; }}>
              <Download size={16} />
              Baixar App do Técnico (Android)
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(167,139,250,0.2)", color: "#c4b5fd" }}>APK</span>
            </a>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
            {[
              { value: 1248, suffix: "+", label: "Escolas gerenciadas" },
              { value: 98, suffix: "%", label: "Uptime garantido" },
              { value: 24, suffix: "h", label: "Suporte disponível" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-black text-white mb-1">
                  <Counter to={s.value} suffix={s.suffix} />
                </p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1" style={{ animation: "bounce 2s infinite" }}>
          <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>Conheça mais</span>
          <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.25)" }} />
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ── */}
      <div className="py-5 border-y" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}>
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8 md:gap-16">
          {[
            { icon: CheckCircle, text: "Funciona 100% offline", color: "#00f5a0" },
            { icon: Shield, text: "Dados isolados por empresa", color: "#60a5fa" },
            { icon: Globe, text: "Acesso de qualquer lugar", color: "#a78bfa" },
            { icon: Zap, text: "Setup em menos de 5 minutos", color: "#f59e0b" },
          ].map((item, i) => {
            const Icon = item.icon;
            return (
              <div key={i} className="flex items-center gap-2">
                <Icon size={14} style={{ color: item.color }} />
                <span className="text-sm font-medium" style={{ color: "rgba(255,255,255,0.55)" }}>{item.text}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── FEATURES ── */}
      <section id="funcionalidades" className="py-24 relative">
        <div className="absolute pointer-events-none" style={{ width: 500, height: 500, top: "5%", right: "-10%", background: "radial-gradient(circle, rgba(0,217,245,0.05) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block"
              style={{ background: "rgba(0,245,160,0.08)", color: "#00f5a0", border: "1px solid rgba(0,245,160,0.2)" }}>
              Funcionalidades
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Tudo que sua equipe precisa,<br />
              <span style={{ color: "rgba(255,255,255,0.35)" }}>em um só lugar</span>
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
              Do painel web ao app do técnico em campo — a Netvius conecta tudo em tempo real.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i}
                  className="p-6 rounded-2xl transition-all duration-300 cursor-default"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                  onMouseEnter={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.055)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.12)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(-4px)";
                  }}
                  onMouseLeave={e => {
                    (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
                    (e.currentTarget as HTMLElement).style.borderColor = "rgba(255,255,255,0.07)";
                    (e.currentTarget as HTMLElement).style.transform = "translateY(0)";
                  }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: f.gradient }}>
                    <Icon size={22} className="text-white" />
                  </div>
                  <h3 className="text-base font-bold text-white mb-2">{f.title}</h3>
                  <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── HOW IT WORKS ── */}
      <section id="como-funciona" className="py-24 relative">
        <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.012)" }} />
        <div className="absolute pointer-events-none" style={{ width: 500, height: 500, bottom: "0%", left: "-15%", background: "radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block"
              style={{ background: "rgba(167,139,250,0.08)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}>
              Como funciona
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Do zero ao operacional<br />
              <span style={{ color: "rgba(255,255,255,0.35)" }}>em menos de 1 hora</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {steps.map((s, i) => (
              <div key={i} className="p-6 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="text-4xl font-black mb-4"
                  style={{
                    background: "linear-gradient(135deg, #00f5a0, #00d9f5)",
                    WebkitBackgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                  }}>
                  {s.num}
                </div>
                <h3 className="text-sm font-bold text-white mb-2">{s.title}</h3>
                <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TESTIMONIALS ── */}
      <section className="py-24 relative">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block"
              style={{ background: "rgba(251,191,36,0.08)", color: "#fbbf24", border: "1px solid rgba(251,191,36,0.2)" }}>
              Depoimentos
            </span>
            <h2 className="text-4xl font-black text-white">
              Quem usa, <span style={{ color: "rgba(255,255,255,0.35)" }}>aprova</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div key={i} className="p-6 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} size={13} fill="#fbbf24" style={{ color: "#fbbf24" }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-5" style={{ color: "rgba(255,255,255,0.6)" }}>
                  "{t.text}"
                </p>
                <div>
                  <p className="text-sm font-bold text-white">{t.name}</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.32)" }}>{t.role}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANS ── */}
      <section id="planos" className="py-24 relative">
        <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.012)" }} />
        <div className="absolute pointer-events-none" style={{ width: 400, height: 400, top: "20%", right: "-5%", background: "radial-gradient(circle, rgba(0,245,160,0.05) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block"
              style={{ background: "rgba(0,245,160,0.08)", color: "#00f5a0", border: "1px solid rgba(0,245,160,0.2)" }}>
              Planos
            </span>
            <h2 className="text-4xl font-black text-white mb-4">
              Escolha o plano ideal<br />
              <span style={{ color: "rgba(255,255,255,0.35)" }}>para o seu negócio</span>
            </h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.38)" }}>
              Todos os planos incluem painel web + app Android + suporte
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
            {[
              {
                name: "Básico", icon: "⚡", price: "Consulte",
                color: "#94a3b8",
                features: ["1 empresa", "Até 5 técnicos", "500 escolas", "App Android", "Suporte por email"],
                popular: false,
              },
              {
                name: "Profissional", icon: "🚀", price: "Consulte",
                color: "#00f5a0",
                features: ["1 empresa", "Técnicos ilimitados", "Escolas ilimitadas", "App Android", "Google Drive", "Relatórios Excel", "Suporte prioritário"],
                popular: true,
              },
              {
                name: "Enterprise", icon: "👑", price: "Consulte",
                color: "#fbbf24",
                features: ["Revenda ilimitada", "100+ empresas", "Bases isoladas", "Painel de revenda", "White-label", "Suporte dedicado"],
                popular: false,
              },
            ].map((plan, i) => (
              <div key={i}
                className="relative p-6 rounded-2xl flex flex-col"
                style={{
                  background: plan.popular ? "rgba(0,245,160,0.05)" : "rgba(255,255,255,0.03)",
                  border: plan.popular ? "1px solid rgba(0,245,160,0.3)" : "1px solid rgba(255,255,255,0.07)",
                  transform: plan.popular ? "scale(1.04)" : "scale(1)",
                }}>
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full text-xs font-bold whitespace-nowrap"
                    style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)", color: "#050b18" }}>
                    Mais popular
                  </div>
                )}
                <div className="text-2xl mb-3">{plan.icon}</div>
                <h3 className="text-lg font-black text-white mb-1">{plan.name}</h3>
                <p className="text-2xl font-black mb-5" style={{ color: plan.color }}>{plan.price}</p>
                <ul className="flex flex-col gap-2.5 mb-6 flex-1">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm" style={{ color: "rgba(255,255,255,0.6)" }}>
                      <CheckCircle size={13} style={{ color: plan.color, flexShrink: 0 }} />
                      {f}
                    </li>
                  ))}
                </ul>
                <a href={whatsappLink} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all"
                  style={{
                    background: plan.popular ? "linear-gradient(135deg, #00f5a0, #00d9f5)" : "rgba(255,255,255,0.07)",
                    color: plan.popular ? "#050b18" : "white",
                    border: plan.popular ? "none" : "1px solid rgba(255,255,255,0.1)",
                    textDecoration: "none",
                  }}>
                  <MessageCircle size={14} /> Falar com vendas
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ── */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute pointer-events-none" style={{ width: 700, height: 700, top: "-30%", left: "50%", transform: "translateX(-50%)", background: "radial-gradient(circle, rgba(0,245,160,0.07) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div className="relative max-w-3xl mx-auto px-6 text-center">
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            Pronto para ter{" "}
            <span style={{
              background: "linear-gradient(135deg, #00f5a0, #00d9f5)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>
              controle total
            </span>{" "}
            das suas instalações?
          </h2>
          <p className="text-base mb-10" style={{ color: "rgba(255,255,255,0.45)" }}>
            Fale agora com nossa equipe e veja uma demonstração ao vivo do sistema.
            Sem compromisso, sem enrolação.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={whatsappLink} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-base font-bold transition-all"
              style={{
                background: "linear-gradient(135deg, #00f5a0, #00d9f5)",
                color: "#050b18",
                boxShadow: "0 0 50px rgba(0,245,160,0.3)",
                textDecoration: "none",
              }}>
              <MessageCircle size={20} />
              Falar no WhatsApp agora
            </a>
            <a href="/netvius-tecnico.apk" download
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-base font-bold transition-all"
              style={{ background: "rgba(255,255,255,0.06)", color: "white", border: "1px solid rgba(255,255,255,0.12)", textDecoration: "none" }}>
              <Download size={18} />
              Baixar App Android
            </a>
          </div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer id="contato" className="py-12 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)" }}>
                <Wifi size={16} className="text-black" strokeWidth={2.5} />
              </div>
              <div>
                <span className="text-base font-black text-white">Netvius</span>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.32)" }}>Gestão inteligente de redes escolares</p>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <a href={whatsappLink} target="_blank" rel="noreferrer"
                className="flex items-center gap-2 text-sm font-medium transition-colors"
                style={{ color: "#00f5a0", textDecoration: "none" }}>
                <MessageCircle size={14} />
                (75) 99914-2134
              </a>
              <span className="hidden sm:block" style={{ color: "rgba(255,255,255,0.12)" }}>|</span>
              <a href="/admin/login"
                className="flex items-center gap-2 text-sm font-medium"
                style={{ color: "rgba(255,255,255,0.45)", textDecoration: "none" }}>
                <Lock size={12} />
                Painel Admin
              </a>
              <span className="hidden sm:block" style={{ color: "rgba(255,255,255,0.12)" }}>|</span>
              <a href="/superadmin/login"
                className="flex items-center gap-2 text-sm font-medium"
                style={{ color: "rgba(255,255,255,0.28)", textDecoration: "none" }}>
                <Shield size={12} />
                Área Master
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t flex flex-col sm:flex-row items-center justify-between gap-3"
            style={{ borderColor: "rgba(255,255,255,0.05)" }}>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.22)" }}>
              © 2025 Netvius. Todos os direitos reservados.
            </p>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.16)" }}>
              Plataforma SaaS para gestão de instalações de rede
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
