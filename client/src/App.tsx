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
const OS_ROUTE_KEY = "tecnico_active_os_route";
const OS_ROUTE_TS_KEY = "tecnico_active_os_ts";
const OS_ROUTE_TTL = 4 * 60 * 60 * 1000; // 4 horas em ms

// ESTRATÉGIA DE PERSISTÊNCIA:
// - localStorage (OS_ROUTE_KEY): rota de OS ativa com timestamp. Persiste ao abrir câmera,
//   WhatsApp, Maps no Android (onde sessionStorage pode ser limpo). Expira após 4h.
// - localStorage ("tecnico_last_route"): rotas de menu (Home, Mapa, Perfil, Histórico).

function RoutePersistence() {
  const [location, navigate] = useLocation();

  // Salvar rota atual
  useEffect(() => {
    if (location.startsWith(TECNICO_OS_PREFIX)) {
      // OS ativa: salva em localStorage com timestamp
      localStorage.setItem(OS_ROUTE_KEY, location);
      localStorage.setItem(OS_ROUTE_TS_KEY, String(Date.now()));
    } else if (TECNICO_ROUTES.includes(location)) {
      // Menu: salva rota de menu e limpa a OS ativa
      localStorage.setItem("tecnico_last_route", location);
      localStorage.removeItem(OS_ROUTE_KEY);
      localStorage.removeItem(OS_ROUTE_TS_KEY);
    }
  }, [location]);

  // Ao montar: restaurar rota
  useEffect(() => {
    const tecnicoId = localStorage.getItem("tecnico_id");
    if (!tecnicoId) return;

    const activeOsRoute = localStorage.getItem(OS_ROUTE_KEY);
    const activeOsTs = parseInt(localStorage.getItem(OS_ROUTE_TS_KEY) || "0", 10);
    const lastMenuRoute = localStorage.getItem("tecnico_last_route");
    const isAtRoot = location === "/" || location === "";
    const isAtTecnicoHome = location === "/tecnico";

    // Verificar se a OS ativa ainda é válida (dentro do TTL de 4h)
    const osRouteValida = activeOsRoute &&
      activeOsRoute.startsWith(TECNICO_OS_PREFIX) &&
      (Date.now() - activeOsTs) < OS_ROUTE_TTL;

    if (osRouteValida) {
      // Há uma OS ativa válida (técnico foi para câmera/WhatsApp/Maps)
      if (isAtRoot || isAtTecnicoHome) {
        // Retorna para a OS onde estava
        navigate(activeOsRoute!, { replace: true });
      }
    } else {
      // Sem OS ativa ou expirada (app foi fechado e reaberto após 4h)
      localStorage.removeItem(OS_ROUTE_KEY);
      localStorage.removeItem(OS_ROUTE_TS_KEY);
      if (isAtRoot && lastMenuRoute && TECNICO_ROUTES.includes(lastMenuRoute)) {
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
