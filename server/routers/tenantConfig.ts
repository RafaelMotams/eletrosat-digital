import { z } from "zod";
import { router } from "../_core/trpc";
import { tenantAdminProcedure } from "../_core/trpc";
import { getDb } from "../db";
import { tenantConfig } from "../../drizzle/schema";
import { eq } from "drizzle-orm";
import { invokeLLM } from "../_core/llm";

// ─── Segmentos pré-definidos ──────────────────────────────────────────────────
export const SEGMENTOS_PREDEFINIDOS = [
  { key: "escola",        label: "Educação / Escolas",         icon: "🏫", desc: "Instalação de redes em escolas públicas e privadas" },
  { key: "telecom",       label: "Telecom / Provedores",        icon: "📡", desc: "Instalação de fibra, rádio, antenas e equipamentos" },
  { key: "energia_solar", label: "Energia Solar",               icon: "☀️", desc: "Instalação de painéis solares e inversores" },
  { key: "seguranca",     label: "Segurança / CFTV",            icon: "📷", desc: "Instalação de câmeras, alarmes e controle de acesso" },
  { key: "climatizacao",  label: "Climatização / Ar-condicionado", icon: "❄️", desc: "Instalação e manutenção de ar-condicionado" },
  { key: "saude",         label: "Saúde / Clínicas",            icon: "🏥", desc: "Equipamentos médicos e infraestrutura hospitalar" },
  { key: "varejo",        label: "Varejo / Lojas",              icon: "🏪", desc: "Instalação de equipamentos em lojas e franquias" },
  { key: "construcao",    label: "Construção Civil",            icon: "🏗️", desc: "Gestão de obras, vistorias e inspeções" },
  { key: "logistica",     label: "Logística / Entregas",        icon: "🚚", desc: "Roteirização e gestão de entregas" },
  { key: "manutencao_predial", label: "Manutenção Predial",    icon: "🔧", desc: "Manutenção de prédios, condomínios e instalações" },
  { key: "geral",         label: "Outro / Geral",               icon: "⚙️", desc: "Qualquer outro tipo de serviço técnico em campo" },
];

