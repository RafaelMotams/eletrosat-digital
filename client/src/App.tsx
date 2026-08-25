import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { lazy, Suspense, useEffect, useRef } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import TecnicoLogin from "./pages/tecnico/Login";
import Home from "./pages/Home";
import SuperAdminLogin from "./pages/superadmin/Login";
import AdminLogin from "./pages/admin/Login";
import AdminCadastro from "./pages/admin/Cadastro";
import ConfirmarEmail from "./pages/admin/ConfirmarEmail";
import { OfflineSyncBanner } from "./components/OfflineSyncBanner";
import { chavesRotaTecnico, criarEscopoTecnicoLocal } from "@shared/tecnicoLocalState";
import { decidirRotaInicialTecnico, ROTA_OS_TTL_MS } from "@shared/tecnicoRouteState";

const AdminDashboard = lazy(() => import("./pages/admin/Dashboard"));
const AdminTecnicos = lazy(() => import("./pages/admin/Tecnicos"));
const AdminEscolas = lazy(() => import("./pages/admin/Escolas"));
const AdminAtribuicoes = lazy(() => import("./pages/admin/Atribuicoes"));
const AdminOrdens = lazy(() => import("./pages/admin/Ordens"));
const AdminRelatorios = lazy(() => import("./pages/admin/Relatorios"));
const AdminMapa = lazy(() => import("./pages/admin/Mapa"));
const AdminPlanilha = lazy(() => import("./pages/admin/Planilha"));
const AdminConfiguracoes = lazy(() => import("./pages/admin/Configuracoes"));
const AdminGerenciarEscolas = lazy(() => import("./pages/admin/GerenciarEscolas"));
const AdminConfiguracaoIA = lazy(() => import("./pages/admin/ConfiguracaoIA"));
const AdminManutencao = lazy(() => import("./pages/admin/Manutencao"));
const AdminEstoque = lazy(() => import("./pages/admin/Estoque"));
const TecnicoHome = lazy(() => import("./pages/tecnico/Home"));
const TecnicoOS = lazy(() => import("./pages/tecnico/OrdemServico"));
const TecnicoMapa = lazy(() => import("./pages/tecnico/Mapa"));
const TecnicoPerfil = lazy(() => import("./pages/tecnico/Perfil"));
const TecnicoHistorico = lazy(() => import("./pages/tecnico/Historico"));
const TecnicoRotaDia = lazy(() => import("./pages/tecnico/RotaDia"));
const TecnicoManutencao = lazy(() => import("./pages/tecnico/Manutencao"));
const TecnicoEstoque = lazy(() => import("./pages/tecnico/Estoque"));
const SuperAdminDashboard = lazy(() => import("./pages/superadmin/Dashboard"));

// Rotas do técnico que devem ser persistidas (exceto login)
const TECNICO_ROUTES = ["/tecnico", "/tecnico/mapa", "/tecnico/perfil", "/tecnico/historico", "/tecnico/rota", "/tecnico/estoque"];
const TECNICO_OS_PREFIX = "/tecnico/os/";
const LEGACY_ROUTE_KEYS = ["tecnico_active_os_route", "tecnico_active_os_ts", "tecnico_last_route"] as const;

// ESTRATÉGIA DE PERSISTÊNCIA:
// - localStorage isolado por tenant/técnico mantém a OS ativa por até 12h ao alternar para câmera,
//   WhatsApp ou Maps no Android.
// - a última rota de menu também permanece no mesmo namespace da sessão técnica.

