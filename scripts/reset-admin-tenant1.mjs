import "dotenv/config";
import mysql from "mysql2/promise";
import bcrypt from "bcryptjs";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const novaSenha = "sat2020ms";
const hash = await bcrypt.hash(novaSenha, 10);

// Redefinir senha do admin do tenant 1 (manter email original)
await conn.execute(
  "UPDATE tenant_admins SET senhaHash = ?, nome = ? WHERE tenantId = 1 AND id = 2",
  [hash, "Rafael Mota"]
);

// Verificar
const [rows] = await conn.execute(
  "SELECT id, tenantId, nome, email, role, ativo FROM tenant_admins WHERE tenantId = 1"
);
console.log("Admin do tenant 1 atualizado:");
console.table(rows);

// Verificar tenant
const [tenants] = await conn.execute("SELECT id, nome, slug, status FROM tenants WHERE id = 1");
console.log("\nTenant:");
console.table(tenants);

console.log(`\n✅ Acesso configurado!`);
console.log(`URL: https://netvius.org/admin/login`);
console.log(`Email: rafaelmotams0907@gmail.com`);
console.log(`Senha: ${novaSenha}`);

await conn.end();
