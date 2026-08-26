import { describe, expect, it } from "vitest";
import { calcularCidr, calcularPerdaOptica, calcularPoe, dbmParaMilliwatts, estimarAutonomiaNobreak, milliwattsParaDbm, PADROES_T568 } from "../shared/fieldTools";

describe("ferramentas de campo", () => {
  it("calcula uma rede IPv4/CIDR sem depender de rede", () => {
    expect(calcularCidr("192.168.10.21/24")).toMatchObject({
      netmask: "255.255.255.0",
      network: "192.168.10.0",
      broadcast: "192.168.10.255",
      firstHost: "192.168.10.1",
      lastHost: "192.168.10.254",
      usableHosts: 254,
    });
  });

  it("rejeita IPs e prefixos inválidos", () => {
    expect(calcularCidr("192.168.1.999/24")).toBeNull();
    expect(calcularCidr("192.168.1.1/33")).toBeNull();
  });

  it("identifica orçamento PoE excedido", () => {
    expect(calcularPoe(120, 132)).toMatchObject({ restante: -12, excedido: true });
  });

  it("converte potência óptica entre dBm e mW e calcula perda", () => {
    expect(dbmParaMilliwatts(0)).toBeCloseTo(1);
    expect(milliwattsParaDbm(1)).toBeCloseTo(0);
    expect(calcularPerdaOptica(-3, -18)).toBe(15);
  });

  it("estima autonomia de nobreak e preserva os padrões T568", () => {
    const autonomia = estimarAutonomiaNobreak(48, 7);
    expect(autonomia?.energiaUtilWh).toBeCloseTo(67.2);
    expect(autonomia?.minutos).toBeCloseTo(84);
    expect(PADROES_T568.A[0]).toBe("Branco/Verde");
    expect(PADROES_T568.B[0]).toBe("Branco/Laranja");
  });
});
