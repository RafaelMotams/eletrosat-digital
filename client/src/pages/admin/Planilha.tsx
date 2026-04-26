import AdminLayout from "@/components/AdminLayout";
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
};

export default function AdminPlanilha() {
  const { data: escolas, isLoading } = trpc.planilha.listar.useQuery();
  const [busca, setBusca] = useState("");
  const [filtroVelocidade, setFiltroVelocidade] = useState("todos");
  const [filtroStatus, setFiltroStatus] = useState("todos");

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

  function getRows() {
    return escolasFiltradas.map((e) => ({
      "Código INEP": e.inep,
      "UF": e.uf ?? "BA",
      "Município": e.municipio ?? "Monte Santo",
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
    XLSX.writeFile(wb, `netvionis-escolas-${new Date().toISOString().slice(0, 10)}.xlsx`);
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
    a.download = `netvionis-escolas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(`${escolasFiltradas.length} registros exportados em CSV!`);
  }

  function abrirMaps(lat: string | null, lng: string | null, nome: string) {
    if (!lat || !lng) { toast.error("Coordenadas não disponíveis para esta escola"); return; }
    window.open(`https://www.google.com/maps?q=${lat},${lng}&z=15`, "_blank");
  }

  return (
    <AdminLayout title="Planilha de Escolas">
      {/* Cabeçalho */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Planilha de Escolas</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Dados completos das {escolas?.length ?? 0} escolas — Monte Santo, BA
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={exportarCSV} variant="outline" className="gap-2">
            <Download className="w-4 h-4" />
            CSV
          </Button>
          <Button onClick={exportarExcel} className="gap-2 bg-emerald-600 hover:bg-emerald-700 text-white">
            <FileSpreadsheet className="w-4 h-4" />
            Excel (.xlsx)
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
              </SelectContent>
            </Select>
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            Exibindo <strong>{escolasFiltradas.length}</strong> de <strong>{escolas?.length ?? 0}</strong> escolas
          </p>
        </CardContent>
      </Card>

      {/* Tabela completa com todos os 13 campos */}
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
                    <th className="text-center px-3 py-3 font-semibold text-muted-foreground whitespace-nowrap text-xs">Mapa</th>
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
                        <td className="px-3 py-2.5 text-xs whitespace-nowrap">{escola.municipio ?? "Monte Santo"}</td>
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
    </AdminLayout>
  );
}
