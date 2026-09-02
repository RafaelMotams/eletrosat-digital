import { describe, expect, it } from "vitest";
import {
  apPlanejados,
  avaliarCoberturaRota,
  avaliarProntidaoVisita,
  avaliarProntidaoVisitas,
  contatoUtilizavel,
  identificarMaterialAp,
  possuiGeorreferencia,
  resumirProntidao,
  type VisitaAvaliavel,
} from "@shared/prontidaoVisita";

const AGORA = new Date("2026-03-10T12:00:00.000Z");

function visita(sobrescritas: Partial<VisitaAvaliavel> = {}): VisitaAvaliavel {
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
    qtdAp: 3,
    apAdicional: null,
    tecnicoId: 501,
    tecnicoNome: "Rodrigo Alves",
    tecnicoAtivo: true,
    motivoNaoInstalacao: null,
    osStatus: null,
    osAbertaEm: null,
    apDisponivelTecnico: 6,
    manutencoesPendentes: 0,
    taxaNaoInstalacaoMunicipio: 0,
    escolasNoMunicipio: 30,
    ...sobrescritas,
  };
}

function codigos(avaliacao: { sinais: Array<{ codigo: string }> }): string[] {
  return avaliacao.sinais.map(sinal => sinal.codigo);
}

describe("prontidão de visita: aptidão para o deslocamento", () => {
  it("classifica como pronta a escola com localização, contato, técnico e material", () => {
    const avaliacao = avaliarProntidaoVisita(visita(), undefined, AGORA);

    expect(avaliacao.classificacao).toBe("pronta");
    expect(avaliacao.pontuacao).toBe(100);
    expect(avaliacao.sinais).toHaveLength(0);
    expect(avaliacao.resumo).toContain("conferidos");
  });

  it("ignora escola já concluída porque não há visita a planejar", () => {
    const avaliacao = avaliarProntidaoVisita(
      visita({ status: "concluido", telefone: null, latitude: null, longitude: null }),
      undefined,
      AGORA
    );

    expect(avaliacao.classificacao).toBe("nao_aplicavel");
    expect(avaliacao.sinais).toHaveLength(0);
  });

  it("bloqueia a visita quando não há coordenada nem endereço navegável", () => {
    const avaliacao = avaliarProntidaoVisita(
      visita({ latitude: null, longitude: null, endereco: "Zona rural" }),
      undefined,
      AGORA
    );

    expect(avaliacao.classificacao).toBe("bloqueada");
    expect(codigos(avaliacao)).toContain("localizacao_desconhecida");
    expect(codigos(avaliacao)).not.toContain("sem_georreferencia");
    expect(codigos(avaliacao)).not.toContain("endereco_incompleto");
  });

  it("apenas alerta quando falta GPS mas o endereço é navegável", () => {
    const avaliacao = avaliarProntidaoVisita(
      visita({ latitude: null, longitude: null }),
      undefined,
      AGORA
    );

    expect(avaliacao.classificacao).toBe("atencao");
    expect(codigos(avaliacao)).toEqual(["sem_georreferencia"]);
    expect(avaliacao.pontuacao).toBe(80);
  });

  it("trata coordenada zerada como resíduo de importação, não localização", () => {
    expect(possuiGeorreferencia(visita({ latitude: "0", longitude: "0" }))).toBe(false);
    expect(possuiGeorreferencia(visita({ latitude: "-10.4", longitude: "-39.3" }))).toBe(true);
    expect(possuiGeorreferencia(visita({ latitude: "999", longitude: "-39.3" }))).toBe(false);
    expect(possuiGeorreferencia(visita({ latitude: "abc", longitude: "-39.3" }))).toBe(false);
  });

  it("alerta quando não há telefone nem WhatsApp para confirmar a abertura da escola", () => {
    const avaliacao = avaliarProntidaoVisita(
      visita({ telefone: "  ", telefoneWhatsApp: null }),
      undefined,
      AGORA
    );

    expect(codigos(avaliacao)).toContain("sem_contato");
    expect(avaliacao.classificacao).toBe("atencao");
  });

  it("aceita o WhatsApp como contato válido", () => {
    expect(contatoUtilizavel(null, "(75) 98888-7777")).toBe(true);
    expect(contatoUtilizavel("123", null)).toBe(false);
    expect(contatoUtilizavel(null, null)).toBe(false);
  });

  it("bloqueia quando a escola não tem técnico responsável", () => {
    const avaliacao = avaliarProntidaoVisita(
      visita({ tecnicoId: null, tecnicoNome: null }),
      undefined,
      AGORA
    );

    expect(avaliacao.classificacao).toBe("bloqueada");
    expect(codigos(avaliacao)).toContain("sem_tecnico");
  });

  it("bloqueia quando o técnico responsável está inativo", () => {
    const avaliacao = avaliarProntidaoVisita(
      visita({ tecnicoAtivo: false }),
      undefined,
      AGORA
    );

    expect(avaliacao.classificacao).toBe("bloqueada");
    expect(codigos(avaliacao)).toContain("tecnico_inativo");
  });

  it("bloqueia quando o material do técnico não cobre os APs previstos", () => {
    const avaliacao = avaliarProntidaoVisita(
      visita({ qtdAp: 4, apAdicional: 2, apDisponivelTecnico: 2 }),
      undefined,
      AGORA
    );

    const sinal = avaliacao.sinais.find(item => item.codigo === "material_insuficiente");
    expect(avaliacao.classificacao).toBe("bloqueada");
    expect(sinal?.detalhe).toContain("6 pontos de acesso");
    expect(sinal?.acao).toContain("4 pontos de acesso");
  });

  it("não bloqueia por material quando o saldo cobre exatamente o previsto", () => {
    const avaliacao = avaliarProntidaoVisita(
      visita({ qtdAp: 3, apDisponivelTecnico: 3 }),
      undefined,
      AGORA
    );

    expect(avaliacao.classificacao).toBe("pronta");
  });

  it("informa sem bloquear quando nenhum material foi identificado como AP", () => {
    const avaliacao = avaliarProntidaoVisita(
      visita({ apDisponivelTecnico: null }),
      undefined,
      AGORA
    );

    const sinal = avaliacao.sinais.find(item => item.codigo === "material_nao_rastreado");
    expect(sinal?.severidade).toBe("informativo");
    expect(avaliacao.classificacao).toBe("pronta");
    expect(avaliacao.pontuacao).toBe(100);
  });

  it("alerta quando o escopo de APs não está definido", () => {
    const avaliacao = avaliarProntidaoVisita(
      visita({ qtdAp: 0, apAdicional: null }),
      undefined,
      AGORA
    );

    expect(codigos(avaliacao)).toContain("escopo_indefinido");
    expect(codigos(avaliacao)).not.toContain("material_insuficiente");
  });

  it("soma APs principais e adicionais no escopo previsto", () => {
    expect(apPlanejados(visita({ qtdAp: 2, apAdicional: 3 }))).toBe(5);
    expect(apPlanejados(visita({ qtdAp: null, apAdicional: null }))).toBe(0);
    expect(apPlanejados(visita({ qtdAp: -4, apAdicional: null }))).toBe(0);
  });

  it("bloqueia quando já existe impedimento registrado em campo", () => {
    const avaliacao = avaliarProntidaoVisita(
      visita({ status: "nao_instalada", motivoNaoInstalacao: "em_reforma" }),
      undefined,
      AGORA
    );

    const sinal = avaliacao.sinais.find(item => item.codigo === "impedimento_registrado");
    expect(avaliacao.classificacao).toBe("bloqueada");
    expect(sinal?.detalhe).toContain("em reforma");
  });

  it("alerta quando a ordem está aberta há mais dias que o limite configurado", () => {
    const avaliacao = avaliarProntidaoVisita(
      visita({ osStatus: "em_andamento", osAbertaEm: "2026-02-20T12:00:00.000Z" }),
      undefined,
      AGORA
    );

    const sinal = avaliacao.sinais.find(item => item.codigo === "visita_sem_desfecho");
    expect(sinal?.detalhe).toContain("18 dias");
  });

  it("não alerta por ordem recente nem por ordem já concluída", () => {
    const recente = avaliarProntidaoVisita(
      visita({ osStatus: "aberta", osAbertaEm: "2026-03-08T12:00:00.000Z" }),
      undefined,
      AGORA
    );
    const concluida = avaliarProntidaoVisita(
      visita({ osStatus: "concluida", osAbertaEm: "2026-01-01T12:00:00.000Z" }),
      undefined,
      AGORA
    );

    expect(codigos(recente)).not.toContain("visita_sem_desfecho");
    expect(codigos(concluida)).not.toContain("visita_sem_desfecho");
  });

  it("alerta sobre município reincidente somente com amostra significativa", () => {
    const comAmostra = avaliarProntidaoVisita(
      visita({ taxaNaoInstalacaoMunicipio: 0.4, escolasNoMunicipio: 10 }),
      undefined,
      AGORA
    );
    const semAmostra = avaliarProntidaoVisita(
      visita({ taxaNaoInstalacaoMunicipio: 1, escolasNoMunicipio: 2 }),
      undefined,
      AGORA
    );

    expect(codigos(comAmostra)).toContain("municipio_reincidente");
    expect(codigos(semAmostra)).not.toContain("municipio_reincidente");
  });

  it("sugere agrupar manutenção pendente sem penalizar a pontuação", () => {
    const avaliacao = avaliarProntidaoVisita(
      visita({ manutencoesPendentes: 2 }),
      undefined,
      AGORA
    );

    expect(codigos(avaliacao)).toContain("manutencao_pendente");
    expect(avaliacao.pontuacao).toBe(100);
    expect(avaliacao.classificacao).toBe("pronta");
  });

  it("mantém a pontuação entre 0 e 100 mesmo com muitos impedimentos", () => {
    const avaliacao = avaliarProntidaoVisita(
      visita({
        status: "nao_instalada",
        motivoNaoInstalacao: "escola_desativada",
        latitude: null,
        longitude: null,
        endereco: null,
        telefone: null,
        tecnicoId: null,
        qtdAp: 0,
      }),
      undefined,
      AGORA
    );

    expect(avaliacao.pontuacao).toBe(0);
    expect(avaliacao.classificacao).toBe("bloqueada");
  });

  it("resume a visita pelo sinal de maior peso", () => {
    const avaliacao = avaliarProntidaoVisita(
      visita({ tecnicoId: null, telefone: null }),
      undefined,
      AGORA
    );

    expect(avaliacao.sinais[0].codigo).toBe("sem_tecnico");
    expect(avaliacao.resumo).toContain("Nenhum técnico responsável");
  });
});

