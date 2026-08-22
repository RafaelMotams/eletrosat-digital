import { useState } from "react";
import { useLocation } from "wouter";
import { 
  ArrowRight, CheckCircle, Zap, Shield, TrendingUp, MapPin, 
  Smartphone, BarChart3, Wifi, Camera, Clock, Users, 
  Globe, Lock, FileText, Route, MessageCircle, ChevronRight,
  Play, Menu, X
} from "lucide-react";

export default function Home() {
  const [, setLocation] = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-white text-slate-900 overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-sm border-b border-slate-100 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center">
              <Wifi className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">Netvius</span>
          </div>
          
          <div className="hidden md:flex items-center gap-8">
            <a href="#funcionalidades" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">Funcionalidades</a>
            <a href="#como-funciona" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">Como Funciona</a>
            <a href="#seguranca" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">Segurança</a>
            <a href="#planos" className="text-sm font-medium text-slate-600 hover:text-slate-900 transition">Planos</a>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <a href="/admin/login" className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition">
              Entrar
            </a>
            <a href="https://wa.me/5575999142134?text=Olá! Quero conhecer o Netvius" target="_blank" rel="noopener" className="px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold transition shadow-sm">
              Falar com Vendas
            </a>
          </div>

          {/* Mobile menu button */}
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2">
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white border-t border-slate-100 px-4 py-4 space-y-3">
            <a href="#funcionalidades" className="block text-sm font-medium text-slate-600 py-2">Funcionalidades</a>
            <a href="#como-funciona" className="block text-sm font-medium text-slate-600 py-2">Como Funciona</a>
            <a href="#seguranca" className="block text-sm font-medium text-slate-600 py-2">Segurança</a>
            <a href="#planos" className="block text-sm font-medium text-slate-600 py-2">Planos</a>
            <hr className="border-slate-100" />
            <a href="/admin/login" className="block text-sm font-semibold text-emerald-600 py-2">Entrar no Painel</a>
            <a href="https://wa.me/5575999142134?text=Olá! Quero conhecer o Netvius" target="_blank" rel="noopener" className="block text-center px-5 py-2.5 rounded-lg bg-emerald-600 text-white text-sm font-semibold">
              Falar com Vendas
            </a>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section className="pt-28 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-b from-slate-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-sm font-medium text-emerald-700">Plataforma online para operação técnica</span>
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.1] tracking-tight text-slate-900">
                Gestão completa de{" "}
                <span className="text-emerald-600">equipes técnicas</span>{" "}
                em campo
              </h1>

              <p className="text-lg text-slate-600 leading-relaxed max-w-xl">
                Controle ordens de serviço, rotas, fotos e relatórios em tempo real. 
                Seus técnicos usam o app no celular. Você gerencia tudo pelo painel. 
                Simples assim.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <a href="/cadastro" className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-base transition shadow-lg shadow-emerald-600/20 group">
                  Criar conta <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                </a>
                <a href="/admin/login" className="inline-flex items-center justify-center gap-2 px-7 py-4 rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 font-semibold text-base transition">
                  <Lock className="w-4 h-4" /> Acessar Painel
                </a>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 text-sm text-slate-500">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-100 bg-emerald-50 px-3 py-1.5 font-medium text-emerald-700">
                  <Shield className="h-4 w-4" /> Acesso protegido por credenciais
                </span>
                <span>Operação de campo, relatórios e manutenção em uma única plataforma.</span>
              </div>
            </div>

            {/* Right - Dashboard Preview */}
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-2xl shadow-slate-200/50 border border-slate-200 p-6 space-y-4">
                {/* Demonstração visual — não representa dados de clientes */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                    <span className="text-sm font-semibold text-slate-700">Visão operacional — Painel Admin</span>
                  </div>
                  <span className="text-xs text-slate-400">Demonstração visual</span>
                </div>
                
                {/* Cartões demonstrativos */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-3 border border-blue-200">
                    <p className="text-xs text-blue-600 font-medium">Escolas</p>
                    <p className="text-sm font-bold text-blue-900">Cadastre e organize</p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-3 border border-emerald-200">
                    <p className="text-xs text-emerald-600 font-medium">Concluídas</p>
                    <p className="text-sm font-bold text-emerald-900">Acompanhe em tempo real</p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-3 border border-amber-200">
                    <p className="text-xs text-amber-600 font-medium">Pendentes</p>
                    <p className="text-sm font-bold text-amber-900">Priorize a equipe</p>
                  </div>
                </div>

                {/* Fluxo demonstrativo */}
                <div className="bg-slate-50 rounded-xl p-4 border border-slate-100">
                  <p className="text-xs font-semibold text-slate-500 mb-3">FLUXO DE ORDEM DE SERVIÇO</p>
                  {[
                    { escola: "Cadastrar local e INEP", tecnico: "Informações organizadas", status: "Cadastro", className: "bg-slate-200 text-slate-700" },
                    { escola: "Atribuir técnico", tecnico: "Equipe recebe no aplicativo", status: "Em campo", className: "bg-blue-100 text-blue-700" },
                    { escola: "Validar e exportar", tecnico: "Relatório com dados do seu tenant", status: "Conclusão", className: "bg-emerald-100 text-emerald-700" },
                  ].map((row, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-slate-100 last:border-0">
                      <div>
                        <p className="text-sm font-medium text-slate-700">{row.escola}</p>
                        <p className="text-xs text-slate-400">{row.tecnico}</p>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full ${row.className}`}>
                        {row.status}
                      </span>
                    </div>
                  ))}
                </div>

              {/* Indicador demonstrativo */}
              <div className="flex items-center gap-3">
                <div className="flex-1 bg-slate-100 rounded-full h-2.5">
                    <div className="bg-emerald-500 h-2.5 rounded-full" style={{ width: "100%" }}></div>
                </div>
                  <span className="text-sm font-semibold text-slate-700">Fluxo centralizado</span>
                </div>
              </div>

              {/* Floating Mobile App Card */}
              <div className="absolute -bottom-6 -left-6 bg-white rounded-xl shadow-xl border border-slate-200 p-3 w-48">
                <div className="flex items-center gap-2 mb-2">
                  <Smartphone className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-slate-700">App do Técnico</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500"></div>
                    <span className="text-xs text-slate-500">Detalhes e fotos da manutenção</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                    <span className="text-xs text-slate-500">GPS, mapas e contato rápido</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Segmentos atendidos */}
      <section className="py-8 px-4 border-y border-slate-100 bg-slate-50">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-center gap-8 text-slate-400">
          <p className="text-sm font-medium">Preparado para operações de:</p>
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
              { icon: Globe, title: "Telas já abertas em cache", desc: "A interface e rotas já visitadas podem permanecer disponíveis. Envio de fotos e atualizações exigem conexão.", color: "emerald" },
              { icon: BarChart3, title: "Relatórios e Planilhas", desc: "Exporta Excel com todas as OS, valores calculados, quilometragem e produtividade por técnico.", color: "amber" },
              { icon: MessageCircle, title: "Contato rápido", desc: "Quando o telefone estiver cadastrado, o técnico pode abrir uma ligação ou conversa pelo aplicativo de mensagens.", color: "green" },
              { icon: MapPin, title: "Mapa em Tempo Real", desc: "Veja todas as escolas no mapa com status colorido. Clique para ver detalhes e abrir rota.", color: "red" },
              { icon: Users, title: "Dados por cliente", desc: "Consultas e operações administrativas usam o tenant da sessão autenticada para separar os dados de cada cliente.", color: "indigo" },
              { icon: FileText, title: "Laudo em PDF", desc: "Gera laudo profissional com fotos, dados da escola, técnico e observações. Pronto para imprimir.", color: "slate" },
              { icon: Zap, title: "Assistente Técnico", desc: "Orientação especializada para dúvidas sobre instalação, configuração e infraestrutura.", color: "cyan" },
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
              { num: "03", title: "Técnico executa", desc: "No aplicativo, o técnico consulta local, GPS, contatos, fotos e observações da atividade atribuída.", icon: Smartphone },
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

          <div className="mt-14 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-xl shadow-slate-200/50">
            <div className="grid lg:grid-cols-[0.9fr_1.1fr]">
              <div className="flex flex-col justify-center bg-slate-950 p-8 text-white sm:p-10">
                <span className="mb-4 inline-flex w-fit items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">
                  <Play className="h-3.5 w-3.5 fill-current" /> Demonstração do fluxo
                </span>
                <h3 className="text-2xl font-extrabold">Da abertura à conclusão, com rastreabilidade.</h3>
                <p className="mt-3 text-sm leading-6 text-slate-300">Uma representação visual do ciclo de uma OS: técnico designado, execução documentada e atualização no painel administrativo.</p>
              </div>
              <div className="p-5 sm:p-8">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-inner">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <p className="text-xs font-bold tracking-wide text-slate-500">FLUXO DE ORDEM DE SERVIÇO</p>
                      <p className="mt-1 text-sm font-bold text-slate-800">Exemplo de acompanhamento operacional</p>
                    </div>
                    <div className="h-2.5 w-2.5 animate-pulse rounded-full bg-emerald-500" aria-label="Fluxo ativo" />
                  </div>
                  <div className="grid gap-3 sm:grid-cols-3">
                    {[
                      { number: "01", title: "OS criada", text: "Escola e técnico definidos", tone: "border-blue-200 bg-blue-50 text-blue-700" },
                      { number: "02", title: "Em campo", text: "GPS, fotos e observações", tone: "border-amber-200 bg-amber-50 text-amber-700" },
                      { number: "03", title: "Concluída", text: "Painel e relatório atualizados", tone: "border-emerald-200 bg-emerald-50 text-emerald-700" },
                    ].map((stage, index) => (
                      <div key={stage.number} className={`relative rounded-xl border p-4 ${stage.tone}`}>
                        <span className="text-xs font-black">{stage.number}</span>
                        <p className="mt-3 text-sm font-bold">{stage.title}</p>
                        <p className="mt-1 text-xs leading-5 opacity-80">{stage.text}</p>
                        {index < 2 && <ArrowRight className="absolute -right-5 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-slate-300 sm:block" />}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section id="seguranca" className="py-24 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8">
              <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900">
                Segurança em camadas.{" "}
                <span className="text-emerald-600">Dados sob controle.</span>
              </h2>
              <p className="text-lg text-slate-500 leading-relaxed">
                O Netvius aplica autenticação, sessões por cookie, limites contra abuso e validações de autorização por tenant. 
                Nenhum sistema pode prometer risco zero: a operação também depende de senhas fortes e gestão adequada dos acessos.
              </p>

              <div className="space-y-4">
                {[
                  { title: "Escopo por tenant", desc: "As rotas administrativas filtram operações pelo cliente presente na sessão autenticada." },
                  { title: "Auditoria de acesso", desc: "O sistema registra eventos de login para apoiar a investigação de acessos administrativos." },
                  { title: "Proteção contra abuso", desc: "Limites de requisição ajudam a reduzir tentativas repetidas de autenticação." },
                  { title: "Boas práticas operacionais", desc: "Revise acessos, use senhas únicas e solicite a revogação imediata de contas que não devem mais operar." },
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
                  { label: "Sessão administrativa", value: "Cookie HttpOnly", status: "active" },
                  { label: "Senha", value: "Hash no servidor", status: "active" },
                  { label: "Limites de acesso", value: "Rate limiting", status: "active" },
                  { label: "Autorização", value: "Por tenant", status: "active" },
                  { label: "Auditoria", value: "Eventos de login", status: "active" },
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
                <span className="text-sm text-emerald-300">Controles revisados continuamente</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Próximos passos */}
      <section id="planos" className="py-24 px-4 sm:px-6 lg:px-8 bg-slate-50">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16 max-w-3xl mx-auto">
            <h2 className="text-3xl sm:text-4xl font-extrabold text-slate-900 mb-4">
              Comece com uma operação organizada
            </h2>
            <p className="text-lg text-slate-500">
              Solicite uma demonstração ou crie uma solicitação de cadastro. A liberação do acesso passa por confirmação.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            {[
              { 
                name: "Cadastro", 
                price: "Solicite acesso", 
                desc: "Inicie pelo formulário público", 
                features: ["Solicitação com confirmação", "Conta administrativa própria", "Dados separados por cliente", "Painel e aplicativo técnico"],
                cta: "Criar conta",
                href: "/cadastro"
              },
              { 
                name: "Demonstração", 
                price: "Conheça o fluxo", 
                desc: "Entenda a operação antes de implantar", 
                features: ["Ordens e manutenções", "Relatórios e planilhas", "Laudos em PDF", "Assistente Técnico", "Acompanhamento por equipe"],
                highlight: true,
                cta: "Falar com vendas",
                href: "https://wa.me/5575999142134?text=Olá! Quero conhecer o Netvius"
              },
              { 
                name: "Implantação", 
                price: "Conforme operação", 
                desc: "Organize sua equipe e os dados iniciais", 
                features: ["Importação de escolas", "Técnicos e atribuições", "Configuração operacional", "Treinamento do fluxo de campo"],
                cta: "Falar com vendas",
                href: "https://wa.me/5575999142134?text=Olá! Quero organizar a implantação do Netvius"
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
            <a href="/cadastro" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-lg transition group">
              Criar conta <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
            </a>
            <a href="/admin/login" className="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-xl border border-slate-600 hover:border-slate-400 text-white font-semibold transition">
              <Lock className="w-4 h-4" /> Já tenho conta
            </a>
          </div>
          <p className="text-sm text-slate-400">
            Cadastro controlado • Acesso mediante confirmação • Operação organizada em um só lugar
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
