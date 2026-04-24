import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState } from "react";
import { GitBranch, School, MapPin, Users, Zap } from "lucide-react";

const statusClass: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
  em_andamento: "bg-blue-100 text-blue-800 border-blue-200",
  concluido: "bg-green-100 text-green-800 border-green-200",
};
const statusLabel: Record<string, string> = { pendente: "Pendente", em_andamento: "Em andamento", concluido: "Concluído" };

export default function AdminAtribuicoes() {
  const utils = trpc.useUtils();
  const { data: escolas } = trpc.escolas.list.useQuery({});
  const { data: tecnicos } = trpc.tecnicos.list.useQuery();

  const atribuirEscolaMut = trpc.atribuicoes.porEscola.useMutation({
    onSuccess: () => { toast.success("Atribuição salva!"); utils.escolas.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });
  const atribuirCidadeMut = trpc.atribuicoes.porCidade.useMutation({
    onSuccess: () => { toast.success("Atribuição por cidade aplicada!"); utils.escolas.list.invalidate(); utils.tecnicos.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const [cidadeSel, setCidadeSel] = useState("");
  const [tecnicoCidadeSel, setTecnicoCidadeSel] = useState("");

  // Cidades únicas
  const cidadesSet = new Set(escolas?.map(e => e.municipio).filter(Boolean) as string[]);
  const cidades = Array.from(cidadesSet).sort();

  function getTecnicoNome(id: number | null | undefined) {
    if (!id) return null;
    return tecnicos?.find(t => t.id === id)?.nome ?? null;
  }

  function handleAtribuirCidade() {
    if (!cidadeSel || !tecnicoCidadeSel) { toast.error("Selecione cidade e técnico"); return; }
    atribuirCidadeMut.mutate({ cidade: cidadeSel, tecnicoId: Number(tecnicoCidadeSel) });
  }

  return (
    <AdminLayout title="Atribuições">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Atribuição por cidade */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Atribuição Automática por Cidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">Atribui automaticamente todas as escolas pendentes de uma cidade a um técnico (sem atribuição manual).</p>
            <div>
              <label className="text-sm font-medium mb-1 block">Cidade</label>
              <Select value={cidadeSel} onValueChange={setCidadeSel}>
                <SelectTrigger><SelectValue placeholder="Selecione a cidade" /></SelectTrigger>
                <SelectContent>
                  {cidades.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium mb-1 block">Técnico</label>
              <Select value={tecnicoCidadeSel} onValueChange={setTecnicoCidadeSel}>
                <SelectTrigger><SelectValue placeholder="Selecione o técnico" /></SelectTrigger>
                <SelectContent>
                  {tecnicos?.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.nome}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              onClick={handleAtribuirCidade}
              disabled={atribuirCidadeMut.isPending}
            >
              <Users className="w-4 h-4 mr-2" />
              {atribuirCidadeMut.isPending ? "Aplicando..." : "Aplicar Atribuição"}
            </Button>
          </CardContent>
        </Card>

        {/* Resumo de técnicos */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Users className="w-4 h-4 text-primary" />
              Resumo por Técnico
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!tecnicos || tecnicos.length === 0 ? (
              <p className="text-muted-foreground text-sm">Nenhum técnico cadastrado.</p>
            ) : (
              <div className="space-y-2">
                {tecnicos.map(t => {
                  const escolasTecnico = escolas?.filter(e => e.tecnicoId === t.id) ?? [];
                  const concluidas = escolasTecnico.filter(e => e.status === "concluido").length;
                  const pendentes = escolasTecnico.filter(e => e.status === "pendente").length;
                  return (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">{t.nome[0]?.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{t.nome}</p>
                        {t.cidadeResponsavel && <p className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="w-3 h-3" />{t.cidadeResponsavel}</p>}
                      </div>
                      <div className="flex gap-2 text-xs flex-shrink-0">
                        <span className="bg-muted px-2 py-0.5 rounded">{escolasTecnico.length} total</span>
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded">{concluidas} ✓</span>
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">{pendentes} pend.</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Atribuição manual por escola */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <GitBranch className="w-4 h-4 text-primary" />
            Atribuição Manual por Escola
            <span className="text-xs font-normal text-muted-foreground ml-1">(sobrescreve regra de cidade)</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!escolas || escolas.length === 0 ? (
            <p className="text-muted-foreground text-sm">Nenhuma escola cadastrada.</p>
          ) : (
            <div className="space-y-2">
              {escolas.filter(e => e.status !== "concluido").map((escola) => (
                <div key={escola.id} className="flex items-center gap-3 p-3 rounded-lg border bg-card">
                  <School className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{escola.nome}</p>
                    <p className="text-xs text-muted-foreground">{escola.municipio} — {escola.qtdAp} AP(s)</p>
                  </div>
                  <Badge className={`text-xs border flex-shrink-0 ${statusClass[escola.status]}`} variant="outline">
                    {statusLabel[escola.status]}
                  </Badge>
                  <Select
                    value={escola.tecnicoId ? String(escola.tecnicoId) : "none"}
                    onValueChange={(v) => {
                      const tecnicoId = v === "none" ? null : Number(v);
                      if (tecnicoId !== null) {
                        atribuirEscolaMut.mutate({ escolaId: escola.id, tecnicoId });
                      }
                    }}
                  >
                    <SelectTrigger className="w-40 h-8 text-xs">
                      <SelectValue placeholder="Atribuir técnico" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">Sem técnico</SelectItem>
                      {tecnicos?.map(t => (
                        <SelectItem key={t.id} value={String(t.id)}>{t.nome}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
