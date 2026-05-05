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
  ChevronRight,
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

/** Detecção manual de fallback para INEP e Nome quando o fuzzy falha */
function detectarFallback(headers: string[]): Partial<Record<CampoEscola, string>> {
  const map: Partial<Record<CampoEscola, string>> = {};
  for (const h of headers) {
    const hn = h.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!map.inep && (hn.includes("inep") || hn.includes("codinep") || hn.includes("codescola"))) {
      map.inep = h;
    }
    if (!map.nome && (hn.includes("nome") || hn.includes("escola") || hn.includes("estabelecimento") || hn.includes("name"))) {
      map.nome = h;
    }
    if (!map.municipio && (hn.includes("munic") || hn.includes("cidade") || hn.includes("city"))) {
      map.municipio = h;
    }
    if (!map.uf && (hn === "uf" || hn === "estado" || hn === "state")) {
      map.uf = h;
    }
    if (!map.telefone && (hn.includes("tel") || hn.includes("fone") || hn.includes("phone") || hn.includes("whats"))) {
      map.telefone = h;
    }
    if (!map.latitude && (hn.includes("lat") || hn === "y")) {
      map.latitude = h;
    }
    if (!map.longitude && (hn.includes("lon") || hn.includes("lng") || hn === "x")) {
      map.longitude = h;
    }
    if (!map.endereco && (hn.includes("ender") || hn.includes("addr") || hn.includes("logr") || hn.includes("rua"))) {
      map.endereco = h;
    }
    if (!map.kitWifi && (hn.includes("kit") || hn.includes("wifi") || hn.includes("wif"))) {
      map.kitWifi = h;
    }
    if (!map.velocidadeOfertada && (hn.includes("ofert") || hn.includes("veloc"))) {
      map.velocidadeOfertada = h;
    }
    if (!map.tipoConexao && (hn.includes("soluc") || hn.includes("solução") || hn.includes("conexao") || hn.includes("tipo"))) {
      map.tipoConexao = h;
    }
  }
  return map;
}

