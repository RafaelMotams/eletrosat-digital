/**
 * Radar de Impedimentos — motor puro de detecção e scoring.
 *
 * Problema real: gestores de campo veem listas e KPIs, mas não sabem
 * qual bloqueio impedir a conclusão da próxima escola hoje.
 * Este motor cruza escolas, OS, manutenção e estoque e devolve uma fila
 * ranqueada de ações concretas, sem inventar dados.
 */

export type SeveridadeImpedimento = "critico" | "alto" | "medio" | "baixo";

export type TipoImpedimento =
  | "escola_sem_coordenadas"
  | "escola_sem_contato"
  | "escola_sem_tecnico"
  | "os_parada"
  | "deficit_ap"
  | "evidencia_ausente"
  | "manutencao_parada"
  | "estoque_critico"
  | "reposicao_aberta"
  | "tecnico_sobrecarga";

export type Impedimento = {
  id: string;
  tipo: TipoImpedimento;
  severidade: SeveridadeImpedimento;
  score: number;
  titulo: string;
  descricao: string;
  acaoSugerida: string;
  href: string;
  escolaId?: number;
  escolaNome?: string;
  osId?: number;
  manutencaoId?: number;
  tecnicoId?: number;
  tecnicoNome?: string;
  materialId?: number;
  materialNome?: string;
  diasAberto?: number;
  metadados?: Record<string, string | number | boolean | null>;
};

export type RadarResumo = {
  geradoEm: string;
  total: number;
  criticos: number;
  altos: number;
  medios: number;
  baixos: number;
  /** 100 = operação limpa; 0 = muitos bloqueios críticos. */
  scoreSaude: number;
  porTipo: Record<TipoImpedimento, number>;
};

export type RadarScanResult = {
  resumo: RadarResumo;
  impedimentos: Impedimento[];
};

export type EscolaRadarInput = {
  id: number;
  nome: string;
  inep?: string | null;
  status: string;
  ativo?: boolean | null;
  tecnicoId?: number | null;
  qtdAp?: number | null;
  latitude?: string | number | null;
  longitude?: string | number | null;
  telefone?: string | null;
  telefoneWhatsApp?: string | null;
};

export type OrdemRadarInput = {
  id: number;
  escolaId: number;
  tecnicoId: number;
  status: string;
  qtdApInstalado?: number | null;
  dataAbertura: Date | string;
  dataConclusao?: Date | string | null;
  fotoMapaCalorUrl?: string | null;
  fotoMapaCalorKey?: string | null;
};

export type ManutencaoRadarInput = {
  id: number;
  status: string;
  tecnicoId?: number | null;
  escolaId?: number | null;
  escolaNome?: string | null;
  descricaoProblema?: string | null;
  createdAt: Date | string;
};

export type EstoqueSaldoRadarInput = {
  materialId: number;
  materialNome: string;
  estoqueMinimo: string | number;
  holderType: "almoxarifado" | "tecnico";
  holderId: number;
  quantidade: string | number;
};

export type SolicitacaoRadarInput = {
  id: number;
  tecnicoId: number;
  materialId: number;
  materialNome?: string | null;
  status: string;
  quantidadeSolicitada: string | number;
  quantidadeAtendida?: string | number | null;
  createdAt: Date | string;
};

export type TecnicoRadarInput = {
  id: number;
  nome: string;
  ativo?: boolean | null;
};

export type RadarInput = {
  agora?: Date;
  escolas: EscolaRadarInput[];
  ordens: OrdemRadarInput[];
  manutencoes: ManutencaoRadarInput[];
  saldos: EstoqueSaldoRadarInput[];
  solicitacoes: SolicitacaoRadarInput[];
  tecnicos: TecnicoRadarInput[];
  /** Limite de OS abertas/em andamento por técnico antes de sinalizar sobrecarga. */
  limiteOsPorTecnico?: number;
  /** Dias sem progresso para considerar OS ou manutenção parada. */
  diasOsParada?: number;
  diasManutencaoParada?: number;
  diasReposicaoAberta?: number;
};

const TIPOS: TipoImpedimento[] = [
  "escola_sem_coordenadas",
  "escola_sem_contato",
  "escola_sem_tecnico",
  "os_parada",
  "deficit_ap",
  "evidencia_ausente",
  "manutencao_parada",
  "estoque_critico",
  "reposicao_aberta",
  "tecnico_sobrecarga",
];

const PESO_SEVERIDADE: Record<SeveridadeImpedimento, number> = {
  critico: 28,
  alto: 14,
  medio: 6,
  baixo: 2,
};

function toDate(value: Date | string): Date {
  return value instanceof Date ? value : new Date(value);
}

