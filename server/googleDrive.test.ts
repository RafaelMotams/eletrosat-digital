import { describe, it, expect } from "vitest";
import { google } from "googleapis";
import { uploadFotoParaDrive } from "./googleDrive";
import { storageGetSignedUrl } from "./storage";

function getAuth() {
  const credentials = {
    type: "service_account",
    project_id: process.env.GOOGLE_PROJECT_ID,
    private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID,
    private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    client_email: process.env.GOOGLE_CLIENT_EMAIL,
    client_id: process.env.GOOGLE_CLIENT_ID,
    auth_uri: "https://accounts.google.com/o/oauth2/auth",
    token_uri: "https://oauth2.googleapis.com/token",
    auth_provider_x509_cert_url: "https://www.googleapis.com/oauth2/v1/certs",
    client_x509_cert_url: process.env.GOOGLE_CLIENT_CERT_URL,
    universe_domain: "googleapis.com",
  };
  return new google.auth.GoogleAuth({
    credentials,
    scopes: ["https://www.googleapis.com/auth/drive"],
  });
}

describe("Google Drive credentials", () => {
  it("deve listar todos os Shared Drives acessíveis pela conta de serviço", async () => {
    const drive = google.drive({ version: "v3", auth: getAuth() });

    // Listar Shared Drives
    const sharedDrives = await drive.drives.list({
      pageSize: 10,
      fields: "drives(id, name)",
    });

    console.log(`[Drive] Shared Drives encontrados: ${JSON.stringify(sharedDrives.data.drives)}`);
    
    // Verificar se a pasta configurada é um Shared Drive
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;
    console.log(`[Drive] Pasta configurada: ${folderId}`);
    
    // Tentar obter info da pasta como Shared Drive
    try {
      const driveInfo = await drive.drives.get({ driveId: folderId });
      console.log(`[Drive] É um Shared Drive! Nome: ${driveInfo.data.name}`);
    } catch (e: any) {
      console.log(`[Drive] NÃO é um Shared Drive: ${e.message}`);
      
      // Tentar como pasta normal
      try {
        const fileInfo = await drive.files.get({ 
          fileId: folderId, 
          fields: "id, name, driveId, parents",
          supportsAllDrives: true 
        });
        console.log(`[Drive] É uma pasta normal. DriveId: ${fileInfo.data.driveId}, Nome: ${fileInfo.data.name}`);
      } catch (e2: any) {
        console.log(`[Drive] Erro ao obter info da pasta: ${e2.message}`);
      }
    }
    
    expect(true).toBe(true); // diagnóstico
  }, 30000);

  it("deve fazer upload de uma foto real do S3 para o Drive", async () => {
    const fotoUrl = "/manus-storage/os-fotos/mapa_calor/os-690006-1778089246171_222884c0.jpg";
    const today = new Date().toISOString().split("T")[0];

    const result = await uploadFotoParaDrive({
      tecnicoNome: "Tecnico Teste",
      escolaNome: "Escola Teste Real",
      fotoUrl,
      fotoIndex: 1,
      dataOS: today,
    });

    console.log(`[Drive] Upload resultado:`, JSON.stringify(result));
    expect(result.driveFileId).toBeTruthy();
    expect(result.driveUrl).toContain("drive.google.com");
  }, 60000);
});
