import { and, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import mysql2 from "mysql2";
import {
  InsertUser,
  atribuicoesManual,
  escolas,
  ordensServico,
  osFotos,
  tecnicos,
  tecnicoValoresAp,
  users,
  type InsertEscola,
  type InsertOrdemServico,
  type InsertTecnico,
  type InsertOsFoto,
} from "../drizzle/schema";
import { ENV } from "./_core/env";

let _db: ReturnType<typeof drizzle> | null = null;
let _pool: mysql2.Pool | null = null;

function getPool(): mysql2.Pool {
  if (!_pool && process.env.DATABASE_URL) {
    _pool = mysql2.createPool({
      uri: process.env.DATABASE_URL,
      connectionLimit: 20,      // suporta 15+ usuários simultâneos com margem
      queueLimit: 50,           // fila de até 50 requisições antes de rejeitar
      waitForConnections: true, // aguarda conexão disponível em vez de falhar
      enableKeepAlive: true,    // mantém conexões vivas (evita timeout)
      keepAliveInitialDelay: 10000,
    });
  }
  return _pool!;
}

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(getPool());
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

export async function listTecnicos(tenantId?: number) {
  const db = await getDb();
  if (!db) return [];
  const conditions: ReturnType<typeof eq>[] = [eq(tecnicos.ativo, true)];
  if (tenantId !== undefined) conditions.push(eq(tecnicos.tenantId, tenantId));
  return db.select().from(tecnicos).where(and(...conditions)).orderBy(tecnicos.nome);
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
  // Prioriza o registro ativo; se não houver ativo, retorna undefined
  const result = await db.select().from(tecnicos)
    .where(and(eq(tecnicos.email, email), eq(tecnicos.ativo, true)))
    .limit(1);
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

export async function listEscolas(filters?: { tecnicoId?: number; status?: string; municipio?: string; tenantId?: number }) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.tenantId !== undefined) conditions.push(eq(escolas.tenantId, filters.tenantId));
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
  tenantId?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [];
  if (filters?.tenantId !== undefined) conditions.push(eq(ordensServico.tenantId, filters.tenantId));
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

export async function iniciarOrdemServico(osId: number) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  await db
    .update(ordensServico)
    .set({ status: "em_andamento" })
    .where(eq(ordensServico.id, osId));
  // Atualizar escola vinculada
  const os = await getOrdemById(osId);
  if (os) {
    await db
      .update(escolas)
      .set({ status: "em_andamento" })
      .where(eq(escolas.id, os.escolaId));
  }
}

