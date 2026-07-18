import "dotenv/config";
import mysql from "mysql2/promise";

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// Ver colunas da tabela escolas
const [cols] = await conn.execute("DESCRIBE escolas");
console.log("Colunas da tabela escolas:");
console.table(cols);

// Total de escolas
const [total] = await conn.execute("SELECT COUNT(*) as total, SUM(CASE WHEN status = 'concluida' THEN 1 ELSE 0 END) as concluidas FROM escolas");
console.log("\nTotal de escolas:");
console.table(total);

const [tenants] = await conn.execute("SELECT id, nome, slug, status FROM tenants ORDER BY id LIMIT 20");
console.log("\nTenants:");
console.table(tenants);

const [admins] = await conn.execute("SELECT id, tenant_id, nome, email, role FROM tenant_admins ORDER BY id LIMIT 20");
console.log("\nAdmins:");
console.table(admins);

await conn.end();
