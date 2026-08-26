import { describe, expect, it } from "vitest";
import { isPrivateEvidenceKey, tenantFromEvidenceKey } from "./storageProxy";

describe("chaves de evidência privada", () => {
  it("identifica evidências escopadas por tenant", () => {
    expect(tenantFromEvidenceKey("tenants/22/os-fotos/mapa_calor/os-10-a.jpg")).toBe(22);
    expect(tenantFromEvidenceKey("tenants/22/manutencao/8/defeito/a.jpg")).toBe(22);
    expect(tenantFromEvidenceKey("tenants/22/mapa-calor/escola-4-tecnico-2-a.jpg")).toBe(22);
  });

  it("não classifica ativos públicos fora do namespace de evidências", () => {
    expect(isPrivateEvidenceKey("landing/netvius-hero-3d.png")).toBe(false);
    expect(isPrivateEvidenceKey("tenants/22/planilhas/origem.xlsx")).toBe(false);
  });
});