describe("prontidão de visita: ordenação e resumo da carteira", () => {
  const carteira = [
    visita({ escolaId: 1, nome: "Escola A" }),
    visita({ escolaId: 2, nome: "Escola B", tecnicoId: null }),
    visita({ escolaId: 3, nome: "Escola C", telefone: null }),
    visita({ escolaId: 4, nome: "Escola D", status: "concluido" }),
    visita({
      escolaId: 5,
      nome: "Escola E",
      latitude: null,
      longitude: null,
      endereco: null,
      telefone: null,
    }),
  ];

  it("ordena bloqueadas primeiro e piores pontuações no topo", () => {
    const avaliadas = avaliarProntidaoVisitas(carteira, undefined, AGORA);

    expect(avaliadas.map(a => a.escolaId)).toEqual([5, 2, 3, 1, 4]);
  });

  it("resume a carteira separando o que é evitável antes da saída", () => {
    const resumo = resumirProntidao(avaliarProntidaoVisitas(carteira, undefined, AGORA));

    expect(resumo.avaliadas).toBe(4);
    expect(resumo.naoAplicaveis).toBe(1);
    expect(resumo.bloqueadas).toBe(2);
    expect(resumo.atencao).toBe(1);
    expect(resumo.prontas).toBe(1);
    // A escola 2 não tem técnico: não há deslocamento programado para evitar.
    expect(resumo.deslocamentosEvitaveis).toBe(1);
    expect(resumo.sinaisFrequentes[0].codigo).toBe("sem_contato");
    expect(resumo.sinaisFrequentes[0].ocorrencias).toBe(2);
  });

  it("devolve carteira vazia sem quebrar o resumo", () => {
    const resumo = resumirProntidao([]);

    expect(resumo.avaliadas).toBe(0);
    expect(resumo.pontuacaoMedia).toBe(100);
    expect(resumo.sinaisFrequentes).toEqual([]);
  });
});

