import { SignJWT, jwtVerify } from "jose";
import type { Response } from "express";
import type { Request } from "express";
import { getSessionCookieOptions } from "./cookies";

const COOKIE_NAME = "netvius_tecnico_session";
const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "netvius-development-secret");

export interface TecnicoSession {
  tecnicoId: number;
  tenantId: number;
  email: string;
  role: "tecnico";
}

export async function signTecnicoToken(session: TecnicoSession) {
  return new SignJWT(session as unknown as Record<string, unknown>)
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(secretKey);
}

export async function verifyTecnicoToken(token: string): Promise<TecnicoSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    if (payload.role !== "tecnico" || typeof payload.tecnicoId !== "number" || typeof payload.tenantId !== "number") return null;
    return {
      tecnicoId: payload.tecnicoId,
      tenantId: payload.tenantId,
      email: typeof payload.email === "string" ? payload.email : "",
      role: "tecnico",
    };
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
  const token = await signTecnicoToken(session);
  res.cookie(COOKIE_NAME, token, { ...getSessionCookieOptions(req), maxAge: 12 * 60 * 60 * 1000 });
}

export function clearTecnicoSession(res: Response, req: Request) {
  res.clearCookie(COOKIE_NAME, { ...getSessionCookieOptions(req), maxAge: -1 });
}

export const TECNICO_SESSION_COOKIE = COOKIE_NAME;