export async function registrarNaoInstalada(
  escolaId: number,
  tecnicoId: number,
  motivo: "escola_desativada" | "em_reforma" | "mudanca_endereco",
  observacao?: string
) {
  const db = await getDb();
  if (!db) throw new Error("DB not available");
  // Criar OS com status nao_instalada
  const result = await db.insert(ordensServico).values({
    escolaId,
    tecnicoId,
    status: "nao_instalada",
    motivoNaoInstalacao: motivo,
    observacao: observacao ?? "",
    dataConclusao: new Date(),
  });
  // Atualizar escola para nao_instalada
  await db
    .update(escolas)
    .set({ status: "nao_instalada", dataConclusao: new Date() })
    .where(eq(escolas.id, escolaId));
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

export async function getDashboardStats(tenantId?: number) {
  const db = await getDb();
  if (!db) return null;

  const tFilter = tenantId !== undefined ? eq(escolas.tenantId, tenantId) : undefined;
  const tOsFilter = tenantId !== undefined ? eq(ordensServico.tenantId, tenantId) : undefined;
  const [totalEscolas] = await db.select({ count: sql<number>`count(*)` }).from(escolas).where(tFilter);
  const [concluidas] = await db
    .select({ count: sql<number>`count(*)` })
    .from(escolas)
    .where(tFilter ? and(tFilter, eq(escolas.status, "concluido")) : eq(escolas.status, "concluido"));
  const [pendentes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(escolas)
    .where(tFilter ? and(tFilter, eq(escolas.status, "pendente")) : eq(escolas.status, "pendente"));
  const [emAndamento] = await db
    .select({ count: sql<number>`count(*)` })
    .from(escolas)
    .where(tFilter ? and(tFilter, eq(escolas.status, "em_andamento")) : eq(escolas.status, "em_andamento"));
  const [totalAps] = await db
    .select({ total: sql<number>`COALESCE(SUM(${ordensServico.qtdApInstalado}), 0)` })
    .from(ordensServico)
    .where(tOsFilter ? and(tOsFilter, eq(ordensServico.status, "concluida")) : eq(ordensServico.status, "concluida"));

  // Total de APs planejados (soma de qtdAp de todas as escolas)
  const [totalApsPlanejados] = await db
    .select({ total: sql<number>`COALESCE(SUM(${escolas.qtdAp}), 0)` })
    .from(escolas)
    .where(tFilter);

  // Total de APs de escolas já concluídas
  const [totalApsConcluidos] = await db
    .select({ total: sql<number>`COALESCE(SUM(${escolas.qtdAp}), 0)` })
    .from(escolas)
    .where(tFilter ? and(tFilter, eq(escolas.status, "concluido")) : eq(escolas.status, "concluido"));

  return {
    totalEscolas: Number(totalEscolas?.count ?? 0),
    concluidas: Number(concluidas?.count ?? 0),
    pendentes: Number(pendentes?.count ?? 0),
    emAndamento: Number(emAndamento?.count ?? 0),
    totalApsInstalados: Number(totalAps?.total ?? 0),
    totalApsPlanejados: Number(totalApsPlanejados?.total ?? 0),
    totalApsConcluidos: Number(totalApsConcluidos?.total ?? 0),
  };
}

export async function getProdutividadePorTecnico(tenantId?: number) {
  const db = await getDb();
  if (!db) return [];

  const prodConditions: any[] = [eq(ordensServico.status, "concluida")];
  if (tenantId !== undefined) prodConditions.push(eq(ordensServico.tenantId, tenantId));
  const result = await db
    .select({
      tecnicoId: ordensServico.tecnicoId,
      tecnicoNome: tecnicos.nome,
      totalEscolas: sql<number>`count(*)`,
      totalAps: sql<number>`COALESCE(SUM(${ordensServico.qtdApInstalado}), 0)`,
    })
    .from(ordensServico)
    .leftJoin(tecnicos, eq(ordensServico.tecnicoId, tecnicos.id))
    .where(and(...prodConditions))
    .groupBy(ordensServico.tecnicoId, tecnicos.nome)
    .orderBy(desc(sql`count(*)`));

  return result.map((r) => ({
    tecnicoId: r.tecnicoId,
    tecnicoNome: r.tecnicoNome ?? "Desconhecido",
    totalEscolas: Number(r.totalEscolas),
    totalAps: Number(r.totalAps),
  }));
}

export async function getRelatorioTecnico(
  tecnicoId: number,
  dataInicio: Date | null,
  dataFim: Date | null,
  tenantId?: number
) {
  const db = await getDb();
  if (!db) return null;

  // Filtro de data: usa dataConclusao se preenchido, caso contrário usa createdAt
  // Se dataInicio/dataFim forem nulos, retorna todos os registros (período "Geral")
  const conditions: any[] = [
    eq(ordensServico.tecnicoId, tecnicoId),
    eq(ordensServico.status, "concluida"),
  ];
  if (tenantId !== undefined) conditions.push(eq(ordensServico.tenantId, tenantId));

  if (dataInicio && dataFim) {
    // Usa COALESCE(dataConclusao, createdAt) para garantir que OS sem dataConclusao também sejam encontradas
    conditions.push(
      sql`COALESCE(${ordensServico.dataConclusao}, ${ordensServico.createdAt}) >= ${dataInicio}` as any
    );
    conditions.push(
      sql`COALESCE(${ordensServico.dataConclusao}, ${ordensServico.createdAt}) <= ${dataFim}` as any
    );
  }

  const oss = await db
    .select()
    .from(ordensServico)
    .where(and(...conditions));

  const totalEscolas = oss.length;
  const totalAps = oss.reduce((acc, o) => acc + (o.qtdApInstalado ?? 0), 0);

  let mediaPorDia = 0;
  if (dataInicio && dataFim) {
    const dias = Math.max(1, Math.ceil((dataFim.getTime() - dataInicio.getTime()) / (1000 * 60 * 60 * 24)));
    mediaPorDia = Math.round((totalEscolas / dias) * 100) / 100;
  } else if (totalEscolas > 0 && oss.length > 0) {
    // Calcular média com base na primeira e última OS
    const datas = oss
      .map(o => (o.dataConclusao ?? o.createdAt)?.getTime() ?? 0)
      .filter(d => d > 0)
      .sort();
    if (datas.length >= 2) {
      const diasTotal = Math.max(1, Math.ceil((datas[datas.length - 1] - datas[0]) / (1000 * 60 * 60 * 24)));
      mediaPorDia = Math.round((totalEscolas / diasTotal) * 100) / 100;
    } else {
      mediaPorDia = totalEscolas;
    }
  }

  return { totalEscolas, totalAps, mediaPorDia };
}

/** Lista todos os municípios distintos das escolas */
export async function listMunicipios(tenantId?: number): Promise<string[]> {
  const db = await getDb();
  if (!db) return [];
  const query = db.selectDistinct({ municipio: escolas.municipio }).from(escolas);
  const rows = tenantId !== undefined
    ? await query.where(eq(escolas.tenantId, tenantId)).orderBy(escolas.municipio)
    : await query.orderBy(escolas.municipio);
  return rows.map(r => r.municipio).filter(Boolean) as string[];
}

/** Apaga todas as escolas de um município (e suas OS/atribuições associadas) */
export async function deleteEscolasPorCidade(municipio: string): Promise<number> {
  const db = await getDb();
  if (!db) return 0;

  // Buscar IDs das escolas do município
  const escolasList = await db
    .select({ id: escolas.id })
    .from(escolas)
    .where(eq(escolas.municipio, municipio));

  if (escolasList.length === 0) return 0;

  const ids = escolasList.map(e => e.id);

  // Apagar OS vinculadas
  for (const id of ids) {
    await db.delete(ordensServico).where(eq(ordensServico.escolaId, id));
    await db.delete(atribuicoesManual).where(eq(atribuicoesManual.escolaId, id));
    await db.delete(escolas).where(eq(escolas.id, id));
  }

  return ids.length;
}

/** Retorna lista detalhada de OS concluídas com dados da escola, para relatório */

export async function deleteAllOrdensServico(tenantId?: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  if (tenantId !== undefined) {
    const result = await db.delete(ordensServico).where(eq(ordensServico.tenantId, tenantId));
    return (result as any)[0]?.affectedRows ?? 0;
  }
  const result = await db.delete(ordensServico);
  return (result as any)[0]?.affectedRows ?? 0;
}


export async function resetEscolasStatusAposExcluirOS(tenantId?: number): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Resetar escolas que estavam "em_andamento" para "pendente"
  if (tenantId !== undefined) {
    await db.update(escolas)
      .set({ status: "pendente" })
      .where(and(eq(escolas.tenantId, tenantId), eq(escolas.status, "em_andamento")));
  } else {
    await db.update(escolas)
      .set({ status: "pendente" })
      .where(eq(escolas.status, "em_andamento"));
  }
}

export async function getOsDetalhadas(filters: {
  tecnicoId?: number;
  tecnicoIds?: number[];
  dataInicio?: Date | null;
  dataFim?: Date | null;
  tenantId?: number;
}) {
  const db = await getDb();
  if (!db) return [];
  const conditions: any[] = [eq(ordensServico.status, "concluida")];
  if (filters.tenantId !== undefined) conditions.push(eq(ordensServico.tenantId, filters.tenantId));
  if (filters.tecnicoIds && filters.tecnicoIds.length > 0) {
    conditions.push(inArray(ordensServico.tecnicoId, filters.tecnicoIds));
  } else if (filters.tecnicoId) {
    conditions.push(eq(ordensServico.tecnicoId, filters.tecnicoId));
  }
  if (filters.dataInicio && filters.dataFim) {
    conditions.push(
      sql`COALESCE(${ordensServico.dataConclusao}, ${ordensServico.createdAt}) >= ${filters.dataInicio}` as any
    );
    conditions.push(
      sql`COALESCE(${ordensServico.dataConclusao}, ${ordensServico.createdAt}) <= ${filters.dataFim}` as any
    );
  }

  const rows = await db
    .select({
      osId: ordensServico.id,
      escolaId: ordensServico.escolaId,
      escolaNome: escolas.nome,
      inep: escolas.inep,
      municipio: escolas.municipio,
      uf: escolas.uf,
      qtdApInstalado: ordensServico.qtdApInstalado,
      qtdApPlanejado: escolas.qtdAp,
      tecnicoId: ordensServico.tecnicoId,
      tecnicoNome: tecnicos.nome,
      dataConclusao: ordensServico.dataConclusao,
      createdAt: ordensServico.createdAt,
      observacao: ordensServico.observacao,
    })
    .from(ordensServico)
    .leftJoin(escolas, eq(ordensServico.escolaId, escolas.id))
    .leftJoin(tecnicos, eq(ordensServico.tecnicoId, tecnicos.id))
    .where(and(...conditions))
    .orderBy(desc(sql`COALESCE(${ordensServico.dataConclusao}, ${ordensServico.createdAt})`));

  return rows.map((r) => ({
    osId: r.osId,
    escolaId: r.escolaId,
    escolaNome: r.escolaNome ?? "—",
    inep: r.inep ?? "—",
    municipio: r.municipio ?? "—",
    uf: r.uf ?? "—",
    qtdApInstalado: r.qtdApInstalado ?? 0,
    qtdApPlanejado: r.qtdApPlanejado ?? 0,
    tecnicoId: r.tecnicoId,
    tecnicoNome: r.tecnicoNome ?? "Desconhecido",
    dataConclusao: r.dataConclusao ?? r.createdAt ?? null,
    observacao: r.observacao ?? "",
  }));
}

// ─── OS FOTOS ────────────────────────────────────────────────────────────────

export async function insertOsFoto(data: InsertOsFoto): Promise<void> {
  const db = await getDb();
  if (!db) return;
  await db.insert(osFotos).values(data);
}

export async function listOsFotos(osId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(osFotos).where(eq(osFotos.osId, osId)).orderBy(osFotos.createdAt);
}

export async function listOsFotosByEscola(escolaId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(osFotos).where(eq(osFotos.escolaId, escolaId)).orderBy(osFotos.createdAt);
}

export async function countOsFotosByCategoria(osId: number): Promise<Record<string, number>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db.select().from(osFotos).where(eq(osFotos.osId, osId));
  const counts: Record<string, number> = {};
  for (const row of rows) {
    counts[row.categoria] = (counts[row.categoria] ?? 0) + 1;
  }
  return counts;
}

