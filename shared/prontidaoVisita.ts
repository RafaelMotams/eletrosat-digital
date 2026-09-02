// Prontidão de visita: avalia, antes do deslocamento, se uma escola reúne as
// condições mínimas para a visita ser concluída. O motor é puro e determinístico;
// todo acesso a banco fica no router, que apenas alimenta este cálculo.

export type StatusEscolaProntidao =
  | "pendente"
  | "em_andamento"
  | "concluido"
  | "nao_instalada";

export type MotivoNaoInstalacaoProntidao =
  | "escola_desativada"
  | "em_reforma"
  | "mudanca_endereco";

export type ClassificacaoProntidao =
  | "pronta"
  | "atencao"
  | "bloqueada"
  | "nao_aplicavel";

export type SeveridadeSinal = "impedimento" | "alerta" | "informativo";

export type ResponsavelSinal = "gestao" | "campo";

export type CodigoSinalProntidao =
  | "localizacao_desconhecida"
  | "sem_georreferencia"
  | "endereco_incompleto"
  | "sem_contato"
  | "sem_tecnico"
  | "tecnico_inativo"
  | "impedimento_registrado"
  | "escopo_indefinido"
  | "material_insuficiente"
  | "material_nao_rastreado"
  | "visita_sem_desfecho"
  | "municipio_reincidente"
  | "manutencao_pendente";

export interface SinalProntidao {
  codigo: CodigoSinalProntidao;
  severidade: SeveridadeSinal;
  peso: number;
  titulo: string;
  detalhe: string;
  acao: string;
  responsavel: ResponsavelSinal;
}

export interface VisitaAvaliavel {
  escolaId: number;
  nome: string;
  inep?: string | null;
  municipio?: string | null;
  uf?: string | null;
  status: StatusEscolaProntidao;
  latitude?: string | number | null;
  longitude?: string | number | null;
  endereco?: string | null;
  telefone?: string | null;
  telefoneWhatsApp?: string | null;
  qtdAp?: number | null;
  apAdicional?: number | null;
  tecnicoId?: number | null;
  tecnicoNome?: string | null;
  tecnicoAtivo?: boolean | null;
  motivoNaoInstalacao?: MotivoNaoInstalacaoProntidao | null;
  osStatus?: "aberta" | "em_andamento" | "concluida" | "nao_instalada" | null;
  osAbertaEm?: Date | string | null;
  /** Saldo de pontos de acesso na posse do técnico. `null` = não rastreado. */
  apDisponivelTecnico?: number | null;
  manutencoesPendentes?: number | null;
  /** Proporção de escolas não instaladas no município, entre 0 e 1. */
  taxaNaoInstalacaoMunicipio?: number | null;
  escolasNoMunicipio?: number | null;
}

export interface ProntidaoVisita {
  escolaId: number;
  nome: string;
  inep: string | null;
  municipio: string | null;
  uf: string | null;
  status: StatusEscolaProntidao;
  tecnicoId: number | null;
  tecnicoNome: string | null;
  apPlanejados: number;
  apDisponivelTecnico: number | null;
  classificacao: ClassificacaoProntidao;
  pontuacao: number;
  resumo: string;
  sinais: SinalProntidao[];
  impedimentos: SinalProntidao[];
  alertas: SinalProntidao[];
}

export interface ConfiguracaoProntidao {
  /** Dias que uma OS pode ficar sem desfecho antes de virar alerta. */
  diasVisitaSemDesfecho: number;
  /** Tamanho mínimo para considerar o endereço navegável. */
  minimoCaracteresEndereco: number;
  /** Taxa de não instalação que caracteriza município reincidente. */
  limiteReincidenciaMunicipio: number;
  /** Amostra mínima para a taxa do município ter significado. */
  minimoEscolasMunicipio: number;
}

export const CONFIGURACAO_PRONTIDAO_PADRAO: ConfiguracaoProntidao = {
  diasVisitaSemDesfecho: 7,
  minimoCaracteresEndereco: 12,
  limiteReincidenciaMunicipio: 0.3,
  minimoEscolasMunicipio: 4,
};

const MOTIVO_IMPEDIMENTO: Record<MotivoNaoInstalacaoProntidao, string> = {
  escola_desativada: "a escola foi registrada como desativada",
  em_reforma: "a escola foi registrada em reforma",
  mudanca_endereco: "a escola foi registrada com mudança de endereço",
};

