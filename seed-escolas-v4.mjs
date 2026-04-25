import { drizzle } from "drizzle-orm/mysql2";
import { escolas } from "./drizzle/schema.ts";
import { eq } from "drizzle-orm";
import "dotenv/config";

const db = drizzle(process.env.DATABASE_URL);

// Dados completos da planilha DOC-20260424-WA0261.xlsx
// Colunas: INEP, UF, Município, Nome, Endereço, Lat, Lng, (col7), Telefone, Kit WiFi, Vel.Min, Vel.Ofertada, Solução
const escolasData = [
  { inep: "29118913", nome: "ESCOLA CAMINHO SUAVE",                           endereco: "TOCAS, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.",                                                          lat: -10.44810828, lng: -39.57060199, telefone: "75327512550",   kitWifi: 1,  velocidadeMinima: "50Mbps",  velocidadeOfertada: "50Mbps",  tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29118930", nome: "ESC DAVID FERRERA DA SILVA",                     endereco: "FAZENDA PAU DARCO, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.",                                               lat: -10.419985,   lng: -39.54349333, telefone: "759928316930",  kitWifi: 1,  velocidadeMinima: "50Mbps",  velocidadeOfertada: "50Mbps",  tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29119340", nome: "ESC NOSSA SRA DO DESTERRO",                      endereco: "POVOADO DESTERRO DO ALTO ALEGRE, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.",                                 lat: -10.50736711, lng: -39.63493083, telefone: "759911189220",  kitWifi: 2,  velocidadeMinima: "50Mbps",  velocidadeOfertada: "50Mbps",  tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29119600", nome: "ESC SAO JORGE",                                  endereco: "POVOADO FOVEIRO, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.",                                                  lat: -10.339935,   lng: -39.36054,    telefone: "759996826680",  kitWifi: 1,  velocidadeMinima: "50Mbps",  velocidadeOfertada: "50Mbps",  tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29118867", nome: "ESC ANTONIO BRANCO",                             endereco: "FAZENDA CAIXAO, S/N PREDIO. ZONA RURAL. 48800-000 Monte Santo - BA.",                                                          lat: -10.40080742, lng: -39.22938675, telefone: "75327512550",   kitWifi: 1,  velocidadeMinima: "100Mbps", velocidadeOfertada: "100Mbps", tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29118883", nome: "ESC BELARMINO CORDEIRO",                         endereco: "POVOADO ACARU, SN PREDIO. ZONA RURAL. 48800-000 Monte Santo - BA.",                                                            lat: -10.27407429, lng: -39.37240261, telefone: "759990023950",  kitWifi: 2,  velocidadeMinima: "100Mbps", velocidadeOfertada: "100Mbps", tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29119057", nome: "ESC JOAO SOARES",                                endereco: "POVOADO SANTO ANTONIO, SN PREDIO. ZONA RURAL. 48800-000 Monte Santo - BA.",                                                    lat: -10.32481,    lng: -39.330955,   telefone: "75327512550",   kitWifi: 2,  velocidadeMinima: "100Mbps", velocidadeOfertada: "100Mbps", tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29119170", nome: "ESC LOURIVAL CUSTODIO",                          endereco: "POVOADO DE MARAVILHA, SN PREDIO. ZONA RURAL. 48800-000 Monte Santo - BA.",                                                     lat: -10.58892797, lng: -39.35760076, telefone: "75327512550",   kitWifi: 4,  velocidadeMinima: "100Mbps", velocidadeOfertada: "100Mbps", tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29119189", nome: "ESC LUIZ GONZAGA CARDOSO",                       endereco: "POVOADO SERRA GRANDE, S/N ZONA RURAL. 48800-000 Monte Santo - BA.",                                                            lat: null,         lng: null,         telefone: "759913133490",  kitWifi: 1,  velocidadeMinima: "100Mbps", velocidadeOfertada: "100Mbps", tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29120500", nome: "ESCOLA MUNICIPAL JOSE DE SOUZA",                 endereco: "FAZENDA PEDRA DO DOREA, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.",                                          lat: -10.4622383,  lng: -39.75264448, telefone: "75327512550",   kitWifi: 2,  velocidadeMinima: "100Mbps", velocidadeOfertada: "100Mbps", tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29120535", nome: "ESCOLA LUIZ JOSE DANTAS",                        endereco: "POVOADO LAGOA DO SACO, S/N CASA. ZONA RURAL. 48800-000 Monte Santo - BA.",                                                     lat: -10.53473075, lng: -39.283076,   telefone: "759910866760",  kitWifi: 5,  velocidadeMinima: "100Mbps", velocidadeOfertada: "100Mbps", tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29464838", nome: "ESCOLA MODELO ISABEL AZEVEDO PINTO",             endereco: "POVOADO DE ALTO ALEGRE, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.",                                          lat: -10.50658586, lng: -39.57272042, telefone: "759994531520",  kitWifi: 6,  velocidadeMinima: "100Mbps", velocidadeOfertada: "100Mbps", tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29476640", nome: "ESCOLA MUNICIPAL VEREADOR CELSO EVANGELISTA DE SOUZA", endereco: "POVOADO LAGOA DO SACO, S/N PREDIO. ZONA RURAL. 48800-000 Monte Santo - BA.",                                           lat: -10.5382799,  lng: -39.28168997, telefone: "759916241150",  kitWifi: 4,  velocidadeMinima: "100Mbps", velocidadeOfertada: "100Mbps", tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29118905", nome: "ESC BELO MONTE",                                 endereco: "POVOADO MUQUEM, S/N CASA. ZONA RURAL. 48800-000 Monte Santo - BA.",                                                            lat: -10.24590458, lng: -39.40847826, telefone: "759982471470",  kitWifi: 1,  velocidadeMinima: "150Mbps", velocidadeOfertada: "150Mbps", tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29381657", nome: "ESCOLA SENHOR DO BONFIM",                        endereco: "POVOADO LAGE GRANDE, S/N PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.",                                            lat: -10.2522809,  lng: -39.51370546, telefone: "75327512550",   kitWifi: 6,  velocidadeMinima: "150Mbps", velocidadeOfertada: "150Mbps", tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29119049", nome: "ESC JOAO LOPES",                                 endereco: "POVOADO DE SACO FUNDO, SN PREDIO. ZONA RURAL. 48800-000 Monte Santo - BA.",                                                    lat: -10.21368678, lng: -39.41208302, telefone: "759981459010",  kitWifi: 6,  velocidadeMinima: "200Mbps", velocidadeOfertada: "200Mbps", tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29120489", nome: "ESCOLA EDUCANDARIO HORIZONTE NOVO",              endereco: "RUA DO CAMPO, SN PREDIO. POVOADO HORIZONTE NOVO. 48800-000 Monte Santo - BA.",                                                 lat: -10.34434883, lng: -39.71025515, telefone: "759928953650",  kitWifi: 7,  velocidadeMinima: "200Mbps", velocidadeOfertada: "200Mbps", tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29120543", nome: "ESCOLA MIRINS COM ALEGRIA",                      endereco: "POVOADO LAGE, SN PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.",                                                     lat: null,         lng: null,         telefone: "759970951060",  kitWifi: 3,  velocidadeMinima: "200Mbps", velocidadeOfertada: "200Mbps", tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29120640", nome: "ESCOLA SAO JOAO DOS CAMPOS",                     endereco: "POVOADO DE ITAPIURU, SN PREDIO. ZONA RURAL. 48800-000 Monte Santo - BA.",                                                      lat: null,         lng: null,         telefone: "759987903270",  kitWifi: 7,  velocidadeMinima: "200Mbps", velocidadeOfertada: "200Mbps", tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29393469", nome: "ESC MUNICIPAL JOSE ANDRADE",                     endereco: "RUA LADISLAU ANDRADE SILVA /POVOADO PEDRA VERMELHA, S/N PREDIO ESCOLAR. ZONA RURAL. 48800-000 Monte Santo - BA.",             lat: -10.36352833, lng: -39.51093667, telefone: "759923986050",  kitWifi: 6,  velocidadeMinima: "200Mbps", velocidadeOfertada: "200Mbps", tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29118964", nome: "ESCOLA MUNICIPAL AYRTON OLIVEIRA DE FREITAS",   endereco: "RUA LAURENTINO SILVA, S/N PREDIO. CENTRO. 48800-000 Monte Santo - BA.",                                                        lat: -10.44007077, lng: -39.33098597, telefone: "75327514050",   kitWifi: 7,  velocidadeMinima: "250Mbps", velocidadeOfertada: "250Mbps", tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29119294", nome: "ESC NOSSA SENHORA DA CONCEICAO",                 endereco: "RUA NOVA S/Nº, POV PEDRA VERMELHA. CENTRO. 48800-000 Monte Santo - BA.",                                                       lat: -10.36025938, lng: -39.50829663, telefone: "759990400660",  kitWifi: 4,  velocidadeMinima: "250Mbps", velocidadeOfertada: "250Mbps", tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
  { inep: "29119367", nome: "ESC NOSSA SRA DO ROSARIO",                       endereco: "POVOADO MANDACAIA, S/N PREDIO. ZONA RURAL. 48800-000 Monte Santo - BA.",                                                       lat: -10.51411225, lng: -39.20321644, telefone: "75327512550",   kitWifi: 13, velocidadeMinima: "600Mbps", velocidadeOfertada: "600Mbps", tipoConexao: "Fibra", municipio: "Monte Santo", uf: "BA" },
];

// Formatar telefone para WhatsApp (apenas dígitos, com 55 na frente)
function formatarTelefoneWhatsApp(tel) {
  if (!tel) return null;
  const digits = tel.replace(/\D/g, '');
  // Se começa com 75 ou 759 (DDD BA), adicionar 55
  if (digits.startsWith('55')) return digits;
  return '55' + digits;
}

async function seed() {
  console.log("Conectando ao banco...");
  let atualizadas = 0, inseridas = 0;

  for (const escola of escolasData) {
    const telFormatado = formatarTelefoneWhatsApp(escola.telefone);
    
    const existing = await db.select().from(escolas).where(eq(escolas.inep, escola.inep)).limit(1);
    
    const dados = {
      inep: escola.inep,
      nome: escola.nome,
      municipio: escola.municipio,
      uf: escola.uf,
      endereco: escola.endereco,
      latitude: escola.lat ? String(escola.lat) : null,
      longitude: escola.lng ? String(escola.lng) : null,
      telefone: escola.telefone,
      telefoneWhatsApp: telFormatado,
      velocidadeMinima: escola.velocidadeMinima,
      velocidadeOfertada: escola.velocidadeOfertada,
      tipoConexao: escola.tipoConexao,
      kitWifi: escola.kitWifi,
      apAdicional: escola.kitWifi, // AP = kit wifi
    };

    if (existing.length > 0) {
      await db.update(escolas).set(dados).where(eq(escolas.inep, escola.inep));
      atualizadas++;
    } else {
      await db.insert(escolas).values({ ...dados, status: 'pendente' });
      inseridas++;
    }
  }

  console.log(`✅ ${inseridas} inseridas, ${atualizadas} atualizadas`);
  
  // Verificar resultado
  const total = await db.select().from(escolas);
  console.log(`\nTotal no banco: ${total.length} escolas`);
  for (const e of total) {
    const hasCoords = e.latitude && e.longitude;
    const hasTel = e.telefone;
    console.log(`  ${e.inep} | ${e.nome?.substring(0,35).padEnd(35)} | tel:${hasTel ? '✓' : '✗'} | coords:${hasCoords ? '✓' : '✗'} | kit:${e.kitWifi} | ${e.velocidadeOfertada}`);
  }
  process.exit(0);
}

seed().catch(e => { console.error(e); process.exit(1); });
