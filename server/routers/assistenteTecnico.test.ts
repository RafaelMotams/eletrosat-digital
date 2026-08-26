import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeLLM, getTecnicoSession, recordAuditEvent } = vi.hoisted(() => ({
  invokeLLM: vi.fn(),
  getTecnicoSession: vi.fn(),
  recordAuditEvent: vi.fn(),
}));

vi.mock("../_core/llm", () => ({ invokeLLM }));
vi.mock("../_core/tecnicoAuth", () => ({ getTecnicoSession }));
vi.mock("../audit", () => ({ recordAuditEvent }));

import { assistenteTecnicoRouter } from "./assistenteTecnico";

function context() {
  return { tenantSession: null, req: { headers: { cookie: "" } } as never, res: {} as never } as never;
}

describe("assistenteTecnico.consultar", () => {
  beforeEach(() => {
    invokeLLM.mockReset();
    recordAuditEvent.mockReset();
    getTecnicoSession.mockReset();
  });

  it("nega uma consulta sem sessão técnica assinada", async () => {
    getTecnicoSession.mockResolvedValue(null);
    const caller = assistenteTecnicoRouter.createCaller(context());
    await expect(caller.consultar({ pergunta: "Como validar uma VLAN?" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("responde para a sessão técnica e retorna as fontes versionadas", async () => {
    getTecnicoSession.mockResolvedValue({ tecnicoId: 7, tenantId: 14, email: "tecnico@netvius.org", role: "tecnico" });
    invokeLLM.mockResolvedValue({ choices: [{ message: { content: "1. Verifique a VLAN de gerenciamento." } }] });
    const caller = assistenteTecnicoRouter.createCaller(context());

    const result = await caller.consultar({ pergunta: "Como validar uma VLAN?", assunto: "rede" });

    expect(result.resposta).toContain("VLAN");
    expect(result.fontes.length).toBeGreaterThan(0);
    expect(recordAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 14, actorId: 7, action: "assistente_tecnico.consulta" }));
  });

  it("não processa imagem temporária sem o tipo declarado", async () => {
    getTecnicoSession.mockResolvedValue({ tecnicoId: 7, tenantId: 14, email: "tecnico@netvius.org", role: "tecnico" });
    const caller = assistenteTecnicoRouter.createCaller(context());
    await expect(caller.consultar({ pergunta: "Avalie a imagem", imagemBase64: "aGVsbG8=" })).rejects.toThrow("Informe o tipo junto com a imagem temporária");
    expect(invokeLLM).not.toHaveBeenCalled();
  });
});