describe("prontidão de visita: cobertura de material da rota", () => {
  it("detecta mochila insuficiente para a soma das visitas do técnico", () => {
    const avaliadas = avaliarProntidaoVisitas(
      [
        visita({ escolaId: 1, qtdAp: 3, apDisponivelTecnico: 4 }),
        visita({ escolaId: 2, qtdAp: 2, apDisponivelTecnico: 4 }),
      ],
      undefined,
      AGORA
    );

    const cobertura = avaliarCoberturaRota(501, "Rodrigo Alves", avaliadas, 4);

    expect(cobertura.apNecessarios).toBe(5);
    expect(cobertura.apFaltantes).toBe(1);
    expect(cobertura.suficiente).toBe(false);
  });

  it("desconsidera escolas concluídas e de outros técnicos", () => {
    const avaliadas = avaliarProntidaoVisitas(
      [
        visita({ escolaId: 1, qtdAp: 3 }),
        visita({ escolaId: 2, qtdAp: 5, status: "concluido" }),
        visita({ escolaId: 3, qtdAp: 7, tecnicoId: 999 }),
      ],
      undefined,
      AGORA
    );

    const cobertura = avaliarCoberturaRota(501, "Rodrigo Alves", avaliadas, 3);

    expect(cobertura.visitasPlanejadas).toBe(1);
    expect(cobertura.apNecessarios).toBe(3);
    expect(cobertura.suficiente).toBe(true);
  });

  it("não afirma suficiência quando o material não é rastreado", () => {
    const avaliadas = avaliarProntidaoVisitas([visita({ qtdAp: 3 })], undefined, AGORA);
    const cobertura = avaliarCoberturaRota(501, "Rodrigo Alves", avaliadas, null);

    expect(cobertura.rastreado).toBe(false);
    expect(cobertura.apDisponiveis).toBeNull();
    expect(cobertura.apFaltantes).toBe(0);
  });
});

