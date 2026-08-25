export type EscopoTecnicoLocal = {
  tenantId: number;
  tecnicoId: number;
};

function identificadorValido(valor: number): boolean {
  return Number.isInteger(valor) && valor > 0;
}

export function criarEscopoTecnicoLocal(tenantId: number, tecnicoId: number): EscopoTecnicoLocal | null {
  if (!identificadorValido(tenantId) || !identificadorValido(tecnicoId)) return null;
  return { tenantId, tecnicoId };
}

export function chaveTecnicoLocal(escopo: EscopoTecnicoLocal, item: string): string {
  return `tecnico:${escopo.tenantId}:${escopo.tecnicoId}:${item}`;
}

export function chavesRotaTecnico(escopo: EscopoTecnicoLocal) {
  return {
    ativa: chaveTecnicoLocal(escopo, "active-os-route"),
    ativaTimestamp: chaveTecnicoLocal(escopo, "active-os-ts"),
    ultimoMenu: chaveTecnicoLocal(escopo, "last-menu-route"),
    rotaDia: chaveTecnicoLocal(escopo, "rota-dia"),
  } as const;
}
