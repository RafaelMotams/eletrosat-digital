import { describe, expect, it } from "vitest";
import { calcularRemuneracaoManutencao } from "./manutencao";

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