const UM_DIA_EM_MS = 86_400_000;

export function coordenadaValida(
  valor: string | number | null | undefined,
  limite: number
): number | null {
  if (valor === null || valor === undefined || valor === "") return null;
  const numero = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(numero)) return null;
  if (Math.abs(numero) > limite) return null;
  return numero;
}

export function possuiGeorreferencia(visita: VisitaAvaliavel): boolean {
  const latitude = coordenadaValida(visita.latitude, 90);
  const longitude = coordenadaValida(visita.longitude, 180);
  if (latitude === null || longitude === null) return false;
  // Coordenada zerada é resíduo de importação, não localização real.
  return latitude !== 0 || longitude !== 0;
}

export function contatoUtilizavel(
  ...telefones: Array<string | null | undefined>
): boolean {
  return telefones.some(telefone => {
    const digitos = (telefone ?? "").replace(/\D/g, "");
    return digitos.length >= 10;
  });
}

export function apPlanejados(visita: VisitaAvaliavel): number {
  const principais = Number(visita.qtdAp ?? 0);
  const adicionais = Number(visita.apAdicional ?? 0);
  const total =
    (Number.isFinite(principais) ? principais : 0) +
    (Number.isFinite(adicionais) ? adicionais : 0);
  return total > 0 ? total : 0;
}

function diasDesde(
  referencia: Date | string | null | undefined,
  agora: Date
): number | null {
  if (!referencia) return null;
  const data = referencia instanceof Date ? referencia : new Date(referencia);
  const tempo = data.getTime();
  if (Number.isNaN(tempo)) return null;
  return Math.floor((agora.getTime() - tempo) / UM_DIA_EM_MS);
}

function pluralAp(quantidade: number): string {
  return quantidade === 1 ? "1 ponto de acesso" : `${quantidade} pontos de acesso`;
}

