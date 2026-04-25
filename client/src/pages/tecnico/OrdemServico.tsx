import { useState, useEffect, useMemo, useCallback } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft, School, MapPin, Wifi, Phone, CheckCircle,
  MessageCircle, Navigation, Hash, Building2, Signal, WifiOff, Clock
} from "lucide-react";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import {
  enqueueOfflineAction, useOfflineSyncQueue, getOfflineQueue, getCachedEscolas
} from "@/hooks/useOfflineQueue";

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pendente:     { label: "Pendente",     bg: "rgba(245,158,11,0.12)",  text: "#f59e0b", dot: "#f59e0b" },
  em_andamento: { label: "Em andamento", bg: "rgba(59,130,246,0.12)",  text: "#3b82f6", dot: "#3b82f6" },
  concluido:    { label: "Concluído",    bg: "rgba(16,185,129,0.12)",  text: "#10b981", dot: "#10b981" },
};

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
  const [openConcluir, setOpenConcluir] = useState(false);
  const [qtdAp, setQtdAp] = useState("");
  const [observacao, setObservacao] = useState("");
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

  const concluirMut = trpc.tecnicoAuth.concluirEscola.useMutation({
    onSuccess: () => {
      toast.success("Instalação marcada como concluída!");
      utils.tecnicoAuth.minhasEscolas.invalidate();
      setOpenConcluir(false);
      setPendingOffline(false);
    },
    onError: (err: { message: string }) => toast.error("Erro: " + err.message),
  });

  // Função de sync: executa ações da fila offline
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

  // Verifica se esta OS tem ação pendente na fila offline
  useEffect(() => {
    const queue = getOfflineQueue();
    const hasPending = queue.some(a => a.payload.escolaId === escolaId);
    setPendingOffline(hasPending);
  }, [escolaId]);

  const lat = escola?.latitude ? parseFloat(escola.latitude) : null;
  const lng = escola?.longitude ? parseFloat(escola.longitude) : null;
  const hasCoords = lat !== null && lng !== null && !isNaN(lat!) && !isNaN(lng!);

  const mapsUrl = useMemo(() => {
    if (hasCoords) return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
    return `https://www.google.com/maps/search/${encodeURIComponent((escola?.nome ?? "") + " " + (escola?.municipio ?? ""))}`;
  }, [hasCoords, lat, lng, escola]);

  // WhatsApp: direto do banco, sem IA
  const whatsappNum = useMemo(() => {
    return formatWhatsApp(escola?.telefoneWhatsApp || escola?.telefone);
  }, [escola]);

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
            style={{ background: "rgba(255,255,255,0.08)" }}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

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
            {/* Nome completo da escola */}
            <div className="flex items-start gap-3 mb-4">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
                <School className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                {/* Nome completo — sem truncar */}
                <h2 className="text-white font-bold text-base leading-snug">{escola.nome}</h2>
                <div className="flex items-center gap-1.5 mt-1">
                  <Hash className="w-3 h-3 flex-shrink-0" style={{ color: "rgba(148,163,184,0.5)" }} />
                  <span className="text-xs font-mono font-semibold" style={{ color: "#3b82f6" }}>
                    INEP: {escola.inep}
                  </span>
                </div>
              </div>
            </div>

            {/* Grid de informações */}
            <div className="space-y-2.5">

              {/* Endereço completo — sem truncar */}
              {escola.endereco && (
                <div className="flex items-start gap-2.5 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(239,68,68,0.12)" }}>
                    <MapPin className="w-4 h-4" style={{ color: "#ef4444" }} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs mb-0.5" style={{ color: "rgba(148,163,184,0.5)" }}>Endereço</p>
                    {/* Texto completo, sem truncar */}
                    <p className="text-sm font-semibold text-white leading-snug">{escola.endereco}</p>
                  </div>
                </div>
              )}

              {/* Cidade */}
              {escola.municipio && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(139,92,246,0.12)" }}>
                    <Building2 className="w-4 h-4" style={{ color: "#8b5cf6" }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Cidade</p>
                    <p className="text-sm font-semibold text-white">{escola.municipio}</p>
                  </div>
                </div>
              )}

              {/* APs */}
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

              {/* Velocidade */}
              {escola.velocidadeOfertada && (
                <div className="flex items-center gap-2.5 p-3 rounded-xl"
                  style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(59,130,246,0.15)" }}>
                    <Signal className="w-4 h-4" style={{ color: "#3b82f6" }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Velocidade</p>
                    <p className="text-sm font-bold" style={{ color: "#3b82f6" }}>
                      {escola.velocidadeOfertada}
                    </p>
                  </div>
                </div>
              )}

              {/* Telefone */}
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

              {/* Coordenadas GPS */}
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

        {/* Botões de ação: Google Maps e WhatsApp */}
        <div className="grid grid-cols-2 gap-3">
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block">
            <button className="w-full py-4 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95"
              style={{ background: "linear-gradient(135deg, #1e3a5f, #1d4ed8)", border: "1px solid rgba(59,130,246,0.25)" }}>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.12)" }}>
                <Navigation className="w-5 h-5 text-white" />
              </div>
              <div className="text-center">
                <p className="text-white font-bold text-sm">Google Maps</p>
                <p className="text-xs" style={{ color: "rgba(147,197,253,0.7)" }}>
                  {hasCoords ? "Rota de navegação" : "Buscar escola"}
                </p>
              </div>
            </button>
          </a>

          {/* WhatsApp — direto do banco, sem IA */}
          {whatsappUrl ? (
            <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
              <button className="w-full py-4 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, #059669, #10b981)", border: "1px solid rgba(16,185,129,0.25)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.12)" }}>
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
              <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ background: "rgba(255,255,255,0.06)" }}>
                <Phone className="w-5 h-5" style={{ color: "rgba(148,163,184,0.4)" }} />
              </div>
              <div className="text-center">
                <p className="text-sm font-semibold" style={{ color: "rgba(148,163,184,0.5)" }}>Sem telefone</p>
                <p className="text-xs" style={{ color: "rgba(148,163,184,0.3)" }}>Não cadastrado</p>
              </div>
            </div>
          )}
        </div>

        {/* Botão concluir / status concluído */}
        {escola.status !== "concluido" ? (
          <button
            onClick={() => setOpenConcluir(true)}
            className="w-full py-5 rounded-2xl flex items-center justify-center gap-3 font-bold text-base text-white transition-all active:scale-98"
            style={{
              background: "linear-gradient(135deg, #059669, #10b981)",
              boxShadow: "0 8px 32px rgba(16,185,129,0.30)",
            }}>
            <CheckCircle className="w-6 h-6" />
            Marcar como Concluído
          </button>
        ) : (
          <div className="rounded-2xl p-5 text-center"
            style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)" }}>
            <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
              style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
              <CheckCircle className="w-7 h-7 text-white" />
            </div>
            <p className="font-bold text-lg" style={{ color: "#10b981" }}>Instalação Concluída!</p>
            {escola.dataConclusao && (
              <p className="text-sm mt-1" style={{ color: "rgba(52,211,153,0.7)" }}>
                Concluída em {new Date(escola.dataConclusao).toLocaleDateString("pt-BR", {
                  day: "2-digit", month: "long", year: "numeric"
                })}
              </p>
            )}
          </div>
        )}
      </div>

      {/* Modal de conclusão */}
      {openConcluir && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setOpenConcluir(false); }}>
          <div className="w-full max-w-lg rounded-t-3xl p-6 pb-10"
            style={{ background: "#0d1f3c", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(255,255,255,0.15)" }} />
            <h3 className="text-white font-bold text-lg mb-1">Confirmar Conclusão</h3>
            <p className="text-sm mb-5" style={{ color: "rgba(148,163,184,0.6)" }}>
              Informe a quantidade de APs instalados
            </p>

            <div className="space-y-3 mb-5">
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(148,163,184,0.7)" }}>
                  APs Instalados *
                </label>
                <input
                  type="number"
                  min="1"
                  max="99"
                  value={qtdAp}
                  onChange={e => setQtdAp(e.target.value)}
                  placeholder={`Previsto: ${escola.qtdAp ?? 1}`}
                  className="w-full px-4 py-3 rounded-xl text-white text-base outline-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)" }}
                />
              </div>
              <div>
                <label className="text-xs font-semibold mb-1.5 block" style={{ color: "rgba(148,163,184,0.7)" }}>
                  Observações (opcional)
                </label>
                <textarea
                  rows={3}
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  placeholder="Alguma observação sobre a instalação..."
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.07)", border: "1.5px solid rgba(255,255,255,0.12)" }}
                />
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
                onClick={() => {
                  const n = parseInt(qtdAp);
                  if (!qtdAp || isNaN(n) || n < 1) {
                    toast.error("Informe a quantidade de APs instalados");
                    return;
                  }
                  if (!isOnline) {
                    // MODO OFFLINE: salva na fila local
                    enqueueOfflineAction({
                      type: "concluirEscola",
                      payload: {
                        escolaId,
                        tecnicoId,
                        qtdApInstalado: n,
                        observacoes: observacao || undefined,
                        dataHora: new Date().toISOString(),
                      },
                    });
                    setPendingOffline(true);
                    setOpenConcluir(false);
                    toast.success("OS salva localmente! Será enviada ao servidor quando você tiver internet.", { duration: 5000 });
                    return;
                  }
                  // MODO ONLINE: envia diretamente
                  concluirMut.mutate({ tecnicoId, escolaId, qtdApInstalado: n, observacao });
                }}
                disabled={concluirMut.isPending}
                className="flex-1 py-4 rounded-2xl font-bold text-sm text-white flex items-center justify-center gap-2"
                style={{ background: isOnline ? "linear-gradient(135deg, #059669, #10b981)" : "linear-gradient(135deg, #d97706, #f59e0b)" }}>
                {concluirMut.isPending ? (
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
    </div>
  );
}
