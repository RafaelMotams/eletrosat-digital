import AdminLayoutAuto from "@/components/AdminLayoutAuto";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { useState, useRef, useEffect } from "react";
import {
  Upload, School, MapPin, Wifi, Search, FileSpreadsheet, Hash, Zap, Phone,
  CheckCircle, X, Trash2, AlertTriangle, Edit2, UserX, ChevronDown, ChevronUp,
} from "lucide-react";
import ImportacaoPlanilha from "@/components/ImportacaoPlanilha";
import { toast } from "sonner";

const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  nao_instalada: "Não Instalada",
};
const statusClass: Record<string, string> = {
  pendente: "bg-amber-50 text-amber-700 border-amber-200",
  em_andamento: "bg-blue-50 text-blue-700 border-blue-200",
  concluido: "bg-emerald-50 text-emerald-700 border-emerald-200",
  nao_instalada: "bg-red-50 text-red-700 border-red-300",
};

type Escola = {
  id: number;
  nome: string;
  inep: string;
  municipio?: string | null;
  uf?: string | null;
  endereco?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  telefone?: string | null;
  telefoneWhatsApp?: string | null;
  qtdAp?: number | null;
  kitWifi?: number | null;
  apAdicional?: number | null;
  velocidadeOfertada?: string | null;
  velocidadeMinima?: string | null;
  tipoConexao?: string | null;
  status: string;
  tecnicoId?: number | null;
  motivoNaoInstalacao?: string | null;
};

