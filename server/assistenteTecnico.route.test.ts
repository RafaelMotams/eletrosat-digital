import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeLLM } = vi.hoisted(() => ({ invokeLLM: vi.fn() }));

vi.mock("./_core/llm", () => ({ invokeLLM }));

import { manutencaoRouter } from "./routers/manutencao";

function makeContext(tecnicoSession?: { tecnicoId: number; tenantId: number }) {
  return {
    tecnicoSession,
    tenantSession: undefined,
    req: {} as never,
    res: {} as never,
  } as never;
}

describe("manutencao.assistenteTecnico", () => {
  beforeEach(() => {
    invokeLLM.mockReset();
  });

  it("exige uma sessão técnica antes de gerar orientação", async () => {
    const caller = manutencaoRouter.createCaller(makeContext());
    await expect(caller.assistenteTecnico({ pergunta: "Como validar uma VLAN?", perfil: "rede_escolar" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("responde para o técnico autenticado sem exigir uma manutenção específica", async () => {
    invokeLLM.mockResolvedValue({ choices: [{ message: { content: "1. Confira a VLAN configurada no switch." } }] });
    const caller = manutencaoRouter.createCaller(makeContext({ tecnicoId: 7, tenantId: 180002 }));

    await expect(caller.assistenteTecnico({ pergunta: "Como validar uma VLAN?", perfil: "rede_escolar" }))
      .resolves.toEqual({ resposta: "1. Confira a VLAN configurada no switch." });
    expect(invokeLLM).toHaveBeenCalledTimes(1);
  });
});
