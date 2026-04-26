import { useAuth } from "@/_core/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { getLoginUrl } from "@/const";
import { useLocation } from "wouter";
import { Wifi, Shield, BarChart3, MapPin, Smartphone, CheckCircle } from "lucide-react";

export default function Home() {
  const { user, isAuthenticated } = useAuth();
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0f172a] flex flex-col">
      {/* Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-green-500 rounded-xl flex items-center justify-center">
            <Wifi className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-white font-bold text-xl leading-tight">Netvionis</h1>
            <p className="text-blue-300 text-xs">Gestão inteligente para equipes externas</p>
          </div>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 bg-transparent"
            onClick={() => navigate("/tecnico/login")}
          >
            <Smartphone className="w-4 h-4 mr-2" />
            App Técnico
          </Button>
          {isAuthenticated ? (
            <Button
              className="bg-green-500 hover:bg-green-600 text-white"
              onClick={() => navigate("/admin")}
            >
              Painel Admin
            </Button>
          ) : (
            <Button
              className="bg-green-500 hover:bg-green-600 text-white"
              onClick={() => (window.location.href = getLoginUrl())}
            >
              Entrar como Admin
            </Button>
          )}
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-green-500/20 border border-green-500/30 rounded-full px-4 py-1.5 mb-6">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-green-300 text-sm font-medium">Gestão inteligente para equipes externas</span>
        </div>

        <h2 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight max-w-3xl">
          Gestão completa de{" "}
          <span className="text-green-400">instalações de rede</span>{" "}
          em escolas
        </h2>

        <p className="text-blue-200 text-lg max-w-2xl mb-10">
          Controle total de técnicos, escolas e ordens de serviço. Atribuição inteligente por cidade,
          relatórios de desempenho e sincronização em tempo real entre o painel admin e o app do técnico.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          {isAuthenticated ? (
            <Button
              size="lg"
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-6 text-lg"
              onClick={() => navigate("/admin")}
            >
              Acessar Painel Admin
            </Button>
          ) : (
            <Button
              size="lg"
              className="bg-green-500 hover:bg-green-600 text-white px-8 py-6 text-lg"
              onClick={() => (window.location.href = getLoginUrl())}
            >
            Acessar Painel Admin       </Button>
          )}
          <Button
            size="lg"
            variant="outline"
            className="border-white/20 text-white hover:bg-white/10 bg-transparent px-8 py-6 text-lg"
            onClick={() => navigate("/tecnico/login")}
          >
            <Smartphone className="w-5 h-5 mr-2" />
            App do Técnico
          </Button>
        </div>

        {/* Features grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-4xl w-full">
          {[
            { icon: BarChart3, title: "Dashboard em tempo real", desc: "KPIs, produtividade e status de todas as escolas" },
            { icon: Shield, title: "Gestão de técnicos", desc: "Atribuição automática por cidade ou manual por escola" },
            { icon: MapPin, title: "Mapa interativo", desc: "Visualize todas as escolas com marcadores por status" },
            { icon: Wifi, title: "Ordens de Serviço", desc: "Criação automática ao concluir instalação" },
            { icon: Smartphone, title: "App do técnico", desc: "WhatsApp, Google Maps e conclusão de OS no campo" },
            { icon: CheckCircle, title: "Relatórios avançados", desc: "Filtros por técnico e período, ranking de desempenho" },
          ].map((f) => (
            <div key={f.title} className="bg-white/5 border border-white/10 rounded-xl p-5 text-left hover:bg-white/10 transition-colors">
              <f.icon className="w-8 h-8 text-green-400 mb-3" />
              <h3 className="text-white font-semibold mb-1">{f.title}</h3>
              <p className="text-blue-300 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </main>

      <footer className="text-center py-4 text-blue-400/60 text-sm border-t border-white/10">
        Netvionis © {new Date().getFullYear()} — Gestão inteligente para equipes externas
      </footer>
    </div>
  );
}
