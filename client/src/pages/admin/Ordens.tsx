import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState } from "react";
import { ClipboardList, Plus, School, User, Calendar } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const statusLabel: Record<string, string> = { aberta: "Aberta", em_andamento: "Em andamento", concluida: "Concluída" };
const statusClass: Record<string, string> = {
  aberta: "bg-yellow-100 text-yellow-800 border-yellow-200",
  em_andamento: "bg-blue-100 text-blue-800 border-blue-200",
  concluida: "bg-green-100 text-green-800 border-green-200",
};

export default function AdminOrdens() {
  const utils = trpc.useUtils();
  const { data: ordens, isLoading } = trpc.ordens.list.useQuery({});
  const { data: escolas } = trpc.escolas.list.useQuery({});
  const { data: tecnicos } = trpc.tecnicos.list.useQuery();

  const criarMut = trpc.ordens.criar.useMutation({
    onSuccess: () => { toast.success("OS criada!"); utils.ordens.list.invalidate(); utils.escolas.list.invalidate(); setOpen(false); },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [escolaSel, setEscolaSel] = useState("");
  const [tecnicoSel, setTecnicoSel] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");

  function getEscolaNome(id: number) { return escolas?.find(e => e.id === id)?.nome ?? `Escola #${id}`; }
  function getTecnicoNome(id: number) { return tecnicos?.find(t => t.id === id)?.nome ?? `Técnico #${id}`; }

  const filtered = ordens?.filter(o => statusFilter === "todos" || o.status === statusFilter) ?? [];

  function handleCriar() {
    if (!escolaSel || !tecnicoSel) { toast.error("Selecione escola e técnico"); return; }
    criarMut.mutate({ escolaId: Number(escolaSel), tecnicoId: Number(tecnicoSel) });
  }

  return (
    <AdminLayout title="Ordens de Serviço">
      <div className="flex items-center justify-between mb-6">
        <p className="text-muted-foreground text-sm">{filtered.length} OS encontrada(s)</p>
        <Button onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4 mr-2" />Nova OS
        </Button>
      </div>

      {/* Filtros de status */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {["todos", "aberta", "em_andamento", "concluida"].map(s => (
          <Button
            key={s}
            variant={statusFilter === s ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter(s)}
          >
            {s === "todos" ? "Todas" : statusLabel[s]}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}</div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <ClipboardList className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">Nenhuma OS encontrada.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((os) => (
            <Card key={os.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <ClipboardList className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <p className="font-semibold text-sm">OS #{os.id}</p>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                          <School className="w-3 h-3" />
                          <span className="truncate">{getEscolaNome(os.escolaId)}</span>
                        </div>
                      </div>
                      <Badge className={`text-xs border ${statusClass[os.status]}`} variant="outline">
                        {statusLabel[os.status]}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" />{getTecnicoNome(os.tecnicoId)}</span>
                      <span className="flex items-center gap-1"><Calendar className="w-3 h-3" />{new Date(os.dataAbertura).toLocaleDateString("pt-BR")}</span>
                      {os.qtdApInstalado != null && <span className="text-green-600 font-medium">{os.qtdApInstalado} AP(s) instalado(s)</span>}
                      {os.observacao && <span className="italic">"{os.observacao}"</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Nova Ordem de Serviço</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-medium mb-1 block">Escola</label>
              <Select value={escolaSel} onValueChange={setEscolaSel}>
                <SelectTrigger><SelectValue placeholder="Selecione a escola" /></SelectTrigger>
                <SelectContent>
                  {escolas?.filter(e => e.status !== "concluido").map(e => (
                    <SelectItem key={e.id} value={String(e.id)}>{e.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Técnico</label>
              <Select value={tecnicoSel} onValueChange={setTecnicoSel}>
                <SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
                <SelectContent>
                  {tecnicos?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleCriar} disabled={criarMut.isPending}>
              {criarMut.isPending ? "Criando..." : "Criar OS"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
