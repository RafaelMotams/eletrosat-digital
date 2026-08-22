import { randomBytes } from "crypto";

function resolveJwtSecret(): string {
  const configured = process.env.JWT_SECRET?.trim();
  if (configured) {
    if (process.env.NODE_ENV === "production" && configured.length < 32) {
      throw new Error("JWT_SECRET inválido: use um segredo de produção com pelo menos 32 caracteres.");
    }
    return configured;
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("JWT_SECRET é obrigatório em produção. O servidor não pode iniciar sem ele.");
  }

  // Desenvolvimento e testes: segredo aleatório apenas em memória, nunca previsível ou persistido.
  return randomBytes(48).toString("base64url");
}

export const jwtSecret = resolveJwtSecret();
export const jwtSecretKey = new TextEncoder().encode(jwtSecret);
