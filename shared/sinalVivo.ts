/**
 * SinalVivo — inteligência de saúde da conectividade escolar.
 *
 * Problema real: escolas rurais perdem internet e ninguém sabe por dias.
 * Diretores não sabem diagnosticar; técnicos fazem deslocamentos inúteis
 * quando a falha é do provedor regional ou falta de energia.
 *
 * Esta camada pura decide triagem, detecta incidentes regionais por
 * crowdsourcing de pulsos e aponta escolas em silêncio (sem check-in).
 */

export type PulsoStatus = "ok" | "lento" | "offline";

export type ClassificacaoPulso =
  | "saudavel"
  | "autoajuda"
  | "chamado_local"
  | "suspeita_provedor";

export const LIMIAR_INCIDENTE_REGIONAL = 3;
export const JANELA_INCIDENTE_HORAS = 2;
export const DIAS_SILENCIO_ALERTA = 3;

export type DecisaoTriagem = {
  classificacao: ClassificacaoPulso;
  mensagem: string;
  criarManutencaoSugerida: boolean;
  guiaAutoajuda: string[];
};

export function decidirTriagem(input: {
  status: PulsoStatus;
  temEnergia: boolean | null;
  ledsModemOk: boolean | null;
  vizinhosTambem: boolean | null;
}): DecisaoTriagem {
  if (input.status === "ok") {
    return {
      classificacao: "saudavel",
      mensagem: "Conectividade estável registrada. Obrigado pelo pulso.",
      criarManutencaoSugerida: false,
      guiaAutoajuda: [],
    };
  }

  if (input.temEnergia === false) {
    return {
      classificacao: "autoajuda",
      mensagem:
        "Sem energia elétrica o link cai. Assim que a luz voltar, reinicie o modem e envie um novo pulso.",
      criarManutencaoSugerida: false,
      guiaAutoajuda: [
        "Verifique o disjuntor da sala do equipamento",
        "Confirme se o nobreak está ligado e com bateria",
        "Quando a energia voltar, aguarde 3 minutos e teste o Wi-Fi",
      ],
    };
  }

  if (input.vizinhosTambem === true || (input.status === "offline" && input.ledsModemOk === true && input.vizinhosTambem !== false)) {
    return {
      classificacao: "suspeita_provedor",
      mensagem:
        "Vários sinais apontam falha do provedor na região. Evite deslocamento imediato — monitore o incidente regional.",
      criarManutencaoSugerida: false,
      guiaAutoajuda: [
        "Confirme com comércio vizinho se a internet também caiu",
        "Aguarde restabelecimento do provedor",
        "Se continuar offline após 4 horas, peça manutenção",
      ],
    };
  }

  if (input.ledsModemOk === false) {
    return {
      classificacao: "autoajuda",
      mensagem:
        "LEDs apagados ou em falha costumam se resolver com reinício. Tente o guia antes de chamar o técnico.",
      criarManutencaoSugerida: false,
      guiaAutoajuda: [
        "Desligue o modem da tomada por 20 segundos",
        "Religie e aguarde todos os LEDs estabilizarem (até 3 min)",
        "Teste o Wi-Fi em outro aparelho",
        "Se não voltar, envie novo pulso pedindo manutenção",
      ],
    };
  }

  if (input.status === "lento") {
    return {
      classificacao: "chamado_local",
      mensagem:
        "Lentidão persistente pode indicar interferência, AP sobrecarregado ou link degradado. Vale inspeção local.",
      criarManutencaoSugerida: true,
      guiaAutoajuda: [
        "Afaste o roteiro de micro-ondas e paredes densas",
        "Peça para menos aparelhos conectarem ao mesmo tempo",
        "Anote horários em que a lentidão piora",
      ],
    };
  }

  return {
    classificacao: "chamado_local",
    mensagem:
      "Falha local provável no equipamento da escola. Recomendamos abrir manutenção.",
    criarManutencaoSugerida: true,
    guiaAutoajuda: [
      "Reinicie o modem uma vez e teste novamente",
      "Verifique se antenas/APs estão no lugar",
      "Se continuar offline, confirme o chamado",
    ],
  };
}

export function detectarIncidenteRegional(input: {
  pulsosRecentes: Array<{ municipio: string | null; status: PulsoStatus; escolaId: number }>;
  municipio: string;
  limiarEscolas?: number;
}): { incidente: boolean; escolasAfetadas: number; escolaIds: number[] } {
  const limiar = input.limiarEscolas ?? LIMIAR_INCIDENTE_REGIONAL;
  const municipioNorm = normalizarMunicipio(input.municipio);
  if (!municipioNorm) {
    return { incidente: false, escolasAfetadas: 0, escolaIds: [] };
  }

  const afetadas = new Set<number>();
  for (const pulso of input.pulsosRecentes) {
    if (pulso.status !== "offline" && pulso.status !== "lento") continue;
    if (normalizarMunicipio(pulso.municipio) !== municipioNorm) continue;
    afetadas.add(pulso.escolaId);
  }

  const escolaIds = Array.from(afetadas);
  return {
    incidente: escolaIds.length >= limiar,
    escolasAfetadas: escolaIds.length,
    escolaIds,
  };
}

export function escolasEmSilencio<T extends { id: number; nome: string; status: string; ultimoPulsoEm: Date | null }>(
  input: {
    escolas: T[];
    agora: Date;
    diasSemPulso?: number;
  },
): Array<T & { diasSemSinal: number }> {
  const diasLimite = input.diasSemPulso ?? DIAS_SILENCIO_ALERTA;
  const msLimite = diasLimite * 24 * 60 * 60 * 1000;

  return input.escolas
    .filter((escola) => escola.status === "concluido")
    .map((escola) => {
      const referencia = escola.ultimoPulsoEm ? escola.ultimoPulsoEm.getTime() : 0;
      const delta = input.agora.getTime() - referencia;
      const diasSemSinal = referencia === 0 ? 999 : Math.floor(delta / (24 * 60 * 60 * 1000));
      return { ...escola, diasSemSinal };
    })
    .filter((escola) => {
      if (!escola.ultimoPulsoEm) return true;
      return input.agora.getTime() - escola.ultimoPulsoEm.getTime() >= msLimite;
    })
    .sort((a, b) => b.diasSemSinal - a.diasSemSinal);
}

export function resumoSaude(pulsos: Array<{ status: PulsoStatus }>): {
  ok: number;
  lento: number;
  offline: number;
  total: number;
  indiceSaude: number;
} {
  let ok = 0;
  let lento = 0;
  let offline = 0;
  for (const p of pulsos) {
    if (p.status === "ok") ok += 1;
    else if (p.status === "lento") lento += 1;
    else offline += 1;
  }
  const total = ok + lento + offline;
  const indiceSaude = total === 0 ? 100 : Math.round(((ok + lento * 0.5) / total) * 100);
  return { ok, lento, offline, total, indiceSaude };
}

export function normalizarMunicipio(valor: string | null | undefined): string {
  return (valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function montarDescricaoManutencao(input: {
  status: PulsoStatus;
  classificacao: ClassificacaoPulso;
  relato?: string | null;
  contatoNome?: string | null;
}): string {
  const partes = [
    `[SinalVivo] Pulso ${input.status} classificado como ${input.classificacao}.`,
  ];
  if (input.relato?.trim()) partes.push(`Relato: ${input.relato.trim()}`);
  if (input.contatoNome?.trim()) partes.push(`Contato na escola: ${input.contatoNome.trim()}`);
  return partes.join(" ");
}
