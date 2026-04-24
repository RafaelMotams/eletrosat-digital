import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  atribuicoesManual,
  escolas,
  ordensServico,
  tecnicos,
  users,
  type InsertEscola,
  type InsertOrdemServico,
  type InsertTecnico,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ─── USERS ────────────────────────────────────────────────────────────────────

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) throw new Error("User openId is required for upsert");
  const db = await getDb();
  if (!db) return;

  const values: InsertUser = { openId: user.openId };
  const updateSet: Record<string, unknown> = {};
  const textFields = ["name", "email", "loginMethod"] as const;
  type TextField = (typeof textFields)[number];
  const assignNullable = (field: TextField) => {
    const value = user[field];
    if (value === undefined) return;
    const normalized = value ?? null;
    values[field] = normalized;
    updateSet[field] = normalized;
  };
  textFields.forEach(assignNullable);
  if (user.lastSignedIn !== undefined) {
    values.lastSignedIn = user.lastSignedIn;
    updateSet.lastSignedIn = user.lastSignedIn;
  }
  if (user.role !== undefined) {
    values.role = user.role;
    updateSet.role = user.role;
  } else if (user.openId === ENV.ownerOpenId) {
    values.role = "admin";
    updateSet.role = "admin";
  }
  if (!values.lastSignedIn) values.lastSignedIn = new Date();
  if (Object.keys(updateSet).length === 0) updateSet.lastSignedIn = new Date();

  await db.insert(users).values(values).onDuplicateKeyUpdate({ set: updateSet });
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// ─── TÉCNICOS ─────────────────────────────────────────────────────────────────

export async function listTecnicos() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(tecnicos).where(eq(tecnicos.ativo, true)).orderBy(tecnicos.nome);
}

export async function getTecnicoById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tecnicos).where(eq(tecnicos.id, id)).limit(1);
  return result[0];
}

export async function getTecnicoByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tecnicos).where(eq(tecnicos.email, email)).limit(1);
  return result[0];
}

export async function createTecnico(data: InsertTecnico) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(tecnicos).values(data);
  return result;
}

export async function updateTecnico(id: number, data: Partial<InsertTecnico>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(tecnicos).set(data).where(eq(tecnicos.id, id));
}

export async function deleteTecnico(id: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(tecnicos).set({ ativo: false }).where(eq(tecnicos.id, id));
}

// ─── ESCOLAS ──────────────────────────────────────────────────────────────────

export async function listEscolas(filters?: { tecnicoId?: number; status?: string; municipio?: string }) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.tecnicoId) conditions.push(eq(escolas.tecnicoId, filters.tecnicoId));
  if (filters?.status) conditions.push(eq(escolas.status, filters.status as "pendente" | "em_andamento" | "concluido"));
  if (filters?.municipio) conditions.push(eq(escolas.municipio, filters.municipio));
  const query = db.select().from(escolas);
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(escolas.nome);
  }
  return query.orderBy(escolas.nome);
}

export async function getEscolaById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(escolas).where(eq(escolas.id, id)).limit(1);
  return result[0];
}

export async function getEscolaByInep(inep: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(escolas).where(eq(escolas.inep, inep)).limit(1);
  return result[0];
}

export async function createEscola(data: InsertEscola) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.insert(escolas).values(data).onDuplicateKeyUpdate({
    set: {
      nome: data.nome,
      endereco: data.endereco,
      municipio: data.municipio,
      uf: data.uf,
      latitude: data.latitude,
      longitude: data.longitude,
      qtdAp: data.qtdAp,
      kitWifi: data.kitWifi,
      apAdicional: data.apAdicional,
      telefone: data.telefone,
      velocidadeMinima: data.velocidadeMinima,
      velocidadeOfertada: data.velocidadeOfertada,
      tipoConexao: data.tipoConexao,
    },
  });
}

export async function updateEscola(id: number, data: Partial<InsertEscola>) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(escolas).set(data).where(eq(escolas.id, id));
}

export async function atribuirTecnicoEscola(escolaId: number, tecnicoId: number | null) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db.update(escolas).set({ tecnicoId, dataAtribuicao: new Date() }).where(eq(escolas.id, escolaId));
}

export async function atribuirPorCidade(cidade: string, tecnicoId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Buscar escolas sem atribuição manual nessa cidade
  const escolasManuais = await db.select({ escolaId: atribuicoesManual.escolaId }).from(atribuicoesManual);
  const idsManual = escolasManuais.map((a) => a.escolaId);

  const escolasDaCidade = await db
    .select()
    .from(escolas)
    .where(and(eq(escolas.municipio, cidade), eq(escolas.status, "pendente")));

  for (const escola of escolasDaCidade) {
    if (!idsManual.includes(escola.id)) {
      await db.update(escolas).set({ tecnicoId, dataAtribuicao: new Date() }).where(eq(escolas.id, escola.id));
    }
  }
}

