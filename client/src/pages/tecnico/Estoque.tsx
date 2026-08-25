import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, ArrowLeft, Boxes, CircleAlert, Loader2, Minus, PackageCheck, Search, WifiOff } from "lucide-react";
import { toast } from "sonner";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { dbCacheEstoqueTecnico, dbGetCachedEstoqueTecnico } from "@/hooks/useOfflineDB";
import { trpc } from "@/lib/trpc";

function quantity(value: string | number | null | undefined) {
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 3 }).format(Number(value ?? 0));
}

export default function TecnicoEstoque() {
  const [, navigate] = useLocation();
  const online = useOnlineStatus();
  const tecnicoId = Number(localStorage.getItem("tecnico_id") || 0);
  const tenantId = Number(localStorage.getItem("tecnico_tenant_id") || 0);
  const [search, setSearch] = useState("");
  const [showOnlyLowStock, setShowOnlyLowStock] = useState(false);
  const [cachedItems, setCachedItems] = useState<Array<any> | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const utils = trpc.useUtils();
  const saldoQuery = trpc.estoque.saldos.meu.useQuery(undefined, { refetchInterval: online ? 90_000 : false });
  const consume = trpc.estoque.movimentacoes.consumir.useMutation({
    onSuccess: async () => {
      await utils.estoque.saldos.meu.invalidate();
      toast.success("Consumo registrado e saldo atualizado.");
      setSelectedId(null); setAmount(""); setNote("");
    },
    onError: (error) => toast.error(error.message),
  });
  const items = saldoQuery.data ?? cachedItems ?? [];
  useEffect(() => {
    if (saldoQuery.data && tenantId && tecnicoId) {
      dbCacheEstoqueTecnico(tenantId, tecnicoId, saldoQuery.data as unknown[]);
      setCachedItems(null);
    }
  }, [saldoQuery.data, tenantId, tecnicoId]);
  useEffect(() => {
    if (tenantId && tecnicoId) {
      dbGetCachedEstoqueTecnico(tenantId, tecnicoId).then(cached => {
        if (cached) setCachedItems(cached as Array<any>);
      });
    }
  }, [tenantId, tecnicoId]);
  const selected = items.find(item => item.materialId === selectedId);
  const lowCount = items.filter(item => Number(item.quantidade) <= Number(item.estoqueMinimo)).length;
  const filtered = useMemo(() => items.filter(item => {
    const correspondeBusca = `${item.codigo} ${item.nome} ${item.categoria ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const abaixoDoMinimo = Number(item.quantidade) <= Number(item.estoqueMinimo);
    return correspondeBusca && (!showOnlyLowStock || abaixoDoMinimo);
  }), [items, search, showOnlyLowStock]);

  function submitConsumption() {
    if (!selected || !amount || Number(amount) <= 0) return toast.error("Informe uma quantidade válida.");
    if (Number(amount) > Number(selected.quantidade)) return toast.error("A quantidade informada é maior que o saldo disponível.");
    if (!online) return toast.error("Conecte-se à internet para registrar o consumo. O saldo não será alterado sem confirmação do servidor.");
    consume.mutate({ materialId: selected.materialId, quantidade: Number(amount), observacao: note.trim() || undefined, clientId: crypto.randomUUID() });
  }

  return <div className="min-h-screen pb-28" style={{ background: "linear-gradient(160deg, #020817 0%, #071328 48%, #020817 100%)" }}>
    <header className="sticky top-0 z-30 px-4 pt-10 pb-4" style={{ background: "rgba(2,8,23,.88)", backdropFilter: "blur(18px)", borderBottom: "1px solid rgba(255,255,255,.06)" }}>
      <div className="mx-auto flex max-w-2xl items-center gap-3">
        <button onClick={() => navigate("/tecnico/perfil")} aria-label="Voltar ao perfil" className="grid h-10 w-10 place-items-center rounded-2xl" style={{ background: "rgba(255,255,255,.06)", border: "1px solid rgba(255,255,255,.08)" }}><ArrowLeft className="h-5 w-5 text-slate-200" /></button>
        <div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-400">Campo · Materiais</p><h1 className="truncate text-lg font-black text-white">Meu estoque</h1></div>
        <div className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold" style={{ background: online ? "rgba(16,185,129,.12)" : "rgba(245,158,11,.12)", color: online ? "#6ee7b7" : "#fcd34d" }}><span className="h-1.5 w-1.5 rounded-full" style={{ background: online ? "#34d399" : "#fbbf24" }} />{online ? "Sincronizado" : "Sem conexão"}</div>
      </div>
    </header>
    <main className="mx-auto max-w-2xl px-4 py-5 space-y-4">
      {!online && <div className="flex gap-3 rounded-2xl border p-4 text-sm" style={{ background: "rgba(245,158,11,.08)", borderColor: "rgba(245,158,11,.22)", color: "#fde68a" }}><WifiOff className="mt-0.5 h-5 w-5 shrink-0" /><p>Você pode consultar o último estoque sincronizado deste técnico. O consumo só é confirmado quando houver conexão; o saldo não é alterado sem validação do servidor.</p></div>}
      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-2xl p-4" style={{ background: "linear-gradient(135deg, rgba(6,182,212,.15), rgba(59,130,246,.08))", border: "1px solid rgba(34,211,238,.18)" }}><Boxes className="h-5 w-5 text-cyan-300" /><p className="mt-3 text-2xl font-black text-white">{items.length}</p><p className="text-xs font-medium text-slate-400">Itens sob minha responsabilidade</p></div>
        <button type="button" onClick={() => setShowOnlyLowStock(value => !value)} aria-pressed={showOnlyLowStock} className="rounded-2xl p-4 text-left focus:outline-none focus:ring-2 focus:ring-amber-300" style={{ background: lowCount ? "linear-gradient(135deg, rgba(245,158,11,.14), rgba(239,68,68,.06))" : "rgba(255,255,255,.035)", border: `1px solid ${lowCount ? "rgba(245,158,11,.24)" : "rgba(255,255,255,.07)"}` }}><AlertTriangle className={`h-5 w-5 ${lowCount ? "text-amber-300" : "text-slate-500"}`} /><p className="mt-3 text-2xl font-black text-white">{lowCount}</p><p className="text-xs font-medium text-slate-400">{showOnlyLowStock ? "Mostrando reposição" : "Itens para reposição"}</p></button>
      </section>
      <div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar material ou código" className="w-full rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white outline-none" style={{ background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.08)" }} /></div>
      {saldoQuery.isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-cyan-300" /></div> : saldoQuery.error ? <div className="rounded-2xl border p-5 text-center" style={{ borderColor: "rgba(239,68,68,.25)", background: "rgba(239,68,68,.07)" }}><CircleAlert className="mx-auto h-6 w-6 text-red-300" /><p className="mt-2 font-bold text-white">Não foi possível consultar o estoque</p><button onClick={() => saldoQuery.refetch()} className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white">Tentar novamente</button></div> : filtered.length === 0 ? <div className="rounded-3xl border p-10 text-center" style={{ borderColor: "rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)" }}><PackageCheck className="mx-auto h-10 w-10 text-slate-500" /><p className="mt-3 font-bold text-white">{showOnlyLowStock ? "Nenhum item precisa de reposição" : items.length ? "Nenhum material encontrado" : "Nenhum material atribuído"}</p><p className="mt-1 text-sm text-slate-400">{showOnlyLowStock ? "Todos os materiais disponíveis estão no nível mínimo ou acima dele." : items.length ? "Ajuste a busca para localizar outro item." : "Quando o gestor transferir materiais para você, eles aparecerão aqui."}</p>{showOnlyLowStock && <button onClick={() => setShowOnlyLowStock(false)} className="mt-4 rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100">Limpar filtro</button>}</div> : <div className="space-y-3">{filtered.map(item => { const current = Number(item.quantidade); const low = current <= Number(item.estoqueMinimo); return <article key={item.materialId} className="rounded-3xl border p-4" style={{ background: "rgba(255,255,255,.035)", borderColor: low ? "rgba(245,158,11,.28)" : "rgba(255,255,255,.08)" }}><div className="flex gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: low ? "rgba(245,158,11,.13)" : "rgba(34,211,238,.11)" }}><Boxes className={`h-5 w-5 ${low ? "text-amber-300" : "text-cyan-300"}`} /></div><div className="min-w-0 flex-1"><p className="truncate font-bold text-white">{item.nome}</p><p className="mt-0.5 text-xs text-slate-400">{item.codigo}{item.categoria ? ` · ${item.categoria}` : ""}</p></div><div className="text-right"><p className="text-lg font-black text-white">{quantity(current)}</p><p className="text-xs text-slate-400">{item.unidade}</p></div></div><div className="mt-4 flex items-center justify-between gap-3"><span className={low ? "rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-bold text-amber-200" : "rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-bold text-emerald-200"}>{low ? `Mínimo: ${quantity(item.estoqueMinimo)} ${item.unidade}` : "Saldo regular"}</span><button onClick={() => setSelectedId(item.materialId)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white active:scale-95" style={{ background: "linear-gradient(135deg, #0369a1, #0891b2)" }}><Minus className="h-3.5 w-3.5" /> Registrar uso</button></div></article>; })}</div>}
    </main>
    {selected && <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4" onClick={() => setSelectedId(null)}><div className="mx-auto w-full max-w-xl rounded-3xl p-5" onClick={e => e.stopPropagation()} style={{ background: "#0b1730", border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 -16px 48px rgba(0,0,0,.45)" }}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Registrar consumo</p><h2 className="mt-1 font-black text-white">{selected.nome}</h2><p className="mt-1 text-xs text-slate-400">Disponível: {quantity(selected.quantidade)} {selected.unidade}</p></div><button onClick={() => setSelectedId(null)} className="rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-slate-300">Fechar</button></div><div className="mt-5 space-y-3"><label className="block text-xs font-bold text-slate-300">Quantidade utilizada<input type="number" min="0.001" max={selected.quantidade} step="0.001" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1.5 w-full rounded-xl p-3 text-white outline-none" style={{ background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.1)" }} /></label><label className="block text-xs font-bold text-slate-300">Observação <span className="font-normal text-slate-500">(opcional)</span><input value={note} onChange={e => setNote(e.target.value)} placeholder="Ex.: substituição de conector" className="mt-1.5 w-full rounded-xl p-3 text-white outline-none" style={{ background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.1)" }} /></label><button disabled={consume.isPending || !online} onClick={submitConsumption} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg,#047857,#10b981)" }}>{consume.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}{online ? "Confirmar consumo" : "Aguardando conexão"}</button></div></div></div>}
    <TecnicoBottomNav />
  </div>;
}
