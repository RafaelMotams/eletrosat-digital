import crypto from "crypto";
import { TRPCError } from "@trpc/server";
import { and, desc, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import {
  escolas,
  redeExternaConfig,
  redeExternaFotos,
  type Escola,
} from "../../drizzle/schema";
import { getDb } from "../db";
import {
  downloadDriveFile,
  extractGoogleDriveFolderId,
  isGoogleDriveConfigured,
  listDrivePhotoFiles,
  type DrivePhotoFile,
} from "../googleDrive";
import { storagePut } from "../storage";
import { publicProcedure, router, tenantAdminProcedure } from "../_core/trpc";

const FOTO_CATEGORIAS = [
  "roteador_modem",
  "fachada",
  "antena",
  "cto_caixa",
  "entrada_cabo",
  "teste_conexao",
  "travessia",
  "outro",
] as const;

const REDE_STATUS = ["nao_informada", "com_rede", "sem_rede", "em_validacao"] as const;
const REDE_TIPOS = ["fibra", "radio", "satelite", "movel", "outro"] as const;
const ORIGENS = ["pasta", "zip", "google_drive", "manual"] as const;

type FotoCategoria = (typeof FOTO_CATEGORIAS)[number];
type OrigemFoto = (typeof ORIGENS)[number];

const tecnicoProcedure = publicProcedure.use(({ ctx, next }) => {
  if (!ctx.tecnicoSession) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Sessão do técnico inválida ou expirada" });
  }
  return next({ ctx });
});

const STOP_WORDS = new Set([
  "ESCOLA", "COLEGIO", "CENTRO", "MUNICIPAL", "ESTADUAL", "ENSINO", "EDUCACAO",
  "EM", "EMEF", "EMEI", "EE", "CE", "DA", "DAS", "DE", "DO", "DOS", "E",
]);

function normalize(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

function meaningfulTokens(value: string): Set<string> {
  return new Set(
    normalize(value)
      .split(" ")
      .filter(token => token.length >= 3 && !STOP_WORDS.has(token)),
  );
}

function tokenScore(a: string, b: string): number {
  const left = meaningfulTokens(a);
  const right = meaningfulTokens(b);
  if (!left.size || !right.size) return 0;
  let intersection = 0;
  left.forEach(token => { if (right.has(token)) intersection++; });
  return intersection / Math.max(left.size, right.size);
}

type MatchResult = {
  escola: Escola | null;
  score: number;
  metodo: "inep" | "nome_exato" | "nome_aproximado" | "revisao";
  candidatos: Array<{ id: number; nome: string; inep: string; score: number }>;
};

export function matchEscola(path: string, allEscolas: Escola[]): MatchResult {
  const normalizedPath = normalize(path);
  const ineP = normalizedPath.match(/(?:^|\s)(\d{8})(?:\s|$)/)?.[1];
  if (ineP) {
    const exact = allEscolas.find(escola => escola.inep.replace(/\D/g, "") === ineP);
    if (exact) return { escola: exact, score: 1, metodo: "inep", candidatos: [] };
  }

  const exactByName = allEscolas.filter(escola => {
    const schoolName = normalize(escola.nome);
    return schoolName.length >= 6 && (
      normalizedPath === schoolName ||
      normalizedPath.includes(` ${schoolName} `) ||
      normalizedPath.startsWith(`${schoolName} `) ||
      normalizedPath.endsWith(` ${schoolName}`)
    );
  });
  if (exactByName.length === 1) {
    return { escola: exactByName[0], score: 1, metodo: "nome_exato", candidatos: [] };
  }

  const ranked = allEscolas
    .map(escola => ({ escola, score: tokenScore(path, escola.nome) }))
    .filter(item => item.score >= 0.45)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);
  const best = ranked[0];
  const second = ranked[1];
  const confident = best && best.score >= 0.78 && (!second || best.score - second.score >= 0.18);
  return {
    escola: confident ? best.escola : null,
    score: best?.score ?? 0,
    metodo: confident ? "nome_aproximado" : "revisao",
    candidatos: ranked.map(item => ({
      id: item.escola.id,
      nome: item.escola.nome,
      inep: item.escola.inep,
      score: item.score,
    })),
  };
}

