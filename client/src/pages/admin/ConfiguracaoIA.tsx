import { useState } from "react";
import { trpc } from "@/lib/trpc";
import { toast } from "sonner";

const SEGMENTOS = [
  { key: "escola",        label: "Educação / Escolas",         icon: "🏫" },
  { key: "telecom",       label: "Telecom / Provedores",        icon: "📡" },
  { key: "energia_solar", label: "Energia Solar",               icon: "☀️" },
  { key: "seguranca",     label: "Segurança / CFTV",            icon: "📷" },
  { key: "climatizacao",  label: "Climatização",                icon: "❄️" },
  { key: "saude",         label: "Saúde / Clínicas",            icon: "🏥" },
  { key: "varejo",        label: "Varejo / Lojas",              icon: "🏪" },
  { key: "construcao",    label: "Construção Civil",            icon: "🏗️" },
  { key: "logistica",     label: "Logística / Entregas",        icon: "🚚" },
  { key: "manutencao_predial", label: "Manutenção Predial",     icon: "🔧" },
  { key: "geral",         label: "Outro / Geral",               icon: "⚙️" },
];

interface SugestaoIA {
  segmento: string;
  terminologia: Record<string, string>;
  camposExtras: Array<{ key: string; label: string; type: string; required: boolean }>;
  configFluxo: { exigirFoto: boolean; exigirObservacao: boolean; usarMapa: boolean; usarRoteamento: boolean };
  justificativa: string;
}

