import { AIChatBox, type Message } from "@/components/AIChatBox";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bot, ShieldCheck, Wrench } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const PERFIS = [
  { value: "rede_escolar", label: "Redes escolares" },
  { value: "infraestrutura_fisica", label: "Rack, fibra e energia" },
  { value: "configuracao_tp_link", label: "TP-Link / Omada" },
  { value: "configuracao_intelbras", label: "Intelbras" },
  { value: "rede_externa_telbras", label: "Rede externa / Telbrás" },
] as const;

type Perfil = typeof PERFIS[number]["value"];

export default function AssistenteTecnico() {
  const [, navigate] = useLocation();
  const [perfil, setPerfil] = useState<Perfil>("rede_escolar");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    const hasTechnicianSession = Boolean(localStorage.getItem("tecnico_id") && localStorage.getItem("tecnico"));
    if (!hasTechnicianSession) {
      navigate("/tecnico/login", { replace: true });
      return;
    }
    setSessionChecked(true);
  }, [navigate]);

  const chat = trpc.manutencao.assistenteTecnico.useMutation({
    onSuccess: ({ resposta }) => {
      setMessages((current) => [...current, { role: "assistant", content: resposta }]);
    },
    onError: (error) => {
      setMessages((current) => [
        ...current,
        { role: "assistant", content: `Não foi possível responder agora. Verifique sua conexão e tente novamente.\n\nDetalhe: ${error.message}` },
      ]);
    },
  });

  const send = (pergunta: string) => {
    setMessages((current) => [...current, { role: "user", content: pergunta }]);
    chat.mutate({ pergunta, perfil });
  };

  if (!sessionChecked) {
    return <div className="min-h-screen" style={{ background: "#020817" }} />;
  }

  return (
    <div className="min-h-screen pb-24 text-white" style={{ background: "radial-gradient(circle at 82% 5%, rgba(16,185,129,0.18), transparent 24%), linear-gradient(155deg, #020817 0%, #081329 52%, #020817 100%)" }}>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-slate-950/80 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button onClick={() => navigate("/tecnico")} className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-slate-200 transition hover:bg-white/10" aria-label="Voltar ao início">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-400/15 text-emerald-300 ring-1 ring-emerald-400/30">
            <Bot className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black">Assistente Técnico</p>
            <p className="truncate text-xs text-slate-400">Orientação de campo independente de uma manutenção</p>
          </div>
          <ShieldCheck className="h-5 w-5 text-emerald-300" aria-label="Sessão protegida" />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-5">
        <section className="mb-4 rounded-3xl border border-white/10 bg-white/[0.045] p-4 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-bold text-white"><Wrench className="h-4 w-4 text-emerald-300" /> Especialidade selecionada</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">Faça uma pergunta sobre instalação, diagnóstico, infraestrutura ou configuração. Use procedimentos seguros e confirme o manual do fabricante quando necessário.</p>
            </div>
            <select value={perfil} onChange={(event) => setPerfil(event.target.value as Perfil)} className="rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm font-semibold text-white outline-none focus:border-emerald-400/60">
              {PERFIS.map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}
            </select>
          </div>
        </section>

        <AIChatBox
          messages={messages}
          onSendMessage={send}
          isLoading={chat.isPending}
          height="calc(100vh - 278px)"
          className="min-h-[440px] overflow-hidden border-white/10 shadow-2xl shadow-black/25"
          placeholder="Ex.: Como conferir uma VLAN no switch antes de liberar os APs?"
          emptyStateMessage="Descreva o cenário de campo e receba uma orientação técnica passo a passo."
          suggestedPrompts={[
            "Como validar a energia, aterramento e organização de um rack?",
            "Qual checklist usar antes de adotar APs no Omada?",
            "Como investigar Wi-Fi instável sem desativar a segurança da rede?",
          ]}
        />
      </main>
      <TecnicoBottomNav />
    </div>
  );
}
