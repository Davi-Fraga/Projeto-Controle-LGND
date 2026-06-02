import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

const roles = [
  'COORDINATION_ADMIN',
  'COORDINATION_USER',
  'TOP_REPRESENTATIVE',
  'TOP_DEPUTY_REPRESENTATIVE',
  'FAMILY_REPRESENTATIVE',
  'FAMILY_DEPUTY_REPRESENTATIVE',
  'TEAM_COORDINATOR',
  'SPIRITUAL_LEADER',
  'MEMBER',
];

const permissions = [
  'users.read',
  'users.create',
  'users.update',
  'users.deactivate',
  'legendarios.read',
  'legendarios.create',
  'legendarios.update',
  'legendarios.delete',
  'legendarios.restore',
  'churches.read',
  'churches.create',
  'churches.update',
  'professions.read',
  'professions.create',
  'professions.update',
  'expertises.read',
  'expertises.create',
  'expertises.update',
  'tops.read',
  'tops.create',
  'tops.update',
  'tops.delete',
  'tops.restore',
  'tops.participants.read',
  'tops.participants.add',
  'tops.participants.update',
  'tops.participants.remove',
  'tops.servants.read',
  'tops.servants.add',
  'tops.servants.update',
  'tops.servants.remove',
  'tops.teams.read',
  'tops.teams.add',
  'tops.teams.update',
  'tops.teams.remove',
  'tops.families.read',
  'tops.families.create',
  'tops.families.update',
  'tops.families.delete',
  'tops.families.restore',
  'tops.families.members.read',
  'tops.families.members.add',
  'tops.families.members.update',
  'tops.families.members.remove',
  'tops.families.members.transfer',
  'teams.read',
  'teams.create',
  'teams.update',
  'teams.delete',
  'teams.restore',
  'teams.members.read',
  'teams.members.add',
  'teams.members.update',
  'teams.members.remove',
  'families.read',
  'families.create',
  'families.update',
  'legendarios.history.read',
  'legendarios.history.create',
  'dashboard.read',
  'map.read',
  'communications.read',
  'communications.create',
  'communications.update',
  'communications.send',
  'communications.delete',
  'communications.recipients.read',
  'communications.recipients.update',
  'social-actions.read',
  'social-actions.create',
  'social-actions.update',
  'social-actions.delete',
  'social-actions.restore',
  'social-actions.participants.read',
  'social-actions.participants.add',
  'social-actions.participants.update',
  'social-actions.participants.remove',
  'reports.read',
  'reports.export',
  'reports.contacts.export',
  'audit.read',
];

