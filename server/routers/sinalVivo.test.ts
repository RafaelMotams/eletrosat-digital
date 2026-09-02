import { describe, expect, it } from "vitest";
import {
  decidirTriagem,
  detectarIncidenteRegional,
  escolasEmSilencio,
  montarDescricaoManutencao,
  resumoSaude,
} from "../../shared/sinalVivo";
import { sinalVivoRouter } from "./sinalVivo";

function caller(tenantSession?: { adminId: number; tenantId: number; role: string; isSuperAdmin: boolean }) {
  return sinalVivoRouter.createCaller({
    tenantSession,
    req: { headers: { cookie: "" }, ip: "127.0.0.1" } as never,
    res: {} as never,
  } as never);
}

describe("SinalVivo: triagem inteligente", () => {
  it("registra conectividade saudável sem sugerir manutenção", () => {
    const decisao = decidirTriagem({
      status: "ok",
      temEnergia: true,
      ledsModemOk: true,
      vizinhosTambem: false,
    });
    expect(decisao.classificacao).toBe("saudavel");
    expect(decisao.criarManutencaoSugerida).toBe(false);
  });

  it("prioriza autoajuda quando não há energia", () => {
    const decisao = decidirTriagem({
      status: "offline",
      temEnergia: false,
      ledsModemOk: null,
      vizinhosTambem: null,
    });
    expect(decisao.classificacao).toBe("autoajuda");
    expect(decisao.criarManutencaoSugerida).toBe(false);
    expect(decisao.guiaAutoajuda.length).toBeGreaterThan(0);
  });

  it("suspeita do provedor quando vizinhos também estão offline", () => {
    const decisao = decidirTriagem({
      status: "offline",
      temEnergia: true,
      ledsModemOk: true,
      vizinhosTambem: true,
    });
    expect(decisao.classificacao).toBe("suspeita_provedor");
    expect(decisao.criarManutencaoSugerida).toBe(false);
  });

  it("sugere chamado local para falha isolada com modem em falha persistente", () => {
    const decisao = decidirTriagem({
      status: "offline",
      temEnergia: true,
      ledsModemOk: null,
      vizinhosTambem: false,
    });
    expect(decisao.classificacao).toBe("chamado_local");
    expect(decisao.criarManutencaoSugerida).toBe(true);
  });
});

describe("SinalVivo: incidente regional e silêncio", () => {
  it("detecta incidente quando 3+ escolas do município falham", () => {
    const resultado = detectarIncidenteRegional({
      municipio: "Monte Santo",
      pulsosRecentes: [
        { municipio: "Monte Santo", status: "offline", escolaId: 1 },
        { municipio: "Monte Santo", status: "lento", escolaId: 2 },
        { municipio: "monte santo", status: "offline", escolaId: 3 },
        { municipio: "Ourolândia", status: "offline", escolaId: 9 },
      ],
    });
    expect(resultado.incidente).toBe(true);
    expect(resultado.escolasAfetadas).toBe(3);
  });

  it("não dispara incidente abaixo do limiar", () => {
    const resultado = detectarIncidenteRegional({
      municipio: "Monte Santo",
      pulsosRecentes: [
        { municipio: "Monte Santo", status: "offline", escolaId: 1 },
        { municipio: "Monte Santo", status: "ok", escolaId: 2 },
      ],
    });
    expect(resultado.incidente).toBe(false);
  });

  it("lista escolas instaladas sem pulso recente", () => {
    const agora = new Date("2026-09-02T12:00:00Z");
    const silencio = escolasEmSilencio({
      agora,
      diasSemPulso: 3,
      escolas: [
        { id: 1, nome: "Escola A", status: "concluido", ultimoPulsoEm: new Date("2026-08-20T12:00:00Z") },
        { id: 2, nome: "Escola B", status: "concluido", ultimoPulsoEm: new Date("2026-09-01T12:00:00Z") },
        { id: 3, nome: "Escola C", status: "pendente", ultimoPulsoEm: null },
        { id: 4, nome: "Escola D", status: "concluido", ultimoPulsoEm: null },
      ],
    });
    expect(silencio.map((e) => e.id)).toEqual([4, 1]);
  });

  it("calcula índice de saúde ponderado", () => {
    expect(resumoSaude([{ status: "ok" }, { status: "ok" }, { status: "lento" }, { status: "offline" }]).indiceSaude).toBe(63);
  });

  it("monta descrição auditável para manutenção", () => {
    const texto = montarDescricaoManutencao({
      status: "offline",
      classificacao: "chamado_local",
      relato: "Wi-Fi sumiu na sala dos professores",
      contatoNome: "Maria",
    });
    expect(texto).toContain("[SinalVivo]");
    expect(texto).toContain("Maria");
    expect(texto).toContain("Wi-Fi sumiu");
  });
});

describe("SinalVivo: autorização", () => {
  it("nega painel sem sessão de tenant", async () => {
    await expect(caller().painel()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("nega resolução de incidente pelo visualizador", async () => {
    await expect(
      caller({ adminId: 7, tenantId: 11, role: "viewer", isSuperAdmin: false }).resolverIncidente({ id: 1 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("nega listagem administrativa sem autenticação", async () => {
    await expect(caller().listarPulsos()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
