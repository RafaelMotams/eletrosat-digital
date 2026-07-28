import { useState, useEffect } from "react";
import { useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { ArrowRight, CheckCircle, Zap, Shield, TrendingUp, MapPin, Smartphone, BarChart3, Headphones } from "lucide-react";

export default function Home() {
  const { user } = useAuth();
  const [, setLocation] = useLocation();
  const [scrollY, setScrollY] = useState(0);

  useEffect(() => {
    const handleScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (user) {
      setLocation(user.role === "admin" ? "/admin" : "/superadmin");
    }
  }, [user, setLocation]);

  const loginUrl = getLoginUrl();

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white overflow-hidden">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 backdrop-blur-md bg-slate-950/80 border-b border-slate-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-cyan-400 to-blue-600 flex items-center justify-center font-bold text-lg">N</div>
            <span className="text-xl font-bold">Netvius</span>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="text-sm text-slate-400 hover:text-white transition">Funcionalidades</a>
            <a href="#how" className="text-sm text-slate-400 hover:text-white transition">Como Funciona</a>
            <a href="#pricing" className="text-sm text-slate-400 hover:text-white transition">Planos</a>
          </div>
                <a href={loginUrl} className="px-6 py-2 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition font-semibold text-sm">
                  Entrar
                </a>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-20 left-10 w-72 h-72 bg-cyan-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
          <div className="absolute top-40 right-10 w-72 h-72 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl"></div>
        </div>

        <div className="max-w-7xl mx-auto relative z-10">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="inline-block px-4 py-2 rounded-full bg-cyan-500/10 border border-cyan-500/30">
                <span className="text-sm font-semibold text-cyan-400">🚀 Plataforma online • Sincronização em tempo real</span>
              </div>

              <h1 className="text-5xl lg:text-6xl font-black leading-tight">
                Cada técnico em campo,<br />
                <span className="bg-gradient-to-r from-cyan-400 via-blue-400 to-cyan-300 bg-clip-text text-transparent">cada centavo no lugar certo</span>
              </h1>

              <p className="text-lg text-slate-300 leading-relaxed">
                Netvius sincroniza sua equipe em tempo real. Técnicos em campo com GPS, fotos, WhatsApp. Você no painel vendo tudo acontecer. Sem retrabalho. Sem surpresas. Só lucro.
              </p>

              <div className="flex flex-col sm:flex-row gap-4">
                <a href={loginUrl} className="px-8 py-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition font-bold text-lg flex items-center justify-center gap-2 group">
                  Começar Agora <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition" />
                </a>
                <button className="px-8 py-4 rounded-lg border border-slate-600 hover:border-slate-400 hover:bg-slate-800/50 transition font-semibold">
                  Ver Demo
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-cyan-400">500+</p>
                  <p className="text-sm text-slate-400">Técnicos ativos</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-cyan-400">50k+</p>
                  <p className="text-sm text-slate-400">Ordens/mês</p>
                </div>
                <div className="space-y-1">
                  <p className="text-2xl font-bold text-cyan-400">98%</p>
                  <p className="text-sm text-slate-400">Satisfação</p>
                </div>
              </div>
            </div>

            {/* Right - 3D Image */}
            <div className="relative h-96 lg:h-full flex items-center justify-center">
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent"></div>
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310419663030733594/mgcPKMbXVe7rcPq6qpnUme/netvius-desktop-3d-ABemCkwinitgEEw6b28oFN.webp"
                alt="Netvius Dashboard"
                className="w-full h-auto object-contain drop-shadow-2xl"
                style={{ transform: `translateY(${scrollY * 0.05}px)` }}
              />
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/50 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Tudo que você precisa para vencer</h2>
            <p className="text-lg text-slate-400">Sincronização, rastreamento, relatórios e segurança em uma plataforma</p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: MapPin, title: "GPS em Tempo Real", desc: "Veja exatamente onde cada técnico está, sempre" },
              { icon: Smartphone, title: "App Offline", desc: "Funciona sem internet. Sincroniza automaticamente" },
              { icon: Zap, title: "Sem Retrabalho", desc: "Fotos, observações e status sincronizados ao vivo" },
              { icon: BarChart3, title: "Relatórios Automáticos", desc: "Tudo documentado. Pronto para faturar" },
              { icon: Shield, title: "100% Seguro", desc: "Dados criptografados, backup na nuvem" },
              { icon: Headphones, title: "Suporte 24/7", desc: "Equipe sempre pronta para ajudar" },
            ].map((feature, i) => (
              <div key={i} className="p-6 rounded-2xl bg-slate-800/50 border border-slate-700 hover:border-cyan-500/50 hover:bg-slate-800 transition group">
                <feature.icon className="w-12 h-12 text-cyan-400 mb-4 group-hover:scale-110 transition" />
                <h3 className="text-lg font-bold mb-2">{feature.title}</h3>
                <p className="text-slate-400">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how" className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <h2 className="text-4xl font-black text-center mb-16">Como Funciona</h2>

          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              {[
                { num: "01", title: "Técnico recebe OS", desc: "Atribuição automática com GPS e WhatsApp" },
                { num: "02", title: "Trabalha offline", desc: "App funciona sem internet, tira fotos, anota tudo" },
                { num: "03", title: "Sincroniza", desc: "Quando conecta, tudo vai pro seu painel em segundos" },
                { num: "04", title: "Você fatura", desc: "Relatório pronto, sem erros, sem atraso" },
              ].map((step, i) => (
                <div key={i} className="flex gap-4">
                  <div className="text-3xl font-black text-cyan-400 min-w-fit">{step.num}</div>
                  <div>
                    <h3 className="text-xl font-bold mb-2">{step.title}</h3>
                    <p className="text-slate-400">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="relative h-96 lg:h-full flex items-center justify-center">
              <img
                src="https://d2xsxph8kpxj0f.cloudfront.net/310419663030733594/mgcPKMbXVe7rcPq6qpnUme/netvius-mobile-3d-DSVaSYoFjVFV4YqyGmM84A.webp"
                alt="Netvius Mobile App"
                className="w-full h-auto object-contain drop-shadow-2xl"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-900/50 border-t border-slate-800">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black mb-4">Planos Simples e Diretos</h2>
            <p className="text-lg text-slate-400">Sem surpresas. Sem taxas escondidas.</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              { name: "Startup", price: "R$ 299", desc: "Até 10 técnicos", features: ["App offline", "GPS em tempo real", "Relatórios básicos", "Suporte por email"] },
              { name: "Profissional", price: "R$ 899", desc: "Até 50 técnicos", features: ["Tudo do Startup", "Relatórios avançados", "Integração WhatsApp", "Suporte prioritário"], highlight: true },
              { name: "Empresa", price: "Customizado", desc: "Ilimitado", features: ["Tudo do Profissional", "API customizada", "Suporte 24/7", "Onboarding dedicado"] },
            ].map((plan, i) => (
              <div key={i} className={`p-8 rounded-2xl border transition ${plan.highlight ? "bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border-cyan-500/50 lg:scale-105" : "bg-slate-800/50 border-slate-700 hover:border-slate-600"}`}>
                <h3 className="text-2xl font-bold mb-2">{plan.name}</h3>
                <p className="text-slate-400 mb-4">{plan.desc}</p>
                <p className="text-4xl font-black mb-6 text-cyan-400">{plan.price}<span className="text-lg text-slate-400">/mês</span></p>
                <ul className="space-y-3 mb-8">
                  {plan.features.map((f, j) => (
                    <li key={j} className="flex items-center gap-2 text-slate-300">
                      <CheckCircle className="w-5 h-5 text-cyan-400" /> {f}
                    </li>
                  ))}
                </ul>
                <Button className="w-full py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition font-bold">
                  Começar Agora
                </Button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-gradient-to-r from-cyan-500 to-blue-600 mix-blend-multiply filter blur-3xl"></div>
        </div>

        <div className="max-w-4xl mx-auto relative z-10 text-center space-y-8">
          <h2 className="text-4xl lg:text-5xl font-black leading-tight">
            Pare de perder dinheiro com operação desorganizada
          </h2>
          <p className="text-xl text-slate-300">
            Centenas de empresas já aumentaram sua eficiência em 40%. Você está esperando o quê?
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <a href={loginUrl} className="px-8 py-4 rounded-lg bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 transition font-bold text-lg">
              Começar Teste Grátis
            </a>
            <button className="px-8 py-4 rounded-lg border border-slate-600 hover:border-slate-400 hover:bg-slate-800/50 transition font-semibold">
              Falar com Vendas
            </button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <p className="font-bold mb-4">Netvius</p>
              <p className="text-sm text-slate-400">Gestão inteligente para equipes em campo</p>
            </div>
            <div>
              <p className="font-bold mb-4">Produto</p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">Funcionalidades</a></li>
                <li><a href="#" className="hover:text-white transition">Preços</a></li>
                <li><a href="#" className="hover:text-white transition">Segurança</a></li>
              </ul>
            </div>
            <div>
              <p className="font-bold mb-4">Empresa</p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">Sobre</a></li>
                <li><a href="#" className="hover:text-white transition">Blog</a></li>
                <li><a href="#" className="hover:text-white transition">Contato</a></li>
              </ul>
            </div>
            <div>
              <p className="font-bold mb-4">Legal</p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-white transition">Privacidade</a></li>
                <li><a href="#" className="hover:text-white transition">Termos</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-800 pt-8 flex flex-col sm:flex-row justify-between items-center text-sm text-slate-400">
            <p>&copy; 2026 Netvius. Todos os direitos reservados.</p>
            <div className="flex gap-4 mt-4 sm:mt-0">
              <a href="#" className="hover:text-white transition">Twitter</a>
              <a href="#" className="hover:text-white transition">LinkedIn</a>
              <a href="#" className="hover:text-white transition">GitHub</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
