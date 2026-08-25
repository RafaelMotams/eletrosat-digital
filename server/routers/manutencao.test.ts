import { describe, expect, it } from "vitest";
import { calcularRemuneracaoManutencao, manutencaoNoPeriodo, manutencaoRouter } from "./manutencao";

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

describe("filtro de período de manutenção", () => {
  const registro = { createdAt: new Date("2026-07-01T12:00:00.000Z"), dataConclusao: new Date("2026-07-15T12:00:00.000Z") };

  it("usa a data de conclusão quando disponível e respeita os limites inclusivos", () => {
    expect(manutencaoNoPeriodo(registro, new Date("2026-07-15T00:00:00.000Z"), new Date("2026-07-15T23:59:59.999Z"))).toBe(true);
    expect(manutencaoNoPeriodo(registro, new Date("2026-07-16T00:00:00.000Z"))).toBe(false);
  });

  it("usa a data de criação quando a manutenção ainda não foi concluída", () => {
    expect(manutencaoNoPeriodo({ createdAt: new Date("2026-07-01T12:00:00.000Z"), dataConclusao: null }, new Date("2026-07-01T00:00:00.000Z"), new Date("2026-07-01T23:59:59.999Z"))).toBe(true);
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
