import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft, School, MapPin, Wifi, Phone, CheckCircle,
  MessageCircle, Navigation, Hash, Building2, Signal, WifiOff, Clock,
  Play, XCircle, Camera, Upload, X, AlertTriangle, Zap, Star
} from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  enqueueOfflineAction, useOfflineSyncQueue, getOfflineQueue, getCachedEscolas
} from "@/hooks/useOfflineQueue";

const statusConfig: Record<string, {
  label: string; bg: string; text: string; dot: string;
  gradient: string; glow: string; cardBg: string; cardBorder: string;
}> = {
  pendente: {
    label: "Pendente",
    bg: "rgba(245,158,11,0.12)", text: "#fbbf24", dot: "#f59e0b",
    gradient: "linear-gradient(135deg, #f59e0b, #d97706)",
    glow: "rgba(245,158,11,0.3)",
    cardBg: "rgba(245,158,11,0.04)", cardBorder: "rgba(245,158,11,0.18)",
  },
  em_andamento: {
    label: "Em andamento",
    bg: "rgba(99,102,241,0.12)", text: "#818cf8", dot: "#6366f1",
    gradient: "linear-gradient(135deg, #4f46e5, #6366f1)",
    glow: "rgba(99,102,241,0.3)",
    cardBg: "rgba(99,102,241,0.04)", cardBorder: "rgba(99,102,241,0.22)",
  },
  concluido: {
    label: "Concluído",
    bg: "rgba(16,185,129,0.12)", text: "#34d399", dot: "#10b981",
    gradient: "linear-gradient(135deg, #059669, #10b981)",
    glow: "rgba(16,185,129,0.3)",
    cardBg: "rgba(16,185,129,0.04)", cardBorder: "rgba(16,185,129,0.22)",
  },
  nao_instalada: {
    label: "Não Instalada",
    bg: "rgba(239,68,68,0.12)", text: "#f87171", dot: "#ef4444",
    gradient: "linear-gradient(135deg, #dc2626, #ef4444)",
    glow: "rgba(239,68,68,0.3)",
    cardBg: "rgba(239,68,68,0.04)", cardBorder: "rgba(239,68,68,0.22)",
  },
};

const MOTIVOS = [
  { value: "escola_desativada", label: "Escola desativada", icon: "🏫" },
  { value: "em_reforma",        label: "Em reforma",        icon: "🔨" },
  { value: "mudanca_endereco",  label: "Mudança de endereço", icon: "📍" },
] as const;

function formatWhatsApp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const digits = raw.replace(/\D/g, "");
  let local = digits;
  if (local.startsWith("55")) local = local.slice(2);
  if (local.startsWith("75")) local = local.slice(2);
  if (local.startsWith("0")) local = local.slice(1);
  if (local.length < 8 || local.length > 9) return null;
  return `5575${local}`;
}

