import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft, School, MapPin, Wifi, Phone, CheckCircle,
  MessageCircle, Navigation, ClipboardList
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

type TecnicoData = { id: number; nome: string; email: string };

const statusLabel: Record<string, string> = { pendente: "Pendente", em_andamento: "Em andamento", concluido: "Concluído" };
const statusClass: Record<string, string> = {
  pendente: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  em_andamento: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  concluido: "bg-green-500/20 text-green-300 border-green-500/30",
};

export default function TecnicoOS() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [tecnico, setTecnico] = useState<TecnicoData | null>(null);
  const [openConcluir, setOpenConcluir] = useState(false);
  const [qtdAp, setQtdAp] = useState("");
  const [observacao, setObservacao] = useState("");

  const utils = trpc.useUtils();

  useEffect(() => {
    const stored = localStorage.getItem("tecnico");
    if (!stored) { navigate("/tecnico/login"); return; }
    try { setTecnico(JSON.parse(stored)); } catch { navigate("/tecnico/login"); }
  }, [navigate]);

  const escolaId = parseInt(params.id ?? "0");
  const { data: escola, isLoading } = trpc.escolas.getById.useQuery(
    { id: escolaId },
    { enabled: !!escolaId }
  );

  // Buscar OS da escola para este técnico
  const { data: ordens } = trpc.ordens.list.useQuery(
    { tecnicoId: tecnico?.id },
    { enabled: !!tecnico }
  );
  const osAberta = ordens?.find(o => o.escolaId === escolaId && o.status !== "concluida");

  const concluirMut = trpc.ordens.concluir.useMutation({
    onSuccess: () => {
      toast.success("OS concluída com sucesso!");
      utils.escolas.list.invalidate();
      utils.ordens.list.invalidate();
      setOpenConcluir(false);
      navigate("/tecnico");
    },
    onError: (e) => toast.error(e.message),
  });

  const criarEConcluirMut = trpc.ordens.criarEConcluir.useMutation({
    onSuccess: () => {
      toast.success("OS concluída com sucesso!");
      utils.escolas.list.invalidate();
      utils.ordens.list.invalidate();
      setOpenConcluir(false);
      navigate("/tecnico");
    },
    onError: (e) => toast.error(e.message),
  });

  function handleConcluir() {
    const ap = parseInt(qtdAp);
    if (isNaN(ap) || ap < 0) { toast.error("Informe a quantidade de APs instalados"); return; }

    if (osAberta) {
      concluirMut.mutate({ osId: osAberta.id, qtdApInstalado: ap, observacao });
    } else if (tecnico) {
      // Criar e concluir em uma única operação atômica
      criarEConcluirMut.mutate({ escolaId, tecnicoId: tecnico.id, qtdApInstalado: ap, observacao });
    }
  }

  const lat = parseFloat(String(escola?.latitude ?? ""));
  const lng = parseFloat(String(escola?.longitude ?? ""));
  const hasCoords = !isNaN(lat) && !isNaN(lng);
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps?q=${lat},${lng}`
    : `https://www.google.com/maps/search/${encodeURIComponent(escola?.nome ?? "")}`;
  const whatsappUrl = escola?.telefone
    ? `https://wa.me/55${escola.telefone.replace(/\D/g, "")}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#0f172a] to-[#1e3a5f] flex flex-col">
      {/* Header */}
      <header className="px-4 py-4 flex items-center gap-3 border-b border-white/10">
        <button
          onClick={() => navigate("/tecnico")}
          className="w-9 h-9 rounded-xl bg-white/10 flex items-center justify-center text-white hover:bg-white/20"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">Detalhes da OS</p>
        </div>
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-green-400 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : !escola ? (
        <div className="flex-1 flex items-center justify-center text-white/60">Escola não encontrada.</div>
      ) : (
        <div className="flex-1 px-4 py-5 space-y-4">
          {/* Card da escola */}
          <div className="bg-white/10 border border-white/10 rounded-2xl p-5">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-11 h-11 bg-primary/30 rounded-xl flex items-center justify-center flex-shrink-0">
                <School className="w-6 h-6 text-blue-200" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-white font-bold text-base leading-tight">{escola.nome}</h1>
                <p className="text-blue-300 text-xs mt-0.5">INEP: {escola.inep}</p>
              </div>
              <Badge className={`text-xs border flex-shrink-0 ${statusClass[escola.status]}`} variant="outline">
                {statusLabel[escola.status]}
              </Badge>
            </div>

            <div className="space-y-2.5">
              {escola.endereco && (
                <div className="flex items-start gap-2.5 text-sm">
                  <MapPin className="w-4 h-4 text-blue-300 mt-0.5 flex-shrink-0" />
                  <span className="text-blue-100">{escola.endereco}</span>
                </div>
              )}
              <div className="flex items-center gap-2.5 text-sm">
                <Wifi className="w-4 h-4 text-blue-300 flex-shrink-0" />
                <span className="text-blue-100">{escola.tipoConexao} — {escola.velocidadeOfertada}Mbps</span>
              </div>
              <div className="flex items-center gap-2.5 text-sm">
                <ClipboardList className="w-4 h-4 text-blue-300 flex-shrink-0" />
                <span className="text-blue-100">{escola.qtdAp} Access Point(s) a instalar</span>
              </div>
              {escola.telefone && (
                <div className="flex items-center gap-2.5 text-sm">
                  <Phone className="w-4 h-4 text-blue-300 flex-shrink-0" />
                  <span className="text-blue-100">{escola.telefone}</span>
                </div>
              )}
            </div>
          </div>

          {/* Botões de ação */}
          <div className="grid grid-cols-2 gap-3">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer">
              <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5">
                <Navigation className="w-4 h-4 mr-2" />
                Google Maps
              </Button>
            </a>
            {whatsappUrl ? (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer">
                <Button className="w-full bg-[#25D366] hover:bg-[#1da851] text-white py-5">
                  <MessageCircle className="w-4 h-4 mr-2" />
                  WhatsApp
                </Button>
              </a>
            ) : (
              <Button disabled className="w-full py-5 opacity-50">
                <MessageCircle className="w-4 h-4 mr-2" />
                WhatsApp
              </Button>
            )}
          </div>

          {/* Botão concluir */}
          {escola.status !== "concluido" && (
            <Button
              className="w-full bg-green-500 hover:bg-green-600 text-white py-6 text-base font-semibold shadow-lg shadow-green-500/30"
              onClick={() => setOpenConcluir(true)}
            >
              <CheckCircle className="w-5 h-5 mr-2" />
              Marcar como Concluído
            </Button>
          )}

          {escola.status === "concluido" && (
            <div className="bg-green-500/20 border border-green-500/30 rounded-2xl p-4 text-center">
              <CheckCircle className="w-8 h-8 text-green-400 mx-auto mb-2" />
              <p className="text-green-300 font-semibold">Instalação Concluída!</p>
              {escola.dataConclusao && (
                <p className="text-green-400/70 text-xs mt-1">
                  em {new Date(escola.dataConclusao).toLocaleDateString("pt-BR")}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de conclusão */}
      <Dialog open={openConcluir} onOpenChange={setOpenConcluir}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Concluir Instalação
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Quantidade de APs instalados *</Label>
              <Input
                type="number"
                min="0"
                value={qtdAp}
                onChange={e => setQtdAp(e.target.value)}
                placeholder="Ex: 3"
                className="mt-1"
              />
            </div>
            <div>
              <Label>Observação (opcional)</Label>
              <Textarea
                value={observacao}
                onChange={e => setObservacao(e.target.value)}
                placeholder="Alguma observação sobre a instalação..."
                className="mt-1 resize-none"
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenConcluir(false)}>Cancelar</Button>
            <Button
              className="bg-green-500 hover:bg-green-600 text-white"
              onClick={handleConcluir}
              disabled={concluirMut.isPending || criarEConcluirMut.isPending}
            >
              {concluirMut.isPending || criarEConcluirMut.isPending ? "Salvando..." : "Confirmar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
