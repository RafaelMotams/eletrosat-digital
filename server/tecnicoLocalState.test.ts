import { describe, expect, it } from "vitest";
import { chaveTecnicoLocal, chavesRotaTecnico, criarEscopoTecnicoLocal } from "../shared/tecnicoLocalState";

describe("isolamento de persistência local do técnico", () => {
  it("gera chaves distintas para tenants diferentes no mesmo aparelho", () => {
    const escopoUm = criarEscopoTecnicoLocal(1, 15)!;
    const escopoDois = criarEscopoTecnicoLocal(2, 15)!;

    expect(chavesRotaTecnico(escopoUm).ultimoMenu).not.toBe(chavesRotaTecnico(escopoDois).ultimoMenu);
    expect(chaveTecnicoLocal(escopoUm, "rota-dia")).toBe("tecnico:1:15:rota-dia");
  });

  it("rejeita escopos incompletos e não reutiliza a rota de outro técnico", () => {
    const tecnicoUm = criarEscopoTecnicoLocal(1, 15)!;
    const tecnicoDois = criarEscopoTecnicoLocal(1, 16)!;

    expect(criarEscopoTecnicoLocal(0, 15)).toBeNull();
    expect(criarEscopoTecnicoLocal(1, 0)).toBeNull();
    expect(chavesRotaTecnico(tecnicoUm).ativa).not.toBe(chavesRotaTecnico(tecnicoDois).ativa);
  });
});
