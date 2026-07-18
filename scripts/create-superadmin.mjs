/**
 * Script para criar/atualizar o superadmin do sistema.
 * Executa: node scripts/create-superadmin.mjs
 */
import "dotenv/config";
import bcrypt from "bcryptjs";
import mysql from "mysql2/promise";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("❌ DATABASE_URL não encontrada no ambiente.");
  process.exit(1);
}

// Credenciais do superadmin
const SUPERADMIN_EMAIL = "rafaelmotams0907@gmail.com";
const SUPERADMIN_SENHA = "sat2020ms";
const SUPERADMIN_NOME  = "Rafael Mota";

async function main() {
  // Parsear a URL de conexão
  const url = new URL(DATABASE_URL);
  const conn = await mysql.createConnection({
    host:     url.hostname,
    port:     parseInt(url.port || "3306"),
    user:     url.username,
    password: url.password,
    database: url.pathname.replace("/", ""),
    ssl: { rejectUnauthorized: false },
  });

  console.log("🔌 Conectado ao banco de dados.");

  // Gerar hash da senha
  const senhaHash = await bcrypt.hash(SUPERADMIN_SENHA, 12);

  // Verificar se já existe
  const [rows] = await conn.execute(
    "SELECT id, email FROM tenant_admins WHERE email = ?",
    [SUPERADMIN_EMAIL]
  );

  if (rows.length > 0) {
    // Atualizar senha e garantir que está ativo
    await conn.execute(
      "UPDATE tenant_admins SET senhaHash = ?, nome = ?, ativo = 1, tenantId = 0, role = 'admin' WHERE email = ?",
      [senhaHash, SUPERADMIN_NOME, SUPERADMIN_EMAIL]
    );
    console.log(`✅ Superadmin atualizado: ${SUPERADMIN_EMAIL}`);
  } else {
    // Inserir novo superadmin (tenantId=0 = superadmin)
    await conn.execute(
      "INSERT INTO tenant_admins (tenantId, nome, email, senhaHash, role, ativo) VALUES (0, ?, ?, ?, 'admin', 1)",
      [SUPERADMIN_NOME, SUPERADMIN_EMAIL, senhaHash]
    );
    console.log(`✅ Superadmin criado: ${SUPERADMIN_EMAIL}`);
  }

  console.log("🔐 Login disponível em: /admin/login ou /superadmin/login");
  console.log(`   Email: ${SUPERADMIN_EMAIL}`);
  console.log(`   Senha: ${SUPERADMIN_SENHA}`);

  await conn.end();
}

main().catch(err => {
  console.error("❌ Erro:", err.message);
  process.exit(1);
});
