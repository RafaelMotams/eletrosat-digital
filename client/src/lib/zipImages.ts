export type ZipImage = {
  name: string;
  path: string;
  blob: Blob;
};

const IMAGE_PATTERN = /\.(jpe?g|png|webp|gif|bmp|tiff?|heic|heif|avif|dng)$/i;
const MAX_ENTRIES = 5000;
const MAX_IMAGE_BYTES = 25 * 1024 * 1024;
const MAX_TOTAL_BYTES = 500 * 1024 * 1024;
const MAX_ZIP_BYTES = 600 * 1024 * 1024;

function mimeForName(name: string): string {
  const ext = name.toLowerCase().split(".").pop();
  const map: Record<string, string> = {
    jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
    gif: "image/gif", bmp: "image/bmp", tif: "image/tiff", tiff: "image/tiff",
    heic: "image/heic", heif: "image/heif", avif: "image/avif", dng: "image/dng",
  };
  return map[ext ?? ""] ?? "application/octet-stream";
}

function safePath(raw: string): string | null {
  const value = raw.replace(/\\/g, "/").replace(/^\/+/, "");
  const parts = value.split("/").filter(Boolean);
  if (!parts.length || parts.some(part => part === ".." || part.includes("\0"))) return null;
  return parts.join("/");
}

async function inflateRaw(bytes: Uint8Array): Promise<Uint8Array> {
  if (!("DecompressionStream" in window)) {
    throw new Error("Este navegador não consegue abrir ZIP compactado. Use Chrome/Edge atualizado ou envie a pasta.");
  }
  const stream = new Blob([bytes as BlobPart])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw" as CompressionFormat));
  const reader = stream.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk = value instanceof Uint8Array ? value : new Uint8Array(value);
    total += chunk.byteLength;
    if (total > MAX_IMAGE_BYTES) {
      await reader.cancel("imagem descompactada acima do limite");
      throw new Error("Uma imagem descompactada ultrapassa 25 MB");
    }
    chunks.push(chunk);
  }
  const result = new Uint8Array(total);
  let offset = 0;
  chunks.forEach(chunk => { result.set(chunk, offset); offset += chunk.byteLength; });
  return result;
}

/** Extrai somente imagens, sem executar conteúdo e sem depender de biblioteca externa. */
export async function extractImagesFromZip(file: File): Promise<ZipImage[]> {
  if (file.size > MAX_ZIP_BYTES) throw new Error("O ZIP deve ter no máximo 600 MB");
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);
  if (view.byteLength < 22) throw new Error("Arquivo ZIP inválido ou vazio");

  const minOffset = Math.max(0, view.byteLength - 65_557);
  let eocd = -1;
  for (let offset = view.byteLength - 22; offset >= minOffset; offset--) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("Não foi possível localizar o índice do ZIP");

  const totalEntries = view.getUint16(eocd + 10, true);
  const centralOffset = view.getUint32(eocd + 16, true);
  if (totalEntries === 0xffff || centralOffset === 0xffffffff) {
    throw new Error("ZIP64 ainda não é aceito. Divida o arquivo em ZIPs menores.");
  }
  if (totalEntries > MAX_ENTRIES) throw new Error(`ZIP com mais de ${MAX_ENTRIES} itens`);

  const decoder = new TextDecoder("utf-8");
  const images: ZipImage[] = [];
  let offset = centralOffset;
  let totalUncompressed = 0;

  for (let index = 0; index < totalEntries; index++) {
    if (offset + 46 > view.byteLength || view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error("Índice central do ZIP está corrompido");
    }
    const flags = view.getUint16(offset + 8, true);
    const method = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const uncompressedSize = view.getUint32(offset + 24, true);
    const nameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localOffset = view.getUint32(offset + 42, true);
    const rawName = decoder.decode(new Uint8Array(buffer, offset + 46, nameLength));
    offset += 46 + nameLength + extraLength + commentLength;

    const path = safePath(rawName);
    if (!path || path.endsWith("/") || !IMAGE_PATTERN.test(path)) continue;
    if (flags & 0x1) throw new Error(`ZIP protegido por senha: ${path}`);
    if (method !== 0 && method !== 8) throw new Error(`Compactação não suportada em ${path}`);
    if (uncompressedSize > MAX_IMAGE_BYTES) throw new Error(`${path} ultrapassa 25 MB`);
    if (compressedSize > 0 && uncompressedSize / compressedSize > 250) {
      throw new Error(`Taxa de compressão insegura em ${path}`);
    }
    totalUncompressed += uncompressedSize;
    if (totalUncompressed > MAX_TOTAL_BYTES) throw new Error("As imagens do ZIP ultrapassam 500 MB");

    if (localOffset + 30 > view.byteLength || view.getUint32(localOffset, true) !== 0x04034b50) {
      throw new Error(`Entrada inválida no ZIP: ${path}`);
    }
    const localNameLength = view.getUint16(localOffset + 26, true);
    const localExtraLength = view.getUint16(localOffset + 28, true);
    const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
    if (dataOffset + compressedSize > view.byteLength) throw new Error(`Conteúdo truncado: ${path}`);
    const compressed = new Uint8Array(buffer.slice(dataOffset, dataOffset + compressedSize));
    const bytes = method === 0 ? compressed : await inflateRaw(compressed);
    if (uncompressedSize && bytes.byteLength !== uncompressedSize) {
      throw new Error(`Tamanho inconsistente no ZIP: ${path}`);
    }
    const name = path.split("/").pop() ?? path;
    images.push({ name, path, blob: new Blob([bytes as BlobPart], { type: mimeForName(name) }) });
  }

  if (!images.length) throw new Error("O ZIP não contém fotos em formatos reconhecidos");
  return images;
}
