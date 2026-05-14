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

function RoutePersistence() {
  const [location, navigate] = useLocation();

  // Salvar rota atual do técnico no localStorage
  // Não salva /tecnico quando a última rota era uma OS (para não sobrescrever)
  useEffect(() => {
    const isTecnicoRoute =
      TECNICO_ROUTES.includes(location) ||
      location.startsWith(TECNICO_OS_PREFIX);
    if (isTecnicoRoute) {
      // Se estamos em /tecnico mas a última rota era uma OS, não sobrescreve
      // (pode ser o SW servindo /tecnico como fallback ao voltar da câmera)
      if (location === "/tecnico") {
        const lastRoute = localStorage.getItem("tecnico_last_route");
        if (lastRoute && lastRoute.startsWith(TECNICO_OS_PREFIX)) {
          // Não salva — mantém a rota da OS
          return;
        }
      }
      localStorage.setItem("tecnico_last_route", location);
    }
  }, [location]);

  // Ao montar, restaurar última rota do técnico se estiver logado
  // Também restaura quando o SW serve /tecnico como fallback (ao voltar da câmera/WhatsApp/Maps)
  useEffect(() => {
    const tecnicoId = localStorage.getItem("tecnico_id");
    const lastRoute = localStorage.getItem("tecnico_last_route");
    const isAtRoot = location === "/" || location === "";
    // Também restaura se estamos em /tecnico mas a última rota era uma OS
    const isAtTecnicoHome = location === "/tecnico";
    const lastRouteIsOS = lastRoute?.startsWith(TECNICO_OS_PREFIX);

    if (tecnicoId && lastRoute) {
      if (
        isAtRoot &&
        (TECNICO_ROUTES.includes(lastRoute) || lastRoute.startsWith(TECNICO_OS_PREFIX))
      ) {
        // Restaura ao abrir o app do zero
        navigate(lastRoute, { replace: true });
      } else if (isAtTecnicoHome && lastRouteIsOS) {
        // SW serviu /tecnico como fallback — restaura para a OS correta
        navigate(lastRoute, { replace: true });
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