export async function setAtribuicaoManual(escolaId: number, tecnicoId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Upsert na tabela de atribuições manuais
  await db
    .insert(atribuicoesManual)
    .values({ escolaId, tecnicoId })
    .onDuplicateKeyUpdate({ set: { tecnicoId } });
  // Atualizar a escola também
  await atribuirTecnicoEscola(escolaId, tecnicoId);
}

// ─── ORDENS DE SERVIÇO ────────────────────────────────────────────────────────

export async function listOrdensServico(filters?: {
  tecnicoId?: number;
  status?: string;
  dataInicio?: Date;
  dataFim?: Date;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions = [];
  if (filters?.tecnicoId) conditions.push(eq(ordensServico.tecnicoId, filters.tecnicoId));
  if (filters?.status) conditions.push(eq(ordensServico.status, filters.status as "aberta" | "em_andamento" | "concluida"));
  if (filters?.dataInicio) conditions.push(gte(ordensServico.dataAbertura, filters.dataInicio));
  if (filters?.dataFim) conditions.push(lte(ordensServico.dataAbertura, filters.dataFim));

  const query = db.select().from(ordensServico);
  if (conditions.length > 0) {
    return query.where(and(...conditions)).orderBy(desc(ordensServico.dataAbertura));
  }
  return query.orderBy(desc(ordensServico.dataAbertura));
}

export async function getOrdemById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(ordensServico).where(eq(ordensServico.id, id)).limit(1);
  return result[0];
}

export async function createOrdemServico(data: InsertOrdemServico) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const result = await db.insert(ordensServico).values(data);
  return result;
}

export async function concluirOrdemServico(id: number, qtdApInstalado: number, observacao: string) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  const now = new Date();
  await db
    .update(ordensServico)
    .set({ status: "concluida", qtdApInstalado, observacao, dataConclusao: now })
    .where(eq(ordensServico.id, id));

  // Atualizar escola vinculada
  const os = await getOrdemById(id);
  if (os) {
    await db
      .update(escolas)
      .set({ status: "concluido", dataConclusao: now })
      .where(eq(escolas.id, os.escolaId));
  }
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────

export async function getDashboardStats() {
  const db = await getDb();
  if (!db) return null;

  const [totalEscolas] = await db.select({ count: sql<number>`count(*)` }).from(escolas);
  const [concluidas] = await db
    .select({ count: sql<number>`count(*)` })
    .from(escolas)
    .where(eq(escolas.status, "concluido"));
  const [pendentes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(escolas)
    .where(eq(escolas.status, "pendente"));
  const [emAndamento] = await db
    .select({ count: sql<number>`count(*)` })
    .from(escolas)
    .where(eq(escolas.status, "em_andamento"));
  const [totalAps] = await db
    .select({ total: sql<number>`COALESCE(SUM(qtd_ap_instalado), 0)` })
    .from(ordensServico)
    .where(eq(ordensServico.status, "concluida"));

  return {
    totalEscolas: Number(totalEscolas?.count ?? 0),
    concluidas: Number(concluidas?.count ?? 0),
    pendentes: Number(pendentes?.count ?? 0),
    emAndamento: Number(emAndamento?.count ?? 0),
    totalApsInstalados: Number(totalAps?.total ?? 0),
  };
}

export async function getProdutividadePorTecnico() {
  const db = await getDb();
  if (!db) return [];

  const result = await db
    .select({
      tecnicoId: ordensServico.tecnicoId,
      tecnicoNome: tecnicos.nome,
      totalEscolas: sql<number>`count(*)`,
      totalAps: sql<number>`COALESCE(SUM(${ordensServico.qtdApInstalado}), 0)`,
    })
    .from(ordensServico)
    .leftJoin(tecnicos, eq(ordensServico.tecnicoId, tecnicos.id))
    .where(eq(ordensServico.status, "concluida"))
    .groupBy(ordensServico.tecnicoId, tecnicos.nome)
    .orderBy(desc(sql`count(*)`));

  return result.map((r) => ({
    tecnicoId: r.tecnicoId,
    tecnicoNome: r.tecnicoNome ?? "Desconhecido",
    totalEscolas: Number(r.totalEscolas),
    totalAps: Number(r.totalAps),
  }));
}

export async function getRelatorioTecnico(tecnicoId: number, dataInicio: Date, dataFim: Date) {
  const db = await getDb();
  if (!db) return null;

  const oss = await db
    .select()
    .from(ordensServico)
    .where(
      and(
        eq(ordensServico.tecnicoId, tecnicoId),
        eq(ordensServico.status, "concluida"),
        gte(ordensServico.dataConclusao, dataInicio),
        lte(ordensServico.dataConclusao, dataFim)
      )
    );

  const totalEscolas = oss.length;
  const totalAps = oss.reduce((acc, o) => acc + (o.qtdApInstalado ?? 0), 0);
  const dias = Math.max(1, Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)));
  const mediaPorDia = totalEscolas / dias;

  return { totalEscolas, totalAps, mediaPorDia: Math.round(mediaPorDia * 100) / 100 };
}
