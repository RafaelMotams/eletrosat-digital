import { describe, expect, it } from "vitest";
import { isTrustedMutationOrigin } from "./trpc";

describe("origem de mutação do painel", () => {
  it("aceita a origem do mesmo host", () => {
    expect(isTrustedMutationOrigin("https://netvius.org", "netvius.org")).toBe(true);
  });

  it("nega origem externa ou malformada", () => {
    expect(isTrustedMutationOrigin("https://site-malicioso.example", "netvius.org")).toBe(false);
    expect(isTrustedMutationOrigin("não é uma origem", "netvius.org")).toBe(false);
  });
});
