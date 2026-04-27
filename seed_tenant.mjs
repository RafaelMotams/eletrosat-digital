import { createConnection } from 'mysql2/promise';
import bcrypt from 'bcryptjs';

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error('DATABASE_URL not set');
  process.exit(1);
}

const conn = await createConnection(DATABASE_URL);

// Criar tenant padrão (para os dados existentes)
await conn.execute(`
  INSERT IGNORE INTO tenants (id, nome, slug, plano, status, contato, email, createdAt, updatedAt)
  VALUES (1, 'Netvionis Demo', 'netvionis', 'profissional', 'ativo', 'Admin', 'admin@netvionis.com', NOW(), NOW())
`);
console.log('✅ Tenant padrão criado (ID=1)');

// Criar superadmin (dono do sistema de revenda) - tenantId=0 significa superadmin
const senhaHash = await bcrypt.hash('netvionis@2025', 10);
await conn.execute(`
  INSERT IGNORE INTO tenant_admins (tenantId, nome, email, senhaHash, role, ativo, createdAt, updatedAt)
  VALUES (0, 'Super Admin', 'superadmin@netvionis.com', ?, 'admin', 1, NOW(), NOW())
`, [senhaHash]);
console.log('✅ Super Admin: superadmin@netvionis.com / netvionis@2025');

// Criar admin do tenant padrão
const adminHash = await bcrypt.hash('admin@123', 10);
await conn.execute(`
  INSERT IGNORE INTO tenant_admins (tenantId, nome, email, senhaHash, role, ativo, createdAt, updatedAt)
  VALUES (1, 'Admin Netvionis', 'admin@netvionis.com', ?, 'admin', 1, NOW(), NOW())
`, [adminHash]);
console.log('✅ Admin tenant 1: admin@netvionis.com / admin@123');

await conn.end();
