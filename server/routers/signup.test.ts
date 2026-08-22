import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getTenantAdminByEmail: vi.fn(),
  getTenantBySlug: vi.fn(),
  getRegistrationRequestByEmail: vi.fn(),
  getRegistrationRequestByTokenHash: vi.fn(),
  createRegistrationRequest: vi.fn(),
  refreshRegistrationRequest: vi.fn(),
  expireRegistrationRequest: vi.fn(),
  confirmRegistrationRequest: vi.fn(),
  sendEmail: vi.fn(),
}));

vi.mock("../db-tenant", () => ({
  getTenantAdminByEmail: mocks.getTenantAdminByEmail,
  getTenantBySlug: mocks.getTenantBySlug,
  getRegistrationRequestByEmail: mocks.getRegistrationRequestByEmail,
  getRegistrationRequestByTokenHash: mocks.getRegistrationRequestByTokenHash,
  createRegistrationRequest: mocks.createRegistrationRequest,
  refreshRegistrationRequest: mocks.refreshRegistrationRequest,
  expireRegistrationRequest: mocks.expireRegistrationRequest,
  confirmRegistrationRequest: mocks.confirmRegistrationRequest,
}));

vi.mock("../_core/email", () => ({ sendEmail: mocks.sendEmail }));

import { signupRouter } from "./signup";

describe("Cadastro com confirmação de email", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.getTenantAdminByEmail.mockResolvedValue(null);
    mocks.getTenantBySlug.mockResolvedValue(null);
    mocks.getRegistrationRequestByEmail.mockResolvedValue(null);
    mocks.sendEmail.mockResolvedValue(true);
  });

  it("guarda somente hash de senha e token antes de enviar a confirmação", async () => {
    const caller = signupRouter.createCaller({} as any);
    await expect(caller.solicitar({
      nome: "Ana Silva",
      empresaNome: "Empresa da Ana",
      slug: "empresa-da-ana",
      email: "ANA@EXAMPLE.COM",
      senha: "senha-forte-123",
    })).resolves.toEqual({ accepted: true });

    const payload = mocks.createRegistrationRequest.mock.calls[0][0];
    expect(payload.email).toBe("ana@example.com");
    expect(payload.senhaHash).not.toBe("senha-forte-123");
    expect(payload.senhaHash).toMatch(/^\$2[aby]\$/);
    expect(payload.tokenHash).toMatch(/^[a-f0-9]{64}$/);
    expect(mocks.sendEmail).toHaveBeenCalledOnce();
  });

  it("expira links vencidos sem criar tenant", async () => {
    const caller = signupRouter.createCaller({} as any);
    mocks.getRegistrationRequestByTokenHash.mockResolvedValue({ id: 44, status: "pendente", expiresAt: new Date(Date.now() - 1) });

    await expect(caller.confirmar({ token: "a".repeat(64) })).rejects.toThrow("expirou");
    expect(mocks.expireRegistrationRequest).toHaveBeenCalledWith(44);
    expect(mocks.confirmRegistrationRequest).not.toHaveBeenCalled();
  });

  it("confirma apenas uma solicitação pendente e ainda válida", async () => {
    const caller = signupRouter.createCaller({} as any);
    mocks.getRegistrationRequestByTokenHash.mockResolvedValue({ id: 45, status: "pendente", expiresAt: new Date(Date.now() + 60_000) });
    mocks.confirmRegistrationRequest.mockResolvedValue({ nome: "Empresa da Ana" });

    await expect(caller.confirmar({ token: "b".repeat(64) })).resolves.toEqual({ success: true, tenantName: "Empresa da Ana" });
    expect(mocks.confirmRegistrationRequest).toHaveBeenCalledWith(45);
  });
});
