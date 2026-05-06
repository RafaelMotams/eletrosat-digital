import AdminLayoutAuto from "@/components/AdminLayoutAuto";
import { trpc } from "@/lib/trpc";
import { useState, useMemo } from "react";
import * as XLSX from "xlsx";
import {
  Download,
  Search,
  Wifi,
  MapPin,
  Phone,
  Zap,
  Package,
  Filter,
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
  X,
  Pencil,
  Save,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-yellow-100 text-yellow-800 border-yellow-200" },
  em_andamento: { label: "Em Andamento", color: "bg-blue-100 text-blue-800 border-blue-200" },
  concluido: { label: "Concluído", color: "bg-green-100 text-green-800 border-green-200" },
  nao_instalada: { label: "Não Instalada", color: "bg-red-100 text-red-800 border-red-200" },
};

type Escola = {
  id: number;
  inep: string;
  nome: string;
  endereco?: string | null;
  municipio?: string | null;
  uf?: string | null;
  latitude?: string | null;
  longitude?: string | null;
  telefone?: string | null;
  telefoneWhatsApp?: string | null;
  tipoConexao?: string | null;
  velocidadeMinima?: string | null;
  velocidadeOfertada?: string | null;
  qtdAp?: number | null;
  kitWifi?: number | null;
  apAdicional?: number | null;
  status: string;
};

type FormEscola = {
  nome: string;
  inep: string;
  endereco: string;
  municipio: string;
  uf: string;
  latitude: string;
  longitude: string;
  telefone: string;
  telefoneWhatsApp: string;
  tipoConexao: string;
  velocidadeMinima: string;
  velocidadeOfertada: string;
  qtdAp: string;
  kitWifi: string;
  apAdicional: string;
  status: string;
};

