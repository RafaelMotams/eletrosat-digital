import { beforeEach, describe, expect, it, vi } from "vitest";

const { invokeLLM, getDb } = vi.hoisted(() => ({ invokeLLM: vi.fn(), getDb: vi.fn() }));

vi.mock("./_core/llm", () => ({ invokeLLM }));
vi.mock("./db", () => ({ getDb }));

import { manutencaoRouter } from "./routers/manutencao";

function makeContext(tenantSession?: { adminId: number; tenantId: number; isSuperAdmin: boolean }) {
  return { tenantSession, req: { headers: { cookie: "" } } as never, res: {} as never } as never;
}

describe("manutencao.assistenteIA", () => {
  beforeEach(() => {
    invokeLLM.mockReset();
    const rows = [
      [{ id: 9 }],
      [{ m: { id: 9, quilometragem: "0" }, escola: { nome: "Escola Teste", inep: "123", municipio: "Monte Santo", velocidadeOfertada: "100 Mbps" }, tecnico: { id: 7, nome: "Técnico" } }],
      [],
    ];
    let selectCount = 0;
    getDb.mockResolvedValue({
      select: vi.fn(() => {
        const result = rows[selectCount++] ?? [];
        const query: any = {
          from: () => query,
          leftJoin: () => query,
          where: () => query,
          limit: async () => result,
          then: (resolve: any, reject: any) => Promise.resolve(result).then(resolve, reject),
        };
        return query;
      }),
    });
  });

  it("exige uma sessão autenticada antes de gerar orientação", async () => {
    const caller = manutencaoRouter.createCaller(makeContext());
    await expect(caller.assistenteIA({ manutencaoId: 9, pergunta: "Como validar uma VLAN?" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(invokeLLM).not.toHaveBeenCalled();
  });

  it("responde somente depois de validar a manutenção no tenant autenticado", async () => {
    invokeLLM.mockResolvedValue({ choices: [{ message: { content: "1. Confira a VLAN configurada no switch." } }] });
    const caller = manutencaoRouter.createCaller(makeContext({ adminId: 1, tenantId: 180002, isSuperAdmin: false }));

    await expect(caller.assistenteIA({ manutencaoId: 9, pergunta: "Como validar uma VLAN?" }))
      .resolves.toEqual({ resposta: "1. Confira a VLAN configurada no switch." });
    expect(invokeLLM).toHaveBeenCalledTimes(1);
  });
});
