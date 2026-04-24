import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState } from "react";
import { Upload, School, MapPin, Wifi, Search, FileSpreadsheet } from "lucide-react";
import ImportacaoPlanilha from "@/components/ImportacaoPlanilha";

const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};
const statusClass: Record<string, string> = {
  pendente: "bg-yellow-100 text-yellow-800 border-yellow-200",
  em_andamento: "bg-blue-100 text-blue-800 border-blue-200",
  concluido: "bg-green-100 text-green-800 border-green-200",
};

export default function AdminEscolas() {
  const { data: escolas, isLoading } = trpc.escolas.list.useQuery({});
  const { data: tecnicos } = trpc.tecnicos.list.useQuery();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  const filtered = escolas?.filter(e => {
    const matchSearch =
      e.nome.toLowerCase().includes(search.toLowerCase()) ||
      e.municipio?.toLowerCase().includes(search.toLowerCase()) ||
      e.inep?.includes(search);
    const matchStatus = statusFilter === "todos" || e.status === statusFilter;
    return matchSearch && matchStatus;
  }) ?? [];

  function getTecnicoNome(id: number | null | undefined) {
    if (!id) return null;
    return tecnicos?.find(t => t.id === id)?.nome ?? null;
  }

  return (
    <AdminLayout title="Gestão de Escolas">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
        <p className="text-muted-foreground text-sm">
          {filtered.length} escola(s) encontrada(s)
          {escolas && escolas.length !== filtered.length && ` de ${escolas.length} total`}
        </p>
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Upload className="w-4 h-4" />
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
                setTimeout(() => setImportDialogOpen(false), 2000);
              }}
            />
          </DialogContent>
        </Dialog>
      </div>

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
          {["todos", "pendente", "em_andamento", "concluido"].map(s => (
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
            <Button
              variant="outline"
              onClick={() => setImportDialogOpen(true)}
              className="gap-2"
            >
              <Upload className="w-4 h-4" /> Importar Planilha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(escola => (
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
                      <Badge
                        className={`text-xs border ${statusClass[escola.status]}`}
                        variant="outline"
                      >
                        {statusLabel[escola.status]}
                      </Badge>
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
                          {escola.velocidadeOfertada ? ` — ${escola.velocidadeOfertada} Mbps` : ""}
                        </span>
                      )}
                      {escola.qtdAp != null && (
                        <span>{escola.qtdAp} AP(s)</span>
                      )}
                      {getTecnicoNome(escola.tecnicoId) && (
                        <span className="text-primary font-medium">
                          Técnico: {getTecnicoNome(escola.tecnicoId)}
                        </span>
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
