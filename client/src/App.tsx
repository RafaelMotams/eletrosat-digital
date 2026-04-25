import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      {/* Admin routes */}
      <Route path="/admin" component={AdminDashboard} />
      <Route path="/admin/tecnicos" component={AdminTecnicos} />
      <Route path="/admin/escolas" component={AdminEscolas} />
      <Route path="/admin/atribuicoes" component={AdminAtribuicoes} />
      <Route path="/admin/ordens" component={AdminOrdens} />
      <Route path="/admin/relatorios" component={AdminRelatorios} />
      <Route path="/admin/mapa" component={AdminMapa} />
      <Route path="/admin/planilha" component={AdminPlanilha} />
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
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
