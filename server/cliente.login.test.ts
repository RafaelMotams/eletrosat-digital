import { describe, it, expect, beforeAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { SignJWT } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "superadmin-secret";
const secretKey = new TextEncoder().encode(JWT_SECRET);

async function createTenantToken(tenantId: number, adminId: number) {
  return new SignJWT({
    adminId,
    tenantId,
    role: "admin",
    isSuperAdmin: false,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secretKey);
}

function createTenantContext(tenantId: number, adminId: number): TrpcContext {
  return {
    user: null,
    tenantSession: {
      adminId,
      tenantId,
      role: "admin",
      isSuperAdmin: false,
    },
    req: {
      protocol: "https",
      headers: {},
    } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Cliente Dashboard Access", () => {
  it("should allow tenant admin to access dashboard stats", async () => {
    const ctx = createTenantContext(2, 1); // Tenant 2, Admin 1
    const caller = appRouter.createCaller(ctx);

    const stats = await caller.dashboard.stats();

    expect(stats).toBeDefined();
    expect(stats.totalEscolas).toBeGreaterThanOrEqual(0);
    expect(stats.concluidas).toBeGreaterThanOrEqual(0);
    expect(stats.pendentes).toBeGreaterThanOrEqual(0);
  });

  it("should allow tenant admin to access produtividade", async () => {
    const ctx = createTenantContext(2, 1);
    const caller = appRouter.createCaller(ctx);

    const produtividade = await caller.dashboard.produtividade();

    expect(produtividade).toBeDefined();
    expect(Array.isArray(produtividade)).toBe(true);
  });

  it("should allow tenant admin to list escolas", async () => {
    const ctx = createTenantContext(2, 1);
    const caller = appRouter.createCaller(ctx);

    const escolas = await caller.escolas.list();

    expect(escolas).toBeDefined();
    expect(Array.isArray(escolas)).toBe(true);
  });

  it("should allow tenant admin to list tecnicos", async () => {
    const ctx = createTenantContext(2, 1);
    const caller = appRouter.createCaller(ctx);

    const tecnicos = await caller.tecnicos.list();

    expect(tecnicos).toBeDefined();
    expect(Array.isArray(tecnicos)).toBe(true);
  });

  it("should allow tenant admin to list ordens", async () => {
    const ctx = createTenantContext(2, 1);
    const caller = appRouter.createCaller(ctx);

    const ordens = await caller.ordens.list();

    expect(ordens).toBeDefined();
    expect(Array.isArray(ordens)).toBe(true);
  });

  it("should deny access without tenant session", async () => {
    const ctx: TrpcContext = {
      user: null,
      tenantSession: null,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(ctx);

    try {
      await caller.dashboard.stats();
      expect.fail("Should have thrown unauthorized error");
    } catch (err: any) {
      expect(err.code).toBe("UNAUTHORIZED");
    }
  });
});