export default function TecnicoOS() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [tecnicoId, setTecnicoId] = useState(0);

  const [openConcluir, setOpenConcluir] = useState(false);
  const [openNaoInstalada, setOpenNaoInstalada] = useState(false);

  const [qtdAp, setQtdAp] = useState("");
  const [observacao, setObservacao] = useState("");
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [fotoMime, setFotoMime] = useState("image/jpeg");
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const [motivo, setMotivo] = useState<"escola_desativada" | "em_reforma" | "mudanca_endereco">("escola_desativada");
  const [obsNaoInstalada, setObsNaoInstalada] = useState("");

  const [pendingOffline, setPendingOffline] = useState(false);
  const isOnline = useOnlineStatus();
  const utils = trpc.useUtils();

  useEffect(() => {
    const id = localStorage.getItem("tecnico_id");
    if (!id) {
      const stored = localStorage.getItem("tecnico");
      if (!stored) { navigate("/tecnico/login"); return; }
      try {
        const t = JSON.parse(stored);
        localStorage.setItem("tecnico_id", String(t.id));
        localStorage.setItem("tecnico_nome", t.nome);
        localStorage.setItem("tecnico_email", t.email);
        setTecnicoId(t.id);
      } catch { navigate("/tecnico/login"); }
    } else {
      setTecnicoId(Number(id));
    }
  }, [navigate]);

  const escolaId = Number(params.id);

  const { data: escola, isLoading } = trpc.tecnicoAuth.minhasEscolas.useQuery(
    { tecnicoId },
    { enabled: !!tecnicoId, select: (data) => data?.find(e => e.id === escolaId) }
  );

  const iniciarMut = trpc.tecnicoAuth.iniciarOS.useMutation({
    onSuccess: () => { toast.success("OS iniciada!"); utils.tecnicoAuth.minhasEscolas.invalidate(); },
    onError: (err: { message: string }) => toast.error("Erro: " + err.message),
  });

  const naoInstaladaMut = trpc.tecnicoAuth.naoInstalada.useMutation({
    onSuccess: () => {
      toast.success("Registrado como não instalada.");
      utils.tecnicoAuth.minhasEscolas.invalidate();
      setOpenNaoInstalada(false);
    },
    onError: (err: { message: string }) => toast.error("Erro: " + err.message),
  });

  const concluirMut = trpc.tecnicoAuth.concluirEscola.useMutation({
    onSuccess: () => {
      toast.success("Instalação marcada como concluída!");
      utils.tecnicoAuth.minhasEscolas.invalidate();
      setOpenConcluir(false);
      setPendingOffline(false);
    },
    onError: (err: { message: string }) => toast.error("Erro: " + err.message),
  });

  const uploadFotoMut = trpc.tecnicoAuth.uploadFotoMapaCalor.useMutation({
    onError: (err: { message: string }) => toast.error("Erro no upload: " + err.message),
  });

  const syncAction = useCallback(async (action: import("@/hooks/useOfflineQueue").OfflineAction) => {
    if (action.type !== "concluirEscola") return false;
    const { escolaId: eid, tecnicoId: tid, qtdApInstalado, observacoes } = action.payload;
    try {
      await utils.client.tecnicoAuth.concluirEscola.mutate({ escolaId: eid, tecnicoId: tid, qtdApInstalado, observacao: observacoes });
      utils.tecnicoAuth.minhasEscolas.invalidate();
      toast.success("OS sincronizada com sucesso!");
      return true;
    } catch { return false; }
  }, [utils]);

  useOfflineSyncQueue(syncAction);

  useEffect(() => {
    const queue = getOfflineQueue();
    setPendingOffline(queue.some(a => a.payload.escolaId === escolaId));
  }, [escolaId]);

  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Foto muito grande. Máximo 5MB."); return; }
    setFotoMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setFotoPreview(result);
      setFotoBase64(result.split(",")[1]);
    };
    reader.readAsDataURL(file);
  }

  const lat = escola?.latitude ? parseFloat(escola.latitude) : null;
  const lng = escola?.longitude ? parseFloat(escola.longitude) : null;
  const hasCoords = lat !== null && lng !== null && !isNaN(lat!) && !isNaN(lng!);

  const mapsUrl = useMemo(() => {
    if (hasCoords) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    return `https://www.google.com/maps/search/${encodeURIComponent((escola?.nome ?? "") + " " + (escola?.municipio ?? ""))}`;
  }, [hasCoords, lat, lng, escola]);

  const whatsappNum = useMemo(() => formatWhatsApp(escola?.telefoneWhatsApp || escola?.telefone), [escola]);
  const whatsappUrl = whatsappNum ? `https://wa.me/${whatsappNum}` : null;

  const sc = statusConfig[escola?.status ?? "pendente"] ?? statusConfig.pendente;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(160deg, #060b18 0%, #0d1a35 100%)" }}>
        <div className="text-center">
          <div className="w-14 h-14 rounded-3xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "linear-gradient(135deg, #4f46e5, #10b981)", boxShadow: "0 16px 48px rgba(99,102,241,0.4)" }}>
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
          <p className="text-white font-semibold">Carregando OS...</p>
          <p className="text-sm mt-1" style={{ color: "rgba(148,163,184,0.5)" }}>Aguarde um momento</p>
        </div>
      </div>
    );
  }

  if (!escola) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(160deg, #060b18 0%, #0d1a35 100%)" }}>
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <School className="w-8 h-8" style={{ color: "rgba(148,163,184,0.4)" }} />
          </div>
          <p className="text-white font-bold text-lg">Escola não encontrada</p>
          <p className="text-sm mt-1 mb-5" style={{ color: "rgba(148,163,184,0.5)" }}>Esta OS não está disponível</p>
          <button onClick={() => navigate("/tecnico")}
            className="px-6 py-3 rounded-2xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #4f46e5, #6366f1)" }}>
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  const isConcluida = escola.status === "concluido";
  const isNaoInstalada = escola.status === "nao_instalada";
  const isEmAndamento = escola.status === "em_andamento";
  const isPendente = escola.status === "pendente";

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #060b18 0%, #0d1a35 60%, #060b18 100%)" }}>

      {/* Banners de status */}
      {!isOnline && (
        <div className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold"
          style={{ background: "linear-gradient(90deg, rgba(245,158,11,0.15), rgba(245,158,11,0.08))", borderBottom: "1px solid rgba(245,158,11,0.25)" }}>
          <WifiOff className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
          <span style={{ color: "#fbbf24" }}>Sem internet — você pode finalizar a OS offline</span>
        </div>
      )}
      {pendingOffline && isOnline && (
        <div className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold"
          style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.15), rgba(99,102,241,0.08))", borderBottom: "1px solid rgba(99,102,241,0.25)" }}>
          <Clock className="w-3.5 h-3.5" style={{ color: "#818cf8" }} />
          <span style={{ color: "#818cf8" }}>Sincronizando OS salva offline...</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-4 sticky top-0 z-10"
        style={{ background: "rgba(6,11,24,0.95)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => navigate("/tecnico")}
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-95"
          style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)" }}>
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-base leading-tight">Ordem de Serviço</h1>
          <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Detalhes da instalação</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold flex-shrink-0"
          style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.text}33` }}>
          <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: sc.dot }} />
          {sc.label}
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 pb-8">

        {/* Card principal da escola */}
        <div className="rounded-3xl overflow-hidden"
          style={{
            background: "rgba(255,255,255,0.03)",
            border: `1px solid ${sc.cardBorder}`,
            boxShadow: `0 8px 40px ${sc.glow}`,
          }}>
          {/* Topo colorido */}
          <div className="h-1.5" style={{ background: sc.gradient }} />

          <div className="p-5">
            <div className="flex items-start gap-4 mb-5">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center flex-shrink-0 relative"
                style={{ background: sc.gradient, boxShadow: `0 8px 24px ${sc.glow}` }}>
                <School className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-bold text-base leading-snug">{escola.nome}</h2>
                <div className="flex items-center gap-1.5 mt-1.5">
                  <Hash className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(148,163,184,0.4)" }} />
                  <span className="text-xs font-mono font-bold" style={{ color: "#818cf8" }}>INEP: {escola.inep}</span>
                </div>
              </div>
            </div>

            {/* Infos em grid */}
            <div className="space-y-2.5">
              {escola.endereco && (
                <div className="flex items-start gap-3 p-3.5 rounded-2xl"
                  style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.12)" }}>
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(239,68,68,0.15)" }}>
                    <MapPin className="w-4 h-4" style={{ color: "#f87171" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold mb-0.5" style={{ color: "rgba(148,163,184,0.5)" }}>Endereço</p>
                    <p className="text-sm font-semibold text-white leading-snug">{escola.endereco}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2.5">
                {escola.municipio && (
                  <div className="flex items-center gap-2.5 p-3 rounded-2xl"
                    style={{ background: "rgba(139,92,246,0.06)", border: "1px solid rgba(139,92,246,0.12)" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(139,92,246,0.15)" }}>
                      <Building2 className="w-4 h-4" style={{ color: "#a78bfa" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Cidade</p>
                      <p className="text-sm font-bold text-white truncate">{escola.municipio}</p>
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2.5 p-3 rounded-2xl"
                  style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(16,185,129,0.15)" }}>
                    <Wifi className="w-4 h-4" style={{ color: "#34d399" }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>APs</p>
                    <p className="text-sm font-bold" style={{ color: "#34d399" }}>
                      {escola.qtdAp ?? 1} AP{(escola.qtdAp ?? 1) > 1 ? "s" : ""}
                    </p>
                  </div>
                </div>

                {escola.velocidadeOfertada && (
                  <div className="flex items-center gap-2.5 p-3 rounded-2xl"
                    style={{ background: "rgba(59,130,246,0.06)", border: "1px solid rgba(59,130,246,0.12)" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(59,130,246,0.15)" }}>
                      <Signal className="w-4 h-4" style={{ color: "#60a5fa" }} />
                    </div>
                    <div>
                      <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Velocidade</p>
                      <p className="text-sm font-bold" style={{ color: "#60a5fa" }}>{escola.velocidadeOfertada}</p>
                    </div>
                  </div>
                )}

                {escola.telefone && (
                  <div className="flex items-center gap-2.5 p-3 rounded-2xl"
                    style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)" }}>
                    <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(16,185,129,0.15)" }}>
                      <Phone className="w-4 h-4" style={{ color: "#34d399" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Telefone</p>
                      <p className="text-sm font-bold text-white truncate">{escola.telefone}</p>
                    </div>
                  </div>
                )}
              </div>

              {hasCoords && (
                <div className="flex items-center gap-3 p-3 rounded-2xl"
                  style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}>
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(245,158,11,0.15)" }}>
                    <Navigation className="w-4 h-4" style={{ color: "#fbbf24" }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Coordenadas GPS</p>
                    <p className="text-xs font-mono font-semibold text-white">{lat!.toFixed(5)}, {lng!.toFixed(5)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botões de navegação */}
        <div className="grid grid-cols-2 gap-3">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block">
            <button className="w-full py-5 rounded-3xl flex flex-col items-center gap-2.5 transition-all active:scale-95"
              style={{
                background: "linear-gradient(135deg, #1e3a8a, #2563eb)",
                border: "1px solid rgba(59,130,246,0.3)",
                boxShadow: "0 8px 32px rgba(37,99,235,0.3)",
              }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.15)" }}>
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-sm">Google Maps</p>
                <p className="text-xs" style={{ color: "rgba(147,197,253,0.7)" }}>{hasCoords ? "Rota GPS" : "Buscar escola"}</p>
              </div>
            </button>
          </a>

          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
              <button className="w-full py-5 rounded-3xl flex flex-col items-center gap-2.5 transition-all active:scale-95"
                style={{
                  background: "linear-gradient(135deg, #065f46, #10b981)",
                  border: "1px solid rgba(16,185,129,0.3)",
                  boxShadow: "0 8px 32px rgba(16,185,129,0.3)",
                }}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.15)" }}>
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-sm">WhatsApp</p>
                  <p className="text-xs" style={{ color: "rgba(167,243,208,0.7)" }}>{whatsappNum}</p>
                </div>
              </button>
            </a>
          ) : (
            <div className="w-full py-5 rounded-3xl flex flex-col items-center gap-2.5"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.06)" }}>
                <Phone className="w-5 h-5" style={{ color: "rgba(148,163,184,0.3)" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "rgba(148,163,184,0.4)" }}>Sem telefone</p>
                <p className="text-xs" style={{ color: "rgba(148,163,184,0.25)" }}>Não cadastrado</p>
              </div>
            </div>
          )}
        </div>

        {/* Botões de ação da OS */}
        {isConcluida ? (
          <div className="rounded-3xl p-6 text-center relative overflow-hidden"
            style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.25)", boxShadow: "0 8px 40px rgba(16,185,129,0.15)" }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #059669, #10b981, #34d399)" }} />
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 12px 40px rgba(16,185,129,0.4)" }}>
              <Star className="w-8 h-8 text-white" />
            </div>
            <p className="font-black text-xl" style={{ color: "#34d399" }}>Instalação Concluída!</p>
            {escola.dataConclusao && (
              <p className="text-sm mt-2" style={{ color: "rgba(52,211,153,0.6)" }}>
                Concluída em {new Date(escola.dataConclusao).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
        ) : isNaoInstalada ? (
          <div className="rounded-3xl p-6 text-center relative overflow-hidden"
            style={{ background: "rgba(239,68,68,0.06)", border: "1px solid rgba(239,68,68,0.25)", boxShadow: "0 8px 40px rgba(239,68,68,0.15)" }}>
            <div className="absolute top-0 left-0 right-0 h-1" style={{ background: "linear-gradient(90deg, #dc2626, #ef4444, #f87171)" }} />
            <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "linear-gradient(135deg, #dc2626, #ef4444)", boxShadow: "0 12px 40px rgba(239,68,68,0.4)" }}>
              <XCircle className="w-8 h-8 text-white" />
            </div>
            <p className="font-black text-xl" style={{ color: "#f87171" }}>Não Instalada</p>
            <p className="text-sm mt-2" style={{ color: "rgba(252,165,165,0.6)" }}>Esta escola foi registrada como não instalada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {isPendente && (
              <button
                onClick={() => iniciarMut.mutate({ escolaId, tecnicoId })}
                disabled={iniciarMut.isPending}
                className="w-full py-5 rounded-3xl flex items-center justify-center gap-3 font-black text-base text-white transition-all active:scale-[0.98]"
                style={{
                  background: "linear-gradient(135deg, #1e3a8a, #4f46e5, #6366f1)",
                  boxShadow: "0 12px 40px rgba(99,102,241,0.35)",
                  border: "1px solid rgba(99,102,241,0.3)",
                }}>
                {iniciarMut.isPending ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Iniciando...</>
                ) : (
                  <><Play className="w-5 h-5" fill="white" /> Iniciar OS</>
                )}
              </button>
            )}

            <button
              onClick={() => setOpenConcluir(true)}
              className="w-full py-5 rounded-3xl flex items-center justify-center gap-3 font-black text-base text-white transition-all active:scale-[0.98]"
              style={{
                background: "linear-gradient(135deg, #065f46, #059669, #10b981)",
                boxShadow: "0 12px 40px rgba(16,185,129,0.35)",
                border: "1px solid rgba(16,185,129,0.3)",
              }}>
              <CheckCircle className="w-5 h-5" />
              Marcar como Concluído
            </button>

            <button
              onClick={() => setOpenNaoInstalada(true)}
              className="w-full py-4 rounded-3xl flex items-center justify-center gap-2.5 font-bold text-sm transition-all active:scale-[0.98]"
              style={{
                background: "rgba(239,68,68,0.08)",
                border: "1.5px solid rgba(239,68,68,0.3)",
                color: "#f87171",
              }}>
              <XCircle className="w-4.5 h-4.5" />
              Não Instalada
            </button>
          </div>
        )}
      </div>

      {/* ─── Modal de Conclusão ─── */}
      {openConcluir && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={e => { if (e.target === e.currentTarget) setOpenConcluir(false); }}>
          <div className="w-full max-w-lg rounded-t-[2rem] overflow-y-auto max-h-[92vh] relative"
            style={{ background: "linear-gradient(180deg, #0d1a35 0%, #060b18 100%)", border: "1px solid rgba(255,255,255,0.10)" }}>
            {/* Linha de arraste */}
            <div className="w-12 h-1.5 rounded-full mx-auto mt-4 mb-5" style={{ background: "rgba(255,255,255,0.15)" }} />
            {/* Topo verde */}
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[2rem]"
              style={{ background: "linear-gradient(90deg, #059669, #10b981, #34d399)" }} />

            <div className="px-6 pb-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
                  <CheckCircle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-black text-lg">Confirmar Conclusão</h3>
                  <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Preencha os dados da instalação</p>
                </div>
              </div>

              <div className="space-y-4 mt-5 mb-5">
                <div>
                  <label className="text-xs font-bold mb-2 block uppercase tracking-wider" style={{ color: "rgba(52,211,153,0.8)" }}>
                    APs Instalados *
                  </label>
                  <input
                    type="number" min="1" max="99"
                    value={qtdAp}
                    onChange={e => setQtdAp(e.target.value)}
                    placeholder={`Previsto: ${escola.qtdAp ?? 1}`}
                    className="w-full px-4 py-4 rounded-2xl text-white text-lg font-bold outline-none transition-all"
                    style={{ background: "rgba(16,185,129,0.08)", border: "1.5px solid rgba(16,185,129,0.25)" }}
                  />
                </div>

                <div>
                  <label className="text-xs font-bold mb-2 block uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.6)" }}>
                    Observações (opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={observacao}
                    onChange={e => setObservacao(e.target.value)}
                    placeholder="Alguma observação sobre a instalação..."
                    className="w-full px-4 py-3 rounded-2xl text-white text-sm outline-none resize-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.10)" }}
                  />
                </div>

                {/* Upload foto */}
                <div>
                  <label className="text-xs font-bold mb-2 block uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.6)" }}>
                    Foto do Mapa de Calor (opcional)
                  </label>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFotoChange} />

                  {fotoPreview ? (
                    <div className="relative rounded-2xl overflow-hidden"
                      style={{ border: "1.5px solid rgba(16,185,129,0.3)" }}>
                      <img src={fotoPreview} alt="Mapa de calor" className="w-full max-h-48 object-cover" />
                      <button
                        onClick={() => {
                          setFotoPreview(null); setFotoBase64(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                          if (cameraInputRef.current) cameraInputRef.current.value = "";
                        }}
                        className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.7)" }}>
                        <X className="w-4 h-4 text-white" />
                      </button>
                      <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-lg text-xs font-bold"
                        style={{ background: "rgba(16,185,129,0.85)", color: "white" }}>
                        ✓ Foto selecionada
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      <button onClick={() => cameraInputRef.current?.click()}
                        className="py-5 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95"
                        style={{ background: "rgba(99,102,241,0.08)", border: "1.5px dashed rgba(99,102,241,0.3)" }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: "rgba(99,102,241,0.15)" }}>
                          <Camera className="w-5 h-5" style={{ color: "#818cf8" }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: "#818cf8" }}>Câmera</span>
                      </button>
                      <button onClick={() => fileInputRef.current?.click()}
                        className="py-5 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95"
                        style={{ background: "rgba(16,185,129,0.08)", border: "1.5px dashed rgba(16,185,129,0.3)" }}>
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                          style={{ background: "rgba(16,185,129,0.15)" }}>
                          <Upload className="w-5 h-5" style={{ color: "#34d399" }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: "#34d399" }}>Galeria</span>
                      </button>
                      <p className="col-span-2 text-center text-xs" style={{ color: "rgba(148,163,184,0.3)" }}>Máximo 5MB · JPG, PNG</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setOpenConcluir(false)}
                  className="flex-1 py-4 rounded-2xl font-semibold text-sm transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(148,163,184,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    const n = parseInt(qtdAp);
                    if (!qtdAp || isNaN(n) || n < 1) { toast.error("Informe a quantidade de APs instalados"); return; }
                    let fotoUrl: string | undefined;
                    let fotoKey: string | undefined;
                    if (fotoBase64 && isOnline) {
                      setUploadingFoto(true);
                      try {
                        const res = await uploadFotoMut.mutateAsync({ escolaId, tecnicoId, imageBase64: fotoBase64, mimeType: fotoMime });
                        fotoUrl = res.url; fotoKey = res.key;
                      } catch { /* continua sem foto */ } finally { setUploadingFoto(false); }
                    }
                    if (!isOnline) {
                      enqueueOfflineAction({ type: "concluirEscola", payload: { escolaId, tecnicoId, qtdApInstalado: n, observacoes: observacao || undefined, dataHora: new Date().toISOString() } });
                      setPendingOffline(true); setOpenConcluir(false);
                      toast.success("OS salva localmente! Será enviada ao servidor quando você tiver internet.", { duration: 5000 });
                      return;
                    }
                    concluirMut.mutate({ tecnicoId, escolaId, qtdApInstalado: n, observacao, fotoMapaCalorUrl: fotoUrl, fotoMapaCalorKey: fotoKey });
                  }}
                  disabled={concluirMut.isPending || uploadingFoto}
                  className="flex-1 py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all"
                  style={{
                    background: isOnline
                      ? "linear-gradient(135deg, #059669, #10b981)"
                      : "linear-gradient(135deg, #d97706, #f59e0b)",
                    boxShadow: isOnline ? "0 8px 24px rgba(16,185,129,0.3)" : "0 8px 24px rgba(245,158,11,0.3)",
                  }}>
                  {uploadingFoto ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando foto...</>
                  ) : concluirMut.isPending ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
                  ) : isOnline ? (
                    <><CheckCircle className="w-4 h-4" /> Confirmar</>
                  ) : (
                    <><WifiOff className="w-4 h-4" /> Salvar Offline</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal de Não Instalada ─── */}
      {openNaoInstalada && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(8px)" }}
          onClick={e => { if (e.target === e.currentTarget) setOpenNaoInstalada(false); }}>
          <div className="w-full max-w-lg rounded-t-[2rem] relative"
            style={{ background: "linear-gradient(180deg, #0d1a35 0%, #060b18 100%)", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="absolute top-0 left-0 right-0 h-1 rounded-t-[2rem]"
              style={{ background: "linear-gradient(90deg, #dc2626, #ef4444, #f87171)" }} />
            <div className="w-12 h-1.5 rounded-full mx-auto mt-4 mb-5" style={{ background: "rgba(255,255,255,0.15)" }} />

            <div className="px-6 pb-10">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-2xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #dc2626, #ef4444)" }}>
                  <AlertTriangle className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-black text-lg">Não Instalada</h3>
                  <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Selecione o motivo</p>
                </div>
              </div>

              <div className="space-y-3 mt-5 mb-5">
                <div className="space-y-2">
                  {MOTIVOS.map(m => (
                    <button key={m.value} onClick={() => setMotivo(m.value)}
                      className="w-full px-4 py-4 rounded-2xl text-left flex items-center gap-3 transition-all active:scale-[0.98]"
                      style={{
                        background: motivo === m.value ? "rgba(239,68,68,0.12)" : "rgba(255,255,255,0.04)",
                        border: motivo === m.value ? "1.5px solid rgba(239,68,68,0.5)" : "1.5px solid rgba(255,255,255,0.08)",
                        boxShadow: motivo === m.value ? "0 4px 16px rgba(239,68,68,0.15)" : "none",
                      }}>
                      <span className="text-xl">{m.icon}</span>
                      <span className="text-sm font-bold flex-1"
                        style={{ color: motivo === m.value ? "#f87171" : "rgba(148,163,184,0.8)" }}>
                        {m.label}
                      </span>
                      {motivo === m.value && (
                        <div className="w-5 h-5 rounded-full flex items-center justify-center"
                          style={{ background: "rgba(239,68,68,0.2)", border: "2px solid #ef4444" }}>
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />
                        </div>
                      )}
                    </button>
                  ))}
                </div>

                <div>
                  <label className="text-xs font-bold mb-2 block uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.6)" }}>
                    Observações (opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={obsNaoInstalada}
                    onChange={e => setObsNaoInstalada(e.target.value)}
                    placeholder="Detalhes adicionais..."
                    className="w-full px-4 py-3 rounded-2xl text-white text-sm outline-none resize-none"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.10)" }}
                  />
                </div>
              </div>

              <div className="flex gap-3">
                <button onClick={() => setOpenNaoInstalada(false)}
                  className="flex-1 py-4 rounded-2xl font-semibold text-sm transition-all"
                  style={{ background: "rgba(255,255,255,0.06)", color: "rgba(148,163,184,0.7)", border: "1px solid rgba(255,255,255,0.08)" }}>
                  Cancelar
                </button>
                <button
                  onClick={() => naoInstaladaMut.mutate({ escolaId, tecnicoId, motivo, observacao: obsNaoInstalada || undefined })}
                  disabled={naoInstaladaMut.isPending}
                  className="flex-1 py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all"
                  style={{ background: "linear-gradient(135deg, #dc2626, #ef4444)", boxShadow: "0 8px 24px rgba(239,68,68,0.3)" }}>
                  {naoInstaladaMut.isPending ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
                  ) : (
                    <><XCircle className="w-4 h-4" /> Confirmar</>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
