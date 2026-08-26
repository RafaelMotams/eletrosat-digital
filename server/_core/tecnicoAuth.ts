import { SignJWT, jwtVerify } from "jose";
import type { Response } from "express";
import type { Request } from "express";
import { getSessionCookieOptions } from "./cookies";
import { jwtSecretKey } from "./jwtSecret";
import { createTecnicoSession, hasActiveTecnicoSession, revokeTecnicoSession } from "./tecnicoSessions";

const COOKIE_NAME = "netvius_tecnico_session";

export interface TecnicoSession {
  tecnicoId: number;
  tenantId: number;
  email: string;
  role: "tecnico";
  sid?: string;
}

export async function signTecnicoToken(session: TecnicoSession) {
  return new SignJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(jwtSecretKey);
}

export async function verifyTecnicoToken(token: string): Promise<TecnicoSession | null> {
  try {
    const { payload } = await jwtVerify(token, jwtSecretKey);
    if (payload.role !== "tecnico" || typeof payload.tecnicoId !== "number" || typeof payload.tenantId !== "number") return null;
    const session = {
      tecnicoId: payload.tecnicoId,
      tenantId: payload.tenantId,
      email: typeof payload.email === "string" ? payload.email : "",
      role: "tecnico" as const,
      sid: typeof payload.sid === "string" ? payload.sid : undefined,
    };
    // Compatibilidade transitória: tokens emitidos antes desta migração não
    // possuem sid e deixam de funcionar naturalmente na expiração de 12 horas.
    if (session.sid && !(await hasActiveTecnicoSession({ id: session.sid, tecnicoId: session.tecnicoId, tenantId: session.tenantId }))) return null;
    return session;
  } catch {
    return null;
  }
}

function readCookie(req: Request, name: string) {
  const raw = req.headers.cookie ?? "";
  const item = raw.split(";").map(v => v.trim()).find(v => v.startsWith(`${name}=`));
  return item ? decodeURIComponent(item.slice(name.length + 1)) : null;
}

export async function getTecnicoSession(req: Request) {
  const token = readCookie(req, COOKIE_NAME);
  return token ? verifyTecnicoToken(token) : null;
}

export async function setTecnicoSession(res: Response, req: Request, session: TecnicoSession) {
  const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000);
  const sid = await createTecnicoSession({ tecnicoId: session.tecnicoId, tenantId: session.tenantId, expiresAt });
  const token = await signTecnicoToken({ ...session, sid });
  res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: 12 * 60 * 60 * 1000 });
}

export async function clearTecnicoSession(res: Response, req: Request) {
  const active = await getTecnicoSession(req);
  await revokeTecnicoSession(active?.sid);
  res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: -1 });
}

export const TECNICO_SESSION_COOKIE = COOKIE_NAME;