function coletarSinais(
  visita: VisitaAvaliavel,
  config: ConfiguracaoProntidao,
  agora: Date
): SinalProntidao[] {
  const sinais: SinalProntidao[] = [];

  if (visita.motivoNaoInstalacao || visita.status === "nao_instalada") {
    const motivo = visita.motivoNaoInstalacao
      ? MOTIVO_IMPEDIMENTO[visita.motivoNaoInstalacao]
      : "a última visita terminou sem instalação";
    sinais.push({
      codigo: "impedimento_registrado",
      severidade: "impedimento",
      peso: 45,
      titulo: "Impedimento já registrado em campo",
      detalhe: `Uma visita anterior concluiu que ${motivo}.`,
      acao: "Confirme a situação com a secretaria antes de programar novo deslocamento.",
      responsavel: "gestao",
    });
  }

  const temGeo = possuiGeorreferencia(visita);
  const endereco = (visita.endereco ?? "").trim();
  const enderecoNavegavel = endereco.length >= config.minimoCaracteresEndereco;

  if (!temGeo && !enderecoNavegavel) {
    sinais.push({
      codigo: "localizacao_desconhecida",
      severidade: "impedimento",
      peso: 40,
      titulo: "Sem localização utilizável",
      detalhe:
        "A escola não tem coordenadas válidas nem endereço suficiente para navegação.",
      acao: "Preencha coordenadas ou endereço completo na ficha da escola.",
      responsavel: "gestao",
    });
  } else {
    if (!temGeo) {
      sinais.push({
        codigo: "sem_georreferencia",
        severidade: "alerta",
        peso: 20,
        titulo: "Sem coordenadas de GPS",
        detalhe:
          "A rota e o mapa dependem apenas do endereço, o que costuma falhar na zona rural.",
        acao: "Capture as coordenadas na próxima visita ou complete a ficha da escola.",
        responsavel: "campo",
      });
    }
    if (!enderecoNavegavel) {
      sinais.push({
        codigo: "endereco_incompleto",
        severidade: "alerta",
        peso: 12,
        titulo: "Endereço incompleto",
        detalhe: endereco
          ? `O endereço cadastrado tem apenas "${endereco}".`
          : "Não há endereço cadastrado para esta escola.",
        acao: "Complete o endereço com referência de acesso.",
        responsavel: "gestao",
      });
    }
  }

  if (!contatoUtilizavel(visita.telefone, visita.telefoneWhatsApp)) {
    sinais.push({
      codigo: "sem_contato",
      severidade: "alerta",
      peso: 18,
      titulo: "Sem contato para confirmar a visita",
      detalhe:
        "Não há telefone nem WhatsApp para confirmar se haverá alguém para abrir a escola.",
      acao: "Cadastre o contato da direção antes de programar o deslocamento.",
      responsavel: "gestao",
    });
  }

  if (!visita.tecnicoId) {
    sinais.push({
      codigo: "sem_tecnico",
      severidade: "impedimento",
      peso: 40,
      titulo: "Nenhum técnico responsável",
      detalhe: "A escola não está atribuída a um técnico.",
      acao: "Atribua um técnico por cidade ou manualmente.",
      responsavel: "gestao",
    });
  } else if (visita.tecnicoAtivo === false) {
    sinais.push({
      codigo: "tecnico_inativo",
      severidade: "impedimento",
      peso: 40,
      titulo: "Técnico responsável inativo",
      detalhe: `${visita.tecnicoNome ?? "O técnico atribuído"} está inativo e não recebe a ordem no aplicativo.`,
      acao: "Reatribua a escola a um técnico ativo.",
      responsavel: "gestao",
    });
  }

  const planejados = apPlanejados(visita);
  if (planejados === 0) {
    sinais.push({
      codigo: "escopo_indefinido",
      severidade: "alerta",
      peso: 15,
      titulo: "Escopo de instalação indefinido",
      detalhe: "A escola não informa quantos pontos de acesso serão instalados.",
      acao: "Defina a quantidade de APs prevista para dimensionar material e pagamento.",
      responsavel: "gestao",
    });
  } else if (visita.apDisponivelTecnico === null || visita.apDisponivelTecnico === undefined) {
    sinais.push({
      codigo: "material_nao_rastreado",
      severidade: "informativo",
      peso: 0,
      titulo: "Material da visita não rastreado",
      detalhe:
        "Nenhum material do catálogo foi identificado como ponto de acesso, então a conferência de mochila não é possível.",
      acao: 'Cadastre os APs no estoque usando a categoria "AP" para habilitar a conferência.',
      responsavel: "gestao",
    });
  } else if (visita.apDisponivelTecnico < planejados) {
    const faltam = planejados - visita.apDisponivelTecnico;
    sinais.push({
      codigo: "material_insuficiente",
      severidade: "impedimento",
      peso: 35,
      titulo: "Material insuficiente para concluir",
      detalhe: `A visita exige ${pluralAp(planejados)} e o técnico tem ${visita.apDisponivelTecnico} em posse.`,
      acao: `Transfira ${pluralAp(faltam)} antes da saída ou registre a solicitação de reposição.`,
      responsavel: "gestao",
    });
  }

  const diasEmAberto = diasDesde(visita.osAbertaEm, agora);
  const osPendente =
    visita.osStatus === "aberta" || visita.osStatus === "em_andamento";
  if (osPendente && diasEmAberto !== null && diasEmAberto >= config.diasVisitaSemDesfecho) {
    sinais.push({
      codigo: "visita_sem_desfecho",
      severidade: "alerta",
      peso: 12,
      titulo: "Ordem aberta sem desfecho",
      detalhe: `A ordem de serviço está aberta há ${diasEmAberto} dias sem conclusão registrada.`,
      acao: "Confirme com o técnico se houve tentativa frustrada e registre o motivo.",
      responsavel: "gestao",
    });
  }

  const taxa = visita.taxaNaoInstalacaoMunicipio;
  const amostra = visita.escolasNoMunicipio ?? 0;
  if (
    typeof taxa === "number" &&
    Number.isFinite(taxa) &&
    taxa >= config.limiteReincidenciaMunicipio &&
    amostra >= config.minimoEscolasMunicipio
  ) {
    sinais.push({
      codigo: "municipio_reincidente",
      severidade: "alerta",
      peso: 8,
      titulo: "Município com histórico de visita perdida",
      detalhe: `${Math.round(taxa * 100)}% das escolas de ${visita.municipio ?? "este município"} terminaram sem instalação.`,
      acao: "Confirme calendário escolar e acesso com a secretaria municipal.",
      responsavel: "gestao",
    });
  }

  const manutencoes = Number(visita.manutencoesPendentes ?? 0);
  if (manutencoes > 0) {
    sinais.push({
      codigo: "manutencao_pendente",
      severidade: "informativo",
      peso: 0,
      titulo: "Manutenção pendente na mesma escola",
      detalhe: `Existem ${manutencoes} manutenções em aberto para esta escola.`,
      acao: "Agrupe a manutenção na mesma viagem para evitar um segundo deslocamento.",
      responsavel: "campo",
    });
  }

  return sinais;
}

