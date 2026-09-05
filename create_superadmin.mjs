import { createConnection } from "mysql2/promise";
import bcrypt from "bcryptjs";
import "dotenv/config";

const DATABASE_URL = process.env.DATABASE_URL;
const email = process.env.SUPERADMIN_EMAIL?.trim().toLowerCase();
const password = process.env.SUPERADMIN_PASSWORD;
const name = process.env.SUPERADMIN_NAME?.trim() || "Super Admin";
if (!DATABASE_URL) throw new Error("DATABASE_URL não encontrado no ambiente");
if (!email || !password || password.length < 16) throw new Error("Defina SUPERADMIN_EMAIL e SUPERADMIN_PASSWORD com pelo menos 16 caracteres.");
if (process.env.NODE_ENV === "production" && process.env.ALLOW_PROVISIONING !== "1") throw new Error("Produção exige ALLOW_PROVISIONING=1.");
const conn = await createConnection(DATABASE_URL);
try {
  const [existing] = await conn.execute("SELECT id FROM tenant_admins WHERE tenantId = 0 LIMIT 1");
  if (existing.length > 0) { console.log("Superadmin já existe; nenhuma senha foi alterada."); process.exit(0); }
  const hash = await bcrypt.hash(password, 12);
  await conn.execute("INSERT INTO tenant_admins (tenantId, nome, email, senhaHash, role, ativo, createdAt, updatedAt) VALUES (0, ?, ?, ?, 'admin', 1, NOW(), NOW())", [name, email, hash]);
  console.log(`Superadmin criado: ${email}. A senha não é exibida.`);
} finally { await conn.end(); }
