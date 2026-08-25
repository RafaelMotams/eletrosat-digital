export const ROTA_OS_TTL_MS = 12 * 60 * 60 * 1000;

export type DecisaoRotaTecnico = {
  destino: string | null;
  limparRotaAtiva: boolean;
};

type EntradaRotaTecnico = {
  localizacao: string;
  rotaAtiva: string | null;
  rotaAtivaEm: number;
  ultimoMenu: string | null;
  agora: number;
  rotasMenu: readonly string[];
};

export function decidirRotaInicialTecnico(entrada: EntradaRotaTecnico): DecisaoRotaTecnico {
  if (entrada.localizacao !== "/tecnico") return { destino: null, limparRotaAtiva: false };

  const rotaAtivaValida = Boolean(
    entrada.rotaAtiva &&
    entrada.rotaAtiva.startsWith("/tecnico/os/") &&
    entrada.rotaAtivaEm > 0 &&
    entrada.agora - entrada.rotaAtivaEm < ROTA_OS_TTL_MS,
  );

  if (rotaAtivaValida) return { destino: entrada.rotaAtiva!, limparRotaAtiva: false };

  const ultimoMenuValido = Boolean(
    entrada.ultimoMenu &&
    entrada.ultimoMenu !== entrada.localizacao &&
    entrada.rotasMenu.includes(entrada.ultimoMenu),
  );

  return {
    destino: ultimoMenuValido ? entrada.ultimoMenu : null,
    limparRotaAtiva: Boolean(entrada.rotaAtiva),
  };
}
