import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft, School, MapPin, Wifi, Phone, CheckCircle,
  MessageCircle, Hash, Building2, Signal, WifiOff, Clock,
  Play, XCircle, Camera, Upload, X, AlertTriangle, Zap, Star,
  Info, FileText, Layers, PhoneCall, Gauge, LocateFixed, Image,
  ChevronRight, Eye, Trash2
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

// ─── Categorias de fotos obrigatórias ────────────────────────────────────────
type FotoCategoria = "mapa_calor" | "fotos_ap" | "etiqueta_serial_ap" | "etiqueta_controladora" | "etiqueta_nobreak";

const CATEGORIAS_FOTOS: {
  id: FotoCategoria;
  label: string;
  desc: string;
  icon: string;
  color: string;
  bg: string;
  border: string;
  maxFotos: number;
}[] = [
  {
    id: "mapa_calor",
    label: "Mapa de Calor",
    desc: "Foto do mapa de calor do Wi-Fi",
    icon: "🌡️",
    color: "#f97316",
    bg: "rgba(249,115,22,0.08)",
    border: "rgba(249,115,22,0.25)",
    maxFotos: 1,
  },
  {
    id: "fotos_ap",
    label: "Fotos dos APs",
    desc: "Até 15 fotos dos access points instalados",
    icon: "📡",
    color: "#3b82f6",
    bg: "rgba(59,130,246,0.08)",
    border: "rgba(59,130,246,0.25)",
    maxFotos: 15,
  },
  {
    id: "etiqueta_serial_ap",
    label: "Etiqueta Serial do AP",
    desc: "Foto da etiqueta com número de série do AP",
    icon: "🏷️",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.25)",
    maxFotos: 1,
  },
  {
    id: "etiqueta_controladora",
    label: "Etiqueta da Controladora",
    desc: "Foto da etiqueta da controladora",
    icon: "🖥️",
    color: "#06b6d4",
    bg: "rgba(6,182,212,0.08)",
    border: "rgba(6,182,212,0.25)",
    maxFotos: 1,
  },
  {
    id: "etiqueta_nobreak",
    label: "Etiqueta do Nobreak",
    desc: "Foto da etiqueta do nobreak",
    icon: "🔋",
    color: "#10b981",
    bg: "rgba(16,185,129,0.08)",
    border: "rgba(16,185,129,0.25)",
    maxFotos: 1,
  },
];

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

