import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { FileSpreadsheet, Download, Upload, CheckCircle2, AlertTriangle, XCircle, Info, FileSearch } from "lucide-react";
import { toast } from "sonner";

const TABELA_VALORES: Record<number, number> = {
  1: 1260, 2: 1460, 3: 1660, 4: 1892, 5: 2240, 6: 2472, 7: 2820, 8: 3052,
  9: 3400, 10: 3632, 11: 3980, 12: 4328, 13: 4676, 14: 5024, 15: 5372,
  16: 5572, 17: 5772, 18: 5972, 19: 6172, 20: 6272, 21: 6472, 22: 6672,
  23: 6872, 24: 7072, 25: 7272, 26: 7472, 27: 7672, 28: 7872, 29: 8072,
  30: 8272, 31: 8472,
};

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

type DivergenciaItem = {
  inep: string;
  escola: string;
  aps_sistema: number;
  aps_empresa: number;
  valor_sistema: number;
  valor_empresa: number;
  status: "ok" | "divergencia_ap" | "divergencia_valor" | "nao_encontrada";
};

type ValidacaoResult = {
  ok: boolean;
  erro?: string;
  divergencias: DivergenciaItem[];
  resumo: {
    total: number;
    ok: number;
    divergencias: number;
    nao_encontradas: number;
    total_valor_sistema: number;
    total_valor_empresa: number;
    diferenca: number;
  } | null;
};

