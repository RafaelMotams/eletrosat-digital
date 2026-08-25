/**
 * Endpoint legado preservado somente para encerrar execuções antigas sem retry.
 * Relatórios por e-mail exigem agenda, destinatários e contexto de tenant
 * configurados no servidor antes de voltarem a ser ativados.
 */
import type { Request, Response } from "express";

export async function relatoriodiarioHandler(_req: Request, res: Response) {
  return res.status(410).json({
    error: "LEGACY_SCHEDULE_DISABLED",
    message: "O relatório diário legado está desativado até existir uma configuração por tenant autorizada.",
  });
}
