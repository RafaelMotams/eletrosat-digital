import { useState, useRef } from "react";
import { trpc } from "@/lib/trpc";
import TecnicoBottomNav from "@/components/TecnicoBottomNav";
import { toast } from "sonner";
import {
  Wrench, Search, X, ChevronRight, MapPin, Hash,
  Camera, CheckCircle, Clock, AlertCircle, RefreshCw,
  Building2, ArrowLeft, Loader2, Phone, Zap, Navigation,
  MessageCircle, Bot, Send, ChevronDown, ChevronUp,
} from "lucide-react";

// ── Helpers ──────────────────────────────────────────────────────────────────
function getTecnicoId(): number {
  return parseInt(localStorage.getItem("tecnico_id") ?? "0");
}

function compressImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX = 1200;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) { height = Math.round((height * MAX) / width); width = MAX; }
          else { width = Math.round((width * MAX) / height); height = MAX; }
        }
        canvas.width = width; canvas.height = height;
        canvas.getContext("2d")!.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.82).split(",")[1]);
      };
      img.onerror = reject;
      img.src = e.target!.result as string;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

const STATUS_STYLE: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
  pendente:     { label: "Pendente",     color: "#f59e0b", bg: "rgba(245,158,11,0.12)",  icon: Clock },
  em_andamento: { label: "Em Andamento", color: "#3b82f6", bg: "rgba(59,130,246,0.12)",  icon: RefreshCw },
  concluida:    { label: "Concluída",    color: "#10b981", bg: "rgba(16,185,129,0.12)",  icon: CheckCircle },
};

