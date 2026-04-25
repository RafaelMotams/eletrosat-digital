import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState, useCallback } from "react";
import { GitBranch, School, MapPin, Users, Zap, CheckCircle2, Clock, ChevronDown } from "lucide-react";

const statusClass: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
  em_andamento: "bg-blue-100 text-blue-800 border-blue-200",
  concluido: "bg-green-100 text-green-800 border-green-200",
};
const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};

// Componente isolado para o seletor de técnico por escola
// Usar componente separado evita o bug de removeChild do Radix Select
// quando a lista pai é re-renderizada após mutação
function EscolaRow({
  escola,
  tecnicos,
  onAtribuir,
  isPending,
}: {
  escola: { id: number; nome: string; municipio: string | null; qtdAp: number | null; status: string; tecnicoId: number | null };
  tecnicos: { id: number; nome: string }[];
  onAtribuir: (escolaId: number, tecnicoId: number | null) => void;
  isPending: boolean;
}) {
  const [open, setOpen] = useState(false);
  const tecnicoAtual = tecnicos.find(t => t.id === escola.tecnicoId);

  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border bg-card hover:bg-muted/30 transition-colors">
      <School className="w-4 h-4 text-muted-foreground flex-shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{escola.nome}</p>
        <p className="text-xs text-muted-foreground">
          {escola.municipio} — {escola.qtdAp ?? 0} AP(s)
        </p>
      </div>
      <Badge
        className={`text-xs border flex-shrink-0 ${statusClass[escola.status] ?? ""}`}
        variant="outline"
      >
        {statusLabel[escola.status] ?? escola.status}
      </Badge>

      {/* Dropdown nativo para evitar bug do Radix Select em listas dinâmicas */}
      <div className="relative flex-shrink-0">
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          disabled={isPending}
          className="flex items-center gap-1.5 h-8 px-3 rounded-md border text-xs bg-background hover:bg-muted transition-colors min-w-[140px] justify-between"
        >
          <span className="truncate">{tecnicoAtual ? tecnicoAtual.nome : "Atribuir técnico"}</span>
          <ChevronDown className="w-3 h-3 flex-shrink-0 text-muted-foreground" />
        </button>
        {open && (
          <>
            {/* Overlay para fechar ao clicar fora */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setOpen(false)}
            />
            <div className="absolute right-0 top-9 z-50 bg-popover border rounded-md shadow-lg min-w-[160px] py-1 max-h-48 overflow-y-auto">
              <button
                type="button"
                className="w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors text-muted-foreground"
                onClick={() => {
                  setOpen(false);
                  onAtribuir(escola.id, null);
                }}
              >
                Sem técnico
              </button>
              {tecnicos.map(t => (
                <button
                  key={t.id}
                  type="button"
                  className={`w-full text-left px-3 py-1.5 text-xs hover:bg-muted transition-colors flex items-center gap-2 ${t.id === escola.tecnicoId ? "font-semibold text-primary" : ""}`}
                  onClick={() => {
                    setOpen(false);
                    onAtribuir(escola.id, t.id);
                  }}
                >
                  {t.id === escola.tecnicoId && <CheckCircle2 className="w-3 h-3 text-primary flex-shrink-0" />}
                  {t.nome}
                </button>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default function AdminAtribuicoes() {
  const utils = trpc.useUtils();
  const { data: escolas } = trpc.escolas.list.useQuery({});
  const { data: tecnicos } = trpc.tecnicos.list.useQuery();

  const atribuirEscolaMut = trpc.atribuicoes.porEscola.useMutation({
    onSuccess: () => {
      toast.success("Atribuição salva!");
      utils.escolas.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const atribuirCidadeMut = trpc.atribuicoes.porCidade.useMutation({
    onSuccess: () => {
      toast.success("Atribuição por cidade aplicada!");
      utils.escolas.list.invalidate();
      utils.tecnicos.list.invalidate();
    },
    onError: (e) => toast.error(e.message),
  });

  const [cidadeSel, setCidadeSel] = useState("");
  const [tecnicoCidadeSel, setTecnicoCidadeSel] = useState("");
  const [cidadeOpen, setCidadeOpen] = useState(false);
  const [tecnicoCidadeOpen, setTecnicoCidadeOpen] = useState(false);

  // Cidades únicas
  const cidades = Array.from(
    new Set((escolas ?? []).map(e => e.municipio).filter(Boolean) as string[])
  ).sort();

  const handleAtribuirEscola = useCallback(
    (escolaId: number, tecnicoId: number | null) => {
      if (tecnicoId === null) {
        toast.info("Para remover atribuição, edite a escola diretamente.");
        return;
      }
      atribuirEscolaMut.mutate({ escolaId, tecnicoId });
    },
    [atribuirEscolaMut]
  );

  function handleAtribuirCidade() {
    if (!cidadeSel || !tecnicoCidadeSel) {
      toast.error("Selecione cidade e técnico");
      return;
    }
    atribuirCidadeMut.mutate({ cidade: cidadeSel, tecnicoId: Number(tecnicoCidadeSel) });
  }

  const escolasPendentes = (escolas ?? []).filter(e => e.status !== "concluido");

  return (
    <AdminLayout title="Atribuições">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        {/* Atribuição por cidade */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-500" />
              Atribuição por Cidade
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Atribui automaticamente todas as escolas pendentes de uma cidade a um técnico.
            </p>

            {/* Seletor de cidade - dropdown nativo */}
            <div>
              <label className="text-sm font-medium mb-1 block">Cidade</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setCidadeOpen(o => !o); setTecnicoCidadeOpen(false); }}
                  className="flex items-center justify-between w-full h-9 px-3 rounded-md border text-sm bg-background hover:bg-muted transition-colors"
                >
                  <span className={cidadeSel ? "" : "text-muted-foreground"}>
                    {cidadeSel || "Selecione a cidade"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
                {cidadeOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setCidadeOpen(false)} />
                    <div className="absolute left-0 top-10 z-50 bg-popover border rounded-md shadow-lg w-full py-1 max-h-48 overflow-y-auto">
                      {cidades.map(c => (
                        <button
                          key={c}
                          type="button"
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors ${c === cidadeSel ? "font-semibold text-primary" : ""}`}
                          onClick={() => { setCidadeSel(c); setCidadeOpen(false); }}
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Seletor de técnico - dropdown nativo */}
            <div>
              <label className="text-sm font-medium mb-1 block">Técnico</label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => { setTecnicoCidadeOpen(o => !o); setCidadeOpen(false); }}
                  className="flex items-center justify-between w-full h-9 px-3 rounded-md border text-sm bg-background hover:bg-muted transition-colors"
                >
                  <span className={tecnicoCidadeSel ? "" : "text-muted-foreground"}>
                    {tecnicoCidadeSel
                      ? tecnicos?.find(t => String(t.id) === tecnicoCidadeSel)?.nome
                      : "Selecione o técnico"}
                  </span>
                  <ChevronDown className="w-4 h-4 text-muted-foreground" />
                </button>
                {tecnicoCidadeOpen && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setTecnicoCidadeOpen(false)} />
                    <div className="absolute left-0 top-10 z-50 bg-popover border rounded-md shadow-lg w-full py-1 max-h-48 overflow-y-auto">
                      {(tecnicos ?? []).map(t => (
                        <button
                          key={t.id}
                          type="button"
                          className={`w-full text-left px-3 py-1.5 text-sm hover:bg-muted transition-colors ${String(t.id) === tecnicoCidadeSel ? "font-semibold text-primary" : ""}`}
                          onClick={() => { setTecnicoCidadeSel(String(t.id)); setTecnicoCidadeOpen(false); }}
                        >
                          {t.nome}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
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
                  const escolasTecnico = (escolas ?? []).filter(e => e.tecnicoId === t.id);
                  const concluidas = escolasTecnico.filter(e => e.status === "concluido").length;
                  const pendentes = escolasTecnico.filter(e => e.status === "pendente").length;
                  return (
                    <div key={t.id} className="flex items-center gap-3 p-3 rounded-lg bg-muted/40">
                      <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-bold text-primary">{t.nome[0]?.toUpperCase()}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{t.nome}</p>
                        {(t as any).cidadeResponsavel && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1">
                            <MapPin className="w-3 h-3" />{(t as any).cidadeResponsavel}
                          </p>
                        )}
                      </div>
                      <div className="flex gap-2 text-xs flex-shrink-0">
                        <span className="bg-muted px-2 py-0.5 rounded">{escolasTecnico.length} total</span>
                        <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />{concluidas}
                        </span>
                        <span className="bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded flex items-center gap-1">
                          <Clock className="w-3 h-3" />{pendentes}
                        </span>
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
            <span className="text-xs font-normal text-muted-foreground ml-1">
              (sobrescreve regra de cidade)
            </span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {escolasPendentes.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              {escolas?.length === 0 ? "Nenhuma escola cadastrada." : "Todas as escolas já foram concluídas."}
            </p>
          ) : (
            <div className="space-y-2">
              {escolasPendentes.map((escola) => (
                <EscolaRow
                  key={escola.id}
                  escola={escola}
                  tecnicos={tecnicos ?? []}
                  onAtribuir={handleAtribuirEscola}
                  isPending={atribuirEscolaMut.isPending}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </AdminLayout>
  );
}
