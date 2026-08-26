import { useState } from "react";
import { 
  ArrowRight, CheckCircle, Zap, Shield, TrendingUp, MapPin, 
  Smartphone, BarChart3, Wifi, Camera, Clock, Users, 
  Globe, Lock, FileText, Route, MessageCircle, ChevronRight,
  Star, Play, Menu, X
} from "lucide-react";

export default function Home() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen overflow-hidden bg-white text-slate-900">
      {/* Navigation */}
      <nav className="fixed top-0 z-50 w-full border-b border-white/10 bg-slate-950/75 text-white shadow-[0_10px_40px_rgba(2,6,23,.25)] backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-teal-600 shadow-lg shadow-emerald-500/20">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold tracking-tight text-white">Netvius</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#funcionalidades" className="text-sm font-medium text-slate-300 transition hover:text-white">Funcionalidades</a>
            <a href="#como-funciona" className="text-sm font-medium text-slate-300 transition hover:text-white">Como Funciona</a>
            <a href="#seguranca" className="text-sm font-medium text-slate-300 transition hover:text-white">Segurança</a>
            <a href="#planos" className="text-sm font-medium text-slate-300 transition hover:text-white">Planos</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href="/admin/login" className="px-4 py-2 text-sm font-medium text-slate-200 transition hover:text-white">
              Entrar
            </a>
            <a href="https://wa.me/5575999142134?text=Olá! Quero conhecer o Netvius" target="_blank" rel="noopener" className="rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-slate-950 transition hover:bg-emerald-50 shadow-lg shadow-black/20">
              Falar com Vendas
            </a>
          </div>

          {/* Mobile menu button */}
          <button aria-label={mobileMenuOpen ? "Fechar menu" : "Abrir menu"} onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="rounded-lg p-2 text-white transition hover:bg-white/10 md:hidden">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="space-y-2 border-t border-white/10 bg-slate-950 px-4 py-4 md:hidden">
            <a href="#funcionalidades" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10">Funcionalidades</a>
            <a href="#como-funciona" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10">Como Funciona</a>
            <a href="#seguranca" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10">Segurança</a>
            <a href="#planos" className="block rounded-lg px-3 py-2 text-sm font-medium text-slate-200 hover:bg-white/10">Planos</a>
            <hr className="border-white/10" />
            <a href="/admin/login" className="block px-3 py-2 text-sm font-semibold text-emerald-300">Entrar no Painel</a>
            <a href="https://wa.me/5575999142134?text=Olá! Quero conhecer o Netvius" target="_blank" rel="noopener" className="block rounded-xl bg-white px-5 py-3 text-center text-sm font-bold text-slate-950">
              Falar com Vendas
            </a>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="relative isolate overflow-hidden bg-[#071426] px-4 pb-20 pt-32 text-white sm:px-6 lg:px-8 lg:pb-28">
        <div className="absolute inset-0 -z-20 bg-[radial-gradient(circle_at_78%_24%,rgba(16,185,129,.2),transparent_25%),radial-gradient(circle_at_5%_75%,rgba(56,189,248,.18),transparent_32%)]" />
        <div className="absolute inset-y-0 right-0 -z-10 w-full bg-[linear-gradient(110deg,rgba(7,20,38,1)_15%,rgba(7,20,38,.58)_48%,rgba(7,20,38,.1)_100%)]" />
        <div className="max-w-7xl mx-auto">
          <div className="grid items-center gap-14 lg:grid-cols-[.92fr_1.08fr] lg:gap-8">
            {/* Left Content */}
            <div className="relative z-10 space-y-8">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-300/25 bg-emerald-300/10 px-4 py-2 shadow-lg shadow-emerald-950/20 backdrop-blur">
                <div className="h-2 w-2 rounded-full bg-emerald-300 shadow-[0_0_16px_rgba(110,231,183,.8)]"></div>
                <span className="text-sm font-semibold text-emerald-100">Operação de campo e gestão em uma só plataforma</span>
              </div>

              <h1 className="max-w-2xl text-4xl font-extrabold leading-[1.04] tracking-[-.045em] text-white sm:text-5xl lg:text-6xl">
                A operação em campo, <span className="bg-gradient-to-r from-emerald-300 via-teal-200 to-sky-300 bg-clip-text text-transparent">vista do jeito certo.</span>
              </h1>

              <p className="max-w-xl text-lg leading-relaxed text-slate-300">
                Planeje rotas, acompanhe ordens, registre evidências e organize a gestão no mesmo fluxo — do celular do técnico ao painel da empresa.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <a href="/admin/cadastro" className="group inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-400 px-7 py-4 text-base font-bold text-slate-950 shadow-xl shadow-emerald-500/20 transition hover:-translate-y-0.5 hover:bg-emerald-300">
                  Solicitar demonstração <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                </a>
                <a href="/admin/login" className="inline-flex items-center justify-center gap-2 rounded-xl border border-white/20 bg-white/5 px-7 py-4 text-base font-semibold text-white backdrop-blur transition hover:bg-white/10">
                  <Lock className="w-4 h-4" /> Acessar Painel
                </a>
              </div>

              <div className="grid max-w-xl grid-cols-3 gap-3 border-t border-white/10 pt-6 text-xs text-slate-300 sm:text-sm">
                <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 shrink-0 text-emerald-300" /> Rotas e OS</span>
                <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 shrink-0 text-emerald-300" /> Fotos e laudos</span>
                <span className="flex items-center gap-2"><CheckCircle className="h-4 w-4 shrink-0 text-emerald-300" /> Gestão por empresa</span>
              </div>
            </div>

            {/* Right - 3D product composition */}
            <div className="relative mx-auto w-full max-w-2xl lg:-mr-10">
              <div className="absolute inset-8 rounded-[2.5rem] bg-emerald-400/20 blur-3xl" />
              <img src="/manus-storage/netvius-hero-3d_affc93bb.png" alt="Visual 3D de dispositivos conectados à operação Netvius" className="relative w-full drop-shadow-[0_34px_45px_rgba(0,0,0,.42)]" />
              <div className="absolute bottom-2 left-2 rounded-2xl border border-white/15 bg-slate-950/70 p-3.5 shadow-2xl backdrop-blur-xl sm:bottom-7 sm:left-7">
                <div className="flex items-center gap-2"><div className="grid h-8 w-8 place-items-center rounded-lg bg-emerald-400/15"><Route className="h-4 w-4 text-emerald-300" /></div><div><p className="text-xs font-bold text-white">Execução conectada</p><p className="mt-0.5 text-[11px] text-slate-300">Do campo ao painel</p></div></div>
              </div>
              <div className="absolute right-3 top-4 hidden rounded-xl border border-white/15 bg-white/10 px-3 py-2 text-xs font-semibold text-white shadow-xl backdrop-blur-xl sm:block">App + Painel</div>
            </div>
          </div>
        </div>
      </section>

      {/* Social Proof Bar */}
      <section className="py-8 px-4 border-y border-slate-100 bg-slate-50">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-8 text-slate-400">
          <p className="text-sm font-medium">Usado por empresas de:</p>
          <div className="flex flex-wrap items-center gap-6">
            {["Telecom", "Energia Solar", "Segurança", "Climatização", "Infraestrutura"].map((seg, i) => (
              <span key={i} className="text-sm font-semibold text-slate-500 bg-white px-3 py-1.5 rounded-lg border border-slate-200">{seg}</span>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="funcionalidades" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
              Tudo que sua operação precisa em um só lugar
            </h2>
            <p className="text-lg text-slate-500">
              Do planejamento à execução. Do técnico em campo ao relatório final. 
              Controle total sem complicação.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: Route, title: "Roteirização Inteligente", desc: "Organiza a rota do técnico por proximidade GPS. Menos km rodados, mais produtividade.", color: "blue" },
              { icon: Camera, title: "Fotos Obrigatórias", desc: "Técnico registra antes e depois. Mapa de calor, APs, etiquetas. Tudo documentado.", color: "purple" },
              { icon: Globe, title: "Funciona Offline", desc: "App funciona sem internet. Fotos, conclusões e dados sincronizam automaticamente ao reconectar.", color: "emerald" },
              { icon: BarChart3, title: "Relatórios e Planilhas", desc: "Exporta Excel com todas as OS, valores calculados, quilometragem e produtividade por técnico.", color: "amber" },
              { icon: MessageCircle, title: "WhatsApp Integrado", desc: "Botão direto para ligar ou enviar mensagem para a escola. Número já cadastrado no sistema.", color: "green" },
              { icon: MapPin, title: "Mapa em Tempo Real", desc: "Veja todas as escolas no mapa com status colorido. Clique para ver detalhes e abrir rota.", color: "red" },
              { icon: Users, title: "Multi-Tenant", desc: "Cada cliente tem seu painel isolado. Dados separados, login próprio, gestão independente.", color: "indigo" },
              { icon: FileText, title: "Laudo em PDF", desc: "Gera laudo profissional com fotos, dados da escola, técnico e observações. Pronto para imprimir.", color: "slate" },
              { icon: Zap, title: "IA Assistente", desc: "Assistente técnico com IA para tirar dúvidas sobre instalação, configuração e infraestrutura.", color: "cyan" },
            ].map((feature, i) => (
              <div key={i} className="group p-6 rounded-2xl border border-slate-200 hover:border-slate-300 hover:shadow-lg transition-all duration-300 bg-white">
                <div className={`w-12 h-12 rounded-xl bg-${feature.color}-100 flex items-center justify-center mb-4 group-hover:scale-110 transition`}>
                  <feature.icon className={`w-6 h-6 text-${feature.color}-600`} />
                </div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{feature.title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Demonstração visual do fluxo operacional */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-950 text-white">
        <div className="max-w-7xl mx-auto grid lg:grid-cols-[0.8fr_1.2fr] gap-14 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.16em] text-emerald-300">
              <Play className="h-3.5 w-3.5" /> Fluxo demonstrativo
            </div>
            <h2 className="mt-5 text-3xl sm:text-4xl font-extrabold leading-tight">Da abertura à conclusão, sem perder o histórico.</h2>
            <p className="mt-5 text-base sm:text-lg leading-relaxed text-slate-300">Acompanhe uma ordem avançando pelas etapas operacionais. O técnico recebe a atividade, registra evidências e a gestão consulta o resultado no painel.</p>
            <div className="mt-7 grid sm:grid-cols-2 gap-3 text-sm text-slate-300">
              {["Atribuição por empresa e técnico", "Fotos e observações da execução", "Status atualizado no painel", "Relatório disponível para conferência"].map(item => (
                <div key={item} className="flex items-center gap-2"><CheckCircle className="h-4 w-4 text-emerald-400" /> {item}</div>
              ))}
            </div>
          </div>

          <div className="relative rounded-[2rem] border border-white/10 bg-white/[0.06] p-5 sm:p-7 shadow-2xl shadow-emerald-950/30 backdrop-blur">
            <div className="flex items-center justify-between border-b border-white/10 pb-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">Ordem demonstrativa</p><p className="mt-1 font-bold">Fluxo de atendimento</p></div>
              <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">Sincronizado</span>
            </div>
            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              {[
                { icon: Clock, label: "1. Ordem criada", text: "Responsável e local definidos", color: "text-amber-300", bg: "bg-amber-400/10" },
                { icon: Camera, label: "2. Em execução", text: "Fotos, km e observações", color: "text-sky-300", bg: "bg-sky-400/10" },
                { icon: CheckCircle, label: "3. Concluída", text: "Relatório pronto para gestão", color: "text-emerald-300", bg: "bg-emerald-400/10" },
              ].map((step, index) => (
                <div key={step.label} className="relative rounded-2xl border border-white/10 bg-slate-950/55 p-4">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-xl ${step.bg}`}><step.icon className={`h-5 w-5 ${step.color}`} /></div>
                  <p className="mt-4 text-sm font-bold">{step.label}</p>
                  <p className="mt-1 text-xs leading-relaxed text-slate-400">{step.text}</p>
                  {index < 2 && <span className="absolute -right-3 top-1/2 hidden h-2 w-2 -translate-y-1/2 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(52,211,153,.9)] sm:block animate-pulse" />}
                </div>
              ))}
            </div>
            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/55 p-4">
              <div className="flex items-center justify-between text-xs text-slate-400"><span>Progresso da operação</span><span className="font-bold text-emerald-300">3 de 3 etapas</span></div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/10"><div className="h-full w-full rounded-full bg-gradient-to-r from-sky-400 via-teal-400 to-emerald-400" /></div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="como-funciona" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
              Simples de usar. Poderoso de verdade.
            </h2>
            <p className="text-lg text-slate-500">
              Em 4 passos sua equipe está operando com controle total.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {[
              { num: "01", title: "Cadastre escolas", desc: "Importe sua planilha Excel com escolas, INEP, coordenadas e técnicos. O sistema organiza tudo.", icon: FileText },
              { num: "02", title: "Atribua técnicos", desc: "Atribuição automática por cidade ou manual por escola. Técnico recebe no app instantaneamente.", icon: Users },
              { num: "03", title: "Técnico executa", desc: "App offline com GPS, fotos obrigatórias, WhatsApp da escola e rota otimizada.", icon: Smartphone },
              { num: "04", title: "Você controla", desc: "Dashboard em tempo real, relatórios, laudos PDF e exportação Excel. Pronto para faturar.", icon: BarChart3 },
            ].map((step, i) => (
              <div key={i} className="relative text-center">
                <div className="w-16 h-16 rounded-2xl bg-white border-2 border-emerald-200 flex items-center justify-center mx-auto mb-4 shadow-sm">
                  <step.icon className="w-7 h-7 text-emerald-600" />
                </div>
                <div className="text-xs font-bold text-emerald-600 mb-2">PASSO {step.num}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{step.title}</h3>
                <p className="text-sm text-slate-500">{step.desc}</p>
                {i < 3 && <ChevronRight className="hidden lg:block absolute top-8 -right-4 w-6 h-6 text-slate-300" />}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="seguranca" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                Segurança aplicada ao acesso e à operação.
              </h2>
              <p className="text-lg text-slate-500 leading-relaxed">
                O sistema registra acessos e aplica proteção contra tentativas repetidas de login. O isolamento por empresa é validado no acesso ao painel.
              </p>

              <div className="space-y-4">
                {[
                  { title: "Dados por empresa", desc: "Cada sessão de cliente é vinculada à empresa cadastrada." },
                  { title: "Logs de Auditoria", desc: "Cada login é salvo com IP, dispositivo e horário. Histórico completo de acessos." },
                  { title: "Proteção Brute Force", desc: "Bloqueio automático após 5 tentativas erradas. Conta protegida contra invasão." },
                  { title: "Confirmação de email", desc: "Novas contas exigem confirmação do email antes de liberar o acesso." },
                ].map((item, i) => (
                  <div key={i} className="flex gap-4">
                    <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Shield className="w-4 h-4 text-emerald-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-900">{item.title}</h4>
                      <p className="text-sm text-slate-500">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-slate-900 rounded-2xl p-8 text-white space-y-6">
              <div className="flex items-center gap-3">
                <Lock className="w-8 h-8 text-emerald-400" />
                <h3 className="text-xl font-bold">Painel de Segurança</h3>
              </div>
              <div className="space-y-3">
                {[
                  { label: "Sessão", value: "Token de acesso", status: "active" },
                  { label: "Cadastro", value: "Confirmação por email", status: "active" },
                  { label: "Rate Limiting", value: "5 tentativas/15min", status: "active" },
                  { label: "Isolamento", value: "Por tenant", status: "active" },
                  { label: "Logs de acesso", value: "IP + dispositivo", status: "active" },
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between py-2 border-b border-slate-700 last:border-0">
                    <span className="text-sm text-slate-300">{item.label}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-white">{item.value}</span>
                      <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    </div>
                  </div>
                ))}
              </div>
              <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-lg p-3 flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-sm text-emerald-300">Todos os sistemas operacionais</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="planos" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
              Planos que cabem na sua operação
            </h2>
            <p className="text-lg text-slate-500">
              Comece com cinco dias de demonstração e escolha a configuração adequada à sua operação.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { 
                name: "Básico", 
                price: "Demonstração", 
                desc: "Para operações pequenas", 
                features: ["Cadastro da empresa", "App técnico", "GPS e rotas", "Relatórios", "Suporte comercial"],
                cta: "Criar conta",
                href: "/admin/cadastro"
              },
              { 
                name: "Profissional", 
                price: "Sob proposta", 
                desc: "Para empresas em crescimento", 
                features: ["Fotos de atendimento", "Laudo em PDF", "Relatórios avançados", "Manutenção", "Apoio à configuração"],
                highlight: true,
                cta: "Falar com vendas",
                href: "https://wa.me/5575999142134?text=Olá! Quero conhecer o Netvius"
              },
              { 
                name: "Enterprise", 
                price: "Sob consulta", 
                desc: "Para grandes operações", 
                features: ["Configuração por empresa", "Equipe de campo", "Importação de dados", "Onboarding", "Condições personalizadas"],
                cta: "Falar com vendas",
                href: "https://wa.me/5575999142134?text=Olá! Quero conhecer o Netvius"
              },
            ].map((plan, i) => (
              <div key={i} className={`relative p-8 rounded-2xl transition-all duration-300 ${plan.highlight ? "bg-white border-2 border-emerald-500 shadow-xl shadow-emerald-100 scale-[1.02]" : "bg-white border border-slate-200 hover:shadow-lg"}`}>
                {plan.highlight && (
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-emerald-600 text-white text-xs font-bold">
                    RECOMENDADO
                  </div>
                )}
                <h3 className="text-xl font-bold text-slate-900 mb-1">{plan.name}</h3>
                <p className="text-sm text-slate-500 mb-4">{plan.desc}</p>
                <p className="text-4xl font-extrabold text-slate-900 mb-6">
                  {plan.price}
                </p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-sm text-slate-600">
                      <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" /> {f}
                    </li>
                  ))}
                </ul>
                <a 
                  href={plan.href}
                  target={plan.href.startsWith("http") ? "_blank" : undefined}
                  rel={plan.href.startsWith("http") ? "noopener" : undefined}
                  className={`block w-full text-center py-3 rounded-xl font-semibold transition ${plan.highlight ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-slate-100 hover:bg-slate-200 text-slate-700"}`}
                >
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-900">
        <div className="max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white leading-tight">
            Sua equipe em campo merece uma gestão profissional
          </h2>
          <p className="text-lg text-slate-300 max-w-2xl mx-auto">
            Chega de planilhas, grupos de WhatsApp e ligações para saber o status. 
            Com o Netvius, você controla tudo em tempo real.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href="/admin/cadastro" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg transition group">
              Testar Grátis por 5 Dias <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
            </a>
            <a href="/admin/login" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-slate-600 hover:border-slate-400 text-white font-semibold transition">
              <Lock className="w-4 h-4" /> Já tenho conta
            </a>
          </div>
          <p className="text-sm text-slate-400">
            Sem cartão de crédito • Suporte por WhatsApp • Cancele quando quiser
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-white py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="flex items-center gap-2 mb-4">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
                  <Wifi className="w-4 h-4 text-white" />
                </div>
                <span className="font-bold text-slate-900">Netvius</span>
              </div>
              <p className="text-sm text-slate-500">Gestão completa de equipes técnicas em campo. Controle, produtividade e resultados.</p>
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-4">Produto</p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="#funcionalidades" className="hover:text-slate-900 transition">Funcionalidades</a></li>
                <li><a href="#planos" className="hover:text-slate-900 transition">Planos</a></li>
                <li><a href="#seguranca" className="hover:text-slate-900 transition">Segurança</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-4">Acesso</p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="/admin/login" className="hover:text-slate-900 transition">Painel Admin</a></li>
                <li><a href="/tecnico/login" className="hover:text-slate-900 transition">App do Técnico</a></li>
                <li><a href="/superadmin/login" className="hover:text-slate-900 transition">Área Master</a></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-slate-900 mb-4">Contato</p>
              <ul className="space-y-2 text-sm text-slate-500">
                <li><a href="https://wa.me/5575999142134" target="_blank" rel="noopener" className="hover:text-slate-900 transition flex items-center gap-1"><MessageCircle className="w-3 h-3" /> (75) 99914-2134</a></li>
                <li><a href="mailto:contato@netvius.org" className="hover:text-slate-900 transition">contato@netvius.org</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-100 pt-8 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-400">
            <p>&copy; 2026 Netvius. Todos os direitos reservados.</p>
            <p className="mt-2 sm:mt-0">Feito com dedicação para equipes que fazem acontecer.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
