import bcrypt from 'bcryptjs';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();
const SALT_ROUNDS = 12;

const ROLES = [
  { name: 'SUPER_ADMIN', displayName: 'Super Administrator', isSystem: true },
  { name: 'ADMIN',       displayName: 'Administrator',       isSystem: true },
  { name: 'WAREHOUSE',   displayName: 'Warehouse Staff',     isSystem: true },
  { name: 'SUPPORT',     displayName: 'Customer Support',    isSystem: true },
  { name: 'CONTENT',     displayName: 'Content Editor',      isSystem: true },
  { name: 'CUSTOMER',    displayName: 'Customer',            isSystem: true },
];

async function main() {
  // Seed roles
  for (const role of ROLES) {
    await prisma.role.upsert({
      where:  { name: role.name },
      update: {},
      create: role,
    });
  }
  console.log('✅ Roles seeded');

  // Seed users — passwords are bcrypt-hashed (cost 12, BR-U01)
  const users: Array<{ email: string; fullName: string; password: string; role: string }> = [
    { email: 'superadmin@myshop.dev', fullName: 'Super Admin',     password: 'SuperAdmin@123!', role: 'SUPER_ADMIN' },
    { email: 'admin@myshop.dev',      fullName: 'Admin User',      password: 'Admin@123!',      role: 'ADMIN'       },
    { email: 'warehouse@myshop.dev',  fullName: 'Warehouse Staff', password: 'Warehouse@123!',  role: 'WAREHOUSE'   },
    { email: 'support@myshop.dev',    fullName: 'Support Staff',   password: 'Support@123!',    role: 'SUPPORT'     },
    { email: 'customer@myshop.dev',   fullName: 'Test Customer',   password: 'Customer@123!',   role: 'CUSTOMER'    },
  ];

  for (const u of users) {
    const passwordHash = await bcrypt.hash(u.password, SALT_ROUNDS);

    const user = await prisma.user.upsert({
      where:  { email: u.email },
      update: {},
      create: {
        email: u.email,
        passwordHash,
        fullName: u.fullName,
        isVerified: true,
        isActive:   true,
      },
    });

    const role = await prisma.role.findUniqueOrThrow({ where: { name: u.role } });

    await prisma.userRole.upsert({
      where:  { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id, isActive: true },
    });

    console.log(`✅ User seeded: ${u.email} (${u.role})`);
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
