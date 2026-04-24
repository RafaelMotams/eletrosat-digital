import { useState, useRef, useCallback } from "react";
import * as XLSX from "xlsx";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";
import {
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  X,
  ArrowRight,
  RefreshCw,
  Table2,
} from "lucide-react";
import {
  detectarMapeamento,
  converterLinha,
  CAMPOS_LABELS,
  type CampoEscola,
} from "@shared/columnDetector";

type EtapaImport = "upload" | "mapeamento" | "preview" | "concluido";

interface DadosArquivo {
  headers: string[];
  rows: Record<string, unknown>[];
  nomeArquivo: string;
  totalLinhas: number;
}

interface Props {
  onConcluido?: (qtd: number) => void;
}

const CAMPOS_OBRIGATORIOS: CampoEscola[] = ["inep", "nome"];
const CAMPOS_OPCIONAIS: CampoEscola[] = [
  "uf", "municipio", "endereco", "latitude", "longitude",
  "qtdAp", "telefone", "velocidadeMinima", "velocidadeOfertada",
  "tipoConexao", "kitWifi", "apAdicional",
];

export default function ImportacaoPlanilha({ onConcluido }: Props) {
  const utils = trpc.useUtils();
  const [etapa, setEtapa] = useState<EtapaImport>("upload");
  const [dados, setDados] = useState<DadosArquivo | null>(null);
  const [mapeamento, setMapeamento] = useState<Partial<Record<CampoEscola, string>>>({});
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const importarMut = trpc.escolas.importar.useMutation({
    onSuccess: (r) => {
      toast.success(`✅ ${r.importadas} escola(s) importada(s) com sucesso!`);
      utils.escolas.list.invalidate();
      setEtapa("concluido");
      onConcluido?.(r.importadas);
    },
    onError: (e) => toast.error(`Erro ao importar: ${e.message}`),
  });

  const processarArquivo = useCallback(async (file: File) => {
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array", raw: false });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

      if (rows.length === 0) {
        toast.error("Planilha vazia ou sem dados reconhecíveis.");
        return;
      }

      const headers = Object.keys(rows[0]);
      const detectedMap = detectarMapeamento(headers);

      setDados({
        headers,
        rows,
        nomeArquivo: file.name,
        totalLinhas: rows.length,
      });
      setMapeamento(detectedMap);
      setEtapa("mapeamento");
    } catch (err) {
      toast.error("Erro ao ler o arquivo. Verifique se é um Excel (.xlsx/.xls) ou CSV válido.");
      console.error(err);
    }
  }, []);

  const handleFile = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!["xlsx", "xls", "csv"].includes(ext ?? "")) {
      toast.error("Formato não suportado. Use .xlsx, .xls ou .csv");
      return;
    }
    processarArquivo(file);
  }, [processarArquivo]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (fileRef.current) fileRef.current.value = "";
  }, [handleFile]);

  const confirmarMapeamento = () => {
    const faltando = CAMPOS_OBRIGATORIOS.filter(c => !mapeamento[c]);
    if (faltando.length > 0) {
      toast.error(`Campos obrigatórios não mapeados: ${faltando.map(c => CAMPOS_LABELS[c]).join(", ")}`);
      return;
    }
    setEtapa("preview");
  };

  const confirmarImportacao = () => {
    if (!dados) return;
    const escolasData = dados.rows
      .map(row => converterLinha(row, mapeamento))
      .filter(e => e.inep && e.nome);

    if (escolasData.length === 0) {
      toast.error("Nenhuma escola válida encontrada com o mapeamento atual.");
      return;
    }

    importarMut.mutate({ escolas: escolasData });
  };

  const reiniciar = () => {
    setEtapa("upload");
    setDados(null);
    setMapeamento({});
  };

  // ── ETAPA 1: Upload ──────────────────────────────────────────────────────────
  if (etapa === "upload") {
    return (
      <div className="space-y-4">
        <div
          className={`border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
            dragging
              ? "border-primary bg-primary/5 scale-[1.01]"
              : "border-border hover:border-primary/50 hover:bg-muted/30"
          }`}
          onDragOver={e => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => fileRef.current?.click()}
        >
          <div className="flex flex-col items-center gap-3">
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-colors ${dragging ? "bg-primary/20" : "bg-muted"}`}>
              <FileSpreadsheet className={`w-7 h-7 ${dragging ? "text-primary" : "text-muted-foreground"}`} />
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {dragging ? "Solte o arquivo aqui" : "Arraste e solte sua planilha"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                ou clique para selecionar
              </p>
            </div>
            <div className="flex gap-2 mt-1">
              {[".xlsx", ".xls", ".csv"].map(ext => (
                <Badge key={ext} variant="outline" className="text-xs font-mono">{ext}</Badge>
              ))}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Qualquer formato de planilha é aceito — as colunas são detectadas automaticamente
            </p>
          </div>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept=".xlsx,.xls,.csv"
          className="hidden"
          onChange={handleInputChange}
        />
      </div>
    );
  }

  // ── ETAPA 2: Mapeamento de Colunas ──────────────────────────────────────────
  if (etapa === "mapeamento" && dados) {
    const camposNaoMapeados = [...CAMPOS_OBRIGATORIOS, ...CAMPOS_OPCIONAIS].filter(
      c => !mapeamento[c]
    );
    const camposMapeados = [...CAMPOS_OBRIGATORIOS, ...CAMPOS_OPCIONAIS].filter(
      c => !!mapeamento[c]
    );

    return (
      <div className="space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <Table2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">{dados.nomeArquivo}</p>
              <p className="text-xs text-muted-foreground">{dados.totalLinhas} linhas detectadas · {dados.headers.length} colunas</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={reiniciar}>
            <X className="w-4 h-4 mr-1" /> Trocar arquivo
          </Button>
        </div>

        {/* Campos detectados automaticamente */}
        {camposMapeados.length > 0 && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-800">
                {camposMapeados.length} campo(s) detectado(s) automaticamente
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {camposMapeados.map(campo => (
                <div key={campo} className="flex items-center justify-between bg-white rounded-md px-3 py-2 border border-green-100">
                  <span className="text-xs font-medium text-foreground">{CAMPOS_LABELS[campo]}</span>
                  <div className="flex items-center gap-1">
                    <ArrowRight className="w-3 h-3 text-muted-foreground" />
                    <Badge variant="secondary" className="text-xs font-mono max-w-[120px] truncate">
                      {mapeamento[campo]}
                    </Badge>
                    <button
                      onClick={() => setMapeamento(m => { const n = { ...m }; delete n[campo]; return n; })}
                      className="ml-1 text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Campos não mapeados */}
        {camposNaoMapeados.length > 0 && (
          <div className="rounded-lg border border-border p-4">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-medium">
                Mapeie os campos restantes (opcional, exceto INEP e Nome)
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {camposNaoMapeados.map(campo => (
                <div key={campo} className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    {CAMPOS_LABELS[campo]}
                    {CAMPOS_OBRIGATORIOS.includes(campo) && (
                      <span className="text-destructive">*</span>
                    )}
                  </label>
                  <Select
                    value={mapeamento[campo] ?? "__none__"}
                    onValueChange={val => {
                      if (val === "__none__") {
                        setMapeamento(m => { const n = { ...m }; delete n[campo]; return n; });
                      } else {
                        setMapeamento(m => ({ ...m, [campo]: val }));
                      }
                    }}
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Selecionar coluna..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="__none__">— Não mapear —</SelectItem>
                      {dados.headers.map(h => (
                        <SelectItem key={h} value={h} className="text-xs font-mono">{h}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={reiniciar} size="sm">
            <RefreshCw className="w-4 h-4 mr-1" /> Recomeçar
          </Button>
          <Button onClick={confirmarMapeamento} size="sm">
            Pré-visualizar dados <ArrowRight className="w-4 h-4 ml-1" />
          </Button>
        </div>
      </div>
    );
  }

  // ── ETAPA 3: Preview ─────────────────────────────────────────────────────────
  if (etapa === "preview" && dados) {
    const escolasPreview = dados.rows
      .slice(0, 5)
      .map(row => converterLinha(row, mapeamento))
      .filter(e => e.inep && e.nome);

    const totalValidas = dados.rows
      .map(row => converterLinha(row, mapeamento))
      .filter(e => e.inep && e.nome).length;

    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Pré-visualização da importação</p>
            <p className="text-sm text-muted-foreground">
              <span className="text-green-600 font-medium">{totalValidas}</span> escola(s) válidas de {dados.totalLinhas} linhas
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setEtapa("mapeamento")}>
            ← Ajustar mapeamento
          </Button>
        </div>

        <div className="rounded-lg border overflow-auto max-h-64">
          <table className="w-full text-xs">
            <thead className="bg-muted sticky top-0">
              <tr>
                <th className="px-3 py-2 text-left font-medium">INEP</th>
                <th className="px-3 py-2 text-left font-medium">Nome</th>
                <th className="px-3 py-2 text-left font-medium">Município</th>
                <th className="px-3 py-2 text-left font-medium">APs</th>
                <th className="px-3 py-2 text-left font-medium">Velocidade</th>
                <th className="px-3 py-2 text-left font-medium">Solução</th>
              </tr>
            </thead>
            <tbody>
              {escolasPreview.map((e, i) => (
                <tr key={i} className="border-t hover:bg-muted/30">
                  <td className="px-3 py-2 font-mono text-muted-foreground">{e.inep}</td>
                  <td className="px-3 py-2 font-medium max-w-[180px] truncate">{e.nome}</td>
                  <td className="px-3 py-2 text-muted-foreground">{e.municipio ?? "—"}</td>
                  <td className="px-3 py-2">{e.qtdAp ?? "—"}</td>
                  <td className="px-3 py-2">{e.velocidadeOfertada ? `${e.velocidadeOfertada} Mbps` : "—"}</td>
                  <td className="px-3 py-2">{e.tipoConexao ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {totalValidas > 5 && (
            <div className="px-3 py-2 text-xs text-muted-foreground bg-muted/30 border-t">
              + {totalValidas - 5} escola(s) adicionais serão importadas
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end">
          <Button variant="outline" onClick={() => setEtapa("mapeamento")} size="sm">
            ← Voltar
          </Button>
          <Button
            onClick={confirmarImportacao}
            disabled={importarMut.isPending}
            size="sm"
            className="bg-green-600 hover:bg-green-700"
          >
            {importarMut.isPending ? (
              <><RefreshCw className="w-4 h-4 mr-2 animate-spin" /> Importando...</>
            ) : (
              <><Upload className="w-4 h-4 mr-2" /> Confirmar e importar {totalValidas} escola(s)</>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // ── ETAPA 4: Concluído ───────────────────────────────────────────────────────
  if (etapa === "concluido") {
    return (
      <div className="flex flex-col items-center gap-4 py-8 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center">
          <CheckCircle2 className="w-8 h-8 text-green-600" />
        </div>
        <div>
          <p className="font-semibold text-lg">Importação concluída!</p>
          <p className="text-sm text-muted-foreground mt-1">
            As escolas foram adicionadas ao sistema com sucesso.
          </p>
        </div>
        <Button variant="outline" onClick={reiniciar} size="sm">
          <Upload className="w-4 h-4 mr-2" /> Importar outra planilha
        </Button>
      </div>
    );
  }

  return null;
}
