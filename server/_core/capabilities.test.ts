import { describe, expect, it } from "vitest";
import { tenantRoleCan } from "./capabilities";

describe("matriz de capacidades do tenant", () => {
  it("permite operações administrativas ao administrador do tenant", () => {
    expect(tenantRoleCan("admin", "operational:mutate")).toBe(true);
    expect(tenantRoleCan("admin", "financial:export")).toBe(true);
  });

  it("mantém o visualizador em leitura operacional sem valores ou mutações", () => {
    expect(tenantRoleCan("viewer", "operational:read")).toBe(true);
    expect(tenantRoleCan("viewer", "operational:mutate")).toBe(false);
    expect(tenantRoleCan("viewer", "financial:read")).toBe(false);
    expect(tenantRoleCan("viewer", "financial:export")).toBe(false);
  });
});
