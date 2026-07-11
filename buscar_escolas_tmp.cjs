
const mysql = require('mysql2/promise');
async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  const [rows] = await conn.execute(
    'SELECT nome, inep, endereco, municipio, velocidadeMinima, velocidadeOfertada, tipoConexao, qtdAp, status FROM escolas ORDER BY municipio, nome'
  );
  console.log(JSON.stringify(rows));
  await conn.end();
}
main().catch(e => { console.error(e.message); process.exit(1); });
