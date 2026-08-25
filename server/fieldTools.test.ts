import { describe, expect, it } from "vitest";
import { calcularCidr, calcularPoe } from "../shared/fieldTools";

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
});
