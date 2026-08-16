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

// Criar superadmin — credenciais lidas do ambiente
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;
const SUPERADMIN_SENHA = process.env.SUPERADMIN_SENHA;
const SUPERADMIN_NOME = process.env.SUPERADMIN_NOME || "Super Admin";
if (!SUPERADMIN_EMAIL || !SUPERADMIN_SENHA) {
  console.error("❌ Defina SUPERADMIN_EMAIL e SUPERADMIN_SENHA no ambiente antes de executar.");
  await conn.end();
  process.exit(1);
}
if (SUPERADMIN_SENHA.length < 8) {
  console.error("❌ SUPERADMIN_SENHA deve ter no mínimo 8 caracteres.");
  await conn.end();
  process.exit(1);
}

const senhaHash = await bcrypt.hash(SUPERADMIN_SENHA, 10);
await conn.execute(
  `INSERT INTO tenant_admins (tenantId, nome, email, senhaHash, role, ativo, createdAt, updatedAt) 
   VALUES (0, ?, ?, ?, 'admin', 1, NOW(), NOW())`,
  [SUPERADMIN_NOME, SUPERADMIN_EMAIL, senhaHash]
);

console.log("✅ Superadmin criado com sucesso!");
console.log(`Email: ${SUPERADMIN_EMAIL}`);
console.log("Senha: (definida via SUPERADMIN_SENHA)");
console.log("URL: /superadmin/login");

await conn.end();