export default function NotaFiscal() {
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [baixando, setBaixando] = useState(false);
  const [validando, setValidando] = useState(false);
  const [resultado, setResultado] = useState<ValidacaoResult | null>(null);
  const [filtroStatus, setFiltroStatus] = useState<"todos" | "ok" | "divergencia" | "nao_encontrada">("todos");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const getToken = () => localStorage.getItem("tenant_admin_token") || "";

  async function handleBaixarPlanilha() {
    setBaixando(true);
    try {
      const params = new URLSearchParams();
      if (dataInicio) params.set("dataInicio", dataInicio);
      if (dataFim) params.set("dataFim", dataFim);
      const t = getToken();
      const res = await fetch(`/api/nota-fiscal/excel?${params}`, {
        headers: { Authorization: `Bearer ${t}` },
      });
      if (!res.ok) throw new Error("Erro ao gerar planilha");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const periodo = dataInicio && dataFim ? `${dataInicio}_${dataFim}` : "completo";
      a.download = `nota-fiscal-${periodo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Planilha de nota fiscal baixada com sucesso!");
    } catch {
      toast.error("Erro ao baixar planilha. Tente novamente.");
    } finally {
      setBaixando(false);
    }
  }

  async function handleValidar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setValidando(true);
    setResultado(null);
    try {
      const formData = new FormData();
      formData.append("planilha", file);
      const t = getToken();
      const res = await fetch("/api/nota-fiscal/validar", {
        method: "POST",
        headers: { Authorization: `Bearer ${t}` },
        body: formData,
      });
      const data: ValidacaoResult = await res.json();
      setResultado(data);
      if (data.ok) {
        toast.success("Planilha validada! Todos os valores conferem.");
      } else if (data.erro) {
        toast.error(data.erro);
      } else {
        toast.warning(`Encontradas ${data.resumo?.divergencias ?? 0} divergência(s).`);
      }
    } catch {
      toast.error("Erro ao validar planilha.");
    } finally {
      setValidando(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  const divergenciasFiltradas = resultado?.divergencias.filter(d => {
    if (filtroStatus === "todos") return true;
    if (filtroStatus === "ok") return d.status === "ok";
    if (filtroStatus === "nao_encontrada") return d.status === "nao_encontrada";
    return d.status === "divergencia_ap" || d.status === "divergencia_valor";
  }) ?? [];

  return (
    <div className="space-y-6 p-6 max-w-6xl mx-auto">
      {/* Cabeçalho */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-green-100 dark:bg-green-900/30">
          <FileSpreadsheet className="h-6 w-6 text-green-700 dark:text-green-400" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Nota Fiscal</h1>
          <p className="text-sm text-muted-foreground">Gere a planilha de faturamento e valide com a planilha da empresa</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card: Gerar Planilha */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Download className="h-4 w-4 text-green-600" />
              Gerar Planilha de Faturamento
            </CardTitle>
            <CardDescription>
              Exporta a planilha com o valor a receber por escola concluída, baseado na tabela de valores por AP.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="dataInicio" className="text-xs">Data início</Label>
                <Input
                  id="dataInicio"
                  type="date"
                  value={dataInicio}
                  onChange={e => setDataInicio(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="dataFim" className="text-xs">Data fim</Label>
                <Input
                  id="dataFim"
                  type="date"
                  value={dataFim}
                  onChange={e => setDataFim(e.target.value)}
                />
              </div>
            </div>

            {(!dataInicio || !dataFim) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded p-2">
                <Info className="h-3 w-3 shrink-0" />
                Sem filtro de data, exporta todas as escolas concluídas.
              </div>
            )}

            <Button
              className="w-full bg-green-700 hover:bg-green-800 text-white"
              onClick={handleBaixarPlanilha}
              disabled={baixando}
            >
              <Download className="h-4 w-4 mr-2" />
              {baixando ? "Gerando planilha..." : "Baixar Planilha Excel"}
            </Button>
          </CardContent>
        </Card>

        {/* Card: Validar Planilha da Empresa */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSearch className="h-4 w-4 text-blue-600" />
              Validar Planilha da Empresa
            </CardTitle>
            <CardDescription>
              Envie a planilha recebida da empresa para conferir se os valores e quantidades de AP batem com seus registros.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-6 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50/30 dark:hover:bg-blue-900/10 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">Clique para selecionar a planilha da empresa</p>
              <p className="text-xs text-muted-foreground mt-1">Formato: .xlsx ou .xls</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".xlsx,.xls"
                className="hidden"
                onChange={handleValidar}
              />
            </div>

            {validando && (
              <div className="flex items-center gap-2 text-sm text-blue-600">
                <div className="h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                Analisando planilha...
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tabela de Valores de Referência */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Tabela de Valores por AP (Referência)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-4 sm:grid-cols-6 lg:grid-cols-8 gap-2">
            {Object.entries(TABELA_VALORES).map(([ap, val]) => (
              <div key={ap} className="text-center bg-muted/40 rounded p-2">
                <div className="text-xs font-bold text-foreground">{ap} AP</div>
                <div className="text-xs text-muted-foreground">{formatBRL(val)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Resultado da Validação */}
      {resultado && resultado.resumo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {resultado.ok
                ? <CheckCircle2 className="h-5 w-5 text-green-600" />
                : <AlertTriangle className="h-5 w-5 text-yellow-600" />}
              Resultado da Validação
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Resumo */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-muted/40 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold">{resultado.resumo.total}</div>
                <div className="text-xs text-muted-foreground">Total na planilha</div>
              </div>
              <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-green-700">{resultado.resumo.ok}</div>
                <div className="text-xs text-green-600">Conferem</div>
              </div>
              <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-yellow-700">{resultado.resumo.divergencias}</div>
                <div className="text-xs text-yellow-600">Divergências</div>
              </div>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-center">
                <div className="text-2xl font-bold text-red-700">{resultado.resumo.nao_encontradas}</div>
                <div className="text-xs text-red-600">Não encontradas</div>
              </div>
            </div>

            {/* Comparativo de valores */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Valor no seu sistema</div>
                <div className="text-lg font-bold text-blue-700">{formatBRL(resultado.resumo.total_valor_sistema)}</div>
              </div>
              <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
                <div className="text-xs text-muted-foreground mb-1">Valor na planilha da empresa</div>
                <div className="text-lg font-bold text-purple-700">{formatBRL(resultado.resumo.total_valor_empresa)}</div>
              </div>
              <div className={`rounded-lg p-3 ${resultado.resumo.diferenca >= 0 ? "bg-green-50 dark:bg-green-900/20" : "bg-red-50 dark:bg-red-900/20"}`}>
                <div className="text-xs text-muted-foreground mb-1">Diferença</div>
                <div className={`text-lg font-bold ${resultado.resumo.diferenca >= 0 ? "text-green-700" : "text-red-700"}`}>
                  {resultado.resumo.diferenca >= 0 ? "+" : ""}{formatBRL(resultado.resumo.diferenca)}
                </div>
              </div>
            </div>

            <Separator />

            {/* Filtros */}
            <div className="flex gap-2 flex-wrap">
              {(["todos", "ok", "divergencia", "nao_encontrada"] as const).map(f => (
                <Button
                  key={f}
                  variant={filtroStatus === f ? "default" : "outline"}
                  size="sm"
                  onClick={() => setFiltroStatus(f)}
                  className="text-xs"
                >
                  {f === "todos" && "Todos"}
                  {f === "ok" && `✓ OK (${resultado.resumo?.ok})`}
                  {f === "divergencia" && `⚠ Divergências (${resultado.resumo?.divergencias})`}
                  {f === "nao_encontrada" && `✗ Não encontradas (${resultado.resumo?.nao_encontradas})`}
                </Button>
              ))}
            </div>

            {/* Tabela de divergências */}
            <div className="overflow-x-auto rounded-lg border">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    <th className="text-left p-2 font-medium text-xs">Status</th>
                    <th className="text-left p-2 font-medium text-xs">Escola</th>
                    <th className="text-center p-2 font-medium text-xs">INEP</th>
                    <th className="text-center p-2 font-medium text-xs">APs Sistema</th>
                    <th className="text-center p-2 font-medium text-xs">APs Empresa</th>
                    <th className="text-right p-2 font-medium text-xs">Valor Sistema</th>
                    <th className="text-right p-2 font-medium text-xs">Valor Empresa</th>
                  </tr>
                </thead>
                <tbody>
                  {divergenciasFiltradas.map((d, i) => (
                    <tr key={i} className={`border-t ${d.status === "ok" ? "" : d.status === "nao_encontrada" ? "bg-red-50/50 dark:bg-red-900/10" : "bg-yellow-50/50 dark:bg-yellow-900/10"}`}>
                      <td className="p-2">
                        {d.status === "ok" && <Badge variant="outline" className="text-green-700 border-green-300 bg-green-50 text-xs">OK</Badge>}
                        {(d.status === "divergencia_ap" || d.status === "divergencia_valor") && <Badge variant="outline" className="text-yellow-700 border-yellow-300 bg-yellow-50 text-xs">Divergência</Badge>}
                        {d.status === "nao_encontrada" && <Badge variant="outline" className="text-red-700 border-red-300 bg-red-50 text-xs">Não encontrada</Badge>}
                      </td>
                      <td className="p-2 text-xs max-w-[200px] truncate">{d.escola}</td>
                      <td className="p-2 text-center text-xs font-mono">{d.inep}</td>
                      <td className={`p-2 text-center text-xs font-bold ${d.aps_sistema !== d.aps_empresa ? "text-yellow-700" : ""}`}>{d.aps_sistema}</td>
                      <td className={`p-2 text-center text-xs font-bold ${d.aps_sistema !== d.aps_empresa ? "text-yellow-700" : ""}`}>{d.aps_empresa}</td>
                      <td className="p-2 text-right text-xs">{formatBRL(d.valor_sistema)}</td>
                      <td className={`p-2 text-right text-xs font-bold ${Math.abs(d.valor_sistema - d.valor_empresa) > 1 ? "text-red-600" : ""}`}>{formatBRL(d.valor_empresa)}</td>
                    </tr>
                  ))}
                  {divergenciasFiltradas.length === 0 && (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground text-sm">
                        Nenhum item encontrado para o filtro selecionado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
