/** Provisionamento seguro: DATABASE_URL, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD, SUPERADMIN_NAME. */
import "dotenv/config";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";
const { DATABASE_URL, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD } = process.env;
const email = SUPERADMIN_EMAIL?.trim().toLowerCase();
const name = process.env.SUPERADMIN_NAME?.trim() || "Super Admin";
if (!DATABASE_URL || !email || !SUPERADMIN_PASSWORD || SUPERADMIN_PASSWORD.length < 16) throw new Error("Defina DATABASE_URL, SUPERADMIN_EMAIL e SUPERADMIN_PASSWORD com pelo menos 16 caracteres.");
if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROVISIONING !== "1") throw new Error("Produção exige ALLOW_PROVISIONING=1.");
const url = new URL(DATABASE_URL);
const conn = await mysql.createConnection({ host: url.hostname, port: parseInt(url.port || "3306", 10), user: url.username, password: url.password, database: url.pathname.replace(/^\//, ""), ssl: process.env.DB_SSL === "false" ? undefined : { rejectUnauthorized: true } });
try {
  const hash = await bcrypt.hash(SUPERADMIN_PASSWORD, 12);
  const [rows] = await conn.execute("SELECT id FROM tenant_admins WHERE email = ?", [email]);
  if (rows.length > 0) await conn.execute("UPDATE tenant_admins SET senhaHash = ?, nome = ?, ativo = 1, tenantId = 0, role = 'admin' WHERE email = ?", [hash, name, email]);
  else await conn.execute("INSERT INTO tenant_admins (tenantId, nome, email, senhaHash, role, ativo) VALUES (0, ?, ?, ?, 'admin', 1)", [name, email, hash]);
  console.log(`Superadmin provisionado: ${email}. A senha não é exibida.`);
} finally { await conn.end(); }
