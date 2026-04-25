import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const escolas = [
  { inep: '29118913', uf: 'BA', municipio: 'Monte Santo', nome: 'ESCOLA CAMINHO SUAVE', endereco: 'TOCAS, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: -10.44810828, lng: -39.57060199, telefone: '75327512550', kitWifi: 1, velMinima: 50, velOfertada: 50, solucao: 'Fibra' },
  { inep: '29118930', uf: 'BA', municipio: 'Monte Santo', nome: 'ESC DAVID FERRERA DA SILVA', endereco: 'FAZENDA PAU DARCO, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: -10.419985, lng: -39.54349333, telefone: '759928316930', kitWifi: 1, velMinima: 50, velOfertada: 50, solucao: 'Fibra' },
  { inep: '29119340', uf: 'BA', municipio: 'Monte Santo', nome: 'ESC NOSSA SRA DO DESTERRO', endereco: 'POVOADO DESTERRO DO ALTO ALEGRE, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: -10.50736711, lng: -39.63493083, telefone: '759911189220', kitWifi: 2, velMinima: 50, velOfertada: 50, solucao: 'Fibra' },
  { inep: '29119600', uf: 'BA', municipio: 'Monte Santo', nome: 'ESC SAO JORGE', endereco: 'POVOADO FOVEIRO, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: -10.339935, lng: -39.36054, telefone: '759996826680', kitWifi: 1, velMinima: 50, velOfertada: 50, solucao: 'Fibra' },
  { inep: '29118867', uf: 'BA', municipio: 'Monte Santo', nome: 'ESC ANTONIO BRANCO', endereco: 'FAZENDA CAIXAO, S/N PREDIO. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: -10.40080742, lng: -39.22938675, telefone: '75327512550', kitWifi: 1, velMinima: 100, velOfertada: 100, solucao: 'Fibra' },
  { inep: '29118883', uf: 'BA', municipio: 'Monte Santo', nome: 'ESC BELARMINO CORDEIRO', endereco: 'FAZENDA LAGOA NOVA, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: -10.27407429, lng: -39.37240261, telefone: '759990023950', kitWifi: 2, velMinima: 100, velOfertada: 100, solucao: 'Fibra' },
  { inep: '29119057', uf: 'BA', municipio: 'Monte Santo', nome: 'ESC JOAO SOARES', endereco: 'FAZENDA LAGOA DO MATO, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: -10.32481, lng: -39.330955, telefone: '75327512550', kitWifi: 2, velMinima: 100, velOfertada: 100, solucao: 'Fibra' },
  { inep: '29119170', uf: 'BA', municipio: 'Monte Santo', nome: 'ESC LOURIVAL CUSTODIO', endereco: 'FAZENDA CANA BRAVA, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: -10.58892797, lng: -39.35760076, telefone: '75327512550', kitWifi: 4, velMinima: 100, velOfertada: 100, solucao: 'Fibra' },
  { inep: '29119189', uf: 'BA', municipio: 'Monte Santo', nome: 'ESC LUIZ GONZAGA CARDOSO', endereco: 'FAZENDA BOQUEIRO, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: null, lng: null, telefone: '759913133490', kitWifi: 1, velMinima: 100, velOfertada: 100, solucao: 'Fibra' },
  { inep: '29120500', uf: 'BA', municipio: 'Monte Santo', nome: 'ESCOLA MUNICIPAL JOSE DE SOUZA', endereco: 'FAZENDA LAGOA GRANDE, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: -10.4622383, lng: -39.75264448, telefone: '75327512550', kitWifi: 2, velMinima: 100, velOfertada: 100, solucao: 'Fibra' },
  { inep: '29120535', uf: 'BA', municipio: 'Monte Santo', nome: 'ESCOLA LUIZ JOSE DANTAS', endereco: 'FAZENDA CIPO, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: -10.53473075, lng: -39.283076, telefone: '759910866760', kitWifi: 5, velMinima: 100, velOfertada: 100, solucao: 'Fibra' },
  { inep: '29464838', uf: 'BA', municipio: 'Monte Santo', nome: 'ESCOLA MODELO ISABEL AZEVEDO PINTO', endereco: 'RUA ANTONIO ALVES, SN PREDIO ESCOLAR. ZONA URBANA. 48800-000 Monte Santo - BA.', lat: -10.50658586, lng: -39.57272042, telefone: '759994531520', kitWifi: 6, velMinima: 100, velOfertada: 100, solucao: 'Fibra' },
  { inep: '29476640', uf: 'BA', municipio: 'Monte Santo', nome: 'ESCOLA MUNICIPAL VEREADOR CELSO EVANGELISTA DE SOUZA', endereco: 'FAZENDA OLHO DAGUA, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: -10.5382799, lng: -39.28168997, telefone: '759916241150', kitWifi: 4, velMinima: 100, velOfertada: 100, solucao: 'Fibra' },
  { inep: '29118905', uf: 'BA', municipio: 'Monte Santo', nome: 'ESC BELO MONTE', endereco: 'FAZENDA BELO MONTE, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: -10.24590458, lng: -39.40847826, telefone: '759982471470', kitWifi: 1, velMinima: 150, velOfertada: 150, solucao: 'Fibra' },
  { inep: '29381657', uf: 'BA', municipio: 'Monte Santo', nome: 'ESCOLA SENHOR DO BONFIM', endereco: 'FAZENDA LAGOA DO BONFIM, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: -10.2522809, lng: -39.51370546, telefone: '75327512550', kitWifi: 6, velMinima: 150, velOfertada: 150, solucao: 'Fibra' },
  { inep: '29119049', uf: 'BA', municipio: 'Monte Santo', nome: 'ESC JOAO LOPES', endereco: 'FAZENDA LAGOA DO BARRO, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: -10.21368678, lng: -39.41208302, telefone: '759981459010', kitWifi: 6, velMinima: 200, velOfertada: 200, solucao: 'Fibra' },
  { inep: '29120489', uf: 'BA', municipio: 'Monte Santo', nome: 'ESCOLA EDUCANDARIO HORIZONTE NOVO', endereco: 'FAZENDA HORIZONTE NOVO, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: -10.34434883, lng: -39.71025515, telefone: '759928953650', kitWifi: 7, velMinima: 200, velOfertada: 200, solucao: 'Fibra' },
  { inep: '29120543', uf: 'BA', municipio: 'Monte Santo', nome: 'ESCOLA MIRINS COM ALEGRIA', endereco: 'FAZENDA MIRINS, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: null, lng: null, telefone: '759970951060', kitWifi: 3, velMinima: 200, velOfertada: 200, solucao: 'Fibra' },
  { inep: '29120640', uf: 'BA', municipio: 'Monte Santo', nome: 'ESCOLA SAO JOAO DOS CAMPOS', endereco: 'FAZENDA SAO JOAO DOS CAMPOS, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: null, lng: null, telefone: '759987903270', kitWifi: 7, velMinima: 200, velOfertada: 200, solucao: 'Fibra' },
  { inep: '29393469', uf: 'BA', municipio: 'Monte Santo', nome: 'ESC MUNICIPAL JOSE ANDRADE', endereco: 'FAZENDA LAGOA DO BARRO, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: -10.36352833, lng: -39.51093667, telefone: '759923986050', kitWifi: 6, velMinima: 200, velOfertada: 200, solucao: 'Fibra' },
  { inep: '29118964', uf: 'BA', municipio: 'Monte Santo', nome: 'ESCOLA MUNICIPAL AYRTON OLIVEIRA DE FREITAS', endereco: 'FAZENDA CIPO, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: -10.44007077, lng: -39.33098597, telefone: '75327514050', kitWifi: 7, velMinima: 250, velOfertada: 250, solucao: 'Fibra' },
  { inep: '29119294', uf: 'BA', municipio: 'Monte Santo', nome: 'ESC NOSSA SENHORA DA CONCEICAO', endereco: 'FAZENDA LAGOA DO BARRO, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: -10.36025938, lng: -39.50829663, telefone: '759990400660', kitWifi: 4, velMinima: 250, velOfertada: 250, solucao: 'Fibra' },
  { inep: '29119367', uf: 'BA', municipio: 'Monte Santo', nome: 'ESC NOSSA SRA DO ROSARIO', endereco: 'FAZENDA LAGOA DO ROSARIO, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.', lat: -10.51411225, lng: -39.20321644, telefone: '75327512550', kitWifi: 13, velMinima: 600, velOfertada: 600, solucao: 'Fibra' },
];

async function seed() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log('Conectado ao banco de dados.');
  
  let atualizadas = 0;
  let inseridas = 0;

  for (const e of escolas) {
    // Verificar se já existe
    const [existing] = await conn.execute('SELECT id FROM escolas WHERE inep = ?', [e.inep]);
    
    if (existing.length > 0) {
      // Atualizar com todos os dados incluindo telefone e coordenadas
      await conn.execute(`
        UPDATE escolas SET 
          nome = ?, uf = ?, municipio = ?, endereco = ?,
          latitude = ?, longitude = ?,
          telefone = ?, kitWifi = ?,
          velocidadeMinima = ?, velocidadeOfertada = ?, tipoConexao = ?
        WHERE inep = ?
      `, [e.nome, e.uf, e.municipio, e.endereco, e.lat, e.lng, e.telefone, e.kitWifi, e.velMinima, e.velOfertada, e.solucao, e.inep]);
      atualizadas++;
    } else {
      // Inserir nova escola
      await conn.execute(`
        INSERT INTO escolas (inep, nome, uf, municipio, endereco, latitude, longitude, telefone, kitWifi, velocidadeMinima, velocidadeOfertada, tipoConexao, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pendente')
      `, [e.inep, e.nome, e.uf, e.municipio, e.endereco, e.lat, e.lng, e.telefone, e.kitWifi, e.velMinima, e.velOfertada, e.solucao]);
      inseridas++;
    }
  }

  console.log(`✅ Concluído! ${atualizadas} escolas atualizadas, ${inseridas} novas inseridas.`);
  
  // Verificar resultado
  const [rows] = await conn.execute('SELECT inep, nome, telefone, latitude, longitude, kitWifi, velocidadeOfertada FROM escolas ORDER BY nome');
  console.log(`\nTotal de escolas no banco: ${rows.length}`);
  rows.forEach(r => {
    const coords = r.latitude ? `✓ coords` : `✗ sem coords`;
    const tel = r.telefone ? `✓ tel` : `✗ sem tel`;
    console.log(`  ${r.inep} | ${r.nome.substring(0,35).padEnd(35)} | ${tel} | ${coords} | kit:${r.kitWifi} | vel:${r.velocidadeOfertada}Mbps`);
  });
  
  await conn.end();
}

seed().catch(err => { console.error('ERRO:', err); process.exit(1); });