// ─── Terminologia padrão por segmento ────────────────────────────────────────
const TERMINOLOGIA_PADRAO: Record<string, Record<string, string>> = {
  escola: {
    local: "Escola", locais: "Escolas", tecnico: "Técnico", tecnicos: "Técnicos",
    os: "Ordem de Serviço", oss: "Ordens de Serviço", campo1Label: "INEP",
    campo2Label: "Velocidade Ofertada", campo3Label: "Tipo de Conexão",
    concluir: "Concluir Instalação", status_concluido: "Instalado",
    status_pendente: "Pendente", status_em_andamento: "Em Andamento",
  },
  telecom: {
    local: "Ponto de Instalação", locais: "Pontos de Instalação", tecnico: "Instalador", tecnicos: "Instaladores",
    os: "Ordem de Serviço", oss: "Ordens de Serviço", campo1Label: "CTO/Caixa",
    campo2Label: "Velocidade Contratada", campo3Label: "Tipo de Conexão",
    concluir: "Concluir Instalação", status_concluido: "Instalado",
    status_pendente: "Agendado", status_em_andamento: "Em Execução",
  },
  energia_solar: {
    local: "Residência / Empresa", locais: "Clientes", tecnico: "Instalador Solar", tecnicos: "Instaladores",
    os: "Ordem de Instalação", oss: "Ordens de Instalação", campo1Label: "Potência (kWp)",
    campo2Label: "Nº de Painéis", campo3Label: "Tipo de Inversor",
    concluir: "Concluir Instalação", status_concluido: "Instalado",
    status_pendente: "Agendado", status_em_andamento: "Em Instalação",
  },
  seguranca: {
    local: "Local / Cliente", locais: "Clientes", tecnico: "Técnico de Segurança", tecnicos: "Técnicos",
    os: "Ordem de Serviço", oss: "Ordens de Serviço", campo1Label: "Nº de Câmeras",
    campo2Label: "Tipo de Sistema", campo3Label: "Resolução",
    concluir: "Concluir Instalação", status_concluido: "Instalado",
    status_pendente: "Agendado", status_em_andamento: "Em Execução",
  },
  climatizacao: {
    local: "Cliente / Ambiente", locais: "Clientes", tecnico: "Técnico de Climatização", tecnicos: "Técnicos",
    os: "Ordem de Serviço", oss: "Ordens de Serviço", campo1Label: "BTUs",
    campo2Label: "Marca / Modelo", campo3Label: "Tipo (Split/Central)",
    concluir: "Concluir Atendimento", status_concluido: "Concluído",
    status_pendente: "Agendado", status_em_andamento: "Em Atendimento",
  },
  saude: {
    local: "Unidade de Saúde", locais: "Unidades", tecnico: "Técnico Biomédico", tecnicos: "Técnicos",
    os: "Ordem de Serviço", oss: "Ordens de Serviço", campo1Label: "CNES",
    campo2Label: "Equipamento", campo3Label: "Fabricante",
    concluir: "Concluir Manutenção", status_concluido: "Concluído",
    status_pendente: "Agendado", status_em_andamento: "Em Manutenção",
  },
  varejo: {
    local: "Loja / Filial", locais: "Lojas", tecnico: "Técnico de Campo", tecnicos: "Técnicos",
    os: "Ordem de Serviço", oss: "Ordens de Serviço", campo1Label: "Código da Loja",
    campo2Label: "Rede / Franquia", campo3Label: "Tipo de Serviço",
    concluir: "Concluir Visita", status_concluido: "Concluído",
    status_pendente: "Agendado", status_em_andamento: "Em Visita",
  },
  construcao: {
    local: "Obra / Endereço", locais: "Obras", tecnico: "Vistoriador", tecnicos: "Vistoriadores",
    os: "Vistoria / OS", oss: "Vistorias", campo1Label: "ART/RRT",
    campo2Label: "Tipo de Obra", campo3Label: "Área (m²)",
    concluir: "Concluir Vistoria", status_concluido: "Vistoriado",
    status_pendente: "Agendado", status_em_andamento: "Em Vistoria",
  },
  logistica: {
    local: "Destino / Cliente", locais: "Destinos", tecnico: "Entregador", tecnicos: "Entregadores",
    os: "Entrega", oss: "Entregas", campo1Label: "Código do Pedido",
    campo2Label: "Peso (kg)", campo3Label: "Tipo de Carga",
    concluir: "Confirmar Entrega", status_concluido: "Entregue",
    status_pendente: "A Entregar", status_em_andamento: "Em Rota",
  },
  manutencao_predial: {
    local: "Prédio / Condomínio", locais: "Prédios", tecnico: "Técnico de Manutenção", tecnicos: "Técnicos",
    os: "Ordem de Manutenção", oss: "Ordens de Manutenção", campo1Label: "Unidade/Bloco",
    campo2Label: "Tipo de Serviço", campo3Label: "Prioridade",
    concluir: "Concluir Manutenção", status_concluido: "Concluído",
    status_pendente: "Agendado", status_em_andamento: "Em Execução",
  },
  geral: {
    local: "Local / Cliente", locais: "Locais", tecnico: "Técnico", tecnicos: "Técnicos",
    os: "Ordem de Serviço", oss: "Ordens de Serviço", campo1Label: "Código",
    campo2Label: "Tipo de Serviço", campo3Label: "Observação",
    concluir: "Concluir Serviço", status_concluido: "Concluído",
    status_pendente: "Pendente", status_em_andamento: "Em Andamento",
  },
};

