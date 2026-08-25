import { storageGetSignedUrl } from "./storage";
import * as crypto from "crypto";

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;

// Gera um JWT assinado para autenticação com a conta de serviço
async function getAccessToken(): Promise<string> {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL!;

  const now = Math.floor(Date.now() / 1000);
  const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      iss: clientEmail,
      scope: "https://www.googleapis.com/auth/drive",
      aud: "https://oauth2.googleapis.com/token",
      exp: now + 3600,
      iat: now,
    })
  ).toString("base64url");

  const signingInput = `${header}.${payload}`;
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(signingInput);
  const signature = sign.sign(privateKey, "base64url");
  const jwt = `${signingInput}.${signature}`;

  const resp = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: jwt,
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Falha ao obter token Google: ${err}`);
  }

  const data = (await resp.json()) as { access_token: string };
  return data.access_token;
}

/** Busca ou cria uma subpasta dentro de um pai usando fetch direto */
async function getOrCreateFolder(name: string, parentId: string, token: string): Promise<string> {
  const sanitized = name.replace(/[/\\?%*:|"<>]/g, "-").trim().slice(0, 100);
  const escaped = sanitized.replace(/'/g, "\\'");

  // Busca pasta existente
  const query = encodeURIComponent(
    `name='${escaped}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`
  );
  const listResp = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&supportsAllDrives=true&includeItemsFromAllDrives=true`,
    { headers: { Authorization: `Bearer ${token}` } }
  );

  if (listResp.ok) {
    const data = (await listResp.json()) as { files: { id: string }[] };
    if (data.files && data.files.length > 0) return data.files[0].id;
  }

  // Cria nova pasta
  const createResp = await fetch(
    "https://www.googleapis.com/drive/v3/files?supportsAllDrives=true",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: sanitized,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      }),
    }
  );

  if (!createResp.ok) {
    const err = await createResp.text();
    throw new Error(`Falha ao criar pasta "${sanitized}": ${err}`);
  }

  const folder = (await createResp.json()) as { id: string };
  return folder.id;
}

/**
 * Faz upload de uma foto para o Google Drive usando multipart upload
 * Estrutura: Netvius Fotos / Técnico Nome / Escola Nome - Data / foto.jpg
 */
export async function uploadFotoParaDrive(params: {
  tecnicoNome: string;
  escolaNome: string;
  fotoUrl: string;
  fotoIndex: number;
  dataOS: string;
}): Promise<{ driveUrl: string; driveFileId: string }> {
  const { tecnicoNome, escolaNome, fotoUrl, fotoIndex, dataOS } = params;

  // Obter token de acesso
  const token = await getAccessToken();

  // Resolver URL: se for relativa (/manus-storage/...), obter URL assinada do S3
  let resolvedUrl = fotoUrl;
  if (fotoUrl.startsWith("/manus-storage/")) {
    const key = fotoUrl.replace("/manus-storage/", "");
    resolvedUrl = await storageGetSignedUrl(key);
  }

  // Baixar a foto do S3/storage
  const response = await fetch(resolvedUrl);
  if (!response.ok) throw new Error(`Falha ao baixar foto: ${response.status}`);
  const buffer = await response.arrayBuffer();

  // Detectar tipo de conteúdo
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";

  // Criar estrutura de pastas: Root / Escola Nome - Data
  const escolaFolderName = `${escolaNome} - ${dataOS}`;
  const escolaFolderId = await getOrCreateFolder(escolaFolderName, ROOT_FOLDER_ID, token);

  // Upload multipart
  const fileName = `foto_${String(fotoIndex).padStart(2, "0")}_${tecnicoNome.split(" ")[0]}.${ext}`;
  const metadata = JSON.stringify({ name: fileName, parents: [escolaFolderId] });
  const boundary = "-------NetviusUploadBoundary";

  const metaPart = `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`;
  const filePart = `--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`;
  const endPart = `\r\n--${boundary}--`;

  const metaBytes = Buffer.from(metaPart, "utf-8");
  const fileBytes = Buffer.from(buffer);
  const filePartBytes = Buffer.from(filePart, "utf-8");
  const endBytes = Buffer.from(endPart, "utf-8");
  const body = Buffer.concat([metaBytes, filePartBytes, fileBytes, endBytes]);

  const uploadResp = await fetch(
    "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": `multipart/related; boundary="${boundary}"`,
        "Content-Length": String(body.length),
      },
      body,
    }
  );

  if (!uploadResp.ok) {
    const err = await uploadResp.text();
    throw new Error(`Falha ao fazer upload: ${uploadResp.status} - ${err}`);
  }

  const file = (await uploadResp.json()) as { id: string; webViewLink: string };

  return {
    driveFileId: file.id,
    driveUrl: file.webViewLink || `https://drive.google.com/file/d/${file.id}/view`,
  };
}

/**
 * Faz upload de todas as fotos de uma OS concluída para o Drive
 */
export async function uploadFotosOSParaDrive(params: {
  tecnicoNome: string;
  escolaNome: string;
  fotos: string[];
  dataOS: string;
}): Promise<{ total: number; sucesso: number; urls: string[] }> {
  const { tecnicoNome, escolaNome, fotos, dataOS } = params;

  let sucesso = 0;
  const urls: string[] = [];

  for (let i = 0; i < fotos.length; i++) {
    try {
      const result = await uploadFotoParaDrive({
        tecnicoNome,
        escolaNome,
        fotoUrl: fotos[i],
        fotoIndex: i + 1,
        dataOS,
      });
      urls.push(result.driveUrl);
      sucesso++;
    } catch (err) {
      console.error(`[Drive] Erro ao enviar foto ${i + 1}:`, err);
    }
  }

  return { total: fotos.length, sucesso, urls };
}
