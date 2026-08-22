import bcrypt from "bcryptjs";
import { createHash, randomBytes } from "crypto";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { router, publicProcedure } from "../_core/trpc";
import { sendEmail } from "../_core/email";
import {
  confirmRegistrationRequest,
  createRegistrationRequest,
  expireRegistrationRequest,
  getRegistrationRequestByEmail,
  getRegistrationRequestByTokenHash,
  getTenantAdminByEmail,
  getTenantBySlug,
  refreshRegistrationRequest,
} from "../db-tenant";

const CONFIRMATION_VALIDITY_MS = 24 * 60 * 60 * 1000;

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

function confirmationEmail(name: string, confirmationUrl: string) {
  return `<!doctype html>
<html lang="pt-BR"><body style="margin:0;background:#f5f7fb;font-family:Arial,sans-serif;color:#172033">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:36px 16px"><tr><td align="center">
    <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;background:#ffffff;border-radius:18px;overflow:hidden;border:1px solid #e5e7eb">
      <tr><td style="padding:28px 32px;background:#0f172a;color:#fff"><strong style="font-size:22px">Netvius</strong><p style="margin:8px 0 0;color:#a7f3d0;font-size:13px">Confirmação de cadastro</p></td></tr>
      <tr><td style="padding:32px"><h1 style="margin:0 0 16px;font-size:24px">Olá, ${name}.</h1><p style="line-height:1.6;color:#475569">Recebemos sua solicitação de acesso. Confirme seu email para criar a conta administrativa da sua empresa.</p>
      <p style="margin:26px 0"><a href="${confirmationUrl}" style="background:#059669;color:#fff;text-decoration:none;padding:14px 20px;border-radius:10px;font-weight:bold;display:inline-block">Confirmar meu cadastro</a></p>
      <p style="line-height:1.6;font-size:13px;color:#64748b">Este link expira em 24 horas. Se você não solicitou o acesso, ignore esta mensagem.</p></td></tr>
    </table>
  </td></tr></table>
</body></html>`;
}

export const signupRouter = router({
  solicitar: publicProcedure
    .input(z.object({
      nome: z.string().trim().min(2).max(255),
      empresaNome: z.string().trim().min(2).max(255),
      slug: z.string().trim().toLowerCase().regex(/^[a-z0-9-]+$/, "Use apenas letras minúsculas, números e hífens").min(2).max(100),
      email: z.string().email(),
      senha: z.string().min(8, "Use ao menos 8 caracteres").max(128),
    }))
    .mutation(async ({ input }) => {
      const email = normalizeEmail(input.email);
      const [adminExistente, tenantExistente, solicitacaoExistente] = await Promise.all([
        getTenantAdminByEmail(email),
        getTenantBySlug(input.slug),
        getRegistrationRequestByEmail(email),
      ]);

      if (adminExistente || tenantExistente) {
        return { accepted: true };
      }

      if (solicitacaoExistente?.status === "pendente" && solicitacaoExistente.expiresAt > new Date()) {
        return { accepted: true };
      }

      const rawToken = randomBytes(32).toString("hex");
      const senhaHash = await bcrypt.hash(input.senha, 12);
      const expiresAt = new Date(Date.now() + CONFIRMATION_VALIDITY_MS);
      const registrationData = {
        nome: input.nome.trim(),
        empresaNome: input.empresaNome.trim(),
        slug: input.slug,
        email,
        senhaHash,
        tokenHash: hashToken(rawToken),
        expiresAt,
      };

      if (solicitacaoExistente) {
        await refreshRegistrationRequest(solicitacaoExistente.id, registrationData);
      } else {
        await createRegistrationRequest(registrationData);
      }

      const confirmationUrl = `https://netvius.org/confirmar-cadastro?token=${rawToken}`;
      const sent = await sendEmail({
        to: email,
        subject: "Confirme seu cadastro no Netvius",
        html: confirmationEmail(input.nome.trim(), confirmationUrl),
      });

      if (!sent) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível enviar o email de confirmação. Tente novamente mais tarde." });
      }

      return { accepted: true };
    }),

  confirmar: publicProcedure
    .input(z.object({ token: z.string().regex(/^[a-f0-9]{64}$/i, "Token inválido") }))
    .mutation(async ({ input }) => {
      const request = await getRegistrationRequestByTokenHash(hashToken(input.token));
      if (!request || request.status !== "pendente") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Link inválido ou já utilizado." });
      }
      if (request.expiresAt <= new Date()) {
        await expireRegistrationRequest(request.id);
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este link expirou. Solicite um novo cadastro." });
      }

      const tenant = await confirmRegistrationRequest(request.id);
      return { success: true, tenantName: tenant.nome };
    }),
});
