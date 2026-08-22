import { AIChatBox, type Message } from "@/components/AIChatBox";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import { trpc } from "@/lib/trpc";
import { ArrowLeft, Bot, ImagePlus, Loader2, ShieldCheck, Wrench, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "wouter";

const PERFIS = [
  { value: "rede_escolar", label: "Redes escolares" },
  { value: "aprender_conectado", label: "Aprender Conectado" },
  { value: "infraestrutura_fisica", label: "Rack, fibra e energia" },
  { value: "configuracao_tp_link", label: "TP-Link / Omada" },
  { value: "configuracao_intelbras", label: "Intelbras" },
  { value: "rede_externa_telbras", label: "Rede externa / Telbrás" },
] as const;

type Perfil = typeof PERFIS[number]["value"];
type FotoAnalise = { preview: string; base64: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; name: string };

function readPhotoForAnalysis(file: File): Promise<FotoAnalise> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a foto."));
    reader.onload = () => {
      const preview = String(reader.result || "");
      const base64 = preview.split(",")[1];
      if (!base64) return reject(new Error("A foto não possui dados válidos."));
      resolve({ preview, base64, mimeType: file.type as FotoAnalise["mimeType"], name: file.name });
    };
    reader.readAsDataURL(file);
  });
}

export default function AssistenteTecnico() {
  const [, navigate] = useLocation();
  const [perfil, setPerfil] = useState<Perfil>("rede_escolar");
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessionChecked, setSessionChecked] = useState(false);
  const [foto, setFoto] = useState<FotoAnalise | null>(null);
  const [fotoErro, setFotoErro] = useState("");

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

  const visualChat = trpc.manutencao.assistenteTecnicoVisual.useMutation({
    onSuccess: ({ resposta }) => {
      setMessages((current) => [...current, { role: "assistant", content: resposta }]);
    },
    onError: (error) => {
      setMessages((current) => [...current, { role: "assistant", content: `Não foi possível analisar a foto agora. ${error.message}` }]);
    },
  });

  const send = (pergunta: string) => {
    setMessages((current) => [...current, { role: "user", content: pergunta }]);
    chat.mutate({ pergunta, perfil });
  };

  const selecionarFoto = async (file?: File) => {
    if (!file) return;
    setFotoErro("");
    if (!(["image/jpeg", "image/png", "image/webp"] as string[]).includes(file.type)) {
      setFotoErro("Envie uma imagem JPG, PNG ou WEBP.");
      return;
    }
    if (file.size > 6 * 1024 * 1024) {
      setFotoErro("A foto precisa ter até 6 MB.");
      return;
    }
    try {
      setFoto(await readPhotoForAnalysis(file));
    } catch (error) {
      setFotoErro(error instanceof Error ? error.message : "Não foi possível preparar a foto.");
    }
  };

  const analisarFoto = () => {
    if (!foto || visualChat.isPending) return;
    if (!navigator.onLine) {
      setFotoErro("A análise de foto precisa de conexão. A foto continua somente neste aparelho e não foi enviada.");
      return;
    }
    const texto = "Enviei uma foto para análise técnica. Liste o que está visível, riscos possíveis, próximo passo seguro e o que preciso confirmar em campo.";
    setMessages((current) => [...current, { role: "user", content: `📷 Foto enviada para análise: ${foto.name}` }, { role: "assistant", content: "Estou verificando a foto. Esta análise é orientativa e não substitui o manual do fabricante ou a validação em campo." }]);
    visualChat.mutate({ pergunta: texto, perfil, imageBase64: foto.base64, mimeType: foto.mimeType });
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

        <section className="mb-4 overflow-hidden rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.045] p-4 shadow-xl shadow-black/10">
          <div className="flex items-start gap-3">
            <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-400/15 text-emerald-300"><ImagePlus className="h-5 w-5" /></div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black text-white">Analisar foto da galeria</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">Envie uma foto de rack, AP, switch, cabeamento ou infraestrutura. A foto é usada apenas para esta análise e não vira anexo permanente da OS.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <label className="cursor-pointer rounded-xl bg-white px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-emerald-50">
                  Escolher foto
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => selecionarFoto(event.target.files?.[0])} />
                </label>
                {foto && <button type="button" onClick={analisarFoto} disabled={visualChat.isPending} className="inline-flex items-center gap-2 rounded-xl bg-emerald-500 px-3 py-2 text-xs font-black text-slate-950 transition hover:bg-emerald-400 disabled:opacity-60">{visualChat.isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Analisando</> : "Analisar foto"}</button>}
              </div>
              {foto && <div className="mt-3 flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-2"><img src={foto.preview} alt="Prévia da foto selecionada" className="h-16 w-16 rounded-xl object-cover" /><span className="min-w-0 flex-1 truncate text-xs text-slate-300">{foto.name}</span><button type="button" onClick={() => setFoto(null)} className="rounded-lg p-2 text-slate-400 transition hover:bg-white/10 hover:text-white" aria-label="Remover foto"><X className="h-4 w-4" /></button></div>}
              {fotoErro && <p className="mt-3 text-xs font-semibold text-amber-200">{fotoErro}</p>}
            </div>
          </div>
        </section>

        <AIChatBox
          messages={messages}
          onSendMessage={send}
          isLoading={chat.isPending || visualChat.isPending}
          height="calc(100vh - 510px)"
          className="min-h-[440px] overflow-hidden border-white/10 shadow-2xl shadow-black/25"
          placeholder="Ex.: Como conferir uma VLAN no switch antes de liberar os APs?"
          emptyStateMessage="Descreva o cenário de campo e receba uma orientação técnica passo a passo."
          suggestedPrompts={[
            "Como validar a energia, aterramento e organização de um rack?",
            "Qual evidência devo registrar em uma implantação do Aprender Conectado?",
            "Qual checklist usar antes de adotar APs no Omada?",
            "Como investigar Wi-Fi instável sem desativar a segurança da rede?",
          ]}
        />
      </main>
      <TecnicoBottomNav />
    </div>
  );
}
