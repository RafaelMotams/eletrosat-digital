import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { Wifi, LogOut, School, MapPin, Wifi as WifiIcon, ChevronRight, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type TecnicoData = { id: number; nome: string; email: string; telefone?: string | null; cidadeResponsavel?: string | null };

const statusLabel: Record<string, string> = { pendente: "Pendente", em_andamento: "Em andamento", concluido: "Concluído" };
const statusClass: Record<string, string> = {
  pendente: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  em_andamento: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  concluido: "bg-green-500/20 text-green-300 border-green-500/30",
};

export default function TecnicoHome() {
  const [, navigate] = useLocation();
  const [tecnico, setTecnico] = useState<TecnicoData | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("tecnico");
    if (!stored) { navigate("/tecnico/login"); return; }
    try { setTecnico(JSON.parse(stored)); } catch { navigate("/tecnico/login"); }
  }, [navigate]);

  const { data: escolas, isLoading, refetch } = trpc.escolas.list.useQuery(
    { tecnicoId: tecnico?.id },
    { enabled: !!tecnico, refetchInterval: 30000 }
  );

  function handleLogout() {
    localStorage.removeItem("tecnico");
    toast.success("Sessão encerrada");
    navigate("/tecnico/login");
  }

  if (!tecnico) return null;

  const pendentes = escolas?.filter(e => e.status !== "concluido") ?? [];
  const concluidas = escolas?.filter(e => e.status === "concluido") ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] to-[#1e3a5f] flex flex-col">
      {/* Header */}
      <header className="px-4 py-4 flex items-center justify-between border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-green-500 rounded-xl flex items-center justify-center">
            <Wifi className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-white font-bold text-sm leading-tight">Eletrosat Digital</p>
            <p className="text-blue-300 text-xs">{tecnico.nome}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-white/60 hover:text-white hover:bg-white/10"
          onClick={handleLogout}
        >
          <LogOut className="w-4 h-4" />
        </Button>
      </header>

      {/* Stats */}
      <div className="px-4 py-4 grid grid-cols-2 gap-3">
        <div className="bg-white/10 border border-white/10 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-white">{pendentes.length}</p>
          <p className="text-blue-300 text-xs">Pendentes</p>
        </div>
        <div className="bg-green-500/20 border border-green-500/20 rounded-xl p-3 text-center">
          <p className="text-2xl font-bold text-green-300">{concluidas.length}</p>
          <p className="text-green-300/70 text-xs">Concluídas</p>
        </div>
      </div>

      {/* Lista de escolas */}
      <div className="flex-1 px-4 pb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-white font-semibold text-sm flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-green-400" />
            Minhas Escolas
          </h2>
          <button onClick={() => refetch()} className="text-blue-300 text-xs hover:text-white">
            Atualizar
          </button>
        </div>

        {isLoading ? (
          <div className="space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-20 bg-white/10 rounded-xl animate-pulse" />)}
          </div>
        ) : !escolas || escolas.length === 0 ? (
          <div className="text-center py-12">
            <School className="w-12 h-12 text-white/30 mx-auto mb-3" />
            <p className="text-white/60 text-sm">Nenhuma escola atribuída a você.</p>
            <p className="text-white/40 text-xs mt-1">Aguarde a atribuição pelo administrador.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {escolas.map((escola) => (
              <button
                key={escola.id}
                className="w-full bg-white/10 border border-white/10 rounded-xl p-4 text-left hover:bg-white/15 active:bg-white/20 transition-colors"
                onClick={() => navigate(`/tecnico/os/${escola.id}`)}
              >
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-primary/30 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <School className="w-4 h-4 text-blue-200" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-white font-medium text-sm leading-tight truncate">{escola.nome}</p>
                      <ChevronRight className="w-4 h-4 text-white/40 flex-shrink-0 mt-0.5" />
                    </div>
                    <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                      <Badge className={`text-xs border ${statusClass[escola.status]}`} variant="outline">
                        {statusLabel[escola.status]}
                      </Badge>
                      {escola.municipio && (
                        <span className="flex items-center gap-1 text-xs text-blue-300">
                          <MapPin className="w-3 h-3" />{escola.municipio}
                        </span>
                      )}
                      <span className="flex items-center gap-1 text-xs text-blue-300">
                        <WifiIcon className="w-3 h-3" />{escola.qtdAp} AP(s)
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
