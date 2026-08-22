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

  it("bloqueia a análise visual quando não existe sessão técnica", async () => {
    const caller = manutencaoRouter.createCaller(makeContext());
    await expect(caller.assistenteTecnicoVisual({
      pergunta: "Analise a foto do rack",
      perfil: "aprender_conectado",
      imageBase64: Buffer.alloc(128).toString("base64"),
      mimeType: "image/jpeg",
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("envia a foto somente na solicitação visual do técnico autenticado", async () => {
    invokeLLM.mockResolvedValue({ choices: [{ message: { content: "O patch panel parece organizado; confirme a identificação das portas." } }] });
    const caller = manutencaoRouter.createCaller(makeContext({ tecnicoId: 7, tenantId: 180002 }));
    const imageBase64 = Buffer.alloc(128).toString("base64");

    await expect(caller.assistenteTecnicoVisual({
      pergunta: "Analise a foto do rack",
      perfil: "infraestrutura_fisica",
      imageBase64,
      mimeType: "image/jpeg",
    })).resolves.toEqual({ resposta: "O patch panel parece organizado; confirme a identificação das portas." });

    expect(invokeLLM).toHaveBeenCalledTimes(1);
    const call = invokeLLM.mock.calls[0][0];
    expect(call.messages[1].content).toEqual(expect.arrayContaining([
      expect.objectContaining({ type: "image_url", image_url: expect.objectContaining({ url: expect.stringContaining("data:image/jpeg;base64,") }) }),
    ]));
  });
});
