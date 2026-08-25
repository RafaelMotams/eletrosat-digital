import { describe, expect, it } from "vitest";
import { resolveJwtSecret } from "./jwtSecret";

describe("resolveJwtSecret", () => {
  it("prioriza o segredo próprio do Netvius em produção", () => {
    const netviusSecret = "segredo-netvius-de-producao-com-mais-de-trinta-e-dois-caracteres";
    const result = resolveJwtSecret(
      { JWT_SECRET: "segredo-interno-curto", NETVIUS_JWT_SECRET: netviusSecret },
      "production",
    );

    expect(result).toBe(netviusSecret);
  });

  it("deriva uma chave forte quando a produção recebe segredo curto provisionado", () => {
    const result = resolveJwtSecret({ NETVIUS_JWT_SECRET: "curto" }, "production");
    expect(result).not.toBe("curto");
    expect(result.length).toBeGreaterThanOrEqual(32);
    expect(resolveJwtSecret({ NETVIUS_JWT_SECRET: "curto" }, "production")).toBe(result);
  });
});
