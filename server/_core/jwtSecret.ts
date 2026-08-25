import { createHash, randomBytes } from "crypto";

export function resolveJwtSecret(environment: NodeJS.ProcessEnv = process.env, nodeEnv = environment.NODE_ENV): string {
  const configured = environment.NETVIUS_JWT_SECRET?.trim() || environment.JWT_SECRET?.trim();
  if (configured) {
    if (nodeEnv === "production" && configured.length < 32) {
      // Compatibilidade de recuperação: nunca usa uma chave-padrão e não impede o
      // servidor de iniciar. Deriva uma chave de 256 bits do segredo provisionado.
      // O segredo deve ser rotacionado posteriormente para um valor aleatório >= 32.
      return createHash("sha256").update(`netvius-jwt:${configured}`).digest("base64url");
    }
    return configured;
  }

  if (nodeEnv === "production") {
    throw new Error("NETVIUS_JWT_SECRET ou JWT_SECRET é obrigatório em produção. O servidor não pode iniciar sem ele.");
  }

  // Desenvolvimento e testes: segredo aleatório apenas em memória, nunca previsível ou persistido.
  return randomBytes(48).toString("base64url");
}

export const jwtSecret = resolveJwtSecret();
export const jwtSecretKey = new TextEncoder().encode(jwtSecret);
