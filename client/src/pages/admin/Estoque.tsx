import { useMemo, useState } from "react";
import { Boxes, ClipboardCheck, ClipboardList, ArrowDownToLine, ArrowRightLeft, PackagePlus, Search, TriangleAlert, Warehouse, Wrench, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { toast } from "sonner";
import AdminLayoutTenant from "@/components/AdminLayoutTenant";
import { OperationState } from "@/components/OperationState";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useTenantAuth } from "@/hooks/useTenantAuth";
import { trpc } from "@/lib/trpc";

function formatQuantity(value: string | number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(Number(value ?? 0));
}

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
}

function StockDialog({ onCreate }: { onCreate: (data: { codigo: string; nome: string; categoria?: string; unidade: string; estoqueMinimo: number }) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [codigo, setCodigo] = useState("");
  const [nome, setNome] = useState("");
  const [categoria, setCategoria] = useState("");
  const [unidade, setUnidade] = useState("un");
  const [minimo, setMinimo] = useState("0");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!codigo.trim() || !nome.trim()) return toast.error("Informe o código e o nome do material.");
    setSaving(true);
    try {
      await onCreate({ codigo: codigo.trim(), nome: nome.trim(), categoria: categoria.trim() || undefined, unidade: unidade.trim() || "un", estoqueMinimo: Number(minimo || 0) });
      setOpen(false); setCodigo(""); setNome(""); setCategoria(""); setUnidade("un"); setMinimo("0");
    } finally { setSaving(false); }
  }

  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button className="gap-2"><PackagePlus className="h-4 w-4" /> Novo material</Button></DialogTrigger>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>Cadastrar material</DialogTitle><DialogDescription>O material ficará disponível somente para esta empresa.</DialogDescription></DialogHeader>
      <div className="grid gap-4 py-2 sm:grid-cols-2">
        <div className="grid gap-2"><Label htmlFor="codigo-material">Código</Label><Input id="codigo-material" value={codigo} onChange={e => setCodigo(e.target.value)} placeholder="Ex.: CAB-CAT6-305" /></div>
        <div className="grid gap-2"><Label htmlFor="unidade-material">Unidade</Label><Input id="unidade-material" value={unidade} onChange={e => setUnidade(e.target.value)} placeholder="un, m, caixa" /></div>
        <div className="grid gap-2 sm:col-span-2"><Label htmlFor="nome-material">Nome</Label><Input id="nome-material" value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex.: Cabo de rede CAT6" /></div>
        <div className="grid gap-2"><Label htmlFor="categoria-material">Categoria</Label><Input id="categoria-material" value={categoria} onChange={e => setCategoria(e.target.value)} placeholder="Ex.: Cabeamento" /></div>
        <div className="grid gap-2"><Label htmlFor="minimo-material">Estoque mínimo</Label><Input id="minimo-material" type="number" min="0" step="0.001" value={minimo} onChange={e => setMinimo(e.target.value)} /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={submit} disabled={saving}>{saving ? "Salvando..." : "Cadastrar material"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function MovementDialog({
  title, description, materials, technicians, action, children,
}: {
  title: string; description: string; materials: Array<{ id: number; nome: string; codigo: string }>; technicians?: Array<{ id: number; nome: string }>;
  action: (data: { materialId: number; quantidade: number; tecnicoId?: number; observacao?: string }) => Promise<void>; children?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [materialId, setMaterialId] = useState("");
  const [tecnicoId, setTecnicoId] = useState("");
  const [quantidade, setQuantidade] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit() {
    if (!materialId || !quantidade || Number(quantidade) <= 0) return toast.error("Selecione o material e informe uma quantidade válida.");
    if (technicians && !tecnicoId) return toast.error("Selecione o técnico responsável.");
    setSaving(true);
    try {
      await action({ materialId: Number(materialId), quantidade: Number(quantidade), tecnicoId: tecnicoId ? Number(tecnicoId) : undefined, observacao: observacao.trim() || undefined });
      setOpen(false); setMaterialId(""); setTecnicoId(""); setQuantidade(""); setObservacao("");
    } finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild>{children}</DialogTrigger>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
      <div className="grid gap-4 py-2">
        <div className="grid gap-2"><Label>Material</Label><Select value={materialId} onValueChange={setMaterialId}><SelectTrigger><SelectValue placeholder="Selecionar material" /></SelectTrigger><SelectContent>{materials.map(m => <SelectItem key={m.id} value={String(m.id)}>{m.codigo} — {m.nome}</SelectItem>)}</SelectContent></Select></div>
        {technicians && <div className="grid gap-2"><Label>Técnico destinatário</Label><Select value={tecnicoId} onValueChange={setTecnicoId}><SelectTrigger><SelectValue placeholder="Selecionar técnico" /></SelectTrigger><SelectContent>{technicians.map(t => <SelectItem key={t.id} value={String(t.id)}>{t.nome}</SelectItem>)}</SelectContent></Select></div>}
        <div className="grid gap-2"><Label>Quantidade</Label><Input type="number" min="0.001" step="0.001" value={quantidade} onChange={e => setQuantidade(e.target.value)} placeholder="0" /></div>
        <div className="grid gap-2"><Label>Observação <span className="text-muted-foreground">(opcional)</span></Label><Input value={observacao} onChange={e => setObservacao(e.target.value)} placeholder="Documento, motivo ou referência" /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={submit} disabled={saving}>{saving ? "Registrando..." : "Confirmar"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

function InventoryDialog({ materials, onAdjust }: { materials: Array<{ id: number; nome: string; codigo: string; unidade: string; saldo: number }>; onAdjust: (data: { materialId: number; quantidadeReal: number; observacao: string }) => Promise<void> }) {
  const [open, setOpen] = useState(false);
  const [materialId, setMaterialId] = useState("");
  const [quantidadeReal, setQuantidadeReal] = useState("");
  const [observacao, setObservacao] = useState("");
  const [saving, setSaving] = useState(false);
  const selected = materials.find(material => material.id === Number(materialId));
  function selecionarMaterial(value: string) {
    setMaterialId(value);
    const material = materials.find(item => item.id === Number(value));
    setQuantidadeReal(material ? String(material.saldo) : "");
  }
  async function submit() {
    if (!materialId || quantidadeReal === "" || Number(quantidadeReal) < 0) return toast.error("Selecione o material e informe o saldo físico contado.");
    if (observacao.trim().length < 3) return toast.error("Informe o motivo do ajuste para auditoria.");
    setSaving(true);
    try {
      await onAdjust({ materialId: Number(materialId), quantidadeReal: Number(quantidadeReal), observacao: observacao.trim() });
      setOpen(false); setMaterialId(""); setQuantidadeReal(""); setObservacao("");
    } finally { setSaving(false); }
  }
  return <Dialog open={open} onOpenChange={setOpen}>
    <DialogTrigger asChild><Button variant="outline" className="gap-2" disabled={materials.length === 0}><ClipboardCheck className="h-4 w-4" /> Ajustar inventário</Button></DialogTrigger>
    <DialogContent className="sm:max-w-lg">
      <DialogHeader><DialogTitle>Conferir inventário físico</DialogTitle><DialogDescription>Informe o saldo contado no almoxarifado. A diferença gera uma movimentação auditável, sem alterar materiais de outras empresas.</DialogDescription></DialogHeader>
      <div className="grid gap-4 py-2">
        <div className="grid gap-2"><Label>Material</Label><Select value={materialId} onValueChange={selecionarMaterial}><SelectTrigger><SelectValue placeholder="Selecionar material" /></SelectTrigger><SelectContent>{materials.map(material => <SelectItem key={material.id} value={String(material.id)}>{material.codigo} — {material.nome}</SelectItem>)}</SelectContent></Select></div>
        {selected && <p className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">Saldo registrado: <strong>{formatQuantity(selected.saldo)} {selected.unidade}</strong></p>}
        <div className="grid gap-2"><Label>Saldo físico contado</Label><Input type="number" min="0" step="0.001" value={quantidadeReal} onChange={event => setQuantidadeReal(event.target.value)} placeholder="0" /></div>
        <div className="grid gap-2"><Label>Motivo da conferência</Label><Input value={observacao} onChange={event => setObservacao(event.target.value)} placeholder="Ex.: contagem mensal do almoxarifado" /></div>
      </div>
      <DialogFooter><Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button><Button onClick={submit} disabled={saving}>{saving ? "Registrando..." : "Registrar ajuste"}</Button></DialogFooter>
    </DialogContent>
  </Dialog>;
}

export default function AdminEstoque() {
  const { admin } = useTenantAuth();
  const isViewer = admin?.role === "viewer";
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);
  const materialsQuery = trpc.estoque.materiais.list.useQuery();
  const saldosQuery = trpc.estoque.saldos.list.useQuery();
  const movimentosQuery = trpc.estoque.movimentacoes.list.useQuery();
  const tecnicosQuery = trpc.tecnicos.list.useQuery();
  const createMaterial = trpc.estoque.materiais.create.useMutation({ onSuccess: async () => { await utils.estoque.materiais.list.invalidate(); toast.success("Material cadastrado."); }, onError: error => toast.error(error.message) });
  const entrada = trpc.estoque.movimentacoes.entrada.useMutation({ onSuccess: async () => { await Promise.all([utils.estoque.saldos.list.invalidate(), utils.estoque.movimentacoes.list.invalidate()]); toast.success("Entrada registrada no almoxarifado."); }, onError: error => toast.error(error.message) });
  const transferir = trpc.estoque.movimentacoes.transferir.useMutation({ onSuccess: async () => { await Promise.all([utils.estoque.saldos.list.invalidate(), utils.estoque.movimentacoes.list.invalidate()]); toast.success("Material transferido para o técnico."); }, onError: error => toast.error(error.message) });
  const ajustar = trpc.estoque.movimentacoes.ajustar.useMutation({ onSuccess: async result => { await Promise.all([utils.estoque.saldos.list.invalidate(), utils.estoque.movimentacoes.list.invalidate()]); toast.success(`Inventário atualizado: ${result.diferenca > 0 ? "+" : ""}${formatQuantity(result.diferenca)} item(ns).`); }, onError: error => toast.error(error.message) });

  const materials = materialsQuery.data ?? [];
  const saldos = saldosQuery.data ?? [];
  const technicians = (tecnicosQuery.data ?? []).filter(t => t.ativo);
  const almoxarifado = new Map(saldos.filter(s => s.holderType === "almoxarifado").map(s => [s.materialId, Number(s.quantidade)]));
  const abaixoMinimo = materials.filter(m => (almoxarifado.get(m.id) ?? 0) < Number(m.estoqueMinimo));
  const inventoryMaterials = materials.map(material => ({ ...material, saldo: almoxarifado.get(material.id) ?? 0 }));
  const filteredMaterials = useMemo(() => materials.filter(m => {
    const correspondeBusca = `${m.codigo} ${m.nome} ${m.categoria ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const abaixoDoMinimo = (almoxarifado.get(m.id) ?? 0) < Number(m.estoqueMinimo);
    return correspondeBusca && (!showOnlyLowStock || abaixoDoMinimo);
  }), [materials, search, showOnlyLowStock, almoxarifado]);
  const actionDisabled = isViewer || materials.length === 0;

  function exportarEstoque() {
    const resumo = materials.map(material => {
      const atual = almoxarifado.get(material.id) ?? 0;
      const minimo = Number(material.estoqueMinimo);
      return {
        "Código": material.codigo,
        "Material": material.nome,
        "Categoria": material.categoria || "Sem categoria",
        "Unidade": material.unidade,
        "Saldo almoxarifado": atual,
        "Estoque mínimo": minimo,
        "Diferença para mínimo": atual - minimo,
        "Status": atual < minimo ? "Reposição" : "Regular",
      };
    });
    const porTecnico = saldos.filter(s => s.holderType === "tecnico").map(s => ({
      "Técnico": s.tecnicoNome || `Técnico #${s.holderId}`,
      "Código": s.codigo,
      "Material": s.nome,
      "Quantidade": Number(s.quantidade),
      "Unidade": s.unidade,
    }));
    const historico = (movimentosQuery.data ?? []).map(m => ({
      "Data": formatDate(m.createdAt),
      "Material": m.materialNome,
      "Código": m.materialCodigo,
      "Tipo": m.tipo,
      "Quantidade": Number(m.quantidade),
      "Referência": m.ordemServicoId ? `OS #${m.ordemServicoId}` : m.manutencaoId ? `Manutenção #${m.manutencaoId}` : m.observacao || "—",
    }));
    const workbook = XLSX.utils.book_new();
    const addSheet = (name: string, rows: Record<string, unknown>[], widths: number[]) => {
      const sheet = XLSX.utils.json_to_sheet(rows.length ? rows : [{ "Sem dados": "Nenhum registro no período" }]);
      sheet["!autofilter"] = { ref: sheet["!ref"] || "A1" };
      sheet["!cols"] = widths.map(wch => ({ wch }));
      XLSX.utils.book_append_sheet(workbook, sheet, name);
    };
    addSheet("Resumo de estoque", resumo, [16, 32, 20, 12, 20, 18, 22, 14]);
    addSheet("Materiais por técnico", porTecnico, [28, 16, 32, 14, 12]);
    addSheet("Movimentações", historico, [20, 32, 16, 16, 14, 34]);
    XLSX.writeFile(workbook, `netvius-estoque-${new Date().toISOString().slice(0, 10)}.xlsx`);
    toast.success("Planilha de estoque exportada.");
  }

  if (materialsQuery.isLoading || saldosQuery.isLoading) return <AdminLayoutTenant title="Estoque" subtitle="Materiais e movimentações por empresa"><OperationState kind="loading" title="Carregando estoque" description="Consultando catálogo e saldos da empresa." /></AdminLayoutTenant>;
  if (materialsQuery.error || saldosQuery.error) return <AdminLayoutTenant title="Estoque" subtitle="Materiais e movimentações por empresa"><OperationState kind="error" title="Não foi possível carregar o estoque" description="Confira sua conexão e tente novamente." actionLabel="Tentar novamente" onAction={() => { materialsQuery.refetch(); saldosQuery.refetch(); }} /></AdminLayoutTenant>;

  return <AdminLayoutTenant title="Estoque" subtitle="Controle materiais, almoxarifado e itens em posse dos técnicos" actions={<div className="flex flex-wrap gap-2"><Button variant="outline" className="gap-2" onClick={exportarEstoque} disabled={materials.length === 0}><FileSpreadsheet className="h-4 w-4" /> Exportar XLSX</Button>{!isViewer && <><InventoryDialog materials={inventoryMaterials} onAdjust={async data => { await ajustar.mutateAsync(data); }} /><MovementDialog title="Registrar entrada" description="A entrada é adicionada ao almoxarifado desta empresa." materials={materials} action={async data => { await entrada.mutateAsync({ materialId: data.materialId, quantidade: data.quantidade, observacao: data.observacao }); }}><Button variant="outline" className="gap-2" disabled={actionDisabled}><ArrowDownToLine className="h-4 w-4" /> Registrar entrada</Button></MovementDialog><StockDialog onCreate={async data => { await createMaterial.mutateAsync(data); }} /></>}</div>}>
    {isViewer && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">Perfil visualizador: você pode consultar o estoque, mas não pode cadastrar nem movimentar materiais.</div>}
    <div className="grid gap-4 md:grid-cols-4 mb-6">
      <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Materiais ativos</p><p className="mt-1 text-3xl font-bold">{materials.filter(m => m.ativo).length}</p></CardContent></Card>
      <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Técnicos com saldo</p><p className="mt-1 text-3xl font-bold">{new Set(saldos.filter(s => s.holderType === "tecnico").map(s => s.holderId)).size}</p></CardContent></Card>
      <button type="button" onClick={() => setShowOnlyLowStock(value => !value)} aria-pressed={showOnlyLowStock} className="text-left rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-400 focus:ring-offset-2"><Card className={abaixoMinimo.length ? "border-amber-300 bg-amber-50/60" : ""}><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Abaixo do mínimo</p><p className="mt-1 text-3xl font-bold">{abaixoMinimo.length}</p><p className="mt-1 text-xs text-amber-800">{showOnlyLowStock ? "Mostrando itens críticos" : "Clique para filtrar"}</p></CardContent></Card></button>
      <Card><CardContent className="pt-5"><p className="text-sm text-muted-foreground">Movimentações recentes</p><p className="mt-1 text-3xl font-bold">{movimentosQuery.data?.length ?? 0}</p></CardContent></Card>
    </div>

    {abaixoMinimo.length > 0 && <div className="mb-6 flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950"><TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" /><div className="flex-1"><strong>Reposição recomendada.</strong> {abaixoMinimo.map(m => m.nome).join(", ")} está abaixo do estoque mínimo definido.</div><Button type="button" size="sm" variant="outline" className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100" onClick={() => setShowOnlyLowStock(true)}>Ver itens</Button></div>}

    <Tabs defaultValue="catalogo" className="space-y-5">
      <TabsList><TabsTrigger value="catalogo" className="gap-2"><Boxes className="h-4 w-4" /> Catálogo e almoxarifado</TabsTrigger><TabsTrigger value="tecnicos" className="gap-2"><Wrench className="h-4 w-4" /> Por técnico</TabsTrigger><TabsTrigger value="historico" className="gap-2"><ClipboardList className="h-4 w-4" /> Histórico</TabsTrigger></TabsList>
      <TabsContent value="catalogo" className="space-y-4">
        <Card><CardHeader className="gap-4 sm:flex-row sm:items-center sm:justify-between"><CardTitle className="text-lg">Materiais cadastrados</CardTitle><div className="relative w-full sm:w-80"><Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" /><Input value={search} onChange={e => setSearch(e.target.value)} className="pl-9" placeholder="Buscar por código ou nome" /></div></CardHeader><CardContent className="p-0">
          {filteredMaterials.length === 0 ? <OperationState kind="empty" title={showOnlyLowStock ? "Nenhum item crítico" : materials.length ? "Nenhum material encontrado" : "Nenhum material cadastrado"} description={showOnlyLowStock ? "Todos os materiais do almoxarifado estão no nível mínimo ou acima dele." : materials.length ? "Ajuste sua busca para encontrar outro item." : "Cadastre o primeiro material para iniciar o controle de estoque."} actionLabel={showOnlyLowStock ? "Limpar filtro" : undefined} onAction={showOnlyLowStock ? () => setShowOnlyLowStock(false) : undefined} /> : <div className="overflow-x-auto"><table className="w-full min-w-[740px] text-sm"><thead className="border-y bg-muted/40 text-left text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Material</th><th className="px-4 py-3 font-medium">Categoria</th><th className="px-4 py-3 font-medium">Almoxarifado</th><th className="px-4 py-3 font-medium">Mínimo</th><th className="px-4 py-3 font-medium">Status</th><th className="px-5 py-3 font-medium text-right">Ação</th></tr></thead><tbody>{filteredMaterials.map(material => { const atual = almoxarifado.get(material.id) ?? 0; const minimo = Number(material.estoqueMinimo); const baixo = atual < minimo; return <tr key={material.id} className="border-b last:border-0"><td className="px-5 py-4"><p className="font-semibold">{material.nome}</p><p className="text-xs text-muted-foreground">{material.codigo} · {material.unidade}</p></td><td className="px-4 py-4 text-muted-foreground">{material.categoria || "Sem categoria"}</td><td className="px-4 py-4 font-semibold">{formatQuantity(atual)} {material.unidade}</td><td className="px-4 py-4">{formatQuantity(minimo)} {material.unidade}</td><td className="px-4 py-4"><span className={baixo ? "rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-800" : "rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-800"}>{baixo ? "Reposição" : "Regular"}</span></td><td className="px-5 py-4 text-right">{!isViewer && <MovementDialog title="Transferir para técnico" description="O saldo será debitado do almoxarifado e creditado ao técnico selecionado." materials={[material]} technicians={technicians} action={async data => { await transferir.mutateAsync({ materialId: data.materialId, tecnicoId: data.tecnicoId!, quantidade: data.quantidade, observacao: data.observacao }); }}><Button variant="ghost" size="sm" className="gap-2"><ArrowRightLeft className="h-4 w-4" /> Transferir</Button></MovementDialog>}</td></tr>; })}</tbody></table></div>}
        </CardContent></Card>
      </TabsContent>
      <TabsContent value="tecnicos"><Card><CardHeader><CardTitle className="text-lg">Materiais em posse dos técnicos</CardTitle></CardHeader><CardContent className="p-0">{saldos.filter(s => s.holderType === "tecnico").length === 0 ? <OperationState kind="empty" title="Nenhum material transferido" description="Registre uma transferência do almoxarifado para acompanhar os itens de cada técnico." /> : <div className="overflow-x-auto"><table className="w-full min-w-[650px] text-sm"><thead className="border-y bg-muted/40 text-left text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Técnico</th><th className="px-4 py-3 font-medium">Material</th><th className="px-4 py-3 font-medium">Quantidade</th><th className="px-5 py-3 font-medium">Atualizado</th></tr></thead><tbody>{saldos.filter(s => s.holderType === "tecnico").map(s => <tr key={s.saldoId} className="border-b last:border-0"><td className="px-5 py-4 font-medium">{s.tecnicoNome || `Técnico #${s.holderId}`}</td><td className="px-4 py-4"><p className="font-medium">{s.nome}</p><p className="text-xs text-muted-foreground">{s.codigo}</p></td><td className="px-4 py-4 font-semibold">{formatQuantity(s.quantidade)} {s.unidade}</td><td className="px-5 py-4 text-muted-foreground">—</td></tr>)}</tbody></table></div>}</CardContent></Card></TabsContent>
      <TabsContent value="historico"><Card><CardHeader><CardTitle className="text-lg">Movimentações recentes</CardTitle></CardHeader><CardContent className="p-0">{movimentosQuery.isLoading ? <OperationState kind="loading" title="Carregando movimentações" /> : (movimentosQuery.data?.length ?? 0) === 0 ? <OperationState kind="empty" title="Nenhuma movimentação registrada" description="Entradas, transferências e consumos aparecerão aqui com rastreabilidade." /> : <div className="overflow-x-auto"><table className="w-full min-w-[760px] text-sm"><thead className="border-y bg-muted/40 text-left text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Data</th><th className="px-4 py-3 font-medium">Material</th><th className="px-4 py-3 font-medium">Tipo</th><th className="px-4 py-3 font-medium">Quantidade</th><th className="px-5 py-3 font-medium">Referência</th></tr></thead><tbody>{movimentosQuery.data?.map(m => <tr key={m.id} className="border-b last:border-0"><td className="px-5 py-4 text-muted-foreground">{formatDate(m.createdAt)}</td><td className="px-4 py-4"><p className="font-medium">{m.materialNome}</p><p className="text-xs text-muted-foreground">{m.materialCodigo}</p></td><td className="px-4 py-4 capitalize">{m.tipo}</td><td className="px-4 py-4 font-semibold">{formatQuantity(m.quantidade)}</td><td className="px-5 py-4 text-muted-foreground">{m.ordemServicoId ? `OS #${m.ordemServicoId}` : m.manutencaoId ? `Manutenção #${m.manutencaoId}` : m.observacao || "—"}</td></tr>)}</tbody></table></div>}</CardContent></Card></TabsContent>
    </Tabs>
  </AdminLayoutTenant>;
}
