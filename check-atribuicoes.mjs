import mysql from "mysql2/promise";
import dotenv from "dotenv";
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [escolas] = await conn.execute(
  "SELECT e.id, e.nome, e.tecnicoId, t.nome as tecnicoNome FROM escolas e LEFT JOIN tecnicos t ON e.tecnicoId = t.id WHERE e.tecnicoId IS NOT NULL LIMIT 10"
);
console.log("Escolas atribuídas:", JSON.stringify(escolas, null, 2));

const [tecnicos] = await conn.execute("SELECT id, nome, email FROM tecnicos LIMIT 5");
console.log("Técnicos:", JSON.stringify(tecnicos, null, 2));

await conn.end();