function montarResumo(
  classificacao: ClassificacaoProntidao,
  sinais: SinalProntidao[]
): string {
  if (classificacao === "nao_aplicavel") {
    return "Instalação concluída: nenhuma visita pendente.";
  }
  if (classificacao === "pronta") {
    return "Localização, contato, responsável e material conferidos.";
  }
  const principal = sinais[0];
  if (!principal) return "Revise os dados da escola antes do deslocamento.";
  return `${principal.titulo}. ${principal.acao}`;
}

export function avaliarProntidaoVisita(
  visita: VisitaAvaliavel,
  config: ConfiguracaoProntidao = CONFIGURACAO_PRONTIDAO_PADRAO,
  agora: Date = new Date()
): ProntidaoVisita {
  const base = {
    escolaId: visita.escolaId,
    nome: visita.nome,
    inep: visita.inep ?? null,
    municipio: visita.municipio ?? null,
    uf: visita.uf ?? null,
    status: visita.status,
    tecnicoId: visita.tecnicoId ?? null,
    tecnicoNome: visita.tecnicoNome ?? null,
    apPlanejados: apPlanejados(visita),
    apDisponivelTecnico: visita.apDisponivelTecnico ?? null,
  };

  if (visita.status === "concluido") {
    return {
      ...base,
      classificacao: "nao_aplicavel",
      pontuacao: 100,
      resumo: montarResumo("nao_aplicavel", []),
      sinais: [],
      impedimentos: [],
      alertas: [],
    };
  }

  const sinais = coletarSinais(visita, config, agora).sort(
    (a, b) => b.peso - a.peso
  );
  const impedimentos = sinais.filter(sinal => sinal.severidade === "impedimento");
  const alertas = sinais.filter(sinal => sinal.severidade === "alerta");
  const desconto = sinais.reduce((total, sinal) => total + sinal.peso, 0);
  const pontuacao = Math.max(0, Math.min(100, 100 - desconto));
  const classificacao: ClassificacaoProntidao = impedimentos.length
    ? "bloqueada"
    : alertas.length
      ? "atencao"
      : "pronta";

  return {
    ...base,
    classificacao,
    pontuacao,
    resumo: montarResumo(classificacao, sinais),
    sinais,
    impedimentos,
    alertas,
  };
}

const ORDEM_CLASSIFICACAO: Record<ClassificacaoProntidao, number> = {
  bloqueada: 0,
  atencao: 1,
  pronta: 2,
  nao_aplicavel: 3,
};

