import { describe, expect, it } from "vitest";
import type { Escola } from "../drizzle/schema";
import { extractGoogleDriveFolderId } from "./googleDrive";
import { formatStructuredAnalysis } from "./routers/assistenteEace";
import { detectCategoria, matchEscola } from "./routers/redeExterna";

function school(id: number, inep: string, nome: string): Escola {
  return { id, inep, nome, tenantId: 1 } as Escola;
}

describe("identificação de fotos da rede externa", () => {
  const schools = [
    school(1, "29000001", "Escola Municipal São José"),
    school(2, "29000002", "Escola Estadual São José"),
    school(3, "29000003", "Centro Educacional Professora Maria da Luz"),
  ];

  it("prioriza o INEP de oito dígitos", () => {
    const result = matchEscola("29000002/fachada/foto.jpg", schools);
    expect(result.escola?.id).toBe(2);
    expect(result.metodo).toBe("inep");
  });

  it("não escolhe silenciosamente quando há nomes ambíguos", () => {
    const result = matchEscola("Sao Jose/roteador.jpg", schools);
    expect(result.escola).toBeNull();
    expect(result.metodo).toBe("revisao");
  });

  it("aceita nome completo e inequívoco", () => {
    const result = matchEscola("Centro Educacional Professora Maria da Luz/ONU.jpg", schools);
    expect(result.escola?.id).toBe(3);
    expect(result.metodo).toBe("nome_exato");
  });

  it("classifica roteador, travessia e testes pelo caminho", () => {
    expect(detectCategoria("rede externa/ONU principal.jpeg")).toBe("roteador_modem");
    expect(detectCategoria("bloco A/travessia subterranea/bloco B.jpg")).toBe("travessia");
    expect(detectCategoria("aceite/speedtest download upload.png")).toBe("teste_conexao");
  });
});

describe("pasta do Google Drive", () => {
  it("aceita link de pasta e ID isolado, mas rejeita texto solto", () => {
    const id = "1AbCdEfGhIjKlMnOpQrStUv";
    expect(extractGoogleDriveFolderId(`https://drive.google.com/drive/folders/${id}?usp=sharing`)).toBe(id);
    expect(extractGoogleDriveFolderId(id)).toBe(id);
    expect(extractGoogleDriveFolderId("minha pasta de fotos")).toBeNull();
  });
});

describe("resposta estruturada do Assistente EACE", () => {
  it("mantém opções, riscos e validação visíveis para o técnico", () => {
    const formatted = formatStructuredAnalysis(JSON.stringify({
      observacoes: ["Há dois blocos no relato"],
      faltasConfirmar: ["Medir a distância"],
      opcoes: [
        { titulo: "Rota subterrânea", vantagem: "Proteção", risco: "Obra civil", condicao: "Duto aprovado" },
        { titulo: "Rota aérea", vantagem: "Execução rápida", risco: "Intempéries", condicao: "Projeto e ancoragem aprovados" },
      ],
      recomendacao: "Decidir após vistoria e projeto.",
      comoValidar: ["Registrar fotos e testes"],
      classificacoes: ["[Projeto/POP vigente] Método de travessia"],
      alertaSeguranca: "Não improvisar trabalho em altura.",
    }));
    expect(formatted).toContain("1) Rota subterrânea");
    expect(formatted).toContain("2) Rota aérea");
    expect(formatted).toContain("Risco: Intempéries");
    expect(formatted).toContain("Como validar");
  });
});