export default function AdminPlanilha() {
  const utils = trpc.useUtils();
  const { data: escolas, isLoading } = trpc.planilha.listar.useQuery();
  const { data: municipios } = trpc.escolas.listMunicipios.useQuery();
  const [busca, setBusca] = useState("");
  const [filtroVelocidade, setFiltroVelocidade] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

  // Modal de exclusão
  const [modalExcluir, setModalExcluir] = useState(false);
  const [tipoExclusao, setTipoExclusao] = useState<"municipio" | "todas">("municipio");
  const [municipioSelecionado, setMunicipioSelecionado] = useState("");
  const [confirmTexto, setConfirmTexto] = useState("");

  // Modal de edição
  const [modalEditar, setModalEditar] = useState(false);
  const [escolaEditando, setEscolaEditando] = useState<Escola | null>(null);
  const [formEditar, setFormEditar] = useState<FormEscola>({
    nome: "", inep: "", endereco: "", municipio: "", uf: "",
    latitude: "", longitude: "", telefone: "", telefoneWhatsApp: "",
    tipoConexao: "", velocidadeMinima: "", velocidadeOfertada: "",
    qtdAp: "", kitWifi: "", apAdicional: "", status: "pendente",
  });

  const updateMut = trpc.escolas.update.useMutation({
    onSuccess: () => {
      toast.success("Escola atualizada com sucesso!");
      utils.planilha.listar.invalidate();
      utils.escolas.list.invalidate();
      setModalEditar(false);
      setEscolaEditando(null);
    },
    onError: (e) => toast.error(`Erro ao atualizar: ${e.message}`),
  });

  const deletarPorCidadeMut = trpc.escolas.deletarPorCidade.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.total} escola(s) de "${municipioSelecionado}" excluídas com sucesso!`);
      utils.planilha.listar.invalidate();
      utils.escolas.list.invalidate();
      utils.escolas.listMunicipios.invalidate();
      setModalExcluir(false);
      setConfirmTexto("");
      setMunicipioSelecionado("");
    },
    onError: () => toast.error("Erro ao excluir escolas"),
  });

  const deletarTodasMut = trpc.escolas.deletarTodas.useMutation({
    onSuccess: (data) => {
      toast.success(`${data.total} escola(s) excluídas com sucesso!`);
      utils.planilha.listar.invalidate();
      utils.escolas.list.invalidate();
      utils.escolas.listMunicipios.invalidate();
      setModalExcluir(false);
      setConfirmTexto("");
    },
    onError: () => toast.error("Erro ao excluir escolas"),
  });

  const velocidades = useMemo(() => {
    if (!escolas) return [];
    return Array.from(new Set(escolas.map((e) => e.velocidadeOfertada).filter(Boolean))).sort(
      (a, b) => Number(a) - Number(b)
    );
  }, [escolas]);

  const escolasFiltradas = useMemo(() => {
    if (!escolas) return [];
    return escolas.filter((e) => {
      const matchBusca =
        !busca ||
        e.nome.toLowerCase().includes(busca.toLowerCase()) ||
        e.inep.includes(busca) ||
        (e.endereco ?? "").toLowerCase().includes(busca.toLowerCase());
      const matchVel =
        filtroVelocidade === "todos" || String(e.velocidadeOfertada) === filtroVelocidade;
      const matchStatus = filtroStatus === "todos" || e.status === filtroStatus;
      return matchBusca && matchVel && matchStatus;
    });
  }, [escolas, busca, filtroVelocidade, filtroStatus]);

  const totais = useMemo(() => {
    const totalKits = escolasFiltradas.reduce((acc, e) => acc + (e.kitWifi ?? 0), 0);
    const totalAps = escolasFiltradas.reduce((acc, e) => acc + (e.qtdAp ?? 0), 0);
    const concluidas = escolasFiltradas.filter((e) => e.status === "concluido").length;
    const pendentes = escolasFiltradas.filter((e) => e.status === "pendente").length;
    return { totalKits, totalAps, concluidas, pendentes };
  }, [escolasFiltradas]);

  function abrirModalEditar(escola: Escola) {
    setEscolaEditando(escola);
    setFormEditar({
      nome: escola.nome ?? "",
      inep: escola.inep ?? "",
      endereco: escola.endereco ?? "",
      municipio: escola.municipio ?? "",
      uf: escola.uf ?? "",
      latitude: escola.latitude ? String(escola.latitude) : "",
      longitude: escola.longitude ? String(escola.longitude) : "",
      telefone: escola.telefone ?? "",
      telefoneWhatsApp: escola.telefoneWhatsApp ?? "",
      tipoConexao: escola.tipoConexao ?? "",
      velocidadeMinima: escola.velocidadeMinima ? String(escola.velocidadeMinima) : "",
      velocidadeOfertada: escola.velocidadeOfertada ? String(escola.velocidadeOfertada) : "",
      qtdAp: escola.qtdAp != null ? String(escola.qtdAp) : "",
      kitWifi: escola.kitWifi != null ? String(escola.kitWifi) : "",
      apAdicional: escola.apAdicional != null ? String(escola.apAdicional) : "",
      status: escola.status ?? "pendente",
    });
    setModalEditar(true);
  }

  function salvarEdicao() {
    if (!escolaEditando) return;
    updateMut.mutate({
      id: escolaEditando.id,
      nome: formEditar.nome || undefined,
      inep: formEditar.inep || undefined,
      endereco: formEditar.endereco || undefined,
      municipio: formEditar.municipio || undefined,
      uf: formEditar.uf || undefined,
      latitude: formEditar.latitude || undefined,
      longitude: formEditar.longitude || undefined,
      telefone: formEditar.telefone || undefined,
      telefoneWhatsApp: formEditar.telefoneWhatsApp || undefined,
      tipoConexao: formEditar.tipoConexao || undefined,
      velocidadeMinima: formEditar.velocidadeMinima || undefined,
      velocidadeOfertada: formEditar.velocidadeOfertada || undefined,
      qtdAp: formEditar.qtdAp ? Number(formEditar.qtdAp) : undefined,
      kitWifi: formEditar.kitWifi ? Number(formEditar.kitWifi) : undefined,
      apAdicional: formEditar.apAdicional ? Number(formEditar.apAdicional) : undefined,
      status: formEditar.status as any || undefined,
    });
  }

  function getRows() {
    return escolasFiltradas.map((e) => ({
      "Código INEP": e.inep,
      "UF": e.uf ?? "BA",
      "Município": e.municipio ?? "—",
      "Nome da Escola": e.nome,
      "Endereço": e.endereco ?? "",
      "Latitude": e.latitude ? Number(e.latitude) : "",
      "Longitude": e.longitude ? Number(e.longitude) : "",
      "AP Adicional (estimado)": e.apAdicional ?? "",
      "Telefone": e.telefone ?? "",
      "Kit Wi-Fi (estimado)": e.kitWifi ?? "",
      "Velocidade Mínima (Mbps)": e.velocidadeMinima ?? "",
      "Velocidade Ofertada (Mbps)": e.velocidadeOfertada ?? "",
      "Solução Proposta": e.tipoConexao ?? "Fibra",
      "Status": STATUS_LABELS[e.status]?.label ?? e.status,
    }));
  }

  function exportarExcel() {
    if (!escolasFiltradas.length) { toast.error("Nenhum dado para exportar"); return; }
    const ws = XLSX.utils.json_to_sheet(getRows());
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Escolas");
    XLSX.writeFile(wb, `escolas-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success(`${escolasFiltradas.length} registros exportados em Excel!`);
  }

  function exportarCSV() {
    if (!escolasFiltradas.length) { toast.error("Nenhum dado para exportar"); return; }
    const rows = getRows();
    const headers = Object.keys(rows[0]);
    const csv = [
      headers.join(","),
      ...rows.map((r) =>
        headers.map((h) => {
          const v = String((r as Record<string, unknown>)[h] ?? "");
          return v.includes(",") || v.includes('"') ? `"${v.replace(/"/g, '""')}"` : v;
        }).join(",")
      ),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `escolas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${escolasFiltradas.length} registros exportados em CSV!`);
  }

  function abrirMaps(lat: string | null, lng: string | null, nome: string) {
    if (!lat || !lng) { toast.error("Coordenadas não disponíveis para esta escola"); return; }
    window.open(`https://www.google.com/maps?q=${lat},${lng}&z=15`, "_blank");
  }

  function confirmarExclusao() {
    if (tipoExclusao === "municipio") {
      if (!municipioSelecionado) { toast.error("Selecione um município"); return; }
      if (confirmTexto !== "EXCLUIR") { toast.error('Digite "EXCLUIR" para confirmar'); return; }
      deletarPorCidadeMut.mutate({ municipio: municipioSelecionado });
    } else {
      if (confirmTexto !== "EXCLUIR TUDO") { toast.error('Digite "EXCLUIR TUDO" para confirmar'); return; }
      deletarTodasMut.mutate();
    }
  }

  const isPending = deletarPorCidadeMut.isPending || deletarTodasMut.isPending;
  const confirmEsperado = tipoExclusao === "municipio" ? "EXCLUIR" : "EXCLUIR TUDO";

  return (
    <AdminLayoutAuto title="Planilha de Escolas">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planilha de Escolas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dados completos das {escolas?.length ?? 0} escolas
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button onClick={exportarCSV} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            CSV
          </Button>
          <Button onClick={exportarExcel} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <FileSpreadsheet className="w-4 h-4" />
            Excel (.xlsx)
          </Button>
          <Button
            onClick={() => { setModalExcluir(true); setConfirmTexto(""); setMunicipioSelecionado(""); setTipoExclusao("municipio"); }}
            variant="outline"
            className="gap-2 border-red-200 text-red-600 hover:bg-red-50 hover:border-red-400"
          >
            <Trash2 className="w-4 h-4" />
            Excluir Planilha
          </Button>
        </div>
      </div>

      {/* Cards de totais */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card className="border-0 shadow-sm bg-blue-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-blue-600 flex items-center justify-center">
                <Wifi className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-blue-600 font-medium">Total Kits Wi-Fi</p>
                <p className="text-2xl font-bold text-blue-900">{totais.totalKits}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-purple-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-purple-600 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-purple-600 font-medium">Total APs</p>
                <p className="text-2xl font-bold text-purple-900">{totais.totalAps}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-green-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-600 flex items-center justify-center">
                <Zap className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-green-600 font-medium">Concluídas</p>
                <p className="text-2xl font-bold text-green-900">{totais.concluidas}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-sm bg-yellow-50">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500 flex items-center justify-center">
                <Filter className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-xs text-yellow-700 font-medium">Pendentes</p>
                <p className="text-2xl font-bold text-yellow-900">{totais.pendentes}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtros */}
      <Card className="border-0 shadow-sm mb-6">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por nome, INEP ou endereço..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="pl-9"
              />
            </div>
            <Select value={filtroVelocidade} onValueChange={setFiltroVelocidade}>
              <SelectTrigger className="w-full sm:w-52">
                <SelectValue placeholder="Velocidade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todas as velocidades</SelectItem>
                {velocidades.map((v) => (
                  <SelectItem key={String(v)} value={String(v)}>{v} Mbps</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filtroStatus} onValueChange={setFiltroStatus}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="todos">Todos os status</SelectItem>
                <SelectItem value="pendente">Pendente</SelectItem>
                <SelectItem value="em_andamento">Em Andamento</SelectItem>
                <SelectItem value="concluido">Concluído</SelectItem>
                <SelectItem value="nao_instalada">Não Instalada</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Exibindo <strong>{escolasFiltradas.length}</strong> de <strong>{escolas?.length ?? 0}</strong> escolas
          </p>
        </CardContent>
      </Card>

      {/* Tabela */}
      <Card className="border-0 shadow-sm overflow-hidden">
        <CardHeader className="pb-0 px-6 pt-5">
          <CardTitle className="text-base font-semibold">
            Dados Completos — {escolasFiltradas.length} escola{escolasFiltradas.length !== 1 ? "s" : ""}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex items-center justify-center h-48 text-muted-foreground">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <span className="text-sm">Carregando dados...</span>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap text-xs">#</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap text-xs">INEP</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap text-xs">UF</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap text-xs">Município</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap text-xs">Nome da Escola</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap text-xs">Endereço</th>
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap text-xs">Latitude</th>
                    <th className="text-right px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap text-xs">Longitude</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap text-xs">AP Adic.</th>
                    <th className="text-left px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap text-xs">Telefone</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap text-xs">Kit Wi-Fi</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap text-xs">Vel. Mín.</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap text-xs">Vel. Ofert.</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap text-xs">Solução</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap text-xs">Status</th>
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap text-xs">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {escolasFiltradas.length === 0 ? (
                    <tr>
                      <td colSpan={16} className="text-center py-12 text-muted-foreground">
                        Nenhuma escola encontrada com os filtros aplicados.
                      </td>
                    </tr>
                  ) : (
                    escolasFiltradas.map((escola, idx) => (
                      <tr key={escola.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="px-3 py-2.5 text-muted-foreground font-mono text-xs">{idx + 1}</td>
                        <td className="px-3 py-2.5 font-mono text-xs text-muted-foreground whitespace-nowrap">{escola.inep}</td>
                        <td className="px-3 py-2.5 text-xs font-medium">{escola.uf ?? "BA"}</td>
                        <td className="px-3 py-2.5 text-xs whitespace-nowrap">{escola.municipio ?? "—"}</td>
                        <td className="px-3 py-2.5 font-medium max-w-[200px]">
                          <span className="line-clamp-2 text-xs leading-tight">{escola.nome}</span>
                        </td>
                        <td className="px-3 py-2.5 text-muted-foreground max-w-[220px]">
                          <span className="line-clamp-2 text-xs leading-tight">{escola.endereco ?? "-"}</span>
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {escola.latitude ? Number(escola.latitude).toFixed(6) : <span className="text-red-400">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-right font-mono text-xs text-muted-foreground whitespace-nowrap">
                          {escola.longitude ? Number(escola.longitude).toFixed(6) : <span className="text-red-400">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs">
                          {escola.apAdicional ?? <span className="text-muted-foreground">—</span>}
                        </td>
                        <td className="px-3 py-2.5 whitespace-nowrap">
                          {escola.telefone ? (
                            <a href={`tel:${escola.telefone}`} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors">
                              <Phone className="w-3 h-3" />{escola.telefone}
                            </a>
                          ) : <span className="text-muted-foreground text-xs">—</span>}
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <Wifi className="w-3 h-3 text-blue-500" />
                            <span className="font-semibold text-blue-700 text-xs">{escola.kitWifi ?? escola.qtdAp ?? "—"}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-center text-xs text-muted-foreground whitespace-nowrap">
                          {escola.velocidadeMinima ? `${escola.velocidadeMinima} Mbps` : "—"}
                        </td>
                        <td className="px-3 py-2.5 text-center whitespace-nowrap">
                          <span className="font-semibold text-emerald-700 text-xs">
                            {escola.velocidadeOfertada ? `${escola.velocidadeOfertada} Mbps` : "—"}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700 border-blue-200">
                            {escola.tipoConexao ?? "Fibra"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${STATUS_LABELS[escola.status]?.color ?? ""}`}>
                            {STATUS_LABELS[escola.status]?.label ?? escola.status}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => abrirModalEditar(escola as Escola)}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-600 transition-colors"
                              title="Editar escola"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => abrirMaps(
                                escola.latitude ? String(escola.latitude) : null,
                                escola.longitude ? String(escola.longitude) : null,
                                escola.nome
                              )}
                              className="inline-flex items-center justify-center w-7 h-7 rounded-md bg-muted hover:bg-primary hover:text-white transition-colors"
                              title="Ver no Google Maps"
                            >
                              <MapPin className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
                {escolasFiltradas.length > 0 && (
                  <tfoot>
                    <tr className="border-t bg-muted/30 font-semibold">
                      <td colSpan={10} className="px-3 py-3 text-sm text-muted-foreground">
                        Total ({escolasFiltradas.length} escolas)
                      </td>
                      <td className="px-3 py-3 text-center text-blue-700 font-bold">{totais.totalKits}</td>
                      <td colSpan={5} />
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Edição */}
      {modalEditar && escolaEditando && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-2xl border border-border max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center">
                  <Pencil className="w-5 h-5 text-blue-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Editar Escola</h2>
                  <p className="text-xs text-muted-foreground line-clamp-1">{escolaEditando.nome}</p>
                </div>
              </div>
              <button
                onClick={() => setModalEditar(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Formulário */}
            <div className="overflow-y-auto p-6 space-y-5 flex-1">
              {/* Identificação */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">1</span>
                  Identificação
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Nome da Escola</label>
                    <Input value={formEditar.nome} onChange={e => setFormEditar(f => ({ ...f, nome: e.target.value }))} placeholder="Nome da escola" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">INEP</label>
                    <Input value={formEditar.inep} onChange={e => setFormEditar(f => ({ ...f, inep: e.target.value }))} placeholder="Código INEP" />
                  </div>
                </div>
              </div>

              {/* Localização */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">2</span>
                  Localização
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="sm:col-span-2">
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Endereço</label>
                    <Input value={formEditar.endereco} onChange={e => setFormEditar(f => ({ ...f, endereco: e.target.value }))} placeholder="Endereço completo" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Município</label>
                    <Input value={formEditar.municipio} onChange={e => setFormEditar(f => ({ ...f, municipio: e.target.value }))} placeholder="Município" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">UF</label>
                    <Input value={formEditar.uf} onChange={e => setFormEditar(f => ({ ...f, uf: e.target.value }))} placeholder="Ex: BA" maxLength={2} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Latitude</label>
                    <Input value={formEditar.latitude} onChange={e => setFormEditar(f => ({ ...f, latitude: e.target.value }))} placeholder="Ex: -12.971598" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Longitude</label>
                    <Input value={formEditar.longitude} onChange={e => setFormEditar(f => ({ ...f, longitude: e.target.value }))} placeholder="Ex: -38.501597" />
                  </div>
                </div>
              </div>

              {/* Contato */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">3</span>
                  Contato
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Telefone</label>
                    <Input value={formEditar.telefone} onChange={e => setFormEditar(f => ({ ...f, telefone: e.target.value }))} placeholder="(00) 00000-0000" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">WhatsApp</label>
                    <Input value={formEditar.telefoneWhatsApp} onChange={e => setFormEditar(f => ({ ...f, telefoneWhatsApp: e.target.value }))} placeholder="(00) 00000-0000" />
                  </div>
                </div>
              </div>

              {/* Infraestrutura */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">4</span>
                  Infraestrutura
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Solução / Tipo</label>
                    <Input value={formEditar.tipoConexao} onChange={e => setFormEditar(f => ({ ...f, tipoConexao: e.target.value }))} placeholder="Ex: Fibra" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Vel. Mínima (Mbps)</label>
                    <Input type="number" value={formEditar.velocidadeMinima} onChange={e => setFormEditar(f => ({ ...f, velocidadeMinima: e.target.value }))} placeholder="Ex: 100" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Vel. Ofertada (Mbps)</label>
                    <Input type="number" value={formEditar.velocidadeOfertada} onChange={e => setFormEditar(f => ({ ...f, velocidadeOfertada: e.target.value }))} placeholder="Ex: 200" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Kit Wi-Fi</label>
                    <Input type="number" value={formEditar.kitWifi} onChange={e => setFormEditar(f => ({ ...f, kitWifi: e.target.value }))} placeholder="Qtd kits" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">Qtd APs</label>
                    <Input type="number" value={formEditar.qtdAp} onChange={e => setFormEditar(f => ({ ...f, qtdAp: e.target.value }))} placeholder="Qtd APs" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-muted-foreground mb-1 block">AP Adicional</label>
                    <Input type="number" value={formEditar.apAdicional} onChange={e => setFormEditar(f => ({ ...f, apAdicional: e.target.value }))} placeholder="AP adicional" />
                  </div>
                </div>
              </div>

              {/* Status */}
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <span className="w-5 h-5 rounded-full bg-gray-100 text-gray-700 flex items-center justify-center text-xs font-bold">5</span>
                  Status
                </h3>
                <Select value={formEditar.status} onValueChange={v => setFormEditar(f => ({ ...f, status: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="em_andamento">Em Andamento</SelectItem>
                    <SelectItem value="concluido">Concluído</SelectItem>
                    <SelectItem value="nao_instalada">Não Instalada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-border shrink-0">
              <Button variant="outline" className="flex-1" onClick={() => setModalEditar(false)}>
                Cancelar
              </Button>
              <Button
                className="flex-1 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                onClick={salvarEdicao}
                disabled={updateMut.isPending}
              >
                {updateMut.isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                Salvar Alterações
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Exclusão */}
      {modalExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-background rounded-2xl shadow-2xl w-full max-w-md border border-border">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                  <AlertTriangle className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-foreground">Excluir Planilha</h2>
                  <p className="text-xs text-muted-foreground">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <button
                onClick={() => setModalExcluir(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center hover:bg-muted transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            {/* Body */}
            <div className="p-6 space-y-4">
              <div className="flex gap-2">
                <button
                  onClick={() => setTipoExclusao("municipio")}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${tipoExclusao === "municipio" ? "bg-red-50 border-red-300 text-red-700" : "border-border text-muted-foreground hover:bg-muted"}`}
                >
                  Por Município
                </button>
                <button
                  onClick={() => setTipoExclusao("todas")}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium border transition-colors ${tipoExclusao === "todas" ? "bg-red-50 border-red-300 text-red-700" : "border-border text-muted-foreground hover:bg-muted"}`}
                >
                  Todas as Escolas
                </button>
              </div>
              {tipoExclusao === "municipio" && (
                <Select value={municipioSelecionado} onValueChange={setMunicipioSelecionado}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o município" />
                  </SelectTrigger>
                  <SelectContent>
                    {(municipios ?? []).map((m) => (
                      <SelectItem key={m} value={m}>{m}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <div>
                <p className="text-sm text-muted-foreground mb-2">
                  Digite <strong className="text-red-600">{confirmEsperado}</strong> para confirmar:
                </p>
                <Input
                  value={confirmTexto}
                  onChange={(e) => setConfirmTexto(e.target.value)}
                  placeholder={confirmEsperado}
                  className="border-red-200 focus:border-red-400"
                />
              </div>
            </div>
            {/* Footer */}
            <div className="flex gap-3 p-6 border-t border-border">
              <Button variant="outline" className="flex-1" onClick={() => setModalExcluir(false)}>
                Cancelar
              </Button>
              <Button
                variant="destructive"
                className="flex-1"
                onClick={confirmarExclusao}
                disabled={isPending || confirmTexto !== confirmEsperado}
              >
                {isPending ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  "Confirmar Exclusão"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayoutAuto>
  );
}
