import { TRPCError } from "@trpc/server";
import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { escolas } from "../../drizzle/schema";
import { getDb } from "../db";
import { invokeLLM, type Message } from "../_core/llm";
import { publicProcedure, router } from "../_core/trpc";
import {
  APRENDER_CONECTADO_FONTES,
  ASSISTENTE_EACE_SYSTEM_PROMPT,
} from "../aprenderConectadoKnowledge";

const SITUACOES = [
  "vistoria_rede_externa",
  "roteador_modem",
  "rack_equipamentos",
  "cabeamento",
  "ap_cobertura",
  "travessia_blocos",
  "testes",
  "evidencias_as_built",
  "seguranca",
] as const;

const ANALISE_SCHEMA = {
  name: "analise_tecnica_eace",
  strict: true,
  schema: {
    type: "object",
    additionalProperties: false,
    properties: {
      observacoes: { type: "array", items: { type: "string" }, maxItems: 10 },
      faltasConfirmar: { type: "array", items: { type: "string" }, maxItems: 10 },
      opcoes: {
        type: "array",
        minItems: 1,
        maxItems: 4,
        items: {
          type: "object",
          additionalProperties: false,
          properties: {
            titulo: { type: "string" },
            vantagem: { type: "string" },
            risco: { type: "string" },
            condicao: { type: "string" },
          },
          required: ["titulo", "vantagem", "risco", "condicao"],
        },
      },
      recomendacao: { type: "string" },
      comoValidar: { type: "array", items: { type: "string" }, maxItems: 12 },
      classificacoes: { type: "array", items: { type: "string" }, maxItems: 12 },
      alertaSeguranca: { type: ["string", "null"] },
    },
    required: ["observacoes", "faltasConfirmar", "opcoes", "recomendacao", "comoValidar", "classificacoes", "alertaSeguranca"],
  },
} as const;

const tecnicoProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.tecnicoSession) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sessão do técnico inválida ou expirada" });
  }
  return next({ ctx });
});

function extractText(content: unknown): string {
  if (typeof content === "string") return content.trim();
  if (!Array.isArray(content)) return "";
  return content
    .map(part => {
      if (!part || typeof part !== "object") return "";
      const value = (part as { text?: unknown }).text;
      return typeof value === "string" ? value : "";
    })
    .join("\n")
    .trim();
}

export function formatStructuredAnalysis(raw: string): string {
  try {
    const cleaned = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
    const data = JSON.parse(cleaned) as {
      observacoes: string[];
      faltasConfirmar: string[];
      opcoes: Array<{ titulo: string; vantagem: string; risco: string; condicao: string }>;
      recomendacao: string;
      comoValidar: string[];
      classificacoes: string[];
      alertaSeguranca: string | null;
    };
    const bullets = (items: string[]) => items.length ? items.map(item => `• ${item}`).join("\n") : "• Nenhum item confirmado.";
    const options = data.opcoes.map((option, index) => [
      `${index + 1}) ${option.titulo}`,
      `   Vantagem: ${option.vantagem}`,
      `   Risco: ${option.risco}`,
      `   Usar quando: ${option.condicao}`,
    ].join("\n")).join("\n\n");
    return [
      "1. O que consigo observar",
      bullets(data.observacoes),
      "2. O que falta confirmar",
      bullets(data.faltasConfirmar),
      "3. Opções possíveis",
      options,
      "4. Recomendação",
      data.recomendacao,
      "5. Como validar",
      bullets(data.comoValidar),
      "6. Classificação das orientações",
      bullets(data.classificacoes),
      ...(data.alertaSeguranca ? ["Alerta de segurança", data.alertaSeguranca] : []),
    ].join("\n\n");
  } catch {
    return raw;
  }
}

export const assistenteEaceRouter = router({
  fontes: tecnicoProcedure.query(() => ({
    baseAtualizadaEm: "2026-08-22",
    fontes: APRENDER_CONECTADO_FONTES,
    aviso: "Regras específicas da executora devem ser conferidas no contrato, projeto executivo e POP vigentes.",
  })),

  analisar: tecnicoProcedure
    .input(z.object({
      pergunta: z.string().trim().min(3).max(4000),
      situacao: z.enum(SITUACOES).default("vistoria_rede_externa"),
      escolaId: z.number().int().positive().optional(),
      imageBase64: z.string().max(12_000_000).optional(),
      mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]).optional(),
      historico: z.array(z.object({
        role: z.enum(["user", "assistant"]),
        content: z.string().min(1).max(1600),
      })).max(6).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const session = ctx.tecnicoSession!;
      let contextoEscola = "Nenhuma escola selecionada.";

      if (input.escolaId) {
        const db = await getDb();
        if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
        const rows = await db.select().from(escolas).where(and(
          eq(escolas.id, input.escolaId),
          eq(escolas.tenantId, session.tenantId),
          eq(escolas.tecnicoId, session.tecnicoId),
        )).limit(1);
        const escola = rows[0];
        if (!escola) throw new TRPCError({ code: "FORBIDDEN", message: "Escola fora da atribuição do técnico" });
        contextoEscola = [
          `Escola: ${escola.nome}`,
          `INEP: ${escola.inep}`,
          `Município/UF: ${escola.municipio ?? "não informado"}/${escola.uf ?? "--"}`,
          `Rede externa cadastrada: ${escola.redeExternaStatus}`,
          `Tipo cadastrado: ${escola.redeExternaTipo ?? "não informado"}`,
          `Observação administrativa: ${escola.redeExternaObservacao ?? "nenhuma"}`,
        ].join(" | ");
      }

      if (input.imageBase64) {
        const estimatedBytes = Math.floor(input.imageBase64.length * 0.75);
        if (estimatedBytes > 8 * 1024 * 1024) {
          throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "A imagem para análise deve ter no máximo 8 MB" });
        }
        if (!input.mimeType) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Informe o formato da imagem" });
        }
      }

      const messages: Message[] = [
        { role: "system", content: ASSISTENTE_EACE_SYSTEM_PROMPT },
        ...(input.historico ?? []).map(item => ({
          role: item.role,
          content: item.content,
        } as Message)),
      ];

      const texto = `Situação selecionada: ${input.situacao}.\nContexto cadastrado: ${contextoEscola}\nPergunta do técnico: ${input.pergunta}`;
      if (input.imageBase64 && input.mimeType) {
        messages.push({
          role: "user",
          content: [
            { type: "text", text: texto },
            {
              type: "image_url",
              image_url: {
                url: `data:${input.mimeType};base64,${input.imageBase64}`,
                detail: "high",
              },
            },
          ],
        });
      } else {
        messages.push({ role: "user", content: texto });
      }

      try {
        const response = await invokeLLM({
          messages,
          max_tokens: 2400,
          outputSchema: ANALISE_SCHEMA,
        });
        const raw = extractText(response.choices?.[0]?.message?.content);
        if (!raw) throw new Error("Resposta vazia do modelo");
        const resposta = formatStructuredAnalysis(raw);
        return {
          resposta,
          analisouImagem: Boolean(input.imageBase64),
          baseAtualizadaEm: "2026-08-22",
          fontes: APRENDER_CONECTADO_FONTES,
        };
      } catch (error) {
        console.error("[assistenteEace.analisar]", error);
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível consultar o assistente agora. Registre a situação e tente novamente.",
        });
      }
    }),
});
