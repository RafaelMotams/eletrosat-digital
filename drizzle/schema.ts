import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  index,
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
  status: mysqlEnum("status", ["ativo", "trial", "expirado", "suspenso", "cancelado"]).default("trial").notNull(),
  contato: varchar("contato", { length: 255 }), // nome do responsável
  email: varchar("email", { length: 320 }),
  telefone: varchar("telefone", { length: 30 }),
  observacoes: text("observacoes"),
  // Trial / demonstração
  diasTrial: int("diasTrial").default(5).notNull(), // padrão 5 dias
  trialInicio: timestamp("trialInicio").defaultNow().notNull(),
  trialFim: timestamp("trialFim"), // calculado ao criar: trialInicio + diasTrial
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
  emailVerificadoEm: timestamp("emailVerificadoEm"),
  emailVerificacaoHash: varchar("emailVerificacaoHash", { length: 128 }),
  emailVerificacaoExpiraEm: timestamp("emailVerificacaoExpiraEm"),
  ultimoLogin: timestamp("ultimoLogin"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type TenantAdmin = typeof tenantAdmins.$inferSelect;
export type InsertTenantAdmin = typeof tenantAdmins.$inferInsert;

// Sessões administrativas persistentes: permitem revogação imediata no logout
// e encerramento seletivo sem depender somente da expiração do JWT.
export const adminSessions = mysqlTable("admin_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  adminId: int("adminId").notNull(),
  tenantId: int("tenantId").notNull(),
  role: varchar("role", { length: 24 }).notNull(),
  isSuperAdmin: boolean("isSuperAdmin").default(false).notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
}, (table) => ({
  adminActiveIdx: index("admin_sessions_admin_active_idx").on(table.adminId, table.revokedAt, table.expiresAt),
  tenantActiveIdx: index("admin_sessions_tenant_active_idx").on(table.tenantId, table.revokedAt, table.expiresAt),
}));

export type AdminSession = typeof adminSessions.$inferSelect;

