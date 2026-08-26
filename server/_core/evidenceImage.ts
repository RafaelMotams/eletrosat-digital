import sharp from "sharp";
import { TRPCError } from "@trpc/server";

const MAX_INPUT_BYTES = 10 * 1024 * 1024;
const MAX_PIXELS = 24_000_000;
const MIME_BY_FORMAT: Record<string, string> = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

export async function sanitizeEvidenceImage(base64: string, declaredMimeType: string): Promise<Buffer> {
  const normalized = base64.replace(/^data:[^;]+;base64,/, "").replace(/\s/g, "");
  if (!normalized || !/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Imagem em formato inválido" });
  }

  const input = Buffer.from(normalized, "base64");
  if (input.length === 0 || input.length > MAX_INPUT_BYTES) {
    throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "Foto muito grande. Máximo permitido: 10MB." });
  }

  try {
    const metadata = await sharp(input, { failOn: "error", limitInputPixels: MAX_PIXELS }).metadata();
    const detectedMimeType = metadata.format ? MIME_BY_FORMAT[metadata.format] : undefined;
    if (!detectedMimeType || metadata.width === undefined || metadata.height === undefined) {
      throw new Error("Formato não suportado");
    }
    if (metadata.width * metadata.height > MAX_PIXELS || declaredMimeType !== detectedMimeType) {
      throw new Error("Tipo ou dimensões incompatíveis");
    }

    // Reencode remove EXIF, perfis e outros metadados do arquivo fornecido pelo aparelho.
    const output = await sharp(input, { failOn: "error", limitInputPixels: MAX_PIXELS })
      .rotate()
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer();
    if (output.length > MAX_INPUT_BYTES) {
      throw new Error("Imagem processada excede o limite");
    }
    return output;
  } catch (error) {
    if (error instanceof TRPCError) throw error;
    throw new TRPCError({ code: "BAD_REQUEST", message: "A foto deve ser JPEG, PNG ou WebP válido, com dimensões permitidas" });
  }
}
