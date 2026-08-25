import { describe, expect, it } from "vitest";
import { decidirRotaInicialTecnico, ROTA_OS_TTL_MS } from "../shared/tecnicoRouteState";

const rotasMenu = ["/tecnico", "/tecnico/rota", "/tecnico/historico"];
const agora = 1_800_000_000_000;

describe("decidirRotaInicialTecnico", () => {
  it("retoma apenas a OS válida do mesmo namespace ao abrir a área técnica", () => {
    const decisao = decidirRotaInicialTecnico({
      localizacao: "/tecnico",
      rotaAtiva: "/tecnico/os/44",
      rotaAtivaEm: agora - 5_000,
      ultimoMenu: "/tecnico/rota",
      agora,
      rotasMenu,
    });

    expect(decisao).toEqual({ destino: "/tecnico/os/44", limparRotaAtiva: false });
  });

  it("descarta referência expirada e usa somente um menu técnico válido", () => {
    const decisao = decidirRotaInicialTecnico({
      localizacao: "/tecnico",
      rotaAtiva: "/tecnico/os/44",
      rotaAtivaEm: agora - ROTA_OS_TTL_MS - 1,
      ultimoMenu: "/tecnico/rota",
      agora,
      rotasMenu,
    });

    expect(decisao).toEqual({ destino: "/tecnico/rota", limparRotaAtiva: true });
  });

  it("não redireciona nem limpa a OS quando o técnico escolhe outra rota explicitamente", () => {
    const decisao = decidirRotaInicialTecnico({
      localizacao: "/tecnico/historico",
      rotaAtiva: "/tecnico/os/44",
      rotaAtivaEm: agora - 5_000,
      ultimoMenu: "/tecnico/rota",
      agora,
      rotasMenu,
    });

    expect(decisao).toEqual({ destino: null, limparRotaAtiva: false });
  });
});