function diasEntre(inicio: Date | string, fim: Date): number {
  const ms = fim.getTime() - toDate(inicio).getTime();
  if (!Number.isFinite(ms) || ms < 0) return 0;
  return Math.floor(ms / (1000 * 60 * 60 * 24));
}

function temCoord(value: string | number | null | undefined): boolean {
  if (value === null || value === undefined || value === "") return false;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) && n !== 0;
}

function temTelefone(escola: EscolaRadarInput): boolean {
  const tel = (escola.telefoneWhatsApp || escola.telefone || "").replace(/\D/g, "");
  return tel.length >= 8;
}

function num(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function scoreBase(severidade: SeveridadeImpedimento, dias = 0): number {
  const base = { critico: 90, alto: 72, medio: 48, baixo: 24 }[severidade];
  return Math.min(100, base + Math.min(10, dias));
}

function escolaAtivaPendente(escola: EscolaRadarInput): boolean {
  if (escola.ativo === false) return false;
  return escola.status === "pendente" || escola.status === "em_andamento";
}

export function escanearImpedimentos(input: RadarInput): RadarScanResult {
  const agora = input.agora ?? new Date();
  const limiteOs = input.limiteOsPorTecnico ?? 12;
  const diasOsParada = input.diasOsParada ?? 5;
  const diasManutencaoParada = input.diasManutencaoParada ?? 3;
  const diasReposicao = input.diasReposicaoAberta ?? 2;

  const escolasPorId = new Map(input.escolas.map((e) => [e.id, e]));
  const tecnicosPorId = new Map(input.tecnicos.map((t) => [t.id, t]));

  const impedimentos: Impedimento[] = [];

  for (const escola of input.escolas) {
    if (!escolaAtivaPendente(escola)) continue;

    if (!temCoord(escola.latitude) || !temCoord(escola.longitude)) {
      impedimentos.push({
        id: `coord-${escola.id}`,
        tipo: "escola_sem_coordenadas",
        severidade: "alto",
        score: scoreBase("alto"),
        titulo: "Escola sem coordenadas GPS",
        descricao: `${escola.nome} não tem latitude/longitude válidas. O técnico não consegue abrir rota automática.`,
        acaoSugerida: "Corrigir lat/lng na ficha da escola ou reimportar a planilha com coordenadas.",
        href: "/admin/escolas",
        escolaId: escola.id,
        escolaNome: escola.nome,
        metadados: { inep: escola.inep ?? null },
      });
    }

    if (!temTelefone(escola)) {
      impedimentos.push({
        id: `contato-${escola.id}`,
        tipo: "escola_sem_contato",
        severidade: "medio",
        score: scoreBase("medio"),
        titulo: "Escola sem telefone/WhatsApp",
        descricao: `${escola.nome} não tem contato útil. O técnico perde tempo tentando localizar a unidade.`,
        acaoSugerida: "Cadastrar telefone da escola ou usar busca assistida no app do técnico.",
        href: "/admin/escolas",
        escolaId: escola.id,
        escolaNome: escola.nome,
      });
    }

    if (!escola.tecnicoId) {
      impedimentos.push({
        id: `sem-tec-${escola.id}`,
        tipo: "escola_sem_tecnico",
        severidade: "alto",
        score: scoreBase("alto"),
        titulo: "Escola sem técnico atribuído",
        descricao: `${escola.nome} está ${escola.status} e sem responsável. Não entra na rota de ninguém.`,
        acaoSugerida: "Atribuir um técnico por cidade ou manualmente.",
        href: "/admin/atribuicoes",
        escolaId: escola.id,
        escolaNome: escola.nome,
      });
    }
  }

  const cargaPorTecnico = new Map<number, number>();

  for (const os of input.ordens) {
    const escola = escolasPorId.get(os.escolaId);
    const tecnico = tecnicosPorId.get(os.tecnicoId);
    const dias = diasEntre(os.dataAbertura, agora);

    if (os.status === "aberta" || os.status === "em_andamento") {
      cargaPorTecnico.set(os.tecnicoId, (cargaPorTecnico.get(os.tecnicoId) ?? 0) + 1);

      if (dias >= diasOsParada) {
        const severidade: SeveridadeImpedimento = dias >= diasOsParada * 2 ? "critico" : "alto";
        impedimentos.push({
          id: `os-parada-${os.id}`,
          tipo: "os_parada",
          severidade,
          score: scoreBase(severidade, dias),
          titulo: `OS #${os.id} parada há ${dias} dia(s)`,
          descricao: `${escola?.nome ?? `Escola #${os.escolaId}`} permanece ${os.status.replace("_", " ")} com ${tecnico?.nome ?? "técnico"} sem conclusão.`,
          acaoSugerida: "Cobrar progresso, redistribuir ou registrar impedimento real (reforma/desativada).",
          href: "/admin/ordens",
          escolaId: os.escolaId,
          escolaNome: escola?.nome,
          osId: os.id,
          tecnicoId: os.tecnicoId,
          tecnicoNome: tecnico?.nome,
          diasAberto: dias,
        });
      }
    }

    if (os.status === "concluida") {
      const instalado = num(os.qtdApInstalado);
      const planejado = num(escola?.qtdAp);
      // Só sinaliza déficit quando o planejado é conhecido e positivo.
      if (planejado > 0 && instalado < planejado) {
        const faltam = planejado - instalado;
        impedimentos.push({
          id: `deficit-ap-${os.id}`,
          tipo: "deficit_ap",
          severidade: faltam >= 2 ? "critico" : "alto",
          score: scoreBase(faltam >= 2 ? "critico" : "alto", faltam),
          titulo: `Déficit de ${faltam} AP na OS #${os.id}`,
          descricao: `${escola?.nome ?? `Escola #${os.escolaId}`}: planejado ${planejado}, instalado ${instalado}. Excesso em outra escola não compensa esta falta.`,
          acaoSugerida: "Abrir retorno de instalação ou justificar o déficit no relatório auditável.",
          href: "/admin/relatorios",
          escolaId: os.escolaId,
          escolaNome: escola?.nome,
          osId: os.id,
          tecnicoId: os.tecnicoId,
          tecnicoNome: tecnico?.nome,
          metadados: { planejado, instalado, faltam },
        });
      }

      const temEvidencia = Boolean(os.fotoMapaCalorUrl || os.fotoMapaCalorKey);
      if (!temEvidencia) {
        impedimentos.push({
          id: `evidencia-${os.id}`,
          tipo: "evidencia_ausente",
          severidade: "alto",
          score: scoreBase("alto"),
          titulo: `OS #${os.id} concluída sem mapa de calor`,
          descricao: `${escola?.nome ?? `Escola #${os.escolaId}`} foi marcada como concluída sem evidência fotográfica auditável.`,
          acaoSugerida: "Solicitar upload da evidência ou revisar a conclusão da ordem.",
          href: "/admin/ordens",
          escolaId: os.escolaId,
          escolaNome: escola?.nome,
          osId: os.id,
          tecnicoId: os.tecnicoId,
          tecnicoNome: tecnico?.nome,
        });
      }
    }
  }

  for (const [tecnicoId, carga] of Array.from(cargaPorTecnico.entries())) {
    if (carga <= limiteOs) continue;
    const tecnico = tecnicosPorId.get(tecnicoId);
    impedimentos.push({
      id: `sobrecarga-${tecnicoId}`,
      tipo: "tecnico_sobrecarga",
      severidade: carga >= limiteOs * 1.5 ? "alto" : "medio",
      score: scoreBase(carga >= limiteOs * 1.5 ? "alto" : "medio", carga - limiteOs),
      titulo: `${tecnico?.nome ?? `Técnico #${tecnicoId}`} com sobrecarga`,
      descricao: `${carga} OS abertas/em andamento (limite operacional ${limiteOs}). Risco de atraso em cadeia.`,
      acaoSugerida: "Redistribuir escolas ou priorizar a rota semanal do técnico.",
      href: "/admin/atribuicoes",
      tecnicoId,
      tecnicoNome: tecnico?.nome,
      metadados: { carga, limite: limiteOs },
    });
  }

  for (const m of input.manutencoes) {
    if (m.status === "concluida") continue;
    const dias = diasEntre(m.createdAt, agora);
    if (dias < diasManutencaoParada) continue;
    const severidade: SeveridadeImpedimento = dias >= diasManutencaoParada * 2 ? "critico" : "alto";
    const tecnico = m.tecnicoId ? tecnicosPorId.get(m.tecnicoId) : undefined;
    impedimentos.push({
      id: `manut-${m.id}`,
      tipo: "manutencao_parada",
      severidade,
      score: scoreBase(severidade, dias),
      titulo: `Manutenção #${m.id} parada há ${dias} dia(s)`,
      descricao: `${m.escolaNome ?? (m.escolaId ? escolasPorId.get(m.escolaId)?.nome : null) ?? "Local"} — ${m.descricaoProblema?.slice(0, 120) || "sem descrição"}.`,
      acaoSugerida: m.tecnicoId ? "Cobrar laudo/conclusão ou reatribuir." : "Atribuir técnico à manutenção.",
      href: "/admin/manutencao",
      manutencaoId: m.id,
      escolaId: m.escolaId ?? undefined,
      escolaNome: m.escolaNome ?? (m.escolaId ? escolasPorId.get(m.escolaId)?.nome : undefined),
      tecnicoId: m.tecnicoId ?? undefined,
      tecnicoNome: tecnico?.nome,
      diasAberto: dias,
    });
  }

  // Agrega saldos por material (almoxarifado + técnicos) para comparar com mínimo.
  const agregado = new Map<number, { nome: string; minimo: number; total: number }>();
  for (const saldo of input.saldos) {
    const atual = agregado.get(saldo.materialId) ?? {
      nome: saldo.materialNome,
      minimo: num(saldo.estoqueMinimo),
      total: 0,
    };
    atual.total += num(saldo.quantidade);
    atual.minimo = Math.max(atual.minimo, num(saldo.estoqueMinimo));
    atual.nome = saldo.materialNome || atual.nome;
    agregado.set(saldo.materialId, atual);
  }

  for (const [materialId, info] of Array.from(agregado.entries())) {
    if (info.minimo <= 0) continue;
    if (info.total >= info.minimo) continue;
    const severidade: SeveridadeImpedimento = info.total <= 0 ? "critico" : "alto";
    impedimentos.push({
      id: `estoque-${materialId}`,
      tipo: "estoque_critico",
      severidade,
      score: scoreBase(severidade),
      titulo: `Estoque crítico: ${info.nome}`,
      descricao: `Saldo total ${info.total} abaixo do mínimo ${info.minimo}. Risco de técnico sem material em campo.`,
      acaoSugerida: "Registrar entrada no almoxarifado ou transferir material disponível.",
      href: "/admin/estoque",
      materialId,
      materialNome: info.nome,
      metadados: { saldo: info.total, minimo: info.minimo },
    });
  }

  for (const sol of input.solicitacoes) {
    if (sol.status !== "aberta" && sol.status !== "em_analise") continue;
    const dias = diasEntre(sol.createdAt, agora);
    if (dias < diasReposicao) continue;
    const tecnico = tecnicosPorId.get(sol.tecnicoId);
    const pendente = Math.max(0, num(sol.quantidadeSolicitada) - num(sol.quantidadeAtendida));
    impedimentos.push({
      id: `reposicao-${sol.id}`,
      tipo: "reposicao_aberta",
      severidade: dias >= diasReposicao * 2 ? "alto" : "medio",
      score: scoreBase(dias >= diasReposicao * 2 ? "alto" : "medio", dias),
      titulo: `Reposição #${sol.id} aguardando há ${dias} dia(s)`,
      descricao: `${tecnico?.nome ?? `Técnico #${sol.tecnicoId}`} pediu ${pendente || num(sol.quantidadeSolicitada)} de ${sol.materialNome ?? `material #${sol.materialId}`}.`,
      acaoSugerida: "Atender parcialmente ou transferir do almoxarifado.",
      href: "/admin/estoque",
      tecnicoId: sol.tecnicoId,
      tecnicoNome: tecnico?.nome,
      materialId: sol.materialId,
      materialNome: sol.materialNome ?? undefined,
      diasAberto: dias,
      metadados: { solicitacaoId: sol.id, pendente },
    });
  }

  impedimentos.sort((a, b) => b.score - a.score || a.titulo.localeCompare(b.titulo, "pt-BR"));

  const porTipo = Object.fromEntries(TIPOS.map((t) => [t, 0])) as Record<TipoImpedimento, number>;
  let criticos = 0;
  let altos = 0;
  let medios = 0;
  let baixos = 0;
  let peso = 0;

  for (const item of impedimentos) {
    porTipo[item.tipo] += 1;
    if (item.severidade === "critico") criticos += 1;
    else if (item.severidade === "alto") altos += 1;
    else if (item.severidade === "medio") medios += 1;
    else baixos += 1;
    peso += PESO_SEVERIDADE[item.severidade];
  }

  const scoreSaude = Math.max(0, Math.min(100, Math.round(100 - Math.min(100, peso))));

  return {
    resumo: {
      geradoEm: agora.toISOString(),
      total: impedimentos.length,
      criticos,
      altos,
      medios,
      baixos,
      scoreSaude,
      porTipo,
    },
    impedimentos,
  };
}

/** Remove campos que não devem vazar entre tenants (defesa em profundidade na API). */
export function sanitizarRadarParaTenant(result: RadarScanResult): RadarScanResult {
  return {
    resumo: { ...result.resumo, porTipo: { ...result.resumo.porTipo } },
    impedimentos: result.impedimentos.map((item) => ({ ...item, metadados: item.metadados ? { ...item.metadados } : undefined })),
  };
}
