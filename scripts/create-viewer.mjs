/** Provisionamento seguro: DATABASE_URL, VIEWER_EMAIL, VIEWER_PASSWORD, VIEWER_NAME, VIEWER_TENANT_ID. */
import "dotenv/config";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";
const { DATABASE_URL, VIEWER_EMAIL, VIEWER_PASSWORD } = process.env;
const email = VIEWER_EMAIL?.trim().toLowerCase();
const name = process.env.VIEWER_NAME?.trim() || "Visualizador";
const tenantId = Number(process.env.VIEWER_TENANT_ID);
if (!DATABASE_URL || !email || !VIEWER_PASSWORD || VIEWER_PASSWORD.length < 16 || !Number.isInteger(tenantId) || tenantId <= 0) throw new Error("Defina DATABASE_URL, VIEWER_EMAIL, VIEWER_PASSWORD (mínimo 16), VIEWER_NAME e VIEWER_TENANT_ID.");
if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROVISIONING !== "1") throw new Error("Produção exige ALLOW_PROVISIONING=1.");
const conn = await mysql.createConnection(DATABASE_URL);
try {
  const hash = await bcrypt.hash(VIEWER_PASSWORD, 12);
  const [rows] = await conn.execute("SELECT id FROM tenant_admins WHERE email = ?", [email]);
  if (rows.length > 0) await conn.execute("UPDATE tenant_admins SET senhaHash = ?, nome = ?, role = 'viewer', ativo = 1, tenantId = ? WHERE email = ?", [hash, name, tenantId, email]);
  else await conn.execute("INSERT INTO tenant_admins (tenantId, nome, email, senhaHash, role, ativo) VALUES (?, ?, ?, ?, 'viewer', 1)", [tenantId, name, email, hash]);
  console.log(`Viewer provisionado para tenant ${tenantId}: ${email}. A senha não é exibida.`);
} finally { await conn.end(); }
