/**
 * Detecção automática de colunas por similaridade de nome (fuzzy matching)
 * Funciona com qualquer planilha, independente do idioma ou formatação dos cabeçalhos
 */

export type CampoEscola =
  | "inep"
  | "uf"
  | "municipio"
  | "nome"
  | "endereco"
  | "latitude"
  | "longitude"
  | "qtdAp"
  | "telefone"
  | "velocidadeMinima"
  | "velocidadeOfertada"
  | "tipoConexao"
  | "kitWifi"
  | "apAdicional";

export const CAMPOS_LABELS: Record<CampoEscola, string> = {
  inep: "Código INEP",
  uf: "UF / Estado",
  municipio: "Município / Cidade",
  nome: "Nome da Escola",
  endereco: "Endereço",
  latitude: "Latitude",
  longitude: "Longitude",
  qtdAp: "Qtd. APs",
  telefone: "Telefone",
  velocidadeMinima: "Velocidade Mínima (Mbps)",
  velocidadeOfertada: "Velocidade Ofertada (Mbps)",
  tipoConexao: "Tipo de Conexão / Solução",
  kitWifi: "Kit Wi-Fi",
  apAdicional: "AP Adicional",
};

// Mapeamento de palavras-chave por campo
const CAMPO_KEYWORDS: Record<CampoEscola, string[]> = {
  inep: ["inep", "codigo inep", "código inep", "cod inep", "cod_inep", "codeinep", "school code", "id escola"],
  uf: ["uf", "estado", "state", "sigla estado", "sigla_uf"],
  municipio: ["municipio", "município", "cidade", "city", "municipality", "munic"],
  nome: ["nome da escola", "escola", "school name", "nome escola", "name", "nome", "estabelecimento"],
  endereco: ["endereço", "endereco", "address", "logradouro", "rua", "street", "end"],
  latitude: ["latitude", "lat", "y_coord", "coordy", "coord_y", "geo_lat"],
  longitude: ["longitude", "lng", "lon", "long", "x_coord", "coordx", "coord_x", "geo_lng"],
  qtdAp: ["qtd ap", "quantidade ap", "ap", "access point", "qtd_ap", "num ap", "numero ap"],
  telefone: ["telefone", "fone", "phone", "tel", "contato", "celular", "whatsapp"],
  velocidadeMinima: ["velocidade dl mínima", "velocidade minima", "vel minima", "vel_min", "mbps min", "download min", "velocidade min"],
  velocidadeOfertada: ["velocidade dl ofertada", "velocidade ofertada", "vel ofertada", "vel_of", "mbps", "download", "velocidade of", "velocidade"],
  tipoConexao: ["solução proposta", "solucao proposta", "tipo conexao", "tipo de conexão", "conexao", "solution", "link type", "tipo link", "tecnologia"],
  kitWifi: ["kit wi-fi", "kit wifi", "kit wi fi", "kit_wifi", "wifi kit", "wi-fi estimado", "kit wi-fi(estimado)"],
  apAdicional: ["ap adicional", "ap_adicional", "ap adicional(estimado)", "additional ap", "extra ap"],
};

/**
 * Normaliza string para comparação: remove acentos, lowercase, remove espaços extras
 */
function normalize(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calcula similaridade entre duas strings (0 a 1)
 * Usa combinação de: correspondência exata, contém, palavras em comum
 */
function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);

  if (na === nb) return 1.0;
  if (na.includes(nb) || nb.includes(na)) return 0.85;

  const wordsA = new Set(na.split(" ").filter(w => w.length > 1));
  const wordsB = new Set(nb.split(" ").filter(w => w.length > 1));
  const intersection = Array.from(wordsA).filter(w => wordsB.has(w));
  const union = new Set(Array.from(wordsA).concat(Array.from(wordsB)));

  if (union.size === 0) return 0;
  return intersection.length / union.size;
}

/**
 * Detecta automaticamente o campo correspondente a um cabeçalho de coluna
 * Retorna o campo com maior similaridade (acima do threshold)
 */
export function detectarCampo(header: string, threshold = 0.4): CampoEscola | null {
  let bestField: CampoEscola | null = null;
  let bestScore = threshold;

  for (const [campo, keywords] of Object.entries(CAMPO_KEYWORDS) as [CampoEscola, string[]][]) {
    for (const keyword of keywords) {
      const score = similarity(header, keyword);
      if (score > bestScore) {
        bestScore = score;
        bestField = campo;
      }
    }
  }

  return bestField;
}

/**
 * Detecta automaticamente o mapeamento de colunas de uma planilha
 * Retorna um objeto { campo: nomeColunaNaPlanilha }
 */
export function detectarMapeamento(headers: string[]): Partial<Record<CampoEscola, string>> {
  const mapeamento: Partial<Record<CampoEscola, string>> = {};
  const usados = new Set<string>();

  // Ordena headers por prioridade (mais específicos primeiro)
  for (const header of headers) {
    const campo = detectarCampo(header);
    if (campo && !mapeamento[campo] && !usados.has(header)) {
      mapeamento[campo] = header;
      usados.add(header);
    }
  }

  return mapeamento;
}

/**
 * Converte uma linha da planilha para o formato de escola usando o mapeamento
 */
export function converterLinha(
  row: Record<string, unknown>,
  mapeamento: Partial<Record<CampoEscola, string>>
): {
  inep: string;
  uf?: string;
  municipio?: string;
  nome: string;
  endereco?: string;
  latitude?: string;
  longitude?: string;
  qtdAp?: number;
  telefone?: string;
  velocidadeMinima?: number;
  velocidadeOfertada?: number;
  tipoConexao?: string;
  kitWifi?: number;
  apAdicional?: number;
} {
  const get = (campo: CampoEscola): unknown => {
    const col = mapeamento[campo];
    if (!col) return undefined;
    return row[col];
  };

  const getString = (campo: CampoEscola): string | undefined => {
    const v = get(campo);
    // Tratar false booleano (célula vazia lida pelo XLSX.js com defval:'') como undefined
    if (v == null || v === "" || v === false || (v === 0 && campo !== "qtdAp")) return undefined;
    const s = String(v).trim();
    // Rejeitar strings que claramente não são valores válidos
    if (s === "false" || s === "null" || s === "undefined") return undefined;
    return s || undefined;
  };

  const getNumber = (campo: CampoEscola): number | undefined => {
    const v = get(campo);
    // Tratar false booleano como undefined
    if (v == null || v === "" || v === false) return undefined;
    const n = Number(v);
    return isNaN(n) ? undefined : n;
  };

  return {
    inep: getString("inep") ?? "",
    uf: getString("uf"),
    municipio: getString("municipio"),
    nome: getString("nome") ?? "",
    endereco: getString("endereco"),
    latitude: getString("latitude"),
    longitude: getString("longitude"),
    qtdAp: getNumber("qtdAp") ?? getNumber("kitWifi") ?? getNumber("apAdicional"),
    telefone: getString("telefone"),
    velocidadeMinima: getNumber("velocidadeMinima"),
    velocidadeOfertada: getNumber("velocidadeOfertada"),
    tipoConexao: getString("tipoConexao"),
    kitWifi: getNumber("kitWifi"),
    apAdicional: getNumber("apAdicional"),
  };
}
