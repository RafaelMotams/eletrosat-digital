import { describe, expect, it } from "vitest";
import { filtrarAtividadesSemanais, organizarRotaSemanal } from "../shared/rotaSemanal";

describe("organizarRotaSemanal", () => {
  const referencia = new Date("2026-08-25T12:00:00");
  const atividades = [
    { id: 1, nome: "Escola concluída", status: "concluido", qtdAp: 3, dataConclusao: "2026-08-24T18:00:00" },
    { id: 2, nome: "Escola antiga", status: "concluido", qtdAp: 2, dataConclusao: "2026-08-16T18:00:00" },
    { id: 3, nome: "Escola em execução", status: "em_andamento", qtdAp: 1 },
    { id: 4, nome: "Escola pendente", status: "pendente", qtdAp: 4 },
    { id: 5, nome: "Escola não instalada", status: "nao_instalada", qtdAp: 1 },
  ];

  it("mantém na semana apenas conclusões ocorridas entre segunda e domingo", () => {
    const resumo = organizarRotaSemanal(atividades, referencia);

    expect(resumo.inicioSemana.getDay()).toBe(1);
    expect(resumo.fimSemana.getDay()).toBe(0);
    expect(resumo.concluidas.map(atividade => atividade.id)).toEqual([1]);
    expect(resumo.apsConcluidos).toBe(3);
  });

  it("organiza pendências reais sem incluir atividades encerradas fora da semana", () => {
    const resumo = organizarRotaSemanal(atividades, referencia);

    expect(resumo.emAndamento.map(atividade => atividade.id)).toEqual([3]);
    expect(resumo.pendentes.map(atividade => atividade.id)).toEqual([4]);
    expect(resumo.atividades.map(atividade => atividade.id)).toEqual([1, 3, 4]);
    expect(filtrarAtividadesSemanais(resumo, "pendente").map(atividade => atividade.id)).toEqual([4]);
  });

  it("distribui as conclusões reais nos dias corretos da semana", () => {
    const resumo = organizarRotaSemanal(atividades, referencia);
    const domingo = resumo.dias.find(dia => dia.numero === 24);
    const segunda = resumo.dias.find(dia => dia.numero === 25);

    expect(domingo?.concluidas).toBe(1);
    expect(domingo?.apsConcluidos).toBe(3);
    expect(segunda?.concluidas).toBe(0);
  });
});
