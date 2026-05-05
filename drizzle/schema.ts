import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  uniqueIndex,
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

// ============================================================
// SISTEMA MULTI-TENANT (Revenda)
// ============================================================

// Tabela de Tenants (Clientes/Empresas que contratam o sistema)
export const tenants = mysqlTable("tenants", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(), // identificador único ex: "eletrosat", "telecom-ba"
  plano: mysqlEnum("plano", ["basico", "profissional", "enterprise"]).default("basico").notNull(),
  status: mysqlEnum("status", ["ativo", "suspenso", "cancelado"]).default("ativo").notNull(),
  contato: varchar("contato", { length: 255 }), // nome do responsável
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 30 }),
  observacoes: text("observacoes"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = typeof tenants.$inferInsert;

// Tabela de Admins de cada Tenant (usuários do painel administrativo)
export const tenantAdmins = mysqlTable("tenant_admins", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  senhaHash: varchar("senhaHash", { length: 255 }).notNull(),
  role: mysqlEnum("role", ["admin", "viewer"]).default("admin").notNull(), // admin = acesso total, viewer = só leitura
  ativo: boolean("ativo").default(true).notNull(),
  ultimoLogin: timestamp("ultimoLogin"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TenantAdmin = typeof tenantAdmins.$inferSelect;
export type InsertTenantAdmin = typeof tenantAdmins.$inferInsert;

// ============================================================
// TABELAS PRINCIPAIS (com tenant_id para isolamento)
// ============================================================

// Tabela de Técnicos
export const tecnicos = mysqlTable("tecnicos", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().default(1), // isolamento por tenant
  nome: varchar("nome", { length: 255 }).notNull(),
  telefone: varchar("telefone", { length: 20 }),
  email: varchar("email", { length: 320 }).notNull(),
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
  tenantId: int("tenantId").notNull().default(1), // isolamento por tenant
  inep: varchar("inep", { length: 20 }).notNull(),
  uf: varchar("uf", { length: 2 }),
  municipio: varchar("municipio", { length: 255 }),
  nome: varchar("nome", { length: 255 }).notNull(),
  endereco: text("endereco"),
  latitude: decimal("latitude", { precision: 12, scale: 8 }),
  longitude: decimal("longitude", { precision: 12, scale: 8 }),
  qtdAp: int("qtdAp").default(1),
  apAdicional: int("apAdicional"),
  kitWifi: int("kitWifi"),
  telefone: varchar("telefone", { length: 30 }),
  telefoneWhatsApp: varchar("telefoneWhatsApp", { length: 30 }),
  velocidadeMinima: varchar("velocidadeMinima", { length: 20 }),
  velocidadeOfertada: varchar("velocidadeOfertada", { length: 20 }),
  tipoConexao: varchar("tipoConexao", { length: 50 }).default("Fibra"),
  status: mysqlEnum("status", ["pendente", "em_andamento", "concluido", "nao_instalada"]).default("pendente").notNull(),
  tecnicoId: int("tecnicoId"),
  dataAtribuicao: timestamp("dataAtribuicao"),
  dataConclusao: timestamp("dataConclusao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  // Índice único por tenant+inep: garante que onDuplicateKeyUpdate funcione
  // e evita duplicatas ao reimportar a mesma planilha
  tenantInepIdx: uniqueIndex("tenant_inep_idx").on(table.tenantId, table.inep),
}));
export type Escola = typeof escolas.$inferSelect;
export type InsertEscola = typeof escolas.$inferInsert;

// Tabela de Atribuições Manuais (sobrescreve regra de cidade)
export const atribuicoesManual = mysqlTable("atribuicoes_manual", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().default(1),
  escolaId: int("escolaId").notNull(),
  tecnicoId: int("tecnicoId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AtribuicaoManual = typeof atribuicoesManual.$inferSelect;
export type InsertAtribuicaoManual = typeof atribuicoesManual.$inferInsert;

// Tabela de Ordens de Serviço
export const ordensServico = mysqlTable("ordens_servico", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().default(1),
  escolaId: int("escolaId").notNull(),
  tecnicoId: int("tecnicoId").notNull(),
  status: mysqlEnum("status", ["aberta", "em_andamento", "concluida", "nao_instalada"]).default("aberta").notNull(),
  qtdApInstalado: int("qtdApInstalado"),
  observacao: text("observacao"),
  motivoNaoInstalacao: mysqlEnum("motivoNaoInstalacao", ["escola_desativada", "em_reforma", "mudanca_endereco"]),
  fotoMapaCalorUrl: text("fotoMapaCalorUrl"),
  fotoMapaCalorKey: varchar("fotoMapaCalorKey", { length: 500 }),
  dataAbertura: timestamp("dataAbertura").defaultNow().notNull(),
  dataConclusao: timestamp("dataConclusao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type OrdemServico = typeof ordensServico.$inferSelect;
export type InsertOrdemServico = typeof ordensServico.$inferInsert;

// Tabela de Fotos das Ordens de Serviço (por categoria)
export const osFotos = mysqlTable("os_fotos", {
  id: int("id").autoincrement().primaryKey(),
  osId: int("osId").notNull(),
  escolaId: int("escolaId").notNull(),
  tecnicoId: int("tecnicoId").notNull(),
  // Categorias: mapa_calor | fotos_ap | etiqueta_serial_ap | etiqueta_controladora | etiqueta_nobreak | etiqueta_switch
  categoria: mysqlEnum("categoria", ["mapa_calor", "fotos_ap", "etiqueta_serial_ap", "etiqueta_controladora", "etiqueta_nobreak", "etiqueta_switch"]).notNull(),
  url: text("url").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  // clientId: ID único gerado pelo app offline para garantir idempotência no upload
  clientId: varchar("clientId", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type OsFoto = typeof osFotos.$inferSelect;
export type InsertOsFoto = typeof osFotos.$inferInsert;

// Tabela de Valores por AP por Técnico (1 a 15 APs)
export const tecnicoValoresAp = mysqlTable("tecnico_valores_ap", {
  id: int("id").autoincrement().primaryKey(),
  tecnicoId: int("tecnicoId").notNull(),
  tenantId: int("tenantId").notNull().default(1),
  qtdAp: int("qtdAp").notNull(), // 1 a 15
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TecnicoValorAp = typeof tecnicoValoresAp.$inferSelect;
export type InsertTecnicoValorAp = typeof tecnicoValoresAp.$inferInsert;