export default function ImportacaoPlanilha({ onConcluido }: Props) {
  const utils = trpc.useUtils();
  const [etapa, setEtapa] = useState<EtapaImport>("upload");
  const [dados, setDados] = useState<DadosArquivo | null>(null);
  const [mapeamento, setMapeamento] = useState<Partial<Record<CampoEscola, string>>>({});
  const [dragging, setDragging] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const importarMut = trpc.escolas.importar.useMutation({
    onSuccess: (r) => {
      if (r.erros && r.erros > 0) {
        toast.success(`✅ ${r.importadas} escola(s) importada(s). ${r.erros} linha(s) ignorada(s) por dados inválidos.`, { duration: 6000 });
      } else {
        toast.success(`✅ ${r.importadas} escola(s) importada(s) com sucesso!`);
      }
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

      // Tenta detecção automática (fuzzy) primeiro, depois fallback manual
      const fuzzyMap = detectarMapeamento(headers);
      const fallbackMap = detectarFallback(headers);
      // Mescla: fuzzy tem prioridade, fallback preenche o que faltou
      const detectedMap: Partial<Record<CampoEscola, string>> = { ...fallbackMap, ...fuzzyMap };

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
      toast.error(
        `Mapeie os campos obrigatórios antes de avançar: ${faltando.map(c => CAMPOS_LABELS[c]).join(", ")}`,
        { duration: 5000 }
      );
      return;
    }
    setEtapa("preview");
  };

  // Nearest-neighbor TSP sort by GPS coordinates
  function sortByRouteCoords<T extends { latitude?: string; longitude?: string }>(list: T[]): T[] {
    const withCoords = list.filter(e => e.latitude && e.longitude);
    const withoutCoords = list.filter(e => !e.latitude || !e.longitude);
    if (withCoords.length === 0) return list;
    const dist = (a: T, b: T) => {
      const R = 6371;
      const lat1 = parseFloat(a.latitude!), lat2 = parseFloat(b.latitude!);
      const lng1 = parseFloat(a.longitude!), lng2 = parseFloat(b.longitude!);
      const dLat = (lat2 - lat1) * Math.PI / 180;
      const dLng = (lng2 - lng1) * Math.PI / 180;
      const aa = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLng / 2) ** 2;
      return R * 2 * Math.atan2(Math.sqrt(aa), Math.sqrt(1 - aa));
    };
    const sorted: T[] = [];
    const remaining = [...withCoords];
    let current = remaining.splice(0, 1)[0];
    sorted.push(current);
    while (remaining.length > 0) {
      let ni = 0, nd = dist(current, remaining[0]);
      for (let i = 1; i < remaining.length; i++) { const d = dist(current, remaining[i]); if (d < nd) { nd = d; ni = i; } }
      current = remaining.splice(ni, 1)[0];
      sorted.push(current);
    }
    return [...sorted, ...withoutCoords];
  }

  const confirmarImportacao = () => {
    if (!dados) return;
    const raw = dados.rows
      .map(row => converterLinha(row, mapeamento))
      .filter(e => e.inep && e.nome);

    if (raw.length === 0) {
      toast.error("Nenhuma escola válida encontrada. Verifique o mapeamento de INEP e Nome.");
      return;
    }

    // Ordenar por rota otimizada (nearest-neighbor) se houver coordenadas
    const comCoords = raw.filter(e => e.latitude && e.longitude).length;
    const escolasData = comCoords > 0 ? sortByRouteCoords(raw) : raw;
    if (comCoords > 0) {
      toast.success(`📍 Rota otimizada: ${comCoords} escolas ordenadas por proximidade GPS`, { duration: 4000 });
    }

    importarMut.mutate({ escolas: escolasData });
  };

  const reiniciar = () => {
    setEtapa("upload");
    setDados(null);
    setMapeamento({});
  };

  const inepMapeado = !!mapeamento.inep;
  const nomeMapeado = !!mapeamento.nome;
  const podeAvancar = inepMapeado && nomeMapeado;

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
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-blue-100 flex items-center justify-center">
              <Table2 className="w-5 h-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-sm">{dados.nomeArquivo}</p>
              <p className="text-xs text-muted-foreground">{dados.totalLinhas} linhas · {dados.headers.length} colunas detectadas</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={reiniciar}>
            <X className="w-4 h-4 mr-1" /> Trocar arquivo
          </Button>
        </div>

        {/* Status dos campos obrigatórios */}
        <div className={`rounded-lg border p-3 flex items-center gap-3 ${podeAvancar ? "border-green-200 bg-green-50" : "border-amber-200 bg-amber-50"}`}>
          {podeAvancar ? (
            <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          )}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium ${podeAvancar ? "text-green-800" : "text-amber-800"}`}>
              {podeAvancar
                ? "Campos obrigatórios mapeados — pronto para avançar!"
                : `Mapeie os campos obrigatórios: ${[!inepMapeado && "Código INEP", !nomeMapeado && "Nome da Escola"].filter(Boolean).join(" e ")}`
              }
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {camposMapeados.length} de {camposMapeados.length + camposNaoMapeados.length} campos mapeados
            </p>
          </div>
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
                  <span className="text-xs font-medium text-foreground flex items-center gap-1">
                    {CAMPOS_LABELS[campo]}
                    {CAMPOS_OBRIGATORIOS.includes(campo) && (
                      <span className="text-green-600 font-bold">✓</span>
                    )}
                  </span>
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
                Mapeie os campos restantes
                {camposNaoMapeados.some(c => CAMPOS_OBRIGATORIOS.includes(c)) && (
                  <span className="text-destructive ml-1">(obrigatórios marcados com *)</span>
                )}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {camposNaoMapeados.map(campo => (
                <div key={campo} className={`flex flex-col gap-1 ${CAMPOS_OBRIGATORIOS.includes(campo) ? "ring-1 ring-amber-300 rounded-lg p-2" : ""}`}>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1">
                    {CAMPOS_LABELS[campo]}
                    {CAMPOS_OBRIGATORIOS.includes(campo) && (
                      <span className="text-destructive font-bold">*</span>
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
                    <SelectTrigger className={`h-8 text-xs ${CAMPOS_OBRIGATORIOS.includes(campo) ? "border-amber-300" : ""}`}>
                      <SelectValue placeholder="Selecionar coluna da planilha..." />
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

        {/* Botões de ação */}
        <div className="flex gap-2 justify-between items-center pt-2 border-t">
          <Button variant="outline" onClick={reiniciar} size="sm">
            <RefreshCw className="w-4 h-4 mr-1" /> Recomeçar
          </Button>
          <Button
            onClick={confirmarMapeamento}
            size="sm"
            disabled={!podeAvancar}
            className={podeAvancar ? "bg-primary hover:bg-primary/90" : "opacity-60 cursor-not-allowed"}
            title={!podeAvancar ? "Mapeie INEP e Nome da Escola antes de avançar" : ""}
          >
            Avançar para pré-visualização
            <ChevronRight className="w-4 h-4 ml-1" />
          </Button>
        </div>

        {/* Dica quando não pode avançar */}
        {!podeAvancar && (
          <p className="text-xs text-center text-muted-foreground pb-1">
            💡 Selecione a coluna correspondente a{" "}
            {[!inepMapeado && <strong key="inep">Código INEP</strong>, !nomeMapeado && <strong key="nome">Nome da Escola</strong>].filter(Boolean).reduce((a: React.ReactNode[], b, i) => i === 0 ? [b] : [...a, " e ", b], [])}
            {" "}para habilitar o botão de avançar.
          </p>
        )}
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

        {totalValidas === 0 ? (
          <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
            <AlertCircle className="w-8 h-8 text-destructive mx-auto mb-2" />
            <p className="font-semibold text-destructive">Nenhuma escola válida encontrada</p>
            <p className="text-sm text-muted-foreground mt-1">
              Verifique se as colunas INEP e Nome estão mapeadas corretamente.
            </p>
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setEtapa("mapeamento")}>
              ← Voltar ao mapeamento
            </Button>
          </div>
        ) : (
          <>
            <div className="rounded-lg border overflow-auto max-h-64">
              <table className="w-full text-xs">
                <thead className="bg-muted sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">INEP</th>
                    <th className="px-3 py-2 text-left font-medium">Nome</th>
                    <th className="px-3 py-2 text-left font-medium">Município</th>
                    <th className="px-3 py-2 text-left font-medium">Telefone</th>
                    <th className="px-3 py-2 text-left font-medium">APs</th>
                    <th className="px-3 py-2 text-left font-medium">Velocidade</th>
                  </tr>
                </thead>
                <tbody>
                  {escolasPreview.map((e, i) => (
                    <tr key={i} className="border-t hover:bg-muted/30">
                      <td className="px-3 py-2 font-mono text-muted-foreground">{e.inep}</td>
                      <td className="px-3 py-2 font-medium max-w-[180px] truncate">{e.nome}</td>
                      <td className="px-3 py-2 text-muted-foreground">{e.municipio ?? "—"}</td>
                      <td className="px-3 py-2 text-muted-foreground">{e.telefone ?? "—"}</td>
                      <td className="px-3 py-2">{e.qtdAp ?? "—"}</td>
                      <td className="px-3 py-2">{e.velocidadeOfertada ? `${e.velocidadeOfertada} Mbps` : "—"}</td>
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
          </>
        )}
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