async function main() {
  const adminName = process.env.ADMIN_NAME;
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;

  if (!adminName || !adminEmail || !adminPassword) {
    throw new Error('ADMIN_NAME, ADMIN_EMAIL and ADMIN_PASSWORD are required for seed.');
  }

  for (const role of roles) {
    await prisma.role.upsert({
      where: { name: role },
      update: {},
      create: { name: role, description: role.replaceAll('_', ' ') },
    });
  }

  for (const permission of permissions) {
    await prisma.permission.upsert({
      where: { key: permission },
      update: {},
      create: { key: permission, description: permission },
    });
  }

  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'COORDINATION_ADMIN' } });
  const allPermissions = await prisma.permission.findMany();

  for (const permission of allPermissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: adminRole.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: adminRole.id,
        permissionId: permission.id,
      },
    });
  }

  await assignPermissions('COORDINATION_USER', [
    'dashboard.read',
    'legendarios.read',
    'legendarios.create',
    'legendarios.update',
    'legendarios.delete',
    'legendarios.restore',
    'legendarios.history.read',
    'legendarios.history.create',
    'churches.read',
    'churches.create',
    'churches.update',
    'professions.read',
    'professions.create',
    'professions.update',
    'expertises.read',
    'expertises.create',
    'expertises.update',
    'tops.read',
    'tops.create',
    'tops.update',
    'tops.delete',
    'tops.restore',
    'tops.participants.read',
    'tops.participants.add',
    'tops.participants.update',
    'tops.participants.remove',
    'tops.servants.read',
    'tops.servants.add',
    'tops.servants.update',
    'tops.servants.remove',
    'tops.teams.read',
    'tops.teams.add',
    'tops.teams.update',
    'tops.teams.remove',
    'tops.families.read',
    'tops.families.create',
    'tops.families.update',
    'tops.families.delete',
    'tops.families.restore',
    'tops.families.members.read',
    'tops.families.members.add',
    'tops.families.members.update',
    'tops.families.members.remove',
    'tops.families.members.transfer',
    'teams.read',
    'teams.create',
    'teams.update',
    'teams.delete',
    'teams.restore',
    'teams.members.read',
    'teams.members.add',
    'teams.members.update',
    'teams.members.remove',
    'families.read',
    'families.create',
    'families.update',
    'communications.read',
    'communications.create',
    'communications.update',
    'communications.send',
    'communications.delete',
    'communications.recipients.read',
    'communications.recipients.update',
    'social-actions.read',
    'social-actions.create',
    'social-actions.update',
    'social-actions.delete',
    'social-actions.restore',
    'social-actions.participants.read',
    'social-actions.participants.add',
    'social-actions.participants.update',
    'social-actions.participants.remove',
    'reports.read',
    'reports.export',
    'map.read',
  ]);

  await assignPermissions('TOP_REPRESENTATIVE', [
    'dashboard.read',
    'legendarios.read',
    'churches.read',
    'professions.read',
    'expertises.read',
    'tops.read',
    'tops.participants.read',
    'tops.servants.read',
    'tops.teams.read',
    'tops.families.read',
    'tops.families.members.read',
    'teams.read',
    'map.read',
  ]);

  await assignPermissions('TOP_DEPUTY_REPRESENTATIVE', [
    'dashboard.read',
    'legendarios.read',
    'churches.read',
    'professions.read',
    'expertises.read',
    'tops.read',
    'tops.participants.read',
    'tops.servants.read',
    'tops.teams.read',
    'tops.families.read',
    'tops.families.members.read',
    'teams.read',
    'map.read',
  ]);

  await assignPermissions('FAMILY_REPRESENTATIVE', [
    'dashboard.read',
    'legendarios.read',
    'churches.read',
    'professions.read',
    'expertises.read',
    'tops.read',
    'tops.families.read',
    'tops.families.members.read',
    'map.read',
  ]);

  await assignPermissions('FAMILY_DEPUTY_REPRESENTATIVE', [
    'dashboard.read',
    'legendarios.read',
    'churches.read',
    'professions.read',
    'expertises.read',
    'tops.read',
    'tops.families.read',
    'tops.families.members.read',
    'map.read',
  ]);

  await assignPermissions('MEMBER', [
    'dashboard.read',
    'legendarios.read',
    'map.read',
  ]);

  await assignPermissions('TEAM_COORDINATOR', [
    'dashboard.read',
    'legendarios.read',
    'churches.read',
    'professions.read',
    'expertises.read',
    'teams.read',
    'teams.members.read',
    'map.read',
  ]);

  await assignPermissions('SPIRITUAL_LEADER', [
    'dashboard.read',
    'legendarios.read',
    'churches.read',
    'professions.read',
    'expertises.read',
    'map.read',
  ]);

  const passwordHash = await bcrypt.hash(adminPassword, 12);
  const admin = await prisma.user.upsert({
    where: { email: adminEmail.toLowerCase() },
    update: { name: adminName, passwordHash, isActive: true },
    create: {
      name: adminName,
      email: adminEmail.toLowerCase(),
      passwordHash,
      isActive: true,
    },
  });

  await prisma.userRole.upsert({
    where: {
      userId_roleId: {
        userId: admin.id,
        roleId: adminRole.id,
      },
    },
    update: {},
    create: {
      userId: admin.id,
      roleId: adminRole.id,
    },
  });

  for (const church of [
    { name: 'Igreja Batista Central', city: 'Brasilia' },
    { name: 'Comunidade Crista Rota do Cerrado', city: 'Brasilia' },
    { name: 'Igreja Presbiteriana', city: 'Goiania' },
  ]) {
    const existingChurch = await prisma.church.findFirst({ where: church });
    if (!existingChurch) {
      await prisma.church.create({ data: church });
    }
  }

  for (const name of ['Administrador', 'Advogado', 'Empresario', 'Engenheiro', 'Medico', 'Pastor', 'Professor', 'Tecnologia']) {
    await prisma.profession.upsert({
      where: { name },
      update: {},
      create: { name },
    });
  }

  for (const expertise of [
    { name: 'Comunicacao', description: 'Midia, comunicacao e conteudo' },
    { name: 'Logistica', description: 'Organizacao operacional e transporte' },
    { name: 'Saude', description: 'Apoio de saude e primeiros cuidados' },
    { name: 'Intercessao', description: 'Apoio espiritual e intercessao' },
    { name: 'Acoes Sociais', description: 'Projetos e mobilizacoes sociais' },
  ]) {
    await prisma.expertise.upsert({
      where: { name: expertise.name },
      update: {},
      create: expertise,
    });
  }

  await seedTop1910Teams();
}

const TOP_1910_TEAMS = [
  'TOP #1910 | Coordenação',
  'TOP #1910 | Liderança',
  'TOP #1910 | Mídia',
  'TOP #1910 | Logística',
  'TOP #1910 | Hakunas',
  'TOP #1910 | ADM',
  'TOP #1910 | Eventos',
  'TOP #1910 | Segurança',
  'TOP #1910 | QAP',
  'TOP #1910 | Ministrações',
];

function normalizeTeamName(value: string) {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').trim().replace(/\s+/g, ' ').toLowerCase();
}

async function seedTop1910Teams() {
  const existing = await prisma.team.findMany({ select: { id: true, name: true } });
  const existingNormalized = new Set(existing.map((t) => normalizeTeamName(t.name)));

  for (const name of TOP_1910_TEAMS) {
    if (!existingNormalized.has(normalizeTeamName(name))) {
      await prisma.team.create({ data: { name, status: 'ACTIVE' } });
    }
  }
}

async function assignPermissions(roleName: string, permissionKeys: string[]) {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } });
  const permissions = await prisma.permission.findMany({ where: { key: { in: permissionKeys } } });

  if (permissions.length !== permissionKeys.length) {
    const found = new Set(permissions.map((permission) => permission.key));
    const missing = permissionKeys.filter((permission) => !found.has(permission));
    throw new Error(`Missing permissions for ${roleName}: ${missing.join(', ')}`);
  }

  for (const permission of permissions) {
    await prisma.rolePermission.upsert({
      where: {
        roleId_permissionId: {
          roleId: role.id,
          permissionId: permission.id,
        },
      },
      update: {},
      create: {
        roleId: role.id,
        permissionId: permission.id,
      },
    });
  }
}

main()
  .finally(async () => {
    await prisma.$disconnect();
  });
