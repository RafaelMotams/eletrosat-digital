import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

// Verificar usuários
const [users] = await conn.execute('SELECT id, name, email, role FROM users');
console.log('=== USUÁRIOS ===');
console.log(JSON.stringify(users, null, 2));

// Verificar técnicos
const [tecnicos] = await conn.execute('SELECT id, nome, email, ativo FROM tecnicos');
console.log('\n=== TÉCNICOS ===');
console.log(JSON.stringify(tecnicos, null, 2));

// Verificar tabelas existentes
const [tables] = await conn.execute("SHOW TABLES");
console.log('\n=== TABELAS ===');
console.log(tables.map(t => Object.values(t)[0]).join(', '));

await conn.end();
