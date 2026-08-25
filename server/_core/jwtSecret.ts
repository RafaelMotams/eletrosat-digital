import { randomBytes } from "crypto";

export function resolveJwtSecret(environment: NodeJS.ProcessEnv = process.env, nodeEnv = environment.NODE_ENV): string {
  const configured = environment.NETVIUS_JWT_SECRET?.trim() || environment.JWT_SECRET?.trim();
  if (configured) {
    if (nodeEnv === "production" && configured.length < 32) {
      throw new Error("Segredo JWT inválido: use um segredo de produção com pelo menos 32 caracteres.");
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
