import { drizzle } from "drizzle-orm/mysql2";
import { tenants, tenantAdmins, registrationRequests } from "../drizzle/schema";
import { desc, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

let _db: ReturnType<typeof drizzle> | null = null;
function getDb() {
  if (!_db) _db = drizzle(process.env.DATABASE_URL as string);
  return _db;
}
const db = getDb();

// ============================================================
// TENANTS (Clientes)
// ============================================================

export async function listTenants() {
  return db.select().from(tenants).orderBy(tenants.createdAt);
}

export async function getTenantById(id: number) {
  const rows = await db.select().from(tenants).where(eq(tenants.id, id));
  return rows[0] ?? null;
}

export async function getTenantBySlug(slug: string) {
  const rows = await db.select().from(tenants).where(eq(tenants.slug, slug));
  return rows[0] ?? null;
}

export async function createTenant(data: {
  nome: string;
  slug: string;
  plano: "basico" | "profissional" | "enterprise";
  contato?: string;
  email?: string;
  telefone?: string;
  observacoes?: string;
  diasTrial?: number;
}) {
  const dias = data.diasTrial ?? 5;
  const agora = new Date();
  const trialFim = new Date(agora.getTime() + dias * 24 * 60 * 60 * 1000);
  const { diasTrial: _dt, ...rest } = data;
  const result = await db.insert(tenants).values({
    ...rest,
    status: "trial",
    diasTrial: dias,
    trialInicio: agora,
    trialFim,
  });
  return result;
}

export async function updateTenant(
  id: number,
  data: Partial<{
    nome: string;
    slug: string;
    plano: "basico" | "profissional" | "enterprise";
    status: "ativo" | "trial" | "expirado" | "suspenso" | "cancelado";
    contato: string;
    email: string;
    telefone: string;
    observacoes: string;
  }>
) {
  return db.update(tenants).set(data).where(eq(tenants.id, id));
}

export async function deleteTenant(id: number) {
  return db.delete(tenants).where(eq(tenants.id, id));
}

// ============================================================
// TENANT ADMINS (Usuários do painel de cada cliente)
// ============================================================

export async function listTenantAdmins(tenantId: number) {
  return db
    .select({
      id: tenantAdmins.id,
      tenantId: tenantAdmins.tenantId,
      nome: tenantAdmins.nome,
      email: tenantAdmins.email,
      role: tenantAdmins.role,
      ativo: tenantAdmins.ativo,
      ultimoLogin: tenantAdmins.ultimoLogin,
      createdAt: tenantAdmins.createdAt,
    })
    .from(tenantAdmins)
    .where(eq(tenantAdmins.tenantId, tenantId));
}

export async function getTenantAdminByEmail(email: string) {
  const rows = await db
    .select()
    .from(tenantAdmins)
    .where(eq(tenantAdmins.email, email));
  return rows[0] ?? null;
}

export async function createTenantAdmin(data: {
  tenantId: number;
  nome: string;
  email: string;
  senha: string;
  role?: "admin" | "viewer";
}) {
  const senhaHash = await bcrypt.hash(data.senha, 10);
  return db.insert(tenantAdmins).values({
    tenantId: data.tenantId,
    nome: data.nome,
    email: data.email,
    senhaHash,
    role: data.role ?? "admin",
    ativo: true,
  });
}

// ============================================================
// CADASTRO PÚBLICO COM CONFIRMAÇÃO DE EMAIL
// ============================================================

export async function getRegistrationRequestByEmail(email: string) {
  const rows = await db.select().from(registrationRequests).where(eq(registrationRequests.email, email));
  return rows[0] ?? null;
}

export async function getRegistrationRequestByTokenHash(tokenHash: string) {
  const rows = await db.select().from(registrationRequests).where(eq(registrationRequests.tokenHash, tokenHash));
  return rows[0] ?? null;
}

export async function createRegistrationRequest(data: {
  nome: string;
  empresaNome: string;
  slug: string;
  email: string;
  senhaHash: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  return db.insert(registrationRequests).values({ ...data, status: "pendente" });
}

export async function refreshRegistrationRequest(id: number, data: {
  nome: string;
  empresaNome: string;
  slug: string;
  senhaHash: string;
  tokenHash: string;
  expiresAt: Date;
}) {
  return db.update(registrationRequests)
    .set({ ...data, status: "pendente", confirmedAt: null, tenantId: null })
    .where(eq(registrationRequests.id, id));
}

export async function expireRegistrationRequest(id: number) {
  return db.update(registrationRequests).set({ status: "expirado" }).where(eq(registrationRequests.id, id));
}

export async function confirmRegistrationRequest(id: number) {
  return db.transaction(async (tx) => {
    const [request] = await tx.select().from(registrationRequests).where(eq(registrationRequests.id, id));
    if (!request || request.status !== "pendente") throw new Error("Solicitação de cadastro inválida");

    await tx.insert(tenants).values({
      nome: request.empresaNome,
      slug: request.slug,
      plano: "basico",
      status: "trial",
      contato: request.nome,
      email: request.email,
      diasTrial: 5,
      trialInicio: new Date(),
      trialFim: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
    });

    const [tenant] = await tx.select().from(tenants).where(eq(tenants.slug, request.slug));
    if (!tenant) throw new Error("Não foi possível criar o tenant");

    await tx.insert(tenantAdmins).values({
      tenantId: tenant.id,
      nome: request.nome,
      email: request.email,
      senhaHash: request.senhaHash,
      role: "admin",
      ativo: true,
    });

    await tx.update(registrationRequests)
      .set({ status: "confirmado", confirmedAt: new Date(), tenantId: tenant.id })
      .where(eq(registrationRequests.id, id));

    return tenant;
  });
}

export async function listRegistrationRequests() {
  return db.select({
    id: registrationRequests.id,
    nome: registrationRequests.nome,
    empresaNome: registrationRequests.empresaNome,
    email: registrationRequests.email,
    status: registrationRequests.status,
    expiresAt: registrationRequests.expiresAt,
    confirmedAt: registrationRequests.confirmedAt,
    tenantId: registrationRequests.tenantId,
    createdAt: registrationRequests.createdAt,
  }).from(registrationRequests).orderBy(desc(registrationRequests.createdAt));
}

export async function updateTenantAdmin(
  id: number,
  data: Partial<{
    nome: string;
    email: string;
    senha: string;
    role: "admin" | "viewer";
    ativo: boolean;
  }>
) {
  const updateData: Record<string, unknown> = { ...data };
  if (data.senha) {
    updateData.senhaHash = await bcrypt.hash(data.senha, 10);
    delete updateData.senha;
  }
  return db.update(tenantAdmins).set(updateData).where(eq(tenantAdmins.id, id));
}

export async function deleteTenantAdmin(id: number) {
  return db.delete(tenantAdmins).where(eq(tenantAdmins.id, id));
}


export async function updateTenantAdminPassword(id: number, novaSenha: string) {
  const senhaHash = await bcrypt.hash(novaSenha, 10);
  return db.update(tenantAdmins).set({ senhaHash }).where(eq(tenantAdmins.id, id));
}

export async function verifyTenantAdminPassword(
  email: string,
  senha: string
): Promise<{ admin: Omit<typeof tenantAdmins.$inferSelect, "senhaHash"> | null; tenant: typeof tenants.$inferSelect | null }> {
  const admin = await getTenantAdminByEmail(email);
  if (!admin || !admin.ativo) return { admin: null, tenant: null };

  const valid = await bcrypt.compare(senha, admin.senhaHash);
  if (!valid) return { admin: null, tenant: null };

  // Atualizar último login
  await db
    .update(tenantAdmins)
    .set({ ultimoLogin: new Date() })
    .where(eq(tenantAdmins.id, admin.id));

  // Se tenantId=0, é superadmin (sem tenant associado)
  let tenant = null;
  if (admin.tenantId > 0) {
    tenant = await getTenantById(admin.tenantId);
  }

  const { senhaHash: _, ...adminSafe } = admin;
  return { admin: adminSafe, tenant };
}
