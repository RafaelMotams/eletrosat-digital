import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { lazy, Suspense, useEffect } from "react";
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
const OS_ROUTE_TTL = 12 * 60 * 60 * 1000; // 12 horas em ms
const LEGACY_ROUTE_KEYS = ["tecnico_active_os_route", "tecnico_active_os_ts", "tecnico_last_route"] as const;

// ESTRATÉGIA DE PERSISTÊNCIA:
// - localStorage (OS_ROUTE_KEY): rota de OS ativa com timestamp. Persiste ao abrir câmera,
//   WhatsApp, Maps no Android (onde sessionStorage pode ser limpo). Expira após 4h.
// - localStorage ("tecnico_last_route"): rotas de menu (Home, Mapa, Perfil, Histórico).

function RoutePersistence() {
  const [location, navigate] = useLocation();

  const escopoTecnico = criarEscopoTecnicoLocal(
    Number(localStorage.getItem("tecnico_tenant_id")),
    Number(localStorage.getItem("tecnico_id")),
  );
  const chavesRota = escopoTecnico ? chavesRotaTecnico(escopoTecnico) : null;

  useEffect(() => {
    if (!chavesRota) return;
    LEGACY_ROUTE_KEYS.forEach(chave => localStorage.removeItem(chave));
  }, [chavesRota]);

  // Salvar rota atual
  useEffect(() => {
    if (!chavesRota) return;
    if (location.startsWith(TECNICO_OS_PREFIX)) {
      // OS ativa: salva em localStorage com timestamp
      localStorage.setItem(chavesRota.ativa, location);
      localStorage.setItem(chavesRota.ativaTimestamp, String(Date.now()));
    } else if (TECNICO_ROUTES.includes(location)) {
      // Menu: salva rota de menu e limpa a OS ativa
      localStorage.setItem(chavesRota.ultimoMenu, location);
      localStorage.removeItem(chavesRota.ativa);
      localStorage.removeItem(chavesRota.ativaTimestamp);
    }
  }, [chavesRota, location]);

  // Ao montar: restaurar rota (apenas quando já estiver em rota do técnico)
  useEffect(() => {
    if (!chavesRota) return;

    const activeOsRoute = localStorage.getItem(chavesRota.ativa);
    const activeOsTs = parseInt(localStorage.getItem(chavesRota.ativaTimestamp) || "0", 10);
    const lastMenuRoute = localStorage.getItem(chavesRota.ultimoMenu);
    // Só redireciona se o usuário já estiver em uma rota do técnico (nunca da raiz /)
    const isAtTecnicoMenu = TECNICO_ROUTES.includes(location);

    // Verificar se a OS ativa ainda é válida (dentro do TTL de 12h)
    const osRouteValida = activeOsRoute &&
      activeOsRoute.startsWith(TECNICO_OS_PREFIX) &&
      (Date.now() - activeOsTs) < OS_ROUTE_TTL;

    if (osRouteValida) {
      // Há uma OS ativa válida — redireciona apenas se já estiver no menu do técnico
      if (isAtTecnicoMenu) {
        navigate(activeOsRoute!, { replace: true });
      }
    } else {
      // Sem OS ativa ou expirada
      localStorage.removeItem(chavesRota.ativa);
      localStorage.removeItem(chavesRota.ativaTimestamp);
      // Restaura última tela de menu visitada apenas se já estiver em /tecnico
      if (location === "/tecnico" && lastMenuRoute && TECNICO_ROUTES.includes(lastMenuRoute)) {
        navigate(lastMenuRoute, { replace: true });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
