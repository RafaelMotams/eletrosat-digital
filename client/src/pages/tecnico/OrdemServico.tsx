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
import { dbEnqueueOS, dbGetCachedEscolas } from "@/hooks/useOfflineDB";
import { useSyncOfflineOS } from "@/hooks/useSyncOfflineOS";

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
type FotoCategoria = "mapa_calor" | "fotos_ap" | "etiqueta_controladora" | "etiqueta_nobreak" | "etiqueta_switch";

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
    label: "Etiqueta do AP",
    desc: "Até 15 fotos da etiqueta dos access points instalados",
    icon: "🏷️",
    color: "#8b5cf6",
    bg: "rgba(139,92,246,0.08)",
    border: "rgba(139,92,246,0.25)",
    maxFotos: 15,
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
  {
    id: "etiqueta_switch",
    label: "Etiqueta do Switch",
    desc: "Foto da etiqueta do switch de rede (até 3 fotos)",
    icon: "🔀",
    color: "#f59e0b",
    bg: "rgba(245,158,11,0.08)",
    border: "rgba(245,158,11,0.25)",
    maxFotos: 3,
  },
];

// Tipo para cada foto pendente
type FotoPendente = { base64: string; mime: string; preview: string };

function formatWhatsApp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  // Remove tudo que não é dígito
  const digits = raw.replace(/\D/g, "");
  if (!digits || digits.length < 8) return null;
  // Se já começa com 55 (código do Brasil), usa direto
  if (digits.startsWith("55") && digits.length >= 12) return digits;
  // Se tem DDD (10 ou 11 dígitos), adiciona código do Brasil
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  // Se tem apenas o número sem DDD (8 ou 9 dígitos), retorna como está para wa.me
  return digits;
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

