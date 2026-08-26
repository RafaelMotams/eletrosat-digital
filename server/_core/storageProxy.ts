import type { Express } from "express";
import { and, eq } from "drizzle-orm";
import { ENV } from "./env";
import { extractTenantSessionCookie } from "./context";
import { extractBearerToken, verifyTenantToken } from "./tenantAuth";
import { getTecnicoSession } from "./tecnicoAuth";
import { getDb } from "../db";
import { escolas, manutencaoFotos, manutencoes, ordensServico, osFotos } from "../../drizzle/schema";

type RequestLike = import("express").Request & { params: Record<string, string> };

export function tenantFromEvidenceKey(key: string): number | null {
  const match = key.match(/^tenants\/(\d+)\/(?:os-fotos|mapa-calor|manutencao)\//);
  return match ? Number(match[1]) : null;
}

export function isPrivateEvidenceKey(key: string): boolean {
  return tenantFromEvidenceKey(key) !== null || key.startsWith("os-fotos/");
}

async function tecnicoPossuiEvidencia(req: RequestLike, key: string, tenantId: number): Promise<boolean> {
  const tecnico = await getTecnicoSession(req);
  if (!tecnico || tecnico.tenantId !== tenantId) return false;
  const db = await getDb();
  if (!db) return false;

  if (key.includes(`/os-fotos/`)) {
    const [foto] = await db.select({ id: osFotos.id }).from(osFotos)
      .innerJoin(ordensServico, eq(osFotos.osId, ordensServico.id))
      .where(and(eq(osFotos.fileKey, key), eq(ordensServico.tenantId, tenantId), eq(ordensServico.tecnicoId, tecnico.tecnicoId)))
      .limit(1);
    return Boolean(foto);
  }

  if (key.includes(`/manutencao/`)) {
    const [foto] = await db.select({ id: manutencaoFotos.id }).from(manutencaoFotos)
      .innerJoin(manutencoes, eq(manutencaoFotos.manutencaoId, manutencoes.id))
      .where(and(eq(manutencaoFotos.fileKey, key), eq(manutencoes.tenantId, tenantId), eq(manutencoes.tecnicoId, tecnico.tecnicoId)))
      .limit(1);
    return Boolean(foto);
  }

  const match = key.match(/\/mapa-calor\/escola-(\d+)-tecnico-(\d+)-/);
  if (!match || Number(match[2]) !== tecnico.tecnicoId) return false;
  const [escola] = await db.select({ id: escolas.id }).from(escolas)
    .where(and(eq(escolas.id, Number(match[1])), eq(escolas.tenantId, tenantId))).limit(1);
  return Boolean(escola);
}

async function podeLerEvidencia(req: RequestLike, key: string): Promise<boolean> {
  const tenantId = tenantFromEvidenceKey(key);
  // Evidências antigas sem tenant não podem receber URL até reconciliação manual.
  if (tenantId === null) return !key.startsWith("os-fotos/");
  const token = extractTenantSessionCookie(req.headers.cookie) ?? extractBearerToken(req.headers.authorization);
  const adminSession = token ? await verifyTenantToken(token) : null;
  if (adminSession && !adminSession.isSuperAdmin && adminSession.tenantId === tenantId) return true;
  return tecnicoPossuiEvidencia(req, key, tenantId);
}

export function registerStorageProxy(app: Express) {
  app.get("/manus-storage/*", async (req: RequestLike, res) => {
    const key = req.params[0];
    if (!key) {
      res.status(400).send("Missing storage key");
      return;
    }

    if (isPrivateEvidenceKey(key) && !(await podeLerEvidencia(req, key))) {
      res.status(403).send("Evidence access denied");
      return;
    }

    if (!ENV.forgeApiUrl || !ENV.forgeApiKey) {
      res.status(500).send("Storage proxy not configured");
      return;
    }

    try {
      const forgeUrl = new URL(
        "v1/storage/presign/get",
        ENV.forgeApiUrl.replace(/\/+$/, "") + "/",
      );
      forgeUrl.searchParams.set("path", key);

      const forgeResp = await fetch(forgeUrl, {
        headers: { Authorization: `Bearer ${ENV.forgeApiKey}` },
      });

      if (!forgeResp.ok) {
        const body = await forgeResp.text().catch(() => "");
        console.error(`[StorageProxy] forge error: ${forgeResp.status} ${body}`);
        res.status(502).send("Storage backend error");
        return;
      }

      const { url } = (await forgeResp.json()) as { url: string };
      if (!url) {
        res.status(502).send("Empty signed URL from backend");
        return;
      }

      res.set("Cache-Control", "no-store");
      res.redirect(307, url);
    } catch (err) {
      console.error("[StorageProxy] failed:", err);
      res.status(502).send("Storage proxy error");
    }
  });
}
