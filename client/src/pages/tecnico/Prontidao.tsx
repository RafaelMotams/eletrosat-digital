import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import {
  ChevronLeft,
  CircleAlert,
  Info,
  Loader2,
  PackageCheck,
  Phone,
  Radar,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { trpc } from "@/lib/trpc";
import type { ProntidaoVisita, SeveridadeSinal } from "@shared/prontidaoVisita";

type FiltroVisita = "todas" | "bloqueada" | "atencao" | "pronta";

const CORES_SEVERIDADE: Record<SeveridadeSinal, { fundo: string; borda: string; texto: string }> = {
  impedimento: {
    fundo: "rgba(244,63,94,.09)",
    borda: "rgba(244,63,94,.26)",
    texto: "#fda4af",
  },
  alerta: {
    fundo: "rgba(245,158,11,.09)",
    borda: "rgba(245,158,11,.24)",
    texto: "#fcd34d",
  },
  informativo: {
    fundo: "rgba(148,163,184,.08)",
    borda: "rgba(148,163,184,.2)",
    texto: "#cbd5e1",
  },
};

const ROTULO_CLASSIFICACAO: Record<Exclude<FiltroVisita, "todas">, string> = {
  bloqueada: "Não saia ainda",
  atencao: "Confirme antes",
  pronta: "Pode ir",
};

function CartaoVisita({ visita }: { visita: ProntidaoVisita }) {
  const classificacao = visita.classificacao as Exclude<FiltroVisita, "todas">;
  const cor =
    classificacao === "bloqueada"
      ? "#fb7185"
      : classificacao === "atencao"
        ? "#fbbf24"
        : "#34d399";

  return (
    <article
      className="rounded-3xl border p-4"
      style={{ background: "rgba(255,255,255,.035)", borderColor: `${cor}33` }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate font-bold text-white">{visita.nome}</p>
          <p className="mt-0.5 text-xs text-slate-400">
            {visita.municipio ?? "Município não informado"} · INEP{" "}
            {visita.inep ?? "—"}
          </p>
        </div>
        <span
          className="shrink-0 rounded-full px-2.5 py-1 text-[11px] font-bold"
          style={{ background: `${cor}1a`, color: cor }}
        >
          {ROTULO_CLASSIFICACAO[classificacao]}
        </span>
      </div>

      <p className="mt-3 text-xs text-slate-400">
        {visita.apPlanejados > 0
          ? `${visita.apPlanejados} AP previstos`
          : "APs não definidos"}
        {visita.apDisponivelTecnico !== null
          ? ` · ${visita.apDisponivelTecnico} na sua posse`
          : ""}
      </p>

      {visita.sinais.length === 0 ? (
        <p className="mt-3 flex items-center gap-2 text-xs font-semibold text-emerald-300">
          <ShieldCheck className="h-4 w-4" /> Localização, contato e material
          conferidos.
        </p>
      ) : (
        <ul className="mt-3 space-y-2">
          {visita.sinais.map(sinal => {
            const estilo = CORES_SEVERIDADE[sinal.severidade];
            return (
              <li
                key={sinal.codigo}
                className="rounded-2xl border px-3 py-2.5"
                style={{ background: estilo.fundo, borderColor: estilo.borda }}
              >
                <p className="text-sm font-bold" style={{ color: estilo.texto }}>
                  {sinal.titulo}
                </p>
                <p className="mt-0.5 text-xs text-slate-300">{sinal.detalhe}</p>
                <p className="mt-1 text-xs font-semibold text-slate-200">
                  {sinal.acao}
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </article>
  );
}

export default function TecnicoProntidao() {
  const [, navigate] = useLocation();
  const online = useOnlineStatus();
  const [filtro, setFiltro] = useState<FiltroVisita>("todas");
  const sessao = trpc.tecnicoAuth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const prontidaoQuery = trpc.prontidao.minhasVisitas.useQuery(undefined, {
    enabled: online,
    refetchInterval: online ? 180_000 : false,
  });

  useEffect(() => {
    if (sessao.isError) {
      navigate("/tecnico/login?reason=session-expired", { replace: true });
    }
  }, [navigate, sessao.isError]);

  if (sessao.isLoading) {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-sm font-semibold text-slate-200">
        Validando sessão segura…
      </div>
    );
  }
  if (sessao.isError) return null;

  const dados = prontidaoQuery.data;
  const resumo = dados?.resumo;
  const cobertura = dados?.cobertura ?? null;
  const itens = (dados?.itens ?? []).filter(
    visita => filtro === "todas" || visita.classificacao === filtro
  );

  const contadores: Array<{ valor: FiltroVisita; rotulo: string; total: number; cor: string }> = [
    { valor: "todas", rotulo: "Todas", total: resumo?.avaliadas ?? 0, cor: "#cbd5e1" },
    { valor: "bloqueada", rotulo: "Não saia", total: resumo?.bloqueadas ?? 0, cor: "#fb7185" },
    { valor: "atencao", rotulo: "Confirme", total: resumo?.atencao ?? 0, cor: "#fbbf24" },
    { valor: "pronta", rotulo: "Pode ir", total: resumo?.prontas ?? 0, cor: "#34d399" },
  ];

  return (
    <div
      className="min-h-screen pb-28"
      style={{
        background:
          "linear-gradient(160deg, #020817 0%, #071328 48%, #020817 100%)",
      }}
    >
      <header
        className="sticky top-0 z-30 px-4 pt-10 pb-4"
        style={{
          background: "rgba(2,8,23,.88)",
          backdropFilter: "blur(18px)",
          borderBottom: "1px solid rgba(255,255,255,.06)",
        }}
      >
        <div className="mx-auto flex max-w-2xl items-center gap-3">
          <button
            onClick={() => navigate("/tecnico")}
            aria-label="Voltar ao início"
            className="grid h-10 w-10 place-items-center rounded-2xl"
            style={{
              background: "rgba(255,255,255,.06)",
              border: "1px solid rgba(255,255,255,.08)",
            }}
          >
            <ChevronLeft className="h-5 w-5 text-slate-200" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[.18em] text-cyan-400">
              Campo · Antes de sair
            </p>
            <h1 className="truncate text-lg font-black text-white">
              Conferência de saída
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl space-y-4 px-4 py-5">
        {!online && (
          <div
            className="flex gap-3 rounded-2xl border p-4 text-sm"
            style={{
              background: "rgba(245,158,11,.08)",
              borderColor: "rgba(245,158,11,.22)",
              color: "#fde68a",
            }}
          >
            <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
            <p>
              A conferência depende dos dados atuais da empresa e por isso só é
              calculada com conexão. Use a rota já sincronizada enquanto isso.
            </p>
          </div>
        )}

        <div
          className="flex gap-3 rounded-2xl border p-4 text-sm"
          style={{
            background: "rgba(34,211,238,.07)",
            borderColor: "rgba(34,211,238,.18)",
            color: "#a5f3fc",
          }}
        >
          <Radar className="mt-0.5 h-5 w-5 shrink-0" />
          <p>
            Confira aqui o que impediria a conclusão da visita antes de pegar a
            estrada: endereço, contato da escola e material na mochila.
          </p>
        </div>

        {cobertura && (
          <section
            className="rounded-3xl border p-4"
            style={{
              background: cobertura.suficiente
                ? "rgba(16,185,129,.08)"
                : "rgba(244,63,94,.08)",
              borderColor: cobertura.suficiente
                ? "rgba(52,211,153,.22)"
                : "rgba(244,63,94,.24)",
            }}
          >
            <div className="flex items-start gap-3">
              {!cobertura.rastreado ? (
                <Info className="mt-0.5 h-5 w-5 shrink-0 text-slate-300" />
              ) : cobertura.suficiente ? (
                <PackageCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-300" />
              ) : (
                <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-300" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-black text-white">
                  {!cobertura.rastreado
                    ? "Material da rota não rastreado"
                    : cobertura.suficiente
                      ? "Material suficiente para a rota"
                      : `Faltam ${cobertura.apFaltantes} AP para a rota`}
                </p>
                <p className="mt-0.5 text-xs text-slate-300">
                  {cobertura.visitasPlanejadas} visitas planejadas somam{" "}
                  {cobertura.apNecessarios} AP
                  {cobertura.rastreado
                    ? ` e você tem ${cobertura.apDisponiveis} em posse.`
                    : ". O estoque da empresa ainda não registra APs para você."}
                </p>
                {!cobertura.suficiente && cobertura.rastreado && (
                  <button
                    type="button"
                    onClick={() => navigate("/tecnico/estoque")}
                    className="mt-3 rounded-xl px-3 py-2 text-xs font-bold text-white"
                    style={{ background: "linear-gradient(135deg,#4f46e5,#6366f1)" }}
                  >
                    Solicitar reposição
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        <div className="-mx-4 overflow-x-auto px-4 [scrollbar-width:none]">
          <div className="flex min-w-max gap-2 pr-4">
            {contadores.map(contador => {
              const ativo = filtro === contador.valor;
              return (
                <button
                  key={contador.valor}
                  onClick={() => setFiltro(contador.valor)}
                  className="inline-flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition-all active:scale-95"
                  style={{
                    color: ativo ? "#020817" : contador.cor,
                    background: ativo ? contador.cor : `${contador.cor}10`,
                    border: `1px solid ${ativo ? contador.cor : `${contador.cor}35`}`,
                  }}
                >
                  {contador.rotulo}
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px]"
                    style={{
                      background: ativo
                        ? "rgba(2,8,23,.14)"
                        : `${contador.cor}18`,
                    }}
                  >
                    {contador.total}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {prontidaoQuery.isLoading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-7 w-7 animate-spin text-cyan-300" />
          </div>
        ) : prontidaoQuery.error ? (
          <div
            className="rounded-2xl border p-5 text-center"
            style={{
              borderColor: "rgba(239,68,68,.25)",
              background: "rgba(239,68,68,.07)",
            }}
          >
            <CircleAlert className="mx-auto h-6 w-6 text-red-300" />
            <p className="mt-2 font-bold text-white">
              Não foi possível conferir suas visitas
            </p>
            <button
              onClick={() => prontidaoQuery.refetch()}
              className="mt-3 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-white"
            >
              Tentar novamente
            </button>
          </div>
        ) : itens.length === 0 ? (
          <div
            className="rounded-3xl border p-10 text-center"
            style={{
              borderColor: "rgba(255,255,255,.08)",
              background: "rgba(255,255,255,.025)",
            }}
          >
            <Phone className="mx-auto h-10 w-10 text-slate-500" />
            <p className="mt-3 font-bold text-white">
              {filtro === "todas"
                ? "Nenhuma visita pendente"
                : "Nenhuma visita nesta situação"}
            </p>
            <p className="mt-1 text-sm text-slate-400">
              {filtro === "todas"
                ? "Assim que uma escola for atribuída a você, a conferência aparece aqui."
                : "Altere o filtro para ver as demais visitas."}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {itens.map(visita => (
              <CartaoVisita key={visita.escolaId} visita={visita} />
            ))}
          </div>
        )}
      </main>
      <TecnicoBottomNav />
    </div>
  );
}
