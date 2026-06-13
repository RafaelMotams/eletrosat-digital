import mysql from 'mysql2/promise';
import { writeFileSync } from 'fs';

const conn = await mysql.createConnection(process.env.DATABASE_URL);

const [rows] = await conn.execute(`
  SELECT 
    e.inep,
    e.nome AS escola,
    e.municipio,
    COALESCE(e.endereco, '') AS endereco,
    COALESCE(e.latitude, '') AS latitude,
    COALESCE(e.longitude, '') AS longitude,
    TRIM(COALESCE(t_esc.nome, 'Sem técnico')) AS tecnico
  FROM escolas e
  LEFT JOIN ordens_servico os ON os.escolaId = e.id
  LEFT JOIN tecnicos t_esc ON t_esc.id = e.tecnicoId
  WHERE (os.id IS NULL OR os.status IN ('aberta'))
    AND e.tecnicoId IS NOT NULL
  ORDER BY t_esc.nome ASC, e.municipio ASC, e.nome ASC
`);

await conn.end();

writeFileSync('/tmp/pendentes.json', JSON.stringify(rows));
console.log(`Total pendentes: ${rows.length}`);

// Resumo por técnico
const byTec = {};
for (const r of rows) {
  if (!byTec[r.tecnico]) byTec[r.tecnico] = 0;
  byTec[r.tecnico]++;
}
console.log('\nPor técnico:');
for (const [t, q] of Object.entries(byTec).sort((a,b) => b[1]-a[1])) {
  console.log(`  ${t}: ${q}`);
}
