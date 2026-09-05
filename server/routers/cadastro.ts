import { TRPCError } from "@trpc/server";
import { randomBytes, createHash } from "node:crypto";
import { z } from "zod";
import { sendEmail } from "../_core/email";
import { publicProcedure, router } from "../_core/trpc";
import {
  confirmarEmailTenantAdmin,
  createTenant,
  createTenantAdmin,
  definirTokenVerificacaoEmail,
  getTenantAdminByEmail,
  getTenantBySlug,
} from "../db-tenant";

const TOKEN_TTL_MS = 24 * 60 * 60 * 1000;

export function hashVerificationToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

export function escapeHtml(value: string) {
  return value.replace(/[&<>'"]/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "'": "&#39;",
    '"': "&quot;",
  }[character] ?? character));
}

const DEFAULT_APP_ORIGIN = "https://eletrosat-mgcpkmbx.manus.space";
function configuredAppOrigins() {
  const configured = (process.env.PUBLIC_APP_ORIGINS ?? "").split(",").map(value => value.trim()).filter(Boolean);
  const defaults = [DEFAULT_APP_ORIGIN, "https://netvius.org"];
  if (process.env.NODE_ENV !== "production") defaults.push("http://localhost:3000", "http://127.0.0.1:3000");
  return new Set([...defaults, ...configured].map(value => { try { return new URL(value).origin; } catch { return ""; } }).filter(Boolean));
}
export function getAllowedOrigin(origin?: string) {
  if (!origin) return DEFAULT_APP_ORIGIN;
  try { const url = new URL(origin); if (configuredAppOrigins().has(url.origin)) return url.origin; } catch { /* fallback seguro */ }
  return DEFAULT_APP_ORIGIN;
}

async function getAvailableSlug(empresa: string) {
  const base = empresa
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72) || "empresa";

  for (let suffix = 0; suffix < 100; suffix += 1) {
    const candidate = suffix === 0 ? base : `${base}-${suffix + 1}`;
    if (!(await getTenantBySlug(candidate))) return candidate;
  }

  return `${base}-${randomBytes(4).toString("hex")}`;
}

export function buildVerificationEmail(nome: string, verificationUrl: string) {
  const safeName = escapeHtml(nome);
  const safeUrl = escapeHtml(verificationUrl);
  return `<!doctype html>
<html lang="pt-BR">
  <body style="margin:0;padding:0;background:#f4f7f6;font-family:Arial,sans-serif;color:#102a2c;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:32px 16px;background:#f4f7f6;">
      <tr><td align="center">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:20px;overflow:hidden;border:1px solid #dce9e5;">
          <tr><td style="padding:28px 32px;background:#073b34;color:#ffffff;">
            <div style="font-size:24px;font-weight:800;letter-spacing:-.5px;">Netvius</div>
            <div style="margin-top:6px;font-size:13px;color:#9de4ca;">Confirmação de cadastro</div>
          </td></tr>
          <tr><td style="padding:34px 32px;">
            <h1 style="margin:0 0 14px;font-size:24px;line-height:1.25;">Confirme seu email</h1>
            <p style="margin:0 0 18px;font-size:15px;line-height:1.65;color:#48605c;">Olá, ${safeName}. Sua conta de demonstração foi criada. Confirme seu email para liberar o acesso ao painel da sua empresa.</p>
            <a href="${safeUrl}" style="display:inline-block;padding:14px 22px;background:#059669;color:#ffffff;text-decoration:none;border-radius:10px;font-size:15px;font-weight:700;">Confirmar meu email</a>
            <p style="margin:24px 0 0;font-size:12px;line-height:1.55;color:#718681;">Este link expira em 24 horas. Se você não solicitou este cadastro, ignore esta mensagem.</p>
          </td></tr>
        </table>
      </td></tr>
    </table>
  </body>
</html>`;
}

async function sendVerificationEmail(data: {
  adminId: number;
  nome: string;
  email: string;
  origin?: string;
}) {
  const rawToken = randomBytes(32).toString("base64url");
  const expiraEm = new Date(Date.now() + TOKEN_TTL_MS);
  await definirTokenVerificacaoEmail(data.adminId, hashVerificationToken(rawToken), expiraEm);

  const url = new URL("/admin/confirmar-email", getAllowedOrigin(data.origin));
  url.searchParams.set("token", rawToken);

  return sendEmail({
    to: data.email,
    subject: "Confirme seu cadastro no Netvius",
    html: buildVerificationEmail(data.nome, url.toString()),
  });
}

export const cadastroRouter = router({
  criar: publicProcedure
    .input(z.object({
      empresa: z.string().trim().min(2).max(255),
      nome: z.string().trim().min(2).max(255),
      email: z.string().trim().email().max(320),
      senha: z.string().min(8).max(128),
      telefone: z.string().trim().min(10).max(30).optional(),
      origin: z.string().optional(),
    }))
    .mutation(async ({ input }) => {
      const email = input.email.toLowerCase();
      if (await getTenantAdminByEmail(email)) {
        throw new TRPCError({ code: "CONFLICT", message: "Já existe uma conta com este email. Entre no painel ou solicite um novo link de confirmação." });
      }

      const slug = await getAvailableSlug(input.empresa);
      await createTenant({
        nome: input.empresa,
        slug,
        plano: "basico",
        contato: input.nome,
        email,
        telefone: input.telefone,
        observacoes: "Cadastro realizado pelo site",
        diasTrial: 5,
      });

      const tenant = await getTenantBySlug(slug);
      if (!tenant) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar a conta. Tente novamente." });
      }

      await createTenantAdmin({
        tenantId: tenant.id,
        nome: input.nome,
        email,
        senha: input.senha,
        role: "admin",
        ativo: false,
      });
      const admin = await getTenantAdminByEmail(email);
      if (!admin) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Não foi possível criar o acesso. Tente novamente." });
      }

      const emailEnviado = await sendVerificationEmail({
        adminId: admin.id,
        nome: admin.nome,
        email: admin.email,
        origin: input.origin,
      });

      return { success: true, emailEnviado };
    }),

  confirmarEmail: publicProcedure
    .input(z.object({ token: z.string().min(32).max(256) }))
    .mutation(async ({ input }) => {
      const confirmado = await confirmarEmailTenantAdmin(hashVerificationToken(input.token));
      if (!confirmado) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Este link é inválido ou expirou. Solicite um novo email de confirmação." });
      }
      return { success: true };
    }),

  reenviarConfirmacao: publicProcedure
    .input(z.object({ email: z.string().trim().email().max(320), origin: z.string().optional() }))
    .mutation(async ({ input }) => {
      const admin = await getTenantAdminByEmail(input.email.toLowerCase());
      if (admin && !admin.emailVerificadoEm && admin.emailVerificacaoHash) {
        await sendVerificationEmail({
          adminId: admin.id,
          nome: admin.nome,
          email: admin.email,
          origin: input.origin,
        });
      }
      return { success: true };
    }),
});
