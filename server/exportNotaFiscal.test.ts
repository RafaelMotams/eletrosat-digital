import { describe, expect, it } from "vitest";
import { podeExportarFinanceiro } from "./exportNotaFiscal";

describe("exportação financeira", () => {
  it("permite somente o perfil administrativo", () => {
    expect(podeExportarFinanceiro("admin")).toBe(true);
    expect(podeExportarFinanceiro("viewer")).toBe(false);
    expect(podeExportarFinanceiro(undefined)).toBe(false);
  });
});