// ─── Modal de Edição ──────────────────────────────────────────────────────────
function ModalEditarEscola({
  escola,
  onClose,
  onSaved,
}: {
  escola: Escola;
  onClose: () => void;
  onSaved: () => void;
}) {
  const utils = trpc.useUtils();
  const [form, setForm] = useState({
    nome: escola.nome ?? "",
    inep: escola.inep ?? "",
    municipio: escola.municipio ?? "",
    uf: escola.uf ?? "",
    endereco: escola.endereco ?? "",
    latitude: escola.latitude ?? "",
    longitude: escola.longitude ?? "",
    telefone: escola.telefone ?? "",
    telefoneWhatsApp: escola.telefoneWhatsApp ?? "",
    tipoConexao: escola.tipoConexao ?? "",
    velocidadeOfertada: escola.velocidadeOfertada ?? "",
    velocidadeMinima: escola.velocidadeMinima ?? "",
    qtdAp: escola.qtdAp != null ? String(escola.qtdAp) : "",
    kitWifi: escola.kitWifi != null ? String(escola.kitWifi) : "",
    apAdicional: escola.apAdicional != null ? String(escola.apAdicional) : "",
    status: escola.status ?? "pendente",
  });

  const updateMut = trpc.escolas.update.useMutation({
    onSuccess: () => {
      toast.success("Escola atualizada com sucesso!");
      utils.escolas.list.invalidate();
      onSaved();
      onClose();
    },
    onError: (err) => toast.error("Erro ao salvar: " + err.message),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    updateMut.mutate({
      id: escola.id,
      nome: form.nome || undefined,
      inep: form.inep || undefined,
      municipio: form.municipio || undefined,
      uf: form.uf || undefined,
      endereco: form.endereco || undefined,
      latitude: form.latitude || undefined,
      longitude: form.longitude || undefined,
      telefone: form.telefone || undefined,
      telefoneWhatsApp: form.telefoneWhatsApp || undefined,
      tipoConexao: form.tipoConexao || undefined,
      velocidadeOfertada: form.velocidadeOfertada || undefined,
      velocidadeMinima: form.velocidadeMinima || undefined,
      qtdAp: form.qtdAp ? parseInt(form.qtdAp) : undefined,
      kitWifi: form.kitWifi ? parseInt(form.kitWifi) : undefined,
      apAdicional: form.apAdicional ? parseInt(form.apAdicional) : undefined,
      status: form.status as any,
    });
  }

  const field = (
    label: string,
    key: keyof typeof form,
    opts?: { type?: string; placeholder?: string; mono?: boolean }
  ) => (
    <div>
      <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
      <Input
        type={opts?.type ?? "text"}
        placeholder={opts?.placeholder ?? ""}
        value={form[key]}
        onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
        className={opts?.mono ? "font-mono text-sm" : "text-sm"}
      />
    </div>
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.55)" }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-background border-b px-6 py-4 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
              <Edit2 className="w-4 h-4 text-primary" />
            </div>
            <div>
              <h2 className="font-bold text-base text-foreground">Editar Escola</h2>
              <p className="text-xs text-muted-foreground truncate max-w-xs">{escola.nome}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-full hover:bg-muted flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Identificação */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Identificação</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field("Nome da Escola *", "nome", { placeholder: "Nome completo" })}
              {field("INEP", "inep", { placeholder: "Código INEP", mono: true })}
            </div>
          </div>

          {/* Localização */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Localização</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2">
                {field("Município", "municipio", { placeholder: "Nome do município" })}
              </div>
              {field("UF", "uf", { placeholder: "Ex: SP" })}
            </div>
            <div className="mt-3">
              {field("Endereço completo", "endereco", { placeholder: "Rua, número, bairro..." })}
            </div>
            <div className="grid grid-cols-2 gap-3 mt-3">
              {field("Latitude", "latitude", { placeholder: "-12.345678", mono: true })}
              {field("Longitude", "longitude", { placeholder: "-45.678901", mono: true })}
            </div>
            {(form.latitude && form.longitude) && (
              <a
                href={`https://www.google.com/maps?q=${form.latitude},${form.longitude}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 mt-2 text-xs text-primary hover:underline"
              >
                <MapPin className="w-3 h-3" /> Ver no Google Maps
              </a>
            )}
          </div>

          {/* Contato */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Contato</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {field("Telefone", "telefone", { placeholder: "(00) 0000-0000", mono: true })}
              {field("WhatsApp", "telefoneWhatsApp", { placeholder: "(00) 9 0000-0000", mono: true })}
            </div>
          </div>

          {/* Rede */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Rede / Equipamentos</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {field("Kits Wi-Fi (AP)", "qtdAp", { type: "number", placeholder: "1" })}
              {field("Kit Wi-Fi adicional", "apAdicional", { type: "number", placeholder: "0" })}
              {field("Kit Wi-Fi total", "kitWifi", { type: "number", placeholder: "1" })}
              {field("Tipo de Conexão", "tipoConexao", { placeholder: "Fibra" })}
              {field("Vel. Ofertada", "velocidadeOfertada", { placeholder: "100 Mbps" })}
              {field("Vel. Mínima", "velocidadeMinima", { placeholder: "20 Mbps" })}
            </div>
          </div>

          {/* Status */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">Status</h3>
            <select
              value={form.status}
              onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
            >
              <option value="pendente">Pendente</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluido">Concluído</option>
              <option value="nao_instalada">Não Instalada</option>
            </select>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onClose}>
              Cancelar
            </Button>
            <Button
              type="submit"
              className="flex-1"
              disabled={!form.nome || updateMut.isPending}
            >
              {updateMut.isPending ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />Salvando...</>
              ) : "Salvar alterações"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Página principal ─────────────────────────────────────────────────────────
export default function AdminEscolas() {
  const { data: escolas, isLoading, refetch } = trpc.escolas.list.useQuery({});
  const { data: tecnicos } = trpc.tecnicos.list.useQuery();
  const utils = trpc.useUtils();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Seleção múltipla
  const [selecionados, setSelecionados] = useState<Set<number>>(new Set());
  const [modoSelecao, setModoSelecao] = useState(false);

  // Modal editar
  const [escolaEditando, setEscolaEditando] = useState<Escola | null>(null);

  // Modal excluir por cidade
  const [deleteCidadeOpen, setDeleteCidadeOpen] = useState(false);
  const [cidadeSelecionada, setCidadeSelecionada] = useState("");
  const [confirmText, setConfirmText] = useState("");

  // Modal excluir por técnico
  const [deleteTecnicoOpen, setDeleteTecnicoOpen] = useState(false);
  const [tecnicoSelecionado, setTecnicoSelecionado] = useState<number | "">("");
  const [confirmTecnicoText, setConfirmTecnicoText] = useState("");

  // Modal excluir selecionados
  const [deleteVariasOpen, setDeleteVariasOpen] = useState(false);
  const [confirmVariasText, setConfirmVariasText] = useState("");

  const { data: municipios } = trpc.escolas.listMunicipios.useQuery();

  const deletarPorCidadeMut = trpc.escolas.deletarPorCidade.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.total} escola(s) de ${cidadeSelecionada} removidas!`);
      refetch();
      setDeleteCidadeOpen(false);
      setCidadeSelecionada("");
      setConfirmText("");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const deletarPorTecnicoMut = trpc.escolas.deletarPorTecnico.useMutation({
    onSuccess: (data) => {
      const nome = tecnicos?.find(t => t.id === tecnicoSelecionado)?.nome ?? "técnico";
      toast.success(`${data.total} escola(s) do técnico ${nome} removidas!`);
      refetch();
      setDeleteTecnicoOpen(false);
      setTecnicoSelecionado("");
      setConfirmTecnicoText("");
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  const deletarVariasMut = trpc.escolas.deletarVarias.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.total} escola(s) removidas com sucesso!`);
      setSelecionados(new Set());
      setModoSelecao(false);
      setDeleteVariasOpen(false);
      setConfirmVariasText("");
      refetch();
    },
    onError: (err) => toast.error("Erro: " + err.message),
  });

  // Auto-preenchimento por INEP
  const [inepBusca, setInepBusca] = useState("");
  const [inepQuery, setInepQuery] = useState("");
  const inepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: escolaInep, isFetching: buscandoInep } = trpc.escolas.getByInep.useQuery(
    { inep: inepQuery },
    { enabled: inepQuery.length >= 7, retry: false }
  );
  useEffect(() => {
    if (inepTimer.current) clearTimeout(inepTimer.current);
    if (inepBusca.length >= 7) {
      inepTimer.current = setTimeout(() => setInepQuery(inepBusca.trim()), 600);
    } else {
      setInepQuery("");
    }
    return () => { if (inepTimer.current) clearTimeout(inepTimer.current); };
  }, [inepBusca]);

  const filtered = escolas?.filter(e => {
    const matchSearch =
      e.nome.toLowerCase().includes(search.toLowerCase()) ||
      (e.municipio ?? "").toLowerCase().includes(search.toLowerCase()) ||
      (e.inep ?? "").includes(search);
    const matchStatus = statusFilter === "todos" || e.status === statusFilter;
    return matchSearch && matchStatus;
  }) ?? [];

  function getTecnicoNome(id: number | null | undefined) {
    if (!id) return null;
    return tecnicos?.find(t => t.id === id)?.nome ?? null;
  }

  const totalAps = escolas?.reduce((sum, e) => sum + (e.qtdAp ?? 0), 0) ?? 0;
  const concluidas = escolas?.filter(e => e.status === "concluido").length ?? 0;
  const naoInstaladas = escolas?.filter(e => e.status === "nao_instalada").length ?? 0;
  const pendentes = escolas?.filter(e => e.status !== "concluido" && e.status !== "nao_instalada").length ?? 0;

  function toggleSelecao(id: number) {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    if (selecionados.size === filtered.length) {
      setSelecionados(new Set());
    } else {
      setSelecionados(new Set(filtered.map(e => e.id)));
    }
  }

  return (
    <AdminLayoutAuto title="Gestão de Escolas">

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total de Escolas", value: escolas?.length ?? 0, icon: School, color: "text-primary", bg: "bg-primary/10" },
          { label: "Pendentes",        value: pendentes,            icon: Zap,    color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Concluídas",       value: concluidas,           icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Não Instaladas",   value: naoInstaladas,        icon: AlertTriangle, color: "text-red-600", bg: "bg-red-50" },
        ].map((s, i) => {
          const Icon = s.icon;
          return (
            <Card key={i} className="border-0 shadow-sm">
              <CardContent className="p-4 flex items-center gap-3">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${s.bg}`}>
                  <Icon className={`w-4 h-4 ${s.color}`} />
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

      {/* Busca por INEP */}
      <Card className="mb-6 border-primary/20 bg-primary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Hash className="w-4 h-4 text-primary" />
            <h3 className="font-semibold text-sm text-foreground">Consulta Rápida por INEP</h3>
            <span className="text-xs text-muted-foreground ml-1">— auto-preenchimento instantâneo</span>
          </div>
          <div className="flex gap-3 items-start">
            <div className="relative flex-1 max-w-xs">
              <Hash className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                className="pl-9 font-mono"
                placeholder="Digite o código INEP..."
                value={inepBusca}
                onChange={e => setInepBusca(e.target.value.replace(/\D/g, ""))}
                maxLength={8}
              />
              {buscandoInep && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              )}
            </div>
            {inepBusca && (
              <Button variant="ghost" size="icon" onClick={() => { setInepBusca(""); setInepQuery(""); }}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </div>
          {inepQuery.length >= 7 && !buscandoInep && (
            <div className="mt-3">
              {escolaInep ? (
                <div className="rounded-xl border border-primary/20 bg-background p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                      <School className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-foreground">{escolaInep.nome}</h4>
                      <p className="text-xs text-muted-foreground mt-0.5">INEP: {escolaInep.inep}</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mt-3">
                        <div className="bg-muted/60 rounded-lg p-2">
                          <p className="text-xs text-muted-foreground">Município</p>
                          <p className="text-xs font-semibold text-foreground truncate">{escolaInep.municipio ?? "—"}</p>
                        </div>
                        <div className="bg-muted/60 rounded-lg p-2">
                          <p className="text-xs text-muted-foreground">Kits Wi-Fi</p>
                          <p className="text-xs font-bold text-primary">{escolaInep.kitWifi ?? escolaInep.qtdAp ?? "—"}</p>
                        </div>
                        <div className="bg-muted/60 rounded-lg p-2">
                          <p className="text-xs text-muted-foreground">Velocidade</p>
                          <p className="text-xs font-bold text-foreground">{escolaInep.velocidadeOfertada ?? "—"}</p>
                        </div>
                        <div className="bg-muted/60 rounded-lg p-2">
                          <p className="text-xs text-muted-foreground">Status</p>
                          <Badge className={`text-xs border mt-0.5 ${statusClass[escolaInep.status]}`} variant="outline">
                            {statusLabel[escolaInep.status]}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <Button
                          size="sm"
                          variant="outline"
                          className="gap-1.5 text-xs"
                          onClick={() => setEscolaEditando(escolaInep as Escola)}
                        >
                          <Edit2 className="w-3 h-3" /> Editar esta escola
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-xl border border-destructive/20 bg-destructive/5 p-3 text-sm text-destructive">
                  Nenhuma escola encontrada com INEP <strong>{inepQuery}</strong>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Header com botões de ação */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <p className="text-muted-foreground text-sm">
          {filtered.length} escola(s)
          {escolas && escolas.length !== filtered.length && ` de ${escolas.length} total`}
          {selecionados.size > 0 && (
            <span className="ml-2 text-primary font-semibold">· {selecionados.size} selecionada(s)</span>
          )}
        </p>
        <div className="flex gap-2 flex-wrap">
          {/* Botão modo seleção */}
          <Button
            variant={modoSelecao ? "default" : "outline"}
            size="sm"
            className="gap-1.5"
            onClick={() => {
              setModoSelecao(m => !m);
              if (modoSelecao) setSelecionados(new Set());
            }}
          >
            <CheckCircle className="w-3.5 h-3.5" />
            {modoSelecao ? "Cancelar seleção" : "Selecionar"}
          </Button>

          {/* Excluir selecionados */}
          {modoSelecao && selecionados.size > 0 && (
            <Button
              size="sm"
              className="gap-1.5 bg-red-600 hover:bg-red-700 text-white"
              onClick={() => setDeleteVariasOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" />
              Excluir {selecionados.size} escola(s)
            </Button>
          )}

          {/* Excluir por técnico */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-orange-200 text-orange-600 hover:bg-orange-50"
            onClick={() => setDeleteTecnicoOpen(true)}
          >
            <UserX className="w-3.5 h-3.5" />
            Excluir por Técnico
          </Button>

          {/* Excluir por cidade */}
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 border-red-200 text-red-600 hover:bg-red-50 hover:text-red-700"
            onClick={() => setDeleteCidadeOpen(true)}
          >
            <Trash2 className="w-3.5 h-3.5" />
            Excluir por Cidade
          </Button>

          {/* Importar */}
          <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-1.5">
                <Upload className="w-3.5 h-3.5" />
                Importar Planilha
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-primary" />
                  Importar Planilha de Escolas
                </DialogTitle>
                <p className="text-sm text-muted-foreground">
                  Aceita qualquer formato (.xlsx, .xls, .csv). As colunas são detectadas automaticamente.
                </p>
              </DialogHeader>
              <ImportacaoPlanilha
                onConcluido={() => {
                  refetch();
                  setTimeout(() => setImportDialogOpen(false), 2000);
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Barra de seleção total */}
      {modoSelecao && filtered.length > 0 && (
        <div className="flex items-center gap-3 mb-3 px-4 py-2.5 rounded-xl bg-primary/5 border border-primary/20">
          <Checkbox
            checked={selecionados.size === filtered.length && filtered.length > 0}
            onCheckedChange={toggleTodos}
            id="select-all"
          />
          <label htmlFor="select-all" className="text-sm font-medium cursor-pointer select-none">
            {selecionados.size === filtered.length ? "Desmarcar todos" : `Selecionar todos (${filtered.length})`}
          </label>
        </div>
      )}

      {/* Modal excluir por cidade */}
      {deleteCidadeOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) { setDeleteCidadeOpen(false); setConfirmText(""); } }}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-foreground">Apagar Escolas por Cidade</h2>
                <p className="text-sm text-muted-foreground">Esta ação é irreversível</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Selecionar Cidade</label>
              <select
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-red-400"
                value={cidadeSelecionada}
                onChange={e => setCidadeSelecionada(e.target.value)}
              >
                <option value="">-- Escolha uma cidade --</option>
                {municipios?.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>
            {cidadeSelecionada && (
              <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200">
                <p className="text-sm text-red-700">
                  Serão apagadas <strong>todas as escolas</strong> de <strong>{cidadeSelecionada}</strong>, incluindo OS e atribuições.
                </p>
                <p className="text-sm text-red-700 mt-2 font-medium">
                  Para confirmar, digite: <code className="bg-red-100 px-1 rounded">APAGAR</code>
                </p>
                <input
                  type="text"
                  placeholder="Digite APAGAR para confirmar"
                  value={confirmText}
                  onChange={e => setConfirmText(e.target.value)}
                  className="w-full mt-2 border border-red-300 rounded-lg px-3 py-2 text-sm bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-red-400"
                />
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setDeleteCidadeOpen(false); setConfirmText(""); setCidadeSelecionada(""); }}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
                disabled={!cidadeSelecionada || confirmText !== "APAGAR" || deletarPorCidadeMut.isPending}
                onClick={() => deletarPorCidadeMut.mutate({ municipio: cidadeSelecionada })}
              >
                {deletarPorCidadeMut.isPending ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Apagando...</>
                ) : <><Trash2 className="w-4 h-4" />Apagar Cidade</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal excluir por técnico */}
      {deleteTecnicoOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) { setDeleteTecnicoOpen(false); setConfirmTecnicoText(""); } }}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-orange-100 flex items-center justify-center flex-shrink-0">
                <UserX className="w-5 h-5 text-orange-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-foreground">Apagar Escolas por Técnico</h2>
                <p className="text-sm text-muted-foreground">Remove todas as escolas atribuídas ao técnico</p>
              </div>
            </div>
            <div className="mb-4">
              <label className="text-sm font-medium text-foreground mb-1.5 block">Selecionar Técnico</label>
              <select
                className="w-full border border-input rounded-lg px-3 py-2 text-sm bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-orange-400"
                value={tecnicoSelecionado}
                onChange={e => setTecnicoSelecionado(e.target.value ? Number(e.target.value) : "")}
              >
                <option value="">-- Escolha um técnico --</option>
                {tecnicos?.map(t => (
                  <option key={t.id} value={t.id}>
                    {t.nome} ({escolas?.filter(e => e.tecnicoId === t.id).length ?? 0} escolas)
                  </option>
                ))}
              </select>
            </div>
            {tecnicoSelecionado !== "" && (
              <div className="mb-4 p-3 rounded-xl bg-orange-50 border border-orange-200">
                <p className="text-sm text-orange-700">
                  Serão apagadas <strong>todas as escolas</strong> atribuídas a{" "}
                  <strong>{tecnicos?.find(t => t.id === tecnicoSelecionado)?.nome}</strong>,
                  incluindo OS e atribuições vinculadas.
                </p>
                <p className="text-sm text-orange-700 mt-2 font-medium">
                  Para confirmar, digite: <code className="bg-orange-100 px-1 rounded">APAGAR</code>
                </p>
                <input
                  type="text"
                  placeholder="Digite APAGAR para confirmar"
                  value={confirmTecnicoText}
                  onChange={e => setConfirmTecnicoText(e.target.value)}
                  className="w-full mt-2 border border-orange-300 rounded-lg px-3 py-2 text-sm bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            )}
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setDeleteTecnicoOpen(false); setConfirmTecnicoText(""); setTecnicoSelecionado(""); }}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-orange-600 hover:bg-orange-700 text-white gap-2"
                disabled={!tecnicoSelecionado || confirmTecnicoText !== "APAGAR" || deletarPorTecnicoMut.isPending}
                onClick={() => deletarPorTecnicoMut.mutate({ tecnicoId: tecnicoSelecionado as number })}
              >
                {deletarPorTecnicoMut.isPending ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Apagando...</>
                ) : <><UserX className="w-4 h-4" />Apagar Escolas</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal excluir selecionados */}
      {deleteVariasOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.5)" }}
          onClick={e => { if (e.target === e.currentTarget) { setDeleteVariasOpen(false); setConfirmVariasText(""); } }}>
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center flex-shrink-0">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="font-bold text-lg text-foreground">Excluir Escolas Selecionadas</h2>
                <p className="text-sm text-muted-foreground">{selecionados.size} escola(s) selecionada(s)</p>
              </div>
            </div>
            <div className="mb-4 p-3 rounded-xl bg-red-50 border border-red-200">
              <p className="text-sm text-red-700">
                Serão excluídas <strong>{selecionados.size} escola(s)</strong> e todas as OS e atribuições vinculadas. Esta ação é irreversível.
              </p>
              <p className="text-sm text-red-700 mt-2 font-medium">
                Para confirmar, digite: <code className="bg-red-100 px-1 rounded">APAGAR</code>
              </p>
              <input
                type="text"
                placeholder="Digite APAGAR para confirmar"
                value={confirmVariasText}
                onChange={e => setConfirmVariasText(e.target.value)}
                className="w-full mt-2 border border-red-300 rounded-lg px-3 py-2 text-sm bg-white text-foreground focus:outline-none focus:ring-2 focus:ring-red-400"
              />
            </div>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => { setDeleteVariasOpen(false); setConfirmVariasText(""); }}>
                Cancelar
              </Button>
              <Button
                className="flex-1 bg-red-600 hover:bg-red-700 text-white gap-2"
                disabled={confirmVariasText !== "APAGAR" || deletarVariasMut.isPending}
                onClick={() => deletarVariasMut.mutate({ ids: Array.from(selecionados) })}
              >
                {deletarVariasMut.isPending ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />Excluindo...</>
                ) : <><Trash2 className="w-4 h-4" />Excluir {selecionados.size} escola(s)</>}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Buscar por nome, município ou INEP..."
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="flex gap-2 flex-wrap">
          {["todos", "pendente", "em_andamento", "concluido", "nao_instalada"].map(s => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
            >
              {s === "todos" ? "Todos" : statusLabel[s]}
            </Button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <School className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-1">Nenhuma escola encontrada.</p>
            <p className="text-sm text-muted-foreground mb-4">
              Importe uma planilha para começar. Qualquer formato é aceito.
            </p>
            <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-2">
              <Upload className="w-4 h-4" /> Importar Planilha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(escola => {
            const selecionada = selecionados.has(escola.id);
            return (
              <Card
                key={escola.id}
                className={`hover:shadow-sm transition-all border shadow-sm cursor-pointer ${
                  escola.status === "nao_instalada"
                    ? "border-red-300 bg-red-50/60"
                    : selecionada
                    ? "border-primary/50 bg-primary/5"
                    : "border-0"
                }`}
                onClick={() => modoSelecao && toggleSelecao(escola.id)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start gap-3">
                    {/* Checkbox de seleção */}
                    {modoSelecao && (
                      <div className="mt-0.5 flex-shrink-0" onClick={e => e.stopPropagation()}>
                        <Checkbox
                          checked={selecionada}
                          onCheckedChange={() => toggleSelecao(escola.id)}
                        />
                      </div>
                    )}

                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                      escola.status === "nao_instalada" ? "bg-red-100" : "bg-primary/10"
                    }`}>
                      {escola.status === "nao_instalada"
                        ? <AlertTriangle className="w-5 h-5 text-red-600" />
                        : <School className="w-5 h-5 text-primary" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <h3 className="font-semibold text-sm text-foreground">{escola.nome}</h3>
                          <p className="text-xs text-muted-foreground font-mono">INEP: {escola.inep}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`text-xs border ${statusClass[escola.status]}`} variant="outline">
                            {statusLabel[escola.status]}
                          </Badge>
                          {/* Botão editar */}
                          {!modoSelecao && (
                            <button
                              className="w-7 h-7 rounded-lg hover:bg-muted flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors"
                              title="Editar escola"
                              onClick={e => { e.stopPropagation(); setEscolaEditando(escola as Escola); }}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                        {escola.municipio && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3" />
                            {escola.municipio}{escola.uf ? `, ${escola.uf}` : ""}
                          </span>
                        )}
                        {escola.tipoConexao && (
                          <span className="flex items-center gap-1">
                            <Wifi className="w-3 h-3" />
                            {escola.tipoConexao}
                            {escola.velocidadeOfertada ? ` — ${escola.velocidadeOfertada}` : ""}
                          </span>
                        )}
                        {(escola.kitWifi ?? escola.qtdAp) != null && (
                          <span className="flex items-center gap-1">
                            <Zap className="w-3 h-3" />
                            {escola.kitWifi ?? escola.qtdAp} Kit(s) Wi-Fi
                          </span>
                        )}
                        {escola.telefone && (
                          <span className="flex items-center gap-1">
                            <Phone className="w-3 h-3" />
                            {escola.telefone}
                          </span>
                        )}
                        {getTecnicoNome(escola.tecnicoId) && (
                          <span className="text-primary font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" />
                            {getTecnicoNome(escola.tecnicoId)}
                          </span>
                        )}
                      </div>
                      {escola.status === "nao_instalada" && (escola as any).motivoNaoInstalacao && (
                        <div className="mt-2 px-2.5 py-1.5 rounded-lg bg-red-100 border border-red-200 flex items-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5 text-red-600 flex-shrink-0" />
                          <span className="text-xs text-red-700 font-medium">
                            Motivo: {({
                              escola_desativada: "Escola desativada",
                              em_reforma: "Em reforma",
                              mudanca_endereco: "Mudança de endereço",
                            } as Record<string, string>)[(escola as any).motivoNaoInstalacao] ?? (escola as any).motivoNaoInstalacao}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal de edição */}
      {escolaEditando && (
        <ModalEditarEscola
          escola={escolaEditando}
          onClose={() => setEscolaEditando(null)}
          onSaved={() => setEscolaEditando(null)}
        />
      )}
    </AdminLayoutAuto>
  );
}
