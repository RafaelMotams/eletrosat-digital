import { describe, expect, it } from "vitest";
import { buildVerificationEmail, escapeHtml, getAllowedOrigin, hashVerificationToken } from "./cadastro";

describe("cadastro público", () => {
  it("armazena somente o hash determinístico do token de confirmação", () => {
    const token = "token-de-confirmacao-comprido-e-imprevisivel-123456789";
    const hash = hashVerificationToken(token);

    expect(hash).toMatch(/^[a-f0-9]{64}$/);
    expect(hash).not.toContain(token);
    expect(hash).toBe(hashVerificationToken(token));
  });

  it("aceita apenas origens seguras para o link enviado por email", () => {
    expect(getAllowedOrigin("https://netvius.org")).toBe("https://netvius.org");
    expect(getAllowedOrigin("http://localhost:3000")).toBe("http://localhost:3000");
    expect(getAllowedOrigin("javascript:alert(1)")).toBe("https://eletrosat-mgcpkmbx.manus.space");
  });

  it("escapa conteúdo controlado pelo usuário no email de confirmação", () => {
    const html = buildVerificationEmail('<img src=x onerror="alert(1)">', "https://netvius.org/admin/confirmar-email?token=abc");

    expect(escapeHtml("A&B")).toBe("A&amp;B");
    expect(html).toContain("&lt;img src=x onerror=&quot;alert(1)&quot;&gt;");
    expect(html).not.toContain('<img src=x onerror="alert(1)">');
  });
});
