import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";
import { useLocation, useParams } from "wouter";
import { toast } from "sonner";
import {
  ArrowLeft, School, MapPin, Wifi, Phone, CheckCircle,
  MessageCircle, Navigation, ClipboardList, Zap, Hash
} from "lucide-react";

type TecnicoData = { id: number; nome: string; email: string };

const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {
  pendente:     { label: "Pendente",     bg: "oklch(0.95 0.05 75 / 0.15)",  text: "oklch(0.55 0.16 75)",  dot: "oklch(0.65 0.18 75)" },
  em_andamento: { label: "Em andamento", bg: "oklch(0.94 0.06 240 / 0.15)", text: "oklch(0.50 0.18 240)", dot: "oklch(0.55 0.20 240)" },
  concluido:    { label: "Concluído",    bg: "oklch(0.93 0.07 162 / 0.15)", text: "oklch(0.45 0.18 162)", dot: "oklch(0.52 0.20 162)" },
};

export default function TecnicoOS() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const [tecnico, setTecnico] = useState<TecnicoData | null>(null);
  const [openConcluir, setOpenConcluir] = useState(false);
  const [qtdAp, setQtdAp] = useState("");
  const [observacao, setObservacao] = useState("");

  const utils = trpc.useUtils();

  useEffect(() => {
    const stored = localStorage.getItem("tecnico");
    if (!stored) { navigate("/tecnico/login"); return; }
    try { setTecnico(JSON.parse(stored)); } catch { navigate("/tecnico/login"); }
  }, [navigate]);

  const escolaId = parseInt(params.id ?? "0");
  const { data: escola, isLoading } = trpc.escolas.getById.useQuery(
    { id: escolaId },
    { enabled: !!escolaId }
  );

  const { data: ordens } = trpc.ordens.list.useQuery(
    { tecnicoId: tecnico?.id },
    { enabled: !!tecnico }
  );
  const osAberta = ordens?.find(o => o.escolaId === escolaId && o.status !== "concluida");

  const concluirMut = trpc.ordens.concluir.useMutation({
    onSuccess: () => {
      toast.success("Instalação concluída com sucesso!");
      utils.escolas.list.invalidate();
      utils.ordens.list.invalidate();
      setOpenConcluir(false);
      navigate("/tecnico");
    },
    onError: (e) => toast.error(e.message),
  });

  const criarEConcluirMut = trpc.ordens.criarEConcluir.useMutation({
    onSuccess: () => {
      toast.success("Instalação concluída com sucesso!");
      utils.escolas.list.invalidate();
      utils.ordens.list.invalidate();
      setOpenConcluir(false);
      navigate("/tecnico");
    },
    onError: (e) => toast.error(e.message),
  });

  function handleConcluir() {
    const ap = parseInt(qtdAp);
    if (isNaN(ap) || ap < 0) { toast.error("Informe a quantidade de APs instalados"); return; }
    if (osAberta) {
      concluirMut.mutate({ osId: osAberta.id, qtdApInstalado: ap, observacao });
    } else if (tecnico) {
      criarEConcluirMut.mutate({ escolaId, tecnicoId: tecnico.id, qtdApInstalado: ap, observacao });
    }
  }

  const lat = parseFloat(String(escola?.latitude ?? ""));
  const lng = parseFloat(String(escola?.longitude ?? ""));
  const hasCoords = !isNaN(lat) && !isNaN(lng);

  // Google Maps: abre rota de navegação se tiver coordenadas, senão busca por nome
  const mapsUrl = hasCoords
    ? `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`
    : `https://www.google.com/maps/search/${encodeURIComponent((escola?.nome ?? "") + " " + (escola?.municipio ?? "Monte Santo BA"))}`;

  // WhatsApp: usa telefoneWhatsApp (já formatado com 55) ou formata o telefone
  const whatsappNumber = escola?.telefoneWhatsApp
    ? escola.telefoneWhatsApp
    : escola?.telefone
      ? "55" + escola.telefone.replace(/\D/g, "")
      : null;
  const whatsappUrl = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Olá! Sou técnico da Eletrosat Digital e estou entrando em contato sobre a instalação de internet na ${escola?.nome}.`)}`
    : null;

  const status = escola?.status ?? "pendente";
  const sc = statusConfig[status] ?? statusConfig.pendente;
  const isPending = concluirMut.isPending || criarEConcluirMut.isPending;

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(180deg, oklch(0.10 0.04 240) 0%, oklch(0.13 0.06 240) 100%)" }}>
      {/* Header */}
      <header className="px-4 pt-safe pb-3 pt-4 flex items-center gap-3 sticky top-0 z-10"
        style={{ background: "oklch(0.10 0.04 240 / 0.95)", backdropFilter: "blur(12px)", borderBottom: "1px solid oklch(1 0 0 / 0.07)" }}>
        <button onClick={() => navigate("/tecnico")}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors"
          style={{ background: "oklch(1 0 0 / 0.08)", color: "white" }}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-white font-bold text-sm truncate" style={{ fontFamily: "var(--font-display)" }}>
            {isLoading ? "Carregando..." : escola?.nome ?? "Escola"}
          </p>
          <p className="text-xs" style={{ color: "oklch(0.55 0.06 240)" }}>Detalhes da Ordem de Serviço</p>
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
            <div className="w-10 h-10 border-2 border-t-transparent rounded-full animate-spin" style={{ borderColor: "oklch(0.50 0.18 162)", borderTopColor: "transparent" }} />
            <p className="text-sm" style={{ color: "oklch(0.55 0.06 240)" }}>Carregando escola...</p>
          </div>
        </div>
      ) : !escola ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center px-6">
            <School className="w-12 h-12 mx-auto mb-3 opacity-30 text-white" />
            <p className="text-white font-semibold">Escola não encontrada</p>
            <button onClick={() => navigate("/tecnico")} className="mt-4 text-sm underline" style={{ color: "oklch(0.50 0.18 162)" }}>
              Voltar para a lista
            </button>
          </div>
        </div>
      ) : (
        <div className="flex-1 px-4 py-5 space-y-4 pb-8">

          {/* Card principal da escola */}
          <div className="rounded-2xl p-5" style={{ background: "oklch(1 0 0 / 0.06)", border: "1px solid oklch(1 0 0 / 0.10)" }}>
            <div className="flex items-start gap-3 mb-5">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
                style={{ background: "linear-gradient(135deg, oklch(0.28 0.10 240), oklch(0.38 0.14 240))" }}>
                <School className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1 min-w-0">
                <h1 className="text-white font-bold text-base leading-tight" style={{ fontFamily: "var(--font-display)" }}>
                  {escola.nome}
                </h1>
                <p className="text-xs mt-1" style={{ color: "oklch(0.55 0.06 240)" }}>
                  {escola.municipio} — {escola.uf}
                </p>
              </div>
            </div>

            {/* Info grid */}
            <div className="space-y-3">
              <div className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: "oklch(1 0 0 / 0.04)" }}>
                <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.94 0.04 240 / 0.3)" }}>
                  <Hash className="w-3.5 h-3.5" style={{ color: "oklch(0.65 0.10 240)" }} />
                </div>
                <div>
                  <p className="text-xs" style={{ color: "oklch(0.50 0.05 240)" }}>Código INEP</p>
                  <p className="text-sm font-semibold text-white">{escola.inep}</p>
                </div>
              </div>

              {escola.endereco && (
                <div className="flex items-start gap-2.5 p-2.5 rounded-xl" style={{ background: "oklch(1 0 0 / 0.04)" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5" style={{ background: "oklch(0.94 0.04 240 / 0.3)" }}>
                    <MapPin className="w-3.5 h-3.5" style={{ color: "oklch(0.65 0.10 240)" }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "oklch(0.50 0.05 240)" }}>Endereço</p>
                    <p className="text-sm text-white leading-snug">{escola.endereco}</p>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-2">
                <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: "oklch(1 0 0 / 0.04)" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.93 0.07 162 / 0.25)" }}>
                    <Wifi className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.18 162)" }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "oklch(0.50 0.05 240)" }}>Velocidade</p>
                    <p className="text-sm font-bold text-white">{escola.velocidadeOfertada}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 p-2.5 rounded-xl" style={{ background: "oklch(1 0 0 / 0.04)" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.96 0.05 75 / 0.25)" }}>
                    <Zap className="w-3.5 h-3.5" style={{ color: "oklch(0.60 0.16 75)" }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "oklch(0.50 0.05 240)" }}>Kits Wi-Fi</p>
                    <p className="text-sm font-bold text-white">{escola.kitWifi ?? escola.qtdAp ?? 1}</p>
                  </div>
                </div>
              </div>

              {escola.telefone && (
                <div className="flex items-center gap-2.5 p-2.5 rounded-xl" style={{ background: "oklch(1 0 0 / 0.04)" }}>
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0" style={{ background: "oklch(0.93 0.07 162 / 0.25)" }}>
                    <Phone className="w-3.5 h-3.5" style={{ color: "oklch(0.55 0.18 162)" }} />
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "oklch(0.50 0.05 240)" }}>Telefone da escola</p>
                    <p className="text-sm font-semibold text-white">{escola.telefone}</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Botões de ação: WhatsApp e Google Maps */}
          <div className="grid grid-cols-2 gap-3">
            {/* Google Maps */}
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" className="block">
              <button className="w-full py-4 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95"
                style={{ background: "linear-gradient(135deg, oklch(0.28 0.10 240), oklch(0.38 0.16 240))", border: "1px solid oklch(1 0 0 / 0.10)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "oklch(1 0 0 / 0.12)" }}>
                  <Navigation className="w-5 h-5 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>Google Maps</p>
                  <p className="text-xs" style={{ color: "oklch(0.65 0.08 240)" }}>
                    {hasCoords ? "Rota de navegação" : "Buscar escola"}
                  </p>
                </div>
              </button>
            </a>

            {/* WhatsApp */}
            {whatsappUrl ? (
              <a href={whatsappUrl} target="_blank" rel="noopener noreferrer" className="block">
                <button className="w-full py-4 rounded-2xl flex flex-col items-center gap-2 transition-all active:scale-95"
                  style={{ background: "linear-gradient(135deg, oklch(0.38 0.16 162), oklch(0.50 0.20 162))", border: "1px solid oklch(1 0 0 / 0.10)" }}>
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "oklch(1 0 0 / 0.12)" }}>
                    <MessageCircle className="w-5 h-5 text-white" />
                  </div>
                  <div className="text-center">
                    <p className="text-white font-bold text-sm" style={{ fontFamily: "var(--font-display)" }}>WhatsApp</p>
                    <p className="text-xs" style={{ color: "oklch(0.70 0.08 162)" }}>Contatar escola</p>
                  </div>
                </button>
              </a>
            ) : (
              <button disabled className="w-full py-4 rounded-2xl flex flex-col items-center gap-2 opacity-30 cursor-not-allowed"
                style={{ background: "oklch(1 0 0 / 0.06)", border: "1px solid oklch(1 0 0 / 0.08)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: "oklch(1 0 0 / 0.08)" }}>
                  <MessageCircle className="w-5 h-5 text-white" />
                </div>
                <div className="text-center">
                  <p className="text-white font-bold text-sm">WhatsApp</p>
                  <p className="text-xs text-white/50">Sem telefone</p>
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
                background: "linear-gradient(135deg, oklch(0.40 0.18 162), oklch(0.52 0.22 162))",
                boxShadow: "0 8px 32px oklch(0.50 0.18 162 / 0.35)",
                fontFamily: "var(--font-display)",
              }}>
              <CheckCircle className="w-6 h-6" />
              Marcar como Concluído
            </button>
          ) : (
            <div className="rounded-2xl p-5 text-center" style={{ background: "oklch(0.93 0.07 162 / 0.15)", border: "1px solid oklch(0.50 0.18 162 / 0.30)" }}>
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3"
                style={{ background: "linear-gradient(135deg, oklch(0.40 0.18 162), oklch(0.52 0.22 162))" }}>
                <CheckCircle className="w-7 h-7 text-white" />
              </div>
              <p className="font-bold text-lg" style={{ color: "oklch(0.55 0.18 162)", fontFamily: "var(--font-display)" }}>
                Instalação Concluída!
              </p>
              {escola.dataConclusao && (
                <p className="text-sm mt-1" style={{ color: "oklch(0.55 0.10 162)" }}>
                  Concluída em {new Date(escola.dataConclusao).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {/* Modal de conclusão */}
      {openConcluir && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0" style={{ background: "oklch(0 0 0 / 0.7)", backdropFilter: "blur(4px)" }}
          onClick={e => { if (e.target === e.currentTarget) setOpenConcluir(false); }}>
          <div className="w-full max-w-lg rounded-t-3xl p-6 pb-10 animate-slide-up"
            style={{ background: "oklch(0.14 0.05 240)", border: "1px solid oklch(1 0 0 / 0.10)" }}>
            {/* Handle */}
            <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: "oklch(1 0 0 / 0.15)" }} />

            <div className="flex items-center gap-3 mb-6">
              <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
                style={{ background: "linear-gradient(135deg, oklch(0.40 0.18 162), oklch(0.52 0.22 162))" }}>
                <CheckCircle className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="text-white font-bold text-lg" style={{ fontFamily: "var(--font-display)" }}>Concluir Instalação</h3>
                <p className="text-xs" style={{ color: "oklch(0.55 0.06 240)" }}>{escola?.nome}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold mb-1.5 block" style={{ color: "oklch(0.75 0.04 240)" }}>
                  Quantidade de APs instalados *
                </label>
                <input
                  type="number"
                  min="0"
                  value={qtdAp}
                  onChange={e => setQtdAp(e.target.value)}
                  placeholder={`Ex: ${escola?.kitWifi ?? 1}`}
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none"
                  style={{ background: "oklch(1 0 0 / 0.08)", border: "1.5px solid oklch(1 0 0 / 0.12)" }}
                  onFocus={e => { e.target.style.borderColor = "oklch(0.50 0.18 162)"; }}
                  onBlur={e => { e.target.style.borderColor = "oklch(1 0 0 / 0.12)"; }}
                />
                {escola?.kitWifi && (
                  <p className="text-xs mt-1" style={{ color: "oklch(0.50 0.06 240)" }}>
                    Previsto: {escola.kitWifi} kit(s) Wi-Fi
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold mb-1.5 block" style={{ color: "oklch(0.75 0.04 240)" }}>
                  Observação (opcional)
                </label>
                <textarea
                  value={observacao}
                  onChange={e => setObservacao(e.target.value)}
                  placeholder="Alguma observação sobre a instalação..."
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl text-white text-sm outline-none resize-none"
                  style={{ background: "oklch(1 0 0 / 0.08)", border: "1.5px solid oklch(1 0 0 / 0.12)" }}
                  onFocus={e => { e.target.style.borderColor = "oklch(0.50 0.18 162)"; }}
                  onBlur={e => { e.target.style.borderColor = "oklch(1 0 0 / 0.12)"; }}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button onClick={() => setOpenConcluir(false)}
                className="flex-1 py-3.5 rounded-xl font-semibold text-sm transition-colors"
                style={{ background: "oklch(1 0 0 / 0.08)", color: "oklch(0.70 0.04 240)", border: "1px solid oklch(1 0 0 / 0.10)" }}>
                Cancelar
              </button>
              <button onClick={handleConcluir} disabled={isPending}
                className="flex-1 py-3.5 rounded-xl font-bold text-sm text-white flex items-center justify-center gap-2 transition-all"
                style={{
                  background: isPending ? "oklch(0.40 0.18 162 / 0.5)" : "linear-gradient(135deg, oklch(0.40 0.18 162), oklch(0.52 0.22 162))",
                  boxShadow: isPending ? "none" : "0 6px 20px oklch(0.50 0.18 162 / 0.30)",
                }}>
                {isPending ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
                ) : (
                  <><CheckCircle className="w-4 h-4" /> Confirmar</>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
