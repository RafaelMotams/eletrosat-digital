import mysql from 'mysql2/promise';
import { writeFileSync } from 'fs';

const ineps = [
  '29018170','29076862','29076900','29077028','29077044','29077249','29077265','29077303','29077354','29077443',
  '29077575','29077745','29077842','29077877','29077958','29112923','29112982','29112990','29113091','29113423',
  '29113784','29117372','29117577','29117771','29117801','29117917','29118026','29118620','29118760','29118808',
  '29118913','29118930','29119340','29119600','29120489','29120500','29120535','29120640','29122554','29122562',
  '29122600','29122678','29122775','29122821','29122830','29123062','29123631','29123739','29124433','29124832',
  '29124840','29124999','29125138','29134790','29134803','29135176','29135214','29135516','29148790','29152941',
  '29153140','29153298','29153336','29153352','29153409','29153468','29153620','29153654','29153662','29153786',
  '29153816','29337429','29363535','29378672','29381657','29393337','29393833','29399343','29401250','29401780',
  '29420075','29420083','29420458','29420652','29422035','29423678','29436958','29438136','29449880','29464838',
  '29476640','29482496','29483506','29606616'
];

const conn = await mysql.createConnection(process.env.DATABASE_URL);
const placeholders = ineps.map(() => '?').join(',');
const [rows] = await conn.execute(`
  SELECT 
    e.inep,
    e.nome AS escola,
    e.municipio,
    COALESCE(e.endereco, '') AS endereco,
    COALESCE(t.nome, 'Sem técnico') AS tecnico,
    COALESCE(os.status, 'sem_os') AS status,
    os.qtdApInstalado AS aps,
    DATE_FORMAT(os.dataConclusao, '%d/%m/%Y') AS data_conclusao
  FROM escolas e
  LEFT JOIN ordens_servico os ON os.escolaId = e.id
  LEFT JOIN tecnicos t ON t.id = os.tecnicoId
  WHERE e.inep IN (${placeholders})
  ORDER BY t.nome ASC, e.municipio ASC, e.nome ASC
`, ineps);
await conn.end();

// Remover duplicatas de INEP
const seen = new Set();
const unique = [];
for (const r of rows) {
  if (!seen.has(r.inep)) {
    seen.add(r.inep);
    unique.push(r);
  }
}

writeFileSync('/tmp/ineps_full.json', JSON.stringify(unique));
console.log(`Exportados ${unique.length} registros únicos`);
