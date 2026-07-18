import { useState, useEffect, useRef } from "react";
import {
  Wifi, BarChart3, MapPin, Smartphone, CheckCircle, ArrowRight,
  Zap, Users, FileText, Shield, Star, MessageCircle, Download,
  ChevronDown, Globe, Lock, Menu, X, Clock, Camera,
  Target, Award, Building2, Wrench, Route, Brain,
  TrendingUp, Play, Pause, RotateCcw, ChevronRight,
  AlertCircle, CheckCircle2, Timer, User, Phone
} from "lucide-react";

// ── Counter animado ──
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
      const duration = 2000;
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

// ── Simulador de OS ──
const OS_STEPS = [
  { id: 1, status: "pending", icon: AlertCircle, color: "#f59e0b", label: "OS Aberta", desc: "Escola Municipal João Paulo — INEP 29012345", detail: "Técnico Carlos Silva atribuído · Monte Santo, BA", time: "08:14" },
  { id: 2, status: "progress", icon: Timer, color: "#60a5fa", label: "Em Andamento", desc: "Técnico iniciou o atendimento no local", detail: "Foto do defeito enviada · 2 APs a instalar", time: "09:32" },
  { id: 3, status: "done", icon: CheckCircle2, color: "#00f5a0", label: "OS Concluída", desc: "2 APs instalados · Velocidade: 100 Mbps", detail: "Foto de conclusão salva · Saiu da lista do app", time: "11:05" },
];

