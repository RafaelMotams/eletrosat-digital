import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const db = drizzle(conn);

const [rows] = await conn.execute('SELECT COUNT(*) as total FROM escolas');
console.log('Total escolas:', rows[0].total);

const [sample] = await conn.execute('SELECT inep, nome, telefone, latitude, longitude, qtdAp, velocidadeOfertada FROM escolas LIMIT 5');
console.log('\nAmostra de escolas:');
sample.forEach(r => console.log(JSON.stringify(r)));

const [withPhone] = await conn.execute('SELECT COUNT(*) as total FROM escolas WHERE telefone IS NOT NULL AND telefone != ""');
console.log('\nEscolas com telefone:', withPhone[0].total);

const [withCoords] = await conn.execute('SELECT COUNT(*) as total FROM escolas WHERE latitude IS NOT NULL AND longitude IS NOT NULL');
console.log('Escolas com coordenadas:', withCoords[0].total);

await conn.end();
