import { describe, expect, it } from "vitest";
import { calcularRemuneracaoManutencao, manutencaoRouter } from "./manutencao";

describe("remuneração de manutenção", () => {
  it("calcula R$ 200,00 fixos mais R$ 2,50 por quilômetro", () => {
    expect(calcularRemuneracaoManutencao(50)).toEqual({
      quilometragem: 50,
      valorBase: 200,
      valorKm: 125,
      valorTotal: 325,
    });
  });

  it("trata quilometragem ausente ou inválida como zero sem reduzir a base", () => {
    expect(calcularRemuneracaoManutencao(undefined)).toEqual({
      quilometragem: 0,
      valorBase: 200,
      valorKm: 0,
      valorTotal: 200,
    });
    expect(calcularRemuneracaoManutencao("texto").valorTotal).toBe(200);
  });
});

describe("análise de foto de manutenção", () => {
  it("nega a análise sem sessão técnica ou administrativa autenticada", async () => {
    const caller = manutencaoRouter.createCaller({
      req: { headers: { cookie: "" } } as never,
      res: {} as never,
    } as never);
    await expect(caller.analisarFotoIA({
      manutencaoId: 1,
      fotoUrl: "https://example.test/foto.jpg",
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
