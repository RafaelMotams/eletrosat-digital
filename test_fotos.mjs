// Testar se getOsDetalhadas retorna fotoMapaCalorUrl
import { createConnection } from 'mysql2/promise';
import * as dotenv from 'dotenv';
dotenv.config();

const db = await createConnection(process.env.DATABASE_URL);

// Buscar OS concluídas com fotos de mapa de calor
const [rows] = await db.execute(`
  SELECT 
    os.id as osId,
    e.nome as escolaNome,
    f.url as fotoUrl
  FROM ordens_servico os
  LEFT JOIN escolas e ON os.escolaId = e.id
  LEFT JOIN os_fotos f ON f.osId = os.id AND f.categoria = 'mapa_calor'
  WHERE os.status = 'concluida'
  LIMIT 10
`);

console.log('Total de OS com join de foto:', rows.length);
rows.forEach(r => {
  console.log(`  OS ${r.osId} | ${r.escolaNome?.substring(0,30)} | foto: ${r.fotoUrl ? r.fotoUrl.substring(0,60) : 'NULL'}`);
});

await db.end();
process.exit(0);
