import mysql from "mysql2/promise";
import dotenv from "dotenv";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dirname = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: join(__dirname, ".env") });

// Dados completos da planilha DOC-20260424-WA0261.xlsx
// Colunas: inep, uf, municipio, nome, endereco, latitude, longitude, apAdicional, telefone, kitWifi, velocidadeMinima, velocidadeOfertada, tipoConexao
const escolas = [
  { inep: "29118913", uf: "BA", municipio: "Monte Santo", nome: "ESCOLA CAMINHO SUAVE", endereco: "TOCAS, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: -10.44810828, longitude: -39.57060199, apAdicional: null, telefone: "75327512550", kitWifi: 1, velocidadeMinima: 50, velocidadeOfertada: 50, tipoConexao: "Fibra" },
  { inep: "29118930", uf: "BA", municipio: "Monte Santo", nome: "ESC DAVID FERRERA DA SILVA", endereco: "FAZENDA PAU DARCO, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: -10.419985, longitude: -39.54349333, apAdicional: null, telefone: "759928316930", kitWifi: 1, velocidadeMinima: 50, velocidadeOfertada: 50, tipoConexao: "Fibra" },
  { inep: "29119340", uf: "BA", municipio: "Monte Santo", nome: "ESC NOSSA SRA DO DESTERRO", endereco: "POVOADO DESTERRO DO ALTO ALEGRE, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: -10.50736711, longitude: -39.63493083, apAdicional: null, telefone: "759911189220", kitWifi: 2, velocidadeMinima: 50, velocidadeOfertada: 50, tipoConexao: "Fibra" },
  { inep: "29119600", uf: "BA", municipio: "Monte Santo", nome: "ESC SAO JORGE", endereco: "POVOADO FOVEIRO, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: -10.339935, longitude: -39.36054, apAdicional: null, telefone: "759996826680", kitWifi: 1, velocidadeMinima: 50, velocidadeOfertada: 50, tipoConexao: "Fibra" },
  { inep: "29118867", uf: "BA", municipio: "Monte Santo", nome: "ESC ANTONIO BRANCO", endereco: "FAZENDA CAIXAO, S/N PREDIO. ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: -10.40080742, longitude: -39.22938675, apAdicional: null, telefone: "75327512550", kitWifi: 1, velocidadeMinima: 100, velocidadeOfertada: 100, tipoConexao: "Fibra" },
  { inep: "29118883", uf: "BA", municipio: "Monte Santo", nome: "ESC BELARMINO CORDEIRO", endereco: "POVOADO ACARU, SN PREDIO. ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: -10.27407429, longitude: -39.37240261, apAdicional: null, telefone: "759990023950", kitWifi: 2, velocidadeMinima: 100, velocidadeOfertada: 100, tipoConexao: "Fibra" },
  { inep: "29119057", uf: "BA", municipio: "Monte Santo", nome: "ESC JOAO SOARES", endereco: "POVOADO SANTO ANTONIO, SN PREDIO. ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: -10.32481, longitude: -39.330955, apAdicional: null, telefone: "75327512550", kitWifi: 2, velocidadeMinima: 100, velocidadeOfertada: 100, tipoConexao: "Fibra" },
  { inep: "29119170", uf: "BA", municipio: "Monte Santo", nome: "ESC LOURIVAL CUSTODIO", endereco: "POVOADO DE MARAVILHA, SN PREDIO. ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: -10.58892797, longitude: -39.35760076, apAdicional: null, telefone: "75327512550", kitWifi: 4, velocidadeMinima: 100, velocidadeOfertada: 100, tipoConexao: "Fibra" },
  { inep: "29119189", uf: "BA", municipio: "Monte Santo", nome: "ESC LUIZ GONZAGA CARDOSO", endereco: "POVOADO SERRA GRANDE, S/N ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: null, longitude: null, apAdicional: null, telefone: "759913133490", kitWifi: 1, velocidadeMinima: 100, velocidadeOfertada: 100, tipoConexao: "Fibra" },
  { inep: "29120500", uf: "BA", municipio: "Monte Santo", nome: "ESCOLA MUNICIPAL JOSE DE SOUZA", endereco: "FAZENDA PEDRA DO DOREA, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: -10.4622383, longitude: -39.75264448, apAdicional: null, telefone: "75327512550", kitWifi: 2, velocidadeMinima: 100, velocidadeOfertada: 100, tipoConexao: "Fibra" },
  { inep: "29120535", uf: "BA", municipio: "Monte Santo", nome: "ESCOLA LUIZ JOSE DANTAS", endereco: "POVOADO LAGOA DO SACO, S/N CASA. ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: -10.53473075, longitude: -39.283076, apAdicional: null, telefone: "759910866760", kitWifi: 5, velocidadeMinima: 100, velocidadeOfertada: 100, tipoConexao: "Fibra" },
  { inep: "29464838", uf: "BA", municipio: "Monte Santo", nome: "ESCOLA MODELO ISABEL AZEVEDO PINTO", endereco: "POVOADO DE ALTO ALEGRE, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: -10.50658586, longitude: -39.57272042, apAdicional: null, telefone: "759994531520", kitWifi: 6, velocidadeMinima: 100, velocidadeOfertada: 100, tipoConexao: "Fibra" },
  { inep: "29476640", uf: "BA", municipio: "Monte Santo", nome: "ESCOLA MUNICIPAL VEREADOR CELSO EVANGELISTA DE SOUZA", endereco: "POVOADO LAGOA DO SACO, S/N PREDIO. ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: -10.5382799, longitude: -39.28168997, apAdicional: null, telefone: "759916241150", kitWifi: 4, velocidadeMinima: 100, velocidadeOfertada: 100, tipoConexao: "Fibra" },
  { inep: "29118905", uf: "BA", municipio: "Monte Santo", nome: "ESC BELO MONTE", endereco: "POVOADO MUQUEM, S/N CASA. ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: -10.24590458, longitude: -39.40847826, apAdicional: null, telefone: "759982471470", kitWifi: 1, velocidadeMinima: 150, velocidadeOfertada: 150, tipoConexao: "Fibra" },
  { inep: "29381657", uf: "BA", municipio: "Monte Santo", nome: "ESCOLA SENHOR DO BONFIM", endereco: "POVOADO LAGE GRANDE, S/N PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: -10.2522809, longitude: -39.51370546, apAdicional: null, telefone: "75327512550", kitWifi: 6, velocidadeMinima: 150, velocidadeOfertada: 150, tipoConexao: "Fibra" },
  { inep: "29119049", uf: "BA", municipio: "Monte Santo", nome: "ESC JOAO LOPES", endereco: "POVOADO DE SACO FUNDO, SN PREDIO. ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: -10.21368678, longitude: -39.41208302, apAdicional: null, telefone: "759981459010", kitWifi: 6, velocidadeMinima: 200, velocidadeOfertada: 200, tipoConexao: "Fibra" },
  { inep: "29120489", uf: "BA", municipio: "Monte Santo", nome: "ESCOLA EDUCANDARIO HORIZONTE NOVO", endereco: "RUA DO CAMPO, SN PREDIO. POVOADO HORIZONTE NOVO. 48800-000 Monte Santo - BA.", latitude: -10.34434883, longitude: -39.71025515, apAdicional: null, telefone: "759928953650", kitWifi: 7, velocidadeMinima: 200, velocidadeOfertada: 200, tipoConexao: "Fibra" },
  { inep: "29120543", uf: "BA", municipio: "Monte Santo", nome: "ESCOLA MIRINS COM ALEGRIA", endereco: "POVOADO LAGE, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: null, longitude: null, apAdicional: null, telefone: "759970951060", kitWifi: 3, velocidadeMinima: 200, velocidadeOfertada: 200, tipoConexao: "Fibra" },
  { inep: "29120640", uf: "BA", municipio: "Monte Santo", nome: "ESCOLA SAO JOAO DOS CAMPOS", endereco: "POVOADO DE ITAPIURU, SN PREDIO. ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: null, longitude: null, apAdicional: null, telefone: "759987903270", kitWifi: 7, velocidadeMinima: 200, velocidadeOfertada: 200, tipoConexao: "Fibra" },
  { inep: "29393469", uf: "BA", municipio: "Monte Santo", nome: "ESC MUNICIPAL JOSE ANDRADE", endereco: "RUA LADISLAU ANDRADE SILVA /POVOADO PEDRA VERMELHA, S/N PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: -10.36352833, longitude: -39.51093667, apAdicional: null, telefone: "759923986050", kitWifi: 6, velocidadeMinima: 200, velocidadeOfertada: 200, tipoConexao: "Fibra" },
  { inep: "29118964", uf: "BA", municipio: "Monte Santo", nome: "ESCOLA MUNICIPAL AYRTON OLIVEIRA DE FREITAS", endereco: "RUA LAURENTINO SILVA, S/N PREDIO. CENTRO. 48800-000 Monte Santo - BA.", latitude: -10.44007077, longitude: -39.33098597, apAdicional: null, telefone: "75327514050", kitWifi: 7, velocidadeMinima: 250, velocidadeOfertada: 250, tipoConexao: "Fibra" },
  { inep: "29119294", uf: "BA", municipio: "Monte Santo", nome: "ESC NOSSA SENHORA DA CONCEICAO", endereco: "RUA NOVA S/Nº, POV PEDRA VERMELHA. CENTRO. 48800-000 Monte Santo - BA.", latitude: -10.36025938, longitude: -39.50829663, apAdicional: null, telefone: "759990400660", kitWifi: 4, velocidadeMinima: 250, velocidadeOfertada: 250, tipoConexao: "Fibra" },
  { inep: "29119367", uf: "BA", municipio: "Monte Santo", nome: "ESC NOSSA SRA DO ROSARIO", endereco: "POVOADO MANDACAIA, S/N PREDIO. ZONA RURAL. 48800-000 Monte Santo - BA.", latitude: -10.51411225, longitude: -39.20321644, apAdicional: null, telefone: "75327512550", kitWifi: 13, velocidadeMinima: 600, velocidadeOfertada: 600, tipoConexao: "Fibra" },
];

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL);
  console.log(`Atualizando ${escolas.length} escolas com campos apAdicional e kitWifi...`);

  for (const escola of escolas) {
    await conn.execute(
      `UPDATE escolas SET 
         apAdicional = ?,
         kitWifi = ?,
         uf = ?,
         municipio = ?,
         endereco = ?,
         latitude = ?,
         longitude = ?,
         telefone = ?,
         velocidadeMinima = ?,
         velocidadeOfertada = ?,
         tipoConexao = ?
       WHERE inep = ?`,
      [
        escola.apAdicional, escola.kitWifi,
        escola.uf, escola.municipio, escola.endereco,
        escola.latitude, escola.longitude,
        escola.telefone, escola.velocidadeMinima,
        escola.velocidadeOfertada, escola.tipoConexao,
        escola.inep
      ]
    );
  }

  // Verificar resultado
  const [rows] = await conn.execute("SELECT COUNT(*) as total, SUM(kitWifi) as totalKits FROM escolas");
  console.log("✅ Atualização concluída!", rows[0]);
  await conn.end();
}

main().catch(console.error);
