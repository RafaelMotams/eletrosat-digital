import "dotenv/config";
import mysql from "mysql2/promise";
import bcryptjs from "bcryptjs";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const email = "bitnet@gmail.com";
const senha = "bitneteace";
const nome = "Diretor Executivo";
const tenantId = 1;

// Verificar se já existe
const [existing] = await conn.execute(
  "SELECT id FROM tenant_admins WHERE email = ?",
  [email]
);

if (existing.length > 0) {
  // Atualizar
  const hash = await bcryptjs.hash(senha, 10);
  await conn.execute(
    "UPDATE tenant_admins SET senhaHash = ?, nome = ?, role = 'viewer', ativo = 1 WHERE email = ?",
    [hash, nome, email]
  );
  console.log("✅ Usuário atualizado!");
} else {
  // Criar novo
  const hash = await bcryptjs.hash(senha, 10);
  await conn.execute(
    "INSERT INTO tenant_admins (tenantId, nome, email, senhaHash, role, ativo) VALUES (?, ?, ?, ?, 'viewer', 1)",
    [tenantId, nome, email, hash]
  );
  console.log("✅ Usuário criado!");
}

const [rows] = await conn.execute(
  "SELECT id, tenantId, nome, email, role, ativo FROM tenant_admins WHERE tenantId = 1"
);
console.log("\nAdmins do tenant 1:");
console.table(rows);

console.log(`\n📋 Credenciais do Visualizador:`);
console.log(`URL: https://netvius.org/admin/login`);
console.log(`Email: ${email}`);
console.log(`Senha: ${senha}`);
console.log(`Role: viewer (sem valores financeiros)`);

await conn.end();
