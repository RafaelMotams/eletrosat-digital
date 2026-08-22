import { describe, expect, it } from "vitest";
import { buildTechnicalAssistantSystemPrompt, technicalAssistantProfiles } from "./technicalAssistant";

describe("Assistente Técnico independente", () => {
  it("oferece os seis perfis técnicos disponíveis no aplicativo", () => {
    expect(technicalAssistantProfiles).toEqual([
      "rede_escolar",
      "aprender_conectado",
      "infraestrutura_fisica",
      "configuracao_tp_link",
      "configuracao_intelbras",
      "rede_externa_telbras",
    ]);
  });

  it("mantém as orientações de segurança no contexto de qualquer perfil", () => {
    const prompt = buildTechnicalAssistantSystemPrompt("rede_externa_telbras");
    expect(prompt).toContain("Não invente modelos, senhas, topologias ou medições");
    expect(prompt).toContain("Não recomende desativar firewall");
    expect(prompt).toContain("manual do fabricante");
    expect(prompt).toContain("equipamentos Telbrás");
  });
});
