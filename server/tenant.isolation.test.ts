/**
 * Testes de isolamento multi-tenant
 * Verifica que um tenant não pode acessar dados de outro tenant
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createTenantContext(tenantId: number, role: "admin" | "viewer" = "admin"): TrpcContext {
  return {
    user: null,
    tenantSession: {
      tenantId,
      adminId: 100 + tenantId,
      email: `admin@tenant${tenantId}.com`,
      role,
      isSuperAdmin: false,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createOAuthAdminContext(): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "oauth-admin",
      email: "admin@sistema.com",
      name: "Admin Sistema",
      loginMethod: "manus",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    tenantSession: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUnauthenticatedContext(): TrpcContext {
  return {
    user: null,
    tenantSession: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ─── Mocks do banco de dados ──────────────────────────────────────────────────

vi.mock("./db", async (importOriginal) => {
  const original = await importOriginal<typeof import("./db")>();
  return {
    ...original,
    listTecnicos: vi.fn(async (tenantId?: number) => {
      const allTecnicos = [
        { id: 1, nome: "Técnico Tenant 1", tenantId: 1, email: "t1@t1.com", senhaHash: "", ativo: true },
        { id: 2, nome: "Técnico Tenant 2", tenantId: 2, email: "t2@t2.com", senhaHash: "", ativo: true },
      ];
      if (tenantId !== undefined) return allTecnicos.filter(t => t.tenantId === tenantId);
      return allTecnicos;
    }),
    getTecnicoById: vi.fn(async (id: number) => {
      const map: Record<number, { id: number; nome: string; tenantId: number; email: string; senhaHash: string; ativo: boolean }> = {
        1: { id: 1, nome: "Técnico Tenant 1", tenantId: 1, email: "t1@t1.com", senhaHash: "", ativo: true },
        2: { id: 2, nome: "Técnico Tenant 2", tenantId: 2, email: "t2@t2.com", senhaHash: "", ativo: true },
      };
      return map[id];
    }),
    listEscolas: vi.fn(async (filters?: { tenantId?: number; tecnicoId?: number }) => {
      const allEscolas = [
        { id: 10, nome: "Escola Tenant 1", tenantId: 1, status: "pendente" },
        { id: 20, nome: "Escola Tenant 2", tenantId: 2, status: "pendente" },
      ];
      if (filters?.tenantId !== undefined) return allEscolas.filter(e => e.tenantId === filters.tenantId);
      if (filters?.tecnicoId !== undefined) return allEscolas.filter(e => e.tenantId === filters.tecnicoId); // simplificado
      return allEscolas;
    }),
    getEscolaById: vi.fn(async (id: number) => {
      const map: Record<number, { id: number; nome: string; tenantId: number; status: string }> = {
        10: { id: 10, nome: "Escola Tenant 1", tenantId: 1, status: "pendente" },
        20: { id: 20, nome: "Escola Tenant 2", tenantId: 2, status: "pendente" },
      };
      return map[id];
    }),
    listOrdensServico: vi.fn(async (filters?: { tenantId?: number; tecnicoId?: number }) => {
      const allOS = [
        { id: 100, escolaId: 10, tecnicoId: 1, tenantId: 1, status: "aberta" },
        { id: 200, escolaId: 20, tecnicoId: 2, tenantId: 2, status: "aberta" },
      ];
      if (filters?.tenantId !== undefined) return allOS.filter(o => o.tenantId === filters.tenantId);
      if (filters?.tecnicoId !== undefined) return allOS.filter(o => o.tecnicoId === filters.tecnicoId);
      return allOS;
    }),
    getOrdemById: vi.fn(async (id: number) => {
      const map: Record<number, { id: number; escolaId: number; tecnicoId: number; tenantId: number; status: string }> = {
        100: { id: 100, escolaId: 10, tecnicoId: 1, tenantId: 1, status: "aberta" },
        200: { id: 200, escolaId: 20, tecnicoId: 2, tenantId: 2, status: "aberta" },
      };
      return map[id];
    }),
    getDashboardStats: vi.fn(async (tenantId?: number) => ({
      totalEscolas: tenantId === 1 ? 1 : tenantId === 2 ? 1 : 2,
      concluidas: 0,
      pendentes: tenantId === 1 ? 1 : tenantId === 2 ? 1 : 2,
      emAndamento: 0,
      totalApsInstalados: 0,
      totalApsPlanejados: 0,
      totalApsConcluidos: 0,
    })),
    listMunicipios: vi.fn(async (tenantId?: number) => {
      if (tenantId === 1) return ["Cidade A"];
      if (tenantId === 2) return ["Cidade B"];
      return ["Cidade A", "Cidade B"];
    }),
    updateTecnico: vi.fn(async () => {}),
    deleteTecnico: vi.fn(async () => {}),
    updateEscola: vi.fn(async () => {}),
    createTecnico: vi.fn(async () => ({ insertId: 99 })),
    createEscola: vi.fn(async () => {}),
    createOrdemServico: vi.fn(async () => ({ insertId: 999 })),
    getTecnicoByEmail: vi.fn(async () => undefined),
    getProdutividadePorTecnico: vi.fn(async () => []),
    getRelatorioTecnico: vi.fn(async () => ({ tecnico: null, escolas: [], totalAps: 0 })),
    getOsDetalhadas: vi.fn(async () => []),
    setAtribuicaoManual: vi.fn(async () => {}),
    atribuirPorCidade: vi.fn(async () => {}),
    deleteEscolasPorCidade: vi.fn(async () => 0),
    getEscolaByInep: vi.fn(async () => undefined),
  };
});

// ─── Testes ───────────────────────────────────────────────────────────────────

describe("Isolamento Multi-Tenant: Técnicos", () => {
  it("viewer pode consultar, mas não pode executar mutações", async () => {
    const caller = appRouter.createCaller(createTenantContext(1, "viewer"));
    await expect(caller.tecnicos.list()).resolves.toBeDefined();
    await expect(caller.tecnicos.update({ id: 1, nome: "Alteração indevida" })).rejects.toThrow(TRPCError);
  });

  it("tenant 1 só vê técnicos do tenant 1", async () => {
    const caller = appRouter.createCaller(createTenantContext(1));
    const result = await caller.tecnicos.list();
    expect(result.every(t => t.tenantId === 1)).toBe(true);
    expect(result.some(t => t.tenantId === 2)).toBe(false);
  });

  it("tenant 2 só vê técnicos do tenant 2", async () => {
    const caller = appRouter.createCaller(createTenantContext(2));
    const result = await caller.tecnicos.list();
    expect(result.every(t => t.tenantId === 2)).toBe(true);
    expect(result.some(t => t.tenantId === 1)).toBe(false);
  });

  it("tenant 1 não consegue ver técnico do tenant 2 por ID", async () => {
    const caller = appRouter.createCaller(createTenantContext(1));
    const result = await caller.tecnicos.getById({ id: 2 }); // técnico do tenant 2
    expect(result).toBeUndefined();
  });

  it("tenant 1 consegue ver seu próprio técnico por ID", async () => {
    const caller = appRouter.createCaller(createTenantContext(1));
    const result = await caller.tecnicos.getById({ id: 1 }); // técnico do tenant 1
    expect(result).toBeDefined();
    expect(result?.tenantId).toBe(1);
  });

  it("tenant 1 não pode atualizar técnico do tenant 2", async () => {
    const caller = appRouter.createCaller(createTenantContext(1));
    await expect(
      caller.tecnicos.update({ id: 2, nome: "Hacker" })
    ).rejects.toThrow(TRPCError);
  });

  it("tenant 1 não pode deletar técnico do tenant 2", async () => {
    const caller = appRouter.createCaller(createTenantContext(1));
    await expect(
      caller.tecnicos.delete({ id: 2 })
    ).rejects.toThrow(TRPCError);
  });
});

describe("Isolamento Multi-Tenant: Escolas", () => {
  it("tenant 1 só vê escolas do tenant 1", async () => {
    const caller = appRouter.createCaller(createTenantContext(1));
    const result = await caller.escolas.list();
    expect(result.every(e => e.tenantId === 1)).toBe(true);
    expect(result.some(e => e.tenantId === 2)).toBe(false);
  });

  it("tenant 2 só vê escolas do tenant 2", async () => {
    const caller = appRouter.createCaller(createTenantContext(2));
    const result = await caller.escolas.list();
    expect(result.every(e => e.tenantId === 2)).toBe(true);
    expect(result.some(e => e.tenantId === 1)).toBe(false);
  });

  it("tenant 1 não consegue ver escola do tenant 2 por ID", async () => {
    const caller = appRouter.createCaller(createTenantContext(1));
    const result = await caller.escolas.getById({ id: 20 }); // escola do tenant 2
    expect(result).toBeUndefined();
  });

  it("tenant 1 não pode atualizar escola do tenant 2", async () => {
    const caller = appRouter.createCaller(createTenantContext(1));
    await expect(
      caller.escolas.update({ id: 20, nome: "Hacker" })
    ).rejects.toThrow(TRPCError);
  });
});

describe("Isolamento Multi-Tenant: Ordens de Serviço", () => {
  it("tenant 1 só vê OS do tenant 1", async () => {
    const caller = appRouter.createCaller(createTenantContext(1));
    const result = await caller.ordens.list();
    expect(result.every(o => o.tenantId === 1)).toBe(true);
    expect(result.some(o => o.tenantId === 2)).toBe(false);
  });

  it("tenant 2 só vê OS do tenant 2", async () => {
    const caller = appRouter.createCaller(createTenantContext(2));
    const result = await caller.ordens.list();
    expect(result.every(o => o.tenantId === 2)).toBe(true);
    expect(result.some(o => o.tenantId === 1)).toBe(false);
  });

  it("tenant 1 não consegue ver OS do tenant 2 por ID", async () => {
    const caller = appRouter.createCaller(createTenantContext(1));
    const result = await caller.ordens.getById({ id: 200 }); // OS do tenant 2
    expect(result).toBeUndefined();
  });
});

describe("Isolamento Multi-Tenant: Dashboard", () => {
  it("dashboard do tenant 1 mostra apenas dados do tenant 1", async () => {
    const caller = appRouter.createCaller(createTenantContext(1));
    const stats = await caller.dashboard.stats();
    expect(stats?.totalEscolas).toBe(1); // apenas 1 escola do tenant 1
  });

  it("dashboard do tenant 2 mostra apenas dados do tenant 2", async () => {
    const caller = appRouter.createCaller(createTenantContext(2));
    const stats = await caller.dashboard.stats();
    expect(stats?.totalEscolas).toBe(1); // apenas 1 escola do tenant 2
  });
});

describe("Isolamento Multi-Tenant: Acesso não autenticado", () => {
  it("acesso sem autenticação é negado para listagem de técnicos", async () => {
    const caller = appRouter.createCaller(createUnauthenticatedContext());
    await expect(caller.tecnicos.list()).rejects.toThrow(TRPCError);
  });

  it("acesso sem autenticação é negado para listagem de escolas", async () => {
    const caller = appRouter.createCaller(createUnauthenticatedContext());
    await expect(caller.escolas.list()).rejects.toThrow(TRPCError);
  });

  it("acesso sem autenticação é negado para dashboard", async () => {
    const caller = appRouter.createCaller(createUnauthenticatedContext());
    await expect(caller.dashboard.stats()).rejects.toThrow(TRPCError);
  });

  it("acesso sem autenticação é negado para listagem de manutenção", async () => {
    const caller = appRouter.createCaller(createUnauthenticatedContext());
    await expect(caller.manutencao.listar()).rejects.toThrow(TRPCError);
  });

  it("acesso sem autenticação é negado para o relatório de manutenção", async () => {
    const caller = appRouter.createCaller(createUnauthenticatedContext());
    await expect(caller.manutencao.relatorio({})).rejects.toThrow(TRPCError);
  });

  it("acesso sem autenticação é negado para excluir histórico de planilha", async () => {
    const caller = appRouter.createCaller(createUnauthenticatedContext());
    await expect(caller.planilhasImportadas.apagar({ id: 1 })).rejects.toThrow(TRPCError);
  });
});

describe("Isolamento Multi-Tenant: Histórico de planilhas", () => {
  it("perfil visualizador não pode excluir histórico de planilha", async () => {
    const caller = appRouter.createCaller(createTenantContext(1, "viewer"));
    await expect(caller.planilhasImportadas.apagar({ id: 1 })).rejects.toThrow(TRPCError);
  });
});

describe("Isolamento Multi-Tenant: OAuth sem tenant implícito", () => {
  it("admin OAuth não recebe acesso a tenant sem sessão administrativa explícita", async () => {
    const caller = appRouter.createCaller(createOAuthAdminContext());
    await expect(caller.tecnicos.list()).rejects.toThrow(TRPCError);
  });
});
