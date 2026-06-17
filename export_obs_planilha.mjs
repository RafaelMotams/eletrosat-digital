import { createConnection } from 'mysql2/promise';
import { writeFileSync } from 'fs';
import dotenv from 'dotenv';
dotenv.config();

const conn = await createConnection(process.env.DATABASE_URL);

const [rows] = await conn.execute(`
  SELECT 
    os.id as os_id,
    e.inep,
    e.nome as escola,
    e.municipio,
    t.nome as tecnico,
    os.qtdApInstalado as qtd_aps,
    os.observacao,
    os.dataConclusao as data_conclusao
  FROM ordens_servico os
  JOIN escolas e ON os.escolaId = e.id
  LEFT JOIN tecnicos t ON os.tecnicoId = t.id
  WHERE os.status = 'concluida'
    AND os.observacao IS NOT NULL
    AND TRIM(os.observacao) != ''
  ORDER BY t.nome, os.dataConclusao
`);

writeFileSync('/tmp/obs_planilha.json', JSON.stringify(rows, null, 2));
console.log(`Exportados: ${rows.length} registros`);
await conn.end();