// ─── Componente de Upload de Foto por Categoria ───────────────────────────────
function FotoUploadCard({
  categoria,
  osId,
  escolaId,
  tecnicoId,
  onUploadSuccess,
}: {
  categoria: typeof CATEGORIAS_FOTOS[0];
  osId: number;
  escolaId: number;
  tecnicoId: number;
  onUploadSuccess: () => void;
}) {
  const [fotos, setFotos] = useState<{ preview: string; base64: string; mime: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  const uploadMut = trpc.tecnicoAuth.uploadOsFoto.useMutation({
    onError: (err: { message: string }) => toast.error("Erro no upload: " + err.message),
  });

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remaining = categoria.maxFotos - fotos.length;
    const toProcess = files.slice(0, remaining);

    for (const file of toProcess) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: máximo 10MB por foto`); continue; }
      const mime = file.type || "image/jpeg";
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        setFotos(prev => [...prev, { preview: result, base64: result.split(",")[1], mime }]);
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  }

  async function handleUploadAll() {
    if (!fotos.length) return;
    setUploading(true);
    let sucesso = 0;
    for (const foto of fotos) {
      try {
        await uploadMut.mutateAsync({
          osId,
          escolaId,
          tecnicoId,
          categoria: categoria.id,
          imageBase64: foto.base64,
          mimeType: foto.mime,
        });
        sucesso++;
      } catch { /* continua */ }
    }
    setUploading(false);
    if (sucesso > 0) {
      toast.success(`${sucesso} foto${sucesso > 1 ? "s" : ""} enviada${sucesso > 1 ? "s" : ""}!`);
      setFotos([]);
      onUploadSuccess();
    }
  }

  const podeAdicionarMais = fotos.length < categoria.maxFotos;

  return (
    <>
      <div className="rounded-2xl overflow-hidden" style={{ background: categoria.bg, border: `1.5px solid ${categoria.border}` }}>
        {/* Header */}
        <div className="flex items-center gap-3 px-4 py-3.5">
          <span className="text-2xl">{categoria.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white">{categoria.label}</p>
            <p className="text-xs mt-0.5" style={{ color: "rgba(148,163,184,0.55)" }}>{categoria.desc}</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold"
            style={{ background: "rgba(255,255,255,0.06)", color: fotos.length > 0 ? categoria.color : "rgba(148,163,184,0.4)" }}>
            {fotos.length}/{categoria.maxFotos}
          </div>
        </div>

        {/* Fotos selecionadas */}
        {fotos.length > 0 && (
          <div className="px-4 pb-3">
            <div className="grid grid-cols-3 gap-2">
              {fotos.map((f, i) => (
                <div key={i} className="relative aspect-square rounded-xl overflow-hidden"
                  style={{ border: `1px solid ${categoria.border}` }}>
                  <img src={f.preview} alt={`Foto ${i+1}`} className="w-full h-full object-cover" />
                  <button
                    onClick={() => setLightboxImg(f.preview)}
                    className="absolute top-1 left-1 w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.6)" }}>
                    <Eye className="w-3 h-3 text-white" />
                  </button>
                  <button
                    onClick={() => setFotos(prev => prev.filter((_, idx) => idx !== i))}
                    className="absolute top-1 right-1 w-6 h-6 rounded-lg flex items-center justify-center"
                    style={{ background: "rgba(239,68,68,0.8)" }}>
                    <Trash2 className="w-3 h-3 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botões de ação */}
        <div className="px-4 pb-4 space-y-2">
          {/* Inputs ocultos */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple={categoria.maxFotos > 1}
            className="hidden"
            onChange={handleFileChange}
          />
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFileChange}
          />

          {podeAdicionarMais && (
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => cameraInputRef.current?.click()}
                className="py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Camera className="w-4 h-4" style={{ color: categoria.color }} />
                <span className="text-xs font-bold text-white">Câmera</span>
              </button>
              <button
                onClick={() => fileInputRef.current?.click()}
                className="py-3 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
                <Image className="w-4 h-4" style={{ color: categoria.color }} />
                <span className="text-xs font-bold text-white">Galeria</span>
              </button>
            </div>
          )}

          {fotos.length > 0 && (
            <button
              onClick={handleUploadAll}
              disabled={uploading}
              className="w-full py-3 rounded-xl flex items-center justify-center gap-2 font-black text-sm text-white transition-all active:scale-95"
              style={{ background: `linear-gradient(135deg, ${categoria.color}cc, ${categoria.color})`, boxShadow: `0 6px 20px ${categoria.color}33` }}>
              {uploading ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando...</>
              ) : (
                <><Upload className="w-4 h-4" /> Enviar {fotos.length} foto{fotos.length > 1 ? "s" : ""}</>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Lightbox */}
      {lightboxImg && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.95)" }}
          onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="Foto" className="max-w-full max-h-full rounded-2xl object-contain" />
          <button
            className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)" }}
            onClick={() => setLightboxImg(null)}>
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </>
  );
}

// ─── Componente de Fotos Já Enviadas ─────────────────────────────────────────
function FotosEnviadas({
  fotos,
  categoria,
}: {
  fotos: { id: number; url: string; categoria: string }[];
  categoria: typeof CATEGORIAS_FOTOS[0];
}) {
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const fotosDaCategoria = fotos.filter(f => f.categoria === categoria.id);
  if (!fotosDaCategoria.length) return null;

  return (
    <>
      <div className="mt-2">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{ color: "rgba(148,163,184,0.4)" }}>
          {fotosDaCategoria.length} foto{fotosDaCategoria.length > 1 ? "s" : ""} enviada{fotosDaCategoria.length > 1 ? "s" : ""}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {fotosDaCategoria.map((f) => (
            <button
              key={f.id}
              onClick={() => setLightboxImg(f.url)}
              className="aspect-square rounded-xl overflow-hidden transition-all active:scale-95"
              style={{ border: `1.5px solid ${categoria.border}` }}>
              <img src={f.url} alt="Foto enviada" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      </div>

      {lightboxImg && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.95)" }}
          onClick={() => setLightboxImg(null)}>
          <img src={lightboxImg} alt="Foto" className="max-w-full max-h-full rounded-2xl object-contain" />
          <button
            className="absolute top-5 right-5 w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: "rgba(255,255,255,0.15)" }}
            onClick={() => setLightboxImg(null)}>
            <X className="w-5 h-5 text-white" />
          </button>
        </div>
      )}
    </>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function TecnicoOS() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [tecnicoId, setTecnicoId] = useState(0);

  const [openConcluir, setOpenConcluir] = useState(false);
  const [openNaoInstalada, setOpenNaoInstalada] = useState(false);
  const [openFotos, setOpenFotos] = useState(false);

  const [qtdAp, setQtdAp] = useState("");
  const [observacao, setObservacao] = useState("");
  const [motivo, setMotivo] = useState<"escola_desativada" | "em_reforma" | "mudanca_endereco">("escola_desativada");
  const [obsNaoInstalada, setObsNaoInstalada] = useState("");
  const [pendingOffline, setPendingOffline] = useState(false);
  const [fotosRefreshKey, setFotosRefreshKey] = useState(0);

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

  // Busca OS ativa da escola
  const { data: ordensData } = trpc.tecnicoAuth.minhasOrdens.useQuery(
    { tecnicoId },
    { enabled: !!tecnicoId && !!escolaId }
  );

  const osAtiva = useMemo(() => {
    if (!ordensData) return null;
    return ordensData.find(o => o.escolaId === escolaId) ?? null;
  }, [ordensData, escolaId]);

  const osId = osAtiva?.id ?? 0;

  // Fotos já enviadas
  const { data: fotosEnviadas = [], refetch: refetchFotos } = trpc.tecnicoAuth.getOsFotos.useQuery(
    { osId },
    { enabled: !!osId && osId > 0 }
  );

  // Verifica se todas as categorias têm foto
  const { data: fotosStatus, refetch: refetchFotosStatus } = trpc.tecnicoAuth.verificarFotosObrigatorias.useQuery(
    { osId },
    { enabled: !!osId && osId > 0 }
  );

  const todasFotosOk = fotosStatus?.todasPreenchidas ?? false;

  function handleFotoUploadSuccess() {
    setFotosRefreshKey(k => k + 1);
    refetchFotos();
    refetchFotosStatus();
  }

  const iniciarMut = trpc.tecnicoAuth.iniciarOS.useMutation({
    onSuccess: () => { toast.success("OS iniciada com sucesso!"); utils.tecnicoAuth.minhasEscolas.invalidate(); utils.tecnicoAuth.minhasOrdens.invalidate(); },
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

  const isConcluida = escola?.status === "concluido";
  const isNaoInstalada = escola?.status === "nao_instalada";
  const isPendente = escola?.status === "pendente";
  const isEmAndamento = escola?.status === "em_andamento";

  const stepActive = isPendente ? 1 : isEmAndamento ? 2 : 3;

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
          <p className="text-sm font-bold" style={{ color: "rgba(148,163,184,0.5)" }}>Carregando OS...</p>
        </div>
      </div>
    );
  }

  if (!escola) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: "linear-gradient(160deg, #060b18 0%, #0d1a35 100%)" }}>
        <div className="text-center px-6">
          <div className="w-16 h-16 rounded-3xl flex items-center justify-center mx-auto mb-5"
            style={{ background: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.25)" }}>
            <XCircle className="w-8 h-8" style={{ color: "#f87171" }} />
          </div>
          <p className="text-white font-black text-xl mb-2">Escola não encontrada</p>
          <button onClick={() => navigate("/tecnico")}
            className="mt-4 px-6 py-3 rounded-2xl font-bold text-sm text-white"
            style={{ background: "linear-gradient(135deg, #6d28d9, #7c3aed)" }}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const iniciais = escola.nome.split(" ").filter(w => w.length > 2).slice(0, 2).map(w => w[0]).join("").toUpperCase() || escola.nome.slice(0, 2).toUpperCase();

  return (
    <div className="min-h-screen pb-10" style={{ background: "linear-gradient(160deg, #060b18 0%, #0d1a35 100%)" }}>

      {/* ─── Header ─── */}
      <div className="sticky top-0 z-30 px-4 pt-5 pb-4"
        style={{ background: "rgba(6,11,24,0.92)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.05)" }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate("/tecnico")}
            className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 transition-all active:scale-90"
            style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
            <ArrowLeft className="w-4.5 h-4.5 text-white" />
          </button>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold uppercase tracking-[0.15em] mb-0.5" style={{ color: "rgba(148,163,184,0.45)" }}>Ordem de Serviço</p>
            <p className="text-base font-black text-white truncate">{escola.nome}</p>
          </div>
          <div className="flex items-center gap-1.5 px-3.5 py-2 rounded-2xl flex-shrink-0"
            style={{ background: sc.badgeBg, boxShadow: `0 4px 16px ${sc.glow}`, border: `1px solid ${sc.badgeBorder}` }}>
            <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: sc.badgeText }} />
            <span className="text-xs font-black" style={{ color: sc.badgeText }}>{sc.label}</span>
          </div>
        </div>
      </div>

      {/* ─── Stepper ─── */}
      <div className="mx-4 mt-5 px-5 py-4 rounded-2xl"
        style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)" }}>
        <div className="flex items-center justify-between">
          <OSStep step={1} label="Pendente" active={stepActive === 1} done={stepActive > 1} />
          <div className="flex-1 h-0.5 mx-2 rounded-full"
            style={{ background: stepActive > 1 ? "linear-gradient(90deg, #10b981, #3b82f6)" : "rgba(255,255,255,0.06)" }} />
          <OSStep step={2} label="Andamento" active={stepActive === 2} done={stepActive > 2} />
          <div className="flex-1 h-0.5 mx-2 rounded-full"
            style={{ background: stepActive > 2 ? "linear-gradient(90deg, #3b82f6, #10b981)" : "rgba(255,255,255,0.06)" }} />
          <OSStep step={3} label="Concluído" active={stepActive === 3} done={isConcluida} />
        </div>
      </div>

      {/* ─── Card principal da escola ─── */}
      <div className="mx-4 mt-5 rounded-3xl overflow-hidden"
        style={{ background: "rgba(255,255,255,0.03)", border: `1.5px solid ${sc.cardBorder}`, boxShadow: `0 8px 40px ${sc.glow}` }}>
        <div className="h-1" style={{ background: sc.gradient }} />

        <div className="p-5">
          {/* Nome e badges */}
          <div className="flex items-start gap-4 mb-5">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0 text-xl font-black text-white"
              style={{ background: sc.gradient, boxShadow: `0 8px 24px ${sc.glow}` }}>
              {iniciais}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-lg font-black text-white leading-tight">{escola.nome}</p>
              <div className="flex flex-wrap gap-2 mt-2">
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.09)" }}>
                  <Hash className="w-3 h-3" style={{ color: "rgba(148,163,184,0.5)" }} />
                  <span className="text-xs font-bold" style={{ color: "rgba(226,232,240,0.8)" }}>INEP {escola.inep}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl"
                  style={{ background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.2)" }}>
                  <Wifi className="w-3 h-3" style={{ color: "#34d399" }} />
                  <span className="text-xs font-bold" style={{ color: "#34d399" }}>{escola.qtdAp ?? 1} AP{(escola.qtdAp ?? 1) > 1 ? "s" : ""}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Grid de informações */}
          <div className="grid grid-cols-2 gap-2.5">
            {/* Endereço - full width */}
            <InfoCard
              icon={<MapPin className="w-5 h-5" />}
              label="Endereço"
              value={escola.endereco ?? "Não informado"}
              iconBg="rgba(239,68,68,0.15)"
              iconColor="#f87171"
              labelColor="rgba(248,113,113,0.7)"
              fullWidth
            />

            {/* Município */}
            <InfoCard
              icon={<Building2 className="w-5 h-5" />}
              label="Município"
              value={escola.municipio ?? "—"}
              iconBg="rgba(99,102,241,0.15)"
              iconColor="#818cf8"
              labelColor="rgba(129,140,248,0.7)"
            />

            {/* Velocidade */}
            <InfoCard
              icon={<Gauge className="w-5 h-5" />}
              label="Velocidade"
              value={escola.velocidadeOfertada ? `${escola.velocidadeOfertada} Mbps` : "—"}
              iconBg="rgba(59,130,246,0.15)"
              iconColor="#60a5fa"
              labelColor="rgba(96,165,250,0.7)"
            />

            {/* Telefone - full width */}
            <InfoCard
              icon={<PhoneCall className="w-5 h-5" />}
              label="Telefone"
              value={telDisplay || "Não cadastrado"}
              iconBg="rgba(16,185,129,0.15)"
              iconColor="#34d399"
              labelColor="rgba(52,211,153,0.7)"
              fullWidth
              large
            />

            {/* GPS - full width */}
            {hasCoords && (
              <InfoCard
                icon={<LocateFixed className="w-5 h-5" />}
                label="Coordenadas GPS"
                value={`${lat?.toFixed(5)}, ${lng?.toFixed(5)}`}
                iconBg="rgba(245,158,11,0.15)"
                iconColor="#fbbf24"
                labelColor="rgba(251,191,36,0.7)"
                fullWidth
              />
            )}
          </div>

          {/* Botões Maps e WhatsApp */}
          <div className="grid grid-cols-2 gap-2.5 mt-4">
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-3 px-4 py-4 rounded-2xl transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", boxShadow: "0 6px 20px rgba(59,130,246,0.3)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.15)" }}>
                <LocateFixed className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <p className="text-sm font-black text-white">Google Maps</p>
                <p className="text-[10px]" style={{ color: "rgba(255,255,255,0.6)" }}>Rota GPS</p>
              </div>
            </a>

            {whatsappUrl ? (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-4 rounded-2xl transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #15803d, #16a34a)", boxShadow: "0 6px 20px rgba(22,163,74,0.3)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.15)" }}>
                  <MessageCircle className="w-4.5 h-4.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-black text-white">WhatsApp</p>
                  <p className="text-[10px] truncate" style={{ color: "rgba(255,255,255,0.6)" }}>{telDisplay}</p>
                </div>
              </a>
            ) : (
              <div className="flex items-center gap-3 px-4 py-4 rounded-2xl"
                style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.05)" }}>
                  <Phone className="w-4.5 h-4.5" style={{ color: "rgba(148,163,184,0.3)" }} />
                </div>
                <div>
                  <p className="text-sm font-bold" style={{ color: "rgba(148,163,184,0.4)" }}>WhatsApp</p>
                  <p className="text-xs" style={{ color: "rgba(100,116,139,0.3)" }}>Não cadastrado</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─── Seção de Fotos da OS ─── */}
      {!isConcluida && !isNaoInstalada && osId > 0 && (
        <div className="mx-4 mt-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(59,130,246,0.15)" }}>
                <Camera className="w-4 h-4" style={{ color: "#60a5fa" }} />
              </div>
              <p className="text-xs font-black uppercase tracking-[0.15em]" style={{ color: "rgba(148,163,184,0.6)" }}>
                Fotos da OS
              </p>
            </div>
            <button
              onClick={() => setOpenFotos(!openFotos)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all active:scale-95"
              style={{
                background: todasFotosOk ? "rgba(16,185,129,0.12)" : "rgba(59,130,246,0.12)",
                color: todasFotosOk ? "#34d399" : "#60a5fa",
                border: `1px solid ${todasFotosOk ? "rgba(16,185,129,0.25)" : "rgba(59,130,246,0.25)"}`,
              }}>
              {todasFotosOk ? (
                <><CheckCircle className="w-3.5 h-3.5" /> Completo</>
              ) : (
                <><Camera className="w-3.5 h-3.5" /> {openFotos ? "Fechar" : "Adicionar"}</>
              )}
            </button>
          </div>

          {/* Status das categorias */}
          <div className="grid grid-cols-5 gap-1.5 mb-3">
            {CATEGORIAS_FOTOS.map(cat => {
              const temFoto = fotosStatus?.resultado?.[cat.id] ?? false;
              const qtdEnviadas = (fotosEnviadas as { categoria: string }[]).filter(f => f.categoria === cat.id).length;
              return (
                <div key={cat.id} className="flex flex-col items-center gap-1 p-2 rounded-xl"
                  style={{
                    background: temFoto ? "rgba(16,185,129,0.08)" : "rgba(255,255,255,0.03)",
                    border: `1px solid ${temFoto ? "rgba(16,185,129,0.25)" : "rgba(255,255,255,0.06)"}`,
                  }}>
                  <span className="text-base">{cat.icon}</span>
                  {temFoto ? (
                    <CheckCircle className="w-3 h-3" style={{ color: "#34d399" }} />
                  ) : (
                    <div className="w-3 h-3 rounded-full" style={{ background: "rgba(255,255,255,0.1)" }} />
                  )}
                  {qtdEnviadas > 0 && (
                    <span className="text-[9px] font-bold" style={{ color: "rgba(148,163,184,0.5)" }}>{qtdEnviadas}</span>
                  )}
                </div>
              );
            })}
          </div>

          {!todasFotosOk && (
            <div className="flex items-center gap-2 px-3 py-2.5 rounded-xl mb-3"
              style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
              <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "#fbbf24" }} />
              <p className="text-xs" style={{ color: "rgba(251,191,36,0.8)" }}>
                Todas as fotos são obrigatórias para concluir a OS
              </p>
            </div>
          )}

          {/* Cards de upload por categoria */}
          {openFotos && (
            <div className="space-y-3">
              {CATEGORIAS_FOTOS.map(cat => (
                <div key={cat.id}>
                  <FotoUploadCard
                    key={`${cat.id}-${fotosRefreshKey}`}
                    categoria={cat}
                    osId={osId}
                    escolaId={escolaId}
                    tecnicoId={tecnicoId}
                    onUploadSuccess={handleFotoUploadSuccess}
                  />
                  <FotosEnviadas
                    fotos={fotosEnviadas as { id: number; url: string; categoria: string }[]}
                    categoria={cat}
                  />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

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

            {/* Botão de fotos */}
            {osId > 0 && !todasFotosOk && (
              <button
                onClick={() => { setOpenFotos(true); setTimeout(() => document.getElementById("fotos-section")?.scrollIntoView({ behavior: "smooth" }), 100); }}
                className="w-full py-4 rounded-3xl flex items-center justify-center gap-3 font-bold text-sm text-white transition-all active:scale-[0.97]"
                style={{
                  background: "rgba(59,130,246,0.1)",
                  border: "1.5px solid rgba(59,130,246,0.3)",
                  color: "#60a5fa",
                }}>
                <Camera className="w-4.5 h-4.5" />
                Adicionar Fotos Obrigatórias
                <ChevronRight className="w-4 h-4 ml-auto" />
              </button>
            )}

            <button
              onClick={() => {
                if (osId > 0 && !todasFotosOk) {
                  toast.error("Adicione todas as fotos obrigatórias antes de concluir a OS", { duration: 4000 });
                  setOpenFotos(true);
                  return;
                }
                setOpenConcluir(true);
              }}
              className="w-full py-5 rounded-3xl flex items-center justify-center gap-3 font-black text-base text-white transition-all active:scale-[0.97]"
              style={{
                background: (osId > 0 && !todasFotosOk)
                  ? "rgba(16,185,129,0.15)"
                  : "linear-gradient(135deg, #065f46, #059669, #10b981)",
                boxShadow: (osId > 0 && !todasFotosOk) ? "none" : "0 12px 40px rgba(16,185,129,0.3)",
                border: (osId > 0 && !todasFotosOk) ? "1.5px solid rgba(16,185,129,0.2)" : "1px solid rgba(16,185,129,0.25)",
                opacity: (osId > 0 && !todasFotosOk) ? 0.6 : 1,
              }}>
              <CheckCircle className="w-5 h-5" />
              Marcar como Concluído
              {osId > 0 && !todasFotosOk && <span className="text-xs ml-1 opacity-60">(fotos pendentes)</span>}
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
            Todas as 5 categorias de fotos são obrigatórias para concluir a OS. Em caso de problemas, use "Não Instalada" com o motivo correto.
          </p>
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

              {/* Status das fotos no modal */}
              <div className="px-4 py-3 rounded-2xl mb-4"
                style={{
                  background: todasFotosOk ? "rgba(16,185,129,0.06)" : "rgba(245,158,11,0.06)",
                  border: `1px solid ${todasFotosOk ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.2)"}`,
                }}>
                <div className="flex items-center gap-2 mb-2">
                  {todasFotosOk ? (
                    <CheckCircle className="w-4 h-4" style={{ color: "#34d399" }} />
                  ) : (
                    <AlertTriangle className="w-4 h-4" style={{ color: "#fbbf24" }} />
                  )}
                  <p className="text-xs font-bold" style={{ color: todasFotosOk ? "#34d399" : "#fbbf24" }}>
                    {todasFotosOk ? "Todas as fotos enviadas ✓" : "Fotos pendentes"}
                  </p>
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {CATEGORIAS_FOTOS.map(cat => {
                    const temFoto = fotosStatus?.resultado?.[cat.id] ?? false;
                    return (
                      <div key={cat.id} className="flex flex-col items-center gap-0.5">
                        <span className="text-sm">{cat.icon}</span>
                        <div className="w-4 h-4 rounded-full flex items-center justify-center"
                          style={{ background: temFoto ? "rgba(16,185,129,0.2)" : "rgba(245,158,11,0.15)" }}>
                          {temFoto ? (
                            <CheckCircle className="w-2.5 h-2.5" style={{ color: "#34d399" }} />
                          ) : (
                            <X className="w-2.5 h-2.5" style={{ color: "#fbbf24" }} />
                          )}
                        </div>
                      </div>
                    );
                  })}
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
                    if (osId > 0 && !todasFotosOk) {
                      toast.error("Adicione todas as fotos obrigatórias antes de concluir");
                      setOpenConcluir(false);
                      setOpenFotos(true);
                      return;
                    }
                    if (!isOnline) {
                      enqueueOfflineAction({ type: "concluirEscola", payload: { escolaId, tecnicoId, qtdApInstalado: n, observacoes: observacao || undefined, dataHora: new Date().toISOString() } });
                      setPendingOffline(true); setOpenConcluir(false);
                      toast.success("OS salva localmente! Será enviada ao servidor quando você tiver internet.", { duration: 5000 });
                      return;
                    }
                    concluirMut.mutate({ tecnicoId, escolaId, qtdApInstalado: n, observacao });
                  }}
                  disabled={concluirMut.isPending}
                  className="flex-1 py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95"
                  style={{
                    background: isOnline ? "linear-gradient(135deg, #059669, #10b981)" : "linear-gradient(135deg, #d97706, #f59e0b)",
                    boxShadow: isOnline ? "0 8px 24px rgba(16,185,129,0.3)" : "0 8px 24px rgba(245,158,11,0.3)",
                  }}>
                  {concluirMut.isPending ? (
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
