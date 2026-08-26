import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, ArrowLeft, Boxes, CircleAlert, Loader2, Minus, PackageCheck, Search, Send, WifiOff } from "lucide-react";
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
  const [filtroSaldo, setFiltroSaldo] = useState<"todos" | "esgotados" | "reposicao" | "regular">("todos");
  const [cachedItems, setCachedItems] = useState<Array<any> | null>(null);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [requestMaterialId, setRequestMaterialId] = useState<number | null>(null);
  const [requestAmount, setRequestAmount] = useState("");
  const [requestNote, setRequestNote] = useState("");
  const utils = trpc.useUtils();
  const saldoQuery = trpc.estoque.saldos.meu.useQuery(undefined, { refetchInterval: online ? 90_000 : false });
  const requestsQuery = trpc.estoque.solicitacoes.minhas.useQuery(undefined, { enabled: !!tecnicoId });
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
  const requestMaterial = items.find(item => item.materialId === requestMaterialId);
  const lowCount = items.filter(item => Number(item.quantidade) <= Number(item.estoqueMinimo)).length;
  const zeroCount = items.filter(item => Number(item.quantidade) <= 0).length;
  const openRequests = (requestsQuery.data ?? []).filter((solicitacao) => solicitacao.status === "aberta" || solicitacao.status === "em_analise");
  const attendedRequests = (requestsQuery.data ?? []).filter((solicitacao) => solicitacao.status === "atendida" && solicitacao.atendimentoMovimentacaoId);
  const requestReplenishment = trpc.estoque.solicitacoes.criar.useMutation({
    onSuccess: async () => {
      await requestsQuery.refetch();
      toast.success("Solicitação enviada ao responsável pelo estoque.");
      setRequestMaterialId(null); setRequestAmount(""); setRequestNote("");
    },
    onError: (error) => toast.error(error.message),
  });
  const filtered = useMemo(() => items.filter(item => {
    const correspondeBusca = `${item.codigo} ${item.nome} ${item.categoria ?? ""}`.toLowerCase().includes(search.toLowerCase());
    const quantidadeAtual = Number(item.quantidade);
    const abaixoDoMinimo = quantidadeAtual <= Number(item.estoqueMinimo);
    const correspondeSaldo = filtroSaldo === "todos"
      || (filtroSaldo === "esgotados" && quantidadeAtual <= 0)
      || (filtroSaldo === "reposicao" && abaixoDoMinimo)
      || (filtroSaldo === "regular" && quantidadeAtual > Number(item.estoqueMinimo));
    return correspondeBusca && correspondeSaldo;
  }), [items, search, filtroSaldo]);

  function submitConsumption() {
    if (!selected || !amount || Number(amount) <= 0) return toast.error("Informe uma quantidade válida.");
    if (Number(amount) > Number(selected.quantidade)) return toast.error("A quantidade informada é maior que o saldo disponível.");
    if (!online) return toast.error("Conecte-se à internet para registrar o consumo. O saldo não será alterado sem confirmação do servidor.");
    consume.mutate({ materialId: selected.materialId, quantidade: Number(amount), observacao: note.trim() || undefined, clientId: crypto.randomUUID() });
  }
  function submitRequest() {
    if (!requestMaterial || !requestAmount || Number(requestAmount) <= 0) return toast.error("Informe uma quantidade válida para reposição.");
    requestReplenishment.mutate({ materialId: requestMaterial.materialId, quantidadeSolicitada: Number(requestAmount), observacao: requestNote.trim() || undefined });
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
        <button type="button" onClick={() => setFiltroSaldo(value => value === "reposicao" ? "todos" : "reposicao")} aria-pressed={filtroSaldo === "reposicao"} className="rounded-2xl p-4 text-left focus:outline-none focus:ring-2 focus:ring-amber-300" style={{ background: lowCount ? "linear-gradient(135deg, rgba(245,158,11,.14), rgba(239,68,68,.06))" : "rgba(255,255,255,.035)", border: `1px solid ${lowCount ? "rgba(245,158,11,.24)" : "rgba(255,255,255,.07)"}` }}><AlertTriangle className={`h-5 w-5 ${lowCount ? "text-amber-300" : "text-slate-500"}`} /><p className="mt-3 text-2xl font-black text-white">{lowCount}</p><p className="text-xs font-medium text-slate-400">{filtroSaldo === "reposicao" ? "Mostrando reposição" : "Itens para reposição"}</p></button>
      </section>
      {openRequests.length > 0 && <div className="flex items-center justify-between gap-3 rounded-2xl border p-3.5" style={{ background: "rgba(99,102,241,.09)", borderColor: "rgba(129,140,248,.22)" }}><div><p className="text-sm font-bold text-indigo-100">{openRequests.length} solicitação{openRequests.length !== 1 ? "ões" : ""} em acompanhamento</p><p className="mt-0.5 text-xs text-indigo-200/70">O estoque da empresa recebe e analisa seus pedidos.</p></div><Send className="h-5 w-5 shrink-0 text-indigo-300" /></div>}
      {attendedRequests.length > 0 && <div className="rounded-2xl border p-3.5" style={{ background: "rgba(16,185,129,.08)", borderColor: "rgba(52,211,153,.2)" }}><p className="text-sm font-bold text-emerald-100">{attendedRequests.length} reposição{attendedRequests.length !== 1 ? "ões atendidas" : " atendida"}</p><p className="mt-0.5 text-xs text-emerald-200/70">A entrega foi registrada por transferência do almoxarifado{attendedRequests[0]?.atendimentoMovimentacaoId ? ` #${attendedRequests[0].atendimentoMovimentacaoId}` : ""}.</p></div>}
      <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]"><div className="flex min-w-max gap-2 pr-4">{([
        { value: "todos", label: "Todos", count: items.length, color: "#cbd5e1" },
        { value: "esgotados", label: "Esgotados", count: zeroCount, color: "#f87171" },
        { value: "reposicao", label: "Reposição", count: lowCount, color: "#fbbf24" },
        { value: "regular", label: "Saldo regular", count: Math.max(0, items.length - lowCount), color: "#6ee7b7" },
      ] as const).map((filtro) => { const ativo = filtroSaldo === filtro.value; return <button key={filtro.value} onClick={() => setFiltroSaldo(filtro.value)} className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition-all active:scale-95" style={{ color: ativo ? "#020817" : filtro.color, background: ativo ? filtro.color : `${filtro.color}10`, border: `1px solid ${ativo ? filtro.color : `${filtro.color}35`}` }}>{filtro.label}<span className="rounded-full px-1.5 py-0.5 text-[10px]" style={{ background: ativo ? "rgba(2,8,23,.14)" : `${filtro.color}18` }}>{filtro.count}</span></button>; })}</div></div>
      <div className="relative"><Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar material ou código" className="w-full rounded-2xl py-3.5 pl-11 pr-4 text-sm text-white outline-none" style={{ background: "rgba(255,255,255,.045)", border: "1px solid rgba(255,255,255,.08)" }} /></div>
      {saldoQuery.isLoading ? <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-cyan-300" /></div> : saldoQuery.error ? <div className="rounded-2xl border p-5 text-center" style={{ borderColor: "rgba(239,68,68,.25)", background: "rgba(239,68,68,.07)" }}><CircleAlert className="mx-auto h-6 w-6 text-red-300" /><p className="mt-2 font-bold text-white">Não foi possível consultar o estoque</p><button onClick={() => saldoQuery.refetch()} className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white">Tentar novamente</button></div> : filtered.length === 0 ? <div className="rounded-3xl border p-10 text-center" style={{ borderColor: "rgba(255,255,255,.08)", background: "rgba(255,255,255,.025)" }}><PackageCheck className="mx-auto h-10 w-10 text-slate-500" /><p className="mt-3 font-bold text-white">{filtroSaldo === "reposicao" ? "Nenhum item precisa de reposição" : filtroSaldo === "esgotados" ? "Nenhum item está esgotado" : filtroSaldo === "regular" ? "Nenhum item com saldo regular" : items.length ? "Nenhum material encontrado" : "Nenhum material atribuído"}</p><p className="mt-1 text-sm text-slate-400">{filtroSaldo !== "todos" ? "Altere o filtro para consultar os demais materiais." : items.length ? "Ajuste a busca para localizar outro item." : "Quando o gestor transferir materiais para você, eles aparecerão aqui."}</p>{filtroSaldo !== "todos" && <button onClick={() => setFiltroSaldo("todos")} className="mt-4 rounded-xl border border-cyan-300/30 bg-cyan-400/10 px-3 py-2 text-xs font-bold text-cyan-100">Limpar filtro</button>}</div> : <div className="space-y-3">{filtered.map(item => { const current = Number(item.quantidade); const low = current <= Number(item.estoqueMinimo); return <article key={item.materialId} className="rounded-3xl border p-4" style={{ background: "rgba(255,255,255,.035)", borderColor: low ? "rgba(245,158,11,.28)" : "rgba(255,255,255,.08)" }}><div className="flex gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl" style={{ background: low ? "rgba(245,158,11,.13)" : "rgba(34,211,238,.11)" }}><Boxes className={`h-5 w-5 ${low ? "text-amber-300" : "text-cyan-300"}`} /></div><div className="min-w-0 flex-1"><p className="truncate font-bold text-white">{item.nome}</p><p className="mt-0.5 text-xs text-slate-400">{item.codigo}{item.categoria ? ` · ${item.categoria}` : ""}</p></div><div className="text-right"><p className="text-lg font-black text-white">{quantity(current)}</p><p className="text-xs text-slate-400">{item.unidade}</p></div></div><div className="mt-4 flex flex-wrap items-center justify-between gap-2"><span className={low ? "rounded-full bg-amber-400/10 px-2.5 py-1 text-[11px] font-bold text-amber-200" : "rounded-full bg-emerald-400/10 px-2.5 py-1 text-[11px] font-bold text-emerald-200"}>{low ? `Mínimo: ${quantity(item.estoqueMinimo)} ${item.unidade}` : "Saldo regular"}</span><div className="flex gap-2"><button onClick={() => setSelectedId(item.materialId)} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-white active:scale-95" style={{ background: "linear-gradient(135deg, #0369a1, #0891b2)" }}><Minus className="h-3.5 w-3.5" /> Registrar uso</button>{low && <button onClick={() => { setRequestMaterialId(item.materialId); setRequestAmount(""); setRequestNote(""); }} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-amber-100 active:scale-95" style={{ background: "rgba(245,158,11,.14)", border: "1px solid rgba(245,158,11,.28)" }}><Send className="h-3.5 w-3.5" /> Solicitar</button>}</div></div></article>; })}</div>}
    </main>
    {selected && <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4" onClick={() => setSelectedId(null)}><div className="mx-auto w-full max-w-xl rounded-3xl p-5" onClick={e => e.stopPropagation()} style={{ background: "#0b1730", border: "1px solid rgba(255,255,255,.1)", boxShadow: "0 -16px 48px rgba(0,0,0,.45)" }}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-cyan-300">Registrar consumo</p><h2 className="mt-1 font-black text-white">{selected.nome}</h2><p className="mt-1 text-xs text-slate-400">Disponível: {quantity(selected.quantidade)} {selected.unidade}</p></div><button onClick={() => setSelectedId(null)} className="rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-slate-300">Fechar</button></div><div className="mt-5 space-y-3"><label className="block text-xs font-bold text-slate-300">Quantidade utilizada<input type="number" min="0.001" max={selected.quantidade} step="0.001" value={amount} onChange={e => setAmount(e.target.value)} className="mt-1.5 w-full rounded-xl p-3 text-white outline-none" style={{ background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.1)" }} /></label><label className="block text-xs font-bold text-slate-300">Observação <span className="font-normal text-slate-500">(opcional)</span><input value={note} onChange={e => setNote(e.target.value)} placeholder="Ex.: substituição de conector" className="mt-1.5 w-full rounded-xl p-3 text-white outline-none" style={{ background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.1)" }} /></label><button disabled={consume.isPending || !online} onClick={submitConsumption} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg,#047857,#10b981)" }}>{consume.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <PackageCheck className="h-4 w-4" />}{online ? "Confirmar consumo" : "Aguardando conexão"}</button></div></div></div>}
    {requestMaterial && <div className="fixed inset-0 z-50 flex items-end bg-black/70 p-4" onClick={() => setRequestMaterialId(null)}><div className="mx-auto w-full max-w-xl rounded-3xl p-5" onClick={e => e.stopPropagation()} style={{ background: "#101333", border: "1px solid rgba(129,140,248,.28)", boxShadow: "0 -16px 48px rgba(0,0,0,.45)" }}><div className="flex items-start justify-between gap-3"><div><p className="text-xs font-bold uppercase tracking-wider text-indigo-300">Solicitar reposição</p><h2 className="mt-1 font-black text-white">{requestMaterial.nome}</h2><p className="mt-1 text-xs text-slate-400">Saldo atual: {quantity(requestMaterial.quantidade)} {requestMaterial.unidade}</p></div><button onClick={() => setRequestMaterialId(null)} className="rounded-xl bg-white/5 px-3 py-2 text-xs font-bold text-slate-300">Fechar</button></div><div className="mt-5 space-y-3"><label className="block text-xs font-bold text-slate-300">Quantidade solicitada<input type="number" min="0.001" step="0.001" value={requestAmount} onChange={e => setRequestAmount(e.target.value)} className="mt-1.5 w-full rounded-xl p-3 text-white outline-none" style={{ background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.1)" }} /></label><label className="block text-xs font-bold text-slate-300">Motivo <span className="font-normal text-slate-500">(opcional)</span><input value={requestNote} onChange={e => setRequestNote(e.target.value)} placeholder="Ex.: reposição para rota da semana" className="mt-1.5 w-full rounded-xl p-3 text-white outline-none" style={{ background: "rgba(255,255,255,.055)", border: "1px solid rgba(255,255,255,.1)" }} /></label><button disabled={requestReplenishment.isPending} onClick={submitRequest} className="mt-2 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-black text-white disabled:opacity-50" style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}>{requestReplenishment.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}Enviar solicitação</button></div></div></div>}
    <TecnicoBottomNav />
  </div>;
}
