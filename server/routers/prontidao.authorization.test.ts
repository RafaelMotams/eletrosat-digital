import { describe, expect, it } from "vitest";
import { avaliarProntidaoVisitas } from "@shared/prontidaoVisita";
import {
  coberturaPorTecnico,
  montarVisitasAvaliaveis,
  prontidaoRouter,
  somarSaldoApPorTecnico,
  type FichaEscolaProntidao,
} from "./prontidao";

function caller(tenantSession?: {
  adminId: number;
  tenantId: number;
  role: string;
  isSuperAdmin: boolean;
}) {
  return prontidaoRouter.createCaller({
    tenantSession,
    req: { headers: { cookie: "" } } as never,
    res: {} as never,
  } as never);
}

function ficha(sobrescritas: Partial<FichaEscolaProntidao> = {}): FichaEscolaProntidao {
  return {
    escolaId: 1,
    nome: "Escola Municipal Riacho Fundo",
    inep: "29000001",
    municipio: "Monte Santo",
    uf: "BA",
    status: "pendente",
    latitude: "-10.43712000",
    longitude: "-39.33150000",
    endereco: "Povoado Riacho Fundo, s/n, zona rural",
    telefone: "75988887777",
    telefoneWhatsApp: null,
    qtdAp: 2,
    apAdicional: null,
    motivoNaoInstalacao: null,
    tecnicoId: 501,
    tecnicoNome: "Rodrigo Alves",
    tecnicoAtivo: true,
    ...sobrescritas,
  };
}

function fontes(sobrescritas: Partial<Parameters<typeof montarVisitasAvaliaveis>[0]> = {}) {
  return {
    fichas: [ficha()],
    ordensAbertas: [],
    manutencoesPendentes: [],
    saldoApPorTecnico: new Map<number, number>(),
    ...sobrescritas,
  };
}

describe("prontidão: autorização", () => {
  it("nega o painel administrativo sem sessão de tenant", async () => {
    await expect(caller().painel()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("nega as visitas do técnico sem sessão assinada", async () => {
    await expect(caller().minhasVisitas()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("permite consulta do perfil visualizador porque o painel é somente leitura", async () => {
    // Sem banco configurado no ambiente de teste, passar da autorização e parar
    // na indisponibilidade do banco confirma que o visualizador não é barrado.
    await expect(
      caller({ adminId: 77, tenantId: 7001, role: "viewer", isSuperAdmin: false }).painel()
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
  });

  it("rejeita filtro fora do contrato antes de tocar o banco", async () => {
    await expect(
      caller({ adminId: 77, tenantId: 7001, role: "admin", isSuperAdmin: false }).painel({
        classificacao: "inexistente" as never,
      })
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("prontidão: correlação das fontes de dados", () => {
  it("usa a ordem mais antiga da escola para medir visita sem desfecho", () => {
    const visitas = montarVisitasAvaliaveis(
      fontes({
        ordensAbertas: [
          { escolaId: 1, status: "em_andamento", dataAbertura: "2026-02-01T10:00:00Z" },
          { escolaId: 1, status: "aberta", dataAbertura: "2026-01-05T10:00:00Z" },
        ],
      })
    );

    expect(visitas[0].osAbertaEm).toBe("2026-01-05T10:00:00Z");
    expect(visitas[0].osStatus).toBe("aberta");
  });

  it("calcula a reincidência do município sobre a carteira inteira", () => {
    const visitas = montarVisitasAvaliaveis(
      fontes({
        fichas: [
          ficha({ escolaId: 1 }),
          ficha({ escolaId: 2, status: "nao_instalada" }),
          ficha({ escolaId: 3, status: "concluido" }),
          ficha({ escolaId: 4, municipio: "Campo Formoso" }),
        ],
      })
    );

    expect(visitas[0].escolasNoMunicipio).toBe(3);
    expect(visitas[0].taxaNaoInstalacaoMunicipio).toBeCloseTo(1 / 3);
    expect(visitas[3].escolasNoMunicipio).toBe(1);
  });

  it("não confunde estoque não rastreado com mochila vazia", () => {
    const semRastreio = montarVisitasAvaliaveis(fontes());
    const comRastreio = montarVisitasAvaliaveis(
      fontes({ saldoApPorTecnico: new Map([[501, 0]]) })
    );

    expect(semRastreio[0].apDisponivelTecnico).toBeNull();
    expect(comRastreio[0].apDisponivelTecnico).toBe(0);
  });

  it("associa manutenções pendentes à escola correta", () => {
    const visitas = montarVisitasAvaliaveis(
      fontes({
        fichas: [ficha({ escolaId: 1 }), ficha({ escolaId: 2 })],
        manutencoesPendentes: [
          { escolaId: 2, total: "3" },
          { escolaId: null, total: "9" },
        ],
      })
    );

    expect(visitas[0].manutencoesPendentes).toBe(0);
    expect(visitas[1].manutencoesPendentes).toBe(3);
  });
});

describe("prontidão: saldo de pontos de acesso", () => {
  const catalogo = [
    { id: 10, codigo: "AP-EAP225", nome: "Access Point TP-Link", categoria: "Rede" },
    { id: 11, codigo: "CAB-CAT6", nome: "Cabo CAT6", categoria: "Cabeamento" },
  ];

  it("soma apenas materiais reconhecidos como ponto de acesso", () => {
    const saldo = somarSaldoApPorTecnico(catalogo, [
      { materialId: 10, holderId: 501, quantidade: "2.000" },
      { materialId: 10, holderId: 501, quantidade: "1.000" },
      { materialId: 11, holderId: 501, quantidade: "305.000" },
      { materialId: 10, holderId: 502, quantidade: "4.000" },
    ]);

    expect(saldo.get(501)).toBe(3);
    expect(saldo.get(502)).toBe(4);
  });

  it("devolve mapa vazio quando o catálogo não tem AP cadastrado", () => {
    const saldo = somarSaldoApPorTecnico(
      [{ id: 11, codigo: "CAB-CAT6", nome: "Cabo CAT6", categoria: "Cabeamento" }],
      [{ materialId: 11, holderId: 501, quantidade: "10" }]
    );

    expect(saldo.size).toBe(0);
  });
});

describe("prontidão: cobertura de material por técnico", () => {
  it("prioriza o técnico com maior falta de material na rota", () => {
    const avaliadas = avaliarProntidaoVisitas(
      montarVisitasAvaliaveis(
        fontes({
          fichas: [
            ficha({ escolaId: 1, qtdAp: 4, tecnicoId: 501, tecnicoNome: "Rodrigo" }),
            ficha({ escolaId: 2, qtdAp: 2, tecnicoId: 502, tecnicoNome: "Marina" }),
          ],
          saldoApPorTecnico: new Map([
            [501, 1],
            [502, 2],
          ]),
        })
      )
    );

    const cobertura = coberturaPorTecnico(avaliadas);

    expect(cobertura[0].tecnicoId).toBe(501);
    expect(cobertura[0].apFaltantes).toBe(3);
    expect(cobertura[1].suficiente).toBe(true);
  });
});
