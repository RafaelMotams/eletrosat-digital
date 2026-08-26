import { useRef, useState } from "react";
import { useLocation } from "wouter";
import { AlertTriangle, ArrowLeft, Camera, ImagePlus, ShieldCheck, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AIChatBox, type Message } from "@/components/AIChatBox";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import { trpc } from "@/lib/trpc";

type Assunto = "rede" | "wifi" | "cabeamento" | "fibra" | "energia" | "rack" | "outro";
type ImagemTemporaria = { base64: string; mimeType: "image/jpeg" | "image/png" | "image/webp"; preview: string; nome: string };

const assuntos: Array<{ id: Assunto; label: string }> = [
  { id: "wifi", label: "Wi‑Fi e APs" },
  { id: "rede", label: "Rede e VLAN" },
  { id: "cabeamento", label: "Cabeamento" },
  { id: "fibra", label: "Fibra" },
  { id: "energia", label: "Energia e PoE" },
  { id: "rack", label: "Rack" },
];

function lerImagem(file: File): Promise<ImagemTemporaria> {
  return new Promise((resolve, reject) => {
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      reject(new Error("Escolha uma imagem JPEG, PNG ou WebP."));
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      reject(new Error("A foto deve ter no máximo 10 MB."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler a imagem."));
    reader.onload = () => {
      const dataUrl = String(reader.result ?? "");
      const base64 = dataUrl.split(",")[1];
      if (!base64) return reject(new Error("Imagem inválida."));
      resolve({ base64, mimeType: file.type as ImagemTemporaria["mimeType"], preview: dataUrl, nome: file.name });
    };
    reader.readAsDataURL(file);
  });
}

export default function AssistenteTecnico() {
  const [, navigate] = useLocation();
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const [assunto, setAssunto] = useState<Assunto>("wifi");
  const [imagem, setImagem] = useState<ImagemTemporaria | null>(null);
  const [mensagens, setMensagens] = useState<Message[]>([]);
  const [fontes, setFontes] = useState<Array<{ id: string; titulo: string; url: string; uso: string }>>([]);
  const [versaoBase, setVersaoBase] = useState<string | null>(null);
  const [avaliacao, setAvaliacao] = useState<boolean | null>(null);

  const consulta = trpc.assistenteTecnico.consultar.useMutation({
    onSuccess: (resultado) => {
      setMensagens((atual) => [...atual, { role: "assistant", content: resultado.resposta }]);
      setFontes(resultado.fontes);
      setVersaoBase(resultado.versaoBase);
      setAvaliacao(null);
      setImagem(null);
    },
    onError: (erro) => {
      toast.error(erro.message || "Não foi possível obter a orientação agora.");
      setMensagens((atual) => atual.slice(0, -1));
    },
  });
  const avaliar = trpc.assistenteTecnico.avaliar.useMutation({
    onSuccess: () => toast.success("Obrigado. Sua avaliação foi registrada."),
    onError: () => toast.error("Não foi possível registrar a avaliação agora."),
  });

  async function selecionarImagem(file?: File) {
    if (!file) return;
    try {
      setImagem(await lerImagem(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Imagem inválida.");
    }
  }

  function enviar(pergunta: string) {
    const texto = pergunta.trim();
    if (!texto || consulta.isPending) return;
    setMensagens((atual) => [...atual, { role: "user", content: texto }]);
    consulta.mutate({
      pergunta: texto,
      assunto,
      imagemBase64: imagem?.base64,
      mimeType: imagem?.mimeType,
    });
  }

  return (
    <main className="min-h-screen bg-slate-950 pb-28 text-slate-100">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/95 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <button type="button" onClick={() => navigate("/tecnico")} aria-label="Voltar ao início" className="grid h-10 w-10 place-items-center rounded-2xl bg-white/5 text-slate-200 active:scale-95"><ArrowLeft className="h-5 w-5" /></button>
          <div className="min-w-0 flex-1"><p className="text-xs font-bold uppercase tracking-[0.16em] text-cyan-300">Netvius em campo</p><h1 className="truncate text-xl font-black text-white">Assistente Técnico</h1></div>
          <ShieldCheck className="h-6 w-6 text-emerald-300" aria-label="Orientação com limites de segurança" />
        </div>
      </header>

      <section className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <div className="rounded-3xl border border-cyan-300/15 bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,.16),transparent_40%),linear-gradient(145deg,#10233d,#0a1425)] p-5">
          <h2 className="text-lg font-black text-white">Orientação técnica com segurança</h2>
          <p className="mt-1 text-sm leading-5 text-slate-300">Descreva o cenário, escolha um assunto e, se necessário, anexe uma foto. A imagem é higienizada e usada somente nesta consulta; ela não fica armazenada nesta conversa.</p>
          <div className="mt-4 flex flex-wrap gap-2" aria-label="Assunto da consulta">
            {assuntos.map((item) => <button key={item.id} type="button" onClick={() => setAssunto(item.id)} className="rounded-full px-3 py-2 text-xs font-bold transition" style={{ background: assunto === item.id ? "rgba(34,211,238,.2)" : "rgba(255,255,255,.05)", color: assunto === item.id ? "#a5f3fc" : "#cbd5e1", border: `1px solid ${assunto === item.id ? "rgba(34,211,238,.35)" : "rgba(255,255,255,.08)"}` }}>{item.label}</button>)}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <input ref={cameraRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={(event) => void selecionarImagem(event.target.files?.[0])} />
            <input ref={galleryRef} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => void selecionarImagem(event.target.files?.[0])} />
            <button type="button" onClick={() => cameraRef.current?.click()} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-100"><Camera className="h-4 w-4 text-cyan-200" />Tirar foto</button>
            <button type="button" onClick={() => galleryRef.current?.click()} className="inline-flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-bold text-slate-100"><ImagePlus className="h-4 w-4 text-cyan-200" />Escolher foto</button>
          </div>
          {imagem && <div className="mt-4 flex items-center gap-3 rounded-2xl border border-cyan-300/20 bg-slate-950/40 p-2"><img className="h-16 w-20 rounded-xl object-cover" src={imagem.preview} alt="Prévia da foto temporária" /><p className="min-w-0 flex-1 truncate text-xs text-slate-300">{imagem.nome}<br /><span className="text-emerald-300">Será apagada da tela depois da resposta.</span></p><button type="button" onClick={() => setImagem(null)} aria-label="Remover foto" className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-slate-200"><Trash2 className="h-4 w-4" /></button></div>}
        </div>

        <AIChatBox messages={mensagens} onSendMessage={enviar} isLoading={consulta.isPending} height="480px" className="border-white/10 bg-slate-900 text-slate-100" placeholder="Ex.: O AP adota, mas os clientes não recebem IP. O que verifico primeiro?" emptyStateMessage="Envie uma dúvida técnica para receber um roteiro seguro." suggestedPrompts={["Meu AP liga, mas não aparece no controlador. O que verifico?", "Como identificar uma falha básica de PoE sem assumir o modelo do equipamento?", "Quais verificações seguras faço antes de mexer em uma fibra?"]} />

        {versaoBase && <section className="flex flex-wrap items-center justify-between gap-3 rounded-3xl border border-white/10 bg-white/[.035] p-4"><p className="text-sm text-slate-300">Esta orientação ajudou você?</p><div className="flex gap-2"><button type="button" disabled={avaliar.isPending || avaliacao !== null} onClick={() => { setAvaliacao(true); avaliar.mutate({ ajudou: true, versaoBase }); }} className="rounded-xl bg-emerald-400/15 px-3 py-2 text-xs font-bold text-emerald-200 disabled:opacity-50">Sim</button><button type="button" disabled={avaliar.isPending || avaliacao !== null} onClick={() => { setAvaliacao(false); avaliar.mutate({ ajudou: false, versaoBase }); }} className="rounded-xl bg-white/10 px-3 py-2 text-xs font-bold text-slate-200 disabled:opacity-50">Ainda não</button></div></section>}

        <aside className="rounded-3xl border border-amber-300/20 bg-amber-300/10 p-4 text-sm text-amber-50"><div className="flex gap-2"><AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-200" /><p>Em caso de energia, altura, fibra, aquecimento, cheiro de queimado ou risco físico, interrompa a atividade e acione o responsável técnico.</p></div></aside>

        <section className="rounded-3xl border border-white/10 bg-white/[.035] p-4"><h2 className="text-sm font-black text-white">Guias locais para campo</h2><p className="mt-1 text-xs text-slate-400">Disponíveis no aplicativo mesmo quando a rede estiver instável.</p><div className="mt-3 grid gap-2"><details className="rounded-2xl bg-slate-950/45 p-3"><summary className="cursor-pointer text-sm font-bold text-cyan-200">AP não aparece no controlador</summary><ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-5 text-slate-300"><li>Confirme alimentação e LED sem abrir o equipamento energizado.</li><li>Verifique o enlace físico e se a porta tem a VLAN prevista no projeto.</li><li>Confirme endereço do controlador e alcance de rede antes de tentar adoção.</li><li>Sem modelo, firmware ou topologia confirmados, consulte o manual oficial.</li></ol></details><details className="rounded-2xl bg-slate-950/45 p-3"><summary className="cursor-pointer text-sm font-bold text-cyan-200">Suspeita de falha de PoE</summary><ol className="mt-2 list-decimal space-y-1 pl-4 text-xs leading-5 text-slate-300"><li>Não force conexões nem altere a fonte sem autorização.</li><li>Confira etiqueta, potência prevista e integridade do cabo.</li><li>Se houver aquecimento, cheiro de queimado ou dano, interrompa e escale.</li></ol></details></div></section>

        {fontes.length > 0 && <section className="rounded-3xl border border-white/10 bg-white/[.035] p-4"><h2 className="text-sm font-black text-white">Fontes disponíveis nesta orientação</h2><div className="mt-3 space-y-2">{fontes.map((fonte) => <a key={fonte.id} href={fonte.url} target="_blank" rel="noreferrer" className="block rounded-2xl bg-white/[.035] p-3 text-sm text-cyan-200"><strong className="block text-slate-100">{fonte.titulo}</strong><span className="mt-1 block text-xs text-slate-400">{fonte.uso}</span></a>)}</div></section>}
      </section>
      <TecnicoBottomNav />
    </main>
  );
}
