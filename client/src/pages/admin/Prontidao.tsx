import { useMemo, useState } from "react";
import {
  CheckCircle2,
  FileSpreadsheet,
  Info,
  MapPinOff,
  Radar,
  Search,
  ShieldAlert,
  TriangleAlert,
  Users,
} from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import AdminLayoutTenant from "@/components/AdminLayoutTenant";
import { OperationState } from "@/components/OperationState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc";
import type {
  ClassificacaoProntidao,
  ProntidaoVisita,
  SeveridadeSinal,
} from "@shared/prontidaoVisita";

const ESTILO_CLASSIFICACAO: Record<
  Exclude<ClassificacaoProntidao, "nao_aplicavel">,
  { rotulo: string; badge: string; borda: string }
> = {
  bloqueada: {
    rotulo: "Não saia ainda",
    badge: "bg-rose-100 text-rose-800",
    borda: "border-rose-200",
  },
  atencao: {
    rotulo: "Confirme antes",
    badge: "bg-amber-100 text-amber-900",
    borda: "border-amber-200",
  },
  pronta: {
    rotulo: "Pronta para deslocamento",
    badge: "bg-emerald-100 text-emerald-800",
    borda: "border-emerald-200",
  },
};

const ESTILO_SEVERIDADE: Record<SeveridadeSinal, string> = {
  impedimento: "bg-rose-50 text-rose-900 border-rose-200",
  alerta: "bg-amber-50 text-amber-900 border-amber-200",
  informativo: "bg-slate-50 text-slate-700 border-slate-200",
};

function CartaoIndicador({
  titulo,
  valor,
  descricao,
  destaque,
  ativo,
  onClick,
}: {
  titulo: string;
  valor: number;
  descricao: string;
  destaque?: string;
  ativo?: boolean;
  onClick?: () => void;
}) {
  const conteudo = (
    <Card className={ativo ? "border-primary ring-1 ring-primary/30" : destaque}>
      <CardContent className="pt-5">
        <p className="text-sm text-muted-foreground">{titulo}</p>
        <p className="mt-1 text-3xl font-bold">{valor}</p>
        <p className="mt-1 text-xs text-muted-foreground">{descricao}</p>
      </CardContent>
    </Card>
  );

  if (!onClick) return conteudo;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className="rounded-xl text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
    >
      {conteudo}
    </button>
  );
}

