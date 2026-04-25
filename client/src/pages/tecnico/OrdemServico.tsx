import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft, School, MapPin, Wifi, Phone, CheckCircle,
  MessageCircle, Navigation, Hash, Building2, Signal, WifiOff, Clock,
  Play, XCircle, Camera, Upload, X, AlertTriangle
} from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  enqueueOfflineAction, useOfflineSyncQueue, getOfflineQueue, getCachedEscolas
} from "@/hooks/useOfflineQueue";

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pendente:       { label: "Pendente",       bg: "rgba(245,158,11,0.12)",  text: "#f59e0b", dot: "#f59e0b" },
  em_andamento:   { label: "Em andamento",   bg: "rgba(59,130,246,0.12)",  text: "#3b82f6", dot: "#3b82f6" },
  concluido:      { label: "Concluído",      bg: "rgba(16,185,129,0.12)",  text: "#10b981", dot: "#10b981" },
  nao_instalada:  { label: "Não Instalada",  bg: "rgba(239,68,68,0.12)",   text: "#ef4444", dot: "#ef4444" },
};

const MOTIVOS = [
  { value: "escola_desativada", label: "Escola desativada" },
  { value: "em_reforma",        label: "Em reforma" },
  { value: "mudanca_endereco",  label: "Mudança de endereço" },
] as const;

