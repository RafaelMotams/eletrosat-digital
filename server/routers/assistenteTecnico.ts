import { z } from "zod";
import { router, tecnicoProcedure } from "../_core/trpc";
import { recordAuditEvent } from "../audit";
import { responderAssistenteTecnico } from "../knowledge/assistenteTecnicoService";

const mimeImageSchema = z.enum(["image/jpeg", "image/png", "image/webp"]);

export const assistenteTecnicoRouter = router({
  consultar: tecnicoProcedure
    .input(z.object({
      pergunta: z.string().trim().min(3, "Descreva a dúvida técnica com mais detalhes").max(2_000),
      assunto: z.enum(["rede", "wifi", "cabeamento", "fibra", "energia", "rack", "outro"]).optional(),
      imagemBase64: z.string().max(14_000_000).optional(),
      mimeType: mimeImageSchema.optional(),
    }).superRefine((input, ctx) => {
      if (Boolean(input.imagemBase64) !== Boolean(input.mimeType)) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Informe o tipo junto com a imagem temporária" });
      }
    }))
    .mutation(async ({ input, ctx }) => {
      const result = await responderAssistenteTecnico(input);
      await recordAuditEvent({
        tenantId: ctx.tecnicoSession.tenantId,
        actorType: "tecnico",
        actorId: ctx.tecnicoSession.tecnicoId,
        action: "assistente_tecnico.consulta",
        entityType: "assistente_tecnico",
        metadata: { assunto: input.assunto ?? "outro", possuiImagem: Boolean(input.imagemBase64), versaoBase: result.versaoBase },
        req: ctx.req,
      });
      return result;
    }),

  avaliar: tecnicoProcedure
    .input(z.object({
      ajudou: z.boolean(),
      versaoBase: z.string().max(40).optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      await recordAuditEvent({
        tenantId: ctx.tecnicoSession.tenantId,
        actorType: "tecnico",
        actorId: ctx.tecnicoSession.tecnicoId,
        action: "assistente_tecnico.avaliacao",
        entityType: "assistente_tecnico",
        metadata: { ajudou: input.ajudou, versaoBase: input.versaoBase ?? null },
        req: ctx.req,
      });
      return { success: true } as const;
    }),
});
