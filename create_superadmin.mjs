import { createConnection } from "mysql2/promise";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";
import { readFileSync } from "fs";

// Carregar .env
try {
  const env = readFileSync("/home/ubuntu/eletrosat-digital/.env", "utf8");
  env.split("\n").forEach(line => {
    const [key, ...vals] = line.split("=");
    if (key && vals.length) process.env[key.trim()] = vals.join("=").trim();
  });
} catch {}

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL não encontrado");
  process.exit(1);
}

const conn = await createConnection(DATABASE_URL);

// Verificar se já existe superadmin
const [existing] = await conn.execute(
  "SELECT id FROM tenant_admins WHERE tenantId = 0 LIMIT 1"
);

if (existing.length > 0) {
  console.log("Superadmin já existe! ID:", existing[0].id);
  await conn.end();
  process.exit(0);
}

// Criar superadmin
const senhaHash = await bcrypt.hash("netvionis@2025", 10);
await conn.execute(
  `INSERT INTO tenant_admins (tenantId, nome, email, senhaHash, role, ativo, createdAt, updatedAt) 
   VALUES (0, 'Super Admin', 'admin@netvionis.com', ?, 'admin', 1, NOW(), NOW())`,
  [senhaHash]
);

console.log("✅ Superadmin criado com sucesso!");
console.log("Email: admin@netvionis.com");
console.log("Senha: netvionis@2025");
console.log("URL: /superadmin/login");

await conn.end();
