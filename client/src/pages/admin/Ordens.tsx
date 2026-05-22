import AdminLayoutAuto from "@/components/AdminLayoutAuto";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { useState, useMemo } from "react";
import {
  ClipboardList, Plus, Calendar, Image,
  AlertTriangle, Play, CheckCircle, Clock, XCircle,
  Search, Filter, RefreshCw,
  Wifi, TrendingUp, Trash2, Camera, X, Download, FileSpreadsheet,
  ChevronDown
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

const CATS_FOTOS = [
  { id: "mapa_calor",             label: "Mapa de Calor",  icon: "🌡️", color: "#f97316" },
  { id: "fotos_ap",               label: "Etiqueta do AP", icon: "🏷️", color: "#8b5cf6" },
  { id: "etiqueta_controladora",  label: "Controladora",   icon: "🖥️", color: "#06b6d4" },
  { id: "etiqueta_nobreak",       label: "Nobreak",        icon: "🔋", color: "#10b981" },
  { id: "etiqueta_switch",        label: "Switch",         icon: "🔀", color: "#f59e0b" },
] as const;

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

// ─── Modal de fotos por categoria ─────────────────────────────────────────────
function FotosOsModal({
  osId,
  escolaId,
  escolaNome,
  onClose,
}: {
  osId: number;
  escolaId: number;
  escolaNome: string;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<string>("mapa_calor");
  const [lightbox, setLightbox] = useState<string | null>(null);

  // Busca fotos por escola (agrega todas as OS da escola, evita problema de OS duplicadas offline)
  const { data: fotosPorEscola, isLoading: loadingEscola } = trpc.ordens.getOsFotosByEscola.useQuery({ escolaId });
  // Fallback: busca por osId se a query por escola falhar
  const { data: fotosPorOs, isLoading: loadingOs } = trpc.ordens.getOsFotos.useQuery(
    { osId },
    { enabled: !fotosPorEscola || fotosPorEscola.length === 0 }
  );

  const isLoading = loadingEscola || loadingOs;
  const fotos = (fotosPorEscola && fotosPorEscola.length > 0) ? fotosPorEscola : (fotosPorOs ?? []);

  const fotosAba = (fotos ?? []).filter((f: { categoria: string }) => f.categoria === tab);

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(16px)" }}
        onClick={onClose}>
        <div className="relative w-full max-w-2xl rounded-3xl overflow-hidden flex flex-col"
          style={{
            background: "linear-gradient(160deg, #0f172a 0%, #1e293b 100%)",
            border: "1px solid rgba(255,255,255,0.1)",
            maxHeight: "90vh",
          }}
          onClick={e => e.stopPropagation()}>

          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.15)" }}>
                <Camera className="w-4 h-4" style={{ color: "#60a5fa" }} />
              </div>
              <div>
                <p className="text-white font-black text-sm">Fotos da OS #{osId}</p>
                <p className="text-xs truncate max-w-xs" style={{ color: "rgba(148,163,184,0.5)" }}>{escolaNome}</p>
              </div>
            </div>
            <button onClick={onClose}
              className="w-8 h-8 rounded-full flex items-center justify-center transition-colors hover:bg-white/10"
              style={{ background: "rgba(255,255,255,0.07)" }}>
              <X className="w-4 h-4 text-white" />
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1.5 px-4 py-3 overflow-x-auto"
            style={{ borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
            {CATS_FOTOS.map(cat => {
              const qtd = (fotos ?? []).filter((f: { categoria: string }) => f.categoria === cat.id).length;
              const ativa = tab === cat.id;
              return (
                <button key={cat.id}
                  onClick={() => setTab(cat.id)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex-shrink-0"
                  style={{
                    background: ativa ? `${cat.color}22` : "rgba(255,255,255,0.04)",
                    border: ativa ? `1.5px solid ${cat.color}66` : "1px solid rgba(255,255,255,0.07)",
                    color: ativa ? cat.color : "rgba(148,163,184,0.5)",
                  }}>
                  <span>{cat.icon}</span>
                  <span>{cat.label}</span>
                  {qtd > 0 && (
                    <span className="px-1.5 py-0.5 rounded-full text-[10px] font-black"
                      style={{ background: "rgba(16,185,129,0.2)", color: "#34d399" }}>
                      {qtd}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Conteúdo */}
          <div className="flex-1 overflow-y-auto p-5">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              </div>
            ) : fotosAba.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  <Camera className="w-7 h-7" style={{ color: "rgba(148,163,184,0.2)" }} />
                </div>
                <p className="text-sm font-semibold" style={{ color: "rgba(148,163,184,0.4)" }}>
                  Nenhuma foto enviada nesta categoria
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {fotosAba.map((f: { id: number; url: string }) => (
                  <button key={f.id}
                    onClick={() => setLightbox(f.url)}
                    className="aspect-square rounded-2xl overflow-hidden transition-all hover:scale-105 active:scale-95"
                    style={{ border: "1.5px solid rgba(255,255,255,0.08)" }}>
                    <img src={f.url} alt="Foto OS" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3 flex items-center justify-between"
            style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
            <p className="text-xs" style={{ color: "rgba(148,163,184,0.4)" }}>
              Total: <span className="font-bold text-white">{(fotos ?? []).length}</span> foto{(fotos ?? []).length !== 1 ? "s" : ""}
            </p>
            <div className="flex gap-1">
              {CATS_FOTOS.map(cat => {
                const temFoto = (fotos ?? []).some((f: { categoria: string }) => f.categoria === cat.id);
                return (
                  <div key={cat.id}
                    className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold"
                    style={{
                      background: temFoto ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.05)",
                      color: temFoto ? "#34d399" : "rgba(148,163,184,0.3)",
                    }}>
                    {temFoto ? "✓" : "·"}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.96)" }}
          onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Foto" className="max-w-full max-h-full rounded-2xl object-contain" />
          <button className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)" }}
            onClick={() => setLightbox(null)}>
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
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
  const [fotosOsModal, setFotosOsModal] = useState<{ osId: number; escolaId: number; escolaNome: string } | null>(null);
  const [deleteAllOpen, setDeleteAllOpen] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
   const [exportOpen, setExportOpen] = useState(false);
  const [valorPorAp, setValorPorAp] = useState("");
  const [exportando, setExportando] = useState(false);
  const [exportTecnicoId, setExportTecnicoId] = useState("todos");

  // Estados para modais de gestão de OS
  const [concluirModal, setConcluirModal] = useState<{ osId: number; escolaNome: string } | null>(null);
  const [naoInstaladaModal, setNaoInstaladaModal] = useState<{ osId: number; escolaNome: string } | null>(null);
  const [concluirQtd, setConcluirQtd] = useState("");
  const [concluirObs, setConcluirObs] = useState("");
  const [naoInstaladaMotivo, setNaoInstaladaMotivo] = useState<"escola_desativada" | "em_reforma" | "mudanca_endereco">("escola_desativada");
  const [naoInstaladaObs, setNaoInstaladaObs] = useState("");

  const iniciarMut = trpc.ordens.iniciar.useMutation({
    onSuccess: () => { toast.success("OS iniciada!"); utils.ordens.list.invalidate(); utils.escolas.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const concluirAdminMut = trpc.ordens.concluir.useMutation({
    onSuccess: () => {
      toast.success("OS concluída com sucesso!");
      utils.ordens.list.invalidate(); utils.escolas.list.invalidate(); utils.dashboard.stats.invalidate();
      setConcluirModal(null); setConcluirQtd(""); setConcluirObs("");
    },
    onError: (e) => toast.error(e.message),
  });

  const naoInstaladaAdminMut = trpc.ordens.naoInstalada.useMutation({
    onSuccess: () => {
      toast.success("Registrado como não instalada!");
      utils.ordens.list.invalidate(); utils.escolas.list.invalidate();
      setNaoInstaladaModal(null); setNaoInstaladaObs("");
    },
    onError: (e) => toast.error(e.message),
  });
  async function handleExportarExcel() {
    const valor = parseFloat(valorPorAp.replace(",", "."));
    if (isNaN(valor) || valor < 0) {
      toast.error("Informe um valor por AP válido");
      return;
    }
    setExportando(true);
    try {
      const token = localStorage.getItem("tenant_admin_token") || "";
      const params = new URLSearchParams({ valorPorAp: String(valor) });
      if (exportTecnicoId && exportTecnicoId !== "todos") {
        params.set("tecnicoId", exportTecnicoId);
      }
      const tecnicoNome = exportTecnicoId !== "todos"
        ? tecnicos?.find(t => String(t.id) === exportTecnicoId)?.nome ?? "tecnico"
        : "todos";
      const resp = await fetch(`/api/relatorio/excel?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!resp.ok) throw new Error("Erro ao gerar planilha");
      const blob = await resp.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const sufixo = exportTecnicoId !== "todos" ? `-${tecnicoNome.toLowerCase().replace(/\s+/g, "-")}` : "";
      a.download = `relatorio-os${sufixo}-${new Date().toISOString().slice(0,10)}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Planilha exportada com sucesso!");
      setExportOpen(false);
    } catch (err) {
      toast.error("Erro ao exportar planilha");
    } finally {
      setExportando(false);
    }
  }

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
      {/* Métricas */}
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
            <div className="relative flex-1 max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <input
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Buscar por escola, técnico ou OS..."
                className="w-full pl-9 pr-3 py-2 rounded-xl text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all"
              />
            </div>
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
              onClick={() => { setExportOpen(true); setValorPorAp(""); setExportTecnicoId("todos"); }}
              className="rounded-xl gap-1.5 border-green-200 text-green-700 hover:bg-green-50 hover:border-green-300 dark:border-green-900 dark:text-green-400 dark:hover:bg-green-950">
              <FileSpreadsheet className="w-3.5 h-3.5" /> Exportar Planilha
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
          <div className="hidden lg:grid grid-cols-[2.5rem_1fr_1fr_1fr_1fr_auto] gap-4 px-4 py-3 border-b border-border"
            style={{ background: "oklch(0.97 0.008 240)" }}>
            {["#", "Escola", "Técnico", "Status", "Data / APs", "Ações"].map(h => (
              <p key={h} className="text-xs font-bold uppercase tracking-wider text-muted-foreground">{h}</p>
            ))}
          </div>
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
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Iniciar OS (apenas se aberta) */}
                    {os.status === "aberta" && (
                      <button
                        onClick={() => iniciarMut.mutate({ osId: os.id })}
                        disabled={iniciarMut.isPending}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                        style={{ background: "oklch(0.94 0.05 240)", color: "oklch(0.28 0.14 240)", border: "1px solid oklch(0.84 0.08 240)" }}>
                        <Play className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Iniciar</span>
                      </button>
                    )}
                    {/* Concluir OS (se aberta ou em andamento) */}
                    {(os.status === "aberta" || os.status === "em_andamento") && (
                      <button
                        onClick={() => { setConcluirModal({ osId: os.id, escolaNome: getEscolaNome(os.escolaId) }); setConcluirQtd(""); setConcluirObs(""); }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                        style={{ background: "oklch(0.93 0.07 162)", color: "oklch(0.34 0.16 162)", border: "1px solid oklch(0.82 0.10 162)" }}>
                        <CheckCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Concluir</span>
                      </button>
                    )}
                    {/* Não Instalada (se aberta ou em andamento) */}
                    {(os.status === "aberta" || os.status === "em_andamento") && (
                      <button
                        onClick={() => { setNaoInstaladaModal({ osId: os.id, escolaNome: getEscolaNome(os.escolaId) }); setNaoInstaladaObs(""); setNaoInstaladaMotivo("escola_desativada"); }}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                        style={{ background: "oklch(0.96 0.04 25)", color: "oklch(0.45 0.20 25)", border: "1px solid oklch(0.88 0.10 25)" }}>
                        <XCircle className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Não inst.</span>
                      </button>
                    )}
                    {hasFoto && (
                      <button
                        onClick={() => setFotoModal((os as any).fotoMapaCalorUrl)}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                        style={{ background: "oklch(0.93 0.07 162)", color: "oklch(0.34 0.16 162)", border: "1px solid oklch(0.82 0.10 162)" }}>
                        <Image className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Mapa</span>
                      </button>
                    )}
                    <button
                      onClick={() => setFotosOsModal({ osId: os.id, escolaId: os.escolaId, escolaNome: getEscolaNome(os.escolaId) })}
                      className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all hover:scale-105"
                      style={{ background: "oklch(0.94 0.05 240)", color: "oklch(0.30 0.14 240)", border: "1px solid oklch(0.84 0.08 240)" }}>
                      <Camera className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Fotos</span>
                    </button>
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

      {/* Modal Concluir OS */}
      <Dialog open={!!concluirModal} onOpenChange={v => !v && setConcluirModal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-green-100 dark:bg-green-950">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
              Concluir OS
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Escola: <strong>{concluirModal?.escolaNome}</strong></p>
            <div>
              <label className="text-sm font-semibold mb-2 block text-foreground">Quantidade de APs Instalados</label>
              <input
                type="number" min="0" value={concluirQtd}
                onChange={e => setConcluirQtd(e.target.value)}
                placeholder="Ex: 3"
                className="w-full px-3 py-2 rounded-xl text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              />
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block text-foreground">Observação (opcional)</label>
              <textarea
                value={concluirObs} onChange={e => setConcluirObs(e.target.value)}
                placeholder="Observações sobre a instalação..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setConcluirModal(null)} className="rounded-xl">Cancelar</Button>
            <Button
              onClick={() => {
                const qtd = parseInt(concluirQtd);
                if (isNaN(qtd) || qtd < 0) { toast.error("Informe a quantidade de APs"); return; }
                concluirAdminMut.mutate({ osId: concluirModal!.osId, qtdApInstalado: qtd, observacao: concluirObs || undefined });
              }}
              disabled={concluirAdminMut.isPending}
              className="rounded-xl gap-2 bg-green-600 hover:bg-green-700 text-white border-none">
              {concluirAdminMut.isPending ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Concluindo...</>
              ) : (
                <><CheckCircle className="w-4 h-4" />Concluir OS</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Não Instalada */}
      <Dialog open={!!naoInstaladaModal} onOpenChange={v => !v && setNaoInstaladaModal(null)}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-100 dark:bg-red-950">
                <XCircle className="w-4 h-4 text-red-600" />
              </div>
              Registrar como Não Instalada
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">Escola: <strong>{naoInstaladaModal?.escolaNome}</strong></p>
            <div>
              <label className="text-sm font-semibold mb-2 block text-foreground">Motivo</label>
              <Select value={naoInstaladaMotivo} onValueChange={v => setNaoInstaladaMotivo(v as any)}>
                <SelectTrigger className="rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="escola_desativada">Escola desativada</SelectItem>
                  <SelectItem value="em_reforma">Em reforma</SelectItem>
                  <SelectItem value="mudanca_endereco">Mudança de endereço</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-semibold mb-2 block text-foreground">Observação (opcional)</label>
              <textarea
                value={naoInstaladaObs} onChange={e => setNaoInstaladaObs(e.target.value)}
                placeholder="Descreva o motivo com mais detalhes..."
                rows={3}
                className="w-full px-3 py-2 rounded-xl text-sm border border-border bg-background text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-red-500/20 focus:border-red-500 transition-all resize-none"
              />
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setNaoInstaladaModal(null)} className="rounded-xl">Cancelar</Button>
            <Button
              onClick={() => naoInstaladaAdminMut.mutate({ osId: naoInstaladaModal!.osId, motivo: naoInstaladaMotivo, observacao: naoInstaladaObs || undefined })}
              disabled={naoInstaladaAdminMut.isPending}
              className="rounded-xl gap-2 bg-red-600 hover:bg-red-700 text-white border-none">
              {naoInstaladaAdminMut.isPending ? (
                <><div className="w-3.5 h-3.5 border-2 border-white/40 border-t-white rounded-full animate-spin" />Registrando...</>
              ) : (
                <><XCircle className="w-4 h-4" />Confirmar</>  
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal fotos por categoria */}
      {fotosOsModal && (
        <FotosOsModal
          osId={fotosOsModal.osId}
          escolaId={fotosOsModal.escolaId}
          escolaNome={fotosOsModal.escolaNome}
          onClose={() => setFotosOsModal(null)}
        />
      )}

      {/* Modal foto mapa de calor (legado) */}
      {fotoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(8px)" }}
          onClick={() => setFotoModal(null)}>
          <div className="relative max-w-2xl w-full" onClick={e => e.stopPropagation()}>
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

      {/* Modal excluir todas */}
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
      {/* Modal Exportar Planilha */}
      <Dialog open={exportOpen} onOpenChange={setExportOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-green-600" />
              Exportar Planilha Excel
            </DialogTitle>
          </DialogHeader>
          <div className="py-4 space-y-4">
            <p className="text-sm text-muted-foreground">
              Informe o <strong>valor por AP instalado</strong> (R$). A planilha calculará automaticamente o total a pagar por técnico.
            </p>
            {/* Filtro por técnico */}
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Técnico</label>
              <select
                value={exportTecnicoId}
                onChange={e => setExportTecnicoId(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
              >
                <option value="todos">Todos os técnicos</option>
                {tecnicos?.filter(t => t.ativo).map(t => (
                  <option key={t.id} value={String(t.id)}>{t.nome}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-semibold text-foreground">Valor por AP (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-semibold">R$</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={valorPorAp}
                  onChange={e => setValorPorAp(e.target.value)}
                  placeholder="0,00"
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl border border-border bg-background text-foreground text-sm outline-none focus:ring-2 focus:ring-green-500/20 focus:border-green-500 transition-all"
                  onKeyDown={e => e.key === "Enter" && handleExportarExcel()}
                />
              </div>
              <p className="text-xs text-muted-foreground">Ex: 150,00 — será multiplicado pela quantidade de APs instalados em cada OS</p>
            </div>
            <div className="rounded-xl bg-muted/50 border border-border p-3 space-y-1">
              <p className="text-xs font-semibold text-foreground">A planilha incluirá:</p>
              <ul className="text-xs text-muted-foreground space-y-0.5">
                <li>• Aba 1: Todas as OS concluídas com nome, INEP, município, data, APs, técnico e total</li>
                <li>• Aba 2: Resumo de pagamento por técnico</li>
                <li>• Total de OS concluídas: <strong className="text-foreground">{counts.concluida}</strong></li>
              </ul>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setExportOpen(false)} className="rounded-xl">Cancelar</Button>
            <Button
              onClick={handleExportarExcel}
              disabled={exportando || !valorPorAp.trim()}
              className="rounded-xl gap-1.5 bg-green-600 hover:bg-green-700 text-white border-none">
              {exportando ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Gerando...</>
              ) : (
                <><Download className="w-4 h-4" /> Baixar Planilha</>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayoutAuto>
  );
}
