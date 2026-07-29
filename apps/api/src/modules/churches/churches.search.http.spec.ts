import { CanActivate, ExecutionContext, INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { AccessPolicyService } from '../../common/access/access-policy.service';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PrismaService } from '../../database/prisma.service';
import { AuditService } from '../audit/audit.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ChurchesController } from './churches.controller';
import { ChurchesService } from './churches.service';
import { GeocodingService } from './geocoding.service';

class TestAuthGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest();
    const isAdmin = request.headers['x-test-role'] === 'admin';
    request.user = {
      sub: isAdmin ? 'admin-user' : 'city-user',
      email: isAdmin ? 'admin@example.com' : 'city@example.com',
      roles: isAdmin ? ['COORDINATION_ADMIN'] : ['MEMBER'],
      permissions: ['churches.read'],
    };
    return true;
  }
}

describe('GET /churches/search (HTTP scope)', () => {
  let app: INestApplication;
  let baseUrl: string;

  const inside = { id: 'inside', name: 'Igreja Goiânia', city: 'Goiânia' };
  const outside = { id: 'outside', name: 'Igreja Brasília', city: 'Brasília' };

  beforeAll(async () => {
    const selectRows = (where: unknown) => {
      const serialized = JSON.stringify(where);
      const restrictedToGoiania = serialized.includes('"city":{"in":["Goiânia"]}');
      const searchesBrasilia = serialized.includes('igreja brasilia');
      if (restrictedToGoiania && searchesBrasilia) return [];
      if (restrictedToGoiania) return [inside];
      if (searchesBrasilia) return [outside];
      return [inside, outside];
    };

    const prisma = {
      church: {
        findMany: jest.fn(({ where }: any) => Promise.resolve(selectRows(where))),
        count: jest.fn(({ where }: any) => Promise.resolve(selectRows(where).length)),
      },
      userScope: {
        findMany: jest.fn().mockResolvedValue([{ type: 'CITY', value: 'goiania' }]),
      },
      userScopePolicy: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      legendary: {
        findMany: jest.fn().mockResolvedValue([{ city: 'Goiânia' }, { city: 'Brasília' }]),
      },
      team: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ChurchesController],
      providers: [
        ChurchesService,
        AccessPolicyService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { create: jest.fn() } },
        { provide: GeocodingService, useValue: { geocode: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(TestAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it('mantém admin irrestrito e impede listagem/busca fora do escopo de cidade', async () => {
    const adminResponse = await fetch(`${baseUrl}/churches/search?perPage=10`, {
      headers: { 'x-test-role': 'admin' },
    });
    expect(adminResponse.status).toBe(200);
    expect((await adminResponse.json()).data).toEqual([inside, outside]);

    const scopedResponse = await fetch(`${baseUrl}/churches/search?perPage=10`, {
      headers: { 'x-test-role': 'city' },
    });
    expect(scopedResponse.status).toBe(200);
    expect((await scopedResponse.json()).data).toEqual([inside]);

    const outsideSearchResponse = await fetch(
      `${baseUrl}/churches/search?search=Igreja%20Brasilia&perPage=10`,
      { headers: { 'x-test-role': 'city' } },
    );
    expect(outsideSearchResponse.status).toBe(200);
    expect((await outsideSearchResponse.json()).data).toEqual([]);
  });
});

// Regressão do incidente de produção: MEMBRO com a dimensão Igreja em "Todos" via
// 0 igrejas na aba Igrejas, enquanto a aba Líderes Espirituais (mesmo usuário, mesmo
// escopo) listava normalmente. Causa: `buildChurchScopeWhere` ignorava o modo ALL,
// e em ALL o `resolveScope` esvazia `churchIds` — o builder lia isso como "sem escopo".
describe('GET /churches/search (escopo em modo ALL)', () => {
  let app: INestApplication;
  let baseUrl: string;

  const inside = { id: 'inside', name: 'Igreja Goiânia', city: 'Goiânia' };
  const outside = { id: 'outside', name: 'Igreja Brasília', city: 'Brasília' };

  // Em ALL não há linhas em `UserScope` — a política é a única fonte. O modo é
  // parametrizado para provar que AS DUAS dimensões que satisfazem a tela liberam.
  let policyMode: { type: string; mode: string }[] = [];

  class AllModeAuthGuard implements CanActivate {
    canActivate(context: ExecutionContext) {
      context.switchToHttp().getRequest().user = {
        sub: 'all-mode-user',
        email: 'all@example.com',
        roles: ['MEMBER'],
        permissions: ['churches.read'],
      };
      return true;
    }
  }

  beforeAll(async () => {
    // Fail-closed literal: o único predicado que zera a lista é `id: { in: [] }`.
    const selectRows = (where: unknown) =>
      JSON.stringify(where).includes('"id":{"in":[]}') ? [] : [inside, outside];

    const prisma = {
      church: {
        findMany: jest.fn(({ where }: any) => Promise.resolve(selectRows(where))),
        count: jest.fn(({ where }: any) => Promise.resolve(selectRows(where).length)),
      },
      userScope: { findMany: jest.fn().mockResolvedValue([]) },
      userScopePolicy: { findMany: jest.fn(() => Promise.resolve(policyMode)) },
      legendary: { findMany: jest.fn().mockResolvedValue([{ city: 'Goiânia' }, { city: 'Brasília' }]) },
      team: { findMany: jest.fn().mockResolvedValue([]) },
    };

    const moduleRef = await Test.createTestingModule({
      controllers: [ChurchesController],
      providers: [
        ChurchesService,
        AccessPolicyService,
        { provide: PrismaService, useValue: prisma },
        { provide: AuditService, useValue: { create: jest.fn() } },
        { provide: GeocodingService, useValue: { geocode: jest.fn() } },
      ],
    })
      .overrideGuard(JwtAuthGuard)
      .useClass(AllModeAuthGuard)
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    app = moduleRef.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ transform: true, whitelist: true }));
    await app.listen(0, '127.0.0.1');
    baseUrl = await app.getUrl();
  });

  afterAll(async () => {
    await app.close();
  });

  it.each([
    ['CHURCH', 'igreja'],
    ['CITY', 'cidade'],
  ])('não-admin com %s=ALL lista as igrejas (dimensão %s irrestrita)', async (type) => {
    policyMode = [{ type, mode: 'ALL' }];

    const listResponse = await fetch(`${baseUrl}/churches/search?perPage=10`);
    expect(listResponse.status).toBe(200);
    expect((await listResponse.json()).data).toEqual([inside, outside]);

    // O seletor "Todas as cidades" da tela usa o MESMO builder — zerava junto.
    const citiesResponse = await fetch(`${baseUrl}/churches/search/cities`);
    expect(citiesResponse.status).toBe(200);
    expect((await citiesResponse.json()).data).toEqual(['Goiânia', 'Brasília']);
  });

  it('mantém o fail-closed de quem realmente não tem escopo (sem política e sem valores)', async () => {
    policyMode = [];

    const listResponse = await fetch(`${baseUrl}/churches/search?perPage=10`);
    expect(listResponse.status).toBe(200);
    expect((await listResponse.json()).data).toEqual([]);
  });
});