function CartaoVisita({ visita }: { visita: ProntidaoVisita }) {
  const estilo =
    ESTILO_CLASSIFICACAO[
      visita.classificacao as Exclude<ClassificacaoProntidao, "nao_aplicavel">
    ];

  return (
    <article className={`rounded-xl border p-4 ${estilo.borda}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-semibold">{visita.nome}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {visita.municipio ?? "Município não informado"}
            {visita.uf ? `/${visita.uf}` : ""} · INEP {visita.inep ?? "—"} ·{" "}
            {visita.tecnicoNome ?? "Sem técnico"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-semibold ${estilo.badge}`}
          >
            {estilo.rotulo}
          </span>
          <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-semibold">
            {visita.pontuacao}/100
          </span>
        </div>
      </div>

      <p className="mt-3 text-sm text-muted-foreground">
        {visita.apPlanejados > 0
          ? `${visita.apPlanejados} AP previstos`
          : "APs não definidos"}
        {visita.apDisponivelTecnico !== null
          ? ` · ${visita.apDisponivelTecnico} em posse do técnico`
          : " · material não rastreado"}
      </p>

      {visita.sinais.length > 0 && (
        <ul className="mt-3 space-y-2">
          {visita.sinais.map(sinal => (
            <li
              key={sinal.codigo}
              className={`rounded-lg border px-3 py-2 text-sm ${ESTILO_SEVERIDADE[sinal.severidade]}`}
            >
              <p className="font-semibold">{sinal.titulo}</p>
              <p className="mt-0.5 text-xs opacity-90">{sinal.detalhe}</p>
              <p className="mt-1 text-xs font-medium">
                Ação: {sinal.acao} (
                {sinal.responsavel === "gestao" ? "gestão" : "campo"})
              </p>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}

export default function AdminProntidao() {
  const [classificacao, setClassificacao] = useState<
    ClassificacaoProntidao | "todas"
  >("todas");
  const [municipio, setMunicipio] = useState("todos");
  const [tecnicoId, setTecnicoId] = useState("todos");
  const [busca, setBusca] = useState("");

  const filtros = useMemo(
    () => ({
      classificacao:
        classificacao === "todas"
          ? undefined
          : (classificacao as "pronta" | "atencao" | "bloqueada"),
      municipio: municipio === "todos" ? undefined : municipio,
      tecnicoId: tecnicoId === "todos" ? undefined : Number(tecnicoId),
      busca: busca.trim() || undefined,
      limite: 200,
    }),
    [classificacao, municipio, tecnicoId, busca]
  );

  const painelQuery = trpc.prontidao.painel.useQuery(filtros, {
    refetchInterval: 120_000,
  });
  const tecnicosQuery = trpc.tecnicos.list.useQuery();

  const painel = painelQuery.data;
  const resumo = painel?.resumo;
  const itens = painel?.itens ?? [];
  const cobertura = painel?.cobertura ?? [];
  const rotasIncompletas = cobertura.filter(rota => !rota.suficiente);
  const temFiltro =
    classificacao !== "todas" ||
    municipio !== "todos" ||
    tecnicoId !== "todos" ||
    busca.trim().length > 0;

  function limparFiltros() {
    setClassificacao("todas");
    setMunicipio("todos");
    setTecnicoId("todos");
    setBusca("");
  }

  function exportarChecklist() {
    if (!painel) return;
    const pendencias = itens.flatMap(visita =>
      visita.sinais.map(sinal => ({
        Escola: visita.nome,
        INEP: visita.inep ?? "—",
        Município: visita.municipio ?? "—",
        Técnico: visita.tecnicoNome ?? "Sem técnico",
        Situação: ESTILO_CLASSIFICACAO[
          visita.classificacao as Exclude<ClassificacaoProntidao, "nao_aplicavel">
        ].rotulo,
        Pontuação: visita.pontuacao,
        Severidade: sinal.severidade,
        Pendência: sinal.titulo,
        Detalhe: sinal.detalhe,
        "Ação corretiva": sinal.acao,
        Responsável: sinal.responsavel === "gestao" ? "Gestão" : "Campo",
      }))
    );
    const materiais = cobertura.map(rota => ({
      Técnico: rota.tecnicoNome,
      "Visitas planejadas": rota.visitasPlanejadas,
      "AP necessários": rota.apNecessarios,
      "AP em posse": rota.rastreado ? rota.apDisponiveis : "Não rastreado",
      "AP faltantes": rota.apFaltantes,
    }));

    const workbook = XLSX.utils.book_new();
    const adicionar = (nome: string, linhas: Record<string, unknown>[]) => {
      const planilha = XLSX.utils.json_to_sheet(
        linhas.length ? linhas : [{ "Sem dados": "Nenhum registro para o filtro" }]
      );
      planilha["!autofilter"] = { ref: planilha["!ref"] || "A1" };
      XLSX.utils.book_append_sheet(workbook, planilha, nome);
    };
    adicionar("Pendências por visita", pendencias);
    adicionar("Material por técnico", materiais);
    XLSX.writeFile(
      workbook,
      `netvius-prontidao-${new Date().toISOString().slice(0, 10)}.xlsx`
    );
    toast.success("Checklist de prontidão exportado.");
  }

  const acoes = (
    <Button
      variant="outline"
      className="gap-2"
      onClick={exportarChecklist}
      disabled={!painel || itens.length === 0}
    >
      <FileSpreadsheet className="h-4 w-4" /> Exportar checklist
    </Button>
  );

  if (painelQuery.isLoading) {
    return (
      <AdminLayoutTenant
        title="Radar de prontidão"
        subtitle="Impedimentos antes do deslocamento"
      >
        <OperationState
          kind="loading"
          title="Avaliando a carteira de visitas"
          description="Cruzando ficha da escola, responsável, ordens abertas e material em posse dos técnicos."
        />
      </AdminLayoutTenant>
    );
  }

  if (painelQuery.error) {
    return (
      <AdminLayoutTenant
        title="Radar de prontidão"
        subtitle="Impedimentos antes do deslocamento"
      >
        <OperationState
          kind="error"
          title="Não foi possível avaliar a prontidão"
          description="Confira sua conexão e tente novamente."
          actionLabel="Tentar novamente"
          onAction={() => painelQuery.refetch()}
        />
      </AdminLayoutTenant>
    );
  }

  return (
    <AdminLayoutTenant
      title="Radar de prontidão"
      subtitle="Descubra o impedimento antes de a equipe pegar a estrada"
      actions={acoes}
    >
      <div className="mb-6 flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
        <Radar className="mt-0.5 h-5 w-5 shrink-0 text-slate-500" />
        <p>
          Cada visita é avaliada com dados que já estão no sistema. Um{" "}
          <strong>impedimento</strong> significa que a viagem terminaria sem
          instalação; um <strong>alerta</strong> indica risco que ainda dá tempo de
          resolver por telefone.
        </p>
      </div>

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <CartaoIndicador
          titulo="Não saia ainda"
          valor={resumo?.bloqueadas ?? 0}
          descricao="Visitas com impedimento confirmado"
          destaque={resumo?.bloqueadas ? "border-rose-200 bg-rose-50/60" : undefined}
          ativo={classificacao === "bloqueada"}
          onClick={() =>
            setClassificacao(valor =>
              valor === "bloqueada" ? "todas" : "bloqueada"
            )
          }
        />
        <CartaoIndicador
          titulo="Confirme antes"
          valor={resumo?.atencao ?? 0}
          descricao="Risco que dá para resolver antes da saída"
          destaque={resumo?.atencao ? "border-amber-200 bg-amber-50/60" : undefined}
          ativo={classificacao === "atencao"}
          onClick={() =>
            setClassificacao(valor => (valor === "atencao" ? "todas" : "atencao"))
          }
        />
        <CartaoIndicador
          titulo="Prontas"
          valor={resumo?.prontas ?? 0}
          descricao="Localização, contato, responsável e material conferidos"
          ativo={classificacao === "pronta"}
          onClick={() =>
            setClassificacao(valor => (valor === "pronta" ? "todas" : "pronta"))
          }
        />
        <CartaoIndicador
          titulo="Deslocamentos evitáveis"
          valor={resumo?.deslocamentosEvitaveis ?? 0}
          descricao="Escolas já atribuídas que hoje sairiam com impedimento"
        />
      </div>

      {rotasIncompletas.length > 0 && (
        <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
          <div>
            <strong>Material da rota insuficiente.</strong>{" "}
            {rotasIncompletas
              .map(
                rota =>
                  `${rota.tecnicoNome} precisa de mais ${rota.apFaltantes} AP para as ${rota.visitasPlanejadas} visitas planejadas`
              )
              .join("; ")}
            .
          </div>
        </div>
      )}

      <Card className="mb-6">
        <CardHeader className="space-y-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <CardTitle className="text-lg">Filtrar carteira</CardTitle>
            {temFiltro && (
              <Button variant="ghost" size="sm" onClick={limparFiltros}>
                Limpar filtros
              </Button>
            )}
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={busca}
                onChange={event => setBusca(event.target.value)}
                className="pl-9"
                placeholder="Buscar escola ou INEP"
              />
            </div>
            <Select value={municipio} onValueChange={setMunicipio}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os municípios" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os municípios</SelectItem>
                {(painel?.municipios ?? []).map(nome => (
                  <SelectItem key={nome} value={nome}>
                    {nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={tecnicoId} onValueChange={setTecnicoId}>
              <SelectTrigger>
                <SelectValue placeholder="Todos os técnicos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os técnicos</SelectItem>
                {(tecnicosQuery.data ?? []).map(tecnico => (
                  <SelectItem key={tecnico.id} value={String(tecnico.id)}>
                    {tecnico.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={classificacao}
              onValueChange={valor =>
                setClassificacao(valor as ClassificacaoProntidao | "todas")
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Todas as situações" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todas">Todas as situações</SelectItem>
                <SelectItem value="bloqueada">Não saia ainda</SelectItem>
                <SelectItem value="atencao">Confirme antes</SelectItem>
                <SelectItem value="pronta">Prontas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
      </Card>

      <Tabs defaultValue="visitas" className="space-y-5">
        <TabsList>
          <TabsTrigger value="visitas" className="gap-2">
            <ShieldAlert className="h-4 w-4" /> Visitas avaliadas
          </TabsTrigger>
          <TabsTrigger value="causas" className="gap-2">
            <MapPinOff className="h-4 w-4" /> Causas mais frequentes
          </TabsTrigger>
          <TabsTrigger value="material" className="gap-2">
            <Users className="h-4 w-4" /> Material por rota
          </TabsTrigger>
        </TabsList>

        <TabsContent value="visitas">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                {painel?.total ?? 0} visitas avaliadas
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Ordenadas pelo risco de a viagem terminar sem instalação.
              </p>
            </CardHeader>
            <CardContent>
              {itens.length === 0 ? (
                <OperationState
                  kind="empty"
                  title={
                    temFiltro
                      ? "Nenhuma visita para este filtro"
                      : "Nenhuma visita pendente"
                  }
                  description={
                    temFiltro
                      ? "Ajuste ou limpe os filtros para consultar outras escolas."
                      : "Todas as escolas ativas já estão concluídas ou ainda não foram importadas."
                  }
                  actionLabel={temFiltro ? "Limpar filtros" : undefined}
                  onAction={temFiltro ? limparFiltros : undefined}
                />
              ) : (
                <div className="space-y-3">
                  {itens.map(visita => (
                    <CartaoVisita key={visita.escolaId} visita={visita} />
                  ))}
                  {painel && painel.total > itens.length && (
                    <p className="pt-2 text-center text-xs text-muted-foreground">
                      Mostrando as {itens.length} visitas mais críticas de{" "}
                      {painel.total}. Use os filtros para ver as demais.
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="causas">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                O que mais impede a conclusão da visita
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Resolver uma causa no topo da lista destrava várias visitas de uma
                vez.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {(resumo?.sinaisFrequentes.length ?? 0) === 0 ? (
                <OperationState
                  kind="empty"
                  title="Nenhuma pendência registrada"
                  description="As visitas filtradas não apresentam impedimentos nem alertas."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="border-y bg-muted/40 text-left text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3 font-medium">Pendência</th>
                        <th className="px-4 py-3 font-medium">Escolas</th>
                        <th className="px-4 py-3 font-medium">Severidade</th>
                        <th className="px-5 py-3 font-medium">Ação corretiva</th>
                      </tr>
                    </thead>
                    <tbody>
                      {resumo?.sinaisFrequentes.map(sinal => (
                        <tr key={sinal.codigo} className="border-b last:border-0">
                          <td className="px-5 py-4 font-medium">{sinal.titulo}</td>
                          <td className="px-4 py-4 font-semibold">
                            {sinal.ocorrencias}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`rounded-full border px-2 py-1 text-xs font-semibold ${ESTILO_SEVERIDADE[sinal.severidade]}`}
                            >
                              {sinal.severidade}
                            </span>
                          </td>
                          <td className="px-5 py-4 text-muted-foreground">
                            {sinal.acao}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="material">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">
                Cobertura de material por técnico
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Compara os APs previstos nas visitas planejadas com o saldo em posse
                de cada técnico.
              </p>
            </CardHeader>
            <CardContent className="p-0">
              {cobertura.length === 0 ? (
                <OperationState
                  kind="empty"
                  title="Nenhuma rota planejada"
                  description="Atribua escolas aos técnicos para acompanhar a cobertura de material."
                />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[720px] text-sm">
                    <thead className="border-y bg-muted/40 text-left text-muted-foreground">
                      <tr>
                        <th className="px-5 py-3 font-medium">Técnico</th>
                        <th className="px-4 py-3 font-medium">Visitas</th>
                        <th className="px-4 py-3 font-medium">AP necessários</th>
                        <th className="px-4 py-3 font-medium">AP em posse</th>
                        <th className="px-5 py-3 font-medium">Situação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {cobertura.map(rota => (
                        <tr key={rota.tecnicoId} className="border-b last:border-0">
                          <td className="px-5 py-4 font-medium">
                            {rota.tecnicoNome}
                          </td>
                          <td className="px-4 py-4">{rota.visitasPlanejadas}</td>
                          <td className="px-4 py-4 font-semibold">
                            {rota.apNecessarios}
                          </td>
                          <td className="px-4 py-4">
                            {rota.rastreado ? rota.apDisponiveis : "—"}
                          </td>
                          <td className="px-5 py-4">
                            {!rota.rastreado ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-700">
                                <Info className="h-3.5 w-3.5" /> Não rastreado
                              </span>
                            ) : rota.suficiente ? (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800">
                                <CheckCircle2 className="h-3.5 w-3.5" /> Suficiente
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-100 px-2 py-1 text-xs font-semibold text-rose-800">
                                <TriangleAlert className="h-3.5 w-3.5" /> Faltam{" "}
                                {rota.apFaltantes}
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </AdminLayoutTenant>
  );
}
