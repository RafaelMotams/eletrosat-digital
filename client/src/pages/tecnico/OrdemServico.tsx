import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft, School, MapPin, Wifi, Phone, CheckCircle,
  MessageCircle, Navigation, Hash, Building2, Signal, WifiOff, Clock,
  Play, XCircle, Camera, Upload, X, AlertTriangle, Zap, Star,
  Info, FileText, Layers, PhoneCall, Gauge, LocateFixed
} from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  enqueueOfflineAction, useOfflineSyncQueue, getOfflineQueue
} from "@/hooks/useOfflineQueue";

// ─── Status config ────────────────────────────────────────────────────────────
const statusConfig: Record<string, {
  label: string; bg: string; text: string; dot: string;
  gradient: string; glow: string; cardBorder: string;
  badgeBg: string; badgeText: string; badgeBorder: string;
}> = {
  pendente: {
    label: "Pendente",
    bg: "rgba(139,92,246,0.12)", text: "#c084fc", dot: "#a855f7",
    gradient: "linear-gradient(135deg, #7c3aed, #a855f7)",
    glow: "rgba(168,85,247,0.18)",
    cardBorder: "rgba(168,85,247,0.2)",
    badgeBg: "linear-gradient(135deg, #6d28d9, #7c3aed)",
    badgeText: "#ffffff",
    badgeBorder: "rgba(168,85,247,0.4)",
  },
  em_andamento: {
    label: "Em andamento",
    bg: "rgba(59,130,246,0.12)", text: "#60a5fa", dot: "#3b82f6",
    gradient: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
    glow: "rgba(59,130,246,0.18)",
    cardBorder: "rgba(59,130,246,0.22)",
    badgeBg: "linear-gradient(135deg, #1d4ed8, #3b82f6)",
    badgeText: "#ffffff",
    badgeBorder: "rgba(59,130,246,0.4)",
  },
  concluido: {
    label: "Concluído",
    bg: "rgba(16,185,129,0.12)", text: "#34d399", dot: "#10b981",
    gradient: "linear-gradient(135deg, #059669, #10b981)",
    glow: "rgba(16,185,129,0.18)",
    cardBorder: "rgba(16,185,129,0.22)",
    badgeBg: "linear-gradient(135deg, #065f46, #10b981)",
    badgeText: "#ffffff",
    badgeBorder: "rgba(16,185,129,0.4)",
  },
  nao_instalada: {
    label: "Não Instalada",
    bg: "rgba(239,68,68,0.12)", text: "#f87171", dot: "#ef4444",
    gradient: "linear-gradient(135deg, #dc2626, #ef4444)",
    glow: "rgba(239,68,68,0.18)",
    cardBorder: "rgba(239,68,68,0.22)",
    badgeBg: "linear-gradient(135deg, #991b1b, #ef4444)",
    badgeText: "#ffffff",
    badgeBorder: "rgba(239,68,68,0.4)",
  },
};

