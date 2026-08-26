import { describe, expect, it } from "vitest";
import { ASSISTENTE_TECNICO_BASE, ASSISTENTE_TECNICO_BASE_VERSAO, FONTES_ASSISTENTE_TECNICO } from "./assistenteTecnicoBase";

describe("base do Assistente Técnico", () => {
  it("mantém versão, fontes oficiais e limites de segurança explícitos", () => {
    expect(ASSISTENTE_TECNICO_BASE_VERSAO).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(FONTES_ASSISTENTE_TECNICO).toHaveLength(2);
    expect(ASSISTENTE_TECNICO_BASE).toContain("Nunca invente");
    expect(ASSISTENTE_TECNICO_BASE).toContain("Fontes consultadas");
  });
});