// ── Componente Assistente IA ──────────────────────────────────────────────────
function AssistenteIA({ manutencaoId }: { manutencaoId: number }) {
  const [aberto, setAberto] = useState(false);
  const [pergunta, setPergunta] = useState("");
  const [historico, setHistorico] = useState<{ role: "user" | "ai"; text: string }[]>([]);
  const [fotoSelecionada, setFotoSelecionada] = useState<string | null>(null);
  const detalhesQuery = trpc.manutencao.getById.useQuery({ id: manutencaoId }, { enabled: aberto });
  const assistenteMut = trpc.manutencao.assistenteIA.useMutation({
    onSuccess: (data) => {
      setHistorico(prev => [...prev, { role: "ai", text: data.resposta }]);
    },
    onError: (e) => toast.error(e.message),
  });
  const analisarFotoMut = trpc.manutencao.analisarFotoIA.useMutation({
    onSuccess: (data) => setHistorico(prev => [...prev, { role: "ai", text: data.resposta }]),
    onError: (e) => toast.error(e.message),
  });

  async function handleEnviar() {
    if (!pergunta.trim()) return;
    const p = pergunta.trim();
    setHistorico(prev => [...prev, { role: "user", text: p }]);
    setPergunta("");
    assistenteMut.mutate({ manutencaoId, pergunta: p });
  }

  function handleAnalisarFoto() {
    if (!fotoSelecionada) return toast.error("Escolha uma foto desta manutenção.");
    const p = pergunta.trim() || "Analise a foto e indique a próxima verificação segura.";
    setHistorico(prev => [...prev, { role: "user", text: `Análise de foto: ${p}` }]);
    setPergunta("");
    analisarFotoMut.mutate({ manutencaoId, fotoUrl: fotoSelecionada, pergunta: p });
  }

  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)" }}>
      {/* Header clicável */}
      <button
        onClick={() => setAberto(v => !v)}
        className="w-full flex items-center gap-3 p-4"
      >
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "linear-gradient(135deg, #7c3aed, #a855f7)" }}>
          <Bot className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 text-left">
          <p className="text-sm font-bold text-white">Assistente Técnico</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Dúvidas sobre a instalação? Pergunte aqui</p>
        </div>
        {aberto ? (
          <ChevronUp className="w-4 h-4" style={{ color: "rgba(139,92,246,0.7)" }} />
        ) : (
          <ChevronDown className="w-4 h-4" style={{ color: "rgba(139,92,246,0.7)" }} />
        )}
      </button>

      {/* Conteúdo */}
      {aberto && (
        <div className="px-4 pb-4">
          {/* Histórico */}
          {historico.length > 0 && (
            <div className="space-y-3 mb-3 max-h-64 overflow-y-auto">
              {historico.map((h, i) => (
                <div key={i} className={`flex ${h.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className="max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed"
                    style={{
                      background: h.role === "user"
                        ? "linear-gradient(135deg, #7c3aed, #a855f7)"
                        : "rgba(255,255,255,0.07)",
                      color: "white",
                    }}
                  >
                    {h.role === "ai" && (
                      <div className="flex items-center gap-1.5 mb-1">
                        <Bot className="w-3 h-3" style={{ color: "#a855f7" }} />
                        <span className="text-xs font-bold" style={{ color: "#a855f7" }}>Assistente</span>
                      </div>
                    )}
                    <p style={{ whiteSpace: "pre-wrap" }}>{h.text}</p>
                  </div>
                </div>
              ))}
              {assistenteMut.isPending && (
                <div className="flex justify-start">
                  <div className="rounded-2xl px-3 py-2" style={{ background: "rgba(255,255,255,0.07)" }}>
                    <Loader2 className="w-4 h-4 animate-spin" style={{ color: "#a855f7" }} />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Sugestões rápidas */}
          {historico.length === 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {[
                "Como configurar o AP?",
                "Problema de sinal fraco",
                "Switch não liga",
                "Nobreak com defeito",
              ].map(s => (
                <button
                  key={s}
                  onClick={() => { setPergunta(s); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-medium"
                  style={{ background: "rgba(139,92,246,0.15)", color: "#c4b5fd", border: "1px solid rgba(139,92,246,0.25)" }}
                >
                  {s}
                </button>
              ))}
            </div>
          )}

          {detalhesQuery.data?.fotos?.length ? (
            <div className="mb-3 rounded-xl p-3" style={{ background: "rgba(255,255,255,0.045)", border: "1px solid rgba(139,92,246,0.18)" }}>
              <p className="mb-2 text-xs font-bold" style={{ color: "#ddd6fe" }}>Analisar foto já enviada</p>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {detalhesQuery.data.fotos.map((foto: any) => (
                  <button key={foto.id ?? foto.url} onClick={() => setFotoSelecionada(foto.url)} className="shrink-0 overflow-hidden rounded-lg" style={{ outline: fotoSelecionada === foto.url ? "2px solid #a855f7" : "1px solid rgba(255,255,255,.14)" }}>
                    <img src={foto.url} alt={`Foto de ${foto.tipo ?? "manutenção"}`} className="h-14 w-14 object-cover" />
                  </button>
                ))}
              </div>
              <p className="mt-2 text-[11px] leading-relaxed" style={{ color: "rgba(255,255,255,.5)" }}>A análise indica hipóteses e o próximo teste seguro; não substitui avaliação presencial nem orientação do responsável técnico.</p>
            </div>
          ) : null}

          {/* Input */}
          <div className="flex gap-2">
            <input
              value={pergunta}
              onChange={e => setPergunta(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleEnviar(); } }}
              placeholder="Descreva o problema técnico..."
              className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                background: "rgba(255,255,255,0.07)",
                border: "1px solid rgba(139,92,246,0.25)",
                color: "white",
              }}
            />
            <button
              onClick={handleEnviar}
              disabled={!pergunta.trim() || assistenteMut.isPending || analisarFotoMut.isPending}
              className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{
                background: pergunta.trim() ? "linear-gradient(135deg, #7c3aed, #a855f7)" : "rgba(255,255,255,0.07)",
              }}
            >
              {assistenteMut.isPending || analisarFotoMut.isPending
                ? <Loader2 className="w-4 h-4 animate-spin text-white" />
                : <Send className="w-4 h-4 text-white" />
              }
            </button>
          </div>
          {fotoSelecionada && <button onClick={handleAnalisarFoto} disabled={analisarFotoMut.isPending} className="mt-2 w-full rounded-xl py-2 text-xs font-bold text-white disabled:opacity-50" style={{ background: "rgba(139,92,246,.22)", border: "1px solid rgba(168,85,247,.35)" }}>{analisarFotoMut.isPending ? "Analisando foto..." : "Analisar foto selecionada"}</button>}
        </div>
      )}
    </div>
  );
}

// ── Tela de detalhe / conclusão ───────────────────────────────────────────────
function DetalheManutencao({ id, tecnicoId, onVoltar }: { id: number; tecnicoId: number; onVoltar: () => void }) {
  const utils = trpc.useUtils();
  const { data: m, isLoading } = trpc.manutencao.getById.useQuery({ id });
  const [obs, setObs] = useState("");
  const [kmRodado, setKmRodado] = useState("");
  const [fotos, setFotos] = useState<{ tipo: "defeito" | "conclusao"; preview: string; base64: string; mime: string; clientId: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [viewFoto, setViewFoto] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [fotoTipo, setFotoTipo] = useState<"defeito" | "conclusao">("defeito");

  const iniciarMut = trpc.manutencao.iniciar.useMutation({
    onSuccess: () => { utils.manutencao.getById.invalidate({ id }); toast.success("Manutenção iniciada!"); },
    onError: (e) => toast.error(e.message),
  });

  const uploadFotoMut = trpc.manutencao.uploadFoto.useMutation();

  const concluirMut = trpc.manutencao.concluir.useMutation({
    onSuccess: () => {
      utils.manutencao.minhas.invalidate();
      utils.manutencao.getById.invalidate({ id });
      toast.success("Manutenção concluída! Saindo da lista...");
      setTimeout(onVoltar, 1200);
    },
    onError: (e) => toast.error(e.message),
  });

  async function handleAddFoto(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const base64 = await compressImage(file);
    const preview = `data:image/jpeg;base64,${base64}`;
    const clientId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setFotos(prev => [...prev, { tipo: fotoTipo, preview, base64, mime: "image/jpeg", clientId }]);
    e.target.value = "";
  }

  async function handleConcluir() {
    if (obs.trim().length < 5) { toast.error("Observação obrigatória (mínimo 5 caracteres)"); return; }
    const km = Number(kmRodado.replace(",", "."));
    if (!kmRodado.trim() || !Number.isFinite(km) || km < 0) {
      toast.error("Informe a quilometragem percorrida para concluir a manutenção");
      return;
    }
    setUploading(true);
    try {
      for (const f of fotos) {
        await uploadFotoMut.mutateAsync({ manutencaoId: id, tipo: f.tipo, base64: f.base64, mimeType: f.mime, clientId: f.clientId });
      }
      await concluirMut.mutateAsync({ id, tecnicoId, observacaoConclusao: obs, quilometragem: km });
    } catch (e: any) {
      toast.error(e.message ?? "Erro ao concluir");
    } finally {
      setUploading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "#040a16" }}>
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: "#f97316" }} />
      </div>
    );
  }
  if (!m) return null;

  const st = STATUS_STYLE[m.status] ?? STATUS_STYLE.pendente;
  const Icon = st.icon;
  const isConcluida = m.status === "concluida";
  const escola = (m as any).escola;
  const kmInformado = Number(kmRodado.replace(",", "."));
  const kmValido = kmRodado.trim() !== "" && Number.isFinite(kmInformado) && kmInformado >= 0;
  const valorTotalAtual = 200 + (kmValido ? kmInformado * 2.5 : 0);
  const formatCurrency = (valor: number) => valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  // Google Maps URL
  const mapsUrl = escola?.latitude && escola?.longitude
    ? `https://www.google.com/maps?q=${escola.latitude},${escola.longitude}`
    : escola?.endereco
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(escola.endereco + ', ' + (escola.municipio ?? ''))}`
    : null;

  // WhatsApp URL
  const whatsappNumero = escola?.telefoneWhatsApp || escola?.telefone;
  const whatsappUrl = whatsappNumero
    ? `https://wa.me/55${whatsappNumero.replace(/\D/g, "")}`
    : null;

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#040a16", color: "white" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-12 pb-4 flex items-center gap-3"
        style={{ background: "rgba(4,10,22,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={onVoltar} className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
          <ArrowLeft className="w-5 h-5" style={{ color: "rgba(255,255,255,0.7)" }} />
        </button>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">Ordem #{m.id}</p>
          <p className="text-xs" style={{ color: "rgba(255,255,255,0.45)" }}>Detalhes da manutenção</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl" style={{ background: st.bg }}>
          <Icon className="w-3.5 h-3.5" style={{ color: st.color }} />
          <span className="text-xs font-bold" style={{ color: st.color }}>{st.label}</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 pb-32">
        {/* Escola + Localização */}
        <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.15)" }}>
              <Building2 className="w-4 h-4" style={{ color: "#f97316" }} />
            </div>
            <p className="text-xs font-bold uppercase tracking-wider" style={{ color: "rgba(255,255,255,0.4)" }}>Local</p>
          </div>
          <p className="font-bold text-white text-base leading-tight">{escola?.nome}</p>
          {escola?.inep && (
            <div className="flex items-center gap-1.5 mt-1.5">
              <Hash className="w-3 h-3" style={{ color: "rgba(255,255,255,0.35)" }} />
              <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.5)" }}>INEP {escola.inep}</span>
            </div>
          )}
          {escola?.municipio && (
            <div className="flex items-center gap-1.5 mt-1">
              <MapPin className="w-3 h-3" style={{ color: "rgba(255,255,255,0.35)" }} />
              <span className="text-xs" style={{ color: "rgba(255,255,255,0.5)" }}>{escola.municipio}</span>
            </div>
          )}
          {escola?.endereco && (
            <p className="text-xs mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>{escola.endereco}</p>
          )}

          {/* Velocidade ofertada */}
          {escola?.velocidadeOfertada && (
            <div className="flex items-center gap-2 mt-3 px-3 py-2 rounded-xl" style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <Zap className="w-3.5 h-3.5" style={{ color: "#10b981" }} />
              <span className="text-xs font-bold" style={{ color: "#10b981" }}>Velocidade ofertada: {escola.velocidadeOfertada}</span>
            </div>
          )}

          {/* Botões de ação rápida */}
          <div className="flex gap-2 mt-3">
            {mapsUrl && (
              <a
                href={mapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa", border: "1px solid rgba(59,130,246,0.25)" }}
              >
                <Navigation className="w-3.5 h-3.5" />
                Ver no Maps
              </a>
            )}
            {whatsappUrl && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: "rgba(37,211,102,0.12)", color: "#25d366", border: "1px solid rgba(37,211,102,0.25)" }}
              >
                <MessageCircle className="w-3.5 h-3.5" />
                WhatsApp
              </a>
            )}
            {!whatsappUrl && escola?.telefone && (
              <a
                href={`tel:${escola.telefone}`}
                className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(255,255,255,0.7)", border: "1px solid rgba(255,255,255,0.1)" }}
              >
                <Phone className="w-3.5 h-3.5" />
                Ligar
              </a>
            )}
          </div>

          {/* Botão Iniciar Rota separado */}
          {mapsUrl && (
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${escola?.latitude && escola?.longitude ? `${escola.latitude},${escola.longitude}` : encodeURIComponent((escola?.endereco ?? '') + ', ' + (escola?.municipio ?? ''))}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold"
              style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", color: "white", boxShadow: "0 4px 16px rgba(59,130,246,0.3)" }}
            >
              <Navigation className="w-4 h-4" />
              Iniciar Rota
            </a>
          )}
        </div>

        {/* Problema */}
        <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
          <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>Descrição do Problema</p>
          <p className="text-sm text-white leading-relaxed">{m.descricaoProblema}</p>
        </div>

        {/* Assistente IA */}
        <AssistenteIA manutencaoId={id} />

        {/* Fotos existentes */}
        {(m as any).fotos && (m as any).fotos.length > 0 && (
          <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>
              Fotos ({(m as any).fotos.length})
            </p>
            <div className="grid grid-cols-3 gap-2">
              {(m as any).fotos.map((f: any) => (
                <button key={f.id} onClick={() => setViewFoto(f.url)} className="relative rounded-xl overflow-hidden aspect-square">
                  <img src={f.url} alt={f.tipo} className="w-full h-full object-cover" />
                  <div className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded-lg text-[9px] font-bold"
                    style={{ background: f.tipo === "defeito" ? "rgba(239,68,68,0.85)" : "rgba(16,185,129,0.85)" }}>
                    {f.tipo === "defeito" ? "DEFEITO" : "CONCLUSÃO"}
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Observação de conclusão (se já concluída) */}
        {isConcluida && m.observacaoConclusao && (
          <div className="rounded-2xl p-4" style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.2)" }}>
            <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#10b981" }}>Observação de Conclusão</p>
            <p className="text-sm text-white leading-relaxed">{m.observacaoConclusao}</p>
          </div>
        )}

        {/* Ações (se não concluída) */}
        {!isConcluida && (
          <>
            {/* Iniciar se pendente */}
            {m.status === "pendente" && (
              <button
                onClick={() => iniciarMut.mutate({ id, tecnicoId })}
                disabled={iniciarMut.isPending}
                className="w-full py-3.5 rounded-2xl font-bold text-sm flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", color: "white" }}
              >
                {iniciarMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                Iniciar Manutenção
              </button>
            )}

            {/* Fotos novas */}
            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-3" style={{ color: "rgba(255,255,255,0.4)" }}>Adicionar Fotos</p>
              <div className="flex gap-2 mb-3">
                {(["defeito", "conclusao"] as const).map(t => (
                  <button key={t} onClick={() => setFotoTipo(t)}
                    className="flex-1 py-2 rounded-xl text-xs font-bold transition-all"
                    style={{
                      background: fotoTipo === t ? (t === "defeito" ? "rgba(239,68,68,0.2)" : "rgba(16,185,129,0.2)") : "rgba(255,255,255,0.05)",
                      color: fotoTipo === t ? (t === "defeito" ? "#ef4444" : "#10b981") : "rgba(255,255,255,0.4)",
                      border: `1px solid ${fotoTipo === t ? (t === "defeito" ? "rgba(239,68,68,0.4)" : "rgba(16,185,129,0.4)") : "transparent"}`,
                    }}>
                    {t === "defeito" ? "📷 Defeito" : "✅ Conclusão"}
                  </button>
                ))}
              </div>
              <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleAddFoto} />
              <button onClick={() => fileRef.current?.click()}
                className="w-full py-3 rounded-xl border-2 border-dashed flex items-center justify-center gap-2 text-sm font-medium"
                style={{ borderColor: "rgba(255,255,255,0.12)", color: "rgba(255,255,255,0.5)" }}>
                <Camera className="w-4 h-4" />
                Tirar foto ({fotoTipo === "defeito" ? "do defeito" : "após conclusão"})
              </button>
              {fotos.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mt-3">
                  {fotos.map((f, i) => (
                    <div key={i} className="relative rounded-xl overflow-hidden aspect-square">
                      <img src={f.preview} alt={f.tipo} className="w-full h-full object-cover" />
                      <button onClick={() => setFotos(prev => prev.filter((_, j) => j !== i))}
                        className="absolute top-1 right-1 w-5 h-5 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.7)" }}>
                        <X className="w-3 h-3 text-white" />
                      </button>
                      <div className="absolute bottom-1 left-1 px-1 py-0.5 rounded text-[8px] font-bold"
                        style={{ background: f.tipo === "defeito" ? "rgba(239,68,68,0.85)" : "rgba(16,185,129,0.85)" }}>
                        {f.tipo === "defeito" ? "DEF" : "CON"}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Quilometragem e remuneração */}
            <div className="rounded-2xl p-4" style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "#6ee7b7" }}>Quilometragem percorrida <span style={{ color: "#fca5a5" }}>*</span></p>
              <div className="flex items-center gap-3">
                <input
                  value={kmRodado}
                  onChange={e => setKmRodado(e.target.value)}
                  inputMode="decimal"
                  placeholder="Ex.: 50"
                  className="min-w-0 flex-1 rounded-xl px-3 py-3 text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.12)", color: "white" }}
                />
                <span className="text-sm font-bold" style={{ color: "rgba(255,255,255,0.6)" }}>km</span>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.05)" }}><span style={{ color: "rgba(255,255,255,0.45)" }}>Valor fixo</span><p className="mt-1 font-extrabold text-white">R$ 200,00</p></div>
                <div className="rounded-xl p-2.5" style={{ background: "rgba(255,255,255,0.05)" }}><span style={{ color: "rgba(255,255,255,0.45)" }}>Total estimado</span><p className="mt-1 font-extrabold" style={{ color: "#6ee7b7" }}>{formatCurrency(valorTotalAtual)}</p></div>
              </div>
              <p className="mt-2 text-[11px]" style={{ color: kmValido ? "rgba(255,255,255,0.45)" : "#fca5a5" }}>{kmValido ? `R$ 200,00 + ${kmInformado.toLocaleString("pt-BR")} km × R$ 2,50 = ${formatCurrency(valorTotalAtual)}` : "Informe o total de quilômetros percorridos."}</p>
            </div>

            {/* Observação obrigatória */}
            <div className="rounded-2xl p-4" style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <p className="text-xs font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(255,255,255,0.4)" }}>
                Observação de Conclusão <span style={{ color: "#ef4444" }}>*</span>
              </p>
              <textarea
                value={obs}
                onChange={e => setObs(e.target.value)}
                placeholder="Descreva o que foi feito, peças trocadas, resultado..."
                rows={4}
                className="w-full rounded-xl px-3 py-2.5 text-sm resize-none outline-none"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
              />
              <p className="text-xs mt-1" style={{ color: obs.length < 5 ? "#ef4444" : "rgba(255,255,255,0.3)" }}>
                {obs.length} caracteres (mínimo 5)
              </p>
            </div>

            {/* Botão concluir */}
            <button
              onClick={handleConcluir}
              disabled={uploading || concluirMut.isPending || obs.trim().length < 5 || !kmValido}
              className="w-full py-4 rounded-2xl font-black text-base flex items-center justify-center gap-2 transition-all active:scale-95"
              style={{
                background: obs.trim().length >= 5 && kmValido ? "linear-gradient(135deg, #059669, #10b981)" : "rgba(255,255,255,0.06)",
                color: obs.trim().length >= 5 && kmValido ? "white" : "rgba(255,255,255,0.25)",
                boxShadow: obs.trim().length >= 5 && kmValido ? "0 8px 32px rgba(16,185,129,0.35)" : "none",
              }}
            >
              {(uploading || concluirMut.isPending)
                ? <><Loader2 className="w-5 h-5 animate-spin" /> Concluindo...</>
                : <><CheckCircle className="w-5 h-5" /> Concluir Manutenção</>
              }
            </button>
          </>
        )}
      </div>

      {/* Visualizador de foto */}
      {viewFoto && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.92)" }}
          onClick={() => setViewFoto(null)}>
          <img src={viewFoto} alt="foto" className="max-w-full max-h-full object-contain rounded-xl" />
          <button className="absolute top-12 right-4 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.1)" }}>
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </div>
  );
}

