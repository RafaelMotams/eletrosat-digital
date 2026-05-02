import AdminLayoutAuto from "@/components/AdminLayoutAuto";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import {
  ClipboardList, Plus, School, User, Calendar, Image,
  AlertTriangle, Play, CheckCircle, Clock, XCircle,
  Search, Filter, Download, RefreshCw, ChevronDown,
  Wifi, Eye, MoreHorizontal, TrendingUp, Trash2
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string; icon: React.ElementType }> = {
  aberta:        { label: "Aberta",        color: "oklch(0.42 0.14 60)",  bg: "oklch(0.96 0.04 60)",  border: "oklch(0.88 0.08 60)",  icon: Clock },
  em_andamento:  { label: "Em andamento",  color: "oklch(0.30 0.14 240)", bg: "oklch(0.94 0.05 240)", border: "oklch(0.84 0.08 240)", icon: Play },
  concluida:     { label: "Concluída",     color: "oklch(0.34 0.16 162)", bg: "oklch(0.93 0.07 162)", border: "oklch(0.82 0.10 162)", icon: CheckCircle },
  nao_instalada: { label: "Não instalada", color: "oklch(0.45 0.20 25)",  bg: "oklch(0.96 0.04 25)",  border: "oklch(0.88 0.10 25)",  icon: XCircle },
};

const MOTIVO_LABEL: Record<string, string> = {
  escola_desativada: "Escola desativada",
  em_reforma: "Em reforma",
  mudanca_endereco: "Mudança de endereço",
};

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? STATUS_CONFIG.aberta;
  const Icon = cfg.icon;
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold"
      style={{ color: cfg.color, background: cfg.bg, border: `1px solid ${cfg.border}` }}>
      <Icon className="w-3 h-3" />
      {cfg.label}
    </span>
  );
}