// ─── VALORES POR AP POR TÉCNICO ──────────────────────────────────────────────
export async function getValoresApTecnico(tecnicoId: number): Promise<Record<number, number>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db
    .select()
    .from(tecnicoValoresAp)
    .where(eq(tecnicoValoresAp.tecnicoId, tecnicoId));
  const map: Record<number, number> = {};
  for (const row of rows) {
    map[row.qtdAp] = parseFloat(row.valor as string);
  }
  return map;
}

export async function setValoresApTecnico(
  tecnicoId: number,
  tenantId: number,
  valores: { qtdAp: number; valor: number }[]
): Promise<void> {
  const db = await getDb();
  if (!db) return;
  // Apaga os registros antigos e insere os novos (upsert manual)
  await db.delete(tecnicoValoresAp).where(eq(tecnicoValoresAp.tecnicoId, tecnicoId));
  const toInsert = valores
    .filter(v => v.valor > 0)
    .map(v => ({
      tecnicoId,
      tenantId,
      qtdAp: v.qtdAp,
      valor: String(v.valor),
    }));
  if (toInsert.length > 0) {
    await db.insert(tecnicoValoresAp).values(toInsert);
  }
}

export async function getValoresApAllTecnicos(tenantId: number): Promise<Record<number, Record<number, number>>> {
  const db = await getDb();
  if (!db) return {};
  const rows = await db
    .select()
    .from(tecnicoValoresAp)
    .where(eq(tecnicoValoresAp.tenantId, tenantId));
  const map: Record<number, Record<number, number>> = {};
  for (const row of rows) {
    if (!map[row.tecnicoId]) map[row.tecnicoId] = {};
    map[row.tecnicoId][row.qtdAp] = parseFloat(row.valor as string);
  }
  return map;
}
