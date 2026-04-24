import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useState, useRef } from "react";
import { Upload, School, MapPin, Wifi, Search, Filter } from "lucide-react";
import * as XLSX from "xlsx";

const statusLabel: Record<string, string> = { pendente: "Pendente", em_andamento: "Em andamento", concluido: "Concluído" };
const statusClass: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
  em_andamento: "bg-blue-100 text-blue-800 border-blue-200",
  concluido: "bg-green-100 text-green-800 border-green-200",
};

export default function AdminEscolas() {
  const utils = trpc.useUtils();
  const { data: escolas, isLoading } = trpc.escolas.list.useQuery({});
  const { data: tecnicos } = trpc.tecnicos.list.useQuery();
  const importarMut = trpc.escolas.importar.useMutation({
    onSuccess: (r) => { toast.success(`${r.importadas} escola(s) importada(s)!`); utils.escolas.list.invalidate(); },
    onError: (e) => toast.error(e.message),
  });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = escolas?.filter(e => {
    const matchSearch = e.nome.toLowerCase().includes(search.toLowerCase()) || e.municipio?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "todos" || e.status === statusFilter;
    return matchSearch && matchStatus;
  }) ?? [];

  function getTecnicoNome(id: number | null | undefined) {
    if (!id) return null;
    return tecnicos?.find(t => t.id === id)?.nome ?? null;
  }

  async function handleFileImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buffer = await file.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws);

      const escolasData = rows.map((row) => ({
        inep: String(row["Código INEP"] ?? row["INEP"] ?? row["inep"] ?? ""),
        uf: String(row["UF"] ?? row["uf"] ?? ""),
        municipio: String(row["Município"] ?? row["Municipio"] ?? row["municipio"] ?? ""),
        nome: String(row["Nome da Escola"] ?? row["Nome"] ?? row["nome"] ?? ""),
        endereco: String(row["Endereço"] ?? row["Endereco"] ?? row["endereco"] ?? ""),
        latitude: row["Latitude"] != null ? String(row["Latitude"]) : undefined,
        longitude: row["Longitude"] != null ? String(row["Longitude"]) : undefined,
        qtdAp: Number(row["Kit Wi-Fi(estimado)"] ?? row["AP adicional(estimado)"] ?? row["qtdAp"] ?? 1),
        telefone: row["TELEFONE"] != null ? String(row["TELEFONE"]) : undefined,
        velocidadeMinima: row["Velocidade DL Mínima (Mbps)"] != null ? Number(row["Velocidade DL Mínima (Mbps)"]) : undefined,
        velocidadeOfertada: row["Velocidade DL Ofertada (Mbps)"] != null ? Number(row["Velocidade DL Ofertada (Mbps)"]) : undefined,
        tipoConexao: String(row["Solução proposta"] ?? row["Tipo de conexão"] ?? row["tipoConexao"] ?? "Fibra"),
      })).filter(e => e.inep && e.nome);

      if (escolasData.length === 0) { toast.error("Nenhuma escola válida encontrada na planilha"); return; }
      importarMut.mutate({ escolas: escolasData });
    } catch {
      toast.error("Erro ao ler planilha. Verifique o formato do arquivo.");
    }
    if (fileRef.current) fileRef.current.value = "";
  }

  return (
    <AdminLayout title="Gestão de Escolas">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <p className="text-muted-foreground text-sm">{filtered.length} escola(s) encontrada(s)</p>
        <div className="flex gap-2">
          <input ref={fileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFileImport} />
          <Button variant="outline" onClick={() => fileRef.current?.click()} disabled={importarMut.isPending}>
            <Upload className="w-4 h-4 mr-2" />
            {importarMut.isPending ? "Importando..." : "Importar Planilha"}
          </Button>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar por nome ou município..." value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {["todos", "pendente", "em_andamento", "concluido"].map(s => (
            <Button
              key={s}
              variant={statusFilter === s ? "default" : "outline"}
              size="sm"
              onClick={() => setStatusFilter(s)}
              className={statusFilter === s ? "" : ""}
            >
              {s === "todos" ? "Todos" : statusLabel[s]}
            </Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1,2,3,4,5].map(i => <div key={i} className="h-20 bg-muted rounded-xl animate-pulse" />)}
        </div>
      ) : filtered.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <School className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground mb-1">Nenhuma escola encontrada.</p>
            <p className="text-sm text-muted-foreground">Importe uma planilha Excel ou CSV para começar.</p>
            <Button className="mt-4" variant="outline" onClick={() => fileRef.current?.click()}>
              <Upload className="w-4 h-4 mr-2" />Importar Planilha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((escola) => (
            <Card key={escola.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center flex-shrink-0">
                    <School className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h3 className="font-semibold text-sm text-foreground">{escola.nome}</h3>
                        <p className="text-xs text-muted-foreground">INEP: {escola.inep}</p>
                      </div>
                      <Badge className={`text-xs border ${statusClass[escola.status]}`} variant="outline">
                        {statusLabel[escola.status]}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-xs text-muted-foreground">
                      {escola.municipio && (
                        <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{escola.municipio}, {escola.uf}</span>
                      )}
                      <span className="flex items-center gap-1"><Wifi className="w-3 h-3" />{escola.tipoConexao} — {escola.velocidadeOfertada}Mbps</span>
                      <span>{escola.qtdAp} AP(s)</span>
                      {getTecnicoNome(escola.tecnicoId) && (
                        <span className="text-primary font-medium">Técnico: {getTecnicoNome(escola.tecnicoId)}</span>
                      )}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AdminLayout>
  );
}