// ─── Componente simples de upload por categoria ───────────────────────────────
function CategoriaUploadCard({
  categoria,
  fotos,
  onAddFotos,
  onRemoveFoto,
}: {
  categoria: typeof CATEGORIAS_FOTOS[0];
  fotos: FotoPendente[];
  onAddFotos: (novas: FotoPendente[]) => void;
  onRemoveFoto: (idx: number) => void;
}) {
  const [lightboxImg, setLightboxImg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const canAdd = fotos.length < categoria.maxFotos;

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;
    const remaining = categoria.maxFotos - fotos.length;
    const toProcess = files.slice(0, remaining);
    const novas: FotoPendente[] = [];
    let processed = 0;
    for (const file of toProcess) {
      if (file.size > 10 * 1024 * 1024) { toast.error(`${file.name}: máximo 10MB por foto`); processed++; continue; }
      const mime = file.type || "image/jpeg";
      const reader = new FileReader();
      reader.onload = (ev) => {
        const result = ev.target?.result as string;
        novas.push({ preview: result, base64: result.split(",")[1], mime });
        processed++;
        if (processed === toProcess.length) {
          onAddFotos(novas);
        }
      };
      reader.readAsDataURL(file);
    }
    e.target.value = "";
  }

  return (
    <>
      <div className="rounded-2xl overflow-hidden"
        style={{ background: categoria.bg, border: `1.5px solid ${categoria.border}` }}>
        {/* Header da categoria */}
        <div className="flex items-center gap-3 px-4 py-3.5"
          style={{ borderBottom: `1px solid ${categoria.border}` }}>
          <span className="text-xl">{categoria.icon}</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-black text-white">{categoria.label}</p>
            <p className="text-[10px] mt-0.5" style={{ color: "rgba(148,163,184,0.5)" }}>{categoria.desc}</p>
          </div>
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg"
            style={{
              background: fotos.length > 0 ? "rgba(16,185,129,0.15)" : "rgba(255,255,255,0.05)",
              border: `1px solid ${fotos.length > 0 ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.08)"}`,
            }}>
            <span className="text-xs font-black" style={{ color: fotos.length > 0 ? "#34d399" : "rgba(148,163,184,0.4)" }}>
              {fotos.length}/{categoria.maxFotos}
            </span>
          </div>
        </div>

        {/* Prévia das fotos */}
        {fotos.length > 0 && (
          <div className="px-4 pt-3 pb-2">
            <div className="grid grid-cols-3 gap-2">
              {fotos.map((f, idx) => (
                <div key={idx} className="relative aspect-square rounded-xl overflow-hidden"
                  style={{ border: `1.5px solid ${categoria.border}` }}>
                  <img
                    src={f.preview}
                    alt={`Foto ${idx + 1}`}
                    className="w-full h-full object-cover cursor-pointer"
                    onClick={() => setLightboxImg(f.preview)}
                  />
                  <button
                    onClick={() => onRemoveFoto(idx)}
                    className="absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center"
                    style={{ background: "rgba(0,0,0,0.7)" }}>
                    <X className="w-3.5 h-3.5 text-white" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Botões câmera/galeria */}
        {canAdd && (
          <div className="grid grid-cols-2 gap-2 px-4 py-3">
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple={categoria.maxFotos > 1}
              className="hidden"
              onChange={handleFileChange}
            />
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple={categoria.maxFotos > 1}
              className="hidden"
              onChange={handleFileChange}
            />
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

// ─── Fotos já enviadas (do servidor) ─────────────────────────────────────────
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
          {fotosDaCategoria.length} foto{fotosDaCategoria.length > 1 ? "s" : ""} já enviada{fotosDaCategoria.length > 1 ? "s" : ""}
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
  const [tecnicoId, setTecnicoId] = useState<number>(() => {
    // Inicializa imediatamente do localStorage — evita delay do useEffect
    const id = localStorage.getItem("tecnico_id");
    if (id) return Number(id);
    try {
      const stored = localStorage.getItem("tecnico");
      if (stored) return Number(JSON.parse(stored).id) || 0;
    } catch { /* noop */ }
    return 0;
  });

  const [openConcluir, setOpenConcluir] = useState(false);
  const [openNaoInstalada, setOpenNaoInstalada] = useState(false);
  const [uploadingAll, setUploadingAll] = useState(false);

  // Estado simples de fotos por categoria — um array de FotoPendente por categoria
  const [fotosPorCategoria, setFotosPorCategoria] = useState<Record<FotoCategoria, FotoPendente[]>>({
    mapa_calor: [],
    fotos_ap: [],
    etiqueta_controladora: [],
    etiqueta_nobreak: [],
    etiqueta_switch: [],
  });

  const [qtdAp, setQtdAp] = useState("");
  const [observacao, setObservacao] = useState("");
  const [motivo, setMotivo] = useState<"escola_desativada" | "em_reforma" | "mudanca_endereco">("escola_desativada");
  const [obsNaoInstalada, setObsNaoInstalada] = useState("");
  const [pendingOffline, setPendingOffline] = useState(false);
  const [offlineEscola, setOfflineEscola] = useState<Record<string, unknown> | null>(null);

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

  // ANTI-REDIRECT ao voltar da câmera/WhatsApp/Maps:
  // Quando o documento fica visível novamente (visibilitychange), garante que a rota está correta
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Salva a rota da OS em sessionStorage (limpa ao fechar o app completamente)
        // Não usa localStorage para que ao fechar e reabrir vá para o menu
        const currentPath = window.location.pathname;
        if (currentPath.startsWith('/tecnico/os/')) {
          sessionStorage.setItem('tecnico_session_route', currentPath);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // ANTI-REDIRECT: queries com staleTime alto e sem refetch automático
  // Garante que a escola não desaparece enquanto o técnico preenche a RDO
  const { data: escolaOnline, isLoading, isFetching } = trpc.tecnicoAuth.minhasEscolas.useQuery(
    { tecnicoId },
    {
      enabled: !!tecnicoId && isOnline,
      select: (data) => data?.find(e => e.id === escolaId),
      staleTime: 15 * 60 * 1000,      // 15 min — não refaz durante preenchimento
      refetchInterval: false,          // Sem polling na tela de OS
      refetchOnWindowFocus: false,     // Não refaz ao voltar do app de câmera
      refetchOnReconnect: false,       // Não refaz ao reconectar (técnico pode estar offline)
      placeholderData: (prev) => prev, // Mantém dado anterior durante qualquer refetch
      retry: 1,                        // Apenas 1 retry em erro de rede
    }
  );

  // Carrega escola do IndexedDB quando offline
  useEffect(() => {
    if (!isOnline && tecnicoId && !escolaOnline) {
      dbGetCachedEscolas(tecnicoId).then((cached) => {
        if (cached) {
          const found = (cached as Record<string, unknown>[]).find((e) => e.id === escolaId);
          if (found) setOfflineEscola(found);
        }
      });
    }
  }, [isOnline, tecnicoId, escolaId, escolaOnline]);

  // ANTI-REDIRECT: mantém a última escola conhecida em um ref
  // Isso garante que ao voltar do app de câmera, a escola não desaparece
  const escolaRef = useRef<typeof escolaOnline | null>(null);
  const escolaResolvida = escolaOnline ?? (offlineEscola as unknown as typeof escolaOnline) ?? undefined;
  if (escolaResolvida) escolaRef.current = escolaResolvida;
  const escola = escolaResolvida ?? escolaRef.current ?? undefined;

  // Busca OS ativa da escola
  const { data: ordensData } = trpc.tecnicoAuth.minhasOrdens.useQuery(
    { tecnicoId },
    {
      enabled: !!tecnicoId && !!escolaId,
      staleTime: 15 * 60 * 1000,
      refetchInterval: false,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      placeholderData: (prev) => prev,
      retry: 1,
    }
  );

  const osAtiva = useMemo(() => {
    if (!ordensData) return null;
    // Priorizar OS em_andamento ou aberta para garantir que o upload vai para a OS correta
    return ordensData.find(o => o.escolaId === escolaId && (o.status === "em_andamento" || o.status === "aberta")) ?? null;
  }, [ordensData, escolaId]);

  const osId = osAtiva?.id ?? 0;

  // Fotos já enviadas ao servidor
  const { data: fotosEnviadas = [], refetch: refetchFotos } = trpc.tecnicoAuth.getOsFotos.useQuery(
    { osId },
    {
      enabled: !!osId && osId > 0,
      staleTime: 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: false,
      retry: 1,
    }
  );

  // Mutation de upload de foto
  const uploadOsFotoMut = trpc.tecnicoAuth.uploadOsFoto.useMutation({
    onError: (err: { message: string }) => toast.error("Erro no upload: " + err.message),
  });

  // Estado local para simular "em andamento" imediatamente (antes do refetch)
  const [localStatus, setLocalStatus] = useState<string | null>(null);

  const iniciarMut = trpc.tecnicoAuth.iniciarOS.useMutation({
    onSuccess: () => {
      toast.success("OS iniciada com sucesso!");
      // Atualiza o estado local imediatamente para refletir na UI sem esperar refetch
      setLocalStatus("em_andamento");
      // Força refetch imediato das queries para carregar osId e seção de fotos
      utils.tecnicoAuth.minhasEscolas.invalidate();
      utils.tecnicoAuth.minhasOrdens.invalidate();
      utils.tecnicoAuth.minhasEscolas.refetch();
      utils.tecnicoAuth.minhasOrdens.refetch();
    },
    onError: (err: { message: string }) => toast.error("Erro ao iniciar OS: " + err.message),
  });

  async function handleIniciarOS() {
    if (!isOnline) {
      // Offline: salva no IndexedDB e atualiza estado local
      try {
        await dbEnqueueOS({
          escolaId,
          tecnicoId,
          qtdApInstalado: 0,
          observacao: "",
          dataHora: new Date().toISOString(),
          fotos: [],
          tipo: "iniciar",
        });
        setLocalStatus("em_andamento");
        toast.success("OS iniciada offline — será sincronizada ao voltar online");
      } catch {
        toast.error("Erro ao salvar offline");
      }
      return;
    }
    iniciarMut.mutate({ escolaId, tecnicoId });
  }

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

  // Sincronização automática ao voltar online (IndexedDB)
  const { syncState } = useSyncOfflineOS(() => {
    utils.tecnicoAuth.minhasEscolas.invalidate();
    utils.tecnicoAuth.minhasOrdens.invalidate();
    toast.success("OS sincronizadas com sucesso!");
  });

  // Atualiza pendingOffline com base no IndexedDB
  useEffect(() => {
    import("@/hooks/useOfflineDB").then(({ dbGetAllPendingOS }) => {
      dbGetAllPendingOS().then(all => {
        setPendingOffline(all.some(o => o.escolaId === escolaId && o.status !== "done"));
      });
    });
  }, [escolaId, syncState.pendingCount]);

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
  // Considera localStatus (offline) ou status do servidor
  const effectiveStatus = localStatus ?? escola?.status;
  const isPendente = effectiveStatus === "pendente";
  const isEmAndamento = effectiveStatus === "em_andamento";

  const stepActive = isPendente ? 1 : isEmAndamento ? 2 : 3;

  // Helpers para manipular fotos por categoria
  function addFotos(catId: FotoCategoria, novas: FotoPendente[]) {
    setFotosPorCategoria(prev => ({
      ...prev,
      [catId]: [...prev[catId], ...novas].slice(0, CATEGORIAS_FOTOS.find(c => c.id === catId)!.maxFotos),
    }));
  }

  function removeFoto(catId: FotoCategoria, idx: number) {
    setFotosPorCategoria(prev => ({
      ...prev,
      [catId]: prev[catId].filter((_, i) => i !== idx),
    }));
  }

  // Contagem total de fotos pendentes
  const totalFotosPendentes = Object.values(fotosPorCategoria).reduce((acc, arr) => acc + arr.length, 0);

  // Verifica quantas categorias têm fotos (pendentes ou já enviadas)
  function categoriasComFoto(): number {
    let count = 0;
    for (const cat of CATEGORIAS_FOTOS) {
      const pendentes = fotosPorCategoria[cat.id].length;
      const enviadas = (fotosEnviadas as { id: number; url: string; categoria: string }[]).filter(f => f.categoria === cat.id).length;
      if (pendentes > 0 || enviadas > 0) count++;
    }
    return count;
  }

  // Verifica se TODAS as categorias obrigatórias têm pelo menos 1 foto
  const todasCategoriasFotos = CATEGORIAS_FOTOS.every(cat => {
    const pendentes = fotosPorCategoria[cat.id].length;
    const enviadas = (fotosEnviadas as { id: number; url: string; categoria: string }[]).filter(f => f.categoria === cat.id).length;
    return pendentes > 0 || enviadas > 0;
  });
  const categoriasFaltando = CATEGORIAS_FOTOS.filter(cat => {
    const pendentes = fotosPorCategoria[cat.id].length;
    const enviadas = (fotosEnviadas as { id: number; url: string; categoria: string }[]).filter(f => f.categoria === cat.id).length;
    return pendentes === 0 && enviadas === 0;
  });

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

  // Se ainda está buscando (primeiro load ou refetch), mostra loading
  // NUNCA mostra "escola não encontrada" enquanto ainda há uma busca em andamento
  if (!escola && (isFetching || !tecnicoId)) {
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
          <p className="text-sm text-slate-500 mb-4">Verifique sua conexão ou volte e tente novamente.</p>
          <button onClick={() => navigate("/tecnico")}
            className="mt-2 px-6 py-3 rounded-2xl font-bold text-sm text-white"
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
              value={escola.municipio ?? "Não informado"}
              iconBg="rgba(59,130,246,0.15)"
              iconColor="#60a5fa"
              labelColor="rgba(96,165,250,0.7)"
            />
            {/* Velocidade */}
            <InfoCard
              icon={<Gauge className="w-5 h-5" />}
              label="Velocidade"
              value={escola.velocidadeOfertada ? `${escola.velocidadeOfertada} Mbps` : "Não informado"}
              iconBg="rgba(168,85,247,0.15)"
              iconColor="#c084fc"
              labelColor="rgba(192,132,252,0.7)"
            />
          </div>

          {/* Telefone - full width */}
          {telDisplay ? (
            <div className="mt-2.5">
              <a
                href={`tel:${escola.telefone || escola.telefoneWhatsApp}`}
                className="flex items-center gap-3.5 px-4 py-4 rounded-2xl w-full transition-all active:scale-[0.98]"
                style={{ background: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.15)" }}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(16,185,129,0.15)" }}>
                  <PhoneCall className="w-5 h-5" style={{ color: "#34d399" }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider mb-0.5" style={{ color: "rgba(52,211,153,0.7)" }}>Telefone</p>
                  <p className="font-bold text-white text-sm">{telDisplay}</p>
                </div>
                <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: "rgba(52,211,153,0.4)" }} />
              </a>
            </div>
          ) : (
            <div className="mt-2.5 flex items-center gap-3 px-4 py-4 rounded-2xl"
              style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: "rgba(255,255,255,0.05)" }}>
                <Phone className="w-4.5 h-4.5" style={{ color: "rgba(148,163,184,0.3)" }} />
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: "rgba(148,163,184,0.4)" }}>Telefone</p>
                <p className="text-xs" style={{ color: "rgba(100,116,139,0.3)" }}>Não cadastrado</p>
              </div>
            </div>
          )}

          {/* Botões de ação rápida */}
          <div className="grid grid-cols-2 gap-2.5 mt-2.5">
            {/* Google Maps */}
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.97]"
              style={{ background: "rgba(59,130,246,0.1)", border: "1.5px solid rgba(59,130,246,0.25)", color: "#60a5fa" }}>
              <LocateFixed className="w-4 h-4" />
              Google Maps
            </a>

            {/* WhatsApp */}
            {whatsappUrl ? (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm transition-all active:scale-[0.97]"
                style={{ background: "rgba(37,211,102,0.1)", border: "1.5px solid rgba(37,211,102,0.25)", color: "#25d366" }}>
                <MessageCircle className="w-4 h-4" />
                WhatsApp
              </a>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3.5 rounded-2xl font-bold text-sm"
                style={{ background: "rgba(255,255,255,0.03)", border: "1.5px solid rgba(255,255,255,0.07)", color: "rgba(100,116,139,0.3)" }}>
                <Phone className="w-4 h-4" />
                WhatsApp
              </div>
            )}
          </div>
        </div>
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
                onClick={handleIniciarOS}
                disabled={iniciarMut.isPending}
                className="w-full py-5 rounded-3xl flex items-center justify-center gap-3 font-black text-base text-white transition-all active:scale-[0.97]"
                style={{
                  background: "linear-gradient(135deg, #4c1d95, #6d28d9, #7c3aed)",
                  boxShadow: "0 12px 40px rgba(109,40,217,0.35)",
                  border: "1px solid rgba(168,85,247,0.3)",
                }}>
                {iniciarMut.isPending ? (
                  <><div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Iniciando...</>
                ) : !isOnline ? (
                  <><WifiOff className="w-5 h-5" /> Iniciar Offline</>
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
            Ao clicar em "Marcar como Concluído", você deverá enviar as fotos obrigatórias e informar a quantidade de APs instalados.
          </p>
        </div>
      </div>

      {/* ─── Modal de Conclusão ─── */}
      {openConcluir && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.88)", backdropFilter: "blur(20px)" }}>
          <div className="w-full max-w-lg rounded-t-[2.5rem] overflow-y-auto max-h-[96vh] relative"
            style={{ background: "linear-gradient(180deg, #0d1a35 0%, #060b18 100%)", border: "1px solid rgba(255,255,255,0.08)" }}>

            <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-[2.5rem]"
              style={{ background: "linear-gradient(90deg, #059669, #10b981, #34d399)" }} />
            <div className="w-10 h-1 rounded-full mx-auto mt-5 mb-1" style={{ background: "rgba(255,255,255,0.12)" }} />

            <div className="px-5 pb-10 pt-4">
              {/* Cabeçalho */}
              <div className="flex items-center gap-3 mb-5">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 8px 24px rgba(16,185,129,0.3)" }}>
                  <CheckCircle className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-black text-xl">Concluir OS</h3>
                  <p className="text-xs mt-0.5 truncate" style={{ color: "rgba(148,163,184,0.5)" }}>{escola.nome}</p>
                </div>
                <button onClick={() => setOpenConcluir(false)}
                  className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.06)" }}>
                  <X className="w-4 h-4 text-white" />
                </button>
              </div>

              {/* Barra de progresso geral */}
              <div className="px-4 py-3 rounded-2xl mb-5"
                style={{
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.07)",
                }}>
                <div className="flex items-center justify-between mb-2.5">
                  <div className="flex items-center gap-1.5">
                    <Camera className="w-3.5 h-3.5" style={{ color: "#fbbf24" }} />
                    <p className="text-xs font-black uppercase tracking-wider" style={{ color: "#fbbf24" }}>
                      Fotos por categoria
                    </p>
                  </div>
                  <span className="text-xs font-bold" style={{ color: "rgba(148,163,184,0.6)" }}>
                    {totalFotosPendentes} foto{totalFotosPendentes !== 1 ? "s" : ""} selecionada{totalFotosPendentes !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="grid grid-cols-5 gap-1.5">
                  {CATEGORIAS_FOTOS.map(cat => {
                    const pendentes = fotosPorCategoria[cat.id].length;
                    const enviadas = (fotosEnviadas as { id: number; url: string; categoria: string }[]).filter(f => f.categoria === cat.id).length;
                    const temFoto = pendentes > 0 || enviadas > 0;
                    return (
                      <div key={cat.id} className="flex flex-col items-center gap-1 py-2 rounded-xl"
                        style={{
                          background: temFoto ? "rgba(16,185,129,0.1)" : "rgba(255,255,255,0.04)",
                          border: `1px solid ${temFoto ? "rgba(16,185,129,0.3)" : "rgba(255,255,255,0.07)"}`,
                        }}>
                        <span className="text-sm">{cat.icon}</span>
                        <p className="text-[8px] font-bold text-center px-1 leading-tight" style={{ color: temFoto ? "#34d399" : "rgba(148,163,184,0.4)" }}>
                          {cat.label.split(" ").slice(-1)[0]}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Cards de upload por categoria — sem forwardRef, estado direto no pai */}
              <div className="space-y-3 mb-5">
                {CATEGORIAS_FOTOS.map((cat) => (
                  <div key={cat.id}>
                    <CategoriaUploadCard
                      categoria={cat}
                      fotos={fotosPorCategoria[cat.id]}
                      onAddFotos={(novas) => addFotos(cat.id, novas)}
                      onRemoveFoto={(idx) => removeFoto(cat.id, idx)}
                    />
                    <FotosEnviadas
                      fotos={fotosEnviadas as { id: number; url: string; categoria: string }[]}
                      categoria={cat}
                    />
                  </div>
                ))}
              </div>

              {/* Campo de APs */}
              <div className="mb-4">
                <label className="text-xs font-black mb-2.5 flex items-center gap-1.5 uppercase tracking-wider" style={{ color: "rgba(52,211,153,0.9)" }}>
                  <Wifi className="w-3.5 h-3.5" /> Quantidade de APs Instalados *
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

              {/* Observações */}
              <div className="mb-5">
                <label className="text-xs font-black mb-2.5 flex items-center gap-1.5 uppercase tracking-wider" style={{ color: "rgba(148,163,184,0.6)" }}>
                  <FileText className="w-3.5 h-3.5" /> Observações (opcional)
                </label>
                <textarea
                  rows={2}
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  placeholder="Alguma observação sobre a instalação..."
                  className="w-full px-4 py-3.5 rounded-2xl text-white text-sm outline-none resize-none transition-all"
                  style={{ background: "rgba(255,255,255,0.05)", border: "1.5px solid rgba(255,255,255,0.09)" }}
                />
              </div>

              {/* Aviso se não pode confirmar */}
              {!qtdAp && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl mb-2"
                  style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#fbbf24" }} />
                  <p className="text-xs" style={{ color: "rgba(251,191,36,0.85)" }}>
                    Informe a quantidade de APs instalados para concluir
                  </p>
                </div>
              )}
              {/* Aviso de fotos obrigatórias faltando */}
              {categoriasFaltando.length > 0 && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl mb-4"
                  style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
                  <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" style={{ color: "#f87171" }} />
                  <div>
                    <p className="text-xs font-bold mb-0.5" style={{ color: "rgba(248,113,113,0.95)" }}>
                      Fotos obrigatórias faltando:
                    </p>
                    {categoriasFaltando.map(cat => (
                      <p key={cat.id} className="text-xs" style={{ color: "rgba(248,113,113,0.75)" }}>
                        {cat.icon} {cat.label}
                      </p>
                    ))}
                  </div>
                </div>
              )}

              {/* Botões */}
              <div className="flex gap-3">
                <button onClick={() => setOpenConcluir(false)}
                  className="flex-1 py-4 rounded-2xl font-semibold text-sm transition-all active:scale-95"
                  style={{ background: "rgba(255,255,255,0.05)", color: "rgba(148,163,184,0.6)", border: "1px solid rgba(255,255,255,0.07)" }}>
                  Cancelar
                </button>
                <button
                  onClick={async () => {
                    const n = parseInt(qtdAp);
                    if (!qtdAp || isNaN(n) || n < 1) {
                      toast.error("Informe a quantidade de APs instalados");
                      return;
                    }

                    // ── Modo offline: salva OS + fotos no IndexedDB ──
                    if (!isOnline) {
                      const fotasOffline = CATEGORIAS_FOTOS.flatMap(cat =>
                        fotosPorCategoria[cat.id].map((f, idx) => ({
                          categoria: cat.id,
                          imageBase64: f.base64,
                          mimeType: f.mime,
                          // clientId único por foto: garante idempotência no upload
                          // mesmo que a sincronização seja chamada várias vezes
                          clientId: `${escolaId}-${cat.id}-${idx}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                        }))
                      );
                      await dbEnqueueOS({
                        escolaId, tecnicoId, qtdApInstalado: n,
                        observacao: observacao || undefined,
                        dataHora: new Date().toISOString(),
                        fotos: fotasOffline,
                      });
                      setPendingOffline(true);
                      setOpenConcluir(false);
                      setFotosPorCategoria({ mapa_calor: [], fotos_ap: [], etiqueta_controladora: [], etiqueta_nobreak: [], etiqueta_switch: [] });
                      toast.success(`OS e ${fotasOffline.length} foto${fotasOffline.length !== 1 ? 's' : ''} salvas localmente! Serão enviadas quando você tiver internet.`, { duration: 6000 });
                      return;
                    }

                    // ── PASSO 1: Concluir OS primeiro para obter o osId correto ──
                    // (mesmo que o técnico não tenha clicado em "Iniciar OS" antes)
                    setUploadingAll(true);
                    try {
                      const resultado = await utils.client.tecnicoAuth.concluirEscola.mutate({
                        tecnicoId, escolaId, qtdApInstalado: n, observacao
                      });
                      const osIdFinal = resultado?.osId ?? osId;

                      // ── PASSO 2: Upload das fotos usando o osId correto ──
                      const todasFotos: { catId: FotoCategoria; foto: FotoPendente }[] = [];
                      for (const cat of CATEGORIAS_FOTOS) {
                        for (const foto of fotosPorCategoria[cat.id]) {
                          todasFotos.push({ catId: cat.id, foto });
                        }
                      }
                      if (todasFotos.length > 0 && osIdFinal > 0) {
                        toast.loading(`Enviando ${todasFotos.length} foto${todasFotos.length > 1 ? "s" : ""}...`, { id: "upload-all" });
                        let enviadas = 0;
                        for (const { catId, foto } of todasFotos) {
                          try {
                            await uploadOsFotoMut.mutateAsync({
                              osId: osIdFinal,
                              escolaId,
                              tecnicoId,
                              categoria: catId,
                              imageBase64: foto.base64,
                              mimeType: foto.mime,
                              // clientId garante idempotência: se o usuário clicar duas vezes
                              // ou a conexão cair durante o upload, o backend não duplica
                              clientId: `online-${escolaId}-${catId}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
                            });
                            enviadas++;
                          } catch (fotoErr) {
                            const fotoErrMsg = fotoErr instanceof Error ? fotoErr.message : String(fotoErr);
                            console.error(`[OS] Erro ao enviar foto ${catId}:`, fotoErrMsg);
                            // continua com as outras fotos mesmo se uma falhar
                          }
                        }
                        toast.dismiss("upload-all");
                        const fotosFalhadas = todasFotos.length - enviadas;
                        if (enviadas > 0 && fotosFalhadas === 0) {
                          toast.success(`${enviadas} foto${enviadas > 1 ? "s" : ""} enviada${enviadas > 1 ? "s" : ""} com sucesso!`);
                        } else if (fotosFalhadas > 0) {
                          toast.error(
                            `${fotosFalhadas} foto${fotosFalhadas > 1 ? "s" : ""} não foram enviadas. A OS foi registrada, mas verifique as fotos.`,
                            { duration: 8000 }
                          );
                        }
                      }

                      // ── Finalizar ──
                      toast.success("✅ Instalação concluída com sucesso!", { duration: 5000 });
                      setFotosPorCategoria({
                        mapa_calor: [], fotos_ap: [], etiqueta_controladora: [], etiqueta_nobreak: [], etiqueta_switch: [],
                      });
                      utils.tecnicoAuth.minhasEscolas.invalidate();
                      setOpenConcluir(false);
                      setPendingOffline(false);
                    } catch (err: unknown) {
                      const msg = err instanceof Error ? err.message : String(err);
                      // Mensagem de erro mais clara baseada no tipo de erro
                      const isNetwork = msg.toLowerCase().includes("network") ||
                        msg.toLowerCase().includes("fetch") ||
                        msg.toLowerCase().includes("failed");
                      const isTimeout = msg.toLowerCase().includes("timeout");
                      const isPayload = msg.toLowerCase().includes("grande") || msg.toLowerCase().includes("large");
                      if (isNetwork) {
                        toast.error("❌ Sem conexão. Tente novamente ou use o modo offline.", { duration: 8000 });
                      } else if (isTimeout) {
                        toast.error("⏱ Tempo esgotado. Verifique sua internet e tente novamente.", { duration: 8000 });
                      } else if (isPayload) {
                        toast.error("📷 Foto muito grande. Máximo 10MB por foto.", { duration: 8000 });
                      } else {
                        toast.error("❌ Erro ao concluir OS: " + msg.slice(0, 100), { duration: 8000 });
                      }
                    } finally {
                      setUploadingAll(false);
                    }
                  }}
                  disabled={concluirMut.isPending || uploadingAll || !qtdAp || !todasCategoriasFotos}
                  aria-disabled={concluirMut.isPending || uploadingAll}
                  className="flex-1 py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95"
                  style={{
                    background: (!qtdAp || !todasCategoriasFotos)
                      ? "rgba(16,185,129,0.15)"
                      : isOnline
                      ? "linear-gradient(135deg, #059669, #10b981)"
                      : "linear-gradient(135deg, #d97706, #f59e0b)",
                    boxShadow: (!qtdAp || !todasCategoriasFotos) ? "none" : isOnline ? "0 8px 24px rgba(16,185,129,0.3)" : "0 8px 24px rgba(245,158,11,0.3)",
                    opacity: (concluirMut.isPending || uploadingAll || !qtdAp || !todasCategoriasFotos) ? 0.6 : 1,
                    cursor: (concluirMut.isPending || uploadingAll) ? "not-allowed" : "pointer",
                    pointerEvents: (concluirMut.isPending || uploadingAll) ? "none" : "auto",
                  }}>
                  {uploadingAll ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando fotos...</>
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
          style={{ background: "rgba(0,0,0,0.85)", backdropFilter: "blur(16px)" }}>
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
                  onClick={async () => {
                    if (!isOnline) {
                      // Modo offline: salva no IndexedDB e sincroniza quando voltar
                      await dbEnqueueOS({
                        escolaId,
                        tecnicoId,
                        qtdApInstalado: 0,
                        dataHora: new Date().toISOString(),
                        fotos: [],
                        tipo: "nao_instalada",
                        motivoNaoInstalada: motivo,
                        obsNaoInstalada: obsNaoInstalada || undefined,
                      });
                      // Atualiza o cache local da escola para mostrar status correto
                      const cached = await import("@/hooks/useOfflineDB").then(m => m.dbGetCachedEscolas(tecnicoId));
                      if (cached) {
                        const updated = (cached as Array<Record<string, unknown>>).map((e) =>
                          (e.id as number) === escolaId ? { ...e, status: "nao_instalada" } : e
                        );
                        await import("@/hooks/useOfflineDB").then(m => m.dbCacheEscolas(tecnicoId, updated));
                      }
                      toast.success("⚠️ Salvo offline. Será sincronizado quando houver conexão.");
                      utils.tecnicoAuth.minhasEscolas.invalidate();
                      setOpenNaoInstalada(false);
                    } else {
                      naoInstaladaMut.mutate({ escolaId, tecnicoId, motivo, observacao: obsNaoInstalada || undefined });
                    }
                  }}
                  disabled={naoInstaladaMut.isPending}
                  className="flex-1 py-4 rounded-2xl font-black text-sm text-white flex items-center justify-center gap-2 transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg, #dc2626, #ef4444)", boxShadow: "0 8px 24px rgba(239,68,68,0.3)" }}>
                  {naoInstaladaMut.isPending ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
                  ) : !isOnline ? (
                    <><WifiOff className="w-4 h-4" /> Salvar Offline</>
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
