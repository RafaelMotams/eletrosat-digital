import { jwtVerify } from "jose";

const JWT_SECRET = process.env.JWT_SECRET || "superadmin-secret";
const secretKey = new TextEncoder().encode(JWT_SECRET);

export interface TenantSession {
  adminId: number;
  tenantId: number;
  role: string;
  isSuperAdmin: boolean;
}

export async function verifyTenantToken(token: string): Promise<TenantSession | null> {
  try {
    const { payload } = await jwtVerify(token, secretKey);
    return payload as unknown as TenantSession;
  } catch {
    return null;
  }
}

export function extractBearerToken(authHeader: string | undefined): string | null {
  if (!authHeader) return null;
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match ? match[1] : null;
}
