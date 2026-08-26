import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import { AlertCircle, ArrowLeft, CheckCircle2, Cloud, Image, Radio, RefreshCw, WifiOff } from "lucide-react";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import { OperationState } from "@/components/OperationState";
import { dbGetPendingOS, type PendingOS } from "@/hooks/useOfflineDB";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useSyncOfflineOS } from "@/hooks/useSyncOfflineOS";

function labelTipo(item: PendingOS) {
  if (item.tipo === "iniciar") return "Início de ordem";
  if (item.tipo === "nao_instalada") return "Registro de não instalação";
  return "Conclusão com evidências";
}

function horario(timestamp: number) {
  return new Date(timestamp).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function SincronizacaoTecnico() {
  const [, navigate] = useLocation();
  const online = useOnlineStatus();
  const tecnicoId = Number(localStorage.getItem("tecnico_id"));
  const tenantId = Number(localStorage.getItem("tecnico_tenant_id"));
  const [itens, setItens] = useState<PendingOS[]>([]);
  const { syncState, runSync } = useSyncOfflineOS();

  const recarregar = useCallback(async () => {
    if (!Number.isInteger(tecnicoId) || tecnicoId <= 0 || !Number.isInteger(tenantId) || tenantId <= 0) {
      navigate("/tecnico/login", { replace: true });
      return;
    }
    setItens(await dbGetPendingOS(tecnicoId, tenantId));
  }, [navigate, tecnicoId, tenantId]);

  useEffect(() => {
    void recarregar();
    const interval = window.setInterval(() => void recarregar(), 5000);
    return () => window.clearInterval(interval);
  }, [recarregar]);

  const tentarAgora = async () => {
    if (!online) return;
    await runSync();
    await recarregar();
  };

  const comErro = itens.filter(item => item.status === "error").length;
  const fotos = itens.reduce((total, item) => total + item.fotos.length, 0);

  return (
    <main className="min-h-screen bg-[#07111f] pb-28 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#07111f]/95 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button type="button" onClick={() => navigate("/tecnico")} aria-label="Voltar ao início" className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5 text-slate-200 active:scale-95"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">Operação de campo</p><h1 className="truncate text-xl font-black text-white">Central de sincronização</h1></div>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold ${online ? "bg-emerald-400/10 text-emerald-300" : "bg-amber-400/10 text-amber-200"}`}><span className={`h-2 w-2 rounded-full ${online ? "bg-emerald-400" : "bg-amber-300"}`} />{online ? "Online" : "Offline"}</span>
        </div>
      </header>

      <section className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        <div className="overflow-hidden rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.15),transparent_42%),linear-gradient(145deg,#10233d,#0a1425)] p-5 shadow-[0_18px_48px_rgba(2,8,23,.28)]">
          <div className="flex items-start justify-between gap-4"><div><div className="mb-2 inline-flex rounded-2xl bg-cyan-300/10 p-2.5 text-cyan-200"><Cloud className="h-5 w-5" /></div><h2 className="text-lg font-black text-white">Fila protegida por empresa</h2><p className="mt-1 max-w-sm text-sm leading-5 text-slate-300">Somente pendências desta conta técnica aparecem aqui. Dados de outro cliente não entram na fila nem na sincronização.</p></div><Radio className={`mt-1 h-5 w-5 ${online ? "text-emerald-300" : "text-amber-300"}`} /></div>
          <div className="mt-5 grid grid-cols-3 gap-2"><Metric value={itens.length} label="Pendentes" color="#67e8f9" /><Metric value={comErro} label="Com falha" color="#fbbf24" /><Metric value={fotos} label="Fotos" color="#a7f3d0" /></div>
          <button type="button" onClick={() => void tentarAgora()} disabled={!online || syncState.isSyncing || itens.length === 0} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl px-4 py-3.5 text-sm font-black text-slate-950 transition active:scale-[.98] disabled:cursor-not-allowed disabled:opacity-50" style={{ background: "linear-gradient(135deg,#67e8f9,#34d399)" }}>
            <RefreshCw className={`h-4 w-4 ${syncState.isSyncing ? "animate-spin" : ""}`} />{syncState.isSyncing ? "Sincronizando pendências..." : online ? "Tentar sincronizar agora" : "Aguardando conexão"}
          </button>
        </div>

        {!online && <div className="flex gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4"><WifiOff className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" /><p className="text-sm leading-5 text-amber-100">Você pode continuar trabalhando. As pendências ficam protegidas neste aparelho e serão tentadas quando a conexão voltar.</p></div>}

        {itens.length === 0 ? <OperationState kind="empty" title="Nenhuma pendência nesta sessão" description="As ações concluídas offline serão exibidas aqui até a sincronização confirmar o envio." /> : <section className="space-y-3" aria-label="Pendências de sincronização">
          <div className="flex items-center justify-between px-1"><h2 className="text-sm font-black text-white">Ações aguardando envio</h2><button type="button" onClick={() => void recarregar()} className="text-xs font-bold text-cyan-300">Atualizar</button></div>
          {itens.map(item => <article key={item.id} className="rounded-3xl border border-white/10 bg-white/[.035] p-4 shadow-sm">
            <div className="flex gap-3"><span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${item.status === "error" ? "bg-amber-300/10 text-amber-200" : "bg-cyan-300/10 text-cyan-200"}`}>{item.status === "error" ? <AlertCircle className="h-5 w-5" /> : <Cloud className="h-5 w-5" />}</span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-black text-white">{labelTipo(item)}</h3><span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${item.status === "error" ? "bg-amber-300/15 text-amber-200" : "bg-cyan-300/10 text-cyan-200"}`}>{item.status === "error" ? "Requer nova tentativa" : "Na fila"}</span></div><p className="mt-1 text-xs text-slate-400">Escola #{item.escolaId} · {horario(item.createdAt)}</p><div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-300"><span className="inline-flex items-center gap-1 rounded-lg bg-white/5 px-2 py-1"><Image className="h-3.5 w-3.5 text-cyan-200" />{item.fotos.length} evidência{item.fotos.length === 1 ? "" : "s"}</span>{item.errorMsg && <span className="max-w-full break-words rounded-lg bg-amber-300/10 px-2 py-1 text-amber-100">{item.errorMsg}</span>}</div></div></div>
          </article>)}
        </section>}

        {syncState.lastError && <div className="flex gap-3 rounded-2xl border border-amber-300/20 bg-amber-300/10 p-4"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" /><div><p className="text-sm font-bold text-amber-100">A sincronização precisa de atenção</p><p className="mt-1 text-xs leading-5 text-amber-100/80">{syncState.lastError}</p></div></div>}
        {syncState.lastSyncAt && !syncState.lastError && <div className="flex items-center gap-2 px-1 text-xs text-emerald-300"><CheckCircle2 className="h-4 w-4" />Última tentativa: {horario(syncState.lastSyncAt)}</div>}
      </section>
      <TecnicoBottomNav />
    </main>
  );
}

function Metric({ value, label, color }: { value: number; label: string; color: string }) {
  return <div className="rounded-2xl border border-white/10 bg-slate-950/20 px-3 py-3"><p className="text-xl font-black" style={{ color }}>{value}</p><p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p></div>;
}