export function avaliarProntidaoVisitas(
  visitas: VisitaAvaliavel[],
  config: ConfiguracaoProntidao = CONFIGURACAO_PRONTIDAO_PADRAO,
  agora: Date = new Date()
): ProntidaoVisita[] {
  return visitas
    .map(visita => avaliarProntidaoVisita(visita, config, agora))
    .sort((a, b) => {
      const ordem =
        ORDEM_CLASSIFICACAO[a.classificacao] - ORDEM_CLASSIFICACAO[b.classificacao];
      if (ordem !== 0) return ordem;
      if (a.pontuacao !== b.pontuacao) return a.pontuacao - b.pontuacao;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
}

export interface SinalAgregado {
  codigo: CodigoSinalProntidao;
  titulo: string;
  acao: string;
  severidade: SeveridadeSinal;
  responsavel: ResponsavelSinal;
  ocorrencias: number;
}

export interface ResumoProntidao {
  avaliadas: number;
  prontas: number;
  atencao: number;
  bloqueadas: number;
  naoAplicaveis: number;
  /** Visitas que seriam perdidas se a equipe saísse hoje sem correção. */
  deslocamentosEvitaveis: number;
  pontuacaoMedia: number;
  sinaisFrequentes: SinalAgregado[];
}

export function resumirProntidao(
  avaliacoes: ProntidaoVisita[]
): ResumoProntidao {
  const aplicaveis = avaliacoes.filter(
    avaliacao => avaliacao.classificacao !== "nao_aplicavel"
  );
  const agregados = new Map<CodigoSinalProntidao, SinalAgregado>();
  for (const avaliacao of aplicaveis) {
    for (const sinal of avaliacao.sinais) {
      const atual = agregados.get(sinal.codigo);
      if (atual) {
        atual.ocorrencias += 1;
        continue;
      }
      agregados.set(sinal.codigo, {
        codigo: sinal.codigo,
        titulo: sinal.titulo,
        acao: sinal.acao,
        severidade: sinal.severidade,
        responsavel: sinal.responsavel,
        ocorrencias: 1,
      });
    }
  }

  const somaPontuacao = aplicaveis.reduce(
    (total, avaliacao) => total + avaliacao.pontuacao,
    0
  );

  return {
    avaliadas: aplicaveis.length,
    prontas: aplicaveis.filter(a => a.classificacao === "pronta").length,
    atencao: aplicaveis.filter(a => a.classificacao === "atencao").length,
    bloqueadas: aplicaveis.filter(a => a.classificacao === "bloqueada").length,
    naoAplicaveis: avaliacoes.length - aplicaveis.length,
    deslocamentosEvitaveis: aplicaveis.filter(
      a => a.classificacao === "bloqueada" && a.tecnicoId !== null
    ).length,
    pontuacaoMedia: aplicaveis.length
      ? Math.round(somaPontuacao / aplicaveis.length)
      : 100,
    sinaisFrequentes: Array.from(agregados.values()).sort(
      (a, b) => b.ocorrencias - a.ocorrencias
    ),
  };
}

export interface CoberturaRota {
  tecnicoId: number;
  tecnicoNome: string;
  visitasPlanejadas: number;
  apNecessarios: number;
  apDisponiveis: number | null;
  apFaltantes: number;
  suficiente: boolean;
  rastreado: boolean;
}

/**
 * Cobertura de material da rota inteira: a mochila pode atender cada escola
 * isoladamente e ainda assim não cobrir a soma das visitas planejadas.
 */
export function avaliarCoberturaRota(
  tecnicoId: number,
  tecnicoNome: string,
  visitas: ProntidaoVisita[],
  apDisponiveis: number | null
): CoberturaRota {
  const planejadas = visitas.filter(
    visita =>
      visita.classificacao !== "nao_aplicavel" && visita.tecnicoId === tecnicoId
  );
  const apNecessarios = planejadas.reduce(
    (total, visita) => total + visita.apPlanejados,
    0
  );
  const rastreado = apDisponiveis !== null && apDisponiveis !== undefined;
  const apFaltantes = rastreado
    ? Math.max(0, apNecessarios - (apDisponiveis as number))
    : 0;

  return {
    tecnicoId,
    tecnicoNome,
    visitasPlanejadas: planejadas.length,
    apNecessarios,
    apDisponiveis: rastreado ? (apDisponiveis as number) : null,
    apFaltantes,
    suficiente: rastreado ? apFaltantes === 0 : true,
    rastreado,
  };
}

const TERMOS_MATERIAL_AP = [
  "ACCESS POINT",
  "ACCESSPOINT",
  "PONTO DE ACESSO",
  "ROTEADOR WIFI",
  "ROTEADOR WI FI",
];

function normalizarTexto(valor: string | null | undefined): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .trim();
}

/**
 * Identifica no catálogo do tenant quais materiais representam pontos de acesso.
 * A categoria tem prioridade; nome e código só valem com "AP" isolado, para não
 * confundir com palavras que apenas contêm as letras (ex.: "grampo", "papel").
 */
export function identificarMaterialAp(material: {
  codigo?: string | null;
  nome?: string | null;
  categoria?: string | null;
}): boolean {
  const categoria = normalizarTexto(material.categoria);
  if (categoria === "AP" || categoria === "APS") return true;
  if (TERMOS_MATERIAL_AP.some(termo => categoria.includes(termo))) return true;

  const texto = `${normalizarTexto(material.nome)} ${normalizarTexto(material.codigo)}`;
  if (TERMOS_MATERIAL_AP.some(termo => texto.includes(termo))) return true;
  return /(^|[^A-Z0-9])APS?([^A-Z0-9]|$)/.test(texto);
}
