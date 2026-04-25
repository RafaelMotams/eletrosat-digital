import { useState, useEffect, useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft, School, MapPin, Wifi, Phone, CheckCircle,
  MessageCircle, Navigation, Hash, Building2, Signal, Loader2, Search
} from "lucide-react";

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pendente:     { label: "Pendente",     bg: "rgba(245,158,11,0.12)",  text: "#f59e0b", dot: "#f59e0b" },
  em_andamento: { label: "Em andamento", bg: "rgba(59,130,246,0.12)",  text: "#3b82f6", dot: "#3b82f6" },
  concluido:    { label: "Concluído",    bg: "rgba(16,185,129,0.12)",  text: "#10b981", dot: "#10b981" },
};

export default function TecnicoOS() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [tecnicoId, setTecnicoId] = useState(0);
  const [openConcluir, setOpenConcluir] = useState(false);
  const [qtdAp, setQtdAp] = useState("");
  const [observacao, setObservacao] = useState("");

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

  const escolaId = parseInt(params.id ?? "0");

  // Usa o endpoint público do técnico (não requer OAuth)
  const { data: escolas = [], isLoading } = trpc.tecnicoAuth.minhasEscolas.useQuery(
    { tecnicoId },
    { enabled: !!tecnicoId && !!escolaId }
  );

  const escola = useMemo(
    () => escolas.find((e: { id: number }) => e.id === escolaId) ?? null,
    [escolas, escolaId]
  );

  const concluirMut = trpc.tecnicoAuth.concluirEscola.useMutation({
    onSuccess: () => {
      toast.success("Instalação concluída com sucesso!");
      utils.tecnicoAuth.minhasEscolas.invalidate();
      setOpenConcluir(false);
      navigate("/tecnico");
    },
    onError: (e) => toast.error(e.message),
  });

  function handleConcluir() {
    const ap = parseInt(qtdAp);
    if (isNaN(ap) || ap < 0) { toast.error("Informe a quantidade de APs instalados"); return; }
    if (!tecnicoId) { toast.error("Sessão expirada. Faça login novamente."); navigate("/tecnico/login"); return; }
    concluirMut.mutate({ escolaId, tecnicoId, qtdApInstalado: ap, observacao });
  }

  const lat = parseFloat(String(escola?.latitude ?? ""));
  const lng = parseFloat(String(escola?.longitude ?? ""));
  const hasCoords = !isNaN(lat) && !isNaN(lng);

  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
    : `https://www.google.com/maps/search/${encodeURIComponent((escola?.nome ?? "") + " " + (escola?.municipio ?? "Monte Santo BA"))}`;

  // Monta número WhatsApp: sempre 5575 + apenas os 8 ou 9 dígitos locais do número
  // Remove tudo que não é dígito, remove DDD (75) se já vier na frente, remove 0 inicial
  const buildWhatsapp = (raw: string | null | undefined): string | null => {
    if (!raw) return null;
    const digits = String(raw).replace(/\D/g, ""); // só números
    if (!digits) return null;
    // Remove prefixos: 55 (país), 75 (DDD), 0 inicial
    let local = digits;
    if (local.startsWith("5575")) local = local.slice(4);
    else if (local.startsWith("55")) local = local.slice(2);
    if (local.startsWith("75")) local = local.slice(2);
    if (local.startsWith("0")) local = local.slice(1);
    // Aceita apenas 8 ou 9 dígitos locais
    if (local.length < 8 || local.length > 9) return null;
    return "5575" + local;
  };
  const [telefoneLocal, setTelefoneLocal] = useState<string | null>(null);
  const whatsappNumber = buildWhatsapp(telefoneLocal ?? escola?.telefoneWhatsApp ?? escola?.telefone);
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Sou técnico da Eletrosat Digital e estou entrando em contato sobre a instalação de internet na ${escola?.nome}.`)}`
    : null;

  const buscarTelMut = trpc.tecnicoAuth.buscarTelefone.useMutation({
    onSuccess: (data) => {
      if (data.telefone) {
        setTelefoneLocal(data.telefone);
        toast.success(data.salvo ? `✅ Telefone encontrado e salvo: ${data.telefone}` : `✅ Telefone já cadastrado: ${data.telefone}`);
        utils.tecnicoAuth.minhasEscolas.invalidate();
      } else {
        toast.error("Não foi possível encontrar o telefone desta escola. Verifique manualmente no site do INEP.");
      }
    },
    onError: () => toast.error("Erro ao buscar telefone. Tente novamente."),
  });

  const status = escola?.status ?? "pendente";
  const sc = statusConfig[status] ?? statusConfig.pendente;
  const isPending = concluirMut.isPending;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "#0a0f1e" }}>
      {/* Header */}
      <header className="px-4 pt-safe pb-3 pt-4 flex items-center gap-3 sticky top-0 z-10"
        style={{ background: "rgba(10,15,30,0.97)", backdropFilter: "blur(20px)", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
        <button onClick={() => navigate("/tecnico")}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: "rgba(255,255,255,0.07)", color: "white" }}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate">
            {isLoading ? "Carregando..." : escola?.nome ?? "Escola"}
          </p>
          <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Ordem de Serviço</p>
        </div>
        {escola && (
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold flex-shrink-0"
            style={{ background: sc.bg, color: sc.text }}>
            <div className="w-1.5 h-1.5 rounded-full" style={{ background: sc.dot }} />
            {sc.label}
          </div>
        )}
      </header>

      {isLoading ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin"
              style={{ borderColor: "#10b981", borderTopColor: "transparent" }} />
            <p className="text-sm" style={{ color: "rgba(148,163,184,0.5)" }}>Carregando escola...</p>
          </div>
        </div>
      ) : !escola ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <School className="w-12 h-12 mx-auto mb-3 opacity-30 text-white" />
            <p className="text-white font-semibold">Escola não encontrada</p>
            <button onClick={() => navigate("/tecnico")} className="mt-4 text-sm underline" style={{ color: "#10b981" }}>
              Voltar para a lista
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 px-4 py-4 space-y-3 pb-24">

          {/* Card principal - INEP + Nome + Endereço no topo */}
          <div className="rounded-2xl overflow-hidden"
            style={{ background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.09)" }}>
            {/* Banner da escola */}
            <div className="p-5 pb-4"
              style={{ background: "linear-gradient(135deg, #0d1f3c 0%, #1e3a5f 100%)" }}>
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(255,255,255,0.10)" }}>
                  <Building2 className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <h1 className="text-white font-bold text-base leading-tight">{escola.nome}</h1>
                  <p className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.6)" }}>
                    {escola.municipio}{escola.uf ? ` — ${escola.uf}` : ""}
                  </p>
                </div>
              </div>
            </div>

            {/* Dados principais */}
            <div className="p-4 space-y-2.5">
              {/* INEP */}
              <div className="flex items-center gap-3 p-3 rounded-xl"
                style={{ background: "rgba(255,255,255,0.04)" }}>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{ background: "rgba(59,130,246,0.15)" }}>
                  <Hash className="w-4 h-4" style={{ color: "#3b82f6" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Código INEP</p>
                  <p className="text-sm font-bold text-white tracking-wider">{escola.inep}</p>
                </div>
              </div>

              {/* Endereço */}
              {escola.endereco && (
                <div className="flex items-start gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                    style={{ background: "rgba(245,158,11,0.15)" }}>
                    <MapPin className="w-4 h-4" style={{ color: "#f59e0b" }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Endereço</p>
                    <p className="text-sm text-white leading-snug">{escola.endereco}</p>
                  </div>
                </div>
              )}

              {/* APs e Velocidade */}
              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2.5 p-3 rounded-xl"
                  style={{ background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.15)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(16,185,129,0.15)" }}>
                    <Wifi className="w-4 h-4" style={{ color: "#10b981" }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Kits Wi-Fi</p>
                    <p className="text-sm font-bold" style={{ color: "#10b981" }}>
                      {escola.kitWifi ?? escola.qtdAp ?? 1}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2.5 p-3 rounded-xl"
                  style={{ background: "rgba(59,130,246,0.08)", border: "1px solid rgba(59,130,246,0.15)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(59,130,246,0.15)" }}>
                    <Signal className="w-4 h-4" style={{ color: "#3b82f6" }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Velocidade</p>
                    <p className="text-sm font-bold" style={{ color: "#3b82f6" }}>
                      {escola.velocidadeOfertada || "—"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Telefone */}
              {escola.telefone && (
                <div className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
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
                <div className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ background: "rgba(255,255,255,0.04)" }}>
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ background: "rgba(245,158,11,0.12)" }}>
                    <Navigation className="w-4 h-4" style={{ color: "#f59e0b" }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "rgba(148,163,184,0.5)" }}>Coordenadas GPS</p>
                    <p className="text-xs font-mono text-white">{lat.toFixed(5)}, {lng.toFixed(5)}</p>
                  </div>
                </div>
              )}
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
                    <p className="text-xs" style={{ color: "rgba(167,243,208,0.7)" }}>Contatar escola</p>
                  </div>
                </button>
              </a>
            ) : (
              <button
                onClick={() => escola && buscarTelMut.mutate({ escolaId: escola.id, inep: escola.inep, nome: escola.nome, municipio: escola.municipio ?? undefined })}
                disabled={buscarTelMut.isPending}
                className="w-full py-4 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95"
                style={{
                  background: buscarTelMut.isPending
                    ? "rgba(255,255,255,0.05)"
                    : "linear-gradient(135deg, #1e3a5f, #7c3aed)",
                  border: "1px solid rgba(124,58,237,0.30)",
                }}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "rgba(255,255,255,0.12)" }}>
                  {buscarTelMut.isPending
                    ? <Loader2 className="w-5 h-5 text-white animate-spin" />
                    : <Search className="w-5 h-5 text-white" />}
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-sm">
                    {buscarTelMut.isPending ? "Buscando..." : "Buscar Tel. (IA)"}
                  </p>
                  <p className="text-xs" style={{ color: "rgba(196,181,253,0.7)" }}>
                    {buscarTelMut.isPending ? "Aguarde..." : "Busca automática"}
                  </p>
                </div>
              </button>
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
      )}

      {/* Modal de conclusão */}
      {openConcluir && (
        <div className="fixed inset-0 z-50 flex items-end justify-center"
          style={{ background: "rgba(0,0,0,0.7)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setOpenConcluir(false); }}>
          <div className="w-full max-w-lg rounded-t-3xl p-6 pb-10"
            style={{ background: "#0d1f3c", border: "1px solid rgba(255,255,255,0.10)" }}>
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "rgba(255,255,255,0.15)" }} />

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, #059669, #10b981)" }}>
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg">Concluir Instalação</h3>
                <p className="text-xs" style={{ color: "rgba(148,163,184,0.6)" }}>{escola?.nome}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-1.5 block" style={{ color: "rgba(148,163,184,0.8)" }}>
                  Quantidade de APs instalados *
                </label>
                <input
                  type="number"
                  min="0"
                  value={qtdAp}
                  onChange={e => setQtdAp(e.target.value)}
                  placeholder={`Ex: ${escola?.kitWifi ?? 1}`}
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.12)" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "#10b981"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                />
                {escola?.kitWifi && (
                  <p className="text-xs mt-1" style={{ color: "rgba(148,163,184,0.5)" }}>
                    Previsto: {escola.kitWifi} kit(s) Wi-Fi
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold mb-1.5 block" style={{ color: "rgba(148,163,184,0.8)" }}>
                  Observação (opcional)
                </label>
                <textarea
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  placeholder="Alguma observação sobre a instalação..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none"
                  style={{ background: "rgba(255,255,255,0.08)", border: "1.5px solid rgba(255,255,255,0.12)" }}
                  onFocus={e => { e.currentTarget.style.borderColor = "#10b981"; }}
                  onBlur={e => { e.currentTarget.style.borderColor = "rgba(255,255,255,0.12)"; }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setOpenConcluir(false)}
                className="flex-1 py-3.5 rounded-xl font-semibold text-sm transition-colors"
                style={{ background: "rgba(255,255,255,0.07)", color: "rgba(148,163,184,0.8)", border: "1px solid rgba(255,255,255,0.10)" }}>
                Cancelar
              </button>
              <button onClick={handleConcluir} disabled={isPending}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all"
                style={{
                  background: isPending ? "rgba(16,185,129,0.4)" : "linear-gradient(135deg, #059669, #10b981)",
                  boxShadow: isPending ? "none" : "0 4px 16px rgba(16,185,129,0.25)",
                }}>
                {isPending ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4" />
                    Confirmar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
