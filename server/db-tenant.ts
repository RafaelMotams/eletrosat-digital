import { drizzle } from "drizzle-orm/mysql2";
import { tenants, tenantAdmins } from "../drizzle/schema";
import { eq } from "drizzle-orm";
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
}) {
  const result = await db.insert(tenants).values({
    ...data,
    status: "ativo",
  });
  return result;
}

export async function updateTenant(
  id: number,
  data: Partial<{
    nome: string;
    slug: string;
    plano: "basico" | "profissional" | "enterprise";
    status: "ativo" | "suspenso" | "cancelado";
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
