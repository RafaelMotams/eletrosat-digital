import AdminLayoutAuto from "@/components/AdminLayoutAuto";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Link2,
  Radio,
  SignalHigh,
  WifiOff,
} from "lucide-react";
import { toast } from "sonner";
import { useTenantAuth } from "@/hooks/useTenantAuth";

function Metric({
  label,
  value,
  hint,
  accent,
}: {
  label: string;
  value: string | number;
  hint: string;
  accent: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
      <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums" style={{ color: accent }}>{value}</p>
      <p className="mt-1 text-sm text-slate-400">{hint}</p>
    </div>
  );
}

export default function AdminSinalVivo() {
  const { admin } = useTenantAuth();
  const isViewer = admin?.role === "viewer";
  const utils = trpc.useUtils();
  const info = trpc.sinalVivo.info.useQuery();
  const painel = trpc.sinalVivo.painel.useQuery(undefined, { refetchInterval: 30000 });
  const resolver = trpc.sinalVivo.resolverIncidente.useMutation({
    onSuccess: async () => {
      toast.success("Incidente marcado como resolvido");
      await utils.sinalVivo.painel.invalidate();
    },
    onError: (err) => toast.error(err.message),
  });

  const linkPublico = info.data
    ? `${typeof window !== "undefined" ? window.location.origin : ""}${info.data.caminhoPublico}`
    : "";

  async function copiarLink() {
    if (!linkPublico) return;
    await navigator.clipboard.writeText(linkPublico);
    toast.success("Link público copiado");
  }

  const loading = painel.isLoading || info.isLoading;

  return (
    <AdminLayoutAuto title="SinalVivo">
      <div className="space-y-8">
        <section className="overflow-hidden rounded-3xl border border-teal-400/20 bg-gradient-to-br from-slate-950 via-slate-900 to-teal-950 px-6 py-7 text-white sm:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl space-y-3">
              <div className="inline-flex items-center gap-2 text-teal-300">
                <Radio className="h-4 w-4" />
                <span className="text-xs font-semibold uppercase tracking-[0.2em]">Módulo inovador</span>
              </div>
              <h2 className="text-3xl font-bold tracking-tight">Saúde da conectividade em tempo quase real</h2>
              <p className="text-sm leading-relaxed text-slate-300 sm:text-base">
                Diretores enviam um pulso pelo celular. O Netvius tria energia, equipamento e falha de provedor —
                e só sugere deslocamento quando a falha é local.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button variant="secondary" className="gap-2 bg-white text-slate-900 hover:bg-teal-50" onClick={copiarLink} disabled={!linkPublico}>
                <Copy className="h-4 w-4" /> Copiar link da escola
              </Button>
              {linkPublico && (
                <a
                  href={linkPublico}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border border-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                >
                  <Link2 className="h-4 w-4" /> Abrir página pública
                </a>
              )}
            </div>
          </div>
          {linkPublico && (
            <p className="mt-4 truncate rounded-xl border border-white/10 bg-black/20 px-4 py-2 font-mono text-xs text-teal-100/90">
              {linkPublico}
            </p>
          )}
        </section>

        {loading && <p className="text-sm text-slate-400">Carregando painel SinalVivo…</p>}
        {painel.error && <p className="text-sm text-rose-400">{painel.error.message}</p>}

        {painel.data && (
          <>
            <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <Metric
                label="Índice de saúde 24h"
                value={`${painel.data.saude.indiceSaude}%`}
                hint={`${painel.data.saude.total} pulsos nas últimas 24h`}
                accent="#2dd4bf"
              />
              <Metric
                label="Online / lento / offline"
                value={`${painel.data.saude.ok}/${painel.data.saude.lento}/${painel.data.saude.offline}`}
                hint="Distribuição dos check-ins"
                accent="#38bdf8"
              />
              <Metric
                label="Escolas em silêncio"
                value={painel.data.emSilencio}
                hint={`Sem pulso há ≥ 3 dias · ${painel.data.totalInstaladas} instaladas`}
                accent="#fbbf24"
              />
              <Metric
                label="Incidentes regionais"
                value={painel.data.incidentesAbertos}
                hint="Provável falha de provedor"
                accent="#fb7185"
              />
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
                  <AlertTriangle className="h-5 w-5 text-amber-300" /> Incidentes abertos
                </h3>
                {painel.data.incidentes.length === 0 && (
                  <p className="text-sm text-slate-400">Nenhum incidente regional no momento.</p>
                )}
                <ul className="space-y-3">
                  {painel.data.incidentes.map((inc) => (
                    <li key={inc.id} className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-white">{inc.municipio}</p>
                          <p className="mt-1 text-sm text-slate-400">
                            {inc.escolasAfetadas} escolas · {inc.status}
                          </p>
                          {inc.resumo && <p className="mt-2 text-sm text-slate-300">{inc.resumo}</p>}
                        </div>
                        {!isViewer && (
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={resolver.isPending}
                            onClick={() => resolver.mutate({ id: inc.id })}
                          >
                            <CheckCircle2 className="mr-1 h-4 w-4" /> Resolver
                          </Button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="space-y-4">
                <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
                  <WifiOff className="h-5 w-5 text-rose-300" /> Silêncio operacional
                </h3>
                {painel.data.silencio.length === 0 && (
                  <p className="text-sm text-slate-400">Todas as escolas instaladas enviaram pulso recente.</p>
                )}
                <ul className="max-h-[420px] space-y-2 overflow-auto pr-1">
                  {painel.data.silencio.map((esc) => (
                    <li key={esc.id} className="flex items-center justify-between gap-3 rounded-xl border border-white/10 px-3 py-2.5 text-sm">
                      <span className="truncate text-slate-200">{esc.nome}</span>
                      <span className="shrink-0 tabular-nums text-amber-300">
                        {esc.diasSemSinal >= 999 ? "nunca" : `${esc.diasSemSinal}d`}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            <section className="space-y-4">
              <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-100">
                <Activity className="h-5 w-5 text-teal-300" /> Pulsos recentes
              </h3>
              <div className="overflow-x-auto rounded-2xl border border-white/10">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-white/[0.03] text-slate-400">
                    <tr>
                      <th className="px-4 py-3 font-medium">Escola</th>
                      <th className="px-4 py-3 font-medium">Município</th>
                      <th className="px-4 py-3 font-medium">Status</th>
                      <th className="px-4 py-3 font-medium">Classificação</th>
                      <th className="px-4 py-3 font-medium">Quando</th>
                    </tr>
                  </thead>
                  <tbody>
                    {painel.data.pulsosRecentes.map((p, idx) => (
                      <tr key={`${p.escolaId}-${idx}`} className="border-t border-white/5 text-slate-200">
                        <td className="px-4 py-3">{p.escolaNome}</td>
                        <td className="px-4 py-3 text-slate-400">{p.municipio || "—"}</td>
                        <td className="px-4 py-3">
                          <span className="inline-flex items-center gap-1.5">
                            {p.status === "ok" ? <SignalHigh className="h-3.5 w-3.5 text-emerald-400" /> : null}
                            {p.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-slate-400">{p.classificacao}</td>
                        <td className="px-4 py-3 text-slate-400">
                          {new Date(p.createdAt).toLocaleString("pt-BR")}
                        </td>
                      </tr>
                    ))}
                    {painel.data.pulsosRecentes.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                          Ainda não há pulsos. Compartilhe o link público com as escolas.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {painel.data.porMunicipio.length > 0 && (
              <section className="space-y-4">
                <h3 className="text-lg font-semibold text-slate-100">Mapa por município (24h)</h3>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {painel.data.porMunicipio.map((m) => (
                    <div key={m.municipio} className="rounded-2xl border border-white/10 px-4 py-3">
                      <p className="font-medium text-white">{m.municipio}</p>
                      <p className="mt-1 text-sm text-slate-400">
                        {m.ok} ok · {m.lento} lento · {m.offline} offline
                      </p>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </AdminLayoutAuto>
  );
}
