import { describe, expect, it } from "vitest";
import { escanearImpedimentos } from "@shared/radarImpedimentos";

describe("Radar de Impedimentos", () => {
  const agora = new Date("2026-09-02T12:00:00.000Z");

  it("prioriza bloqueios críticos e calcula saúde operacional", () => {
    const result = escanearImpedimentos({
      agora,
      escolas: [
        {
          id: 1,
          nome: "Escola Sem Rota",
          status: "pendente",
          ativo: true,
          tecnicoId: null,
          latitude: null,
          longitude: null,
          telefone: null,
          qtdAp: 4,
        },
        {
          id: 2,
          nome: "Escola Completa",
          status: "pendente",
          ativo: true,
          tecnicoId: 10,
          latitude: "-11.1",
          longitude: "-40.2",
          telefone: "75999998888",
          qtdAp: 2,
        },
      ],
      ordens: [
        {
          id: 100,
          escolaId: 2,
          tecnicoId: 10,
          status: "aberta",
          dataAbertura: "2026-08-20T12:00:00.000Z",
        },
        {
          id: 101,
          escolaId: 2,
          tecnicoId: 10,
          status: "concluida",
          qtdApInstalado: 1,
          dataAbertura: "2026-08-01T12:00:00.000Z",
          dataConclusao: "2026-08-10T12:00:00.000Z",
          fotoMapaCalorUrl: null,
          fotoMapaCalorKey: null,
        },
      ],
      manutencoes: [
        {
          id: 7,
          status: "pendente",
          tecnicoId: null,
          escolaNome: "Ponto Rural",
          descricaoProblema: "Switch offline",
          createdAt: "2026-08-25T12:00:00.000Z",
        },
      ],
      saldos: [
        {
          materialId: 5,
          materialNome: "AP Omada",
          estoqueMinimo: 10,
          holderType: "almoxarifado",
          holderId: 0,
          quantidade: 0,
        },
      ],
      solicitacoes: [
        {
          id: 3,
          tecnicoId: 10,
          materialId: 5,
          materialNome: "AP Omada",
          status: "aberta",
          quantidadeSolicitada: 4,
          quantidadeAtendida: 0,
          createdAt: "2026-08-28T12:00:00.000Z",
        },
      ],
      tecnicos: [{ id: 10, nome: "João Campo", ativo: true }],
      diasOsParada: 5,
      diasManutencaoParada: 3,
      diasReposicaoAberta: 2,
    });

    expect(result.resumo.total).toBeGreaterThan(0);
    expect(result.resumo.criticos).toBeGreaterThan(0);
    expect(result.resumo.scoreSaude).toBeLessThan(100);
    expect(result.impedimentos[0].score).toBeGreaterThanOrEqual(result.impedimentos.at(-1)!.score);

    const tipos = new Set(result.impedimentos.map((i) => i.tipo));
    expect(tipos.has("escola_sem_coordenadas")).toBe(true);
    expect(tipos.has("escola_sem_tecnico")).toBe(true);
    expect(tipos.has("os_parada")).toBe(true);
    expect(tipos.has("deficit_ap")).toBe(true);
    expect(tipos.has("evidencia_ausente")).toBe(true);
    expect(tipos.has("manutencao_parada")).toBe(true);
    expect(tipos.has("estoque_critico")).toBe(true);
    expect(tipos.has("reposicao_aberta")).toBe(true);
  });

  it("não inventa impedimentos quando a operação está saudável", () => {
    const result = escanearImpedimentos({
      agora,
      escolas: [
        {
          id: 1,
          nome: "Escola OK",
          status: "pendente",
          ativo: true,
          tecnicoId: 1,
          latitude: "-12",
          longitude: "-38",
          telefone: "71988887777",
          qtdAp: 2,
        },
      ],
      ordens: [
        {
          id: 1,
          escolaId: 1,
          tecnicoId: 1,
          status: "aberta",
          dataAbertura: "2026-09-01T12:00:00.000Z",
        },
      ],
      manutencoes: [],
      saldos: [
        {
          materialId: 1,
          materialNome: "Cabo",
          estoqueMinimo: 5,
          holderType: "almoxarifado",
          holderId: 0,
          quantidade: 20,
        },
      ],
      solicitacoes: [],
      tecnicos: [{ id: 1, nome: "Ana", ativo: true }],
    });

    expect(result.resumo.total).toBe(0);
    expect(result.resumo.scoreSaude).toBe(100);
    expect(result.impedimentos).toEqual([]);
  });

  it("ignora escolas inativas ou já concluídas para bloqueios de cadastro", () => {
    const result = escanearImpedimentos({
      agora,
      escolas: [
        {
          id: 1,
          nome: "Concluída",
          status: "concluido",
          ativo: true,
          tecnicoId: null,
          latitude: null,
          longitude: null,
          telefone: null,
        },
        {
          id: 2,
          nome: "Inativa",
          status: "pendente",
          ativo: false,
          tecnicoId: null,
          latitude: null,
          longitude: null,
          telefone: null,
        },
      ],
      ordens: [],
      manutencoes: [],
      saldos: [],
      solicitacoes: [],
      tecnicos: [],
    });

    expect(result.impedimentos.filter((i) => i.tipo.startsWith("escola_"))).toHaveLength(0);
  });

  it("sinaliza sobrecarga apenas acima do limite configurado", () => {
    const ordens = Array.from({ length: 13 }, (_, i) => ({
      id: i + 1,
      escolaId: i + 1,
      tecnicoId: 9,
      status: "aberta" as const,
      dataAbertura: "2026-09-01T12:00:00.000Z",
    }));

    const result = escanearImpedimentos({
      agora,
      escolas: ordens.map((o) => ({
        id: o.escolaId,
        nome: `E${o.escolaId}`,
        status: "pendente",
        ativo: true,
        tecnicoId: 9,
        latitude: "1",
        longitude: "1",
        telefone: "75999990000",
      })),
      ordens,
      manutencoes: [],
      saldos: [],
      solicitacoes: [],
      tecnicos: [{ id: 9, nome: "Carlos", ativo: true }],
      limiteOsPorTecnico: 12,
    });

    expect(result.impedimentos.some((i) => i.tipo === "tecnico_sobrecarga")).toBe(true);
  });
});
