import { google } from "googleapis";
import { Readable } from "stream";

// Credenciais da conta de serviço injetadas via env
const CREDENTIALS = {
  type: "service_account",
  project_id: process.env.GOOGLE_PROJECT_ID!,
  private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID!,
  private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
  client_email: process.env.GOOGLE_CLIENT_EMAIL!,
  client_id: process.env.GOOGLE_CLIENT_ID!,
  auth_uri: "https://accounts.google.com/o/oauth2/auth",
  token_uri: "https://oauth2.googleapis.com/token",
  auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
  client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL!,
  universe_domain: "googleapis.com",
};

const ROOT_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID!;

function getAuth() {
  return new google.auth.GoogleAuth({
    credentials: CREDENTIALS,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

function getDrive() {
  return google.drive({ version: "v3", auth: getAuth() });
}

/** Busca ou cria uma subpasta dentro de um pai */
async function getOrCreateFolder(name: string, parentId: string): Promise<string> {
  const drive = getDrive();
  const sanitized = name.replace(/[/\\?%*:|"<>]/g, "-").trim().slice(0, 100);

  // Busca pasta existente
  const res = await drive.files.list({
    q: `name='${sanitized}' and '${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and trashed=false`,
    fields: "files(id, name)",
    spaces: "drive",
  });

  if (res.data.files && res.data.files.length > 0) {
    return res.data.files[0].id!;
  }

  // Cria nova pasta
  const folder = await drive.files.create({
    requestBody: {
      name: sanitized,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentId],
    },
    fields: "id",
  });

  return folder.data.id!;
}

/**
 * Faz upload de uma foto para o Google Drive
 * Estrutura: Netvionis Fotos / Técnico Nome / Escola Nome - Data / foto.jpg
 */
export async function uploadFotoParaDrive(params: {
  tecnicoNome: string;
  escolaNome: string;
  fotoUrl: string;
  fotoIndex: number;
  dataOS: string; // formato YYYY-MM-DD
}): Promise<{ driveUrl: string; driveFileId: string }> {
  const { tecnicoNome, escolaNome, fotoUrl, fotoIndex, dataOS } = params;

  // Baixar a foto do S3/storage
  const response = await fetch(fotoUrl);
  if (!response.ok) throw new Error(`Falha ao baixar foto: ${response.status}`);
  const buffer = await response.arrayBuffer();
  const stream = Readable.from(Buffer.from(buffer));

  // Detectar tipo de conteúdo
  const contentType = response.headers.get("content-type") || "image/jpeg";
  const ext = contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpg";

  const drive = getDrive();

  // Criar estrutura de pastas: Root / Técnico / Escola - Data
  const tecnicoFolderId = await getOrCreateFolder(tecnicoNome, ROOT_FOLDER_ID);
  const escolaFolderName = `${escolaNome} - ${dataOS}`;
  const escolaFolderId = await getOrCreateFolder(escolaFolderName, tecnicoFolderId);

  // Upload do arquivo
  const fileName = `foto_${String(fotoIndex).padStart(2, "0")}.${ext}`;
  const file = await drive.files.create({
    requestBody: {
      name: fileName,
      parents: [escolaFolderId],
    },
    media: {
      mimeType: contentType,
      body: stream,
    },
    fields: "id, webViewLink",
  });

  return {
    driveFileId: file.data.id!,
    driveUrl: file.data.webViewLink!,
  };
}

/**
 * Faz upload de todas as fotos de uma OS concluída para o Drive
 */
export async function uploadFotosOSParaDrive(params: {
  tecnicoNome: string;
  escolaNome: string;
  fotos: string[]; // URLs das fotos
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
