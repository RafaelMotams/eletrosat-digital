import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock das funções de banco de dados
vi.mock("./db", () => ({
  getDb: vi.fn().mockResolvedValue(null),
  listTecnicos: vi.fn().mockResolvedValue([
    { id: 1, nome: "Rodrigo Silva", email: "rodrigo@test.com", telefone: "75999999999", cidadeResponsavel: "Monte Santo", ativo: true, senhaHash: "", createdAt: new Date(), updatedAt: new Date() }
  ]),
  getTecnicoByEmail: vi.fn().mockResolvedValue({
    id: 1, nome: "Rodrigo Silva", email: "rodrigo@test.com", senhaHash: "$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lh9y", cidadeResponsavel: "Monte Santo", ativo: true, createdAt: new Date(), updatedAt: new Date()
  }),
  getTecnicoById: vi.fn().mockResolvedValue({ id: 1, tenantId: 1, nome: "Rodrigo Silva", email: "rodrigo@test.com" }),
  createTecnico: vi.fn().mockResolvedValue({}),
  updateTecnico: vi.fn().mockResolvedValue({}),
  deleteTecnico: vi.fn().mockResolvedValue({}),
  listEscolas: vi.fn().mockResolvedValue([
    { id: 1, inep: "29118913", nome: "ESCOLA CAMINHO SUAVE", municipio: "Monte Santo", status: "pendente", tecnicoId: null, qtdAp: 1, tipoConexao: "Fibra", latitude: "-10.44810828", longitude: "-39.57060199", updatedAt: new Date(), createdAt: new Date() }
  ]),
  getEscolaById: vi.fn().mockResolvedValue({ id: 1, tenantId: 1, inep: "29118913", nome: "ESCOLA CAMINHO SUAVE", status: "pendente", qtdAp: 1 }),
  getEscolaByInep: vi.fn().mockResolvedValue(null),
  createEscola: vi.fn().mockResolvedValue({}),
  updateEscola: vi.fn().mockResolvedValue({}),
  atribuirTecnicoEscola: vi.fn().mockResolvedValue({}),
  atribuirPorCidade: vi.fn().mockResolvedValue({}),
  setAtribuicaoManual: vi.fn().mockResolvedValue({}),
  listOrdensServico: vi.fn().mockResolvedValue([
    { id: 1, escolaId: 1, tecnicoId: 1, status: "aberta", qtdApInstalado: null, observacao: null, dataAbertura: new Date(), dataConclusao: null, createdAt: new Date(), updatedAt: new Date() }
  ]),
  getOrdemById: vi.fn().mockResolvedValue({ id: 1, tenantId: 1, escolaId: 1, tecnicoId: 1, status: "aberta" }),
  createOrdemServico: vi.fn().mockResolvedValue({}),
  concluirOrdemServico: vi.fn().mockResolvedValue({}),
  getDashboardStats: vi.fn().mockResolvedValue({ totalEscolas: 23, concluidas: 5, pendentes: 18, emAndamento: 0, totalApsInstalados: 15 }),
  getProdutividadePorTecnico: vi.fn().mockResolvedValue([{ tecnicoId: 1, tecnicoNome: "Rodrigo Silva", totalEscolas: 5, totalAps: 15 }]),
  getRelatorioTecnico: vi.fn().mockResolvedValue({ totalEscolas: 5, totalAps: 15, mediaPorDia: 0.5 }),
}));

vi.mock("./_core/notification", () => ({
  notifyOwner: vi.fn().mockResolvedValue(true),
}));

function createAdminCtx(): TrpcContext {
  return {
    user: { id: 1, openId: "admin-1", name: "Admin", email: "admin@test.com", role: "admin", loginMethod: "manus", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    tenantSession: { adminId: 1, tenantId: 1, email: "admin@test.com", role: "admin", isSuperAdmin: false } as TrpcContext["tenantSession"],
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

function createUserCtx(): TrpcContext {
  return {
    user: { id: 2, openId: "user-1", name: "Técnico", email: "rodrigo@test.com", role: "user", loginMethod: "manus", createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date() },
    tenantSession: null,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

describe("Dashboard", () => {
  it("retorna estatísticas corretas para admin", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const stats = await caller.dashboard.stats();
    expect(stats?.totalEscolas).toBe(23);
    expect(stats?.concluidas).toBe(5);
    expect(stats?.pendentes).toBe(18);
  });

  it("retorna produtividade por técnico", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const prod = await caller.dashboard.produtividade();
    expect(prod).toHaveLength(1);
    expect(prod[0].tecnicoNome).toBe("Rodrigo Silva");
  });
});

describe("Técnicos", () => {
  it("lista técnicos para admin", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const list = await caller.tecnicos.list();
    expect(list).toHaveLength(1);
    expect(list[0].nome).toBe("Rodrigo Silva");
  });

  it("bloqueia acesso de usuário comum (sem tenant JWT)", async () => {
    const caller = appRouter.createCaller(createUserCtx());
    // tenantAdminProcedure exige admin OAuth ou JWT de tenant; usuário comum OAuth recebe UNAUTHORIZED
    await expect(caller.tecnicos.list()).rejects.toThrow();
  });
});

describe("Escolas", () => {
  it("admin lista todas as escolas", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const list = await caller.escolas.list({});
    expect(list).toHaveLength(1);
    expect(list[0].inep).toBe("29118913");
  });

  it("importa escolas via planilha", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.escolas.importar({
      escolas: [{ inep: "99999999", nome: "Escola Teste", uf: "BA", municipio: "Monte Santo", tipoConexao: "Fibra" }]
    });
    expect(result.success).toBe(true);
    expect(result.importadas).toBe(1);
  });
});

describe("Ordens de Serviço", () => {
  it("admin lista todas as OS", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const list = await caller.ordens.list({});
    expect(list).toHaveLength(1);
  });

  it("cria OS para uma escola", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const result = await caller.ordens.criar({ escolaId: 1, tecnicoId: 1 });
    expect(result.success).toBe(true);
  });
});

describe("Relatórios", () => {
  it("retorna ranking de técnicos", async () => {
    const caller = appRouter.createCaller(createAdminCtx());
    const ranking = await caller.relatorios.ranking();
    expect(ranking).toHaveLength(1);
    expect(ranking[0].totalAps).toBe(15);
  });
});

describe("Auth do Técnico", () => {
  it("falha login com credenciais inválidas", async () => {
    const caller = appRouter.createCaller({ user: null, tenantSession: null, req: { protocol: "https", headers: {} } as TrpcContext["req"], res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"] });
    await expect(caller.tecnicoAuth.login({ email: "wrong@test.com", senha: "wrongpass" })).rejects.toThrow();
  });
});