export default function ConfiguracaoIA() {
  const [etapa, setEtapa] = useState<"escolher" | "descrever" | "revisar" | "concluido">("escolher");
  const [segmentoSelecionado, setSegmentoSelecionado] = useState<string>("");
  const [descricao, setDescricao] = useState("");
  const [sugestao, setSugestao] = useState<SugestaoIA | null>(null);
  const [terminologiaEditada, setTerminologiaEditada] = useState<Record<string, string>>({});
  const [corPrimaria, setCorPrimaria] = useState("#00f5a0");

  const { data: configAtual, refetch } = trpc.tenantConfig.obterConfig.useQuery();

  const sugerirMutation = trpc.tenantConfig.sugerirComIA.useMutation({
    onSuccess: (data) => {
      setSugestao(data as SugestaoIA);
      setTerminologiaEditada(data.terminologia as Record<string, string>);
      setEtapa("revisar");
    },
    onError: (err) => {
      toast.error(`Erro ao consultar IA: ${err.message}`);
    },
  });

  const salvarMutation = trpc.tenantConfig.salvarConfig.useMutation({
    onSuccess: () => {
      toast.success("✅ Configuração salva! O sistema foi adaptado para o seu negócio.");
      setEtapa("concluido");
      refetch();
    },
    onError: (err) => {
      toast.error(`Erro ao salvar: ${err.message}`);
    },
  });

  const handleSelecionarSegmento = (key: string) => {
    setSegmentoSelecionado(key);
    setEtapa("descrever");
  };

  const handleSugerirComIA = () => {
    if (!descricao.trim() || descricao.length < 10) {
      toast.error("Descreva melhor: escreva pelo menos 10 caracteres sobre seu negócio.");
      return;
    }
    sugerirMutation.mutate({ descricaoNegocio: descricao });
  };

  const handleSalvar = () => {
    if (!sugestao) return;
    salvarMutation.mutate({
      segmento: sugestao.segmento,
      descricaoNegocio: descricao,
      terminologia: terminologiaEditada,
      camposExtras: sugestao.camposExtras,
      configFluxo: sugestao.configFluxo,
      corPrimaria,
    });
  };

  // Se já configurado, mostrar resumo
  if (configAtual?.configurado && etapa === "escolher") {
    return (
      <div className="max-w-3xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-white mb-1">Configuração do Sistema</h1>
          <p className="text-white/50 text-sm">Seu sistema está configurado para o segmento selecionado.</p>
        </div>

        {/* Config atual */}
        <div className="rounded-2xl border border-white/10 bg-white/3 p-6 mb-6">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">
              {SEGMENTOS.find(s => s.key === configAtual.segmento)?.icon || "⚙️"}
            </span>
            <div>
              <h2 className="text-lg font-bold text-white">
                {SEGMENTOS.find(s => s.key === configAtual.segmento)?.label || configAtual.segmento}
              </h2>
              <p className="text-white/40 text-sm">Segmento atual</p>
            </div>
            <div className="ml-auto px-3 py-1 rounded-full text-xs font-semibold bg-green-500/10 text-green-400 border border-green-500/20">
              ✓ Configurado
            </div>
          </div>

          {configAtual.terminologia && (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {Object.entries(configAtual.terminologia).slice(0, 6).map(([key, val]) => (
                <div key={key} className="p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className="text-xs text-white/40 mb-0.5">{key}</div>
                  <div className="text-sm font-semibold text-white">{String(val)}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={() => setEtapa("escolher")}
          className="px-6 py-3 rounded-xl text-sm font-semibold border border-white/20 text-white hover:border-white/40 hover:bg-white/5 transition-all"
        >
          🔄 Reconfigurar com IA
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-1">Configuração com IA</h1>
        <p className="text-white/50 text-sm">
          Descreva seu negócio e a IA adapta toda a terminologia, campos e fluxo automaticamente.
        </p>
      </div>

      {/* Progress */}
      <div className="flex items-center gap-2 mb-8">
        {["Segmento", "Descrever", "Revisar", "Pronto"].map((label, i) => {
          const etapas = ["escolher", "descrever", "revisar", "concluido"];
          const atual = etapas.indexOf(etapa);
          const isAtivo = i === atual;
          const isConcluido = i < atual;
          return (
            <div key={label} className="flex items-center gap-2">
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                isAtivo ? "bg-[#00f5a0]/10 text-[#00f5a0] border border-[#00f5a0]/30" :
                isConcluido ? "bg-green-500/10 text-green-400 border border-green-500/20" :
                "bg-white/5 text-white/30 border border-white/10"
              }`}>
                {isConcluido ? "✓" : i + 1} {label}
              </div>
              {i < 3 && <div className="w-6 h-px bg-white/10" />}
            </div>
          );
        })}
      </div>

      {/* ── Etapa 1: Escolher segmento ── */}
      {etapa === "escolher" && (
        <div>
          <h2 className="text-lg font-bold text-white mb-2">Qual é o seu segmento de atuação?</h2>
          <p className="text-white/40 text-sm mb-6">Escolha o mais próximo do seu negócio. A IA vai refinar na próxima etapa.</p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {SEGMENTOS.map((seg) => (
              <button
                key={seg.key}
                onClick={() => handleSelecionarSegmento(seg.key)}
                className={`p-4 rounded-xl border text-left transition-all hover:border-[#00f5a0]/40 hover:bg-[#00f5a0]/5 ${
                  segmentoSelecionado === seg.key
                    ? "border-[#00f5a0]/50 bg-[#00f5a0]/10"
                    : "border-white/10 bg-white/3"
                }`}
              >
                <div className="text-2xl mb-2">{seg.icon}</div>
                <div className="text-sm font-semibold text-white">{seg.label}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ── Etapa 2: Descrever negócio ── */}
      {etapa === "descrever" && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-3xl">{SEGMENTOS.find(s => s.key === segmentoSelecionado)?.icon}</span>
            <div>
              <h2 className="text-lg font-bold text-white">
                {SEGMENTOS.find(s => s.key === segmentoSelecionado)?.label}
              </h2>
              <button onClick={() => setEtapa("escolher")} className="text-xs text-white/40 hover:text-white/70">
                ← Mudar segmento
              </button>
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-semibold text-white mb-2">
              Descreva seu negócio em detalhes <span className="text-red-400">*</span>
            </label>
            <textarea
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder={`Ex: "Somos uma empresa de instalação de câmeras de segurança e sistemas de alarme. Atendemos residências e empresas em toda a região metropolitana. Temos 8 técnicos que fazem visitas e instalações."`}
              className="w-full h-32 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-sm placeholder-white/30 resize-none focus:outline-none focus:border-[#00f5a0]/40 transition-all"
            />
            <p className="text-xs text-white/30 mt-1">{descricao.length} caracteres (mínimo 10)</p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={handleSugerirComIA}
              disabled={sugerirMutation.isPending || descricao.length < 10}
              className="flex-1 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-[#00f5a0] to-[#00d9f5] text-black hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {sugerirMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  IA processando...
                </>
              ) : (
                <>🤖 Configurar com IA</>
              )}
            </button>
          </div>

          {sugerirMutation.isPending && (
            <div className="mt-4 p-4 rounded-xl bg-[#00f5a0]/5 border border-[#00f5a0]/20">
              <p className="text-sm text-[#00f5a0] text-center">
                🤖 A IA está analisando seu negócio e configurando o sistema...
              </p>
            </div>
          )}
        </div>
      )}

      {/* ── Etapa 3: Revisar sugestão ── */}
      {etapa === "revisar" && sugestao && (
        <div>
          <div className="p-4 rounded-xl bg-[#00f5a0]/5 border border-[#00f5a0]/20 mb-6">
            <div className="flex items-start gap-3">
              <span className="text-2xl">🤖</span>
              <div>
                <p className="text-sm font-semibold text-[#00f5a0] mb-1">IA configurou o sistema!</p>
                <p className="text-xs text-white/60">{sugestao.justificativa}</p>
              </div>
            </div>
          </div>

          {/* Terminologia */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-white mb-3">Terminologia do sistema</h3>
            <p className="text-xs text-white/40 mb-4">Você pode editar os termos para personalizar ainda mais.</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {Object.entries(terminologiaEditada).map(([key, val]) => (
                <div key={key}>
                  <label className="block text-xs text-white/40 mb-1">{key}</label>
                  <input
                    value={val}
                    onChange={e => setTerminologiaEditada(prev => ({ ...prev, [key]: e.target.value }))}
                    className="w-full px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-white text-sm focus:outline-none focus:border-[#00f5a0]/40 transition-all"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Campos extras */}
          {sugestao.camposExtras.length > 0 && (
            <div className="mb-6">
              <h3 className="text-base font-bold text-white mb-3">Campos do cadastro de locais</h3>
              <div className="space-y-2">
                {sugestao.camposExtras.map((campo) => (
                  <div key={campo.key} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                    <div className="flex-1">
                      <span className="text-sm font-semibold text-white">{campo.label}</span>
                      <span className="text-xs text-white/30 ml-2">({campo.type})</span>
                    </div>
                    {campo.required && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/10 text-red-400 border border-red-500/20">
                        Obrigatório
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Configurações de fluxo */}
          <div className="mb-6">
            <h3 className="text-base font-bold text-white mb-3">Configurações de fluxo</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: "exigirFoto", label: "Exigir foto" },
                { key: "exigirObservacao", label: "Exigir observação" },
                { key: "usarMapa", label: "Usar mapa" },
                { key: "usarRoteamento", label: "Roteamento automático" },
              ].map(({ key, label }) => (
                <div key={key} className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                  <div className={`w-4 h-4 rounded-full flex items-center justify-center text-xs ${
                    sugestao.configFluxo[key as keyof typeof sugestao.configFluxo]
                      ? "bg-[#00f5a0] text-black"
                      : "bg-white/10 text-white/30"
                  }`}>
                    {sugestao.configFluxo[key as keyof typeof sugestao.configFluxo] ? "✓" : "✗"}
                  </div>
                  <span className="text-sm text-white/70">{label}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cor primária */}
          <div className="mb-8">
            <h3 className="text-base font-bold text-white mb-3">Cor do tema</h3>
            <div className="flex items-center gap-4">
              <input
                type="color"
                value={corPrimaria}
                onChange={e => setCorPrimaria(e.target.value)}
                className="w-12 h-12 rounded-xl cursor-pointer border-0 bg-transparent"
              />
              <div>
                <p className="text-sm font-semibold text-white">{corPrimaria}</p>
                <p className="text-xs text-white/40">Cor principal do seu painel</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => setEtapa("descrever")}
              className="px-6 py-3 rounded-xl text-sm font-semibold border border-white/20 text-white hover:border-white/40 transition-all"
            >
              ← Voltar
            </button>
            <button
              onClick={handleSalvar}
              disabled={salvarMutation.isPending}
              className="flex-1 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-[#00f5a0] to-[#00d9f5] text-black hover:opacity-90 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {salvarMutation.isPending ? (
                <>
                  <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                  Salvando...
                </>
              ) : (
                <>✅ Salvar configuração</>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── Etapa 4: Concluído ── */}
      {etapa === "concluido" && (
        <div className="text-center py-12">
          <div className="text-6xl mb-6">🎉</div>
          <h2 className="text-2xl font-black text-white mb-3">Sistema configurado!</h2>
          <p className="text-white/50 mb-8 max-w-md mx-auto">
            O sistema foi adaptado para o seu negócio. Toda a terminologia, campos e fluxo
            agora refletem o seu segmento de atuação.
          </p>
          <div className="flex gap-3 justify-center">
            <a href="/admin/dashboard">
              <button className="px-6 py-3 rounded-xl text-sm font-bold bg-gradient-to-r from-[#00f5a0] to-[#00d9f5] text-black hover:opacity-90 transition-all">
                Ir para o Dashboard →
              </button>
            </a>
            <button
              onClick={() => setEtapa("escolher")}
              className="px-6 py-3 rounded-xl text-sm font-semibold border border-white/20 text-white hover:border-white/40 transition-all"
            >
              Reconfigurar
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
