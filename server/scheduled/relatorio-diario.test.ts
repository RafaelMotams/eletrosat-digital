import { describe, expect, it, vi } from "vitest";
import type { Request, Response } from "express";
import { relatoriodiarioHandler } from "./relatorio-diario";

describe("relatório diário legado", () => {
  it("não executa envio para tenant ou destinatários fixos", async () => {
    const json = vi.fn();
    const status = vi.fn(() => ({ json }));
    await relatoriodiarioHandler({} as Request, { status } as unknown as Response);

    expect(status).toHaveBeenCalledWith(410);
    expect(json).toHaveBeenCalledWith(expect.objectContaining({ error: "LEGACY_SCHEDULE_DISABLED" }));
  });
});
