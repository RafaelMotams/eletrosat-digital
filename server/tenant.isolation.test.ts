/**
 * Testes de isolamento multi-tenant
 * Verifica que um tenant não pode acessar dados de outro tenant
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { TRPCError } from "@trpc/server";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { signTecnicoToken, TECNICO_SESSION_COOKIE } from "./_core/tecnicoAuth";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function createTenantContext(tenantId: number): TrpcContext {
  return {
    user: null,
    tenantSession: {
      tenantId,
      adminId: 100 + tenantId,
      email: `admin@tenant${tenantId}.com`,
      role: "admin",
      isSuperAdmin: false,
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createViewerContext(tenantId: number): TrpcContext {
  return {
    ...createTenantContext(tenantId),
    tenantSession: {
      tenantId,
      adminId: 200 + tenantId,
      email: `viewer@tenant${tenantId}.com`,
      role: "viewer",
      isSuperAdmin: false,
    },
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

function createOAuthAndTenantContext(tenantId: number): TrpcContext {
  return {
    ...createOAuthAdminContext(),
    tenantSession: {
      tenantId,
      adminId: 100 + tenantId,
      email: `admin@tenant${tenantId}.com`,
      role: "admin",
      isSuperAdmin: false,
    },
  };
}

function createOAuthUserAndTenantContext(tenantId: number): TrpcContext {
  const context = createOAuthAndTenantContext(tenantId);
  return {
    ...context,
    user: {
      ...context.user!,
      role: "user",
      email: "tecnico@oauth-sobreposto.com",
    },
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

async function createTecnicoContext(tecnicoId: number, tenantId: number): Promise<TrpcContext> {
  const token = await signTecnicoToken({ tecnicoId, tenantId, email: `tecnico${tecnicoId}@tenant${tenantId}.com`, role: "tecnico" });
  return {
    user: null,
    tenantSession: null,
    req: { protocol: "https", headers: { cookie: `${TECNICO_SESSION_COOKIE}=${encodeURIComponent(token)}` } } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
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
    countOsFotosByCategoria: vi.fn(async () => ({})),
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

  it("visualizador não acessa a tabela de valores do técnico", async () => {
    const caller = appRouter.createCaller(createViewerContext(1));
    await expect(caller.tecnicos.getValoresAp({ tecnicoId: 1 })).rejects.toThrow(TRPCError);
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

  it("sessão OAuth coexistente não remove o filtro do tenant administrativo", async () => {
    const caller = appRouter.createCaller(createOAuthUserAndTenantContext(2));
    const result = await caller.ordens.list();
    expect(result).toHaveLength(1);
    expect(result[0]?.tenantId).toBe(2);
  });

  it("tenant 1 não consegue ver OS do tenant 2 por ID", async () => {
    const caller = appRouter.createCaller(createTenantContext(1));
    const result = await caller.ordens.getById({ id: 200 }); // OS do tenant 2
    expect(result).toBeUndefined();
  });

  it("tenant 1 não consegue criar OS usando escola e técnico do tenant 2", async () => {
    const caller = appRouter.createCaller(createTenantContext(1));
    await expect(caller.ordens.criar({ escolaId: 20, tecnicoId: 2 })).rejects.toThrow(TRPCError);
  });

  it("tenant 1 não consegue excluir OS do tenant 2", async () => {
    const caller = appRouter.createCaller(createTenantContext(1));
    await expect(caller.ordens.deletar({ osId: 200 })).rejects.toThrow(TRPCError);
  });

  it("técnico não conclui OS sem a foto de mapa de calor confirmada", async () => {
    const caller = appRouter.createCaller(await createTecnicoContext(1, 1));
    await expect(caller.tecnicoAuth.concluirEscola({
      escolaId: 10,
      tecnicoId: 1,
      qtdApInstalado: 1,
      observacao: "Instalação validada",
    })).rejects.toThrow("Envie a foto do mapa de calor");
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
});

describe("Isolamento Multi-Tenant: sem fallback OAuth", () => {
  it("admin OAuth sem token de revenda não acessa dados de tenant", async () => {
    const caller = appRouter.createCaller(createOAuthAdminContext());
    await expect(caller.tecnicos.list()).rejects.toThrow(TRPCError);
  });
});

describe("Isolamento Multi-Tenant: prioridade do login de revenda", () => {
  it("token do tenant prevalece sobre cookie OAuth já existente", async () => {
    const caller = appRouter.createCaller(createOAuthAndTenantContext(2));
    const result = await caller.tecnicos.list();

    expect(result).toHaveLength(1);
    expect(result[0]?.tenantId).toBe(2);
  });
});

describe("Isolamento Multi-Tenant: sessão do técnico", () => {
  it("nega consulta técnica sem sessão assinada", async () => {
    const caller = appRouter.createCaller(createUnauthenticatedContext());
    await expect(caller.tecnicoAuth.minhasEscolas({ tecnicoId: 1 })).rejects.toThrow(TRPCError);
  });

  it("técnico autenticado consulta apenas as próprias escolas do tenant", async () => {
    const caller = appRouter.createCaller(await createTecnicoContext(1, 1));
    const escolas = await caller.tecnicoAuth.minhasEscolas({ tecnicoId: 1 });
    expect(escolas.every(escola => escola.tenantId === 1)).toBe(true);
  });

  it("técnico autenticado não pode consultar dados de outro técnico", async () => {
    const caller = appRouter.createCaller(await createTecnicoContext(1, 1));
    await expect(caller.tecnicoAuth.minhasOrdens({ tecnicoId: 2 })).rejects.toThrow(TRPCError);
  });

  it("técnico autenticado não pode ler fotos de OS de outro tenant", async () => {
    const caller = appRouter.createCaller(await createTecnicoContext(1, 1));
    await expect(caller.tecnicoAuth.getOsFotos({ osId: 200 })).rejects.toThrow(TRPCError);
  });
});

describe("RBAC: perfil visualizador somente leitura", () => {
  it("bloqueia mutação de técnico mesmo quando chamada diretamente pela API", async () => {
    const caller = appRouter.createCaller(createViewerContext(1));
    await expect(caller.tecnicos.create({
      nome: "Tentativa indevida",
      email: "tentativa@tenant1.com",
      senha: "senha-segura",
    })).rejects.toThrow(TRPCError);
  });
});