const MOTIVOS = [
  { value: "escola_desativada", label: "Escola desativada", icon: "🏫", desc: "A escola não está mais em funcionamento" },
  { value: "em_reforma",        label: "Em reforma",        icon: "🔨", desc: "Obras ou reformas em andamento" },
  { value: "mudanca_endereco",  label: "Mudança de endereço", icon: "📍", desc: "A escola mudou de localização" },
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

function formatTelDisplay(raw: string | null | undefined): string {
  if (!raw) return "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length === 11) return `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
  if (digits.length === 10) return `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
  if (digits.length >= 8) return digits;
  return raw;
}

// ─── Stepper ─────────────────────────────────────────────────────────────────
function OSStep({ step, label, active, done }: { step: number; label: string; active: boolean; done: boolean }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black transition-all"
        style={{
          background: done
            ? "linear-gradient(135deg, #059669, #10b981)"
            : active
            ? "linear-gradient(135deg, #6d28d9, #a855f7)"
            : "rgba(255,255,255,0.05)",
          border: done || active ? "none" : "1.5px solid rgba(255,255,255,0.1)",
          color: done || active ? "white" : "rgba(100,116,139,0.4)",
          boxShadow: done
            ? "0 4px 16px rgba(16,185,129,0.4)"
            : active
            ? "0 4px 16px rgba(168,85,247,0.45)"
            : "none",
        }}>
        {done ? "✓" : step}
      </div>
      <span className="text-[9px] font-bold tracking-widest uppercase"
        style={{
          color: done ? "#34d399" : active ? "#c084fc" : "rgba(100,116,139,0.35)",
        }}>
        {label}
      </span>
    </div>
  );
}

// ─── InfoCard ─────────────────────────────────────────────────────────────────
function InfoCard({
  icon, label, value, iconBg, iconColor, labelColor, fullWidth = false, large = false
}: {
  icon: React.ReactNode; label: string; value: string;
  iconBg: string; iconColor: string; labelColor: string;
  fullWidth?: boolean; large?: boolean;
}) {
  return (
    <div
      className={`flex items-center gap-3.5 px-4 py-4 rounded-2xl${fullWidth ? " col-span-2" : ""}`}
      style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}
    >
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
        style={{ background: iconBg }}>
        <span style={{ color: iconColor }}>{icon}</span>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: labelColor }}>{label}</p>
        <p className={`font-bold text-white leading-snug${large ? " text-base" : " text-sm"}`}
          style={{ wordBreak: "break-word" }}>
          {value}
        </p>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
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
    onSuccess: () => { toast.success("OS iniciada com sucesso!"); utils.tecnicoAuth.minhasEscolas.invalidate(); },
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
      toast.success("Instalação concluída com sucesso!");
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
  const telDisplay = useMemo(() => formatTelDisplay(escola?.telefone || escola?.telefoneWhatsApp), [escola]);

  const sc = statusConfig[escola?.status ?? "pendente"] ?? statusConfig.pendente;

  // ─── Loading ────────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(160deg, #060b18 0%, #0d1a35 100%)" }}>
        <div className="text-center">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "linear-gradient(135deg, #6d28d9, #10b981)", boxShadow: "0 16px 48px rgba(168,85,247,0.4)" }}>
            <div className="w-7 h-7 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
          <p className="text-white font-bold text-base">Carregando OS...</p>
          <p className="text-sm mt-1" style={{ color: "rgba(148,163,184,0.4)" }}>Aguarde um momento</p>
        </div>
      </div>
    );
  }

  if (!escola) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(160deg, #060b18 0%, #0d1a35 100%)" }}>
        <div className="text-center px-8">
          <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)" }}>
            <School className="w-10 h-10" style={{ color: "rgba(148,163,184,0.3)" }} />
          </div>
          <p className="text-white font-bold text-lg mb-1">Escola não encontrada</p>
          <p className="text-sm mb-6" style={{ color: "rgba(148,163,184,0.5)" }}>Esta OS não está disponível para você</p>
          <button onClick={() => navigate("/tecnico")}
            className="px-8 py-3.5 rounded-2xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg, #6d28d9, #a855f7)", boxShadow: "0 8px 24px rgba(168,85,247,0.3)" }}>
            Voltar ao início
          </button>
        </div>
      </div>
    );
  }

  const isConcluida = escola.status === "concluido";
  const isNaoInstalada = escola.status === "nao_instalada";
  const isPendente = escola.status === "pendente";

  const stepStatus = {
    s1done: ["em_andamento","concluido","nao_instalada"].includes(escola.status ?? ""),
    s1active: escola.status === "pendente",
    s2done: ["concluido","nao_instalada"].includes(escola.status ?? ""),
    s2active: escola.status === "em_andamento",
    s3done: escola.status === "concluido",
    s3active: escola.status === "nao_instalada",
  };

  return (
    <div className="min-h-screen flex flex-col"
      style={{ background: "linear-gradient(160deg, #050c1a 0%, #0a1428 55%, #050c1a 100%)" }}>

      {/* ─── Status banners ─── */}
      {!isOnline && (
        <div className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold"
          style={{ background: "linear-gradient(90deg, rgba(245,158,11,0.18), rgba(245,158,11,0.06))", borderBottom: "1px solid rgba(245,158,11,0.2)" }}>
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#fbbf24" }} />
          <span style={{ color: "#fbbf24" }}>Sem internet — você pode finalizar a OS offline</span>
        </div>
      )}
      {pendingOffline && isOnline && (
        <div className="flex items-center gap-2 px-4 py-2.5 text-xs font-semibold"
          style={{ background: "linear-gradient(90deg, rgba(99,102,241,0.18), rgba(99,102,241,0.06))", borderBottom: "1px solid rgba(99,102,241,0.2)" }}>
          <Clock className="w-3.5 h-3.5 flex-shrink-0 animate-pulse" style={{ color: "#818cf8" }} />
          <span style={{ color: "#818cf8" }}>Sincronizando OS salva offline...</span>
        </div>
      )}

      {/* ─── Header ─── */}
      <div className="flex items-center gap-3 px-4 pt-safe pt-5 pb-4 sticky top-0 z-20"
        style={{ background: "rgba(5,12,26,0.97)", backdropFilter: "blur(24px)", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
        <button onClick={() => navigate("/tecnico")}
          className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
          style={{ background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)" }}>
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-[9px] font-bold uppercase tracking-[0.15em] mb-0.5" style={{ color: "rgba(148,163,184,0.4)" }}>Ordem de Serviço</p>
          <h1 className="text-white font-black text-base leading-tight truncate">{escola.nome}</h1>
        </div>
        <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-full text-xs font-black flex-shrink-0"
          style={{
            background: sc.badgeBg,
            color: sc.badgeText,
            border: `1px solid ${sc.badgeBorder}`,
            boxShadow: `0 4px 14px ${sc.glow}`,
          }}>
          <div className="w-1.5 h-1.5 rounded-full bg-white opacity-90 animate-pulse" />
          {sc.label}
        </div>
      </div>

      {/* ─── Stepper ─── */}
      <div className="px-6 py-5" style={{ background: "rgba(5,12,26,0.6)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-start justify-between">
          <OSStep step={1} label="Pendente" active={stepStatus.s1active} done={stepStatus.s1done} />
          <div className="flex-1 mt-5 mx-2">
            <div className="h-0.5 rounded-full" style={{ background: stepStatus.s1done ? "linear-gradient(90deg, #10b981, #a855f7)" : "rgba(255,255,255,0.07)" }} />
          </div>
          <OSStep step={2} label="Andamento" active={stepStatus.s2active} done={stepStatus.s2done} />
          <div className="flex-1 mt-5 mx-2">
            <div className="h-0.5 rounded-full" style={{ background: stepStatus.s2done ? "linear-gradient(90deg, #a855f7, #10b981)" : "rgba(255,255,255,0.07)" }} />
          </div>
          <OSStep step={3} label="Concluído" active={stepStatus.s3active || stepStatus.s3done} done={stepStatus.s3done} />
        </div>
      </div>

      {/* ─── Conteúdo ─── */}
      <div className="flex-1 overflow-y-auto pb-12">

        {/* ─── Card Hero da Escola ─── */}
        <div className="mx-4 mt-5 rounded-3xl overflow-hidden"
          style={{
            background: "linear-gradient(145deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.02) 100%)",
            border: `1.5px solid ${sc.cardBorder}`,
            boxShadow: `0 20px 60px ${sc.glow}`,
          }}>
          {/* Barra de cor no topo */}
          <div className="h-1.5" style={{ background: sc.gradient }} />

          {/* Identidade da escola */}
          <div className="p-5">
            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: sc.gradient, boxShadow: `0 8px 28px ${sc.glow}` }}>
                <School className="w-8 h-8 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-white font-black text-lg leading-snug mb-2">{escola.nome}</h2>
                <div className="flex flex-wrap items-center gap-2">
                  {escola.inep && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                      style={{ background: "rgba(129,140,248,0.12)", border: "1px solid rgba(129,140,248,0.2)" }}>
                      <Hash className="w-3 h-3" style={{ color: "#818cf8" }} />
                      <span className="text-xs font-black font-mono" style={{ color: "#818cf8" }}>INEP {escola.inep}</span>
                    </div>
                  )}
                  {escola.qtdAp && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
                      style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}>
                      <Wifi className="w-3 h-3" style={{ color: "#34d399" }} />
                      <span className="text-xs font-black" style={{ color: "#34d399" }}>{escola.qtdAp} AP{escola.qtdAp > 1 ? "s" : ""}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="h-px mb-4" style={{ background: "rgba(255,255,255,0.06)" }} />

            {/* Grid de informações */}
            <div className="space-y-2.5">

              {/* Endereço — full width */}
              {escola.endereco && (
                <div className="flex items-start gap-3.5 px-4 py-4 rounded-2xl"
                  style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.15)" }}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(248,113,113,0.15)" }}>
                    <MapPin className="w-5 h-5" style={{ color: "#f87171" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(248,113,113,0.7)" }}>Endereço</p>
                    <p className="text-sm font-semibold text-white leading-relaxed">{escola.endereco}</p>
                  </div>
                </div>
              )}

              {/* Grid 2 colunas */}
              <div className="grid grid-cols-2 gap-2.5">

                {/* Município */}
                {escola.municipio && (
                  <div className="flex items-center gap-3 px-3.5 py-4 rounded-2xl"
                    style={{ background: "rgba(139,92,246,0.07)", border: "1px solid rgba(139,92,246,0.15)" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(139,92,246,0.18)" }}>
                      <Building2 className="w-5 h-5" style={{ color: "#a78bfa" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "rgba(167,139,250,0.6)" }}>Município</p>
                      <p className="text-sm font-bold text-white leading-tight">{escola.municipio}</p>
                    </div>
                  </div>
                )}

                {/* Velocidade */}
                {escola.velocidadeOfertada && (
                  <div className="flex items-center gap-3 px-3.5 py-4 rounded-2xl"
                    style={{ background: "rgba(59,130,246,0.07)", border: "1px solid rgba(59,130,246,0.15)" }}>
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                      style={{ background: "rgba(59,130,246,0.18)" }}>
                      <Gauge className="w-5 h-5" style={{ color: "#60a5fa" }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "rgba(96,165,250,0.6)" }}>Velocidade</p>
                      <p className="text-sm font-bold text-white">{escola.velocidadeOfertada} <span className="text-xs font-medium" style={{ color: "rgba(96,165,250,0.7)" }}>Mbps</span></p>
                    </div>
                  </div>
                )}
              </div>

              {/* Telefone — full width, bem visível */}
              {(escola.telefone || escola.telefoneWhatsApp) && (
                <div className="flex items-center gap-3.5 px-4 py-4 rounded-2xl"
                  style={{ background: "rgba(16,185,129,0.07)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(16,185,129,0.18)" }}>
                    <PhoneCall className="w-5 h-5" style={{ color: "#34d399" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(52,211,153,0.65)" }}>Telefone</p>
                    <p className="text-base font-black text-white tracking-wide">
                      {telDisplay || escola.telefone || escola.telefoneWhatsApp}
                    </p>
                  </div>
                </div>
              )}

              {/* GPS — full width */}
              {hasCoords && (
                <div className="flex items-center gap-3.5 px-4 py-4 rounded-2xl"
                  style={{ background: "rgba(245,158,11,0.07)", border: "1px solid rgba(245,158,11,0.15)" }}>
                  <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(245,158,11,0.18)" }}>
                    <LocateFixed className="w-5 h-5" style={{ color: "#fbbf24" }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider mb-1" style={{ color: "rgba(251,191,36,0.65)" }}>Coordenadas GPS</p>
                    <p className="text-sm font-bold text-white font-mono">{lat!.toFixed(5)}, {lng!.toFixed(5)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ─── Botões de Ação Rápida ─── */}
        <div className="mx-4 mt-4 grid grid-cols-2 gap-3">
          {/* Google Maps */}
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block">
            <div className="rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-95 h-full"
              style={{
                background: "linear-gradient(135deg, rgba(29,78,216,0.85), rgba(59,130,246,0.65))",
                border: "1px solid rgba(59,130,246,0.3)",
                boxShadow: "0 8px 28px rgba(37,99,235,0.25)",
              }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.15)" }}>
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <div>
                <p className="text-white font-black text-sm">Maps</p>
                <p className="text-xs font-medium" style={{ color: "rgba(186,230,253,0.8)" }}>{hasCoords ? "Rota GPS" : "Buscar"}</p>
              </div>
            </div>
          </a>

          {/* WhatsApp */}
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
              <div className="rounded-2xl p-4 flex items-center gap-3 transition-all active:scale-95 h-full"
                style={{
                  background: "linear-gradient(135deg, rgba(6,95,70,0.85), rgba(16,185,129,0.65))",
                  border: "1px solid rgba(16,185,129,0.3)",
                  boxShadow: "0 8px 28px rgba(16,185,129,0.22)",
                }}>
                <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.15)" }}>
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-white font-black text-sm">WhatsApp</p>
                  <p className="text-xs font-medium truncate" style={{ color: "rgba(167,243,208,0.8)" }}>{telDisplay}</p>
                </div>
              </div>
            </a>
          ) : (
            <div className="rounded-2xl p-4 flex items-center gap-3 h-full"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <Phone className="w-5 h-5" style={{ color: "rgba(100,116,139,0.4)" }} />
              </div>
              <div>
                <p className="text-sm font-semibold" style={{ color: "rgba(148,163,184,0.4)" }}>WhatsApp</p>
                <p className="text-xs" style={{ color: "rgba(100,116,139,0.3)" }}>Não cadastrado</p>
              </div>
            </div>
          )}
        </div>

        {/* ─── Ações da OS ─── */}
        <div className="mx-4 mt-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-6 h-6 rounded-lg flex items-center justify-center"
              style={{ background: "rgba(168,85,247,0.18)" }}>
              <Zap className="w-3.5 h-3.5" style={{ color: "#c084fc" }} />
            </div>
            <p className="text-xs font-black uppercase tracking-[0.15em]" style={{ color: "rgba(148,163,184,0.5)" }}>Ações da OS</p>
          </div>

          {isConcluida ? (
            <div className="rounded-3xl p-7 text-center relative overflow-hidden"
              style={{ background: "rgba(16,185,129,0.06)", border: "1.5px solid rgba(16,185,129,0.22)", boxShadow: "0 12px 48px rgba(16,185,129,0.12)" }}>
              <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: "linear-gradient(90deg, #059669, #10b981, #34d399)" }} />
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 16px 48px rgba(16,185,129,0.4)" }}>
                <Star className="w-10 h-10 text-white" fill="white" />
              </div>
              <p className="font-black text-2xl mb-1" style={{ color: "#34d399" }}>Instalação Concluída!</p>
              {escola.dataConclusao && (
                <p className="text-sm" style={{ color: "rgba(52,211,153,0.6)" }}>
                  Concluída em {new Date(escola.dataConclusao).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              )}
              <div className="mt-4 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl mx-auto w-fit"
                style={{ background: "rgba(16,185,129,0.12)", border: "1px solid rgba(16,185,129,0.2)" }}>
                <CheckCircle className="w-4 h-4" style={{ color: "#34d399" }} />
                <span className="text-sm font-bold" style={{ color: "#34d399" }}>OS finalizada com sucesso</span>
              </div>
            </div>

          ) : isNaoInstalada ? (
            <div className="rounded-3xl p-7 text-center relative overflow-hidden"
              style={{ background: "rgba(239,68,68,0.06)", border: "1.5px solid rgba(239,68,68,0.22)", boxShadow: "0 12px 48px rgba(239,68,68,0.12)" }}>
              <div className="absolute top-0 left-0 right-0 h-1.5" style={{ background: "linear-gradient(90deg, #dc2626, #ef4444, #f87171)" }} />
              <div className="w-20 h-20 rounded-3xl flex items-center justify-center mx-auto mb-4"
                style={{ background: "linear-gradient(135deg, #dc2626, #ef4444)", boxShadow: "0 16px 48px rgba(239,68,68,0.4)" }}>
                <XCircle className="w-10 h-10 text-white" />
              </div>
              <p className="font-black text-2xl mb-1" style={{ color: "#f87171" }}>Não Instalada</p>
              <p className="text-sm" style={{ color: "rgba(252,165,165,0.6)" }}>Esta escola foi registrada como não instalada.</p>
            </div>

          ) : (
            <div className="space-y-3">
              {isPendente && (
                <button
                  onClick={() => iniciarMut.mutate({ escolaId, tecnicoId })}
                  disabled={iniciarMut.isPending}
                  className="w-full py-5 rounded-3xl flex items-center justify-center gap-3 font-black text-base text-white transition-all active:scale-[0.97]"
                  style={{
                    background: "linear-gradient(135deg, #4c1d95, #6d28d9, #7c3aed)",
                    boxShadow: "0 12px 40px rgba(109,40,217,0.35)",
                    border: "1px solid rgba(168,85,247,0.3)",
                  }}>
                  {iniciarMut.isPending ? (
                    <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Iniciando...</>
                  ) : (
                    <><Play className="w-5 h-5" fill="white" /> Iniciar Ordem de Serviço</>
                  )}
                </button>
              )}

              <button
                onClick={() => setOpenConcluir(true)}
                className="w-full py-5 rounded-3xl flex items-center justify-center gap-3 font-black text-base text-white transition-all active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #065f46, #059669, #10b981)",
                  boxShadow: "0 12px 40px rgba(16,185,129,0.3)",
                  border: "1px solid rgba(16,185,129,0.25)",
                }}>
                <CheckCircle className="w-5 h-5" />
                Marcar como Concluído
              </button>

              <button
                onClick={() => setOpenNaoInstalada(true)}
                className="w-full py-4 rounded-3xl flex items-center justify-center gap-2.5 font-bold text-sm transition-all active:scale-[0.97]"
                style={{
                  background: "rgba(239,68,68,0.07)",
                  border: "1.5px solid rgba(239,68,68,0.25)",
                  color: "#f87171",
                }}>
                <XCircle className="w-4.5 h-4.5" />
                Registrar como Não Instalada
              </button>
            </div>
          )}
        </div>

        {/* Nota */}
        <div className="mx-4 mt-5 mb-2">
          <div className="flex items-start gap-2.5 px-4 py-3 rounded-2xl"
            style={{ background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)" }}>
            <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" style={{ color: "rgba(148,163,184,0.25)" }} />
            <p className="text-xs leading-relaxed" style={{ color: "rgba(148,163,184,0.3)" }}>
              Registre a OS após concluir a instalação. Em caso de problemas, use "Não Instalada" com o motivo correto.
            </p>
          </div>
        </div>

      </div>

      {/* ─── Modal de Conclusão ─── */}
      {openConcluir && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)" }}
          onClick={e => { if (e.target === e.currentTarget) setOpenConcluir(false); }}>
          <div className="w-full max-w-lg rounded-t-[2.5rem] overflow-y-auto max-h-[94vh] relative"
            style={{ background: "linear-gradient(180deg, #0d1a35 0%, #060b18 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>

            <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-[2.5rem]"
              style={{ background: "linear-gradient(90deg, #059669, #10b981, #34d399)" }} />
            <div className="w-10 h-1 rounded-full mx-auto mt-5 mb-1" style={{ background: "rgba(255,255,255,0.12)" }} />

            <div className="px-6 pb-10 pt-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 8px 24px rgba(16,185,129,0.3)" }}>
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-black text-xl">Confirmar Conclusão</h3>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.5)" }}>Preencha os dados da instalação</p>
                </div>
              </div>

              <div className="flex items-center gap-3 px-4 py-3 rounded-2xl mb-5"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <School className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(148,163,184,0.5)" }} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{escola.nome}</p>
                  <p className="text-xs" style={{ color: "rgba(148,163,184,0.4)" }}>INEP: {escola.inep}</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-black mb-2.5 flex items-center gap-1.5 uppercase tracking-wider" style={{ color: "rgba(52,211,153,0.9)" }}>
                    <Wifi className="w-3.5 h-3.5" /> APs Instalados *
                  </label>
                  <div className="relative">
                    <input
                      type="number" min="1" max="99"
                      value={qtdAp}
                      onChange={e => setQtdAp(e.target.value)}
                      placeholder={`Previsto: ${escola.qtdAp ?? 1} AP${(escola.qtdAp ?? 1) > 1 ? "s" : ""}`}
                      className="w-full px-5 py-4 rounded-2xl text-white text-xl font-black outline-none transition-all"
                      style={{
                        background: "rgba(16,185,129,0.07)",
                        border: qtdAp ? "1.5px solid rgba(16,185,129,0.4)" : "1.5px solid rgba(16,185,129,0.2)",
                      }}
                    />
                    {qtdAp && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2 px-2.5 py-1 rounded-lg text-xs font-bold"
                        style={{ background: "rgba(16,185,129,0.15)", color: "#34d399" }}>✓</div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black mb-2.5 flex items-center gap-1.5 uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.6)" }}>
                    <FileText className="w-3.5 h-3.5" /> Observações (opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={observacao}
                    onChange={e => setObservacao(e.target.value)}
                    placeholder="Alguma observação sobre a instalação..."
                    className="w-full px-4 py-3.5 rounded-2xl text-white text-sm outline-none resize-none transition-all"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.09)" }}
                  />
                </div>

                <div>
                  <label className="text-xs font-black mb-2.5 flex items-center gap-1.5 uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.6)" }}>
                    <Layers className="w-3.5 h-3.5" /> Foto do Mapa de Calor (opcional)
                  </label>
                  <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFotoChange} />
                  <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFotoChange} />

                  {fotoPreview ? (
                    <div className="relative rounded-2xl overflow-hidden" style={{ border: "1.5px solid rgba(16,185,129,0.3)" }}>
                      <img src={fotoPreview} alt="Mapa de calor" className="w-full max-h-52 object-cover" />
                      <button
                        onClick={() => {
                          setFotoPreview(null); setFotoBase64(null);
                          if (fileInputRef.current) fileInputRef.current.value = "";
                          if (cameraInputRef.current) cameraInputRef.current.value = "";
                        }}
                        className="absolute top-3 right-3 w-9 h-9 rounded-full flex items-center justify-center"
                        style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(4px)" }}>
                        <X className="w-4 h-4 text-white" />
                      </button>
                      <div className="absolute bottom-3 left-3 flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
                        style={{ background: "rgba(16,185,129,0.9)", color: "white" }}>
                        <CheckCircle className="w-3 h-3" /> Foto selecionada
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-2.5">
                      <button onClick={() => cameraInputRef.current?.click()}
                        className="py-5 rounded-2xl flex flex-col items-center gap-2.5 transition-all active:scale-95"
                        style={{ background: "rgba(99,102,241,0.07)", border: "1.5px dashed rgba(99,102,241,0.3)" }}>
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(99,102,241,0.15)" }}>
                          <Camera className="w-5 h-5" style={{ color: "#818cf8" }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: "#818cf8" }}>Câmera</span>
                      </button>
                      <button onClick={() => fileInputRef.current?.click()}
                        className="py-5 rounded-2xl flex flex-col items-center gap-2.5 transition-all active:scale-95"
                        style={{ background: "rgba(16,185,129,0.07)", border: "1.5px dashed rgba(16,185,129,0.3)" }}>
                        <div className="w-11 h-11 rounded-2xl flex items-center justify-center" style={{ background: "rgba(16,185,129,0.15)" }}>
                          <Upload className="w-5 h-5" style={{ color: "#34d399" }} />
                        </div>
                        <span className="text-xs font-bold" style={{ color: "#34d399" }}>Galeria</span>
                      </button>
                      <p className="col-span-2 text-center text-xs" style={{ color: "rgba(148,163,184,0.25)" }}>Máximo 5MB · JPG ou PNG</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setOpenConcluir(false)}
                  className="flex-1 py-4 rounded-2xl font-semibold text-sm transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(148,163,184,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}>
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
                  className="flex-1 py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95"
                  style={{
                    background: isOnline ? "linear-gradient(135deg, #059669, #10b981)" : "linear-gradient(135deg, #d97706, #f59e0b)",
                    boxShadow: isOnline ? "0 8px 24px rgba(16,185,129,0.3)" : "0 8px 24px rgba(245,158,11,0.3)",
                  }}>
                  {uploadingFoto ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando foto...</>
                  ) : concluirMut.isPending ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
                  ) : isOnline ? (
                    <><CheckCircle className="w-4 h-4" /> Confirmar Conclusão</>
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
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)" }}
          onClick={e => { if (e.target === e.currentTarget) setOpenNaoInstalada(false); }}>
          <div className="w-full max-w-lg rounded-t-[2.5rem] relative"
            style={{ background: "linear-gradient(180deg, #0d1a35 0%, #060b18 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>
            <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-[2.5rem]"
              style={{ background: "linear-gradient(90deg, #dc2626, #ef4444, #f87171)" }} />
            <div className="w-10 h-1 rounded-full mx-auto mt-5 mb-1" style={{ background: "rgba(255,255,255,0.12)" }} />

            <div className="px-6 pb-10 pt-4">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #dc2626, #ef4444)", boxShadow: "0 8px 24px rgba(239,68,68,0.3)" }}>
                  <AlertTriangle className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-white font-black text-xl">Não Instalada</h3>
                  <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.5)" }}>Informe o motivo da não instalação</p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-xs font-black mb-3 uppercase tracking-wider" style={{ color: "rgba(248,113,113,0.7)" }}>Selecione o motivo *</p>
                  <div className="space-y-2">
                    {MOTIVOS.map(m => (
                      <button key={m.value} onClick={() => setMotivo(m.value)}
                        className="w-full px-4 py-4 rounded-2xl text-left flex items-center gap-3.5 transition-all active:scale-[0.98]"
                        style={{
                          background: motivo === m.value ? "rgba(239,68,68,0.1)" : "rgba(255,255,255,0.04)",
                          border: motivo === m.value ? "1.5px solid rgba(239,68,68,0.45)" : "1.5px solid rgba(255,255,255,0.07)",
                          boxShadow: motivo === m.value ? "0 4px 16px rgba(239,68,68,0.12)" : "none",
                        }}>
                        <span className="text-2xl">{m.icon}</span>
                        <div className="flex-1">
                          <p className="text-sm font-bold" style={{ color: motivo === m.value ? "#f87171" : "rgba(226,232,240,0.8)" }}>{m.label}</p>
                          <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.4)" }}>{m.desc}</p>
                        </div>
                        <div className="w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center transition-all"
                          style={{
                            background: motivo === m.value ? "rgba(239,68,68,0.2)" : "rgba(255,255,255,0.05)",
                            border: motivo === m.value ? "2px solid #ef4444" : "2px solid rgba(255,255,255,0.1)",
                          }}>
                          {motivo === m.value && <div className="w-2.5 h-2.5 rounded-full" style={{ background: "#ef4444" }} />}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-xs font-black mb-2.5 flex items-center gap-1.5 uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.6)" }}>
                    <FileText className="w-3.5 h-3.5" /> Observações (opcional)
                  </label>
                  <textarea
                    rows={3}
                    value={obsNaoInstalada}
                    onChange={e => setObsNaoInstalada(e.target.value)}
                    placeholder="Detalhes adicionais sobre o problema..."
                    className="w-full px-4 py-3.5 rounded-2xl text-white text-sm outline-none resize-none transition-all"
                    style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.09)" }}
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => setOpenNaoInstalada(false)}
                  className="flex-1 py-4 rounded-2xl font-semibold text-sm transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(148,163,184,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  Cancelar
                </button>
                <button
                  onClick={() => naoInstaladaMut.mutate({ escolaId, tecnicoId, motivo, observacao: obsNaoInstalada || undefined })}
                  disabled={naoInstaladaMut.isPending}
                  className="flex-1 py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95"
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