describe("prontidão de visita: identificação de material de AP", () => {
  it("reconhece pela categoria do catálogo", () => {
    expect(identificarMaterialAp({ categoria: "AP", nome: "Unifi U6", codigo: "X1" })).toBe(true);
    expect(identificarMaterialAp({ categoria: "Access Point", nome: "EAP225", codigo: "X2" })).toBe(true);
  });

  it("reconhece pelo nome ou código quando a categoria não ajuda", () => {
    expect(identificarMaterialAp({ categoria: "Rede", nome: "Ponto de acesso TP-Link", codigo: "TL-1" })).toBe(true);
    expect(identificarMaterialAp({ categoria: null, nome: "AP interno", codigo: "EAP-225" })).toBe(true);
    expect(identificarMaterialAp({ categoria: null, nome: null, codigo: "AP-001" })).toBe(true);
  });

  it("não confunde materiais que apenas contêm as letras AP", () => {
    expect(identificarMaterialAp({ categoria: "Fixação", nome: "Grampo de fixação", codigo: "GRP-01" })).toBe(false);
    expect(identificarMaterialAp({ categoria: "Cabeamento", nome: "Cabo CAT6", codigo: "CAB-CAT6" })).toBe(false);
    expect(identificarMaterialAp({ categoria: "Consumo", nome: "Papel adesivo", codigo: "PAP-02" })).toBe(false);
  });
});