export default function AdminOrdens() {
  const utils = trpc.useUtils();
  const { data: ordens, isLoading, refetch } = trpc.ordens.list.useQuery({});
  const { data: escolas } = trpc.escolas.list.useQuery({});
  const { data: tecnicos } = trpc.tecnicos.list.useQuery();

  const criarMut = trpc.ordens.criar.useMutation({
    onSuccess: () => {
      toast.success("OS criada com sucesso!");
      utils.ordens.list.invalidate();
      utils.escolas.list.invalidate();
      setOpen(false);
      setEscolaSel(""); setTecnicoSel("");
    },
    onError: (e) => toast.error(e.message),
  });

  const [open, setOpen] = useState(false);
  const [escolaSel, setEscolaSel] = useState("");
  const [tecnicoSel, setTecnicoSel] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [searchQuery, setSearchQuery] = useState("");
  const [fotoModal, setFotoModal] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"table" | "cards">("table");
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const deletarTodasMut = trpc.ordens.deletarTodas.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.total} OS excluídas com sucesso!`);
      utils.ordens.list.invalidate();
      utils.dashboard.stats.invalidate();
      setDeleteAllOpen(false);
      setDeleteConfirmText("");
    },
    onError: (e) => toast.error(e.message),
  });

  function getEscolaNome(id: number) { return escolas?.find(e => e.id === id)?.nome ?? `Escola #${id}`; }
  function getTecnicoNome(id: number) { return tecnicos?.find(t => t.id === id)?.nome ?? `Técnico #${id}`; }

  const filtered = useMemo(() => {
    let list = ordens ?? [];
    if (statusFilter !== "todos") list = list.filter(o => o.status === statusFilter);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      list = list.filter(o =>
        getEscolaNome(o.escolaId).toLowerCase().includes(q) ||
        getTecnicoNome(o.tecnicoId).toLowerCase().includes(q) ||
        String(o.id).includes(q)
      );
    }
    return list;
  }, [ordens, statusFilter, searchQuery, escolas, tecnicos]);

  const counts = useMemo(() => {
    const all = ordens ?? [];
    return {
      todos: all.length,
      aberta: all.filter(o => o.status === "aberta").length,
      em_andamento: all.filter(o => o.status === "em_andamento").length,
      concluida: all.filter(o => o.status === "concluida").length,
      nao_instalada: all.filter(o => o.status === "nao_instalada").length,
    };
  }, [ordens]);

  function handleCriar() {
    if (!escolaSel || !tecnicoSel) { toast.error("Selecione escola e técnico"); return; }
    criarMut.mutate({ escolaId: Number(escolaSel), tecnicoId: Number(tecnicoSel) });
  }

  const pctConcluido = counts.todos > 0 ? Math.round((counts.concluida / counts.todos) * 100) : 0;

  return (
    <AdminLayoutAuto title="Ordens de Serviço">
      {/* Header com métricas rápidas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total", value: counts.todos, color: "oklch(0.30 0.10 240)", bg: "oklch(0.94 0.05 240)" },
          { label: "Abertas", value: counts.aberta, color: "oklch(0.42 0.14 60)", bg: "oklch(0.96 0.04 60)" },
          { label: "Em andamento", value: counts.em_andamento, color: "oklch(0.30 0.14 240)", bg: "oklch(0.94 0.05 240)" },
          { label: "Concluídas", value: counts.concluida, color: "oklch(0.34 0.16 162)", bg: "oklch(0.93 0.07 162)" },
        ].map(m => (
          <div key={m.label} className="bg-card rounded-2xl border border-border p-4 shadow-sm">
            <p className="text-xs font-semibold text-muted-foreground mb-1">{m.label}</p>
            <p className="text-2xl font-black" style={{ color: m.color, fontFamily: "var(--font-display)" }}>{m.value}</p>
            {m.label === "Concluídas" && (
              <div className="mt-2">
                <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-700"
                    style={{ width: `${pctConcluido}%`, background: "oklch(0.50 0.18 162)" }} />
                </div>
                <p className="text-xs text-muted-foreground mt-1">{pctConcluido}% concluído</p>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="bg-card rounded-2xl border border-border p-4 mb-4 shadow-sm">
        <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
          <div className="flex flex-1 gap-2 min-w-0">
            {/* Busca */}
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por escola, técnico ou OS..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
            {/* Filtro de status */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40 rounded-xl">
                <Filter className="w-3.5 h-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas ({counts.todos})</SelectItem>
                <SelectItem value="aberta">Abertas ({counts.aberta})</SelectItem>
                <SelectItem value="em_andamento">Em andamento ({counts.em_andamento})</SelectItem>
                <SelectItem value="concluida">Concluídas ({counts.concluida})</SelectItem>
                <SelectItem value="nao_instalada">Não instaladas ({counts.nao_instalada})</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => refetch()} className="rounded-xl gap-1.5">
              <RefreshCw className="w-3.5 h-3.5" /> Atualizar
            </Button>
            <Button size="sm" onClick={() => setOpen(true)} className="rounded-xl gap-1.5"
              style={{ background: "linear-gradient(135deg, oklch(0.28 0.10 240), oklch(0.36 0.14 240))", color: "white", border: "none" }}>
              <Plus className="w-4 h-4" /> Nova OS
            </Button>
            <Button variant="outline" size="sm"
              onClick={() => { setDeleteAllOpen(true); setDeleteConfirmText(""); }}
              className="rounded-xl gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-300 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950">
              <Trash2 className="w-3.5 h-3.5" /> Excluir Todas
            </Button>
          </div>
        </div>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-4 p-4 border-b border-border last:border-0">
              <div className="w-8 h-8 rounded-lg bg-muted animate-pulse" />
              <div className="flex-1 space-y-2">
                <div className="h-3 bg-muted rounded animate-pulse w-1/3" />
                <div className="h-2.5 bg-muted rounded animate-pulse w-1/2" />
              </div>
              <div className="w-20 h-6 bg-muted rounded-full animate-pulse" />
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-card rounded-2xl border border-border p-16 text-center shadow-sm">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "oklch(0.94 0.015 240)" }}>
            <ClipboardList className="w-8 h-8 text-muted-foreground opacity-40" />
          </div>
          <p className="font-semibold text-foreground mb-1">Nenhuma OS encontrada</p>
          <p className="text-sm text-muted-foreground mb-4">
            {searchQuery ? "Tente outros termos de busca" : "Crie a primeira ordem de serviço"}
          </p>
          {!searchQuery && (
            <Button onClick={() => setOpen(true)} className="gap-2">
              <Plus className="w-4 h-4" /> Nova OS
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm">
          {/* Table header */}
          <div className="hidden lg:grid grid-cols-[2.5rem_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b border-border"
            style={{ background: "oklch(0.97 0.008 240)" }}>
            {["#", "Escola", "Técnico", "Status", "Data / APs", "Ações"].map(h => (
              <p key={h} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{h}</p>
            ))}
          </div>
          {/* Rows */}
          <div className="divide-y divide-border">
            {filtered.map((os, idx) => {
              const cfg = STATUS_CONFIG[os.status] ?? STATUS_CONFIG.aberta;
              const Icon = cfg.icon;
              const hasFoto = !!(os as any).fotoMapaCalorUrl;
              const isNaoInstalada = os.status === "nao_instalada";
              return (
                <div key={os.id}
                  className="grid grid-cols-1 lg:grid-cols-[2.5rem_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3.5 hover:bg-muted/30 transition-colors animate-fade-in"
                  style={{ animationDelay: `${idx * 0.03}s` }}>
                  {/* ID */}
                  <div className="hidden lg:flex items-center">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: cfg.bg }}>
                      <Icon className="w-4 h-4" style={{ color: cfg.color }} />
                    </div>
                  </div>
                  {/* Escola */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="lg:hidden w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                      style={{ background: cfg.bg }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: cfg.color }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground truncate">{getEscolaNome(os.escolaId)}</p>
                      <p className="text-xs text-muted-foreground">OS #{os.id}</p>
                    </div>
                  </div>
                  {/* Técnico */}
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                      style={{ background: "oklch(0.38 0.18 290)" }}>
                      {getTecnicoNome(os.tecnicoId).charAt(0).toUpperCase()}
                    </div>
                    <p className="text-sm text-foreground truncate">{getTecnicoNome(os.tecnicoId)}</p>
                  </div>
                  {/* Status */}
                  <div className="flex items-center">
                    <StatusBadge status={os.status} />
                  </div>
                  {/* Data / APs */}
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Calendar className="w-3 h-3" />
                      {new Date(os.dataAbertura).toLocaleDateString("pt-BR")}
                    </div>
                    {os.qtdApInstalado != null && (
                      <div className="flex items-center gap-1 text-xs font-semibold" style={{ color: "oklch(0.40 0.18 162)" }}>
                        <Wifi className="w-3 h-3" />
                        {os.qtdApInstalado} AP(s) instalado(s)
                      </div>
                    )}
                    {isNaoInstalada && (os as any).motivoNaoInstalacao && (
                      <div className="flex items-center gap-1 text-xs font-medium" style={{ color: "oklch(0.45 0.20 25)" }}>
                        <AlertTriangle className="w-3 h-3" />
                        {MOTIVO_LABEL[(os as any).motivoNaoInstalacao] ?? (os as any).motivoNaoInstalacao}
                      </div>
                    )}
                    {os.observacao && (
                      <p className="text-xs text-muted-foreground italic truncate max-w-[180px]">"{os.observacao}"</p>
                    )}
                  </div>
                  {/* Ações */}
                  <div className="flex items-center gap-2">
                    {hasFoto && (
                      <button
                        onClick={() => setFotoModal((os as any).fotoMapaCalorUrl)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                        style={{ background: "oklch(0.93 0.07 162)", color: "oklch(0.34 0.16 162)", border: "1px solid oklch(0.82 0.10 162)" }}>
                        <Image className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Mapa de calor</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          {/* Footer */}
          <div className="px-4 py-3 border-t border-border flex items-center justify-between"
            style={{ background: "oklch(0.97 0.008 240)" }}>
            <p className="text-xs text-muted-foreground">
              Exibindo <span className="font-semibold text-foreground">{filtered.length}</span> de <span className="font-semibold text-foreground">{ordens?.length ?? 0}</span> OS
            </p>
            <div className="flex items-center gap-1.5">
              <TrendingUp className="w-3.5 h-3.5" style={{ color: "oklch(0.50 0.18 162)" }} />
              <span className="text-xs font-semibold" style={{ color: "oklch(0.50 0.18 162)" }}>{pctConcluido}% concluído</span>
            </div>
          </div>
        </div>
      )}

      {/* Modal foto mapa de calor */}
      {fotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          onClick={() => setFotoModal(null)}>
          <div className="relative max-w-2xl w-full animate-scale-in" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-3">
              <span className="text-white font-bold flex items-center gap-2 text-sm">
                <Image className="w-4 h-4" /> Mapa de Calor Wi-Fi
              </span>
              <button onClick={() => setFotoModal(null)}
                className="w-8 h-8 rounded-full flex items-center justify-center text-white transition-colors hover:bg-white/20"
                style={{ background: "rgba(255,255,255,0.1)" }}>
                ✕
              </button>
            </div>
            <img src={fotoModal} alt="Mapa de calor" className="w-full rounded-2xl shadow-2xl"
              style={{ maxHeight: "80vh", objectFit: "contain" }} />
          </div>
        </div>
      )}

      {/* Modal excluir todas as OS */}
      <Dialog open={deleteAllOpen} onOpenChange={setDeleteAllOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100">
                <Trash2 className="w-4 h-4 text-red-600" />
              </div>
              Excluir Todas as OS
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="p-3 rounded-xl bg-red-50 border border-red-200 dark:bg-red-950/30 dark:border-red-900">
              <p className="text-sm text-red-700 dark:text-red-400 font-medium">
                ⚠️ Esta ação é <strong>irreversível</strong>. Todas as <strong>{counts.todos} ordens de serviço</strong> serão permanentemente excluídas.
              </p>
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block text-foreground">
                Digite <span className="font-mono bg-muted px-1.5 py-0.5 rounded text-red-600">CONFIRMAR</span> para prosseguir
              </label>
              <input
                value={deleteConfirmText}
                onChange={e => setDeleteConfirmText(e.target.value)}
                placeholder="CONFIRMAR"
                className="w-full px-3 py-2 rounded-xl text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-red-300 focus:border-red-400 transition-all font-mono"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteAllOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button
              onClick={() => deletarTodasMut.mutate({ confirmacao: "CONFIRMAR" })}
              disabled={deleteConfirmText !== "CONFIRMAR" || deletarTodasMut.isPending}
              className="rounded-xl gap-2 bg-red-600 hover:bg-red-700 text-white border-none">
              {deletarTodasMut.isPending ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Excluindo...</>
              ) : (
                <><Trash2 className="w-4 h-4" />Excluir Todas ({counts.todos})</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal criar OS */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ background: "oklch(0.94 0.05 240)" }}>
                <ClipboardList className="w-4 h-4" style={{ color: "oklch(0.30 0.10 240)" }} />
              </div>
              Nova Ordem de Serviço
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <label className="text-sm font-semibold mb-2 block text-foreground">Escola</label>
              <Select value={escolaSel} onValueChange={setEscolaSel}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione a escola" />
                </SelectTrigger>
                <SelectContent>
                  {escolas?.filter(e => e.status !== "concluido").map(e => (
                    <SelectItem key={e.id} value={String(e.id)}>
                      {e.nome} — {e.municipio}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block text-foreground">Técnico Responsável</label>
              <Select value={tecnicoSel} onValueChange={setTecnicoSel}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue placeholder="Selecione o técnico" />
                </SelectTrigger>
                <SelectContent>
                  {tecnicos?.filter(t => t.ativo).map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      {t.nome} {t.cidadeResponsavel ? `— ${t.cidadeResponsavel}` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button onClick={handleCriar} disabled={criarMut.isPending} className="rounded-xl gap-2"
              style={{ background: "linear-gradient(135deg, oklch(0.28 0.10 240), oklch(0.36 0.14 240))", color: "white", border: "none" }}>
              {criarMut.isPending ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Criando...</>
              ) : (
                <><Plus className="w-4 h-4" />Criar OS</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayoutAuto>
  );
}