// Sessões técnicas persistentes: novas sessões carregam um identificador
// revogável; JWTs técnicos antigos permanecem válidos apenas até expirar.
export const tecnicoSessions = mysqlTable("tecnico_sessions", {
  id: varchar("id", { length: 64 }).primaryKey(),
  tecnicoId: int("tecnicoId").notNull(),
  tenantId: int("tenantId").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  revokedAt: timestamp("revokedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  lastSeenAt: timestamp("lastSeenAt").defaultNow().notNull(),
}, (table) => ({
  tecnicoActiveIdx: index("tecnico_sessions_tecnico_active_idx").on(table.tecnicoId, table.revokedAt, table.expiresAt),
  tenantActiveIdx: index("tecnico_sessions_tenant_active_idx").on(table.tenantId, table.revokedAt, table.expiresAt),
}));

export type TecnicoSessionRecord = typeof tecnicoSessions.$inferSelect;

// Solicitações públicas de cadastro: a conta só é criada após confirmação do email.
// A senha e o token são guardados exclusivamente em formato hash.
export const registrationRequests = mysqlTable("registration_requests", {
  id: int("id").autoincrement().primaryKey(),
  nome: varchar("nome", { length: 255 }).notNull(),
  empresaNome: varchar("empresaNome", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  email: varchar("email", { length: 320 }).notNull().unique(),
  senhaHash: varchar("senhaHash", { length: 255 }).notNull(),
  tokenHash: varchar("tokenHash", { length: 64 }).notNull().unique(),
  status: mysqlEnum("status", ["pendente", "confirmado", "expirado"]).default("pendente").notNull(),
  expiresAt: timestamp("expiresAt").notNull(),
  confirmedAt: timestamp("confirmedAt"),
  tenantId: int("tenantId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type RegistrationRequest = typeof registrationRequests.$inferSelect;

// ============================================================
// TABELAS PRINCIPAIS (com tenant_id para isolamento)
// ============================================================

// Tabela de Técnicos
export const tecnicos = mysqlTable("tecnicos", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(), // isolamento por tenant obrigatório
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
  tenantId: int("tenantId").notNull(), // isolamento por tenant obrigatório
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
  motivoNaoInstalacao: mysqlEnum("motivoNaoInstalacao", ["escola_desativada", "em_reforma", "mudanca_endereco"]),
  tecnicoId: int("tecnicoId"),
  dataAtribuicao: timestamp("dataAtribuicao"),
  dataConclusao: timestamp("dataConclusao"),
  ativo: boolean("ativo").default(true).notNull(),
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
  tenantId: int("tenantId").notNull(),
  escolaId: int("escolaId").notNull(),
  tecnicoId: int("tecnicoId").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type AtribuicaoManual = typeof atribuicoesManual.$inferSelect;
export type InsertAtribuicaoManual = typeof atribuicoesManual.$inferInsert;

// Tabela de Ordens de Serviço
export const ordensServico = mysqlTable("ordens_servico", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
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
}, (table) => ({
  // UNIQUE: uma OS por escola por técnico — impede duplicação mesmo com retry concorrente
  escolaTecnicoIdx: uniqueIndex("os_escola_tecnico_unique").on(table.escolaId, table.tecnicoId),
}));

export type OrdemServico = typeof ordensServico.$inferSelect;
export type InsertOrdemServico = typeof ordensServico.$inferInsert;

// Tabela de Fotos das Ordens de Serviço (por categoria)
export const osFotos = mysqlTable("os_fotos", {
  id: int("id").autoincrement().primaryKey(),
  // Preenchido na fase de compatibilidade; registros antigos serão auditados e
  // preenchidos antes de tornar a coluna obrigatória em migração posterior.
  tenantId: int("tenantId"),
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
}, (table) => ({
  // UNIQUE por clientId — impede upload duplicado mesmo com retry offline
  clientIdIdx: uniqueIndex("os_fotos_client_id_unique").on(table.clientId),
  tenantOsIdx: index("os_fotos_tenant_os_idx").on(table.tenantId, table.osId),
}));

export type OsFoto = typeof osFotos.$inferSelect;
export type InsertOsFoto = typeof osFotos.$inferInsert;

// Tabela de Valores por AP por Técnico (1 a 15 APs)
export const tecnicoValoresAp = mysqlTable("tecnico_valores_ap", {
  id: int("id").autoincrement().primaryKey(),
  tecnicoId: int("tecnicoId").notNull(),
  tenantId: int("tenantId").notNull(),
  qtdAp: int("qtdAp").notNull(), // 1 a 15
  valor: decimal("valor", { precision: 10, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TecnicoValorAp = typeof tecnicoValoresAp.$inferSelect;
export type InsertTecnicoValorAp = typeof tecnicoValoresAp.$inferInsert;

// ============================================================
// ESTOQUE OPERACIONAL (isolado por tenant)
// ============================================================
// O catálogo pertence à empresa. Códigos são únicos somente dentro do tenant.
export const materiaisEstoque = mysqlTable("materiais_estoque", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  codigo: varchar("codigo", { length: 80 }).notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  categoria: varchar("categoria", { length: 100 }),
  unidade: varchar("unidade", { length: 20 }).default("un").notNull(),
  estoqueMinimo: decimal("estoqueMinimo", { precision: 12, scale: 3 }).default("0.000").notNull(),
  ativo: boolean("ativo").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  tenantCodigoIdx: uniqueIndex("materiais_tenant_codigo_unique").on(table.tenantId, table.codigo),
  tenantNomeIdx: index("materiais_tenant_nome_idx").on(table.tenantId, table.nome),
}));
export type MaterialEstoque = typeof materiaisEstoque.$inferSelect;
export type InsertMaterialEstoque = typeof materiaisEstoque.$inferInsert;

// Saldo por detentor. O almoxarifado usa holderType="almoxarifado" e holderId=0;
// um técnico usa holderType="tecnico" e o próprio tecnicoId.
export const estoqueSaldos = mysqlTable("estoque_saldos", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  materialId: int("materialId").notNull(),
  holderType: mysqlEnum("holderType", ["almoxarifado", "tecnico"]).notNull(),
  holderId: int("holderId").notNull().default(0),
  quantidade: decimal("quantidade", { precision: 12, scale: 3 }).default("0.000").notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  saldoUnicoIdx: uniqueIndex("estoque_saldo_holder_unique").on(table.tenantId, table.materialId, table.holderType, table.holderId),
  tenantHolderIdx: index("estoque_saldo_tenant_holder_idx").on(table.tenantId, table.holderType, table.holderId),
}));
export type EstoqueSaldo = typeof estoqueSaldos.$inferSelect;
export type InsertEstoqueSaldo = typeof estoqueSaldos.$inferInsert;

// Livro-razão append-only. O saldo é atualizado na mesma transação da movimentação.
export const estoqueMovimentacoes = mysqlTable("estoque_movimentacoes", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  materialId: int("materialId").notNull(),
  tipo: mysqlEnum("tipo", ["entrada", "transferencia", "consumo", "devolucao", "ajuste"]).notNull(),
  origemType: mysqlEnum("origemType", ["almoxarifado", "tecnico", "externo"]).notNull(),
  origemId: int("origemId").notNull().default(0),
  destinoType: mysqlEnum("destinoType", ["almoxarifado", "tecnico", "consumo"]).notNull(),
  destinoId: int("destinoId").notNull().default(0),
  quantidade: decimal("quantidade", { precision: 12, scale: 3 }).notNull(),
  ordemServicoId: int("ordemServicoId"),
  manutencaoId: int("manutencaoId"),
  observacao: text("observacao"),
  clientId: varchar("clientId", { length: 100 }),
  actorType: mysqlEnum("actorType", ["admin", "tecnico", "sistema"]).notNull(),
  actorId: int("actorId"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  clientIdIdx: uniqueIndex("estoque_mov_client_id_unique").on(table.clientId),
  tenantCreatedIdx: index("estoque_mov_tenant_created_idx").on(table.tenantId, table.createdAt),
  materialCreatedIdx: index("estoque_mov_material_created_idx").on(table.tenantId, table.materialId, table.createdAt),
}));
export type EstoqueMovimentacao = typeof estoqueMovimentacoes.$inferSelect;
export type InsertEstoqueMovimentacao = typeof estoqueMovimentacoes.$inferInsert;

// Tabela de Planilhas Importadas (histórico de uploads de planilhas de escolas)
export const planilhasImportadas = mysqlTable("planilhas_importadas", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  nome: varchar("nome", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  fileUrl: text("fileUrl").notNull(),
  totalEscolas: int("totalEscolas").default(0),
  ativa: boolean("ativa").default(true).notNull(),
  descricao: text("descricao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type PlanilhaImportada = typeof planilhasImportadas.$inferSelect;
export type InsertPlanilhaImportada = typeof planilhasImportadas.$inferInsert;

// ============================================================
// MÓDULO DE MANUTENÇÃO
// ============================================================

// Tabela de Ordens de Manutenção
export const manutencoes = mysqlTable("manutencoes", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull(),
  escolaId: int("escolaId"), // opcional se usar escolaNaoCadastrada
  // Escola não cadastrada (quando criar OS para escola nova)
  escolaNaoCadastradaNome: varchar("escolaNaoCadastradaNome", { length: 255 }),
  escolaNaoCadastradaInep: varchar("escolaNaoCadastradaInep", { length: 20 }),
  escolaNaoCadastradaMunicipio: varchar("escolaNaoCadastradaMunicipio", { length: 255 }),
  escolaNaoCadastradaEndereco: text("escolaNaoCadastradaEndereco"),
  escolaNaoCadastradaLatitude: decimal("escolaNaoCadastradaLatitude", { precision: 10, scale: 8 }),
  escolaNaoCadastradaLongitude: decimal("escolaNaoCadastradaLongitude", { precision: 11, scale: 8 }),
  escolaNaoCadastradaWhatsapp: varchar("escolaNaoCadastradaWhatsapp", { length: 20 }),
  tecnicoId: int("tecnicoId"),
  status: mysqlEnum("status", ["pendente", "em_andamento", "concluida"]).default("pendente").notNull(),
  // Descrição do problema (obrigatório ao criar)
  descricaoProblema: text("descricaoProblema").notNull(),
  // Observação do técnico ao concluir (obrigatória)
  observacaoConclusao: text("observacaoConclusao"),
  // Quilometragem em km - será multiplicada por 2,50 para cálculo de valor
  quilometragem: decimal("quilometragem", { precision: 8, scale: 2 }).default('0'),
  // Fotos do defeito (antes) — URLs separadas por vírgula ou JSON
  fotoDefeitoUrls: text("fotoDefeitoUrls"),
  fotoDefeitoKeys: text("fotoDefeitoKeys"),
  // Fotos após conclusão (depois)
  fotoConclusaoUrls: text("fotoConclusaoUrls"),
  fotoConclusaoKeys: text("fotoConclusaoKeys"),
  // Datas
  dataAtribuicao: timestamp("dataAtribuicao"),
  dataConclusao: timestamp("dataConclusao"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type Manutencao = typeof manutencoes.$inferSelect;
export type InsertManutencao = typeof manutencoes.$inferInsert;

// Fotos de manutenção (estrutura separada para múltiplas fotos)
export const manutencaoFotos = mysqlTable("manutencao_fotos", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"),
  manutencaoId: int("manutencaoId").notNull(),
  tipo: mysqlEnum("tipo", ["defeito", "conclusao"]).notNull(),
  url: text("url").notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(),
  clientId: varchar("clientId", { length: 100 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  clientIdIdx: uniqueIndex("manutencao_fotos_client_id_unique").on(table.clientId),
  tenantManutencaoIdx: index("manutencao_fotos_tenant_manutencao_idx").on(table.tenantId, table.manutencaoId),
}));
export type ManutencaoFoto = typeof manutencaoFotos.$inferSelect;

// ============================================================
// CONFIGURAÇÃO UNIVERSAL POR TENANT (IA + Multi-segmento)
// ============================================================
// Configuração do tipo de negócio e terminologia por tenant
export const tenantConfig = mysqlTable("tenant_config", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId").notNull().unique(),
  // Tipo de negócio (detectado/escolhido pelo usuário, sugerido pela IA)
  // ex: "escola", "telecom", "energia_solar", "seguranca", "climatizacao", "saude", "varejo", "geral"
  segmento: varchar("segmento", { length: 100 }).default("geral"),
  descricaoNegocio: text("descricaoNegocio"), // descrição livre do negócio para a IA adaptar
  // Terminologia personalizada (JSON)
  // ex: { "local": "Escola", "locais": "Escolas", "tecnico": "Instalador", "os": "Ordem de Serviço", "campo1Label": "INEP" }
  terminologia: text("terminologia"),
  // Campos extras dinâmicos para o cadastro de locais (JSON array)
  // ex: [{ "key": "inep", "label": "INEP", "type": "text", "required": true }]
  camposExtras: text("camposExtras"),
  // Cor primária do tema do painel do cliente
  corPrimaria: varchar("corPrimaria", { length: 20 }).default("#00f5a0"),
  // Logo URL do cliente
  logoUrl: text("logoUrl"),
  // Configurações de fluxo (JSON)
  // ex: { "exigirFoto": true, "exigirObservacao": true, "usarMapa": true }
  configFluxo: text("configFluxo"),
  // Status da configuração inicial
  configurado: boolean("configurado").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});
export type TenantConfig = typeof tenantConfig.$inferSelect;
export type InsertTenantConfig = typeof tenantConfig.$inferInsert;

// ============================================================
// LOGS DE LOGIN (Segurança - Auditoria de Acessos)
// ============================================================
export const loginLogs = mysqlTable("login_logs", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"),
  email: varchar("email", { length: 255 }).notNull(),
  tipo: mysqlEnum("tipo", ["admin", "superadmin", "tecnico"]).notNull(),
  sucesso: boolean("sucesso").notNull(),
  ip: varchar("ip", { length: 64 }),
  userAgent: varchar("userAgent", { length: 512 }),
  motivoFalha: varchar("motivoFalha", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});
export type LoginLog = typeof loginLogs.$inferSelect;
export type InsertLoginLog = typeof loginLogs.$inferInsert;

// ============================================================
// BRUTE FORCE PROTECTION
// ============================================================
export const loginAttempts = mysqlTable("login_attempts", {
  id: int("id").autoincrement().primaryKey(),
  email: varchar("email", { length: 255 }).notNull(),
  ip: varchar("ip", { length: 64 }),
  tentativas: int("tentativas").default(0).notNull(),
  bloqueadoAte: timestamp("bloqueadoAte"),
  ultimaTentativa: timestamp("ultimaTentativa").defaultNow().notNull(),
});
export type LoginAttempt = typeof loginAttempts.$inferSelect;

// ============================================================
// AUDITORIA OPERACIONAL (append-only pela aplicação)
// ============================================================
export const auditEvents = mysqlTable("audit_events", {
  id: int("id").autoincrement().primaryKey(),
  tenantId: int("tenantId"),
  actorType: mysqlEnum("actorType", ["superadmin", "admin", "viewer", "tecnico", "sistema"]).notNull(),
  actorId: int("actorId"),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entityType", { length: 100 }).notNull(),
  entityId: varchar("entityId", { length: 100 }),
  success: boolean("success").default(true).notNull(),
  metadata: text("metadata"),
  ip: varchar("ip", { length: 64 }),
  userAgent: varchar("userAgent", { length: 512 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tenantCreatedIdx: index("audit_tenant_created_idx").on(table.tenantId, table.createdAt),
  actorCreatedIdx: index("audit_actor_created_idx").on(table.actorType, table.actorId, table.createdAt),
}));

export type AuditEvent = typeof auditEvents.$inferSelect;
export type InsertAuditEvent = typeof auditEvents.$inferInsert;
