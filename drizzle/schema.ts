import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
} from "drizzle-orm/mysql-core";

export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

// Tabela de Técnicos
export const tecnicos = mysqlTable("tecnicos", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  telefone: varchar("telefone", { length: 20 }),
  email: varchar("email", { length: 320 }).notNull().unique(),
  senhaHash: varchar("senhaHash", { length: 255 }).notNull(),
  cidadeResponsavel: varchar("cidadeResponsavel", { length: 255 }),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tecnico = typeof tecnicos.$inferSelect;
export type InsertTecnico = typeof tecnicos.$inferInsert;

// Tabela de Escolas
export const escolas = mysqlTable("escolas", {
  id: int("id").autoincrement().primaryKey(),
  inep: varchar("inep", { length: 20 }).notNull().unique(),
  uf: varchar("uf", { length: 2 }),
  municipio: varchar("municipio", { length: 255 }),
  nome: varchar("nome", { length: 255 }).notNull(),
  endereco: text("endereco"),
  latitude: decimal("latitude", { precision: 12, scale: 8 }),
  longitude: decimal("longitude", { precision: 12, scale: 8 }),
  qtdAp: int("qtdAp").default(1),
  apAdicional: int("apAdicional"),
  kitWifi: int("kitWifi"),
  telefone: varchar("telefone", { length: 20 }),
  velocidadeMinima: int("velocidadeMinima"),
  velocidadeOfertada: int("velocidadeOfertada"),
  tipoConexao: varchar("tipoConexao", { length: 50 }).default("Fibra"),
  status: mysqlEnum("status", ["pendente", "em_andamento", "concluido"]).default("pendente").notNull(),
  tecnicoId: int("tecnicoId"),
  dataAtribuicao: timestamp("dataAtribuicao"),
  dataConclusao: timestamp("dataConclusao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Escola = typeof escolas.$inferSelect;
export type InsertEscola = typeof escolas.$inferInsert;

// Tabela de Atribuições Manuais (sobrescreve regra de cidade)
export const atribuicoesManual = mysqlTable("atribuicoes_manual", {
  id: int("id").autoincrement().primaryKey(),
  escolaId: int("escolaId").notNull(),
  tecnicoId: int("tecnicoId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AtribuicaoManual = typeof atribuicoesManual.$inferSelect;
export type InsertAtribuicaoManual = typeof atribuicoesManual.$inferInsert;

// Tabela de Ordens de Serviço
export const ordensServico = mysqlTable("ordens_servico", {
  id: int("id").autoincrement().primaryKey(),
  escolaId: int("escolaId").notNull(),
  tecnicoId: int("tecnicoId").notNull(),
  status: mysqlEnum("status", ["aberta", "em_andamento", "concluida"]).default("aberta").notNull(),
  qtdApInstalado: int("qtdApInstalado"),
  observacao: text("observacao"),
  dataAbertura: timestamp("dataAbertura").defaultNow().notNull(),
  dataConclusao: timestamp("dataConclusao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrdemServico = typeof ordensServico.$inferSelect;
export type InsertOrdemServico = typeof ordensServico.$inferInsert;
