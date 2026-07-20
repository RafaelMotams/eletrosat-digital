import AdminLayoutAuto from "@/components/AdminLayoutAuto";
import { trpc } from "@/lib/trpc";
import { useState, useMemo, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Wrench, Plus, Search, UserCheck, Trash2, Eye, X, Download,
  CheckCircle, Clock, AlertTriangle, Building2, User, Calendar,
  FileSpreadsheet, Image as ImageIcon, Filter, RefreshCw,
  Navigation, MessageCircle, Phone, Zap, Bot, Send, ChevronDown, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import * as XLSX from "xlsx";

const STATUS_MAP: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pendente:    { label: "Pendente",    color: "bg-amber-50 text-amber-700 border-amber-200",   icon: Clock },
  em_andamento:{ label: "Em Andamento",color: "bg-blue-50 text-blue-700 border-blue-200",     icon: RefreshCw },
  concluida:   { label: "Concluída",   color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle },
};

export default function AdminManutencao() {
  const utils = trpc.useUtils();

  // ── Dados ──────────────────────────────────────────────────────────────────
  const [filtroStatus, setFiltroStatus] = useState("todas");
  const [busca, setBusca] = useState("");
  const { data: lista, isLoading } = trpc.manutencao.listar.useQuery(
    { status: filtroStatus as any, busca: busca || undefined },
    { refetchInterval: 30000 }
  );
  const { data: escolas } = trpc.escolas.list.useQuery({});
  const { data: tecnicos } = trpc.tecnicos.list.useQuery();
  const { data: relatorioData } = trpc.manutencao.relatorio.useQuery();

  // ── Modais ─────────────────────────────────────────────────────────────────
  const [criarOpen, setCriarOpen] = useState(false);
  const [atribuirOpen, setAtribuirOpen] = useState<number | null>(null);
  const [detalheOpen, setDetalheOpen] = useState<number | null>(null);
  const [excluirId, setExcluirId] = useState<number | null>(null);

  // ── IA Assistente no modal de detalhe ─────────────────────────────────────
  const [iaAberta, setIaAberta] = useState(false);
  const [iaPergunta, setIaPergunta] = useState("");
  const [iaHistorico, setIaHistorico] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const assistenteMut = trpc.manutencao.assistenteIA.useMutation({
    onSuccess: (data) => setIaHistorico(prev => [...prev, { role: "ai", text: data.resposta }]),
    onError: (e) => toast.error(e.message),
  });
  function handleIaEnviar() {
    if (!iaPergunta.trim() || !detalheOpen) return;
    const p = iaPergunta.trim();
    setIaHistorico(prev => [...prev, { role: "user", text: p }]);
    setIaPergunta("");
    assistenteMut.mutate({ manutencaoId: detalheOpen, pergunta: p });
  }

  // ── Form criar ─────────────────────────────────────────────────────────────
  const [novaEscolaId, setNovaEscolaId] = useState("");
  const [novaTecnicoId, setNovaTecnicoId] = useState("");
  const [novaDescricao, setNovaDescricao] = useState("");
  const [buscaEscola, setBuscaEscola] = useState("");

  // ── Form atribuir ──────────────────────────────────────────────────────────
  const [atribuirTecnicoId, setAtribuirTecnicoId] = useState("");

  // ── Mutations ──────────────────────────────────────────────────────────────
  const criarMut = trpc.manutencao.criar.useMutation({
    onSuccess: () => {
      toast.success("Manutenção criada com sucesso!");
      utils.manutencao.listar.invalidate();
      setCriarOpen(false);
      setNovaEscolaId(""); setNovaTecnicoId(""); setNovaDescricao(""); setBuscaEscola("");
    },
    onError: (e) => toast.error(e.message),
  });

  const atribuirMut = trpc.manutencao.atribuir.useMutation({
    onSuccess: () => {
      toast.success("Técnico atribuído!");
      utils.manutencao.listar.invalidate();
      setAtribuirOpen(null);
      setAtribuirTecnicoId("");
    },
    onError: (e) => toast.error(e.message),
  });

  const excluirMut = trpc.manutencao.excluir.useMutation({
    onSuccess: () => {
      toast.success("Manutenção excluída");
      utils.manutencao.listar.invalidate();
      setExcluirId(null);
    },
    onError: (e) => toast.error(e.message),
  });

  // ── Detalhe ────────────────────────────────────────────────────────────────
  const { data: detalhe } = trpc.manutencao.getById.useQuery(
    { id: detalheOpen! },
    { enabled: detalheOpen !== null }
  );

  // ── Escolas filtradas para select ──────────────────────────────────────────
  const escolasFiltradas = useMemo(() => {
    if (!escolas) return [];
    if (!buscaEscola) return escolas.slice(0, 50);
    const b = buscaEscola.toLowerCase();
    return escolas.filter(e =>
      e.nome.toLowerCase().includes(b) ||
      (e.inep ?? "").includes(b) ||
      (e.municipio ?? "").toLowerCase().includes(b)
    ).slice(0, 50);
  }, [escolas, buscaEscola]);

  // ── Stats ──────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    if (!lista) return { total: 0, pendente: 0, em_andamento: 0, concluida: 0 };
    return {
      total: lista.length,
      pendente: lista.filter(m => m.status === "pendente").length,
      em_andamento: lista.filter(m => m.status === "em_andamento").length,
      concluida: lista.filter(m => m.status === "concluida").length,
    };
  }, [lista]);

  // ── Exportar Excel ─────────────────────────────────────────────────────────
  function exportarExcel() {
    if (!relatorioData || relatorioData.length === 0) {
      toast.error("Nenhum dado para exportar");
      return;
    }
    const ws = XLSX.utils.json_to_sheet(relatorioData.map(r => ({
      "ID": r.id,
      "Status": r.status === "concluida" ? "Concluída" : r.status === "em_andamento" ? "Em Andamento" : "Pendente",
      "Escola": r.escola,
      "INEP": r.inep,
      "Município": r.municipio,
      "Endereço": r.endereco,
      "Técnico": r.tecnico,
      "Descrição do Problema": r.descricaoProblema,
      "Observação de Conclusão": r.observacaoConclusao ?? "",
      "Data Atribuição": r.dataAtribuicao,
      "Data Conclusão": r.dataConclusao,
      "Data Criação": r.createdAt,
    })));

    // Estilo de cabeçalho
    const range = XLSX.utils.decode_range(ws["!ref"] ?? "A1");
    for (let C = range.s.c; C <= range.e.c; C++) {
      const addr = XLSX.utils.encode_cell({ r: 0, c: C });
      if (!ws[addr]) continue;
      ws[addr].s = {
        font: { bold: true, color: { rgb: "FFFFFF" } },
        fill: { fgColor: { rgb: "10B981" } },
        alignment: { horizontal: "center" },
      };
    }
    ws["!cols"] = [
      { wch: 6 }, { wch: 14 }, { wch: 40 }, { wch: 14 }, { wch: 20 },
      { wch: 35 }, { wch: 25 }, { wch: 45 }, { wch: 45 }, { wch: 16 },
      { wch: 16 }, { wch: 16 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Manutenções");
    XLSX.writeFile(wb, `relatorio-manutencoes-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Relatório exportado!");
  }

  return (
    <AdminLayoutAuto title="Manutenção">

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total",       value: stats.total,       color: "#3b82f6", icon: Wrench },
          { label: "Pendentes",   value: stats.pendente,    color: "#f59e0b", icon: Clock },
          { label: "Em Andamento",value: stats.em_andamento,color: "#3b82f6", icon: RefreshCw },
          { label: "Concluídas",  value: stats.concluida,   color: "#10b981", icon: CheckCircle },
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

      {/* ── Toolbar ── */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por escola, INEP, município ou endereço..."
            value={busca}
            onChange={e => setBusca(e.target.value)}
          />
          {busca && (
            <button className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" onClick={() => setBusca("")}>
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtro status */}
        <div className="flex gap-1 p-1 rounded-lg border border-border bg-muted/30">
          {["todas", "pendente", "em_andamento", "concluida"].map(s => (
            <button
              key={s}
              onClick={() => setFiltroStatus(s)}
              className="px-3 py-1.5 rounded-md text-xs font-medium transition-all"
              style={{
                background: filtroStatus === s ? "white" : "transparent",
                color: filtroStatus === s ? "#0f172a" : "rgba(0,0,0,0.5)",
                boxShadow: filtroStatus === s ? "0 1px 4px rgba(0,0,0,0.1)" : "none",
              }}
            >
              {s === "todas" ? "Todas" : s === "em_andamento" ? "Em Andamento" : s === "concluida" ? "Concluídas" : "Pendentes"}
            </button>
          ))}
        </div>

        <Button
          variant="outline"
          className="gap-2"
          onClick={exportarExcel}
        >
          <FileSpreadsheet size={15} />
          Exportar Excel
        </Button>

        <Button
          className="gap-2"
          style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white" }}
          onClick={() => setCriarOpen(true)}
        >
          <Plus size={15} />
          Nova Manutenção
        </Button>
      </div>

      {/* ── Lista ── */}
      <Card className="border-0 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : !lista || lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <Wrench size={32} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Nenhuma manutenção encontrada</p>
            <Button size="sm" onClick={() => setCriarOpen(true)} className="gap-2">
              <Plus size={14} /> Criar primeira manutenção
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "rgba(0,0,0,0.03)", borderBottom: "1px solid rgba(0,0,0,0.06)" }}>
                  {["Escola", "INEP", "Município", "Técnico", "Problema", "Status", "Data", "Ações"].map(h => (
                    <th key={h} className="text-left px-4 py-3 font-semibold text-xs text-muted-foreground uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map((m, idx) => {
                  const st = STATUS_MAP[m.status] ?? STATUS_MAP.pendente;
                  const Icon = st.icon;
                  return (
                    <tr key={m.id}
                      style={{
                        borderBottom: "1px solid rgba(0,0,0,0.04)",
                        background: idx % 2 === 0 ? "transparent" : "rgba(0,0,0,0.01)",
                      }}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: "rgba(245,158,11,0.1)" }}>
                            <Wrench size={12} style={{ color: "#f59e0b" }} />
                          </div>
                          <span className="font-medium text-xs max-w-[160px] truncate" title={(m as any).escola?.nome}>
                            {(m as any).escola?.nome ?? "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">{(m as any).escola?.inep ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell">
                        <span className="text-xs text-muted-foreground">{(m as any).escola?.municipio ?? "—"}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{(m as any).tecnico?.nome ?? <span className="italic text-orange-500">Não atribuído</span>}</span>
                      </td>
                      <td className="px-4 py-3 max-w-[160px]">
                        <span className="text-xs text-muted-foreground truncate block" title={m.descricaoProblema}>
                          {m.descricaoProblema.slice(0, 50)}{m.descricaoProblema.length > 50 ? "..." : ""}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className={`text-xs border flex items-center gap-1 ${st.color}`}>
                          <Icon size={10} />
                          {st.label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell">
                        <span className="text-xs text-muted-foreground">
                          {m.dataConclusao
                            ? new Date(m.dataConclusao).toLocaleDateString("pt-BR")
                            : m.dataAtribuicao
                              ? new Date(m.dataAtribuicao).toLocaleDateString("pt-BR")
                              : new Date(m.createdAt).toLocaleDateString("pt-BR")}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => setDetalheOpen(m.id)}
                            title="Ver detalhes"
                            className="w-7 h-7 rounded-lg flex items-center justify-center border border-border text-muted-foreground hover:text-foreground hover:bg-muted transition-all"
                          >
                            <Eye size={13} />
                          </button>
                          {m.status !== "concluida" && (
                            <button
                              onClick={() => { setAtribuirOpen(m.id); setAtribuirTecnicoId(m.tecnicoId ? String(m.tecnicoId) : ""); }}
                              title="Atribuir técnico"
                              className="w-7 h-7 rounded-lg flex items-center justify-center border border-blue-200 text-blue-500 hover:bg-blue-50 transition-all"
                            >
                              <UserCheck size={13} />
                            </button>
                          )}
                          <button
                            onClick={() => setExcluirId(m.id)}
                            title="Excluir"
                            className="w-7 h-7 rounded-lg flex items-center justify-center border border-red-200 text-red-400 hover:bg-red-50 hover:text-red-600 transition-all"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: CRIAR MANUTENÇÃO
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={criarOpen} onOpenChange={setCriarOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench size={18} className="text-amber-500" />
              Nova Ordem de Manutenção
            </DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-4 py-2">
            {/* Busca escola */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Escola *</label>
              <Input
                placeholder="Buscar por nome, INEP ou município..."
                value={buscaEscola}
                onChange={e => { setBuscaEscola(e.target.value); setNovaEscolaId(""); }}
                className="mb-2"
              />
              {buscaEscola && (
                <div className="border rounded-lg max-h-48 overflow-y-auto">
                  {escolasFiltradas.length === 0 ? (
                    <p className="text-sm text-muted-foreground p-3 text-center">Nenhuma escola encontrada</p>
                  ) : (
                    escolasFiltradas.map(e => (
                      <button
                        key={e.id}
                        onClick={() => { setNovaEscolaId(String(e.id)); setBuscaEscola(`${e.nome} (${e.inep})`); }}
                        className="w-full text-left px-3 py-2.5 hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0"
                      >
                        <p className="text-sm font-medium text-foreground">{e.nome}</p>
                        <p className="text-xs text-muted-foreground">{e.inep} · {e.municipio}</p>
                      </button>
                    ))
                  )}
                </div>
              )}
              {novaEscolaId && !buscaEscola.includes("(") && (
                <p className="text-xs text-red-500 mt-1">Selecione uma escola da lista</p>
              )}
            </div>

            {/* Técnico (opcional) */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Técnico Responsável (opcional)</label>
              <Select value={novaTecnicoId} onValueChange={setNovaTecnicoId}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecionar técnico..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Sem atribuição</SelectItem>
                  {tecnicos?.map(t => (
                    <SelectItem key={t.id} value={String(t.id)}>{t.nome}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Descrição do problema */}
            <div>
              <label className="text-sm font-medium mb-1.5 block">Descrição do Problema *</label>
              <Textarea
                placeholder="Descreva o problema que precisa ser resolvido..."
                value={novaDescricao}
                onChange={e => setNovaDescricao(e.target.value)}
                rows={4}
                className="resize-none"
              />
              <p className="text-xs text-muted-foreground mt-1">{novaDescricao.length} caracteres (mínimo 5)</p>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setCriarOpen(false)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!novaEscolaId || !novaDescricao || novaDescricao.length < 5) {
                  toast.error("Preencha a escola e a descrição do problema");
                  return;
                }
                criarMut.mutate({
                  escolaId: parseInt(novaEscolaId),
                  tecnicoId: novaTecnicoId && novaTecnicoId !== "none" ? parseInt(novaTecnicoId) : undefined,
                  descricaoProblema: novaDescricao,
                });
              }}
              disabled={criarMut.isPending}
              style={{ background: "linear-gradient(135deg, #10b981, #059669)", color: "white" }}
            >
              {criarMut.isPending ? "Criando..." : "Criar Manutenção"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: ATRIBUIR TÉCNICO
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={atribuirOpen !== null} onOpenChange={o => !o && setAtribuirOpen(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserCheck size={18} className="text-blue-500" />
              Atribuir Técnico
            </DialogTitle>
          </DialogHeader>
          <div className="py-2">
            <label className="text-sm font-medium mb-1.5 block">Técnico Responsável</label>
            <Select value={atribuirTecnicoId} onValueChange={setAtribuirTecnicoId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar técnico..." />
              </SelectTrigger>
              <SelectContent>
                {tecnicos?.map(t => (
                  <SelectItem key={t.id} value={String(t.id)}>{t.nome}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setAtribuirOpen(null)}>Cancelar</Button>
            <Button
              onClick={() => {
                if (!atribuirTecnicoId) { toast.error("Selecione um técnico"); return; }
                atribuirMut.mutate({ id: atribuirOpen!, tecnicoId: parseInt(atribuirTecnicoId) });
              }}
              disabled={atribuirMut.isPending}
              style={{ background: "linear-gradient(135deg, #3b82f6, #2563eb)", color: "white" }}
            >
              {atribuirMut.isPending ? "Atribuindo..." : "Atribuir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ══════════════════════════════════════════════════════════════════════
          MODAL: DETALHE
      ══════════════════════════════════════════════════════════════════════ */}
      <Dialog open={detalheOpen !== null} onOpenChange={o => !o && setDetalheOpen(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wrench size={18} className="text-amber-500" />
              Detalhes da Manutenção #{detalheOpen}
            </DialogTitle>
          </DialogHeader>
          {detalhe ? (
            <div className="flex flex-col gap-5 py-2">
              {/* Status */}
              <div className="flex items-center gap-3">
                {(() => {
                  const st = STATUS_MAP[detalhe.status] ?? STATUS_MAP.pendente;
                  const Icon = st.icon;
                  return (
                    <Badge variant="outline" className={`text-sm px-3 py-1 border flex items-center gap-1.5 ${st.color}`}>
                      <Icon size={13} />
                      {st.label}
                    </Badge>
                  );
                })()}
                {detalhe.dataConclusao && (
                  <span className="text-sm text-muted-foreground flex items-center gap-1">
                    <Calendar size={13} />
                    Concluído em {new Date(detalhe.dataConclusao).toLocaleDateString("pt-BR")}
                  </span>
                )}
              </div>

              {/* Escola */}
              <Card className="border border-border/50">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <Building2 size={12} /> Escola
                  </p>
                  <p className="font-bold text-foreground">{detalhe.escola?.nome}</p>
                  <p className="text-sm text-muted-foreground mt-0.5">INEP: {detalhe.escola?.inep} · {detalhe.escola?.municipio}</p>
                  {detalhe.escola?.endereco && (
                    <p className="text-sm text-muted-foreground">{detalhe.escola.endereco}</p>
                  )}
                  {(detalhe.escola as any)?.velocidadeOfertada && (
                    <div className="flex items-center gap-1.5 mt-2 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 w-fit">
                      <Zap size={12} className="text-emerald-600" />
                      <span className="text-xs font-semibold text-emerald-700">Velocidade: {(detalhe.escola as any).velocidadeOfertada}</span>
                    </div>
                  )}
                  {/* Botões de ação */}
                  <div className="flex flex-wrap gap-2 mt-3">
                    {((detalhe.escola as any)?.latitude && (detalhe.escola as any)?.longitude) ? (
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${(detalhe.escola as any).latitude},${(detalhe.escola as any).longitude}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                      >
                        <Navigation size={12} /> Ver no Maps
                      </a>
                    ) : (detalhe.escola as any)?.endereco ? (
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent((detalhe.escola as any).endereco + ', ' + ((detalhe.escola as any).municipio ?? ''))}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 transition-colors"
                      >
                        <Navigation size={12} /> Ver no Maps
                      </a>
                    ) : null}
                    {(detalhe.escola as any)?.telefoneWhatsApp && (
                      <a
                        href={`https://wa.me/55${((detalhe.escola as any).telefoneWhatsApp as string).replace(/\D/g, '')}`}
                        target="_blank" rel="noopener noreferrer"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-green-50 text-green-700 border border-green-200 hover:bg-green-100 transition-colors"
                      >
                        <MessageCircle size={12} /> WhatsApp
                      </a>
                    )}
                    {!(detalhe.escola as any)?.telefoneWhatsApp && (detalhe.escola as any)?.telefone && (
                      <a
                        href={`tel:${(detalhe.escola as any).telefone}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100 transition-colors"
                      >
                        <Phone size={12} /> Ligar
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>

              {/* Técnico */}
              <Card className="border border-border/50">
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-1">
                    <User size={12} /> Técnico
                  </p>
                  {detalhe.tecnico ? (
                    <p className="font-medium text-foreground">{detalhe.tecnico.nome}</p>
                  ) : (
                    <p className="text-sm text-orange-500 italic">Não atribuído</p>
                  )}
                </CardContent>
              </Card>

              {/* Descrição */}
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Descrição do Problema</p>
                <div className="p-3 rounded-lg bg-muted/40 text-sm text-foreground leading-relaxed">
                  {detalhe.descricaoProblema}
                </div>
              </div>

              {/* Observação conclusão */}
              {detalhe.observacaoConclusao && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">Observação de Conclusão</p>
                  <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-sm text-emerald-800 leading-relaxed">
                    {detalhe.observacaoConclusao}
                  </div>
                </div>
              )}

              {/* Assistente IA */}
              <div className="rounded-xl border" style={{ borderColor: "rgba(139,92,246,0.25)", background: "rgba(139,92,246,0.04)" }}>
                <button
                  onClick={() => setIaAberta(v => !v)}
                  className="w-full flex items-center gap-3 p-4"
                >
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
                    <Bot size={16} className="text-white" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-bold text-foreground">Assistente Técnico</p>
                    <p className="text-xs text-muted-foreground">Consulte a IA sobre este problema</p>
                  </div>
                  {iaAberta ? <ChevronUp size={16} className="text-purple-500" /> : <ChevronDown size={16} className="text-purple-500" />}
                </button>
                {iaAberta && (
                  <div className="px-4 pb-4">
                    {iaHistorico.length > 0 && (
                      <div className="space-y-3 mb-3 max-h-48 overflow-y-auto">
                        {iaHistorico.map((h, i) => (
                          <div key={i} className={`flex ${h.role === "user" ? "justify-end" : "justify-start"}`}>
                            <div
                              className="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                              style={{
                                background: h.role === "user" ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "rgba(0,0,0,0.05)",
                                color: h.role === "user" ? "white" : "inherit",
                              }}
                            >
                              {h.role === "ai" && (
                                <div className="flex items-center gap-1 mb-1">
                                  <Bot size={11} className="text-purple-600" />
                                  <span className="text-xs font-bold text-purple-600">Assistente</span>
                                </div>
                              )}
                              <p style={{ whiteSpace: "pre-wrap" }}>{h.text}</p>
                            </div>
                          </div>
                        ))}
                        {assistenteMut.isPending && (
                          <div className="flex justify-start">
                            <div className="rounded-2xl px-3 py-2 bg-muted">
                              <div className="w-4 h-4 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                    {iaHistorico.length === 0 && (
                      <div className="flex flex-wrap gap-2 mb-3">
                        {["Como resolver este problema?", "Quais peças podem ser necessárias?", "Procedimento de diagnóstico"].map(s => (
                          <button key={s} onClick={() => setIaPergunta(s)}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium"
                            style={{ background: "rgba(139,92,246,0.1)", color: "#7c3aed", border: "1px solid rgba(139,92,246,0.2)" }}
                          >{s}</button>
                        ))}
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Input
                        value={iaPergunta}
                        onChange={e => setIaPergunta(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") handleIaEnviar(); }}
                        placeholder="Pergunte sobre o problema técnico..."
                        className="flex-1 text-sm"
                      />
                      <Button
                        size="sm"
                        onClick={handleIaEnviar}
                        disabled={!iaPergunta.trim() || assistenteMut.isPending}
                        style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)", color: "white" }}
                      >
                        <Send size={14} />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {/* Fotos */}
              {detalhe.fotos && detalhe.fotos.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-3 flex items-center gap-1">
                    <ImageIcon size={12} /> Fotos ({detalhe.fotos.length})
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {detalhe.fotos.map(f => (
                      <div key={f.id} className="relative group">
                        <a href={f.url} target="_blank" rel="noopener noreferrer">
                          <img
                            src={f.url}
                            alt={f.tipo}
                            className="w-full h-28 object-cover rounded-lg border border-border"
                          />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                            <Eye size={20} className="text-white" />
                          </div>
                        </a>
                        <Badge
                          variant="outline"
                          className={`absolute top-1.5 left-1.5 text-xs border ${f.tipo === "defeito" ? "bg-red-50 text-red-700 border-red-200" : "bg-emerald-50 text-emerald-700 border-emerald-200"}`}
                        >
                          {f.tipo === "defeito" ? "Defeito" : "Conclusão"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center justify-center py-8">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Modal Confirmar Excluir ── */}
      <Dialog open={excluirId !== null} onOpenChange={o => !o && setExcluirId(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle size={18} />
              Excluir Manutenção?
            </DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">Esta ação é irreversível. Todas as fotos e registros serão removidos.</p>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setExcluirId(null)}>Cancelar</Button>
            <Button
              variant="destructive"
              onClick={() => excluirId && excluirMut.mutate({ id: excluirId })}
              disabled={excluirMut.isPending}
            >
              {excluirMut.isPending ? "Excluindo..." : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayoutAuto>
  );
}
