import { describe, expect, it } from "vitest";
import { TENANT_SESSION_COOKIE, extractTenantSessionCookie } from "./context";

describe("sessão administrativa por cookie", () => {
  it("extrai o token de tenant do cookie de sessão", () => {
    const cookie = `tema=escuro; ${TENANT_SESSION_COOKIE}=token%2Eseguro; outro=valor`;
    expect(extractTenantSessionCookie(cookie)).toBe("token.seguro");
  });

  it("não aceita cookie ausente ou malformado", () => {
    expect(extractTenantSessionCookie(undefined)).toBeNull();
    expect(extractTenantSessionCookie("tema=escuro")).toBeNull();
    expect(extractTenantSessionCookie(`${TENANT_SESSION_COOKIE}=%E0%A4%A`)).toBeNull();
  });
});
