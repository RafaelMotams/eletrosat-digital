export type AtividadeRotaSemanal = {
  id: number;
  nome: string;
  status: string;
  qtdAp?: number | null;
  municipio?: string | null;
  dataConclusao?: Date | string | null;
};

export type FiltroRotaSemanal = "todas" | "concluido" | "em_andamento" | "pendente";

export function inicioDaSemana(data: Date): Date {
  const inicio = new Date(data);
  inicio.setHours(0, 0, 0, 0);
  inicio.setDate(inicio.getDate() - ((inicio.getDay() + 6) % 7));
  return inicio;
}

export function fimDaSemana(data: Date): Date {
  const fim = inicioDaSemana(data);
  fim.setDate(fim.getDate() + 6);
  fim.setHours(23, 59, 59, 999);
  return fim;
}

function concluidaNoPeriodo(atividade: AtividadeRotaSemanal, inicio: Date, fim: Date): boolean {
  if (atividade.status !== "concluido" || !atividade.dataConclusao) return false;
  const dataConclusao = new Date(atividade.dataConclusao);
  return !Number.isNaN(dataConclusao.getTime()) && dataConclusao >= inicio && dataConclusao <= fim;
}

export function organizarRotaSemanal<T extends AtividadeRotaSemanal>(atividades: T[], referencia = new Date()) {
  const inicioSemana = inicioDaSemana(referencia);
  const fimSemana = fimDaSemana(referencia);
  const concluidas = atividades
    .filter(atividade => concluidaNoPeriodo(atividade, inicioSemana, fimSemana))
    .sort((a, b) => new Date(b.dataConclusao!).getTime() - new Date(a.dataConclusao!).getTime());
  const emAndamento = atividades.filter(atividade => atividade.status === "em_andamento");
  const pendentes = atividades.filter(atividade => atividade.status === "pendente");

  return {
    inicioSemana,
    fimSemana,
    concluidas,
    emAndamento,
    pendentes,
    apsConcluidos: concluidas.reduce((total, atividade) => total + (atividade.qtdAp ?? 0), 0),
    atividades: [...concluidas, ...emAndamento, ...pendentes],
  };
}

export function filtrarAtividadesSemanais<T extends AtividadeRotaSemanal>(
  resumo: ReturnType<typeof organizarRotaSemanal<T>>,
  filtro: FiltroRotaSemanal,
): T[] {
  if (filtro === "todas") return resumo.atividades;
  if (filtro === "concluido") return resumo.concluidas;
  if (filtro === "em_andamento") return resumo.emAndamento;
  return resumo.pendentes;
}