function RoutePersistence() {
  const [location, navigate] = useLocation();
  const escopoRestauradoRef = useRef<string | null>(null);

  const escopoTecnico = criarEscopoTecnicoLocal(
    Number(localStorage.getItem("tecnico_tenant_id")),
    Number(localStorage.getItem("tecnico_id")),
  );
  const chavesRota = escopoTecnico ? chavesRotaTecnico(escopoTecnico) : null;

  useEffect(() => {
    if (!chavesRota) return;
    LEGACY_ROUTE_KEYS.forEach(chave => localStorage.removeItem(chave));
  }, [chavesRota]);

  useEffect(() => {
    if (!chavesRota) {
      escopoRestauradoRef.current = null;
      return;
    }

    // A restauração ocorre antes da escrita e somente uma vez por sessão isolada.
    if (escopoRestauradoRef.current !== chavesRota.ativa) {
      escopoRestauradoRef.current = chavesRota.ativa;
      const decisao = decidirRotaInicialTecnico({
        localizacao: location,
        rotaAtiva: localStorage.getItem(chavesRota.ativa),
        rotaAtivaEm: parseInt(localStorage.getItem(chavesRota.ativaTimestamp) || "0", 10),
        ultimoMenu: localStorage.getItem(chavesRota.ultimoMenu),
        agora: Date.now(),
        rotasMenu: TECNICO_ROUTES,
      });

      if (decisao.limparRotaAtiva) {
        localStorage.removeItem(chavesRota.ativa);
        localStorage.removeItem(chavesRota.ativaTimestamp);
      }
      if (decisao.destino) {
        navigate(decisao.destino, { replace: true });
        return;
      }
    }

    if (location.startsWith(TECNICO_OS_PREFIX)) {
      localStorage.setItem(chavesRota.ativa, location);
      localStorage.setItem(chavesRota.ativaTimestamp, String(Date.now()));
    } else if (TECNICO_ROUTES.includes(location)) {
      localStorage.setItem(chavesRota.ultimoMenu, location);
      localStorage.removeItem(chavesRota.ativa);
      localStorage.removeItem(chavesRota.ativaTimestamp);
    }
  }, [chavesRota, location, navigate]);

  return null;
}

function Router() {
  return (
    <Suspense fallback={<div className="grid min-h-screen place-items-center bg-slate-950 text-sm font-semibold text-slate-200">Carregando módulo seguro...</div>}>
    <Switch>
      <Route path="/" component={Home} />
      {/* Admin routes */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin/cadastro" component={AdminCadastro} />
      <Route path="/admin/confirmar-email" component={ConfirmarEmail} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/tecnicos" component={AdminTecnicos} />
      <Route path="/admin/escolas" component={AdminEscolas} />
      <Route path="/admin/atribuicoes" component={AdminAtribuicoes} />
      <Route path="/admin/ordens" component={AdminOrdens} />
      <Route path="/admin/relatorios" component={AdminRelatorios} />
      <Route path="/admin/mapa" component={AdminMapa} />
      <Route path="/admin/planilha" component={AdminPlanilha} />
      <Route path="/admin/configuracoes" component={AdminConfiguracoes} />

      <Route path="/admin/gerenciar-escolas" component={AdminGerenciarEscolas} />
      <Route path="/admin/configuracao-ia" component={AdminConfiguracaoIA} />
      <Route path="/admin/manutencao" component={AdminManutencao} />
      <Route path="/admin/estoque" component={AdminEstoque} />
      {/* Superadmin routes */}
      <Route path="/superadmin/login" component={SuperAdminLogin} />
      <Route path="/superadmin/dashboard" component={SuperAdminDashboard} />
      <Route path="/superadmin" component={SuperAdminLogin} />
      {/* Técnico app routes */}
      <Route path="/tecnico/login" component={TecnicoLogin} />
      <Route path="/tecnico" component={TecnicoHome} />
      <Route path="/tecnico/os/:id" component={TecnicoOS} />
      <Route path="/tecnico/mapa" component={TecnicoMapa} />
      <Route path="/tecnico/perfil" component={TecnicoPerfil} />
      <Route path="/tecnico/historico" component={TecnicoHistorico} />
      <Route path="/tecnico/rota" component={TecnicoRotaDia} />
      <Route path="/tecnico/manutencao" component={TecnicoManutencao} />
      <Route path="/tecnico/manutencao/:id" component={TecnicoManutencao} />
      <Route path="/tecnico/estoque" component={TecnicoEstoque} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
    </Suspense>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <OfflineSyncBanner />
          <RoutePersistence />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
