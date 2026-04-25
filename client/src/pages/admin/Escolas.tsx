import AdminLayout from "@/components/AdminLayout";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useState, useRef, useEffect } from "react";
import { Upload, School, MapPin, Wifi, Search, FileSpreadsheet, Hash, Zap, Phone, CheckCircle, X } from "lucide-react";
import ImportacaoPlanilha from "@/components/ImportacaoPlanilha";
import { toast } from "sonner";

const statusLabel: Record<string, string> = {
  pendente: "Pendente",
  em_andamento: "Em andamento",
  concluido: "Concluído",
};
const statusClass: Record<string, string> = {
  pendente: "bg-amber-50 text-amber-700 border-amber-200",
  em_andamento: "bg-blue-50 text-blue-700 border-blue-200",
  concluido: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

export default function AdminEscolas() {
  const { data: escolas, isLoading, refetch } = trpc.escolas.list.useQuery({});
  const { data: tecnicos } = trpc.tecnicos.list.useQuery();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("todos");
  const [importDialogOpen, setImportDialogOpen] = useState(false);

  // Auto-preenchimento por INEP
  const [inepBusca, setInepBusca] = useState("");
  const [inepQuery, setInepQuery] = useState("");
  const inepTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { data: escolaInep, isFetching: buscandoInep } = trpc.escolas.getByInep.useQuery(
    { inep: inepQuery },
    { enabled: inepQuery.length >= 7, retry: false }
  );

  // Debounce: só busca após 600ms de pausa na digitação
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
  const pendentes = escolas?.filter(e => e.status !== "concluido").length ?? 0;

  return (
    <AdminLayout title="Gestão de Escolas">

      {/* Stats cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total de Escolas", value: escolas?.length ?? 0, icon: School, color: "text-primary", bg: "bg-primary/10" },
          { label: "Pendentes",        value: pendentes,            icon: Zap,    color: "text-amber-600", bg: "bg-amber-50" },
          { label: "Concluídas",       value: concluidas,           icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
          { label: "Total de APs",     value: totalAps,             icon: Wifi,   color: "text-blue-600",  bg: "bg-blue-50" },
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

      {/* Busca por INEP com auto-preenchimento */}
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

          {/* Resultado do auto-preenchimento */}
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
                      {escolaInep.telefone && (
                        <div className="flex items-center gap-1.5 mt-2 text-xs text-muted-foreground">
                          <Phone className="w-3 h-3" />
                          <span>{escolaInep.telefone}</span>
                        </div>
                      )}
                      {escolaInep.endereco && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
                          <MapPin className="w-3 h-3" />
                          <span>{escolaInep.endereco}</span>
                        </div>
                      )}
                      {getTecnicoNome(escolaInep.tecnicoId) && (
                        <div className="flex items-center gap-1.5 mt-1 text-xs text-primary font-medium">
                          <CheckCircle className="w-3 h-3" />
                          <span>Técnico: {getTecnicoNome(escolaInep.tecnicoId)}</span>
                        </div>
                      )}
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

      {/* Header com botão importar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <p className="text-muted-foreground text-sm">
          {filtered.length} escola(s)
          {escolas && escolas.length !== filtered.length && ` de ${escolas.length} total`}
        </p>
        <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2">
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
                refetch();
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
            <Button variant="outline" onClick={() => setImportDialogOpen(true)} className="gap-2">
              <Upload className="w-4 h-4" /> Importar Planilha
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-2">
          {filtered.map(escola => (
            <Card key={escola.id} className="hover:shadow-sm transition-shadow border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center flex-shrink-0">
                    <School className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <div>
                        <h3 className="font-semibold text-sm text-foreground">{escola.nome}</h3>
                        <p className="text-xs text-muted-foreground font-mono">INEP: {escola.inep}</p>
                      </div>
                      <Badge className={`text-xs border ${statusClass[escola.status]}`} variant="outline">
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
