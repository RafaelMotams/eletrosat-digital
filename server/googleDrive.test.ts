import { describe, it, expect } from "vitest";
import { google } from "googleapis";

describe("Google Drive credentials", () => {
  it("should authenticate with service account and list root folder", async () => {
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

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/drive"],
    });

    const drive = google.drive({ version: "v3", auth });
    const folderId = process.env.GOOGLE_DRIVE_FOLDER_ID!;

    // Tenta listar arquivos na pasta raiz compartilhada
    const res = await drive.files.list({
      q: `'${folderId}' in parents and trashed=false`,
      fields: "files(id, name)",
      pageSize: 5,
    });

    expect(res.status).toBe(200);
    expect(res.data.files).toBeDefined();
    console.log(`[Drive] Pasta acessível. Arquivos encontrados: ${res.data.files?.length ?? 0}`);
  }, 30000);
});
