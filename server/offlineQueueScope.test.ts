import { describe, expect, it } from "vitest";
import { pertenceAoEscopoOffline } from "../shared/offlineQueueScope";

describe("escopo da fila offline", () => {
  const scope = { tenantId: 22, tecnicoId: 7 };

  it("aceita somente a pendência do tenant e técnico atuais", () => {
    expect(pertenceAoEscopoOffline({ tenantId: 22, tecnicoId: 7 }, scope)).toBe(true);
  });

  it("nega pendências de outro tenant, mesmo quando o técnico possui o mesmo id", () => {
    expect(pertenceAoEscopoOffline({ tenantId: 23, tecnicoId: 7 }, scope)).toBe(false);
    expect(pertenceAoEscopoOffline({ tecnicoId: 7 }, scope)).toBe(false);
  });
});
