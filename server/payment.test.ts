import { describe, expect, it } from "vitest";
import { calculateMaintenancePayment, summarizePaymentsByTechnician } from "./payment";

describe("pagamento de manutenção", () => {
  it("calcula R$ 200 mais R$ 2,50 por quilômetro", () => {
    expect(calculateMaintenancePayment(50)).toEqual({
      kilometers: 50,
      baseValue: 200,
      valueByKm: 125,
      totalValue: 325,
    });
  });

  it("trata quilometragem ausente como zero", () => {
    expect(calculateMaintenancePayment(null).totalValue).toBe(200);
    expect(calculateMaintenancePayment("invalido").kilometers).toBe(0);
  });

  it("agrupa ordens e valores por técnico sem misturar nomes", () => {
    const result = summarizePaymentsByTechnician([
      { technician: "Rodrigo", kilometers: 10, totalValue: 225 },
      { technician: "Rodrigo", kilometers: 20, totalValue: 250 },
      { technician: "Ricardo", kilometers: 5, totalValue: 212.5 },
    ]);

    expect(result.Rodrigo).toEqual({ technician: "Rodrigo", orders: 2, kilometers: 30, totalValue: 475 });
    expect(result.Ricardo).toEqual({ technician: "Ricardo", orders: 1, kilometers: 5, totalValue: 212.5 });
  });
});