export const tenantConfigRouter = router({
  // ── Listar segmentos disponíveis ──────────────────────────────────────────
  listarSegmentos: tenantAdminProcedure.query(async () => {
    return SEGMENTOS_PREDEFINIDOS;
  }),

  // ── Obter configuração atual do tenant ────────────────────────────────────
  obterConfig: tenantAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new Error("DB indisponível");
    const config = await db.select().from(tenantConfig).where(eq(tenantConfig.tenantId, ctx.tenantSession!.tenantId)).limit(1);
    if (config.length === 0) return null;
    const c = config[0];
    return {
      ...c,
      terminologia: c.terminologia ? JSON.parse(c.terminologia) : TERMINOLOGIA_PADRAO["geral"],
      camposExtras: c.camposExtras ? JSON.parse(c.camposExtras) : [],
      configFluxo: c.configFluxo ? JSON.parse(c.configFluxo) : { exigirFoto: false, exigirObservacao: true, usarMapa: true },
    };
  }),

  // ── Usar IA para sugerir configuração com base na descrição do negócio ────
  sugerirComIA: tenantAdminProcedure
    .input(z.object({
      descricaoNegocio: z.string().min(10, "Descreva seu negócio em pelo menos 10 caracteres"),
    }))
    .mutation(async ({ input }) => {
      const prompt = `Você é um assistente especializado em sistemas de gestão de serviços técnicos em campo.

O usuário descreveu seu negócio assim: "${input.descricaoNegocio}"

Com base nessa descrição, sugira a melhor configuração para o sistema de gestão. Responda APENAS com JSON válido no seguinte formato:

{
  "segmento": "um dos: escola|telecom|energia_solar|seguranca|climatizacao|saude|varejo|construcao|logistica|manutencao_predial|geral",
  "terminologia": {
    "local": "como chamar o local de atendimento (ex: Escola, Loja, Residência, Obra)",
    "locais": "plural do local",
    "tecnico": "como chamar o profissional de campo (ex: Técnico, Instalador, Entregador)",
    "tecnicos": "plural do técnico",
    "os": "como chamar a ordem de serviço (ex: Ordem de Serviço, Entrega, Vistoria)",
    "oss": "plural da OS",
    "campo1Label": "nome do campo identificador principal do local (ex: INEP, Código, CTO)",
    "campo2Label": "nome do segundo campo relevante (ex: Velocidade, BTUs, Potência)",
    "campo3Label": "nome do terceiro campo relevante",
    "concluir": "texto do botão de conclusão (ex: Concluir Instalação, Confirmar Entrega)",
    "status_concluido": "como chamar o status concluído (ex: Instalado, Entregue, Vistoriado)",
    "status_pendente": "como chamar o status pendente (ex: Pendente, Agendado, A Entregar)",
    "status_em_andamento": "como chamar o status em andamento"
  },
  "camposExtras": [
    { "key": "campo1", "label": "Nome do campo 1", "type": "text", "required": true },
    { "key": "campo2", "label": "Nome do campo 2", "type": "text", "required": false }
  ],
  "configFluxo": {
    "exigirFoto": true,
    "exigirObservacao": true,
    "usarMapa": true,
    "usarRoteamento": true
  },
  "justificativa": "Explicação curta de por que escolheu essa configuração"
}

Adapte os campos para fazer sentido para o negócio descrito. Seja específico e útil.`;

      try {
        const response = await invokeLLM({
          messages: [
            { role: "system", content: "Você é um assistente de configuração de sistemas SaaS. Responda APENAS com JSON válido, sem markdown, sem explicações fora do JSON." },
            { role: "user", content: prompt },
          ],
          response_format: {
            type: "json_schema",
            json_schema: {
              name: "tenant_config_suggestion",
              strict: true,
              schema: {
                type: "object",
                properties: {
                  segmento: { type: "string" },
                  terminologia: { type: "object", additionalProperties: { type: "string" } },
                  camposExtras: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        key: { type: "string" },
                        label: { type: "string" },
                        type: { type: "string" },
                        required: { type: "boolean" },
                      },
                      required: ["key", "label", "type", "required"],
                      additionalProperties: false,
                    },
                  },
                  configFluxo: {
                    type: "object",
                    properties: {
                      exigirFoto: { type: "boolean" },
                      exigirObservacao: { type: "boolean" },
                      usarMapa: { type: "boolean" },
                      usarRoteamento: { type: "boolean" },
                    },
                    required: ["exigirFoto", "exigirObservacao", "usarMapa", "usarRoteamento"],
                    additionalProperties: false,
                  },
                  justificativa: { type: "string" },
                },
                required: ["segmento", "terminologia", "camposExtras", "configFluxo", "justificativa"],
                additionalProperties: false,
              },
            },
          },
        });

        const content = response.choices?.[0]?.message?.content;
        if (!content) throw new Error("IA não retornou resposta");
        const contentStr = typeof content === "string" ? content : JSON.stringify(content);
        return JSON.parse(contentStr);
      } catch (_e) {
        // Fallback: detectar segmento por palavras-chave
        const desc = input.descricaoNegocio.toLowerCase();
        let segmento = "geral";
        if (desc.includes("escola") || desc.includes("educação") || desc.includes("inep")) segmento = "escola";
        else if (desc.includes("fibra") || desc.includes("internet") || desc.includes("provedor") || desc.includes("telecom")) segmento = "telecom";
        else if (desc.includes("solar") || desc.includes("painel") || desc.includes("fotovoltaico")) segmento = "energia_solar";
        else if (desc.includes("câmera") || desc.includes("cftv") || desc.includes("segurança") || desc.includes("alarme")) segmento = "seguranca";
        else if (desc.includes("ar-condicionado") || desc.includes("climatização") || desc.includes("btu")) segmento = "climatizacao";
        else if (desc.includes("saúde") || desc.includes("hospital") || desc.includes("clínica") || desc.includes("médico")) segmento = "saude";
        else if (desc.includes("loja") || desc.includes("varejo") || desc.includes("franquia")) segmento = "varejo";
        else if (desc.includes("obra") || desc.includes("construção") || desc.includes("vistoria")) segmento = "construcao";
        else if (desc.includes("entrega") || desc.includes("logística") || desc.includes("frete")) segmento = "logistica";
        else if (desc.includes("prédio") || desc.includes("condomínio") || desc.includes("manutenção predial")) segmento = "manutencao_predial";

        return {
          segmento,
          terminologia: TERMINOLOGIA_PADRAO[segmento] || TERMINOLOGIA_PADRAO["geral"],
          camposExtras: [
            { key: "campo1", label: TERMINOLOGIA_PADRAO[segmento]?.campo1Label || "Código", type: "text", required: true },
            { key: "campo2", label: TERMINOLOGIA_PADRAO[segmento]?.campo2Label || "Tipo de Serviço", type: "text", required: false },
          ],
          configFluxo: { exigirFoto: true, exigirObservacao: true, usarMapa: true, usarRoteamento: true },
          justificativa: `Configuração padrão para o segmento "${segmento}" detectado automaticamente.`,
        };
      }
    }),

  // ── Salvar configuração do tenant ─────────────────────────────────────────
  salvarConfig: tenantAdminProcedure
    .input(z.object({
      segmento: z.string(),
      descricaoNegocio: z.string().optional(),
      terminologia: z.record(z.string(), z.string()).optional(),
      camposExtras: z.array(z.object({
        key: z.string(),
        label: z.string(),
        type: z.string(),
        required: z.boolean(),
      })).optional(),
      configFluxo: z.object({
        exigirFoto: z.boolean().optional(),
        exigirObservacao: z.boolean().optional(),
        usarMapa: z.boolean().optional(),
        usarRoteamento: z.boolean().optional(),
      }).optional(),
      corPrimaria: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new Error("DB indisponível");
      const tenantId = ctx.tenantSession!.tenantId;

      // Terminologia: mesclar com padrão do segmento
      const terminologiaPadrao = TERMINOLOGIA_PADRAO[input.segmento] || TERMINOLOGIA_PADRAO["geral"];
      const terminologia = { ...terminologiaPadrao, ...(input.terminologia || {}) };

      const configFluxo = {
        exigirFoto: input.configFluxo?.exigirFoto ?? true,
        exigirObservacao: input.configFluxo?.exigirObservacao ?? true,
        usarMapa: input.configFluxo?.usarMapa ?? true,
        usarRoteamento: input.configFluxo?.usarRoteamento ?? true,
      };

      const existing = await db.select().from(tenantConfig).where(eq(tenantConfig.tenantId, tenantId)).limit(1);

      if (existing.length > 0) {
        await db.update(tenantConfig).set({
          segmento: input.segmento,
          descricaoNegocio: input.descricaoNegocio,
          terminologia: JSON.stringify(terminologia),
          camposExtras: JSON.stringify(input.camposExtras || []),
          configFluxo: JSON.stringify(configFluxo),
          corPrimaria: input.corPrimaria || "#00f5a0",
          configurado: true,
        }).where(eq(tenantConfig.tenantId, tenantId));
      } else {
        await db.insert(tenantConfig).values({
          tenantId,
          segmento: input.segmento,
          descricaoNegocio: input.descricaoNegocio,
          terminologia: JSON.stringify(terminologia),
          camposExtras: JSON.stringify(input.camposExtras || []),
          configFluxo: JSON.stringify(configFluxo),
          corPrimaria: input.corPrimaria || "#00f5a0",
          configurado: true,
        });
      }

      return { ok: true, terminologia };
    }),

  // ── Obter terminologia pública (para o app do técnico) ────────────────────
  obterTerminologia: tenantAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) return TERMINOLOGIA_PADRAO["geral"];
    const config = await db.select().from(tenantConfig).where(eq(tenantConfig.tenantId, ctx.tenantSession!.tenantId)).limit(1);
    if (config.length === 0 || !config[0].terminologia) return TERMINOLOGIA_PADRAO["geral"];
    try {
      return JSON.parse(config[0].terminologia);
    } catch {
      return TERMINOLOGIA_PADRAO["geral"];
    }
  }),
});
