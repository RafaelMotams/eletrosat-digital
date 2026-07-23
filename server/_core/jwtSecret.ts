import { randomBytes } from "crypto";

/**
 * Resolve a chave secreta usada para assinar/verificar os JWTs de admin/superadmin.
 *
 * - Em produção, JWT_SECRET é obrigatória e deve ter pelo menos 32 caracteres.
 *   Falhar aqui é intencional: sem um segredo forte qualquer pessoa poderia
 *   forjar um token de superadmin.
 * - Em desenvolvimento, se JWT_SECRET não estiver definida, geramos um segredo
 *   aleatório efêmero (uma vez por processo). Isso evita o antigo fallback fixo
 *   ("superadmin-secret"), que permitia forjar tokens. Os tokens não sobrevivem
 *   a reinícios do servidor em dev, o que é aceitável.
 */
function resolveSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;

  if (secret && secret.length >= 32) {
    return new TextEncoder().encode(secret);
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "JWT_SECRET é obrigatória em produção e deve ter no mínimo 32 caracteres."
    );
  }

  if (secret && secret.length > 0) {
    // Segredo definido porém fraco em dev — usa mesmo assim, mas avisa.
    console.warn(
      "[auth] JWT_SECRET é curta (<32 chars). Use um segredo forte fora de desenvolvimento."
    );
    return new TextEncoder().encode(secret);
  }

  console.warn(
    "[auth] JWT_SECRET não definida — usando segredo efêmero de desenvolvimento. " +
      "Os tokens não sobreviverão a reinícios. Defina JWT_SECRET para persistência."
  );
  return new Uint8Array(randomBytes(48));
}

/** Chave secreta compartilhada por todo o processo para JWTs de admin/superadmin. */
export const secretKey: Uint8Array = resolveSecret();
