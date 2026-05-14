import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import { useEffect } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminTecnicos from "./pages/admin/Tecnicos";
import AdminEscolas from "./pages/admin/Escolas";
import AdminAtribuicoes from "./pages/admin/Atribuicoes";
import AdminOrdens from "./pages/admin/Ordens";
import AdminRelatorios from "./pages/admin/Relatorios";
import AdminMapa from "./pages/admin/Mapa";
import AdminPlanilha from "./pages/admin/Planilha";
import TecnicoLogin from "./pages/tecnico/Login";
import TecnicoHome from "./pages/tecnico/Home";
import TecnicoOS from "./pages/tecnico/OrdemServico";
import TecnicoMapa from "./pages/tecnico/Mapa";
import TecnicoPerfil from "./pages/tecnico/Perfil";
import TecnicoHistorico from "./pages/tecnico/Historico";
import Home from "./pages/Home";
import SuperAdminLogin from "./pages/superadmin/Login";
import SuperAdminDashboard from "./pages/superadmin/Dashboard";
import AdminLogin from "./pages/admin/Login";
import AdminConfiguracoes from "./pages/admin/Configuracoes";
import { OfflineSyncBanner } from "./components/OfflineSyncBanner";

// Rotas do técnico que devem ser persistidas (exceto login)
const TECNICO_ROUTES = ["/tecnico", "/tecnico/mapa", "/tecnico/perfil", "/tecnico/historico"];
const TECNICO_OS_PREFIX = "/tecnico/os/";

// ESTRATÉGIA DE PERSISTÊNCIA:
// - sessionStorage ("tecnico_session_route"): rota de OS ativa — limpa quando o app é fechado
//   completamente. Persiste ao trocar de app (câmera, WhatsApp, Maps) pois a sessão continua.
// - localStorage ("tecnico_last_route"): apenas rotas de menu (Home, Mapa, Perfil, Histórico)
//   — persiste entre sessões para que o técnico volte ao menu correto ao reabrir.

function RoutePersistence() {
  const [location, navigate] = useLocation();

  // Salvar rota atual
  useEffect(() => {
    if (location.startsWith(TECNICO_OS_PREFIX)) {
      // OS ativa: salva em sessionStorage (limpa ao fechar o app)
      sessionStorage.setItem("tecnico_session_route", location);
    } else if (TECNICO_ROUTES.includes(location)) {
      // Menu: salva em localStorage (persiste entre sessões)
      localStorage.setItem("tecnico_last_route", location);
      // Limpa a rota de OS da sessão ao navegar para o menu
      sessionStorage.removeItem("tecnico_session_route");
    }
  }, [location]);

  // Ao montar: restaurar rota
  useEffect(() => {
    const tecnicoId = localStorage.getItem("tecnico_id");
    if (!tecnicoId) return;

    const sessionRoute = sessionStorage.getItem("tecnico_session_route");
    const lastMenuRoute = localStorage.getItem("tecnico_last_route");
    const isAtRoot = location === "/" || location === "";
    const isAtTecnicoHome = location === "/tecnico";

    if (sessionRoute && sessionRoute.startsWith(TECNICO_OS_PREFIX)) {
      // Há uma OS ativa na sessão atual (app em background, não foi fechado)
      if (isAtRoot) {
        // Abriu via URL raiz mas tem sessão ativa — vai para o menu
        navigate(lastMenuRoute || "/tecnico", { replace: true });
      } else if (isAtTecnicoHome) {
        // SW serviu /tecnico como fallback ao voltar da câmera/WhatsApp
        navigate(sessionRoute, { replace: true });
      }
    } else {
      // Sem OS ativa na sessão (app foi fechado e reaberto)
      if (isAtRoot && lastMenuRoute && TECNICO_ROUTES.includes(lastMenuRoute)) {
        // Vai para o menu onde estava (Home, Mapa, etc.) — não para OS
        navigate(lastMenuRoute, { replace: true });
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      {/* Admin routes */}
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/tecnicos" component={AdminTecnicos} />
      <Route path="/admin/escolas" component={AdminEscolas} />
      <Route path="/admin/atribuicoes" component={AdminAtribuicoes} />
      <Route path="/admin/ordens" component={AdminOrdens} />
      <Route path="/admin/relatorios" component={AdminRelatorios} />
      <Route path="/admin/mapa" component={AdminMapa} />
      <Route path="/admin/planilha" component={AdminPlanilha} />
      <Route path="/admin/configuracoes" component={AdminConfiguracoes} />
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
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
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