export function detectCategoria(value: string): FotoCategoria {
  const text = normalize(value);
  if (/ROTEADOR|ROUTER|MODEM|ONU|ONT/.test(text)) return "roteador_modem";
  if (/FACHADA|FRENTE|PLACA DA ESCOLA|IDENTIFICACAO/.test(text)) return "fachada";
  if (/ANTENA|RADIO|STARLINK|SATELITE/.test(text)) return "antena";
  if (/\bCTO\b|CAIXA DE EMENDA|CAIXA OPTICA|CEO/.test(text)) return "cto_caixa";
  if (/ENTRADA|DROP|DROPE|CABO EXTERNO|ACESSO/.test(text)) return "entrada_cabo";
  if (/SPEED|VELOCIDADE|TESTE|PING|DOWNLOAD|UPLOAD|SINAL/.test(text)) return "teste_conexao";
  if (/TRAVESSIA|ENTRE BLOCOS|AEREA|SUBTERRANEA/.test(text)) return "travessia";
  return "outro";
}

function sanitizeFileName(name: string): string {
  const clean = name.replace(/[\\/\0<>:"|?*]/g, "-").trim();
  return clean.slice(0, 180) || "foto";
}

function extensionFor(name: string, mimeType: string): string {
  const match = name.toLowerCase().match(/\.(jpe?g|png|webp|gif|bmp|tiff?|heic|heif|avif|dng)$/);
  if (match) return `.${match[1] === "jpeg" ? "jpg" : match[1]}`;
  const mimeMap: Record<string, string> = {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
    "image/bmp": ".bmp",
    "image/tiff": ".tiff",
    "image/heic": ".heic",
    "image/heif": ".heif",
    "image/avif": ".avif",
  };
  return mimeMap[mimeType.toLowerCase()] ?? ".img";
}

function imageMimeFromMagic(buffer: Buffer): string | null {
  if (buffer.length >= 12) {
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
    if (buffer.subarray(0, 3).toString("ascii") === "GIF") return "image/gif";
    if (buffer.subarray(0, 4).toString("ascii") === "RIFF" && buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
    if (buffer.subarray(0, 2).toString("ascii") === "BM") return "image/bmp";
    const tiff = buffer.subarray(0, 4).toString("hex");
    if (tiff === "49492a00" || tiff === "4d4d002a") return "image/tiff";
    const brand = buffer.subarray(4, 12).toString("ascii").toLowerCase();
    if (/avif|avis/.test(brand)) return "image/avif";
    if (/heic|heif|heix|hevc|hevx|mif1|msf1/.test(brand)) return "image/heic";
  }
  // Não confiar apenas no MIME/extensão informados pelo navegador: o conteúdo
  // precisa ter assinatura de um formato de imagem reconhecido.
  return null;
}

async function tenantEscolas(tenantId: number): Promise<Escola[]> {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
  return db.select().from(escolas).where(eq(escolas.tenantId, tenantId));
}

type SavePhotoInput = {
  tenantId: number;
  buffer: Buffer;
  originalNome: string;
  originalMimeType: string;
  origem: OrigemFoto;
  caminhoOrigem: string;
  escolaId?: number | null;
  categoria?: FotoCategoria;
  driveFile?: DrivePhotoFile;
  allEscolas?: Escola[];
};

async function savePhoto(input: SavePhotoInput) {
  const db = await getDb();
  if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Banco indisponível" });
  if (input.buffer.length === 0 || input.buffer.length > 25 * 1024 * 1024) {
    throw new TRPCError({ code: "PAYLOAD_TOO_LARGE", message: "A foto deve ter no máximo 25 MB" });
  }
  const detectedMime = imageMimeFromMagic(input.buffer);
  if (!detectedMime) {
    throw new TRPCError({ code: "BAD_REQUEST", message: `Arquivo não reconhecido como foto: ${input.originalNome}` });
  }

  const allEscolas = input.allEscolas ?? await tenantEscolas(input.tenantId);
  let matched: MatchResult;
  if (input.escolaId) {
    const explicit = allEscolas.find(escola => escola.id === input.escolaId) ?? null;
    if (!explicit) throw new TRPCError({ code: "FORBIDDEN", message: "Escola fora do tenant" });
    matched = { escola: explicit, score: 1, metodo: "nome_exato", candidatos: [] };
  } else {
    matched = matchEscola(input.caminhoOrigem, allEscolas);
  }

  const sha256 = crypto.createHash("sha256").update(input.buffer).digest("hex");
  const existingDrive = input.driveFile
    ? await db.select().from(redeExternaFotos).where(and(
      eq(redeExternaFotos.tenantId, input.tenantId),
      eq(redeExternaFotos.driveFileId, input.driveFile.id),
    )).limit(1)
    : [];
  if (existingDrive[0]?.sha256 === sha256) {
    await db.update(redeExternaFotos).set({
      driveModifiedTime: input.driveFile?.modifiedTime ?? null,
      caminhoOrigem: input.caminhoOrigem.slice(0, 4000),
    }).where(eq(redeExternaFotos.id, existingDrive[0].id));
    const curatedSchool = existingDrive[0].escolaId
      ? allEscolas.find(escola => escola.id === existingDrive[0].escolaId) ?? null
      : null;
    return {
      foto: existingDrive[0],
      duplicada: true,
      match: curatedSchool ? { ...matched, escola: curatedSchool } : matched,
    };
  }
  const existingByHash = await db
    .select()
    .from(redeExternaFotos)
    .where(and(eq(redeExternaFotos.tenantId, input.tenantId), eq(redeExternaFotos.sha256, sha256)))
    .limit(1);
  if (existingByHash[0]) {
    if (existingDrive[0] && input.driveFile) {
      await db.update(redeExternaFotos).set({
        driveModifiedTime: input.driveFile.modifiedTime ?? null,
      }).where(eq(redeExternaFotos.id, existingDrive[0].id));
    }
    return {
      foto: existingByHash[0],
      duplicada: true,
      match: matched,
    };
  }

  const categoria = input.categoria ?? detectCategoria(`${input.caminhoOrigem} ${input.originalNome}`);
  const ext = extensionFor(input.originalNome, detectedMime);
  const schoolPart = matched.escola ? `escola-${matched.escola.id}` : "revisao";
  const key = `rede-externa/tenant-${input.tenantId}/${schoolPart}/${Date.now()}-${crypto.randomUUID().slice(0, 8)}${ext}`;
  const { url, key: storedKey } = await storagePut(key, input.buffer, detectedMime);

  const values = {
    tenantId: input.tenantId,
    escolaId: matched.escola?.id ?? null,
    categoria,
    statusVinculo: matched.escola ? "vinculada" as const : "revisao" as const,
    titulo: categoria === "roteador_modem" ? "Roteador/Modem da rede externa" : sanitizeFileName(input.originalNome),
    originalNome: sanitizeFileName(input.originalNome),
    originalMimeType: detectedMime,
    origem: input.origem,
    caminhoOrigem: input.caminhoOrigem.slice(0, 4000),
    driveFileId: input.driveFile?.id ?? null,
    driveModifiedTime: input.driveFile?.modifiedTime ?? null,
    sha256,
    url,
    fileKey: storedKey,
  };

  let fotoId: number;
  type PersistedPhotoValues = Omit<typeof values, "statusVinculo"> & {
    statusVinculo: "vinculada" | "revisao" | "ignorada";
  };
  let persistedValues: PersistedPhotoValues = values;
  if (existingDrive[0]) {
    fotoId = existingDrive[0].id;
    // Preserva a curadoria feita pelo administrador quando o conteúdo do mesmo
    // arquivo é substituído no Drive.
    persistedValues = {
      ...values,
      escolaId: existingDrive[0].escolaId ?? values.escolaId,
      categoria: existingDrive[0].categoria,
      statusVinculo: existingDrive[0].statusVinculo,
      titulo: existingDrive[0].titulo ?? values.titulo,
    };
    await db.update(redeExternaFotos).set(persistedValues).where(and(
      eq(redeExternaFotos.id, fotoId),
      eq(redeExternaFotos.tenantId, input.tenantId),
    ));
  } else {
    const inserted = await db.insert(redeExternaFotos).values(values);
    fotoId = Number((inserted as any)[0]?.insertId ?? 0);
  }
  const linkedSchoolId = persistedValues.escolaId;
  if (linkedSchoolId) {
    await db
      .update(escolas)
      .set({ redeExternaStatus: "com_rede" })
      .where(and(eq(escolas.id, linkedSchoolId), eq(escolas.tenantId, input.tenantId)));
  }
  const linkedSchool = linkedSchoolId ? allEscolas.find(escola => escola.id === linkedSchoolId) ?? null : null;
  return {
    foto: { id: fotoId, ...persistedValues },
    duplicada: false,
    match: linkedSchool ? { ...matched, escola: linkedSchool } : matched,
  };
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).slice(0, 60_000);
}

export const redeExternaRouter = router({
  resumo: tenantAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    const tenantId = (ctx as any).tenantId as number;
    const [statusRows, fotoRows, revisaoRows, configRows] = await Promise.all([
      db.select({ status: escolas.redeExternaStatus, total: sql<number>`count(*)` })
        .from(escolas)
        .where(eq(escolas.tenantId, tenantId))
        .groupBy(escolas.redeExternaStatus),
      db.select({ total: sql<number>`count(*)` }).from(redeExternaFotos)
        .where(and(eq(redeExternaFotos.tenantId, tenantId), eq(redeExternaFotos.statusVinculo, "vinculada"))),
      db.select({ total: sql<number>`count(*)` }).from(redeExternaFotos)
        .where(and(eq(redeExternaFotos.tenantId, tenantId), eq(redeExternaFotos.statusVinculo, "revisao"))),
      db.select().from(redeExternaConfig).where(eq(redeExternaConfig.tenantId, tenantId)).limit(1),
    ]);
    const porStatus = Object.fromEntries(statusRows.map(row => [row.status, Number(row.total)]));
    return {
      totalEscolas: Object.values(porStatus).reduce((sum, value) => sum + Number(value), 0),
      comRede: Number(porStatus.com_rede ?? 0),
      semRede: Number(porStatus.sem_rede ?? 0),
      emValidacao: Number(porStatus.em_validacao ?? 0),
      naoInformada: Number(porStatus.nao_informada ?? 0),
      totalFotos: Number(fotoRows[0]?.total ?? 0),
      pendencias: Number(revisaoRows[0]?.total ?? 0),
      driveConfiguradoNoServidor: isGoogleDriveConfigured(),
      contaServicoDrive: process.env.GOOGLE_CLIENT_EMAIL ?? null,
      config: configRows[0] ?? null,
    };
  }),

  listarEscolas: tenantAdminProcedure
    .input(z.object({ busca: z.string().optional(), status: z.enum(REDE_STATUS).optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = (ctx as any).tenantId as number;
      const all = await db.select().from(escolas).where(eq(escolas.tenantId, tenantId)).orderBy(escolas.nome);
      const filtered = all.filter(escola => {
        if (input?.status && escola.redeExternaStatus !== input.status) return false;
        const q = normalize(input?.busca ?? "");
        return !q || normalize(`${escola.nome} ${escola.inep} ${escola.municipio ?? ""}`).includes(q);
      });
      const ids = filtered.map(escola => escola.id);
      const fotos = ids.length
        ? await db.select().from(redeExternaFotos)
          .where(and(
            eq(redeExternaFotos.tenantId, tenantId),
            eq(redeExternaFotos.statusVinculo, "vinculada"),
            inArray(redeExternaFotos.escolaId, ids),
          ))
          .orderBy(desc(redeExternaFotos.createdAt))
        : [];
      const grouped = new Map<number, typeof fotos>();
      for (const foto of fotos) {
        if (!foto.escolaId) continue;
        const current = grouped.get(foto.escolaId) ?? [];
        current.push(foto);
        grouped.set(foto.escolaId, current);
      }
      return filtered.map(escola => {
        const escolaFotos = grouped.get(escola.id) ?? [];
        const fotoRoteador = escolaFotos.find(foto => foto.categoria === "roteador_modem") ?? null;
        return {
          ...escola,
          totalFotosRedeExterna: escolaFotos.length,
          fotoRoteador,
          fotosRedeExterna: escolaFotos.slice(0, 24),
        };
      });
    }),

  listarPendencias: tenantAdminProcedure.query(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    return db.select().from(redeExternaFotos)
      .where(and(
        eq(redeExternaFotos.tenantId, (ctx as any).tenantId),
        eq(redeExternaFotos.statusVinculo, "revisao"),
      ))
      .orderBy(desc(redeExternaFotos.createdAt))
      .limit(200);
  }),

  salvarConfigDrive: tenantAdminProcedure
    .input(z.object({ pasta: z.string().min(10).max(1000) }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const folderId = extractGoogleDriveFolderId(input.pasta);
      if (!folderId) throw new TRPCError({ code: "BAD_REQUEST", message: "Link ou ID de pasta do Google Drive inválido" });
      const tenantId = (ctx as any).tenantId as number;
      await db.insert(redeExternaConfig)
        .values({ tenantId, driveFolderId: folderId })
        .onDuplicateKeyUpdate({ set: { driveFolderId: folderId, updatedAt: new Date() } });
      return { success: true, folderId, servidorConfigurado: isGoogleDriveConfigured() };
    }),

  verificarDrive: tenantAdminProcedure.mutation(async ({ ctx }) => {
    const db = await getDb();
    if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
    if (!isGoogleDriveConfigured()) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Credenciais do Google Drive não estão configuradas no servidor" });
    }
    const config = await db.select().from(redeExternaConfig)
      .where(eq(redeExternaConfig.tenantId, (ctx as any).tenantId)).limit(1);
    if (!config[0]?.driveFolderId) {
      throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Informe primeiro a pasta do Google Drive" });
    }
    const files = await listDrivePhotoFiles(config[0].driveFolderId);
    return { totalFotos: files.length, amostra: files.slice(0, 10).map(file => file.path) };
  }),

  sincronizarDrive: tenantAdminProcedure
    .input(z.object({ limite: z.number().int().min(1).max(50).default(20) }).optional())
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      if (!isGoogleDriveConfigured()) {
        throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Integração Google Drive não configurada no servidor" });
      }
      const tenantId = (ctx as any).tenantId as number;
      const configRows = await db.select().from(redeExternaConfig)
        .where(eq(redeExternaConfig.tenantId, tenantId)).limit(1);
      const folderId = configRows[0]?.driveFolderId;
      if (!folderId) throw new TRPCError({ code: "PRECONDITION_FAILED", message: "Pasta do Google Drive não informada" });

      const files = await listDrivePhotoFiles(folderId);
      const allEscolas = await tenantEscolas(tenantId);
      const ids = files.map(file => file.id);
      const existing = ids.length
        ? await db.select({ id: redeExternaFotos.id, driveFileId: redeExternaFotos.driveFileId, driveModifiedTime: redeExternaFotos.driveModifiedTime })
          .from(redeExternaFotos)
          .where(and(eq(redeExternaFotos.tenantId, tenantId), inArray(redeExternaFotos.driveFileId, ids)))
        : [];
      const imported = new Map(existing.map(row => [row.driveFileId, row.driveModifiedTime]));
      const pendentes = files.filter(file => !imported.has(file.id) || imported.get(file.id) !== (file.modifiedTime ?? null));
      const lote = pendentes.slice(0, input?.limite ?? 20);
      const resultados: Array<{ arquivo: string; status: string; escola?: string; erro?: string }> = [];

      for (const file of lote) {
        try {
          if (file.size && Number(file.size) > 25 * 1024 * 1024) {
            throw new Error("Foto acima do limite de 25 MB");
          }
          const buffer = await downloadDriveFile(file.id);
          const saved = await savePhoto({
            tenantId,
            buffer,
            originalNome: file.name,
            originalMimeType: file.mimeType,
            origem: "google_drive",
            caminhoOrigem: file.path,
            driveFile: file,
            allEscolas,
          });
          resultados.push({
            arquivo: file.path,
            status: saved.match.escola ? (saved.duplicada ? "duplicada" : "vinculada") : "revisao",
            escola: saved.match.escola?.nome,
          });
        } catch (error) {
          resultados.push({
            arquivo: file.path,
            status: "erro",
            erro: error instanceof Error ? error.message.slice(0, 250) : "Erro desconhecido",
          });
        }
      }
      const resumo = {
        encontrados: files.length,
        processados: lote.length,
        restantes: Math.max(0, pendentes.length - lote.length),
        vinculadas: resultados.filter(item => item.status === "vinculada").length,
        revisao: resultados.filter(item => item.status === "revisao").length,
        erros: resultados.filter(item => item.status === "erro").length,
      };
      await db.update(redeExternaConfig).set({
        ultimaSincronizacao: new Date(),
        ultimoResultado: safeJson({ resumo, resultados }),
      }).where(eq(redeExternaConfig.tenantId, tenantId));
      return { ...resumo, resultados };
    }),

  importarFoto: tenantAdminProcedure
    .input(z.object({
      imageBase64: z.string().min(16),
      mimeType: z.string().max(120).default("application/octet-stream"),
      nome: z.string().min(1).max(500),
      caminho: z.string().min(1).max(4000),
      origem: z.enum(ORIGENS).default("manual"),
      escolaId: z.number().int().positive().optional(),
      categoria: z.enum(FOTO_CATEGORIAS).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const buffer = Buffer.from(input.imageBase64, "base64");
      return savePhoto({
        tenantId: (ctx as any).tenantId,
        buffer,
        originalNome: input.nome,
        originalMimeType: input.mimeType,
        origem: input.origem,
        caminhoOrigem: input.caminho,
        escolaId: input.escolaId,
        categoria: input.categoria,
      });
    }),

  atualizarStatus: tenantAdminProcedure
    .input(z.object({
      escolaId: z.number().int().positive(),
      status: z.enum(REDE_STATUS),
      tipo: z.enum(REDE_TIPOS).nullable().optional(),
      observacao: z.string().max(3000).nullable().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = (ctx as any).tenantId as number;
      const school = await db.select({ id: escolas.id }).from(escolas)
        .where(and(eq(escolas.id, input.escolaId), eq(escolas.tenantId, tenantId))).limit(1);
      if (!school[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Escola não encontrada" });
      await db.update(escolas).set({
        redeExternaStatus: input.status,
        redeExternaTipo: input.tipo,
        redeExternaObservacao: input.observacao,
      }).where(and(eq(escolas.id, input.escolaId), eq(escolas.tenantId, tenantId)));
      return { success: true };
    }),

  vincularFoto: tenantAdminProcedure
    .input(z.object({
      fotoId: z.number().int().positive(),
      escolaId: z.number().int().positive(),
      categoria: z.enum(FOTO_CATEGORIAS),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = (ctx as any).tenantId as number;
      const [photo, school] = await Promise.all([
        db.select().from(redeExternaFotos).where(and(eq(redeExternaFotos.id, input.fotoId), eq(redeExternaFotos.tenantId, tenantId))).limit(1),
        db.select().from(escolas).where(and(eq(escolas.id, input.escolaId), eq(escolas.tenantId, tenantId))).limit(1),
      ]);
      if (!photo[0] || !school[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Foto ou escola não encontrada" });
      await db.update(redeExternaFotos).set({
        escolaId: input.escolaId,
        categoria: input.categoria,
        statusVinculo: "vinculada",
      }).where(and(eq(redeExternaFotos.id, input.fotoId), eq(redeExternaFotos.tenantId, tenantId)));
      await db.update(escolas).set({ redeExternaStatus: "com_rede" })
        .where(and(eq(escolas.id, input.escolaId), eq(escolas.tenantId, tenantId)));
      return { success: true };
    }),

  classificarFoto: tenantAdminProcedure
    .input(z.object({
      fotoId: z.number().int().positive(),
      categoria: z.enum(FOTO_CATEGORIAS),
      titulo: z.string().trim().max(255).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const tenantId = (ctx as any).tenantId as number;
      const photo = await db.select({ id: redeExternaFotos.id }).from(redeExternaFotos).where(and(
        eq(redeExternaFotos.id, input.fotoId),
        eq(redeExternaFotos.tenantId, tenantId),
        eq(redeExternaFotos.statusVinculo, "vinculada"),
      )).limit(1);
      if (!photo[0]) throw new TRPCError({ code: "NOT_FOUND", message: "Foto não encontrada" });
      await db.update(redeExternaFotos).set({
        categoria: input.categoria,
        ...(input.titulo !== undefined ? { titulo: input.titulo || null } : {}),
      }).where(and(eq(redeExternaFotos.id, input.fotoId), eq(redeExternaFotos.tenantId, tenantId)));
      return { success: true };
    }),

  ignorarFoto: tenantAdminProcedure
    .input(z.object({ fotoId: z.number().int().positive() }))
    .mutation(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      await db.update(redeExternaFotos).set({ statusVinculo: "ignorada" })
        .where(and(eq(redeExternaFotos.id, input.fotoId), eq(redeExternaFotos.tenantId, (ctx as any).tenantId)));
      return { success: true };
    }),

  escolaTecnico: tecnicoProcedure
    .input(z.object({ escolaId: z.number().int().positive() }))
    .query(async ({ ctx, input }) => {
      const db = await getDb();
      if (!db) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR" });
      const session = ctx.tecnicoSession!;
      const school = await db.select().from(escolas).where(and(
        eq(escolas.id, input.escolaId),
        eq(escolas.tenantId, session.tenantId),
        eq(escolas.tecnicoId, session.tecnicoId),
      )).limit(1);
      if (!school[0]) throw new TRPCError({ code: "FORBIDDEN", message: "Escola fora da atribuição do técnico" });
      const fotos = await db.select().from(redeExternaFotos).where(and(
        eq(redeExternaFotos.tenantId, session.tenantId),
        eq(redeExternaFotos.escolaId, input.escolaId),
        eq(redeExternaFotos.statusVinculo, "vinculada"),
      )).orderBy(desc(redeExternaFotos.createdAt)).limit(100);
      const fotoRoteador = fotos.find(foto => foto.categoria === "roteador_modem") ?? null;
      return { escola: school[0], fotos, fotoRoteador };
    }),
});
