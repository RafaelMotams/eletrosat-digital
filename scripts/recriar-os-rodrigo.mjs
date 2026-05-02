import mysql from 'mysql2/promise';
import { readFileSync } from 'fs';
import { config } from 'dotenv';

config();

const conn = await mysql.createConnection(process.env.DATABASE_URL);

// 1. Buscar escolas concluídas do Rodrigo Mota
const [escolasConcluidas] = await conn.execute(
  "SELECT id, nome FROM escolas WHERE tecnicoId = 150001 AND status = 'concluido'"
);

console.log(`Escolas concluídas a recriar OS: ${escolasConcluidas.length}`);

// 2. Buscar fotos existentes por escola
const [fotos] = await conn.execute(
  "SELECT id, escolaId, categoria, url, fileKey FROM os_fotos WHERE tecnicoId = 150001"
);

const fotosPorEscola = {};
for (const f of fotos) {
  if (!fotosPorEscola[f.escolaId]) fotosPorEscola[f.escolaId] = [];
  fotosPorEscola[f.escolaId].push(f);
}

// 3. Recriar OS concluídas e associar fotos
for (const escola of escolasConcluidas) {
  const escolaId = escola.id;
  
  // Criar OS concluída para essa escola
  const [result] = await conn.execute(
    `INSERT INTO ordens_servico (escolaId, tecnicoId, status, tenantId, createdAt, updatedAt)
     VALUES (?, 150001, 'concluida', 1, NOW(), NOW())`,
    [escolaId]
  );
  const novoOsId = result.insertId;
  
  // Associar fotos existentes a essa OS
  const fotosEscola = fotosPorEscola[escolaId] || [];
  if (fotosEscola.length > 0) {
    for (const foto of fotosEscola) {
      await conn.execute(
        'UPDATE os_fotos SET osId = ? WHERE id = ?',
        [novoOsId, foto.id]
      );
    }
  }
  
  console.log(`✓ OS #${novoOsId} criada para ${escola.nome} (${fotosEscola.length} fotos associadas)`);
}

// 4. Verificar escolas pendentes (não precisa fazer nada, já estão prontas)
const [escolasPendentes] = await conn.execute(
  "SELECT id, nome FROM escolas WHERE tecnicoId = 150001 AND status = 'pendente'"
);
console.log(`\nEscolas pendentes (prontas para o técnico): ${escolasPendentes.length}`);
escolasPendentes.forEach(e => console.log(` - ${e.nome}`));

await conn.end();
console.log('\nConcluído!');
