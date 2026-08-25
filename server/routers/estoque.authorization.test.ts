import { describe, expect, it } from "vitest";
import { estoqueRouter } from "./estoque";

function caller(tenantSession?: { adminId: number; tenantId: number; role: string; isSuperAdmin: boolean }) {
  return estoqueRouter.createCaller({
    tenantSession,
    req: { headers: { cookie: "" } } as never,
    res: {} as never,
  } as never);
}

describe("estoque: autorização por tenant", () => {
  it("nega consulta administrativa sem sessão de tenant", async () => {
    await expect(caller().materiais.list()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("nega criação de material pelo perfil visualizador", async () => {
    await expect(caller({ adminId: 77, tenantId: 7001, role: "viewer", isSuperAdmin: false }).materiais.create({
      codigo: "CAB-01",
      nome: "Cabo de teste",
      unidade: "un",
      estoqueMinimo: 0,
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("nega ajuste de inventário pelo perfil visualizador", async () => {
    await expect(caller({ adminId: 77, tenantId: 7001, role: "viewer", isSuperAdmin: false }).movimentacoes.ajustar({
      materialId: 1,
      quantidadeReal: 3,
      observacao: "Contagem mensal",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("nega devolução de material pelo perfil visualizador", async () => {
    await expect(caller({ adminId: 77, tenantId: 7001, role: "viewer", isSuperAdmin: false }).movimentacoes.devolver({
      materialId: 1,
      tecnicoId: 2,
      quantidade: 1,
      observacao: "Retorno de rota",
    })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("nega consumo técnico sem sessão assinada", async () => {
    await expect(caller().movimentacoes.consumir({
      materialId: 1,
      quantidade: 1,
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
