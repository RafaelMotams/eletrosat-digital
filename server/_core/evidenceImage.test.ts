import { describe, expect, it } from "vitest";
import sharp from "sharp";
import { sanitizeEvidenceImage } from "./evidenceImage";

describe("higienização de evidência", () => {
  it("reencoda uma imagem PNG válida como JPEG sem confiar no base64 declarado", async () => {
    const input = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#0b1f33" } }).png().toBuffer();
    const output = await sanitizeEvidenceImage(input.toString("base64"), "image/png");
    expect(output.subarray(0, 3).toString("hex")).toBe("ffd8ff");
  });

  it("rejeita conteúdo inválido e tipo declarado incompatível", async () => {
    await expect(sanitizeEvidenceImage(Buffer.from("não é imagem").toString("base64"), "image/jpeg")).rejects.toMatchObject({ code: "BAD_REQUEST" });
    const input = await sharp({ create: { width: 2, height: 2, channels: 3, background: "#fff" } }).png().toBuffer();
    await expect(sanitizeEvidenceImage(input.toString("base64"), "image/jpeg")).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
