import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import { trpc } from "@/lib/trpc";
import {
  AlertTriangle, Bot, Building2, Cable, Camera, FileCheck2,
  Image as ImageIcon, Loader2, Router, Send,
  ShieldCheck, Sparkles, TestTube2, Wifi, X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { useLocation } from "wouter";

const SITUACOES = [
  { value: "vistoria_rede_externa", label: "Rede externa", icon: Wifi },
  { value: "roteador_modem", label: "Roteador", icon: Router },
  { value: "rack_equipamentos", label: "Rack", icon: Building2 },
  { value: "cabeamento", label: "Cabeamento", icon: Cable },
  { value: "ap_cobertura", label: "AP/Cobertura", icon: Sparkles },
  { value: "travessia_blocos", label: "Travessia", icon: AlertTriangle },
  { value: "testes", label: "Testes", icon: TestTube2 },
  { value: "evidencias_as_built", label: "As-built", icon: FileCheck2 },
  { value: "seguranca", label: "Segurança", icon: ShieldCheck },
] as const;

type Situacao = typeof SITUACOES[number]["value"];
type ChatItem = { role: "user" | "assistant"; text: string; image?: string };
type PreparedImage = { preview: string; base64: string; mimeType: "image/jpeg" | "image/png" | "image/webp" };

async function prepareImage(file: File): Promise<PreparedImage> {
  if (file.size > 20 * 1024 * 1024) throw new Error("A foto original deve ter no máximo 20 MB");
  const objectUrl = URL.createObjectURL(file);
  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const img = new window.Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error("Formato não aceito para análise. Use JPG, PNG ou WebP."));
      img.src = objectUrl;
    });
    const maxSide = 1600;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext("2d")?.drawImage(image, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
    return { preview: dataUrl, base64: dataUrl.split(",")[1], mimeType: "image/jpeg" };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export default function AssistenteEace() {
  const [, navigate] = useLocation();
  const fileInput = useRef<HTMLInputElement>(null);
  const cameraInput = useRef<HTMLInputElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const [tecnicoId, setTecnicoId] = useState(0);
  const [situacao, setSituacao] = useState<Situacao>("vistoria_rede_externa");
  const [escolaId, setEscolaId] = useState<string>(() => {
    const value = localStorage.getItem("assistente_eace_escola_id") ?? "";
    localStorage.removeItem("assistente_eace_escola_id");
    return value;
  });
  const [question, setQuestion] = useState("");
  const [image, setImage] = useState<PreparedImage | null>(null);
  const [history, setHistory] = useState<ChatItem[]>([
    { role: "assistant", text: "Descreva a situação ou envie uma foto. Eu separo o que é visível do que ainda precisa ser medido e apresento opções com riscos, validação e evidências necessárias." },
  ]);

  useEffect(() => {
    const stored = Number(localStorage.getItem("tecnico_id") ?? 0);
    if (!stored) navigate("/tecnico/login");
    else setTecnicoId(stored);
  }, [navigate]);

  const { data: schools = [] } = trpc.tecnicoAuth.minhasEscolas.useQuery(
    { tecnicoId },
    { enabled: tecnicoId > 0, staleTime: 15 * 60 * 1000, refetchOnWindowFocus: false },
  );
  const { data: sourceInfo } = trpc.assistenteEace.fontes.useQuery(undefined, { enabled: tecnicoId > 0, staleTime: Infinity });
  const analyze = trpc.assistenteEace.analisar.useMutation({
    onSuccess: data => {
      setHistory(prev => [...prev, { role: "assistant", text: data.resposta }]);
      setImage(null);
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }));
    },
    onError: error => {
      toast.error(error.message);
      setHistory(prev => [...prev, { role: "assistant", text: "Não consegui analisar agora. Preserve as evidências, não improvise uma solução de risco e tente novamente quando houver conexão." }]);
    },
  });

  async function onImageSelected(file?: File) {
    if (!file) return;
    try {
      setImage(await prepareImage(file));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível ler a foto");
    }
  }

  function send() {
    const text = question.trim();
    if (!text && !image) return toast.error("Descreva a situação ou envie uma foto");
    const prompt = text || "Analise esta foto e apresente as opções seguras para esta situação.";
    const previous = history.filter(item => item.text).slice(-6);
    setHistory(prev => [...prev, { role: "user", text: prompt, image: image?.preview }]);
    setQuestion("");
    analyze.mutate({
      pergunta: prompt,
      situacao,
      escolaId: escolaId ? Number(escolaId) : undefined,
      imageBase64: image?.base64,
      mimeType: image?.mimeType,
      historico: previous.map(item => ({ role: item.role, content: item.text.slice(0, 1600) })),
    });
  }

  return (
    <div className="min-h-screen pb-28 text-white" style={{ background: "linear-gradient(160deg,#040a16 0%,#0a1830 52%,#081426 100%)" }}>
      <header className="sticky top-0 z-20 border-b border-white/5 bg-[#040a16]/90 px-4 py-4 backdrop-blur-xl">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-700 shadow-lg shadow-cyan-500/20"><Bot className="h-6 w-6" /></div>
          <div className="min-w-0 flex-1"><h1 className="font-black">Assistente Técnico EACE</h1><p className="text-xs text-slate-400">Aprender Conectado · análise sem suposições</p></div>
          <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">BASE PÚBLICA</span>
        </div>
      </header>

      <main className="mx-auto max-w-3xl space-y-4 px-4 py-5">
        <section className="rounded-2xl border border-white/8 bg-white/[0.035] p-3">
          <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-500">Escola (opcional)</p>
          <select value={escolaId} onChange={event => setEscolaId(event.target.value)} className="h-11 w-full rounded-xl border border-white/10 bg-[#0b1930] px-3 text-sm text-slate-200 outline-none">
            <option value="">Análise geral, sem escola</option>
            {schools.map(school => <option key={school.id} value={school.id}>{school.inep} · {school.nome}</option>)}
          </select>
        </section>

        <section className="overflow-x-auto pb-1">
          <div className="flex min-w-max gap-2">
            {SITUACOES.map(item => {
              const Icon = item.icon;
              const active = situacao === item.value;
              return <button key={item.value} onClick={() => setSituacao(item.value)} className="flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition" style={{ borderColor: active ? "rgba(34,211,238,.5)" : "rgba(255,255,255,.08)", background: active ? "rgba(34,211,238,.12)" : "rgba(255,255,255,.025)", color: active ? "#67e8f9" : "#94a3b8" }}><Icon className="h-3.5 w-3.5" />{item.label}</button>;
            })}
          </div>
        </section>

        <section className="space-y-3">
          {history.map((item, index) => (
            <div key={index} className={`flex ${item.role === "user" ? "justify-end" : "justify-start"}`}>
              <div className="max-w-[92%] rounded-2xl border px-4 py-3 text-sm leading-relaxed" style={{ background: item.role === "user" ? "linear-gradient(135deg,#155e75,#1d4ed8)" : "rgba(255,255,255,.045)", borderColor: item.role === "user" ? "rgba(103,232,249,.22)" : "rgba(255,255,255,.07)" }}>
                {item.image && <img src={item.image} alt="Situação enviada" className="mb-3 max-h-72 w-full rounded-xl object-contain bg-black/20" />}
                <p className="whitespace-pre-wrap">{item.text}</p>
              </div>
            </div>
          ))}
          {analyze.isPending && <div className="flex justify-start"><div className="flex items-center gap-2 rounded-2xl border border-white/5 bg-white/[0.04] px-4 py-3 text-sm text-slate-400"><Loader2 className="h-4 w-4 animate-spin text-cyan-400" />Comparando evidências e opções…</div></div>}
          <div ref={bottomRef} />
        </section>

        <section className="sticky bottom-24 rounded-2xl border border-white/10 bg-[#081426]/95 p-3 shadow-2xl backdrop-blur-xl">
          {image && <div className="mb-3 flex items-start gap-2 rounded-xl border border-cyan-400/20 bg-cyan-400/5 p-2"><img src={image.preview} alt="Foto pronta para análise" className="h-20 w-24 rounded-lg object-cover" /><div className="flex-1 text-xs text-cyan-100"><p className="font-bold">Foto pronta</p><p className="mt-1 text-cyan-200/60">A resposta distinguirá observação de hipótese.</p></div><button onClick={() => setImage(null)} className="rounded-lg p-1 text-slate-400"><X className="h-4 w-4" /></button></div>}
          <textarea value={question} onChange={event => setQuestion(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); send(); } }} rows={3} placeholder="Ex.: preciso atravessar do bloco A para o B; o que devo medir e quais opções comparar?" className="w-full resize-none bg-transparent px-1 text-sm text-white outline-none placeholder:text-slate-600" />
          <div className="mt-2 flex items-center gap-2 border-t border-white/5 pt-2">
            <button onClick={() => cameraInput.current?.click()} className="flex h-10 items-center gap-1.5 rounded-xl border border-white/8 px-3 text-xs font-bold text-slate-300"><Camera className="h-4 w-4 text-cyan-400" />Câmera</button>
            <button onClick={() => fileInput.current?.click()} className="flex h-10 items-center gap-1.5 rounded-xl border border-white/8 px-3 text-xs font-bold text-slate-300"><ImageIcon className="h-4 w-4 text-violet-400" />Galeria</button>
            <button onClick={send} disabled={analyze.isPending || (!question.trim() && !image)} className="ml-auto flex h-10 items-center gap-2 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 px-4 text-xs font-black disabled:opacity-40"><Send className="h-4 w-4" />Analisar</button>
          </div>
          <p className="mt-2 text-[10px] leading-relaxed text-slate-600">A pergunta e a foto são enviadas ao provedor de IA configurado. Não fotografe pessoas, senhas, chaves ou dados pessoais desnecessários.</p>
          <input ref={cameraInput} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={event => void onImageSelected(event.target.files?.[0])} />
          <input ref={fileInput} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => void onImageSelected(event.target.files?.[0])} />
        </section>

        <details className="rounded-xl border border-white/5 bg-white/[0.025] p-3 text-xs text-slate-500">
          <summary className="cursor-pointer font-bold text-slate-400">Fontes e limite da orientação</summary>
          <p className="mt-2">{sourceInfo?.aviso ?? "Confira o projeto, contrato e POP vigentes."}</p>
          <ul className="mt-2 space-y-1">{sourceInfo?.fontes.map(source => <li key={source.url}><a className="text-cyan-500 hover:underline" href={source.url} target="_blank" rel="noreferrer">{source.titulo}</a></li>)}</ul>
        </details>
      </main>
      <TecnicoBottomNav />
    </div>
  );
}