// ── Tela principal: lista de manutenções ─────────────────────────────────────
export default function TecnicoManutencao() {
  const tecnicoId = getTecnicoId();
  const [busca, setBusca] = useState("");
  const [detalheId, setDetalheId] = useState<number | null>(null);

  const { data: lista, isLoading, error: listaError, refetch } = trpc.manutencao.minhas.useQuery(
    { tecnicoId, busca: busca || undefined },
    { enabled: !!tecnicoId, refetchInterval: 30000 }
  );

  if (detalheId !== null) {
    return <DetalheManutencao id={detalheId} tecnicoId={tecnicoId} onVoltar={() => { setDetalheId(null); refetch(); }} />;
  }

  return (
    <div className="flex flex-col min-h-screen" style={{ background: "#040a16", color: "white" }}>
      {/* Header */}
      <div className="sticky top-0 z-10 px-4 pt-12 pb-4"
        style={{ background: "rgba(4,10,22,0.95)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
            style={{ background: "linear-gradient(135deg, #c2410c, #f97316)", boxShadow: "0 0 20px rgba(249,115,22,0.4)" }}>
            <Wrench className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-black text-white">Manutenções</h1>
            <p className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>
              {lista ? `${lista.length} ordem${lista.length !== 1 ? "s" : ""} atribuída${lista.length !== 1 ? "s" : ""}` : "Carregando..."}
            </p>
          </div>
        </div>
        {/* Busca */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: "rgba(255,255,255,0.3)" }} />
          <input
            value={busca}
            onChange={e => setBusca(e.target.value)}
            placeholder="Buscar por escola, INEP, endereço..."
            className="w-full pl-9 pr-9 py-2.5 rounded-xl text-sm outline-none"
            style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", color: "white" }}
          />
          {busca && (
            <button onClick={() => setBusca("")} className="absolute right-3 top-1/2 -translate-y-1/2">
              <X className="w-4 h-4" style={{ color: "rgba(255,255,255,0.4)" }} />
            </button>
          )}
        </div>
      </div>

      {/* Lista */}
      <div className="flex-1 overflow-y-auto px-4 py-4 pb-28 space-y-3">
        {!tecnicoId ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle className="w-8 h-8" style={{ color: "#f87171" }} />
            </div>
            <div><p className="font-bold text-white mb-1">Sessão do técnico indisponível</p><p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Entre novamente para acessar somente as suas manutenções.</p></div>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: "rgba(249,115,22,0.15)" }}>
              <Loader2 className="w-6 h-6 animate-spin" style={{ color: "#f97316" }} />
            </div>
            <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Carregando manutenções...</p>
          </div>
        ) : listaError ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4 text-center">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center" style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.2)" }}>
              <AlertCircle className="w-8 h-8" style={{ color: "#f87171" }} />
            </div>
            <div><p className="font-bold text-white mb-1">Não foi possível carregar as manutenções</p><p className="text-sm" style={{ color: "rgba(255,255,255,0.5)" }}>Verifique a conexão e tente atualizar. Nenhuma ordem foi alterada.</p></div>
            <button onClick={() => refetch()} className="px-4 py-2 rounded-xl text-sm font-bold" style={{ background: "rgba(249,115,22,0.16)", color: "#fdba74", border: "1px solid rgba(249,115,22,0.26)" }}><RefreshCw className="w-4 h-4 inline mr-2" />Tentar novamente</button>
          </div>
        ) : !lista || lista.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 gap-4">
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center"
              style={{ background: "rgba(249,115,22,0.1)", border: "1px solid rgba(249,115,22,0.15)" }}>
              <Wrench className="w-8 h-8" style={{ color: "rgba(249,115,22,0.5)" }} />
            </div>
            <div className="text-center">
              <p className="font-bold text-white mb-1">Nenhuma manutenção</p>
              <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>
                {busca ? "Nenhum resultado para sua busca" : "Você não tem ordens de manutenção atribuídas"}
              </p>
            </div>
          </div>
        ) : (
          (lista as any[]).map((m) => {
            const st = STATUS_STYLE[m.status] ?? STATUS_STYLE.pendente;
            const Icon = st.icon;
            return (
              <button key={m.id} onClick={() => setDetalheId(m.id)}
                className="w-full text-left rounded-2xl p-4 transition-all active:scale-98"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: st.bg }}>
                    <Icon className="w-5 h-5" style={{ color: st.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <p className="font-bold text-white text-sm truncate">{(m as any).escola?.nome ?? "Escola"}</p>
                      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(255,255,255,0.3)" }} />
                    </div>
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs font-mono" style={{ color: "rgba(255,255,255,0.4)" }}>
                        #{m.id} · INEP {(m as any).escola?.inep ?? "—"}
                      </span>
                    </div>
                    {(m as any).escola?.municipio && (
                      <div className="flex items-center gap-1 mb-2">
                        <MapPin className="w-3 h-3" style={{ color: "rgba(255,255,255,0.3)" }} />
                        <span className="text-xs" style={{ color: "rgba(255,255,255,0.4)" }}>{(m as any).escola?.municipio}</span>
                      </div>
                    )}
                    <p className="text-xs leading-relaxed mb-2" style={{ color: "rgba(255,255,255,0.55)" }}>
                      {m.descricaoProblema.slice(0, 80)}{m.descricaoProblema.length > 80 ? "..." : ""}
                    </p>
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg w-fit" style={{ background: st.bg }}>
                      <Icon className="w-3 h-3" style={{ color: st.color }} />
                      <span className="text-xs font-bold" style={{ color: st.color }}>{st.label}</span>
                    </div>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>

      <TecnicoBottomNav />
    </div>
  );
}
