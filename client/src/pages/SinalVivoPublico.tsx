import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams } from "wouter";
import {
  Activity,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  Radio,
  Signal,
  WifiOff,
  Zap,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

type Step = "busca" | "status" | "triagem" | "resultado";

const STATUS_OPTIONS = [
  {
    value: "ok" as const,
    label: "Internet ok",
    detail: "Aulas e sistemas funcionando",
    icon: Signal,
    tone: "#34d399",
  },
  {
    value: "lento" as const,
    label: "Muito lenta",
    detail: "Carrega, mas trava nas aulas",
    icon: Activity,
    tone: "#fbbf24",
  },
  {
    value: "offline" as const,
    label: "Sem internet",
    detail: "Ninguém consegue conectar",
    icon: WifiOff,
    tone: "#fb7185",
  },
];

function BoolChoice({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean | null;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="space-y-3">
      <p className="text-[15px] font-medium text-white/90">{label}</p>
      <div className="flex gap-3">
        {[
          { v: true, t: "Sim" },
          { v: false, t: "Não" },
        ].map((opt) => (
          <button
            key={opt.t}
            type="button"
            onClick={() => onChange(opt.v)}
            className="flex-1 rounded-2xl border px-4 py-3 text-sm font-semibold transition"
            style={{
              borderColor: value === opt.v ? "rgba(45,212,191,.55)" : "rgba(255,255,255,.12)",
              background: value === opt.v ? "rgba(45,212,191,.16)" : "rgba(255,255,255,.04)",
              color: value === opt.v ? "#99f6e4" : "rgba(255,255,255,.78)",
            }}
          >
            {opt.t}
          </button>
        ))}
      </div>
    </div>
  );
}

export default function SinalVivoPublico() {
  const params = useParams<{ slug: string }>();
  const slug = params.slug ?? "";

  const [step, setStep] = useState<Step>("busca");
  const [inep, setInep] = useState("");
  const [status, setStatus] = useState<"ok" | "lento" | "offline" | null>(null);
  const [temEnergia, setTemEnergia] = useState<boolean | null>(null);
  const [ledsModemOk, setLedsModemOk] = useState<boolean | null>(null);
  const [vizinhosTambem, setVizinhosTambem] = useState<boolean | null>(null);
  const [relato, setRelato] = useState("");
  const [contatoNome, setContatoNome] = useState("");
  const [contatoTelefone, setContatoTelefone] = useState("");
  const [confirmarManutencao, setConfirmarManutencao] = useState(false);
  const [buscaAtiva, setBuscaAtiva] = useState(false);
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  const escolaQuery = trpc.sinalVivo.buscarEscola.useQuery(
    { slug, inep: inep.trim() },
    { enabled: buscaAtiva && inep.trim().length >= 4 && slug.length >= 2, retry: false },
  );

  const enviar = trpc.sinalVivo.enviarPulso.useMutation({
    onSuccess: () => setStep("resultado"),
    onError: (err) => setErroLocal(err.message),
  });

  const escola = escolaQuery.data?.escola;
  const precisaTriagem = status === "lento" || status === "offline";

  useEffect(() => {
    if (buscaAtiva && escolaQuery.isSuccess && step === "busca") {
      setStep("status");
    }
  }, [buscaAtiva, escolaQuery.isSuccess, step]);

  useEffect(() => {
    if (escolaQuery.error && buscaAtiva) {
      setErroLocal(escolaQuery.error.message);
      setBuscaAtiva(false);
    }
  }, [escolaQuery.error, buscaAtiva]);

  const podeEnviar = useMemo(() => {
    if (!escola || !status) return false;
    if (!precisaTriagem) return true;
    return temEnergia !== null;
  }, [escola, status, precisaTriagem, temEnergia]);

  function iniciarBusca(e: React.FormEvent) {
    e.preventDefault();
    setErroLocal(null);
    if (inep.trim().length < 4) {
      setErroLocal("Informe o código INEP da escola.");
      return;
    }
    setBuscaAtiva(true);
  }

  function avancarStatus() {
    if (!status) return;
    if (precisaTriagem) setStep("triagem");
    else {
      setConfirmarManutencao(false);
      enviar.mutate({
        slug,
        inep: inep.trim(),
        status,
        relato: relato || undefined,
        contatoNome: contatoNome || undefined,
        contatoTelefone: contatoTelefone || undefined,
        confirmarManutencao: false,
      });
    }
  }

  function enviarPulso() {
    if (!status || !escola) return;
    setErroLocal(null);
    enviar.mutate({
      slug,
      inep: inep.trim(),
      status,
      temEnergia,
      ledsModemOk,
      vizinhosTambem,
      relato: relato || undefined,
      contatoNome: contatoNome || undefined,
      contatoTelefone: contatoTelefone || undefined,
      confirmarManutencao,
    });
  }

  return (
    <div className="sinal-vivo-root min-h-screen text-white">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,600;9..144,700&family=Sora:wght@400;500;600;700&display=swap');
        .sinal-vivo-root {
          --sv-foam: #e8fffb;
          font-family: "Sora", sans-serif;
          background:
            radial-gradient(ellipse 90% 60% at 80% -10%, rgba(45,212,191,.28), transparent 55%),
            radial-gradient(ellipse 70% 50% at 0% 100%, rgba(14,165,233,.18), transparent 50%),
            linear-gradient(165deg, #031018 0%, #062031 42%, #0a2a28 100%);
        }
        .sinal-vivo-root h1, .sinal-vivo-root h2 {
          font-family: "Fraunces", Georgia, serif;
        }
        @keyframes sv-pulse-ring {
          0% { transform: scale(.85); opacity: .55; }
          70% { transform: scale(1.35); opacity: 0; }
          100% { opacity: 0; }
        }
        .sv-ring::before, .sv-ring::after {
          content: "";
          position: absolute;
          inset: -18%;
          border-radius: 9999px;
          border: 1px solid rgba(45,212,191,.35);
          animation: sv-pulse-ring 2.8s ease-out infinite;
        }
        .sv-ring::after { animation-delay: 1.1s; }
      `}</style>

      <header className="relative overflow-hidden px-5 pb-10 pt-8 sm:px-8 lg:px-12">
        <div className="relative mx-auto flex max-w-3xl flex-col gap-8">
          <div className="flex items-center gap-3">
            <div className="sv-ring relative grid h-12 w-12 place-items-center rounded-full bg-teal-400/15">
              <Radio className="h-5 w-5 text-teal-300" />
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.22em] text-teal-200/80">Netvius</p>
              <p className="text-sm text-white/55">Saúde da conectividade escolar</p>
            </div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            className="space-y-4"
          >
            <h1 className="max-w-xl text-4xl font-bold leading-[1.05] tracking-tight text-[var(--sv-foam)] sm:text-5xl">
              SinalVivo
            </h1>
            <p className="max-w-lg text-base leading-relaxed text-white/70 sm:text-lg">
              Um toque da escola. Triagem automática. Menos deslocamento inútil, mais internet de volta às aulas.
            </p>
          </motion.div>
        </div>
      </header>

      <main className="relative mx-auto max-w-3xl px-5 pb-16 sm:px-8 lg:px-12">
        <AnimatePresence mode="wait">
          {step === "busca" && (
            <motion.section
              key="busca"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <form onSubmit={iniciarBusca} className="space-y-5">
                <label className="block space-y-2">
                  <span className="text-sm font-medium text-white/75">Código INEP da escola</span>
                  <input
                    value={inep}
                    onChange={(e) => {
                      setInep(e.target.value.replace(/\D/g, "").slice(0, 12));
                      setBuscaAtiva(false);
                      setErroLocal(null);
                    }}
                    inputMode="numeric"
                    placeholder="Ex: 29000000"
                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-4 text-lg tracking-wide text-white outline-none ring-teal-300/40 placeholder:text-white/30 focus:ring-2"
                  />
                </label>
                <button
                  type="submit"
                  disabled={escolaQuery.isFetching}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-300 px-5 py-4 text-sm font-bold text-slate-950 transition hover:bg-teal-200 disabled:opacity-60"
                >
                  {escolaQuery.isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
                  Encontrar escola e enviar pulso
                </button>
              </form>
              {erroLocal && <p className="text-sm text-rose-300">{erroLocal}</p>}
            </motion.section>
          )}

          {step === "status" && escola && (
            <motion.section
              key="status"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-7"
            >
              <button
                type="button"
                onClick={() => {
                  setStep("busca");
                  setBuscaAtiva(false);
                  setStatus(null);
                }}
                className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" /> Trocar escola
              </button>

              <div>
                <h2 className="text-2xl font-semibold text-white">{escola.nome}</h2>
                <p className="mt-1 text-sm text-white/55">
                  INEP {escola.inep}
                  {escola.municipio ? ` · ${escola.municipio}` : ""}
                  {!escola.instalada ? " · ainda não marcada como instalada" : ""}
                </p>
              </div>

              <div className="space-y-3">
                <p className="text-sm font-medium text-white/80">Como está a internet agora?</p>
                {STATUS_OPTIONS.map((opt) => {
                  const Icon = opt.icon;
                  const active = status === opt.value;
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setStatus(opt.value)}
                      className="flex w-full items-center gap-4 rounded-2xl border px-4 py-4 text-left transition"
                      style={{
                        borderColor: active ? opt.tone : "rgba(255,255,255,.12)",
                        background: active ? `${opt.tone}22` : "rgba(255,255,255,.04)",
                      }}
                    >
                      <span
                        className="grid h-11 w-11 place-items-center rounded-xl"
                        style={{ background: `${opt.tone}28`, color: opt.tone }}
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span>
                        <span className="block text-base font-semibold text-white">{opt.label}</span>
                        <span className="block text-sm text-white/55">{opt.detail}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                disabled={!status || enviar.isPending}
                onClick={avancarStatus}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-300 px-5 py-4 text-sm font-bold text-slate-950 transition hover:bg-teal-200 disabled:opacity-50"
              >
                {enviar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                Continuar
              </button>
            </motion.section>
          )}

          {step === "triagem" && escola && status && (
            <motion.section
              key="triagem"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="space-y-6"
            >
              <button
                type="button"
                onClick={() => setStep("status")}
                className="inline-flex items-center gap-2 text-sm text-white/55 hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" /> Voltar
              </button>
              <h2 className="text-2xl font-semibold">Triagem rápida</h2>
              <p className="text-sm text-white/60">
                Responda em menos de um minuto. O SinalVivo evita chamar técnico quando a falha é energia ou provedor.
              </p>

              <BoolChoice label="A escola está com energia elétrica?" value={temEnergia} onChange={setTemEnergia} />
              {temEnergia !== false && (
                <>
                  <BoolChoice
                    label="Os LEDs do modem/roteador estão acesos normalmente?"
                    value={ledsModemOk}
                    onChange={setLedsModemOk}
                  />
                  <BoolChoice
                    label="Comércios ou casas vizinhas também estão sem internet?"
                    value={vizinhosTambem}
                    onChange={setVizinhosTambem}
                  />
                </>
              )}

              <label className="block space-y-2">
                <span className="text-sm text-white/70">Relato (opcional)</span>
                <textarea
                  value={relato}
                  onChange={(e) => setRelato(e.target.value.slice(0, 1000))}
                  rows={3}
                  className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-teal-300/40"
                  placeholder="Ex: caiu ontem à tarde na sala de informática"
                />
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block space-y-2">
                  <span className="text-sm text-white/70">Seu nome</span>
                  <input
                    value={contatoNome}
                    onChange={(e) => setContatoNome(e.target.value.slice(0, 255))}
                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-teal-300/40"
                  />
                </label>
                <label className="block space-y-2">
                  <span className="text-sm text-white/70">WhatsApp</span>
                  <input
                    value={contatoTelefone}
                    onChange={(e) => setContatoTelefone(e.target.value.slice(0, 30))}
                    className="w-full rounded-2xl border border-white/15 bg-white/5 px-4 py-3 text-sm text-white outline-none focus:ring-2 focus:ring-teal-300/40"
                  />
                </label>
              </div>

              <label className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white/75">
                <input
                  type="checkbox"
                  checked={confirmarManutencao}
                  onChange={(e) => setConfirmarManutencao(e.target.checked)}
                  className="mt-1"
                />
                Se a triagem indicar falha local, autorizo abrir ordem de manutenção automaticamente.
              </label>

              <button
                type="button"
                disabled={!podeEnviar || enviar.isPending}
                onClick={enviarPulso}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal-300 px-5 py-4 text-sm font-bold text-slate-950 transition hover:bg-teal-200 disabled:opacity-50"
              >
                {enviar.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Radio className="h-4 w-4" />}
                Enviar pulso
              </button>
              {erroLocal && <p className="text-sm text-rose-300">{erroLocal}</p>}
            </motion.section>
          )}

          {step === "resultado" && enviar.data && (
            <motion.section
              key="resultado"
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              className="space-y-6"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-1 h-7 w-7 text-teal-300" />
                <div>
                  <h2 className="text-2xl font-semibold">Pulso registrado</h2>
                  <p className="mt-2 text-base leading-relaxed text-white/75">{enviar.data.mensagem}</p>
                </div>
              </div>

              {enviar.data.guiaAutoajuda.length > 0 && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold uppercase tracking-[0.16em] text-teal-200/70">O que fazer agora</p>
                  <ol className="space-y-2">
                    {enviar.data.guiaAutoajuda.map((item) => (
                      <li key={item} className="border-l-2 border-teal-400/40 pl-4 text-sm text-white/75">
                        {item}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {enviar.data.incidente && (
                <p className="rounded-2xl border border-amber-300/25 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                  Incidente regional em {enviar.data.incidente.municipio}: {enviar.data.incidente.escolasAfetadas} escolas
                  afetadas. A equipe foi alertada sem gerar deslocamento prematuro.
                </p>
              )}

              {enviar.data.manutencaoId && (
                <p className="text-sm text-teal-100/90">
                  Ordem de manutenção #{enviar.data.manutencaoId} criada a partir deste pulso.
                </p>
              )}

              <button
                type="button"
                onClick={() => {
                  setStep("busca");
                  setBuscaAtiva(false);
                  setStatus(null);
                  setTemEnergia(null);
                  setLedsModemOk(null);
                  setVizinhosTambem(null);
                  setRelato("");
                  setConfirmarManutencao(false);
                  enviar.reset();
                }}
                className="inline-flex items-center gap-2 rounded-2xl border border-white/15 px-5 py-3 text-sm font-semibold text-white/85 hover:bg-white/5"
              >
                Enviar outro pulso
              </button>
            </motion.section>
          )}
        </AnimatePresence>
      </main>
    </div>
  );
}