function OSSimulator() {
  const [step, setStep] = useState(0);
  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const start = () => {
    if (running) return;
    setRunning(true);
    setDone(false);
    setStep(0);
    let s = 0;
    timerRef.current = setInterval(() => {
      s++;
      setStep(s);
      if (s >= OS_STEPS.length - 1) {
        clearInterval(timerRef.current!);
        setRunning(false);
        setDone(true);
      }
    }, 2200);
  };

  const reset = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setRunning(false);
    setDone(false);
    setStep(0);
  };

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)" }}>
      {/* Header */}
      <div className="px-5 py-3 flex items-center justify-between border-b" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.02)" }}>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ background: "#ff5f57" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#febc2e" }} />
          <div className="w-3 h-3 rounded-full" style={{ background: "#28c840" }} />
        </div>
        <span className="text-xs font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Netvius · Painel Admin</span>
        <div className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: "#00f5a0", boxShadow: "0 0 6px #00f5a0" }} />
          <span className="text-xs" style={{ color: "#00f5a0" }}>Ao vivo</span>
        </div>
      </div>

      {/* OS Steps */}
      <div className="p-5 space-y-3">
        {OS_STEPS.map((s, i) => {
          const Icon = s.icon;
          const active = i <= step;
          const current = i === step;
          return (
            <div key={s.id}
              className="flex items-start gap-3 p-3.5 rounded-xl transition-all duration-700"
              style={{
                background: active ? (current ? `rgba(${s.color === "#00f5a0" ? "0,245,160" : s.color === "#60a5fa" ? "96,165,250" : "245,158,11"},0.08)` : "rgba(255,255,255,0.03)") : "rgba(255,255,255,0.015)",
                border: `1px solid ${active ? (current ? s.color + "33" : "rgba(255,255,255,0.06)") : "rgba(255,255,255,0.04)"}`,
                opacity: active ? 1 : 0.35,
                transform: current ? "scale(1.01)" : "scale(1)",
              }}>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                style={{ background: active ? s.color + "22" : "rgba(255,255,255,0.05)" }}>
                <Icon size={16} style={{ color: active ? s.color : "rgba(255,255,255,0.2)" }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-xs font-bold" style={{ color: active ? "white" : "rgba(255,255,255,0.3)" }}>{s.label}</span>
                  <span className="text-xs" style={{ color: "rgba(255,255,255,0.25)" }}>{s.time}</span>
                </div>
                <p className="text-xs mb-0.5" style={{ color: active ? "rgba(255,255,255,0.65)" : "rgba(255,255,255,0.2)" }}>{s.desc}</p>
                <p className="text-xs" style={{ color: active ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.15)" }}>{s.detail}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Controls */}
      <div className="px-5 pb-5 flex items-center gap-3">
        {!running && !done ? (
          <button onClick={start}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)", color: "#050b18" }}>
            <Play size={12} /> Simular OS ao vivo
          </button>
        ) : running ? (
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold"
            style={{ background: "rgba(96,165,250,0.1)", color: "#60a5fa", border: "1px solid rgba(96,165,250,0.2)" }}>
            <div className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#60a5fa" }} />
            Simulando...
          </div>
        ) : (
          <button onClick={reset}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all"
            style={{ background: "rgba(0,245,160,0.08)", color: "#00f5a0", border: "1px solid rgba(0,245,160,0.2)" }}>
            <RotateCcw size={12} /> Reiniciar
          </button>
        )}
        {done && (
          <span className="text-xs font-semibold" style={{ color: "#00f5a0" }}>
            ✓ OS concluída e removida do app do técnico
          </span>
        )}
      </div>
    </div>
  );
}

// ── App Preview ──
function AppPreview() {
  const [screen, setScreen] = useState<"home" | "os" | "map">("home");
  return (
    <div className="relative mx-auto" style={{ width: 220, height: 440 }}>
      {/* Phone frame */}
      <div className="absolute inset-0 rounded-3xl" style={{ background: "#111827", border: "2px solid rgba(255,255,255,0.1)", boxShadow: "0 30px 80px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.05)" }} />
      {/* Notch */}
      <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-4 rounded-full" style={{ background: "#000" }} />
      {/* Screen */}
      <div className="absolute inset-1.5 rounded-2xl overflow-hidden" style={{ background: "#0f172a" }}>
        {screen === "home" && (
          <div className="h-full flex flex-col">
            <div className="px-3 pt-7 pb-2" style={{ background: "linear-gradient(135deg, #1e3a5f, #0f172a)" }}>
              <div className="flex items-center justify-between mb-2">
                <div>
                  <p className="text-xs font-bold text-white">Olá, Carlos</p>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>Técnico · Monte Santo</p>
                </div>
                <div className="w-7 h-7 rounded-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)" }}>
                  <User size={12} className="text-black" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-1.5 mt-2">
                {[["8", "Total"], ["5", "Pend."], ["3", "Feitas"]].map(([n, l]) => (
                  <div key={l} className="rounded-lg p-1.5 text-center" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <p className="text-sm font-black text-white">{n}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)", fontSize: 9 }}>{l}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex-1 px-3 py-2 overflow-hidden">
              <p className="text-xs font-bold mb-2" style={{ color: "rgba(255,255,255,0.5)", fontSize: 9 }}>PRÓXIMAS OS</p>
              {[
                { name: "E.M. João Paulo", inep: "29012345", aps: 2, status: "pending" },
                { name: "E.M. Santos Dumont", inep: "29012346", aps: 4, status: "progress" },
              ].map((s, i) => (
                <div key={i} onClick={() => setScreen("os")} className="mb-1.5 p-2 rounded-xl cursor-pointer" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="text-xs font-bold text-white" style={{ fontSize: 10 }}>{s.name}</span>
                    <span className="text-xs px-1.5 py-0.5 rounded-full" style={{ background: s.status === "pending" ? "rgba(245,158,11,0.15)" : "rgba(96,165,250,0.15)", color: s.status === "pending" ? "#f59e0b" : "#60a5fa", fontSize: 8 }}>
                      {s.status === "pending" ? "Pendente" : "Em andamento"}
                    </span>
                  </div>
                  <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)", fontSize: 9 }}>INEP {s.inep} · {s.aps} APs</p>
                </div>
              ))}
            </div>
            {/* Bottom nav */}
            <div className="flex border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              {[
                { icon: Building2, label: "Início", active: true, color: "#00f5a0" },
                { icon: MapPin, label: "Mapa", active: false, color: "#60a5fa", action: () => setScreen("map") },
                { icon: Wrench, label: "OS", active: false, color: "#a78bfa" },
                { icon: User, label: "Perfil", active: false, color: "#f59e0b" },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <button key={i} onClick={item.action} className="flex-1 py-2 flex flex-col items-center gap-0.5">
                    <Icon size={12} style={{ color: item.active ? item.color : "rgba(255,255,255,0.3)" }} />
                    <span style={{ fontSize: 8, color: item.active ? item.color : "rgba(255,255,255,0.3)" }}>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        )}
        {screen === "os" && (
          <div className="h-full flex flex-col">
            <div className="px-3 pt-7 pb-3" style={{ background: "linear-gradient(135deg, #1e1b4b, #0f172a)" }}>
              <button onClick={() => setScreen("home")} className="flex items-center gap-1 mb-2" style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>
                ← Voltar
              </button>
              <p className="text-xs font-black text-white">E.M. João Paulo</p>
              <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 9 }}>INEP 29012345 · Monte Santo, BA</p>
            </div>
            <div className="flex-1 px-3 py-2 space-y-2 overflow-hidden">
              {[
                { icon: Wifi, label: "Velocidade", val: "100 Mbps", color: "#00f5a0" },
                { icon: Phone, label: "WhatsApp", val: "(75) 99123-4567", color: "#25d366" },
                { icon: MapPin, label: "Google Maps", val: "Ver no mapa", color: "#4285f4" },
                { icon: Brain, label: "Assistente IA", val: "Pedir ajuda", color: "#a78bfa" },
              ].map((item, i) => {
                const Icon = item.icon;
                return (
                  <div key={i} className="flex items-center gap-2 p-2 rounded-xl" style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: item.color + "22" }}>
                      <Icon size={11} style={{ color: item.color }} />
                    </div>
                    <div>
                      <p style={{ fontSize: 8, color: "rgba(255,255,255,0.35)" }}>{item.label}</p>
                      <p style={{ fontSize: 10, color: "white", fontWeight: 600 }}>{item.val}</p>
                    </div>
                  </div>
                );
              })}
              <button className="w-full py-2 rounded-xl text-xs font-bold mt-1" style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)", color: "#050b18", fontSize: 10 }}>
                ✓ Concluir OS
              </button>
            </div>
            <div className="flex border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              {[Building2, MapPin, Wrench, User].map((Icon, i) => (
                <button key={i} className="flex-1 py-2 flex flex-col items-center">
                  <Icon size={12} style={{ color: i === 2 ? "#a78bfa" : "rgba(255,255,255,0.3)" }} />
                </button>
              ))}
            </div>
          </div>
        )}
        {screen === "map" && (
          <div className="h-full flex flex-col">
            <div className="px-3 pt-7 pb-2 flex items-center justify-between" style={{ background: "rgba(15,23,42,0.95)" }}>
              <button onClick={() => setScreen("home")} style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>← Voltar</button>
              <p className="text-xs font-bold text-white">Mapa de Rotas</p>
              <div />
            </div>
            {/* Fake map */}
            <div className="flex-1 relative overflow-hidden" style={{ background: "linear-gradient(135deg, #1a2744 0%, #0d1b2e 100%)" }}>
              {/* Grid lines */}
              <svg className="absolute inset-0 w-full h-full" style={{ opacity: 0.15 }}>
                {[0,1,2,3,4,5].map(i => <line key={`h${i}`} x1="0" y1={`${i*20}%`} x2="100%" y2={`${i*20}%`} stroke="white" strokeWidth="0.5" />)}
                {[0,1,2,3,4].map(i => <line key={`v${i}`} x1={`${i*25}%`} y1="0" x2={`${i*25}%`} y2="100%" stroke="white" strokeWidth="0.5" />)}
              </svg>
              {/* Route line */}
              <svg className="absolute inset-0 w-full h-full">
                <polyline points="40,280 80,200 120,160 160,100 180,60" stroke="#00f5a0" strokeWidth="2" fill="none" strokeDasharray="4,3" opacity="0.7" />
              </svg>
              {/* Pins */}
              {[
                { x: 40, y: 280, color: "#00f5a0", label: "1" },
                { x: 80, y: 200, color: "#f59e0b", label: "2" },
                { x: 120, y: 160, color: "#f59e0b", label: "3" },
                { x: 160, y: 100, color: "#60a5fa", label: "4" },
                { x: 180, y: 60, color: "#60a5fa", label: "5" },
              ].map((p, i) => (
                <div key={i} className="absolute flex items-center justify-center rounded-full text-white font-black"
                  style={{ left: p.x - 8, top: p.y - 8, width: 16, height: 16, background: p.color, fontSize: 8, boxShadow: `0 0 8px ${p.color}66` }}>
                  {p.label}
                </div>
              ))}
              {/* Start route button */}
              <div className="absolute bottom-3 left-3 right-3">
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl" style={{ background: "rgba(0,245,160,0.15)", border: "1px solid rgba(0,245,160,0.3)" }}>
                  <Route size={12} style={{ color: "#00f5a0" }} />
                  <span style={{ fontSize: 10, color: "#00f5a0", fontWeight: 700 }}>Iniciar Rota Otimizada</span>
                </div>
              </div>
            </div>
            <div className="flex border-t" style={{ borderColor: "rgba(255,255,255,0.08)" }}>
              {[Building2, MapPin, Wrench, User].map((Icon, i) => (
                <button key={i} className="flex-1 py-2 flex flex-col items-center" onClick={() => i === 0 && setScreen("home")}>
                  <Icon size={12} style={{ color: i === 1 ? "#60a5fa" : "rgba(255,255,255,0.3)" }} />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function Home() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 30);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const whatsappLink = "https://wa.me/5575999142134?text=Ol%C3%A1!%20Tenho%20interesse%20no%20sistema%20Netvius.%20Gostaria%20de%20uma%20demonstra%C3%A7%C3%A3o.";
  const apkLink = "/manus-storage/netvionis-tecnico-v10_d62e678b.apk";

  const features = [
    { icon: BarChart3, title: "Painel em tempo real", desc: "KPIs, produtividade e progresso de toda a operação atualizados ao vivo. Tome decisões com dados precisos, não com achismos.", gradient: "linear-gradient(135deg, #00f5a0, #00d9f5)" },
    { icon: Smartphone, title: "App Android para técnicos", desc: "Seus profissionais recebem OS, registram fotos e concluem atendimentos pelo celular — funciona 100% offline e sincroniza quando voltar online.", gradient: "linear-gradient(135deg, #a78bfa, #7c3aed)" },
    { icon: Route, title: "Roteamento inteligente", desc: "O sistema ordena as visitas pela rota mais eficiente usando GPS. Técnico abre o app e já sabe por onde começar — sem desperdício de tempo.", gradient: "linear-gradient(135deg, #f59e0b, #ef4444)" },
    { icon: Camera, title: "Fotos e evidências", desc: "Registro fotográfico obrigatório antes e depois de cada serviço. Tudo salvo automaticamente na nuvem com data, hora e localização.", gradient: "linear-gradient(135deg, #60a5fa, #3b82f6)" },
    { icon: Brain, title: "Assistente para técnicos", desc: "O técnico pode pedir orientação diretamente no app durante a instalação. Respostas precisas sobre infraestrutura de rede em segundos.", gradient: "linear-gradient(135deg, #c084fc, #a855f7)" },
    { icon: Shield, title: "Multi-empresa isolado", desc: "Cada cliente tem sua base de dados 100% separada. Revenda para dezenas de empresas com total segurança — sem nenhuma interferência.", gradient: "linear-gradient(135deg, #f472b6, #ec4899)" },
    { icon: FileText, title: "Relatórios automáticos", desc: "Gere planilhas Excel e PDFs profissionais com histórico completo de serviços, fotos e dados em segundos. Sem trabalho manual.", gradient: "linear-gradient(135deg, #34d399, #10b981)" },
    { icon: MapPin, title: "Mapa interativo", desc: "Visualize todos os pontos de atendimento no mapa com status colorido. Veja distâncias, agrupe por cidade e acompanhe o progresso geograficamente.", gradient: "linear-gradient(135deg, #fb923c, #f97316)" },
    { icon: TrendingUp, title: "Gestão de revendas", desc: "Crie e gerencie dezenas de clientes revendedores com painel master exclusivo. Defina planos, períodos de trial e controle tudo de um só lugar.", gradient: "linear-gradient(135deg, #38bdf8, #0ea5e9)" },
  ];

  const segmentos = [
    { icon: "📡", label: "Telecom" },
    { icon: "☀️", label: "Energia Solar" },
    { icon: "📷", label: "Segurança" },
    { icon: "❄️", label: "Climatização" },
    { icon: "🏫", label: "Educação" },
    { icon: "🔧", label: "Manutenção" },
    { icon: "🏗️", label: "Construção" },
    { icon: "🏥", label: "Saúde" },
    { icon: "⚡", label: "Elétrica" },
    { icon: "🌐", label: "Internet" },
  ];

  const testimonials = [
    { name: "Marcos Oliveira", role: "Gestor de TI · Telecom, Bahia", text: "Antes levávamos semanas para saber quantas instalações estavam concluídas. Com a Netvius, vejo tudo em tempo real — do painel ao app do técnico.", stars: 5, avatar: "MO" },
    { name: "Ana Paula Costa", role: "Coordenadora de Projetos · Energia Solar", text: "O app do técnico é incrível. Funciona offline, tira foto, registra tudo. Nossa equipe ganhou 40% em produtividade no primeiro mês.", stars: 5, avatar: "AP" },
    { name: "Roberto Mendes", role: "Revendedor Netvius · 12 clientes ativos", text: "Revendo o sistema para empresas de segmentos diferentes. Cada uma com seus dados isolados. Nunca tive problema de segurança.", stars: 5, avatar: "RM" },
  ];

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: "#050b18", fontFamily: "'Inter', sans-serif" }}>

      {/* ── NAVBAR ── */}
      <nav className="fixed top-0 left-0 right-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? "rgba(5,11,24,0.97)" : "transparent",
          backdropFilter: scrolled ? "blur(24px)" : "none",
          borderBottom: scrolled ? "1px solid rgba(255,255,255,0.06)" : "none",
        }}>
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)" }}>
              <Wifi size={16} className="text-black" strokeWidth={2.5} />
            </div>
            <span className="text-lg font-black text-white tracking-tight">Netvius</span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            {[["Funcionalidades", "#funcionalidades"], ["Como funciona", "#como-funciona"], ["App", "#app-demo"], ["Planos", "#planos"]].map(([label, href]) => (
              <a key={label} href={href} className="text-sm font-medium transition-colors"
                style={{ color: "rgba(255,255,255,0.5)", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "white")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.5)")}>
                {label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href="/admin/login" className="px-4 py-2 rounded-xl text-sm font-semibold transition-all"
              style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.8)", border: "1px solid rgba(255,255,255,0.1)", textDecoration: "none" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.12)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.07)"; }}>
              Painel Admin
            </a>
            <a href={whatsappLink} target="_blank" rel="noreferrer"
              className="px-4 py-2 rounded-xl text-sm font-bold transition-all flex items-center gap-2"
              style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)", color: "#050b18", textDecoration: "none" }}>
              <MessageCircle size={14} /> Demonstração
            </a>
          </div>

          <button className="md:hidden text-white" onClick={() => setMobileMenu(m => !m)}>
            {mobileMenu ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        {mobileMenu && (
          <div className="md:hidden px-6 py-4 flex flex-col gap-3 border-t"
            style={{ background: "rgba(5,11,24,0.99)", borderColor: "rgba(255,255,255,0.08)" }}>
            {[["Funcionalidades", "#funcionalidades"], ["Como funciona", "#como-funciona"], ["App", "#app-demo"], ["Planos", "#planos"]].map(([label, href]) => (
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
        <div className="absolute inset-0 pointer-events-none"
          style={{
            backgroundImage: "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
            backgroundSize: "60px 60px",
          }} />
        <div className="absolute pointer-events-none" style={{ width: 800, height: 800, top: "-20%", left: "-25%", background: "radial-gradient(circle, rgba(0,245,160,0.06) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div className="absolute pointer-events-none" style={{ width: 700, height: 700, bottom: "-20%", right: "-20%", background: "radial-gradient(circle, rgba(0,217,245,0.05) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div className="absolute pointer-events-none" style={{ width: 500, height: 500, top: "30%", left: "60%", background: "radial-gradient(circle, rgba(167,139,250,0.04) 0%, transparent 70%)", borderRadius: "50%" }} />

        <div className="relative z-10 max-w-6xl mx-auto px-6 pt-28 pb-20">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            {/* Left: Copy */}
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-8"
                style={{ background: "rgba(0,245,160,0.08)", border: "1px solid rgba(0,245,160,0.2)" }}>
                <span className="w-2 h-2 rounded-full" style={{ background: "#00f5a0", boxShadow: "0 0 8px #00f5a0" }} />
                <span className="text-xs font-semibold" style={{ color: "#00f5a0" }}>
                  Plataforma online · Sincronização em tempo real
                </span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-black text-white leading-tight mb-6 tracking-tight">
                Cada técnico em campo,{" "}
                <span style={{
                  background: "linear-gradient(135deg, #00f5a0 0%, #00d9f5 50%, #a78bfa 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  cada centavo no lugar certo
                </span>
              </h1>

              <p className="text-lg mb-4 leading-relaxed" style={{ color: "rgba(255,255,255,0.6)" }}>
                Empresas que usam a <strong style={{ color: "white" }}>Netvius</strong> eliminam retrabalho, reduzem custos operacionais e entregam mais em menos tempo. Do primeiro acesso ao relatório final — tudo automatizado, tudo rastreado, tudo seguro.
              </p>

              <p className="text-base mb-8 leading-relaxed" style={{ color: "rgba(255,255,255,0.4)" }}>
                Mais de 500 técnicos já usam o app. Gestão completa para telecom, energia solar, segurança, climatização e qualquer serviço técnico em campo.
              </p>

              {/* Segmentos */}
              <div className="flex flex-wrap gap-2 mb-8">
                {segmentos.slice(0, 6).map((s, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.6)" }}>
                    {s.icon} {s.label}
                  </span>
                ))}
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "rgba(255,255,255,0.4)" }}>
                  + mais
                </span>
              </div>

              {/* CTAs */}
              <div className="flex flex-col sm:flex-row gap-3 mb-6">
                <a href={whatsappLink} target="_blank" rel="noreferrer"
                  className="flex items-center justify-center gap-3 px-7 py-4 rounded-2xl text-base font-bold transition-all"
                  style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)", color: "#050b18", boxShadow: "0 0 40px rgba(0,245,160,0.25)", textDecoration: "none" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 60px rgba(0,245,160,0.4)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; (e.currentTarget as HTMLElement).style.boxShadow = "0 0 40px rgba(0,245,160,0.25)"; }}>
                  <MessageCircle size={20} />
                  Quero uma demonstração
                </a>
                <a href="/admin/login"
                  className="flex items-center justify-center gap-3 px-7 py-4 rounded-2xl text-base font-bold transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", color: "white", border: "1px solid rgba(255,255,255,0.12)", textDecoration: "none" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.1)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.06)"; }}>
                  <Lock size={18} />
                  Acessar Painel
                </a>
              </div>

              <a href={apkLink} download="netvius-tecnico-v10.apk"
                className="inline-flex items-center gap-3 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all"
                style={{ background: "rgba(167,139,250,0.1)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.25)", textDecoration: "none" }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = "rgba(167,139,250,0.18)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = "rgba(167,139,250,0.1)"; }}>
                <Download size={15} />
                Baixar App do Técnico (Android)
                <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "rgba(167,139,250,0.2)", color: "#c4b5fd" }}>APK</span>
              </a>
            </div>

            {/* Right: App Preview */}
            <div className="flex flex-col items-center gap-6">
              <AppPreview />
              <p className="text-xs text-center" style={{ color: "rgba(255,255,255,0.3)" }}>
                Toque nas telas para navegar · App interativo
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto mt-16 pt-16 border-t" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            {[
              { value: 500, suffix: "+", label: "Técnicos ativos" },
              { value: 98, suffix: "%", label: "Uptime garantido" },
              { value: 24, suffix: "h", label: "Suporte disponível" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <p className="text-3xl font-black text-white mb-1"><Counter to={s.value} suffix={s.suffix} /></p>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.35)" }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── SOCIAL PROOF STRIP ── */}
      <div className="py-5 border-y" style={{ borderColor: "rgba(255,255,255,0.06)", background: "rgba(255,255,255,0.015)" }}>
        <div className="max-w-5xl mx-auto px-6 flex flex-wrap items-center justify-center gap-8">
          {[
            { icon: CheckCircle, text: "100% offline no app", color: "#00f5a0" },
            { icon: Shield, text: "Dados isolados por empresa", color: "#60a5fa" },
            { icon: Globe, text: "Acesso de qualquer lugar", color: "#a78bfa" },
            { icon: Zap, text: "Setup em menos de 1 hora", color: "#f59e0b" },
            { icon: Lock, text: "100% seguro e criptografado", color: "#f472b6" },
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

      {/* ── OS SIMULATOR ── */}
      <section id="app-demo" className="py-24 relative">
        <div className="absolute pointer-events-none" style={{ width: 600, height: 600, top: "0%", right: "-10%", background: "radial-gradient(circle, rgba(0,245,160,0.04) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block"
                style={{ background: "rgba(0,245,160,0.08)", color: "#00f5a0", border: "1px solid rgba(0,245,160,0.2)" }}>
                Demonstração ao vivo
              </span>
              <h2 className="text-4xl font-black text-white mb-4 leading-tight">
                Veja como uma OS nasce,<br />
                <span style={{ color: "rgba(255,255,255,0.35)" }}>é executada e concluída</span>
              </h2>
              <p className="text-base mb-6 leading-relaxed" style={{ color: "rgba(255,255,255,0.45)" }}>
                Do painel admin ao app do técnico em campo — tudo sincronizado em tempo real. Quando o técnico conclui a OS, ela sai automaticamente da lista dele.
              </p>
              <div className="space-y-3">
                {[
                  { icon: Target, text: "Admin cria a OS e atribui ao técnico", color: "#00f5a0" },
                  { icon: Smartphone, text: "Técnico recebe no app instantaneamente", color: "#60a5fa" },
                  { icon: Camera, text: "Técnico registra fotos e observações", color: "#a78bfa" },
                  { icon: CheckCircle, text: "OS concluída → sai da lista do app", color: "#f59e0b" },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: item.color + "15", border: `1px solid ${item.color}33` }}>
                        <Icon size={15} style={{ color: item.color }} />
                      </div>
                      <span className="text-sm" style={{ color: "rgba(255,255,255,0.65)" }}>{item.text}</span>
                    </div>
                  );
                })}
              </div>
            </div>
            <div>
              <OSSimulator />
            </div>
          </div>
        </div>
      </section>

      {/* ── FEATURES ── */}
      <section id="funcionalidades" className="py-24 relative">
        <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.01)" }} />
        <div className="relative max-w-6xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block"
              style={{ background: "rgba(0,245,160,0.08)", color: "#00f5a0", border: "1px solid rgba(0,245,160,0.2)" }}>
              Funcionalidades
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Tudo que sua operação precisa,<br />
              <span style={{ color: "rgba(255,255,255,0.3)" }}>em um só lugar</span>
            </h2>
            <p className="text-base max-w-xl mx-auto" style={{ color: "rgba(255,255,255,0.4)" }}>
              Do painel web ao app do técnico em campo — a Netvius conecta tudo em tempo real, com segurança e sem complexidade.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {features.map((f, i) => {
              const Icon = f.icon;
              return (
                <div key={i} className="p-6 rounded-2xl transition-all duration-300 cursor-default"
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
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4" style={{ background: f.gradient }}>
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
        <div className="absolute pointer-events-none" style={{ width: 500, height: 500, bottom: "0%", left: "-15%", background: "radial-gradient(circle, rgba(167,139,250,0.05) 0%, transparent 70%)", borderRadius: "50%" }} />
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block"
              style={{ background: "rgba(167,139,250,0.08)", color: "#a78bfa", border: "1px solid rgba(167,139,250,0.2)" }}>
              Como funciona
            </span>
            <h2 className="text-4xl md:text-5xl font-black text-white mb-4">
              Do zero ao controle total<br />
              <span style={{ color: "rgba(255,255,255,0.3)" }}>em menos de 1 hora</span>
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { num: "01", icon: Building2, title: "Configure sua empresa", desc: "Informe o tipo de negócio. O sistema adapta a terminologia e os campos para o seu segmento automaticamente.", color: "#00f5a0" },
              { num: "02", icon: Users, title: "Adicione sua equipe", desc: "Cadastre técnicos, defina cidades e regiões. Eles recebem acesso ao app Android imediatamente.", color: "#60a5fa" },
              { num: "03", icon: FileText, title: "Importe seus clientes", desc: "Suba uma planilha com seus pontos de atendimento. O sistema organiza e distribui automaticamente por rota.", color: "#a78bfa" },
              { num: "04", icon: BarChart3, title: "Controle em tempo real", desc: "Acompanhe o progresso, receba fotos, gere relatórios e tome decisões com dados precisos e atualizados.", color: "#f59e0b" },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <div key={i} className="p-6 rounded-2xl relative"
                  style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  <div className="text-4xl font-black mb-3"
                    style={{ background: `linear-gradient(135deg, ${s.color}, ${s.color}99)`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
                    {s.num}
                  </div>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3"
                    style={{ background: s.color + "15", border: `1px solid ${s.color}33` }}>
                    <Icon size={16} style={{ color: s.color }} />
                  </div>
                  <h3 className="text-sm font-bold text-white mb-2">{s.title}</h3>
                  <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.42)" }}>{s.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SECURITY SECTION ── */}
      <section className="py-20 relative">
        <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.01)" }} />
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="rounded-2xl p-8 md:p-12" style={{ background: "rgba(0,245,160,0.03)", border: "1px solid rgba(0,245,160,0.12)" }}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block"
                  style={{ background: "rgba(0,245,160,0.08)", color: "#00f5a0", border: "1px solid rgba(0,245,160,0.2)" }}>
                  Segurança
                </span>
                <h2 className="text-3xl md:text-4xl font-black text-white mb-4">
                  100% seguro.<br />
                  <span style={{ color: "#00f5a0" }}>Seus dados protegidos.</span>
                </h2>
                <p className="text-base leading-relaxed" style={{ color: "rgba(255,255,255,0.5)" }}>
                  Cada empresa tem sua base de dados completamente isolada na nuvem. Nenhum cliente acessa dados de outro. Proteção contra ataques, criptografia de ponta a ponta e logs de acesso completos.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                {[
                  { icon: Shield, title: "Dados isolados", desc: "Cada cliente tem sua base separada na nuvem", color: "#00f5a0" },
                  { icon: Lock, title: "Criptografia", desc: "Senhas e dados sensíveis sempre criptografados", color: "#60a5fa" },
                  { icon: Globe, title: "Nuvem segura", desc: "Infraestrutura cloud com backup automático", color: "#a78bfa" },
                  { icon: CheckCircle, title: "Logs de acesso", desc: "Todo acesso ao painel registrado e auditável", color: "#f59e0b" },
                ].map((item, i) => {
                  const Icon = item.icon;
                  return (
                    <div key={i} className="p-4 rounded-xl" style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center mb-3" style={{ background: item.color + "15" }}>
                        <Icon size={15} style={{ color: item.color }} />
                      </div>
                      <h4 className="text-sm font-bold text-white mb-1">{item.title}</h4>
                      <p className="text-xs leading-relaxed" style={{ color: "rgba(255,255,255,0.38)" }}>{item.desc}</p>
                    </div>
                  );
                })}
              </div>
            </div>
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
              Quem usa, <span style={{ color: "rgba(255,255,255,0.3)" }}>aprova</span>
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {testimonials.map((t, i) => (
              <div key={i} className="p-6 rounded-2xl flex flex-col"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex gap-1 mb-4">
                  {Array.from({ length: t.stars }).map((_, j) => (
                    <Star key={j} size={13} fill="#fbbf24" style={{ color: "#fbbf24" }} />
                  ))}
                </div>
                <p className="text-sm leading-relaxed mb-5 flex-1" style={{ color: "rgba(255,255,255,0.6)" }}>
                  "{t.text}"
                </p>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-black"
                    style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)", color: "#050b18" }}>
                    {t.avatar}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    <p className="text-xs" style={{ color: "rgba(255,255,255,0.32)" }}>{t.role}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── PLANS ── */}
      <section id="planos" className="py-24 relative">
        <div className="absolute inset-0" style={{ background: "rgba(255,255,255,0.01)" }} />
        <div className="relative max-w-5xl mx-auto px-6">
          <div className="text-center mb-16">
            <span className="text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-4 inline-block"
              style={{ background: "rgba(0,245,160,0.08)", color: "#00f5a0", border: "1px solid rgba(0,245,160,0.2)" }}>
              Planos
            </span>
            <h2 className="text-4xl font-black text-white mb-4">
              Escolha o plano ideal<br />
              <span style={{ color: "rgba(255,255,255,0.3)" }}>para o seu negócio</span>
            </h2>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.38)" }}>
              Todos os planos incluem painel web + app Android + suporte + 5 dias de demonstração gratuita
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-center">
            {[
              {
                name: "Básico", icon: "⚡", price: "Consulte",
                color: "#94a3b8",
                features: ["1 empresa", "Até 5 técnicos", "500 pontos de atendimento", "App Android", "Suporte por email"],
                popular: false,
              },
              {
                name: "Profissional", icon: "🚀", price: "Consulte",
                color: "#00f5a0",
                features: ["1 empresa", "Técnicos ilimitados", "Pontos ilimitados", "App Android + IA assistente", "Relatórios Excel", "Suporte prioritário"],
                popular: true,
              },
              {
                name: "Enterprise", icon: "👑", price: "Consulte",
                color: "#fbbf24",
                features: ["Revenda ilimitada", "100+ empresas", "Bases isoladas", "Painel master de revenda", "White-label disponível", "Suporte dedicado"],
                popular: false,
              },
            ].map((plan, i) => (
              <div key={i} className="relative p-6 rounded-2xl flex flex-col"
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
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
            style={{ background: "rgba(0,245,160,0.08)", border: "1px solid rgba(0,245,160,0.2)" }}>
            <Award size={14} style={{ color: "#00f5a0" }} />
            <span className="text-xs font-semibold" style={{ color: "#00f5a0" }}>5 dias de demonstração gratuita · Sem compromisso</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-white mb-6 leading-tight">
            Pare de perder dinheiro{" "}
            <span style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              com operação desorganizada
            </span>
          </h2>
          <p className="text-base mb-10" style={{ color: "rgba(255,255,255,0.45)" }}>
            Cada dia sem a Netvius é um dia de retrabalho, técnicos perdidos e clientes insatisfeitos.
            Fale agora com nossa equipe e veja uma demonstração ao vivo — em 30 minutos você já pode começar.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={whatsappLink} target="_blank" rel="noreferrer"
              className="flex items-center justify-center gap-3 px-8 py-4 rounded-2xl text-base font-bold transition-all"
              style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)", color: "#050b18", boxShadow: "0 0 50px rgba(0,245,160,0.3)", textDecoration: "none" }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(-2px)"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.transform = "translateY(0)"; }}>
              <MessageCircle size={20} />
              Falar no WhatsApp agora
            </a>
            <a href={apkLink} download="netvius-tecnico-v10.apk"
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
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "linear-gradient(135deg, #00f5a0, #00d9f5)" }}>
                <Wifi size={16} className="text-black" strokeWidth={2.5} />
              </div>
              <div>
                <span className="text-base font-black text-white">Netvius</span>
                <p className="text-xs" style={{ color: "rgba(255,255,255,0.32)" }}>Controle total da sua operação de campo</p>
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
              <a href="/admin/login" className="text-sm font-medium transition-colors"
                style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "white")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}>
                Painel Administrativo
              </a>
              <span className="hidden sm:block" style={{ color: "rgba(255,255,255,0.12)" }}>|</span>
              <a href="/superadmin/login" className="text-sm font-medium transition-colors"
                style={{ color: "rgba(255,255,255,0.4)", textDecoration: "none" }}
                onMouseEnter={e => (e.currentTarget.style.color = "white")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.4)")}>
                Área Master
              </a>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t text-center" style={{ borderColor: "rgba(255,255,255,0.06)" }}>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.2)" }}>
              © {new Date().getFullYear()} Netvius. Todos os direitos reservados. · Dados protegidos e criptografados · Infraestrutura cloud segura
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
