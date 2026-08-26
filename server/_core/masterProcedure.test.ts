import { describe, expect, it } from "vitest";
import { router, masterProcedure } from "./trpc";
import type { TrpcContext } from "./context";

const testRouter = router({
  session: masterProcedure.query(({ ctx }) => ({ adminId: ctx.masterSession.adminId })),
});

function contextFor(tenantSession: TrpcContext["tenantSession"]): TrpcContext {
  return {
    req: { headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
    user: null,
    tenantSession,
  };
}

describe("masterProcedure", () => {
  it("aceita somente sessão Master assinada", async () => {
    const caller = testRouter.createCaller(contextFor({
      adminId: 1, tenantId: 0, role: "admin", isSuperAdmin: true,
    }));
    await expect(caller.session()).resolves.toEqual({ adminId: 1 });
  });

  it("nega uma sessão de tenant no control plane", async () => {
    const caller = testRouter.createCaller(contextFor({
      adminId: 2, tenantId: 1, role: "admin", isSuperAdmin: false,
    }));
    await expect(caller.session()).rejects.toThrow("Acesso Master necessário");
  });
});
