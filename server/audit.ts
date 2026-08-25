import type { Request } from "express";
import { auditEvents } from "../drizzle/schema";
import { getDb } from "./db";

type AuditInput = {
  tenantId?: number | null;
  actorType: "superadmin" | "admin" | "viewer" | "tecnico" | "sistema";
  actorId?: number | null;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  success?: boolean;
  metadata?: Record<string, unknown>;
  req?: Request;
};

function safeMetadata(metadata?: Record<string, unknown>) {
  if (!metadata) return null;
  const blocked = new Set(["senha", "password", "token", "authorization", "cookie", "imageBase64", "base64"]);
  const sanitized = Object.fromEntries(Object.entries(metadata).filter(([key]) => !blocked.has(key.toLowerCase())));
  return JSON.stringify(sanitized).slice(0, 8_000);
}

export async function recordAuditEvent(input: AuditInput): Promise<void> {
  try {
    const db = await getDb();
    if (!db) return;
    const forwarded = input.req?.headers["x-forwarded-for"];
    const ip = (typeof forwarded === "string" ? forwarded.split(",")[0]?.trim() : input.req?.ip) || null;
    await db.insert(auditEvents).values({
      tenantId: input.tenantId ?? null,
      actorType: input.actorType,
      actorId: input.actorId ?? null,
      action: input.action.slice(0, 100),
      entityType: input.entityType.slice(0, 100),
      entityId: input.entityId === undefined || input.entityId === null ? null : String(input.entityId).slice(0, 100),
      success: input.success ?? true,
      metadata: safeMetadata(input.metadata),
      ip,
      userAgent: input.req?.headers["user-agent"]?.slice(0, 512) ?? null,
    });
  } catch (error) {
    console.error("[audit] Falha ao registrar evento", error instanceof Error ? error.message : String(error));
  }
}
