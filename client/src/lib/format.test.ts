import { describe, it, expect } from "vitest";
import { formatWhatsApp } from "./format";

describe("formatWhatsApp", () => {
  it("retorna null para valores vazios ou curtos demais", () => {
    expect(formatWhatsApp(null)).toBeNull();
    expect(formatWhatsApp(undefined)).toBeNull();
    expect(formatWhatsApp("")).toBeNull();
    expect(formatWhatsApp("123")).toBeNull();
  });

  it("adiciona o código do Brasil quando há DDD (10 ou 11 dígitos)", () => {
    expect(formatWhatsApp("(75) 99999-8888")).toBe("5575999998888");
    expect(formatWhatsApp("75 3333-4444")).toBe("557533334444");
  });

  it("mantém o número quando já começa com 55 e tem tamanho de país", () => {
    expect(formatWhatsApp("55 75 99999-8888")).toBe("5575999998888");
  });

  it("retorna apenas os dígitos quando não há DDD", () => {
    expect(formatWhatsApp("99999-8888")).toBe("999998888");
  });
});
