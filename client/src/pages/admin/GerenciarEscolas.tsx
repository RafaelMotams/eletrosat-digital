import AdminLayoutAuto from "@/components/AdminLayoutAuto";
import { trpc } from "@/lib/trpc";
import { useTenantAuth } from "@/hooks/useTenantAuth";
import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  School, Search, ToggleLeft, ToggleRight, Trash2, FileSpreadsheet,
  Upload, Eye, EyeOff, CheckCircle, AlertTriangle, ChevronDown,
  ChevronUp, Power, PowerOff, X, Download, Info,
} from "lucide-react";
import { toast } from "sonner";
import ImportacaoPlanilha from "@/components/ImportacaoPlanilha";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pendente:      { label: "Pendente",      color: "bg-amber-50 text-amber-700 border-amber-200" },
  em_andamento:  { label: "Em Andamento",  color: "bg-blue-50 text-blue-700 border-blue-200" },
  concluido:     { label: "Concluído",     color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  nao_instalada: { label: "Não Instalada", color: "bg-red-50 text-red-700 border-red-200" },
};

export default function GerenciarEscolas() {
  const utils = trpc.useUtils();
  const { admin } = useTenantAuth();
  const podeGerenciarPlanilhas = admin?.role === "admin" || admin?.isSuperAdmin === true;

  // ── Dados ──────────────────────────────────────────────────────────────────
  const { data: escolas, isLoading: loadingEscolas } = trpc.escolas.list.useQuery({});
  const { data: planilhas, isLoading: loadingPlanilhas } = trpc.planilhasImportadas.listar.useQuery();

  // ── Estado UI ──────────────────────────────────────────────────────────────
  const [busca, setBusca] = useState("");
  const [mostrarLista, setMostrarLista] = useState(true);
  const [filtroAtivo, setFiltroAtivo] = useState<"todos" | "ativo" | "inativo">("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [abaAtiva, setAbaAtiva] = useState<"escolas" | "planilhas">("escolas");

  // Modal importar planilha
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Modal confirmar apagar planilha
  const [planilhaParaApagar, setPlanilhaParaApagar] = useState<number | null>(null);
  const [confirmacaoApagarPlanilha, setConfirmacaoApagarPlanilha] = useState("");

  // Modal confirmar desativar em massa
  const [confirmarDesativarTodas, setConfirmarDesativarTodas] = useState(false);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const toggleAtivoMut = trpc.escolas.toggleAtivo.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.ativo ? "Escola ativada com sucesso" : "Escola desativada com sucesso");
      utils.escolas.list.invalidate();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const togglePlanilhaMut = trpc.planilhasImportadas.toggleAtiva.useMutation({
    onSuccess: (_, vars) => {
      toast.success(vars.ativa ? "Planilha ativada" : "Planilha desativada");
      utils.planilhasImportadas.listar.invalidate();
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  const apagarPlanilhaMut = trpc.planilhasImportadas.apagar.useMutation({
    onSuccess: () => {
      toast.success("Planilha removida do histórico");
      utils.planilhasImportadas.listar.invalidate();
      setPlanilhaParaApagar(null);
      setConfirmacaoApagarPlanilha("");
    },
    onError: (e) => toast.error("Erro: " + e.message),
  });

  // ── Filtros ────────────────────────────────────────────────────────────────
  const escolasFiltradas = useMemo(() => {
    if (!escolas) return [];
    return escolas.filter((e) => {
      const matchBusca =
        !busca ||
        e.nome.toLowerCase().includes(busca.toLowerCase()) ||
        (e.inep ?? "").includes(busca) ||
        (e.municipio ?? "").toLowerCase().includes(busca.toLowerCase());
      const matchAtivo =
        filtroAtivo === "todos" ||
        (filtroAtivo === "ativo" && (e as any).ativo !== false) ||
        (filtroAtivo === "inativo" && (e as any).ativo === false);
      const matchStatus =
        filtroStatus === "todos" || e.status === filtroStatus;
      return matchBusca && matchAtivo && matchStatus;
    });
  }, [escolas, busca, filtroAtivo, filtroStatus]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!escolas) return { total: 0, ativas: 0, inativas: 0, concluidas: 0 };
    const ativas = escolas.filter((e) => (e as any).ativo !== false).length;
    const inativas = escolas.filter((e) => (e as any).ativo === false).length;
    const concluidas = escolas.filter((e) => e.status === "concluido").length;
    return { total: escolas.length, ativas, inativas, concluidas };
  }, [escolas]);

  return (
    <AdminLayoutAuto title="Escolas — Gerenciar">

      {/* ── Abas ── */}
      <div className="flex gap-1 mb-6 p-1 rounded-xl w-fit"
        style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
        {[
          { key: "escolas",   label: "Lista de Escolas",    icon: School },
          { key: "planilhas", label: "Planilhas Importadas", icon: FileSpreadsheet },
        ].map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => setAbaAtiva(key as any)}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all"
            style={{
              background: abaAtiva === key ? "linear-gradient(135deg, #10b981, #059669)" : "transparent",
              color: abaAtiva === key ? "white" : "rgba(255,255,255,0.5)",
              boxShadow: abaAtiva === key ? "0 2px 8px rgba(16,185,129,0.3)" : "none",
            }}
          >
            <Icon size={15} />
            {label}
          </button>
        ))}
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          ABA: LISTA DE ESCOLAS
      ══════════════════════════════════════════════════════════════════════ */}
      {abaAtiva === "escolas" && (
        <>
          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            {[
              { label: "Total",     value: stats.total,     icon: School,        color: "#3b82f6" },
              { label: "Ativas",    value: stats.ativas,    icon: Power,         color: "#10b981" },
              { label: "Inativas",  value: stats.inativas,  icon: PowerOff,      color: "#ef4444" },
              { label: "Concluídas",value: stats.concluidas,icon: CheckCircle,   color: "#8b5cf6" },
            ].map((s, i) => {
              const Icon = s.icon;
              return (
                <Card key={i} className="border-0 shadow-sm">
                  <CardContent className="p-4 flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: s.color + "18" }}>
                      <Icon size={16} style={{ color: s.color }} />
                    </div>
                    <div>
                      <p className="text-xl font-bold text-foreground">{s.value}</p>
                      <p className="text-xs text-muted-foreground">{s.label}</p>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Toolbar */}
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {/* Busca */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Buscar por nome, INEP ou município..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
              />
              {busca && (
                <button
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setBusca("")}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filtro ativo/inativo */}
            <div className="flex gap-1 p-1 rounded-lg border border-border bg-muted/30">
              {[
                { key: "todos",   label: "Todas" },
                { key: "ativo",   label: "Ativas" },
                { key: "inativo", label: "Inativas" },
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFiltroAtivo(key as any)}
                  className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
                  style={{
                    background: filtroAtivo === key ? "white" : "transparent",
                    color: filtroAtivo === key ? "#0f172a" : "rgba(0,0,0,0.5)",
                    boxShadow: filtroAtivo === key ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
                  }}
                >
                  {label}
                </button>
              ))}
            </div>

            {/* Ocultar/Mostrar lista */}
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setMostrarLista(!mostrarLista)}
            >
              {mostrarLista ? <EyeOff size={15} /> : <Eye size={15} />}
              {mostrarLista ? "Ocultar Lista" : "Mostrar Lista"}
            </Button>
          </div>

          {/* Contador */}
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm text-muted-foreground">
              {escolasFiltradas.length} escola(s)
              {escolas && escolas.length !== escolasFiltradas.length && ` de ${escolas.length} total`}
            </p>
          </div>

          {/* Lista de escolas */}
          {mostrarLista && (
            <Card className="border-0 shadow-sm overflow-hidden">
              {loadingEscolas ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                    <p className="text-sm text-muted-foreground">Carregando escolas...</p>
                  </div>
                </div>
              ) : escolasFiltradas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <School size={32} className="text-muted-foreground/40" />
                  <p className="text-sm text-muted-foreground">Nenhuma escola encontrada</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr style={{ background: "rgba(0,0,0,0.03)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                        <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Escola</th>
                        <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide hidden sm:table-cell">INEP</th>
                        <th className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide hidden md:table-cell">Município</th>
                        <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Status</th>
                        <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Situação</th>
                        <th className="text-center px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">Ação</th>
                      </tr>
                    </thead>
                    <tbody>
                      {escolasFiltradas.map((escola, idx) => {
                        const isAtiva = (escola as any).ativo !== false;
                        const statusInfo = STATUS_LABELS[escola.status] ?? { label: escola.status, color: "bg-gray-100 text-gray-700 border-gray-200" };
                        return (
                          <tr
                            key={escola.id}
                            style={{
                              borderBottom: "1px solid rgba(0,0,0,0.04)",
                              background: !isAtiva ? "rgba(239,68,68,0.03)" : idx % 2 === 0 ? "transparent" : "rgba(0,0,0,0.01)",
                              opacity: isAtiva ? 1 : 0.7,
                            }}
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ background: isAtiva ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)" }}>
                                  <School size={13} style={{ color: isAtiva ? "#10b981" : "#ef4444" }} />
                                </div>
                                <span className="font-medium text-foreground text-xs leading-tight max-w-[180px] truncate" title={escola.nome}>
                                  {escola.nome}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-3 hidden sm:table-cell">
                              <span className="font-mono text-xs text-muted-foreground">{escola.inep}</span>
                            </td>
                            <td className="px-4 py-3 hidden md:table-cell">
                              <span className="text-xs text-muted-foreground">{escola.municipio ?? "—"}</span>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge variant="outline" className={`text-xs border ${statusInfo.color}`}>
                                {statusInfo.label}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <Badge
                                variant="outline"
                                className={`text-xs border ${isAtiva ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}
                              >
                                {isAtiva ? "Ativa" : "Inativa"}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-center">
                              <button
                                onClick={() => toggleAtivoMut.mutate({ id: escola.id, ativo: !isAtiva })}
                                disabled={toggleAtivoMut.isPending}
                                title={isAtiva ? "Desativar escola" : "Ativar escola"}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all border"
                                style={{
                                  background: isAtiva ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)",
                                  color: isAtiva ? "#ef4444" : "#10b981",
                                  borderColor: isAtiva ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)",
                                  cursor: toggleAtivoMut.isPending ? "not-allowed" : "pointer",
                                }}
                              >
                                {isAtiva ? <PowerOff size={12} /> : <Power size={12} />}
                                {isAtiva ? "Desativar" : "Ativar"}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          )}

          {!mostrarLista && (
            <Card className="border-dashed border-2 border-muted">
              <CardContent className="flex flex-col items-center justify-center py-12 gap-3">
                <EyeOff size={32} className="text-muted-foreground/40" />
                <p className="text-sm text-muted-foreground font-medium">Lista de escolas oculta</p>
                <p className="text-xs text-muted-foreground">{escolas?.length ?? 0} escolas no sistema</p>
                <Button variant="outline" size="sm" className="gap-2 mt-1" onClick={() => setMostrarLista(true)}>
                  <Eye size={14} /> Mostrar lista
                </Button>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          ABA: PLANILHAS IMPORTADAS
      ══════════════════════════════════════════════════════════════════════ */}
      {abaAtiva === "planilhas" && (
        <>
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-bold text-foreground">Planilhas Importadas</h2>
              <p className="text-sm text-muted-foreground mt-0.5">
                Histórico de planilhas carregadas no sistema. Você pode ativar, desativar ou remover do histórico.
              </p>
            </div>
            {podeGerenciarPlanilhas && (
              <Button
                className="gap-2"
                style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white" }}
                onClick={() => setImportDialogOpen(true)}
              >
                <Upload size={15} />
                Importar Planilha
              </Button>
            )}
          </div>

          {/* Info box */}
          <Card className="mb-6 border-blue-200 bg-blue-50/50">
            <CardContent className="p-4 flex gap-3">
              <Info size={16} className="text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                <strong>Como funciona:</strong> Cada planilha importada registra um histórico de upload. 
                Ativar ou desativar uma planilha aqui é apenas um controle de registro — 
                as escolas já importadas permanecem no banco. Para desativar escolas individualmente, use a aba <strong>Lista de Escolas</strong>.
              </p>
            </CardContent>
          </Card>

          {/* Lista de planilhas */}
          {loadingPlanilhas ? (
            <div className="flex items-center justify-center py-16">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          ) : !planilhas || planilhas.length === 0 ? (
            <Card className="border-dashed border-2 border-muted">
              <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
                <FileSpreadsheet size={40} className="text-muted-foreground/30" />
                <div className="text-center">
                  <p className="font-semibold text-foreground">Nenhuma planilha importada ainda</p>
                  <p className="text-sm text-muted-foreground mt-1">Importe uma planilha de escolas para começar</p>
                </div>
                {podeGerenciarPlanilhas && (
                  <Button
                    className="gap-2 mt-2"
                    style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white" }}
                    onClick={() => setImportDialogOpen(true)}
                  >
                    <Upload size={15} />
                    Importar Planilha
                  </Button>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="flex flex-col gap-3">
              {planilhas.map((p) => (
                <Card key={p.id} className="border-0 shadow-sm overflow-hidden">
                  <CardContent className="p-0">
                    <div className="flex items-center gap-4 p-4">
                      {/* Ícone */}
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{ background: p.ativa ? "rgba(16,185,129,0.1)" : "rgba(239,68,68,0.1)" }}>
                        <FileSpreadsheet size={22} style={{ color: p.ativa ? "#10b981" : "#ef4444" }} />
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="font-semibold text-foreground text-sm truncate">{p.nome}</p>
                          <Badge
                            variant="outline"
                            className={`text-xs border flex-shrink-0 ${p.ativa ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-red-50 text-red-700 border-red-200"}`}
                          >
                            {p.ativa ? "Ativa" : "Inativa"}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-4 mt-1 flex-wrap">
                          {p.totalEscolas != null && p.totalEscolas > 0 && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <School size={11} />
                              {p.totalEscolas} escola(s)
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {new Date(p.createdAt).toLocaleDateString("pt-BR", {
                              day: "2-digit", month: "2-digit", year: "numeric",
                              hour: "2-digit", minute: "2-digit",
                            })}
                          </span>
                          {p.descricao && (
                            <span className="text-xs text-muted-foreground italic truncate max-w-[200px]">{p.descricao}</span>
                          )}
                        </div>
                      </div>

                      {/* Ações */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {/* Download */}
                        <a
                          href={p.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Baixar planilha"
                          className="w-8 h-8 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                        >
                          <Download size={14} />
                        </a>

                        {podeGerenciarPlanilhas && (
                          <>
                            {/* Toggle ativa/inativa */}
                            <button
                              onClick={() => togglePlanilhaMut.mutate({ id: p.id, ativa: !p.ativa })}
                              disabled={togglePlanilhaMut.isPending}
                              title={p.ativa ? "Desativar planilha" : "Ativar planilha"}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all"
                              style={{
                                background: p.ativa ? "rgba(239,68,68,0.06)" : "rgba(16,185,129,0.06)",
                                color: p.ativa ? "#ef4444" : "#10b981",
                                borderColor: p.ativa ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)",
                              }}
                            >
                              {p.ativa ? <ToggleRight size={13} /> : <ToggleLeft size={13} />}
                              {p.ativa ? "Desativar" : "Ativar"}
                            </button>

                            {/* Apagar do histórico */}
                            <button
                              onClick={() => { setPlanilhaParaApagar(p.id); setConfirmacaoApagarPlanilha(""); }}
                              title="Remover do histórico"
                              className="w-8 h-8 rounded-lg flex items-center justify-center border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                            >
                              <Trash2 size={14} />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── Modal Importar Planilha ── */}
      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Upload size={18} className="text-primary" />
              Importar Planilha de Escolas
            </DialogTitle>
          </DialogHeader>
          <ImportacaoPlanilha
            onConcluido={(total) => {
              setImportDialogOpen(false);
              utils.escolas.list.invalidate();
              toast.success(`${total} escola(s) importadas com sucesso!`);
            }}
          />
        </DialogContent>
      </Dialog>

      {/* ── Modal Confirmar Apagar Planilha ── */}
      <Dialog open={planilhaParaApagar !== null} onOpenChange={(o) => {
        if (!o) {
          setPlanilhaParaApagar(null);
          setConfirmacaoApagarPlanilha("");
        }
      }}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={18} />
              Remover do histórico?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Isso remove apenas o registro desta planilha do histórico. 
            <strong> As escolas importadas não serão afetadas.</strong>
          </p>
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            <strong>Confirmação necessária:</strong> digite <code className="rounded bg-amber-100 px-1 font-semibold">REMOVER</code> para excluir o histórico desta planilha. A ação só é aceita para registros do seu tenant.
          </div>
          <Input
            value={confirmacaoApagarPlanilha}
            onChange={(event) => setConfirmacaoApagarPlanilha(event.target.value)}
            placeholder="Digite REMOVER"
            aria-label="Confirmação para remover histórico de planilha"
          />
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setPlanilhaParaApagar(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => planilhaParaApagar && apagarPlanilhaMut.mutate({ id: planilhaParaApagar })}
              disabled={apagarPlanilhaMut.isPending || confirmacaoApagarPlanilha !== "REMOVER"}
            >
              {apagarPlanilhaMut.isPending ? "Removendo..." : "Remover"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayoutAuto>
  );
}
