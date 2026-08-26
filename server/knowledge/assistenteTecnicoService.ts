import { invokeLLM } from "../_core/llm";
import { sanitizeEvidenceImage } from "../_core/evidenceImage";
import { ASSISTENTE_TECNICO_BASE, ASSISTENTE_TECNICO_BASE_VERSAO, FONTES_ASSISTENTE_TECNICO } from "./assistenteTecnicoBase";

export type AssistenteTecnicoEntrada = {
  pergunta: string;
  assunto?: "rede" | "wifi" | "cabeamento" | "fibra" | "energia" | "rack" | "outro";
  imagemBase64?: string;
  mimeType?: "image/jpeg" | "image/png" | "image/webp";
};

export const POLITICA_ASSISTENTE_TECNICO = `
Você é o Assistente Técnico Netvius, um orientador cuidadoso para equipes de infraestrutura em campo.

${ASSISTENTE_TECNICO_BASE}

Regras adicionais:
- Responda em português claro, sem alegar ser absoluto ou infalível.
- Só cite modelo, comando, parâmetro, firmware, norma ou procedimento específico quando estiver confirmado no contexto ou em fonte oficial indicada.
- Separe fatos observáveis de hipóteses. Quando faltar contexto, peça somente os dados técnicos mínimos e indique a fonte oficial aplicável.
- Não trate imagem como prova conclusiva: descreva apenas o que é visível e diga quando uma inspeção presencial é necessária.
- Nunca solicite credenciais, senhas, tokens, IPs públicos, dados de outro cliente ou dados pessoais.
- Para energia, altura, fibra óptica, calor, cheiro de queimado ou dano físico, priorize parar, isolar o risco e escalar ao responsável técnico.
`;

function contentToText(content: unknown): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) return content.map((item: any) => item?.text ?? "").join("");
  return "Não foi possível gerar uma orientação agora. Tente novamente com mais contexto técnico.";
}

/**
 * A imagem é higienizada em memória e enviada somente na chamada atual ao modelo.
 * Não há gravação em banco, storage ou cache pelo fluxo de consulta independente.
 */
export async function responderAssistenteTecnico(input: AssistenteTecnicoEntrada) {
  const pergunta = input.pergunta.trim();
  const contextoAssunto = input.assunto && input.assunto !== "outro" ? `Assunto informado: ${input.assunto}.` : "";
  let userContent: string | Array<{ type: "text"; text: string } | { type: "image_url"; image_url: { url: string; detail: "auto" } }> = `${contextoAssunto}\nPergunta: ${pergunta}`;

  if (input.imagemBase64 && input.mimeType) {
    const sanitized = await sanitizeEvidenceImage(input.imagemBase64, input.mimeType);
    const imageUrl = `data:image/jpeg;base64,${sanitized.toString("base64")}`;
    userContent = [
      { type: "text", text: `${contextoAssunto}\nPergunta: ${pergunta}\nA imagem é temporária e deve ser analisada apenas pelo que estiver visível.` },
      { type: "image_url", image_url: { url: imageUrl, detail: "auto" } },
    ];
  }

  const response = await invokeLLM({
    messages: [
      { role: "system", content: POLITICA_ASSISTENTE_TECNICO },
      { role: "user", content: userContent },
    ],
  });

  return {
    resposta: contentToText(response.choices?.[0]?.message?.content),
    versaoBase: ASSISTENTE_TECNICO_BASE_VERSAO,
    fontes: FONTES_ASSISTENTE_TECNICO.map(({ id, titulo, url, uso }) => ({ id, titulo, url, uso })),
  };
}
