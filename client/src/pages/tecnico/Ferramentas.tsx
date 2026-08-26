import { useEffect, useMemo, useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, Calculator, CheckCircle2, ChevronLeft, Cpu, Radio, ShieldCheck, Wifi } from "lucide-react";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import { trpc } from "@/lib/trpc";
import { calcularCidr, calcularPerdaOptica, calcularPoe, dbmParaMilliwatts, estimarAutonomiaNobreak, PADROES_T568 } from "@shared/fieldTools";

function CampoNumero({ label, value, onChange, suffix }: { label: string; value: string; onChange: (value: string) => void; suffix: string }) {
  return <label className="block min-w-0"><span className="mb-1.5 block text-xs font-semibold text-slate-600">{label}</span><div className="flex items-center rounded-2xl border border-slate-200 bg-white px-3 shadow-sm"><input inputMode="decimal" value={value} onChange={(event) => onChange(event.target.value)} className="min-w-0 flex-1 bg-transparent py-3 text-sm font-bold text-slate-900 outline-none" /><span className="pl-2 text-xs font-bold text-slate-400">{suffix}</span></div></label>;
}

export default function FerramentasTecnico() {
  const [, navigate] = useLocation();
  const [cidrInput, setCidrInput] = useState("192.168.1.10/24");
  const [poeBudget, setPoeBudget] = useState("120");
  const [poeConsumption, setPoeConsumption] = useState("72");
  const [potenciaLancada, setPotenciaLancada] = useState("-3");
  const [potenciaRecebida, setPotenciaRecebida] = useState("-18");
  const [nobreakCarga, setNobreakCarga] = useState("48");
  const [nobreakBateria, setNobreakBateria] = useState("7");
  const [weakSignalMode, setWeakSignalMode] = useState(false);
  const session = trpc.tecnicoAuth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });

  useEffect(() => {
    if (session.isError) navigate("/tecnico/login?reason=session-expired", { replace: true });
  }, [navigate, session.isError]);

  const cidr = useMemo(() => calcularCidr(cidrInput), [cidrInput]);
  const poe = useMemo(() => calcularPoe(Number(poeBudget.replace(",", ".")), Number(poeConsumption.replace(",", "."))), [poeBudget, poeConsumption]);
  const perdaOptica = useMemo(() => calcularPerdaOptica(Number(potenciaLancada.replace(",", ".")), Number(potenciaRecebida.replace(",", "."))), [potenciaLancada, potenciaRecebida]);
  const potenciaRecebidaMw = useMemo(() => dbmParaMilliwatts(Number(potenciaRecebida.replace(",", "."))), [potenciaRecebida]);
  const autonomia = useMemo(() => estimarAutonomiaNobreak(Number(nobreakCarga.replace(",", ".")), Number(nobreakBateria.replace(",", "."))), [nobreakCarga, nobreakBateria]);

  if (session.isLoading) return <div className="grid min-h-screen place-items-center bg-slate-950 text-sm font-semibold text-slate-200">Validando sessão segura…</div>;
  if (session.isError) return null;

  return <div className="min-h-screen bg-slate-50 pb-28 text-slate-900">
    <header className="relative overflow-hidden bg-slate-950 px-4 pb-8 pt-5 text-white">
      <div className="pointer-events-none absolute -right-16 -top-20 h-48 w-48 rounded-full bg-emerald-400/15 blur-3xl" />
      <div className="relative mx-auto max-w-2xl">
        <button type="button" onClick={() => navigate("/tecnico")} className="mb-5 inline-flex items-center gap-1 rounded-xl px-1 py-1 text-xs font-semibold text-slate-300 transition hover:text-white"><ChevronLeft className="h-4 w-4" /> Voltar ao início</button>
        <div className="flex items-start gap-3"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-emerald-400 text-slate-950 shadow-lg shadow-emerald-500/20"><Calculator className="h-6 w-6" /></span><div><p className="text-xs font-bold uppercase tracking-[0.18em] text-emerald-300">Campo sem complicação</p><h1 className="mt-1 text-2xl font-extrabold tracking-tight">Ferramentas técnicas</h1><p className="mt-1 max-w-md text-sm leading-5 text-slate-300">Cálculos locais para apoiar sua decisão. Confira sempre o projeto, a etiqueta do equipamento e a medição em campo.</p></div></div>
      </div>
    </header>

    <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-slate-100 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-sky-50 text-sky-600"><Wifi className="h-5 w-5" /></span><div><h2 className="font-bold text-slate-900">IPv4 e CIDR</h2><p className="mt-0.5 text-xs leading-5 text-slate-500">Consulte rede, máscara e faixa de hosts sem depender de internet.</p></div></div>
        <div className="p-4"><label className="block"><span className="mb-1.5 block text-xs font-semibold text-slate-600">IP e prefixo</span><input value={cidrInput} onChange={(event) => setCidrInput(event.target.value)} spellCheck={false} placeholder="Ex.: 192.168.1.10/24" className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-3 py-3 font-mono text-sm font-semibold text-slate-900 outline-none ring-emerald-500 transition focus:border-emerald-400 focus:ring-2" /></label>
          {cidr ? <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{[["Máscara", cidr.netmask], ["Rede", cidr.network], ["Broadcast", cidr.broadcast], ["1º host", cidr.firstHost ?? "Sem host"], ["Último host", cidr.lastHost ?? "Sem host"], ["Hosts úteis", String(cidr.usableHosts)]].map(([label, value]) => <div key={label} className="min-w-0 rounded-2xl bg-slate-50 p-3"><p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">{label}</p><p className="mt-1 truncate font-mono text-xs font-bold text-slate-800" title={value}>{value}</p></div>)}</div> : <p className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-3 text-xs font-medium text-amber-800"><AlertTriangle className="h-4 w-4 shrink-0" /> Informe um IPv4 e prefixo válidos, como 192.168.1.10/24.</p>}</div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-slate-100 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-violet-50 text-violet-600"><Cpu className="h-5 w-5" /></span><div><h2 className="font-bold text-slate-900">Orçamento PoE</h2><p className="mt-0.5 text-xs leading-5 text-slate-500">Compare o orçamento nominal do switch com a soma estimada dos equipamentos.</p></div></div>
        <div className="space-y-4 p-4"><div className="grid grid-cols-2 gap-3"><CampoNumero label="Orçamento do switch" value={poeBudget} onChange={setPoeBudget} suffix="W" /><CampoNumero label="Consumo estimado" value={poeConsumption} onChange={setPoeConsumption} suffix="W" /></div><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full transition-all" style={{ width: `${poe.percentual}%`, background: poe.excedido ? "#f43f5e" : poe.percentual > 80 ? "#f59e0b" : "#10b981" }} /></div><div className="flex items-start gap-3 rounded-2xl p-3" style={{ background: poe.excedido ? "#fff1f2" : "#ecfdf5" }}>{poe.excedido ? <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-rose-600" /> : <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" />}<div><p className="text-sm font-bold" style={{ color: poe.excedido ? "#9f1239" : "#065f46" }}>{poe.excedido ? `Orçamento excedido em ${Math.abs(poe.restante).toFixed(1)} W` : `${poe.restante.toFixed(1)} W disponíveis`}</p><p className="mt-0.5 text-xs leading-5" style={{ color: poe.excedido ? "#be123c" : "#047857" }}>Cálculo indicativo. A potência real e a margem de projeto devem prevalecer.</p></div></div></div>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-4"><div className="flex gap-3"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><Radio className="h-5 w-5" /></span><div><h2 className="font-bold text-slate-900">Modo sinal fraco</h2><p className="mt-0.5 text-xs leading-5 text-slate-500">Reduz a densidade visual desta tela e lembra de priorizar os dados já baixados.</p></div></div><button type="button" aria-pressed={weakSignalMode} onClick={() => setWeakSignalMode(value => !value)} className="relative mt-1 h-7 w-12 shrink-0 rounded-full transition" style={{ background: weakSignalMode ? "#059669" : "#cbd5e1" }}><span className="absolute top-1 h-5 w-5 rounded-full bg-white shadow transition" style={{ left: weakSignalMode ? "24px" : "4px" }} /></button></div>{weakSignalMode && <p className="mt-3 flex items-center gap-2 rounded-2xl bg-amber-50 px-3 py-3 text-xs font-medium text-amber-900"><ShieldCheck className="h-4 w-4 shrink-0" /> Use a rota e os materiais já sincronizados. O Copiloto e novos envios ainda dependem de conexão.</p>}</section>
      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-slate-100 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-cyan-50 text-cyan-700"><Radio className="h-5 w-5" /></span><div><h2 className="font-bold text-slate-900">Perda óptica</h2><p className="mt-0.5 text-xs leading-5 text-slate-500">Cálculo de apoio. Use sempre os limites do módulo, do projeto e a medição certificada.</p></div></div>
        <div className="space-y-3 p-4"><div className="grid grid-cols-2 gap-3"><CampoNumero label="Potência lançada" value={potenciaLancada} onChange={setPotenciaLancada} suffix="dBm" /><CampoNumero label="Potência recebida" value={potenciaRecebida} onChange={setPotenciaRecebida} suffix="dBm" /></div>{perdaOptica !== null && potenciaRecebidaMw !== null ? <div className="rounded-2xl bg-cyan-50 p-3"><p className="text-sm font-bold text-cyan-900">Perda calculada: {perdaOptica.toFixed(2)} dB</p><p className="mt-1 text-xs text-cyan-800">Recepção aproximada: {potenciaRecebidaMw.toFixed(4)} mW. Não substitui OTDR, power meter nem parâmetros do fabricante.</p></div> : <p className="text-xs text-amber-800">Informe valores numéricos em dBm.</p>}</div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-slate-100 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-amber-50 text-amber-600"><Cpu className="h-5 w-5" /></span><div><h2 className="font-bold text-slate-900">Autonomia estimada do nobreak</h2><p className="mt-0.5 text-xs leading-5 text-slate-500">Estimativa para uma bateria de 12 V com eficiência de 80%; não representa autonomia garantida.</p></div></div>
        <div className="space-y-3 p-4"><div className="grid grid-cols-2 gap-3"><CampoNumero label="Carga estimada" value={nobreakCarga} onChange={setNobreakCarga} suffix="W" /><CampoNumero label="Bateria" value={nobreakBateria} onChange={setNobreakBateria} suffix="Ah" /></div>{autonomia ? <div className="rounded-2xl bg-amber-50 p-3"><p className="text-sm font-bold text-amber-900">Autonomia estimada: {Math.round(autonomia.minutos)} minutos</p><p className="mt-1 text-xs text-amber-800">Energia útil estimada: {autonomia.energiaUtilWh.toFixed(1)} Wh. Confirme a tensão, o arranjo de baterias e a saúde real antes de decidir.</p></div> : <p className="text-xs text-amber-800">Informe carga e capacidade maiores que zero.</p>}</div>
      </section>

      <section className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-start gap-3 border-b border-slate-100 p-4"><span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck className="h-5 w-5" /></span><div><h2 className="font-bold text-slate-900">Terminação T568A e T568B</h2><p className="mt-0.5 text-xs leading-5 text-slate-500">Sequência de cores para conferência; siga o projeto e teste o cabo ao final.</p></div></div>
        <div className="grid gap-3 p-4 sm:grid-cols-2">{(["A", "B"] as const).map((padrao) => <div key={padrao} className="rounded-2xl bg-slate-50 p-3"><p className="text-sm font-bold text-slate-900">T568{padrao}</p><ol className="mt-2 space-y-1 text-xs text-slate-600">{PADROES_T568[padrao].map((cor, index) => <li key={cor}><span className="mr-2 font-bold text-slate-400">{index + 1}</span>{cor}</li>)}</ol></div>)}</div>
      </section>
    </main>
    <TecnicoBottomNav />
  </div>;
}