/** Formata número para WhatsApp: sempre 5575 + 8 ou 9 dígitos locais */
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

  // Modais
  const [openConcluir, setOpenConcluir] = useState(false);
  const [openNaoInstalada, setOpenNaoInstalada] = useState(false);

  // Formulário de conclusão
  const [qtdAp, setQtdAp] = useState("");
  const [observacao, setObservacao] = useState("");
  const [fotoPreview, setFotoPreview] = useState<string | null>(null);
  const [fotoBase64, setFotoBase64] = useState<string | null>(null);
  const [fotoMime, setFotoMime] = useState("image/jpeg");
  const [uploadingFoto, setUploadingFoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);

  // Formulário de não instalada
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

  // Mutation: iniciar OS
  const iniciarMut = trpc.tecnicoAuth.iniciarOS.useMutation({
    onSuccess: () => {
      toast.success("OS iniciada!");
      utils.tecnicoAuth.minhasEscolas.invalidate();
    },
    onError: (err: { message: string }) => toast.error("Erro: " + err.message),
  });

  // Mutation: não instalada
  const naoInstaladaMut = trpc.tecnicoAuth.naoInstalada.useMutation({
    onSuccess: () => {
      toast.success("Registrado como não instalada.");
      utils.tecnicoAuth.minhasEscolas.invalidate();
      setOpenNaoInstalada(false);
    },
    onError: (err: { message: string }) => toast.error("Erro: " + err.message),
  });

  // Mutation: concluir
  const concluirMut = trpc.tecnicoAuth.concluirEscola.useMutation({
    onSuccess: () => {
      toast.success("Instalação marcada como concluída!");
      utils.tecnicoAuth.minhasEscolas.invalidate();
      setOpenConcluir(false);
      setPendingOffline(false);
    },
    onError: (err: { message: string }) => toast.error("Erro: " + err.message),
  });

  // Mutation: upload foto
  const uploadFotoMut = trpc.tecnicoAuth.uploadFotoMapaCalor.useMutation({
    onError: (err: { message: string }) => toast.error("Erro no upload: " + err.message),
  });

  // Sync offline
  const syncAction = useCallback(async (action: import("@/hooks/useOfflineQueue").OfflineAction) => {
    if (action.type !== "concluirEscola") return false;
    const { escolaId: eid, tecnicoId: tid, qtdApInstalado, observacoes } = action.payload;
    try {
      await utils.client.tecnicoAuth.concluirEscola.mutate({
        escolaId: eid, tecnicoId: tid, qtdApInstalado, observacao: observacoes
      });
      utils.tecnicoAuth.minhasEscolas.invalidate();
      toast.success("OS sincronizada com sucesso!");
      return true;
    } catch {
      return false;
    }
  }, [utils]);

  useOfflineSyncQueue(syncAction);

  useEffect(() => {
    const queue = getOfflineQueue();
    const hasPending = queue.some(a => a.payload.escolaId === escolaId);
    setPendingOffline(hasPending);
  }, [escolaId]);

  // Selecionar foto
  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Foto muito grande. Máximo 5MB.");
      return;
    }
    setFotoMime(file.type || "image/jpeg");
    const reader = new FileReader();
    reader.onload = (ev) => {
      const result = ev.target?.result as string;
      setFotoPreview(result);
      // Extrair base64 puro (sem o prefixo data:...)
      const base64 = result.split(",")[1];
      setFotoBase64(base64);
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
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0f1e" }}>
        <div className="text-center">
          <div className="w-10 h-10 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-white text-sm">Carregando OS...</p>
        </div>
      </div>
    );
  }

  if (!escola) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0a0f1e" }}>
        <div className="text-center px-6">
          <School className="w-12 h-12 text-white opacity-30 mx-auto mb-3" />
          <p className="text-white font-semibold">Escola não encontrada</p>
          <button onClick={() => navigate("/tecnico")} className="mt-4 px-4 py-2 rounded-xl text-sm font-semibold text-white"
            style={{ background: "rgba(255,255,255,0.08)" }}>Voltar</button>
        </div>
      </div>
    );
  }

  const isConcluida = escola.status === "concluido";
  const isNaoInstalada = escola.status === "nao_instalada";
  const isEmAndamento = escola.status === "em_andamento";
  const isPendente = escola.status === "pendente";

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0f1e" }}>
      {/* Banner offline */}
      {!isOnline && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold"
          style={{ background: "rgba(245,158,11,0.15)", borderBottom: "1px solid rgba(245,158,11,0.3)" }}>
          <WifiOff className="w-3.5 h-3.5" style={{ color: "#f59e0b" }} />
          <span style={{ color: "#f59e0b" }}>Sem internet — você pode finalizar a OS offline</span>
        </div>
      )}
      {pendingOffline && isOnline && (
        <div className="flex items-center gap-2 px-4 py-2 text-xs font-semibold"
          style={{ background: "rgba(59,130,246,0.15)", borderBottom: "1px solid rgba(59,130,246,0.3)" }}>
          <Clock className="w-3.5 h-3.5" style={{ color: "#3b82f6" }} />
          <span style={{ color: "#3b82f6" }}>Sincronizando OS salva offline...</span>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-safe pt-4 pb-4 sticky top-0 z-10"
        style={{ background: "rgba(10,15,30,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => navigate("/tecnico")}
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: "rgba(255,255,255,0.06)" }}>
          <ArrowLeft className="w-5 h-5 text-white" />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-white font-bold text-base leading-tight">Ordem de Serviço</h1>
          <p className="text-xs" style={{ color: "rgba(148,163,184,0.6)" }}>Detalhes da instalação</p>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold flex-shrink-0"
          style={{ background: sc.bg, color: sc.text }}>
          <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
          {sc.label}
        </div>
      </div>

      <div className="flex-1 px-4 py-4 space-y-4 pb-8">
        {/* Card principal da escola */}
        <div className="rounded-2xl overflow-hidden"
          style={{ background: "linear-gradient(135deg, rgba(13,31,60,0.95), rgba(15,25,50,0.95))", border: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="p-4">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: isNaoInstalada ? "linear-gradient(135deg, #dc2626, #ef4444)" : "linear-gradient(135deg, #059669, #10b981)" }}>
                <School className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h2 className="text-white font-bold text-base leading-snug">{escola.nome}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <Hash className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(148,163,184,0.5)" }} />
                  <span className="text-xs font-mono font-semibold" style={{ color: "#3b82f6" }}>INEP: {escola.inep}</span>
                </div>
              </div>
            </div>

            <div className="space-y-2.5">
              {escola.endereco && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(239,68,68,0.12)" }}>
                    <MapPin className="w-4 h-4" style={{ color: "#ef4444" }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs mb-0.5" style={{ color: "rgba(148,163,184,0.5)" }}>Endereço</p>
                    <p className="text-sm font-semibold text-white leading-snug">{escola.endereco}</p>
                  </div>
                </div>
              )}
              {escola.municipio && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(139,92,246,0.12)" }}>
                    <Building2 className="w-4 h-4" style={{ color: "#8b5cf6" }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Cidade</p>
                    <p className="text-sm font-semibold text-white">{escola.municipio}{escola.uf ? ` — ${escola.uf}` : ""}</p>
                  </div>
                </div>
              )}
              <div className="flex items-center gap-2.5 p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(16,185,129,0.12)" }}>
                  <Wifi className="w-4 h-4" style={{ color: "#10b981" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Quantidade de APs</p>
                  <p className="text-sm font-bold" style={{ color: "#10b981" }}>
                    {escola.qtdAp ?? 1} AP{(escola.qtdAp ?? 1) > 1 ? "s" : ""}
                  </p>
                </div>
              </div>
              {escola.velocidadeOfertada && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl"
                  style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(59,130,246,0.15)" }}>
                    <Signal className="w-4 h-4" style={{ color: "#3b82f6" }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Velocidade</p>
                    <p className="text-sm font-bold" style={{ color: "#3b82f6" }}>{escola.velocidadeOfertada}</p>
                  </div>
                </div>
              )}
              {escola.telefone && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(16,185,129,0.12)" }}>
                    <Phone className="w-4 h-4" style={{ color: "#10b981" }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Telefone da escola</p>
                    <p className="text-sm font-semibold text-white">{escola.telefone}</p>
                  </div>
                </div>
              )}
              {hasCoords && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(245,158,11,0.12)" }}>
                    <Navigation className="w-4 h-4" style={{ color: "#f59e0b" }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Coordenadas GPS</p>
                    <p className="text-xs font-mono text-white">{lat!.toFixed(5)}, {lng!.toFixed(5)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Botões de navegação */}
        <div className="grid grid-cols-2 gap-3">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block">
            <button className="w-full py-4 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #1e3a5f, #1d4ed8)", border: "1px solid rgba(59,130,246,0.25)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)" }}>
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-sm">Google Maps</p>
                <p className="text-xs" style={{ color: "rgba(147,197,253,0.7)" }}>{hasCoords ? "Rota de navegação" : "Buscar escola"}</p>
              </div>
            </button>
          </a>
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
              <button className="w-full py-4 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #059669, #10b981)", border: "1px solid rgba(16,185,129,0.25)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.12)" }}>
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-sm">WhatsApp</p>
                  <p className="text-xs" style={{ color: "rgba(167,243,208,0.7)" }}>{whatsappNum}</p>
                </div>
              </button>
            </a>
          ) : (
            <div className="w-full py-4 rounded-2xl flex flex-col items-center gap-2"
              style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "rgba(255,255,255,0.06)" }}>
                <Phone className="w-5 h-5" style={{ color: "rgba(148,163,184,0.4)" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "rgba(148,163,184,0.5)" }}>Sem telefone</p>
                <p className="text-xs" style={{ color: "rgba(148,163,184,0.3)" }}>Não cadastrado</p>
              </div>
            </div>
          )}
        </div>

        {/* Botões de ação da OS */}
        {isConcluida ? (
          <div className="rounded-2xl p-5 text-center"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <p className="font-bold text-lg" style={{ color: "#10b981" }}>Instalação Concluída!</p>
            {escola.dataConclusao && (
              <p className="text-sm mt-1" style={{ color: "rgba(52,211,153,0.7)" }}>
                Concluída em {new Date(escola.dataConclusao).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
              </p>
            )}
          </div>
        ) : isNaoInstalada ? (
          <div className="rounded-2xl p-5 text-center"
            style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)" }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "linear-gradient(135deg, #dc2626, #ef4444)" }}>
              <XCircle className="w-7 h-7 text-white" />
            </div>
            <p className="font-bold text-lg" style={{ color: "#ef4444" }}>Não Instalada</p>
            <p className="text-sm mt-1" style={{ color: "rgba(252,165,165,0.7)" }}>Esta escola foi registrada como não instalada.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {/* Botão Iniciar OS (só aparece quando pendente) */}
            {isPendente && (
              <button
                onClick={() => iniciarMut.mutate({ escolaId, tecnicoId })}
                disabled={iniciarMut.isPending}
                className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-base text-white transition-all active:scale-98"
                style={{ background: "linear-gradient(135deg, #1d4ed8, #3b82f6)", boxShadow: "0 8px 32px rgba(59,130,246,0.25)" }}>
                {iniciarMut.isPending ? (
                  <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> Iniciando...</>
                ) : (
                  <><Play className="w-5 h-5" /> Iniciar OS</>
                )}
              </button>
            )}

            {/* Botão Concluir (aparece quando em andamento ou pendente) */}
            <button
              onClick={() => setOpenConcluir(true)}
              className="w-full py-4 rounded-2xl flex items-center justify-center gap-3 font-bold text-base text-white transition-all active:scale-98"
              style={{ background: "linear-gradient(135deg, #059669, #10b981)", boxShadow: "0 8px 32px rgba(16,185,129,0.25)" }}>
              <CheckCircle className="w-5 h-5" />
              Marcar como Concluído
            </button>

            {/* Botão Não Instalada */}
            <button
              onClick={() => setOpenNaoInstalada(true)}
              className="w-full py-3.5 rounded-2xl flex items-center justify-center gap-2.5 font-semibold text-sm transition-all active:scale-98"
              style={{ background: "rgba(239,68,68,0.10)", border: "1.5px solid rgba(239,68,68,0.25)", color: "#ef4444" }}>
              <XCircle className="w-4.5 h-4.5" />
              Não Instalada
            </button>
          </div>
        )}
      </div>

      {/* ─── Modal de Conclusão ─── */}
      {openConcluir && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setOpenConcluir(false); }}>
          <div className="w-full max-w-lg rounded-t-3xl p-6 pb-10 overflow-y-auto max-h-[90vh]"
            style={{ background: "#0d1f3c", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(255,255,255,0.15)" }} />
            <h3 className="text-white font-bold text-lg mb-1">Confirmar Conclusão</h3>
            <p className="text-sm mb-5" style={{ color: "rgba(148,163,184,0.6)" }}>
              Informe a quantidade de APs instalados e, opcionalmente, adicione a foto do mapa de calor.
            </p>

            <div className="space-y-4 mb-5">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(148,163,184,0.7)" }}>APs Instalados *</label>
                <input
                  type="number" min="1" max="99"
                  value={qtdAp}
                  onChange={e => setQtdAp(e.target.value)}
                  placeholder={`Previsto: ${escola.qtdAp ?? 1}`}
                  className="w-full px-4 py-3 rounded-xl text-white text-base outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)" }}
                />
              </div>

              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(148,163,184,0.7)" }}>Observações (opcional)</label>
                <textarea
                  rows={3}
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  placeholder="Alguma observação sobre a instalação..."
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)" }}
                />
              </div>

              {/* Upload foto mapa de calor */}
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(148,163,184,0.7)" }}>
                  <Camera className="w-3.5 h-3.5 inline mr-1" />
                  Foto do Mapa de Calor (opcional)
                </label>
                {/* Input galeria (sem capture) */}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFotoChange}
                />
                {/* Input câmera (com capture) */}
                <input
                  ref={cameraInputRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFotoChange}
                />
                {fotoPreview ? (
                  <div className="relative rounded-xl overflow-hidden"
                    style={{ border: "1.5px solid rgba(16,185,129,0.3)" }}>
                    <img src={fotoPreview} alt="Mapa de calor" className="w-full max-h-48 object-cover" />
                    <button
                      onClick={() => {
                        setFotoPreview(null);
                        setFotoBase64(null);
                        if (fileInputRef.current) fileInputRef.current.value = "";
                        if (cameraInputRef.current) cameraInputRef.current.value = "";
                      }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center"
                      style={{ background: "rgba(0,0,0,0.6)" }}>
                      <X className="w-4 h-4 text-white" />
                    </button>
                    <div className="absolute bottom-2 left-2 px-2 py-1 rounded-lg text-xs font-semibold"
                      style={{ background: "rgba(16,185,129,0.8)", color: "white" }}>
                      Foto selecionada
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      onClick={() => cameraInputRef.current?.click()}
                      className="py-4 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-98"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1.5px dashed rgba(255,255,255,0.15)" }}>
                      <Camera className="w-6 h-6" style={{ color: "rgba(148,163,184,0.5)" }} />
                      <span className="text-xs font-semibold" style={{ color: "rgba(148,163,184,0.7)" }}>Câmera</span>
                    </button>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      className="py-4 rounded-xl flex flex-col items-center gap-2 transition-all active:scale-98"
                      style={{ background: "rgba(255,255,255,0.04)", border: "1.5px dashed rgba(255,255,255,0.15)" }}>
                      <Upload className="w-6 h-6" style={{ color: "rgba(148,163,184,0.5)" }} />
                      <span className="text-xs font-semibold" style={{ color: "rgba(148,163,184,0.7)" }}>Galeria</span>
                    </button>
                    <p className="col-span-2 text-center text-xs" style={{ color: "rgba(148,163,184,0.35)" }}>Máximo 5MB · JPG, PNG</p>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setOpenConcluir(false)}
                className="flex-1 py-4 rounded-2xl font-semibold text-sm"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(148,163,184,0.8)" }}>
                Cancelar
              </button>
              <button
                onClick={async () => {
                  const n = parseInt(qtdAp);
                  if (!qtdAp || isNaN(n) || n < 1) {
                    toast.error("Informe a quantidade de APs instalados");
                    return;
                  }
                  // Upload da foto se existir
                  let fotoUrl: string | undefined;
                  let fotoKey: string | undefined;
                  if (fotoBase64 && isOnline) {
                    setUploadingFoto(true);
                    try {
                      const res = await uploadFotoMut.mutateAsync({
                        escolaId, tecnicoId,
                        imageBase64: fotoBase64,
                        mimeType: fotoMime,
                      });
                      fotoUrl = res.url;
                      fotoKey = res.key;
                    } catch {
                      // Continua sem foto se upload falhar
                    } finally {
                      setUploadingFoto(false);
                    }
                  }
                  if (!isOnline) {
                    enqueueOfflineAction({
                      type: "concluirEscola",
                      payload: { escolaId, tecnicoId, qtdApInstalado: n, observacoes: observacao || undefined, dataHora: new Date().toISOString() },
                    });
                    setPendingOffline(true);
                    setOpenConcluir(false);
                    toast.success("OS salva localmente! Será enviada ao servidor quando você tiver internet.", { duration: 5000 });
                    return;
                  }
                  concluirMut.mutate({ tecnicoId, escolaId, qtdApInstalado: n, observacao, fotoMapaCalorUrl: fotoUrl, fotoMapaCalorKey: fotoKey });
                }}
                disabled={concluirMut.isPending || uploadingFoto}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2"
                style={{ background: isOnline ? "linear-gradient(135deg, #059669, #10b981)" : "linear-gradient(135deg, #d97706, #f59e0b)" }}>
                {uploadingFoto ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Enviando foto...</>
                ) : concluirMut.isPending ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando...</>
                ) : isOnline ? (
                  <><CheckCircle className="w-4 h-4" /> Confirmar</>
                ) : (
                  <><WifiOff className="w-4 h-4" /> Salvar Offline</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Modal de Não Instalada ─── */}
      {openNaoInstalada && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setOpenNaoInstalada(false); }}>
          <div className="w-full max-w-lg rounded-t-3xl p-6 pb-10"
            style={{ background: "#0d1f3c", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(255,255,255,0.15)" }} />
            <div className="flex items-center gap-3 mb-1">
              <AlertTriangle className="w-5 h-5" style={{ color: "#ef4444" }} />
              <h3 className="text-white font-bold text-lg">Não Instalada</h3>
            </div>
            <p className="text-sm mb-5" style={{ color: "rgba(148,163,184,0.6)" }}>
              Selecione o motivo pelo qual a instalação não foi realizada.
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-semibold mb-2 block" style={{ color: "rgba(148,163,184,0.7)" }}>Motivo *</label>
                <div className="space-y-2">
                  {MOTIVOS.map(m => (
                    <button
                      key={m.value}
                      onClick={() => setMotivo(m.value)}
                      className="w-full px-4 py-3 rounded-xl text-left flex items-center gap-3 transition-all"
                      style={{
                        background: motivo === m.value ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)",
                        border: motivo === m.value ? "1.5px solid rgba(239,68,68,0.5)" : "1.5px solid rgba(255,255,255,0.08)",
                      }}>
                      <div className="w-4 h-4 rounded-full flex-shrink-0 flex items-center justify-center"
                        style={{ border: motivo === m.value ? "2px solid #ef4444" : "2px solid rgba(255,255,255,0.2)" }}>
                        {motivo === m.value && <div className="w-2 h-2 rounded-full" style={{ background: "#ef4444" }} />}
                      </div>
                      <span className="text-sm font-medium" style={{ color: motivo === m.value ? "#ef4444" : "rgba(148,163,184,0.8)" }}>
                        {m.label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(148,163,184,0.7)" }}>Observações (opcional)</label>
                <textarea
                  rows={3}
                  value={obsNaoInstalada}
                  onChange={e => setObsNaoInstalada(e.target.value)}
                  placeholder="Detalhes adicionais..."
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)" }}
                />
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setOpenNaoInstalada(false)}
                className="flex-1 py-4 rounded-2xl font-semibold text-sm"
                style={{ background: "rgba(255,255,255,0.06)", color: "rgba(148,163,184,0.8)" }}>
                Cancelar
              </button>
              <button
                onClick={() => naoInstaladaMut.mutate({ escolaId, tecnicoId, motivo, observacao: obsNaoInstalada || undefined })}
                disabled={naoInstaladaMut.isPending}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #dc2626, #ef4444)" }}>
                {naoInstaladaMut.isPending ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Salvando...</>
                ) : (
                  <><XCircle className="w-4 h-4" /> Confirmar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
