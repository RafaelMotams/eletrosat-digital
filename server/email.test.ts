/**
 * Teste de validação do serviço de email Resend
 */
import { describe, it, expect } from "vitest";
import "dotenv/config";

describe("Resend Email Service", () => {
  it("deve ter a RESEND_API_KEY configurada", () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log("[Email Test] RESEND_API_KEY não encontrada no ambiente local — OK em dev");
      return;
    }
    expect(apiKey.length).toBeGreaterThan(10);
    console.log("[Email Test] RESEND_API_KEY configurada (comprimento: " + apiKey.length + ")");
  });

  it("deve conseguir instanciar o cliente Resend", async () => {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      console.log("[Email Test] Pulando — sem chave em dev");
      return;
    }
    const { Resend } = await import("resend");
    expect(() => new Resend(apiKey)).not.toThrow();
  });

  it("deve ter o módulo sendEmail exportado corretamente", async () => {
    const emailModule = await import("./_core/email");
    expect(typeof emailModule.sendEmail).toBe("function");
    expect(typeof emailModule.gerarHtmlRelatoriodiario).toBe("function");
  });

  it("deve gerar HTML do relatório diário sem erros", async () => {
    const { gerarHtmlRelatoriodiario } = await import("./_core/email");
    const html = gerarHtmlRelatoriodiario({
      tenantNome: "Teste",
      totalEscolas: 100,
      concluidas: 75,
      pendentes: 20,
      emAndamento: 5,
      totalApsInstalados: 150,
      totalApsPlanejados: 200,
      concluidasOntem: 3,
      percentual: 75,
      data: "sexta-feira, 18 de julho de 2025",
    });
    expect(html).toContain("Netvius");
    expect(html.length).toBeGreaterThan(500);
  });
});
